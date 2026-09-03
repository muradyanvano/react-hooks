import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createEndpointSignature,
  createHeartbeatSignature,
  getWebSocketConstructor,
  isBlobHeartbeatCandidate,
  isBrowserEnvironment,
  isHeartbeatResponse,
  isSocketOpen,
  blobsHaveEqualBytes,
  normalizeAutoReconnect,
  normalizeHeartbeat,
  normalizeUrlSnapshot,
  resolveReconnectDelay,
  safeCloseSocket,
  shouldAttemptReconnect,
  type UseWebSocketAutoReconnectOptions,
  type UseWebSocketHeartbeatOptions,
  type UseWebSocketSendData,
  type UseWebSocketStatus,
} from './webSocketHelpers'

export type {
  UseWebSocketAutoReconnectOptions,
  UseWebSocketHeartbeatOptions,
  UseWebSocketReconnectDelay,
  UseWebSocketReconnectRetries,
  UseWebSocketSendData,
  UseWebSocketStatus,
} from './webSocketHelpers'

export interface UseWebSocketOptions<T = unknown> {
  immediate?: boolean
  autoConnect?: boolean
  autoClose?: boolean
  autoReconnect?: boolean | UseWebSocketAutoReconnectOptions
  heartbeat?: boolean | UseWebSocketHeartbeatOptions
  protocols?: string | readonly string[]
  binaryType?: BinaryType
  onConnected?: (socket: WebSocket) => void
  onDisconnected?: (socket: WebSocket, event: CloseEvent) => void
  onError?: (socket: WebSocket, event: Event) => void
  onMessage?: (socket: WebSocket, event: MessageEvent<T>) => void
}

export interface UseWebSocketReturn<T = unknown> {
  data: T | null
  status: UseWebSocketStatus
  ws: WebSocket | null
  send: (data: UseWebSocketSendData, useBuffer?: boolean) => boolean
  open: () => void
  close: (code?: number, reason?: string) => void
}

const HEARTBEAT_TIMEOUT_CODE = 4000
const HEARTBEAT_TIMEOUT_REASON = 'Heartbeat timeout'

/**
 * WebSocket connection helper with buffering, reconnect, and heartbeat.
 *
 * After an unexpected or explicit close, `ws` retains the closed native
 * instance until a later successful `open()` replaces it. SSR and idle
 * mounts keep `ws: null`.
 *
 * `autoClose` controls whether a `beforeunload` listener closes the owned
 * socket. React unmount always releases ownership even when `autoClose` is
 * false.
 */
export function useWebSocket<T = unknown>(
  url: string | URL | null | undefined,
  options: UseWebSocketOptions<T> = {},
): UseWebSocketReturn<T> {
  const {
    immediate = true,
    autoConnect = true,
    autoClose = true,
    autoReconnect = false,
    heartbeat = false,
    protocols,
    binaryType,
    onConnected,
    onDisconnected,
    onError,
    onMessage,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<UseWebSocketStatus>('CLOSED')
  const [ws, setWs] = useState<WebSocket | null>(null)

  const statusRef = useRef<UseWebSocketStatus>('CLOSED')
  const wsRef = useRef<WebSocket | null>(null)
  const generationRef = useRef(0)
  const mountedRef = useRef(true)
  const explicitCloseRef = useRef(false)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatCycleRef = useRef(0)
  const bufferRef = useRef<UseWebSocketSendData[]>([])
  const beforeUnloadAttachedRef = useRef(false)
  const beforeUnloadHandlerRef = useRef<(() => void) | null>(null)
  const openInternalRef = useRef<(manual: boolean) => void>(() => {})
  const previousEndpointRef = useRef<string | null | undefined>(undefined)
  const previousHeartbeatSignatureRef = useRef<string | null>(null)

  const latestRef = useRef({
    url,
    protocols,
    binaryType,
    autoReconnect,
    heartbeat,
    autoClose,
    onConnected,
    onDisconnected,
    onError,
    onMessage,
  })

  useEffect(() => {
    latestRef.current = {
      url,
      protocols,
      binaryType,
      autoReconnect,
      heartbeat,
      autoClose,
      onConnected,
      onDisconnected,
      onError,
      onMessage,
    }
  })

  const setStatusSafe = useCallback((next: UseWebSocketStatus) => {
    if (!mountedRef.current) {
      return
    }
    if (Object.is(statusRef.current, next)) {
      return
    }
    statusRef.current = next
    setStatus(next)
  }, [])

  const setWsSafe = useCallback((next: WebSocket | null) => {
    const previous = wsRef.current
    wsRef.current = next
    if (!mountedRef.current) {
      return
    }
    if (Object.is(previous, next)) {
      return
    }
    setWs(next)
  }, [])

  const setDataSafe = useCallback((next: T | null) => {
    if (!mountedRef.current) {
      return
    }
    setData((previous) => (Object.is(previous, next) ? previous : next))
  }, [])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current != null) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const clearHeartbeatTimers = useCallback(() => {
    if (heartbeatIntervalRef.current != null) {
      clearTimeout(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    if (heartbeatTimeoutRef.current != null) {
      clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
    // Invalidate in-flight async Blob heartbeat comparisons.
    heartbeatCycleRef.current += 1
  }, [])

  const clearBuffer = useCallback(() => {
    bufferRef.current = []
  }, [])

  const detachSocketHandlers = useCallback((socket: WebSocket) => {
    try {
      socket.onopen = null
      socket.onmessage = null
      socket.onerror = null
      socket.onclose = null
    } catch {
      // Contain handler detachment failures.
    }
  }, [])

  const detachBeforeUnload = useCallback(() => {
    if (
      !beforeUnloadAttachedRef.current ||
      typeof window === 'undefined' ||
      beforeUnloadHandlerRef.current == null
    ) {
      return
    }
    window.removeEventListener('beforeunload', beforeUnloadHandlerRef.current)
    beforeUnloadAttachedRef.current = false
  }, [])

  const attachBeforeUnload = useCallback(() => {
    if (
      !latestRef.current.autoClose ||
      !isBrowserEnvironment() ||
      beforeUnloadAttachedRef.current ||
      beforeUnloadHandlerRef.current == null
    ) {
      return
    }
    window.addEventListener('beforeunload', beforeUnloadHandlerRef.current)
    beforeUnloadAttachedRef.current = true
  }, [])

  const invokeSafely = useCallback((callback: (() => void) | undefined) => {
    if (callback == null) {
      return
    }
    try {
      callback()
    } catch {
      // Contain callback exceptions so ownership cleanup remains coherent.
    }
  }, [])

  const flushBuffer = useCallback((socket: WebSocket) => {
    if (!isSocketOpen(socket)) {
      return
    }

    while (bufferRef.current.length > 0) {
      const next = bufferRef.current[0]
      if (next === undefined) {
        break
      }
      try {
        socket.send(next as Parameters<WebSocket['send']>[0])
        bufferRef.current.shift()
      } catch {
        break
      }
    }
  }, [])

  const scheduleHeartbeat = useCallback(
    (socket: WebSocket, generation: number) => {
      clearHeartbeatTimers()
      const config = normalizeHeartbeat(latestRef.current.heartbeat)
      if (!config.enabled || !mountedRef.current) {
        return
      }

      heartbeatIntervalRef.current = setTimeout(() => {
        heartbeatIntervalRef.current = null
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          wsRef.current !== socket ||
          !isSocketOpen(socket)
        ) {
          return
        }

        const activeConfig = normalizeHeartbeat(latestRef.current.heartbeat)
        if (!activeConfig.enabled) {
          return
        }

        try {
          socket.send(activeConfig.message as Parameters<WebSocket['send']>[0])
        } catch {
          safeCloseSocket(
            socket,
            HEARTBEAT_TIMEOUT_CODE,
            HEARTBEAT_TIMEOUT_REASON,
          )
          return
        }

        heartbeatCycleRef.current += 1
        const heartbeatCycle = heartbeatCycleRef.current

        heartbeatTimeoutRef.current = setTimeout(() => {
          heartbeatTimeoutRef.current = null
          // Timeout wins: invalidate any still-pending Blob comparisons.
          if (heartbeatCycleRef.current === heartbeatCycle) {
            heartbeatCycleRef.current += 1
          }
          if (
            !mountedRef.current ||
            generation !== generationRef.current ||
            wsRef.current !== socket
          ) {
            return
          }
          safeCloseSocket(
            socket,
            HEARTBEAT_TIMEOUT_CODE,
            HEARTBEAT_TIMEOUT_REASON,
          )
        }, activeConfig.pongTimeout)
      }, config.interval)
    },
    [clearHeartbeatTimers],
  )

  const scheduleReconnect = useCallback(
    (event: CloseEvent, generation: number) => {
      const reconnect = normalizeAutoReconnect(latestRef.current.autoReconnect)
      if (
        !reconnect.enabled ||
        explicitCloseRef.current ||
        !mountedRef.current
      ) {
        return
      }

      const nextAttempt = reconnectAttemptRef.current + 1
      if (!shouldAttemptReconnect(reconnect.retries, nextAttempt, event)) {
        reconnectAttemptRef.current = 0
        invokeSafely(reconnect.onFailed)
        return
      }

      reconnectAttemptRef.current = nextAttempt
      let delay: number
      try {
        delay = resolveReconnectDelay(reconnect.delay, nextAttempt)
      } catch {
        reconnectAttemptRef.current = 0
        return
      }

      clearReconnectTimer()
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          explicitCloseRef.current
        ) {
          return
        }
        openInternalRef.current(false)
      }, delay)
    },
    [clearReconnectTimer, invokeSafely],
  )

  useEffect(() => {
    beforeUnloadHandlerRef.current = () => {
      explicitCloseRef.current = true
      clearReconnectTimer()
      clearHeartbeatTimers()
      safeCloseSocket(wsRef.current)
    }

    openInternalRef.current = (manual: boolean) => {
      if (!isBrowserEnvironment()) {
        return
      }

      const WebSocketCtor = getWebSocketConstructor()
      if (WebSocketCtor == null) {
        return
      }

      const nextUrl = normalizeUrlSnapshot(latestRef.current.url)
      if (nextUrl == null) {
        return
      }

      if (manual) {
        explicitCloseRef.current = false
      }

      clearReconnectTimer()
      clearHeartbeatTimers()
      generationRef.current += 1
      const generation = generationRef.current

      const previous = wsRef.current
      if (previous != null) {
        detachSocketHandlers(previous)
        safeCloseSocket(previous)
      }

      let socket: WebSocket
      try {
        const nextProtocols = latestRef.current.protocols
        socket =
          nextProtocols == null
            ? new WebSocketCtor(nextUrl)
            : new WebSocketCtor(nextUrl, nextProtocols as string | string[])
      } catch {
        setWsSafe(null)
        setStatusSafe('CLOSED')
        return
      }

      const nextBinaryType = latestRef.current.binaryType
      if (nextBinaryType != null) {
        try {
          socket.binaryType = nextBinaryType
        } catch {
          // Contain assignment failures.
        }
      }

      setWsSafe(socket)
      setStatusSafe('CONNECTING')
      attachBeforeUnload()

      socket.onopen = () => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          wsRef.current !== socket
        ) {
          return
        }

        reconnectAttemptRef.current = 0
        setStatusSafe('OPEN')
        flushBuffer(socket)
        scheduleHeartbeat(socket, generation)
        invokeSafely(() => {
          latestRef.current.onConnected?.(socket)
        })
      }

      socket.onmessage = (event: MessageEvent<T>) => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          wsRef.current !== socket
        ) {
          return
        }

        const heartbeatConfig = normalizeHeartbeat(latestRef.current.heartbeat)
        if (!heartbeatConfig.enabled) {
          setDataSafe(event.data)
          invokeSafely(() => {
            latestRef.current.onMessage?.(socket, event)
          })
          return
        }

        const expected = heartbeatConfig.responseMessage

        if (typeof Blob !== 'undefined' && expected instanceof Blob) {
          if (!isBlobHeartbeatCandidate(event.data, expected)) {
            setDataSafe(event.data)
            invokeSafely(() => {
              latestRef.current.onMessage?.(socket, event)
            })
            return
          }

          const heartbeatCycle = heartbeatCycleRef.current
          const receivedBlob = event.data
          void blobsHaveEqualBytes(receivedBlob, expected)
            .then((equal) => {
              if (
                !mountedRef.current ||
                generation !== generationRef.current ||
                wsRef.current !== socket ||
                heartbeatCycle !== heartbeatCycleRef.current
              ) {
                return
              }

              if (equal) {
                if (heartbeatTimeoutRef.current != null) {
                  clearTimeout(heartbeatTimeoutRef.current)
                  heartbeatTimeoutRef.current = null
                }
                scheduleHeartbeat(socket, generation)
                return
              }

              setDataSafe(receivedBlob as T)
              invokeSafely(() => {
                latestRef.current.onMessage?.(socket, event)
              })
            })
            .catch(() => {
              if (
                !mountedRef.current ||
                generation !== generationRef.current ||
                wsRef.current !== socket ||
                heartbeatCycle !== heartbeatCycleRef.current
              ) {
                return
              }
              setDataSafe(receivedBlob as T)
              invokeSafely(() => {
                latestRef.current.onMessage?.(socket, event)
              })
            })
          return
        }

        if (isHeartbeatResponse(event.data, expected)) {
          if (heartbeatTimeoutRef.current != null) {
            clearTimeout(heartbeatTimeoutRef.current)
            heartbeatTimeoutRef.current = null
          }
          scheduleHeartbeat(socket, generation)
          return
        }

        setDataSafe(event.data)
        invokeSafely(() => {
          latestRef.current.onMessage?.(socket, event)
        })
      }

      socket.onerror = (event: Event) => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          wsRef.current !== socket
        ) {
          return
        }

        invokeSafely(() => {
          latestRef.current.onError?.(socket, event)
        })
      }

      socket.onclose = (event: CloseEvent) => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          wsRef.current !== socket
        ) {
          return
        }

        clearHeartbeatTimers()
        setStatusSafe('CLOSED')
        // Retain the closed instance until a later open() replaces it.
        setWsSafe(socket)

        invokeSafely(() => {
          latestRef.current.onDisconnected?.(socket, event)
        })

        if (!explicitCloseRef.current) {
          scheduleReconnect(event, generation)
        }
      }
    }
  })

  const open = useCallback(() => {
    explicitCloseRef.current = false
    openInternalRef.current(true)
  }, [])

  const close = useCallback(
    (code?: number, reason?: string) => {
      explicitCloseRef.current = true
      clearReconnectTimer()
      clearHeartbeatTimers()
      clearBuffer()
      generationRef.current += 1

      const socket = wsRef.current
      if (socket != null) {
        detachSocketHandlers(socket)
        safeCloseSocket(socket, code, reason)
        setWsSafe(socket)
      }

      setStatusSafe('CLOSED')
    },
    [
      clearBuffer,
      clearHeartbeatTimers,
      clearReconnectTimer,
      detachSocketHandlers,
      setStatusSafe,
      setWsSafe,
    ],
  )

  const send = useCallback(
    (payload: UseWebSocketSendData, useBuffer = true): boolean => {
      const socket = wsRef.current
      if (isSocketOpen(socket)) {
        try {
          socket!.send(payload as Parameters<WebSocket['send']>[0])
          return true
        } catch {
          return false
        }
      }

      if (useBuffer) {
        bufferRef.current.push(payload)
      }
      return false
    },
    [],
  )

  const endpointSignature = createEndpointSignature(url, protocols)
  const heartbeatSignature = createHeartbeatSignature(heartbeat)

  useEffect(() => {
    mountedRef.current = true

    const previousEndpoint = previousEndpointRef.current
    const endpointChanged =
      previousEndpoint !== undefined &&
      !Object.is(previousEndpoint, endpointSignature)
    previousEndpointRef.current = endpointSignature

    if (endpointChanged) {
      clearReconnectTimer()
      reconnectAttemptRef.current = 0
      clearBuffer()
      clearHeartbeatTimers()
      generationRef.current += 1

      const socket = wsRef.current
      if (socket != null) {
        detachSocketHandlers(socket)
        safeCloseSocket(socket)
      }
      setStatusSafe('CLOSED')
    }

    const shouldConnect =
      endpointSignature != null &&
      isBrowserEnvironment() &&
      (endpointChanged ? autoConnect : immediate)

    if (shouldConnect) {
      explicitCloseRef.current = false
      openInternalRef.current(false)
    } else if (endpointChanged) {
      const socket = wsRef.current
      if (socket != null) {
        setWsSafe(socket)
      }
    }

    return () => {
      mountedRef.current = false
      explicitCloseRef.current = true
      clearReconnectTimer()
      clearHeartbeatTimers()
      clearBuffer()
      detachBeforeUnload()
      generationRef.current += 1

      const socket = wsRef.current
      if (socket != null) {
        detachSocketHandlers(socket)
        safeCloseSocket(socket)
      }
      wsRef.current = null
    }
  }, [
    autoConnect,
    clearBuffer,
    clearHeartbeatTimers,
    clearReconnectTimer,
    detachBeforeUnload,
    detachSocketHandlers,
    endpointSignature,
    immediate,
    setStatusSafe,
    setWsSafe,
  ])

  useEffect(() => {
    const socket = wsRef.current
    if (socket == null || binaryType == null) {
      return
    }
    try {
      if (socket.binaryType !== binaryType) {
        socket.binaryType = binaryType
      }
    } catch {
      // Contain assignment failures.
    }
  }, [binaryType])

  useEffect(() => {
    if (previousHeartbeatSignatureRef.current == null) {
      previousHeartbeatSignatureRef.current = heartbeatSignature
      return
    }

    if (Object.is(previousHeartbeatSignatureRef.current, heartbeatSignature)) {
      return
    }
    previousHeartbeatSignatureRef.current = heartbeatSignature

    const socket = wsRef.current
    if (socket == null || statusRef.current !== 'OPEN') {
      return
    }

    scheduleHeartbeat(socket, generationRef.current)
  }, [heartbeatSignature, scheduleHeartbeat])

  useEffect(() => {
    if (autoClose && status !== 'CLOSED') {
      attachBeforeUnload()
      return
    }
    if (!autoClose) {
      detachBeforeUnload()
    }
  }, [attachBeforeUnload, autoClose, detachBeforeUnload, status])

  return {
    data,
    status,
    ws,
    send,
    open,
    close,
  }
}
