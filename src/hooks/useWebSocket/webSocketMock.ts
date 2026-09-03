export const WS_CONNECTING = 0
export const WS_OPEN = 1
export const WS_CLOSING = 2
export const WS_CLOSED = 3

export type MockWebSocketListener = (event: Event) => void

export interface MockWebSocketInstance {
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
  addEventListener: (type: string, listener: MockWebSocketListener) => void
  removeEventListener: (type: string, listener: MockWebSocketListener) => void
  dispatchOpen: () => void
  dispatchMessage: (data: unknown) => void
  dispatchError: () => void
  dispatchClose: (code?: number, reason?: string, wasClean?: boolean) => void
}

export interface MockWebSocketController {
  install: (options?: {
    constructError?: Error | null
    sendError?: Error | null
    closeError?: Error | null
  }) => void
  uninstall: () => void
  instances: MockWebSocketInstance[]
  last: () => MockWebSocketInstance | undefined
  reset: () => void
  setConstructError: (error: Error | null) => void
  setSendError: (error: Error | null) => void
  setCloseError: (error: Error | null) => void
}

let constructError: Error | null = null
let sendError: Error | null = null
let closeError: Error | null = null
let originalWebSocket: typeof WebSocket | undefined
const instances: MockWebSocketInstance[] = []

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

class MockWebSocket {
  static readonly CONNECTING = WS_CONNECTING
  static readonly OPEN = WS_OPEN
  static readonly CLOSING = WS_CLOSING
  static readonly CLOSED = WS_CLOSED

  readonly CONNECTING = WS_CONNECTING
  readonly OPEN = WS_OPEN
  readonly CLOSING = WS_CLOSING
  readonly CLOSED = WS_CLOSED

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

  private readonly listeners = new Map<string, Set<MockWebSocketListener>>()

  constructor(url: string | URL, protocols?: string | string[]) {
    if (constructError != null) {
      throw constructError
    }
    this.url = typeof url === 'string' ? url : url.href
    this.protocols = protocols
    if (typeof protocols === 'string') {
      this.protocol = protocols
    } else if (Array.isArray(protocols) && protocols.length > 0) {
      this.protocol = protocols[0] ?? ''
    }
    instances.push(this as unknown as MockWebSocketInstance)
  }

  send(data: unknown): void {
    if (this.readyState !== WS_OPEN) {
      throw new Error('InvalidStateError: still connecting')
    }
    if (sendError != null) {
      throw sendError
    }
    this.sent.push(data)
  }

  close(code?: number, reason?: string): void {
    if (closeError != null) {
      throw closeError
    }
    this.closeCalls.push(
      code == null && reason == null
        ? {}
        : code == null
          ? { reason: reason ?? '' }
          : reason == null
            ? { code }
            : { code, reason },
    )
    if (this.readyState === WS_CLOSING || this.readyState === WS_CLOSED) {
      return
    }
    this.readyState = WS_CLOSING
    this.readyState = WS_CLOSED
    this.dispatchClose(code ?? 1000, reason ?? '', true)
  }

  addEventListener(type: string, listener: MockWebSocketListener): void {
    const set = this.listeners.get(type) ?? new Set()
    set.add(listener)
    this.listeners.set(type, set)
  }

  removeEventListener(type: string, listener: MockWebSocketListener): void {
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
    this.readyState = WS_CLOSED
    this.emit('close', createCloseEvent(code, reason, wasClean))
  }
}

export function createMockWebSocketController(): MockWebSocketController {
  return {
    install(options = {}) {
      constructError = options.constructError ?? null
      sendError = options.sendError ?? null
      closeError = options.closeError ?? null
      if (originalWebSocket === undefined) {
        originalWebSocket = globalThis.WebSocket
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).WebSocket = MockWebSocket
      instances.length = 0
    },
    uninstall() {
      if (originalWebSocket !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).WebSocket = originalWebSocket
        originalWebSocket = undefined
      }
      constructError = null
      sendError = null
      closeError = null
      instances.length = 0
    },
    get instances() {
      return instances
    },
    last() {
      return instances[instances.length - 1]
    },
    reset() {
      instances.length = 0
      constructError = null
      sendError = null
      closeError = null
    },
    setConstructError(error) {
      constructError = error
    },
    setSendError(error) {
      sendError = error
    },
    setCloseError(error) {
      closeError = error
    },
  }
}
