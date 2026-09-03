import { expectTypeOf, test } from 'vitest'

import {
  useWebSocket,
  type UseWebSocketAutoReconnectOptions,
  type UseWebSocketHeartbeatOptions,
  type UseWebSocketOptions,
  type UseWebSocketReturn,
  type UseWebSocketSendData,
  type UseWebSocketStatus,
} from './useWebSocket'
import {
  useWebSocket as useWebSocketRoot,
  type UseWebSocketOptions as UseWebSocketOptionsRoot,
  type UseWebSocketReturn as UseWebSocketReturnRoot,
  type UseWebSocketStatus as UseWebSocketStatusRoot,
} from '../../index'

test('useWebSocket default and explicit generics', () => {
  const defaults = useWebSocket('wss://example.test')
  expectTypeOf(defaults).toEqualTypeOf<UseWebSocketReturn>()
  expectTypeOf(defaults.data).toEqualTypeOf<unknown | null>()
  expectTypeOf(defaults.status).toEqualTypeOf<UseWebSocketStatus>()
  expectTypeOf(defaults.ws).toEqualTypeOf<WebSocket | null>()
  expectTypeOf(defaults.send).returns.toBeBoolean()
  expectTypeOf(defaults.open).returns.toBeVoid()
  expectTypeOf(defaults.close).returns.toBeVoid()

  const strings = useWebSocket<string>('wss://example.test')
  expectTypeOf(strings.data).toEqualTypeOf<string | null>()

  const objects = useWebSocket<{ id: number }>('wss://example.test')
  expectTypeOf(objects.data).toEqualTypeOf<{ id: number } | null>()

  const binary = useWebSocket<ArrayBuffer>('wss://example.test', {
    binaryType: 'arraybuffer',
  })
  expectTypeOf(binary.data).toEqualTypeOf<ArrayBuffer | null>()
})

test('useWebSocket URL, protocols, reconnect, heartbeat, and callbacks', () => {
  useWebSocket(null)
  useWebSocket(undefined)
  useWebSocket(new URL('wss://example.test'))
  useWebSocket('wss://example.test', { protocols: 'chat' })
  useWebSocket('wss://example.test', { protocols: ['a', 'b'] as const })

  const reconnect: UseWebSocketAutoReconnectOptions = {
    retries: 3,
    delay: (attempt) => attempt * 100,
    onFailed: () => {},
  }
  const reconnectPredicate: UseWebSocketAutoReconnectOptions = {
    retries: (attempt, event) => attempt < 3 && event.code !== 1000,
  }
  const heartbeat: UseWebSocketHeartbeatOptions = {
    message: 'ping',
    responseMessage: 'pong',
    interval: 1000,
    pongTimeout: 500,
  }

  useWebSocket('wss://example.test', {
    immediate: false,
    autoConnect: true,
    autoClose: true,
    autoReconnect: reconnect,
    heartbeat,
    binaryType: 'blob',
    onConnected: (socket) => {
      expectTypeOf(socket).toEqualTypeOf<WebSocket>()
    },
    onDisconnected: (socket, event) => {
      expectTypeOf(socket).toEqualTypeOf<WebSocket>()
      expectTypeOf(event).toEqualTypeOf<CloseEvent>()
    },
    onError: (socket, event) => {
      expectTypeOf(socket).toEqualTypeOf<WebSocket>()
      expectTypeOf(event).toEqualTypeOf<Event>()
    },
    onMessage: (socket, event) => {
      expectTypeOf(socket).toEqualTypeOf<WebSocket>()
      expectTypeOf(event).toEqualTypeOf<MessageEvent<unknown>>()
    },
  })

  useWebSocket('wss://example.test', {
    autoReconnect: reconnectPredicate,
    heartbeat: true,
  })

  const api = useWebSocket('wss://example.test')
  const payload: UseWebSocketSendData = 'hello'
  expectTypeOf(api.send(payload)).toBeBoolean()
  expectTypeOf(api.send(new Uint8Array([1]), false)).toBeBoolean()

  expectTypeOf<UseWebSocketOptions>().toMatchTypeOf<{
    immediate?: boolean
    autoConnect?: boolean
    autoClose?: boolean
  }>()
  expectTypeOf<UseWebSocketStatus>().toEqualTypeOf<
    'OPEN' | 'CONNECTING' | 'CLOSED'
  >()
})

test('root imports and negative cases', () => {
  expectTypeOf(useWebSocketRoot).toEqualTypeOf(useWebSocket)
  expectTypeOf<UseWebSocketOptionsRoot>().toEqualTypeOf<UseWebSocketOptions>()
  expectTypeOf<UseWebSocketReturnRoot>().toEqualTypeOf<UseWebSocketReturn>()
  expectTypeOf<UseWebSocketStatusRoot>().toEqualTypeOf<UseWebSocketStatus>()

  // @ts-expect-error status is not assignable from invalid string
  const badStatus: UseWebSocketStatus = 'OPENING'
  void badStatus

  // @ts-expect-error protocols cannot be a number
  useWebSocket('wss://example.test', { protocols: 1 })

  // @ts-expect-error onConnected must be a function
  useWebSocket('wss://example.test', { onConnected: true })

  // @ts-expect-error retries cannot be a string
  useWebSocket('wss://example.test', { autoReconnect: { retries: 'forever' } })

  // @ts-expect-error heartbeat interval must be a number
  useWebSocket('wss://example.test', { heartbeat: { interval: 'soon' } })

  // @ts-expect-error binaryType must be BinaryType
  useWebSocket('wss://example.test', { binaryType: 'text' })

  // @ts-expect-error URL cannot be a number
  useWebSocket(123)

  const api = useWebSocket('wss://example.test')
  // @ts-expect-error send payload cannot be a plain number
  api.send(123)
})
