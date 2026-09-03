/**
 * Storybook-only deterministic mock for `globalThis.WebSocket`.
 * Never ship this module in `dist`/the npm tarball — it exists purely to make
 * WebSocket stories reproducible without real network servers.
 */

export const WS_CONNECTING = 0
export const WS_OPEN = 1
export const WS_CLOSING = 2
export const WS_CLOSED = 3

export type WebSocketMockListener = (event: Event) => void

export interface WebSocketMockInstance {
  readonly id: number
  readonly generation: number
  url: string
  protocols: string | string[] | undefined
  readyState: number
  binaryType: BinaryType
  protocol: string
  bufferedAmount: number
  extensions: string
  sent: unknown[]
  closeCalls: Array<{ code?: number; reason?: string }>
  onopen: ((event: Event) => void) | null
  onmessage: ((event: MessageEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onclose: ((event: CloseEvent) => void) | null
  send: (data: unknown) => void
  close: (code?: number, reason?: string) => void
  addEventListener: (type: string, listener: WebSocketMockListener) => void
  removeEventListener: (type: string, listener: WebSocketMockListener) => void
  dispatchOpen: () => void
  dispatchMessage: (data: unknown) => void
  dispatchError: () => void
  dispatchClose: (code?: number, reason?: string, wasClean?: boolean) => void
  getSendHistory: () => unknown[]
}

export interface WebSocketMockController {
  install: () => void
  uninstall: () => void
  isInstalled: () => boolean
  setSupported: (supported: boolean) => void
  setAutoOpen: (enabled: boolean) => void
  setOpenDelay: (delayMs: number) => void
  setConstructError: (error: Error | null) => void
  setConstructErrorOnAttempt: (attempt: number, error: Error | null) => void
  clearConstructErrorAttempts: () => void
  setSendError: (error: Error | null) => void
  setAutoPong: (enabled: boolean) => void
  setPingMessage: (message: string | ArrayBuffer | Blob) => void
  setPongMessage: (message: string | ArrayBuffer | Blob) => void
  scheduleServerMessage: (
    data: unknown,
    delayMs?: number,
    instanceId?: number,
  ) => number
  cancelScheduledMessage: (timerId: number) => void
  cancelAllScheduledMessages: () => void
  getInstances: () => WebSocketMockInstance[]
  getLastInstance: () => WebSocketMockInstance | undefined
  getInstanceCount: () => number
  getConnectionAttemptCount: () => number
  openLast: () => void
  closeLast: (code?: number, reason?: string, wasClean?: boolean) => void
  sendServerMessage: (data: unknown, instanceId?: number) => void
  simulateError: (instanceId?: number) => void
  reset: () => void
}

function createCloseEvent(
  code = 1000,
  reason = '',
  wasClean = true,
): CloseEvent {
  if (typeof CloseEvent === 'function') {
    return new CloseEvent('close', { code, reason, wasClean })
  }
  const event = new Event('close') as CloseEvent
  Object.defineProperties(event, {
    code: { value: code },
    reason: { value: reason },
    wasClean: { value: wasClean },
  })
  return event
}

function createMessageEvent(data: unknown): MessageEvent {
  if (typeof MessageEvent === 'function') {
    return new MessageEvent('message', { data })
  }
  const event = new Event('message') as MessageEvent
  Object.defineProperty(event, 'data', { value: data })
  return event
}

function payloadsEqual(
  left: unknown,
  right: string | ArrayBuffer | Blob,
): boolean {
  if (typeof right === 'string') {
    return typeof left === 'string' && left === right
  }
  if (typeof Blob !== 'undefined' && right instanceof Blob) {
    return (
      typeof Blob !== 'undefined' &&
      left instanceof Blob &&
      left.size === right.size &&
      left.type === right.type
    )
  }
  if (right instanceof ArrayBuffer) {
    if (!(left instanceof ArrayBuffer)) {
      return false
    }
    if (left.byteLength !== right.byteLength) {
      return false
    }
    const a = new Uint8Array(left)
    const b = new Uint8Array(right)
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index]) {
        return false
      }
    }
    return true
  }
  return Object.is(left, right)
}

export function createWebSocketMock(options?: {
  autoOpen?: boolean
  openDelay?: number
  autoPong?: boolean
  pingMessage?: string | ArrayBuffer | Blob
  pongMessage?: string | ArrayBuffer | Blob
  supported?: boolean
}): WebSocketMockController {
  let autoOpen = options?.autoOpen ?? true
  let openDelay = options?.openDelay ?? 30
  let autoPong = options?.autoPong ?? false
  let pingMessage: string | ArrayBuffer | Blob = options?.pingMessage ?? 'ping'
  let pongMessage: string | ArrayBuffer | Blob =
    options?.pongMessage ?? options?.pingMessage ?? 'ping'
  let supported = options?.supported ?? true
  let constructError: Error | null = null
  const constructErrorsByAttempt = new Map<number, Error>()
  let sendError: Error | null = null
  let installed = false
  let originalWebSocket: typeof WebSocket | undefined
  let nextInstanceId = 1
  let connectionAttemptCount = 0
  const instances: WebSocketMockInstance[] = []
  const scheduledTimers = new Map<number, ReturnType<typeof setTimeout>>()
  let nextTimerId = 1

  const clearTimers = () => {
    for (const timer of scheduledTimers.values()) {
      clearTimeout(timer)
    }
    scheduledTimers.clear()
  }

  class MockWebSocket {
    static readonly CONNECTING = WS_CONNECTING
    static readonly OPEN = WS_OPEN
    static readonly CLOSING = WS_CLOSING
    static readonly CLOSED = WS_CLOSED

    readonly CONNECTING = WS_CONNECTING
    readonly OPEN = WS_OPEN
    readonly CLOSING = WS_CLOSING
    readonly CLOSED = WS_CLOSED

    readonly id: number
    readonly generation: number
    url: string
    protocols: string | string[] | undefined
    readyState = WS_CONNECTING
    binaryType: BinaryType = 'blob'
    protocol = ''
    bufferedAmount = 0
    extensions = ''
    sent: unknown[] = []
    closeCalls: Array<{ code?: number; reason?: string }> = []
    onopen: ((event: Event) => void) | null = null
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: Event) => void) | null = null
    onclose: ((event: CloseEvent) => void) | null = null

    private readonly listeners = new Map<string, Set<WebSocketMockListener>>()
    private openTimer: ReturnType<typeof setTimeout> | null = null

    constructor(url: string | URL, protocols?: string | string[]) {
      connectionAttemptCount += 1
      const attempt = connectionAttemptCount
      const attemptError = constructErrorsByAttempt.get(attempt)
      if (attemptError != null) {
        throw attemptError
      }
      if (constructError != null) {
        throw constructError
      }

      this.id = nextInstanceId
      nextInstanceId += 1
      this.generation = attempt
      this.url = typeof url === 'string' ? url : url.href
      this.protocols = protocols
      if (typeof protocols === 'string') {
        this.protocol = protocols
      } else if (Array.isArray(protocols) && protocols.length > 0) {
        this.protocol = protocols[0] ?? ''
      }

      const instance = this as unknown as WebSocketMockInstance
      instances.push(instance)

      if (autoOpen) {
        this.openTimer = setTimeout(() => {
          this.openTimer = null
          if (this.readyState === WS_CONNECTING) {
            this.dispatchOpen()
          }
        }, openDelay)
      }
    }

    send(data: unknown): void {
      if (this.readyState !== WS_OPEN) {
        throw new Error('InvalidStateError: still connecting')
      }
      if (sendError != null) {
        throw sendError
      }
      this.sent.push(data)

      if (autoPong && payloadsEqual(data, pingMessage)) {
        setTimeout(() => {
          if (this.readyState === WS_OPEN) {
            this.dispatchMessage(pongMessage)
          }
        }, 0)
      }
    }

    close(code?: number, reason?: string): void {
      if (this.openTimer != null) {
        clearTimeout(this.openTimer)
        this.openTimer = null
      }
      const entry: { code?: number; reason?: string } = {}
      if (code != null) {
        entry.code = code
      }
      if (reason != null) {
        entry.reason = reason
      }
      this.closeCalls.push(entry)
      if (this.readyState === WS_CLOSING || this.readyState === WS_CLOSED) {
        return
      }
      this.readyState = WS_CLOSING
      this.readyState = WS_CLOSED
      this.dispatchClose(code ?? 1000, reason ?? '', true)
    }

    addEventListener(type: string, listener: WebSocketMockListener): void {
      const set = this.listeners.get(type) ?? new Set()
      set.add(listener)
      this.listeners.set(type, set)
    }

    removeEventListener(type: string, listener: WebSocketMockListener): void {
      this.listeners.get(type)?.delete(listener)
    }

    private emit(type: string, event: Event): void {
      if (type === 'open' && this.onopen) {
        this.onopen(event)
      } else if (type === 'message' && this.onmessage) {
        this.onmessage(event as MessageEvent)
      } else if (type === 'error' && this.onerror) {
        this.onerror(event)
      } else if (type === 'close' && this.onclose) {
        this.onclose(event as CloseEvent)
      }
      for (const listener of this.listeners.get(type) ?? []) {
        listener(event)
      }
    }

    dispatchOpen(): void {
      if (this.openTimer != null) {
        clearTimeout(this.openTimer)
        this.openTimer = null
      }
      this.readyState = WS_OPEN
      this.emit('open', new Event('open'))
    }

    dispatchMessage(data: unknown): void {
      this.emit('message', createMessageEvent(data))
    }

    dispatchError(): void {
      this.emit('error', new Event('error'))
    }

    dispatchClose(code = 1000, reason = '', wasClean = true): void {
      if (this.openTimer != null) {
        clearTimeout(this.openTimer)
        this.openTimer = null
      }
      this.readyState = WS_CLOSED
      this.emit('close', createCloseEvent(code, reason, wasClean))
    }

    getSendHistory(): unknown[] {
      return [...this.sent]
    }
  }

  const findInstance = (
    instanceId?: number,
  ): WebSocketMockInstance | undefined => {
    if (instanceId == null) {
      return instances[instances.length - 1]
    }
    return instances.find((entry) => entry.id === instanceId)
  }

  return {
    isInstalled: () => installed,
    install() {
      if (installed || typeof globalThis === 'undefined') {
        return
      }
      originalWebSocket = globalThis.WebSocket
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).WebSocket = supported ? MockWebSocket : undefined
      installed = true
    },
    uninstall() {
      if (!installed) {
        return
      }
      clearTimers()
      for (const instance of instances) {
        try {
          instance.onopen = null
          instance.onmessage = null
          instance.onerror = null
          instance.onclose = null
          if (
            instance.readyState === WS_CONNECTING ||
            instance.readyState === WS_OPEN
          ) {
            instance.readyState = WS_CLOSED
          }
        } catch {
          // Contain mock cleanup failures.
        }
      }
      if (originalWebSocket !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).WebSocket = originalWebSocket
        originalWebSocket = undefined
      }
      instances.length = 0
      connectionAttemptCount = 0
      nextInstanceId = 1
      constructError = null
      constructErrorsByAttempt.clear()
      sendError = null
      installed = false
    },
    setSupported(next) {
      supported = next
      if (installed) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).WebSocket = supported ? MockWebSocket : undefined
      }
    },
    setAutoOpen(next) {
      autoOpen = next
    },
    setOpenDelay(next) {
      openDelay = Math.max(0, next)
    },
    setConstructError(error) {
      constructError = error
    },
    setConstructErrorOnAttempt(attempt, error) {
      if (error == null) {
        constructErrorsByAttempt.delete(attempt)
        return
      }
      constructErrorsByAttempt.set(attempt, error)
    },
    clearConstructErrorAttempts() {
      constructErrorsByAttempt.clear()
    },
    setSendError(error) {
      sendError = error
    },
    setAutoPong(next) {
      autoPong = next
    },
    setPingMessage(message) {
      pingMessage = message
    },
    setPongMessage(message) {
      pongMessage = message
    },
    scheduleServerMessage(data, delayMs = 0, instanceId) {
      const timerId = nextTimerId
      nextTimerId += 1
      const timer = setTimeout(() => {
        scheduledTimers.delete(timerId)
        const target = findInstance(instanceId)
        target?.dispatchMessage(data)
      }, delayMs)
      scheduledTimers.set(timerId, timer)
      return timerId
    },
    cancelScheduledMessage(timerId) {
      const timer = scheduledTimers.get(timerId)
      if (timer != null) {
        clearTimeout(timer)
        scheduledTimers.delete(timerId)
      }
    },
    cancelAllScheduledMessages() {
      clearTimers()
    },
    getInstances: () => [...instances],
    getLastInstance: () => instances[instances.length - 1],
    getInstanceCount: () => instances.length,
    getConnectionAttemptCount: () => connectionAttemptCount,
    openLast() {
      findInstance()?.dispatchOpen()
    },
    closeLast(code, reason, wasClean) {
      findInstance()?.dispatchClose(code, reason, wasClean)
    },
    sendServerMessage(data, instanceId) {
      findInstance(instanceId)?.dispatchMessage(data)
    },
    simulateError(instanceId) {
      findInstance(instanceId)?.dispatchError()
    },
    reset() {
      clearTimers()
      instances.length = 0
      connectionAttemptCount = 0
      nextInstanceId = 1
      constructError = null
      constructErrorsByAttempt.clear()
      sendError = null
    },
  }
}
