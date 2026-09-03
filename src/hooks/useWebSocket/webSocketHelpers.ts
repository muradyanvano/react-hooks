export type UseWebSocketStatus = 'OPEN' | 'CONNECTING' | 'CLOSED'

export type UseWebSocketSendData =
  string | ArrayBufferLike | Blob | ArrayBufferView

export type UseWebSocketReconnectRetries =
  number | ((attempt: number, event: CloseEvent) => boolean)

export type UseWebSocketReconnectDelay = number | ((attempt: number) => number)

export interface UseWebSocketAutoReconnectOptions {
  retries?: UseWebSocketReconnectRetries
  delay?: UseWebSocketReconnectDelay
  onFailed?: () => void
}

export interface UseWebSocketHeartbeatOptions {
  message?: string | ArrayBuffer | Blob
  responseMessage?: string | ArrayBuffer | Blob
  interval?: number
  pongTimeout?: number
}

export interface NormalizedAutoReconnect {
  enabled: boolean
  retries: UseWebSocketReconnectRetries
  delay: UseWebSocketReconnectDelay
  onFailed: (() => void) | undefined
}

export interface NormalizedHeartbeat {
  enabled: boolean
  message: string | ArrayBuffer | Blob
  responseMessage: string | ArrayBuffer | Blob
  interval: number
  pongTimeout: number
}

const DEFAULT_RECONNECT_RETRIES = -1
const DEFAULT_RECONNECT_DELAY = 1000
const DEFAULT_HEARTBEAT_MESSAGE = 'ping'
const DEFAULT_HEARTBEAT_INTERVAL = 1000
const DEFAULT_HEARTBEAT_PONG_TIMEOUT = 1000

export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof WebSocket !== 'undefined'
}

export function normalizeNonNegativeMs(
  value: unknown,
  fallback: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fallback
  }
  return value
}

export function normalizeUrlSnapshot(
  url: string | URL | null | undefined,
): string | null {
  if (url == null) {
    return null
  }

  if (typeof url === 'string') {
    const trimmed = url.trim()
    return trimmed === '' ? null : trimmed
  }

  try {
    return url.href
  } catch {
    return null
  }
}

export function normalizeProtocolsSnapshot(
  protocols: string | readonly string[] | undefined,
): string | null {
  if (protocols == null) {
    return null
  }

  if (typeof protocols === 'string') {
    return protocols
  }

  try {
    return JSON.stringify([...protocols])
  } catch {
    return null
  }
}

export function createEndpointSignature(
  url: string | URL | null | undefined,
  protocols: string | readonly string[] | undefined,
): string | null {
  const urlSnapshot = normalizeUrlSnapshot(url)
  if (urlSnapshot == null) {
    return null
  }

  return `${urlSnapshot}::${normalizeProtocolsSnapshot(protocols) ?? ''}`
}

export function normalizeAutoReconnect(
  value: boolean | UseWebSocketAutoReconnectOptions | undefined,
): NormalizedAutoReconnect {
  if (value === false || value == null) {
    return {
      enabled: false,
      retries: DEFAULT_RECONNECT_RETRIES,
      delay: DEFAULT_RECONNECT_DELAY,
      onFailed: undefined,
    }
  }

  if (value === true) {
    return {
      enabled: true,
      retries: DEFAULT_RECONNECT_RETRIES,
      delay: DEFAULT_RECONNECT_DELAY,
      onFailed: undefined,
    }
  }

  return {
    enabled: true,
    retries: value.retries ?? DEFAULT_RECONNECT_RETRIES,
    delay: value.delay ?? DEFAULT_RECONNECT_DELAY,
    onFailed: value.onFailed,
  }
}

export function normalizeHeartbeat(
  value: boolean | UseWebSocketHeartbeatOptions | undefined,
): NormalizedHeartbeat {
  if (value === false || value == null) {
    return {
      enabled: false,
      message: DEFAULT_HEARTBEAT_MESSAGE,
      responseMessage: DEFAULT_HEARTBEAT_MESSAGE,
      interval: DEFAULT_HEARTBEAT_INTERVAL,
      pongTimeout: DEFAULT_HEARTBEAT_PONG_TIMEOUT,
    }
  }

  if (value === true) {
    return {
      enabled: true,
      message: DEFAULT_HEARTBEAT_MESSAGE,
      responseMessage: DEFAULT_HEARTBEAT_MESSAGE,
      interval: DEFAULT_HEARTBEAT_INTERVAL,
      pongTimeout: DEFAULT_HEARTBEAT_PONG_TIMEOUT,
    }
  }

  const message = value.message ?? DEFAULT_HEARTBEAT_MESSAGE
  return {
    enabled: true,
    message,
    responseMessage: value.responseMessage ?? message,
    interval: normalizeNonNegativeMs(
      value.interval,
      DEFAULT_HEARTBEAT_INTERVAL,
    ),
    pongTimeout: normalizeNonNegativeMs(
      value.pongTimeout,
      DEFAULT_HEARTBEAT_PONG_TIMEOUT,
    ),
  }
}

export function createHeartbeatSignature(
  value: boolean | UseWebSocketHeartbeatOptions | undefined,
): string {
  const normalized = normalizeHeartbeat(value)
  if (!normalized.enabled) {
    return 'off'
  }

  return [
    heartbeatPayloadKey(normalized.message),
    heartbeatPayloadKey(normalized.responseMessage),
    String(normalized.interval),
    String(normalized.pongTimeout),
  ].join('|')
}

function heartbeatPayloadKey(value: string | ArrayBuffer | Blob): string {
  if (typeof value === 'string') {
    return `s:${value}`
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return `b:${value.size}:${value.type}`
  }

  if (value instanceof ArrayBuffer) {
    return `a:${value.byteLength}:${arrayBufferFingerprint(value)}`
  }

  return `u:${String(value)}`
}

function arrayBufferFingerprint(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer)
  const sample = view.slice(0, Math.min(view.length, 32))
  return Array.from(sample).join(',')
}

export function resolveReconnectDelay(
  delay: UseWebSocketReconnectDelay,
  attempt: number,
): number {
  if (typeof delay === 'function') {
    return normalizeNonNegativeMs(delay(attempt), DEFAULT_RECONNECT_DELAY)
  }
  return normalizeNonNegativeMs(delay, DEFAULT_RECONNECT_DELAY)
}

export function shouldAttemptReconnect(
  retries: UseWebSocketReconnectRetries,
  attempt: number,
  event: CloseEvent,
): boolean {
  try {
    if (typeof retries === 'function') {
      return Boolean(retries(attempt, event))
    }

    if (!Number.isFinite(retries)) {
      return false
    }

    if (retries < 0) {
      return true
    }

    return attempt <= retries
  } catch {
    return false
  }
}

export function arrayBuffersEqual(
  left: ArrayBuffer,
  right: ArrayBuffer,
): boolean {
  if (left.byteLength !== right.byteLength) {
    return false
  }
  const leftView = new Uint8Array(left)
  const rightView = new Uint8Array(right)
  for (let index = 0; index < leftView.length; index += 1) {
    if (leftView[index] !== rightView[index]) {
      return false
    }
  }
  return true
}

/**
 * Synchronous heartbeat matching for strings and ArrayBuffers.
 * Blob expected responses are never matched here — use
 * `isBlobHeartbeatCandidate` + `blobsHaveEqualBytes` instead.
 */
export function isHeartbeatResponse(
  received: unknown,
  expected: string | ArrayBuffer | Blob,
): boolean {
  if (typeof expected === 'string') {
    return typeof received === 'string' && received === expected
  }

  if (typeof Blob !== 'undefined' && expected instanceof Blob) {
    return false
  }

  if (expected instanceof ArrayBuffer) {
    return (
      received instanceof ArrayBuffer && arrayBuffersEqual(received, expected)
    )
  }

  return Object.is(received, expected)
}

/**
 * Cheap Blob heartbeat gate: type/size/MIME must match before async
 * byte comparison. Matching size and MIME alone is not sufficient.
 */
export function isBlobHeartbeatCandidate(
  received: unknown,
  expected: Blob,
): received is Blob {
  return (
    typeof Blob !== 'undefined' &&
    received instanceof Blob &&
    received.size === expected.size &&
    received.type === expected.type
  )
}

/**
 * Read Blob bytes using the native API when available, with safe fallbacks
 * for incomplete DOM test environments (for example jsdom without
 * `Blob.prototype.arrayBuffer`).
 */
export async function readBlobArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer()
  }

  if (typeof FileReader === 'function') {
    return await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer)
      }
      reader.onerror = () => {
        reject(reader.error ?? new Error('FileReader failed'))
      }
      reader.readAsArrayBuffer(blob)
    })
  }

  const symbols = Object.getOwnPropertySymbols(blob)
  for (const symbol of symbols) {
    const impl = (
      blob as unknown as Record<symbol, { _buffer?: Uint8Array } | undefined>
    )[symbol]
    if (impl?._buffer != null) {
      const source = impl._buffer
      const copy = new Uint8Array(source.byteLength)
      copy.set(source)
      return copy.buffer
    }
  }

  throw new Error('Blob byte reading is unavailable in this environment')
}

/**
 * Compare Blob payloads by actual byte contents.
 * Rejected reads resolve to `false` (caller should treat as non-heartbeat).
 */
export async function blobsHaveEqualBytes(
  left: Blob,
  right: Blob,
): Promise<boolean> {
  try {
    if (left.size !== right.size || left.type !== right.type) {
      return false
    }
    const [leftBuffer, rightBuffer] = await Promise.all([
      readBlobArrayBuffer(left),
      readBlobArrayBuffer(right),
    ])
    return arrayBuffersEqual(leftBuffer, rightBuffer)
  } catch {
    return false
  }
}

export function getWebSocketConstructor(): typeof WebSocket | null {
  if (typeof WebSocket === 'undefined') {
    return null
  }
  return WebSocket
}

export function isSocketOpen(socket: WebSocket | null | undefined): boolean {
  return socket != null && socket.readyState === socket.OPEN
}

export function isSocketConnecting(
  socket: WebSocket | null | undefined,
): boolean {
  return socket != null && socket.readyState === socket.CONNECTING
}

export function safeCloseSocket(
  socket: WebSocket | null | undefined,
  code?: number,
  reason?: string,
): void {
  if (socket == null) {
    return
  }

  try {
    if (
      socket.readyState === socket.OPEN ||
      socket.readyState === socket.CONNECTING
    ) {
      if (code == null) {
        socket.close()
      } else if (reason == null) {
        socket.close(code)
      } else {
        socket.close(code, reason)
      }
    }
  } catch {
    // Contain native close failures.
  }
}
