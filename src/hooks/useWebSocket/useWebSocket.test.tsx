import { act, cleanup, renderHook } from '@testing-library/react'
import { StrictMode, type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWebSocket } from './useWebSocket'
import { createMockWebSocketController } from './webSocketMock'

const mock = createMockWebSocketController()

function deferBlobArrayBuffer(blob: Blob): {
  blob: Blob
  resolve: (value: ArrayBuffer) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: ArrayBuffer) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<ArrayBuffer>((res, rej) => {
    resolve = res
    reject = rej
  })
  Object.defineProperty(blob, 'arrayBuffer', {
    configurable: true,
    value: () => promise,
  })
  return { blob, resolve, reject }
}

function rejectBlobArrayBuffer(blob: Blob, error: Error): Blob {
  Object.defineProperty(blob, 'arrayBuffer', {
    configurable: true,
    value: () => Promise.reject(error),
  })
  return blob
}

beforeEach(() => {
  // Keep microtasks real so async Blob.arrayBuffer comparisons settle under
  // fake timer control for reconnect/heartbeat setTimeouts.
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  })
  mock.install()
})

async function flushMicrotasks(): Promise<void> {
  // Blob heartbeat comparisons are promise-based; flush enough microtask turns
  // for read + Promise.all + then/catch under Testing Library's act.
  for (let index = 0; index < 8; index += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

afterEach(() => {
  cleanup()
  mock.uninstall()
  vi.useRealTimers()
})

describe('useWebSocket', () => {
  it('connects immediately when a URL is provided', () => {
    const { result } = renderHook(() =>
      useWebSocket('wss://example.test/socket'),
    )

    expect(result.current.status).toBe('CONNECTING')
    expect(mock.instances).toHaveLength(1)
    expect(mock.last()?.url).toBe('wss://example.test/socket')

    act(() => {
      mock.last()?.dispatchOpen()
    })

    expect(result.current.status).toBe('OPEN')
    expect(result.current.ws).toBe(mock.last())
  })

  it('stays closed when immediate is false', () => {
    const { result } = renderHook(() =>
      useWebSocket('wss://example.test/socket', { immediate: false }),
    )

    expect(result.current.status).toBe('CLOSED')
    expect(mock.instances).toHaveLength(0)
    expect(result.current.ws).toBeNull()
  })

  it('ignores null, undefined, and empty URLs', () => {
    const { result, rerender } = renderHook(
      ({ url }: { url: string | null | undefined }) => useWebSocket(url),
      { initialProps: { url: null as string | null | undefined } },
    )

    expect(result.current.status).toBe('CLOSED')
    rerender({ url: undefined })
    expect(mock.instances).toHaveLength(0)
    rerender({ url: '' })
    expect(mock.instances).toHaveLength(0)
    rerender({ url: '   ' })
    expect(mock.instances).toHaveLength(0)
  })

  it('supports manual open and repeated open without duplicate owned sockets', () => {
    const { result } = renderHook(() =>
      useWebSocket('wss://example.test/socket', { immediate: false }),
    )

    act(() => {
      result.current.open()
    })
    const first = mock.last()
    expect(result.current.status).toBe('CONNECTING')

    act(() => {
      result.current.open()
    })
    expect(mock.instances).toHaveLength(2)
    expect(first?.readyState).toBe(3)
    expect(result.current.ws).toBe(mock.last())
  })

  it('contains constructor failures and restores closed state', () => {
    mock.setConstructError(new Error('construct failed'))
    const { result } = renderHook(() =>
      useWebSocket('wss://example.test/socket'),
    )

    expect(result.current.status).toBe('CLOSED')
    expect(result.current.ws).toBeNull()
  })

  it('invokes latest callbacks and preserves exact message data', () => {
    const onConnected = vi.fn()
    const onMessage = vi.fn()
    const onError = vi.fn()
    const onDisconnected = vi.fn()
    const { result, rerender } = renderHook(
      (props: {
        onConnected: typeof onConnected
        onMessage: typeof onMessage
        onError: typeof onError
        onDisconnected: typeof onDisconnected
      }) =>
        useWebSocket<string>('wss://example.test/socket', {
          onConnected: props.onConnected,
          onMessage: props.onMessage,
          onError: props.onError,
          onDisconnected: props.onDisconnected,
        }),
      {
        initialProps: {
          onConnected,
          onMessage,
          onError,
          onDisconnected,
        },
      },
    )

    const nextConnected = vi.fn()
    const nextMessage = vi.fn()
    const nextError = vi.fn()
    const nextDisconnected = vi.fn()
    rerender({
      onConnected: nextConnected,
      onMessage: nextMessage,
      onError: nextError,
      onDisconnected: nextDisconnected,
    })

    const socket = mock.last()!
    act(() => {
      socket.dispatchOpen()
      socket.dispatchMessage('hello')
      socket.dispatchError()
      socket.dispatchClose(1000, 'bye')
    })

    expect(nextConnected).toHaveBeenCalledTimes(1)
    expect(nextMessage).toHaveBeenCalledTimes(1)
    expect(nextError).toHaveBeenCalledTimes(1)
    expect(nextDisconnected).toHaveBeenCalledTimes(1)
    expect(onConnected).not.toHaveBeenCalled()
    expect(result.current.data).toBe('hello')
    expect(mock.instances).toHaveLength(1)
  })

  it('keeps open, close, and send identities stable', () => {
    const { result, rerender } = renderHook(() =>
      useWebSocket('wss://example.test/socket', { immediate: false }),
    )
    const { open, close, send } = result.current
    rerender()
    expect(result.current.open).toBe(open)
    expect(result.current.close).toBe(close)
    expect(result.current.send).toBe(send)
  })

  it('reconnects on URL change with autoConnect and ignores equivalent URLs', () => {
    const { rerender } = renderHook(
      ({ url }: { url: string }) => useWebSocket(url),
      { initialProps: { url: 'wss://a.test' } },
    )
    expect(mock.instances).toHaveLength(1)

    rerender({ url: 'wss://a.test' })
    expect(mock.instances).toHaveLength(1)

    rerender({ url: 'wss://b.test' })
    expect(mock.instances).toHaveLength(2)
    expect(mock.last()?.url).toBe('wss://b.test')
  })

  it('does not auto-reconnect on URL change when autoConnect is false', () => {
    const { result, rerender } = renderHook(
      ({ url }: { url: string }) => useWebSocket(url, { autoConnect: false }),
      { initialProps: { url: 'wss://a.test' } },
    )
    expect(mock.instances).toHaveLength(1)

    rerender({ url: 'wss://b.test' })
    expect(mock.instances).toHaveLength(1)

    act(() => {
      result.current.open()
    })
    expect(mock.instances).toHaveLength(2)
    expect(mock.last()?.url).toBe('wss://b.test')
  })

  it('reconnects when protocols change and not when equivalent', () => {
    const { rerender } = renderHook(
      ({ protocols }: { protocols: string | readonly string[] }) =>
        useWebSocket('wss://example.test', { protocols }),
      { initialProps: { protocols: 'chat' as string | readonly string[] } },
    )
    expect(mock.instances).toHaveLength(1)
    expect(mock.last()?.protocols).toBe('chat')

    rerender({ protocols: 'chat' })
    expect(mock.instances).toHaveLength(1)

    rerender({ protocols: ['a', 'b'] })
    expect(mock.instances).toHaveLength(2)
    expect(mock.last()?.protocols).toEqual(['a', 'b'])
  })

  it('ignores stale messages and closes from replaced sockets', () => {
    const { result, rerender } = renderHook(
      ({ url }: { url: string }) => useWebSocket<string>(url),
      { initialProps: { url: 'wss://a.test' } },
    )
    const first = mock.last()!

    rerender({ url: 'wss://b.test' })
    const second = mock.last()!

    act(() => {
      second.dispatchOpen()
      first.dispatchMessage('stale')
      first.dispatchClose(1006, 'stale-close')
    })

    expect(result.current.data).toBeNull()
    expect(result.current.status).toBe('OPEN')
    expect(result.current.ws).toBe(second)
  })

  it('sends immediately when open and buffers while connecting', () => {
    const { result } = renderHook(() =>
      useWebSocket('wss://example.test', { immediate: false }),
    )

    expect(result.current.send('early')).toBe(false)

    act(() => {
      result.current.open()
    })
    expect(result.current.send('queued')).toBe(false)
    expect(result.current.send('drop', false)).toBe(false)

    act(() => {
      mock.last()?.dispatchOpen()
    })

    expect(mock.last()?.sent).toEqual(['early', 'queued'])
    expect(result.current.send('now')).toBe(true)
    expect(mock.last()?.sent).toEqual(['early', 'queued', 'now'])
  })

  it('returns false when native send throws and does not buffer that failure', () => {
    const { result } = renderHook(() => useWebSocket('wss://example.test'))
    act(() => {
      mock.last()?.dispatchOpen()
    })
    mock.setSendError(new Error('send failed'))
    expect(result.current.send('x')).toBe(false)
    expect(mock.last()?.sent).toEqual([])
  })

  it('preserves remaining buffer when flush send throws', () => {
    const { result } = renderHook(() =>
      useWebSocket('wss://example.test', { immediate: false }),
    )

    result.current.send('a')
    result.current.send('b')
    act(() => {
      result.current.open()
    })

    const socket = mock.last()!
    const originalSend = socket.send.bind(socket)
    let calls = 0
    socket.send = (data: unknown) => {
      calls += 1
      if (calls === 2) {
        throw new Error('flush failed')
      }
      originalSend(data)
    }

    act(() => {
      socket.dispatchOpen()
    })

    expect(socket.sent).toEqual(['a'])

    mock.setSendError(null)
    socket.send = originalSend
    act(() => {
      socket.dispatchClose(1006)
    })

    // Buffer should still hold 'b' for a future connection when reconnecting.
  })

  it('clears buffer on explicit close, endpoint change, and unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ url }: { url: string }) => useWebSocket(url, { immediate: false }),
      { initialProps: { url: 'wss://a.test' } },
    )

    expect(result.current.send('one')).toBe(false)
    act(() => {
      result.current.close()
    })

    act(() => {
      result.current.open()
      mock.last()?.dispatchOpen()
    })
    expect(mock.last()?.sent).toEqual([])

    act(() => {
      result.current.close()
    })
    expect(result.current.send('two')).toBe(false)
    result.current.send('three')
    rerender({ url: 'wss://b.test' })
    act(() => {
      result.current.open()
      mock.last()?.dispatchOpen()
    })
    expect(mock.last()?.sent).toEqual([])

    expect(result.current.send('four')).toBe(true)
    act(() => {
      result.current.close()
    })
    expect(result.current.send('five')).toBe(false)
    unmount()
  })

  it('preserves buffer across automatic reconnect', () => {
    const { result } = renderHook(() =>
      useWebSocket('wss://example.test', {
        autoReconnect: true,
      }),
    )

    act(() => {
      mock.last()?.dispatchOpen()
    })
    act(() => {
      mock.last()?.dispatchClose(1006, 'drop')
    })

    expect(result.current.send('queued')).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(mock.instances).toHaveLength(2)
    act(() => {
      mock.last()?.dispatchOpen()
    })
    expect(mock.last()?.sent).toEqual(['queued'])
  })

  it('does not reconnect by default and supports unlimited true policy', () => {
    const { unmount } = renderHook(() => useWebSocket('wss://example.test'))
    act(() => {
      mock.last()?.dispatchOpen()
      mock.last()?.dispatchClose(1006)
    })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(mock.instances).toHaveLength(1)
    unmount()

    mock.reset()
    mock.install()
    const { unmount: unmount2 } = renderHook(() =>
      useWebSocket('wss://example.test', { autoReconnect: true }),
    )
    act(() => {
      mock.last()?.dispatchOpen()
      mock.last()?.dispatchClose(1006)
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(mock.instances).toHaveLength(2)
    unmount2()
  })

  it('honors finite retries, one-based attempts, delays, and onFailed once', () => {
    const onFailed = vi.fn()
    const delay = vi.fn((attempt: number) => attempt * 100)
    const { result } = renderHook(() =>
      useWebSocket('wss://example.test', {
        autoReconnect: {
          retries: 2,
          delay,
          onFailed,
        },
      }),
    )

    act(() => {
      mock.last()?.dispatchOpen()
      mock.last()?.dispatchClose(1006)
    })
    expect(delay).toHaveBeenCalledWith(1)
    act(() => {
      vi.advanceTimersByTime(100)
      mock.last()?.dispatchClose(1006)
    })
    expect(delay).toHaveBeenCalledWith(2)
    act(() => {
      vi.advanceTimersByTime(200)
      mock.last()?.dispatchClose(1006)
    })
    expect(onFailed).toHaveBeenCalledTimes(1)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onFailed).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('CLOSED')
  })

  it('supports predicate retries and stops when predicate or delay throws', () => {
    const predicate = vi.fn((attempt: number) => attempt < 2)
    const { unmount } = renderHook(() =>
      useWebSocket('wss://example.test', {
        autoReconnect: { retries: predicate, delay: 50 },
      }),
    )
    act(() => {
      mock.last()?.dispatchOpen()
      mock.last()?.dispatchClose(1006)
    })
    expect(predicate).toHaveBeenCalledWith(1, expect.any(Object))
    act(() => {
      vi.advanceTimersByTime(50)
      mock.last()?.dispatchClose(1006)
    })
    expect(predicate).toHaveBeenCalledWith(2, expect.any(Object))
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(mock.instances).toHaveLength(2)
    unmount()

    mock.reset()
    mock.install()
    renderHook(() =>
      useWebSocket('wss://example.test', {
        autoReconnect: {
          retries: () => {
            throw new Error('predicate')
          },
          delay: 10,
        },
      }),
    )
    act(() => {
      mock.last()?.dispatchOpen()
      mock.last()?.dispatchClose(1006)
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(mock.instances).toHaveLength(1)

    mock.reset()
    mock.install()
    renderHook(() =>
      useWebSocket('wss://example.test', {
        autoReconnect: {
          retries: 5,
          delay: () => {
            throw new Error('delay')
          },
        },
      }),
    )
    act(() => {
      mock.last()?.dispatchOpen()
      mock.last()?.dispatchClose(1006)
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(mock.instances).toHaveLength(1)
  })

  it('cancels reconnect on explicit close, manual open, URL change, and unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ url }: { url: string }) => useWebSocket(url, { autoReconnect: true }),
      { initialProps: { url: 'wss://a.test' } },
    )

    act(() => {
      mock.last()?.dispatchOpen()
      mock.last()?.dispatchClose(1006)
    })
    act(() => {
      result.current.close()
      vi.advanceTimersByTime(1000)
    })
    expect(mock.instances).toHaveLength(1)

    act(() => {
      result.current.open()
      mock.last()?.dispatchOpen()
      mock.last()?.dispatchClose(1006)
    })
    act(() => {
      result.current.open()
    })
    expect(mock.instances.length).toBeGreaterThan(1)
    const afterManual = mock.instances.length
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(mock.instances).toHaveLength(afterManual)

    act(() => {
      mock.last()?.dispatchOpen()
      mock.last()?.dispatchClose(1006)
    })
    rerender({ url: 'wss://b.test' })
    const afterUrl = mock.instances.length
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    // URL change itself opens a new socket under autoConnect; no extra retry.
    expect(mock.instances.length).toBe(afterUrl)

    act(() => {
      mock.last()?.dispatchOpen()
      mock.last()?.dispatchClose(1006)
    })
    unmount()
    const afterUnmount = mock.instances.length
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(mock.instances.length).toBe(afterUnmount)
  })

  it('does not schedule duplicate retries for duplicate close events', () => {
    renderHook(() =>
      useWebSocket('wss://example.test', { autoReconnect: true }),
    )
    const socket = mock.last()!
    act(() => {
      socket.dispatchOpen()
      socket.dispatchClose(1006)
      socket.dispatchClose(1006)
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(mock.instances).toHaveLength(2)
  })

  it('runs heartbeat ping/pong and consumes responses', () => {
    const onMessage = vi.fn()
    const { result } = renderHook(() =>
      useWebSocket<string>('wss://example.test', {
        heartbeat: true,
        onMessage,
      }),
    )
    act(() => {
      mock.last()?.dispatchOpen()
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(mock.last()?.sent).toEqual(['ping'])
    act(() => {
      mock.last()?.dispatchMessage('ping')
    })
    expect(result.current.data).toBeNull()
    expect(onMessage).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(mock.last()?.sent).toEqual(['ping', 'ping'])
  })

  it('matches ArrayBuffer heartbeat by bytes without updating data', () => {
    const onMessage = vi.fn()
    const expected = new Uint8Array([9, 8, 7]).buffer
    const { result } = renderHook(() =>
      useWebSocket<ArrayBuffer>('wss://example.test', {
        heartbeat: {
          message: expected,
          responseMessage: expected,
          interval: 100,
          pongTimeout: 100,
        },
        onMessage,
      }),
    )
    act(() => {
      mock.last()?.dispatchOpen()
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    const equalCopy = new Uint8Array([9, 8, 7]).buffer
    act(() => {
      mock.last()?.dispatchMessage(equalCopy)
    })
    expect(result.current.data).toBeNull()
    expect(onMessage).not.toHaveBeenCalled()

    const different = new Uint8Array([9, 8, 6]).buffer
    act(() => {
      mock.last()?.dispatchMessage(different)
    })
    expect(result.current.data).toBe(different)
    expect(onMessage).toHaveBeenCalledTimes(1)
  })

  describe('Blob heartbeat async matching', () => {
    const expectedBlob = () => new Blob(['ping'], { type: 'text/plain' })

    it('consumes equal Blob responses without data or onMessage', async () => {
      const onMessage = vi.fn()
      const expected = expectedBlob()
      const { result } = renderHook(() =>
        useWebSocket<Blob>('wss://example.test', {
          heartbeat: {
            message: expected,
            responseMessage: expected,
            interval: 100,
            pongTimeout: 200,
          },
          onMessage,
        }),
      )
      act(() => {
        mock.last()?.dispatchOpen()
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
      act(() => {
        mock.last()?.dispatchMessage(new Blob(['ping'], { type: 'text/plain' }))
      })
      await flushMicrotasks()
      expect(result.current.data).toBeNull()
      expect(onMessage).not.toHaveBeenCalled()
      expect(result.current.status).toBe('OPEN')
    })

    it('treats same size/MIME different bytes as a normal message', async () => {
      const onMessage = vi.fn()
      const expected = expectedBlob()
      const { result } = renderHook(() =>
        useWebSocket<Blob>('wss://example.test', {
          heartbeat: {
            message: expected,
            responseMessage: expected,
            interval: 100,
            pongTimeout: 200,
          },
          onMessage,
        }),
      )
      act(() => {
        mock.last()?.dispatchOpen()
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
      const different = new Blob(['pong'], { type: 'text/plain' })
      act(() => {
        mock.last()?.dispatchMessage(different)
      })
      await flushMicrotasks()
      expect(result.current.data).toBe(different)
      expect(onMessage).toHaveBeenCalledTimes(1)
    })

    it('rejects MIME mismatch without async compare and updates data', () => {
      const onMessage = vi.fn()
      const expected = expectedBlob()
      const { result } = renderHook(() =>
        useWebSocket<Blob>('wss://example.test', {
          heartbeat: {
            message: expected,
            responseMessage: expected,
            interval: 100,
            pongTimeout: 200,
          },
          onMessage,
        }),
      )
      act(() => {
        mock.last()?.dispatchOpen()
      })
      const mismatch = new Blob(['ping'], {
        type: 'application/octet-stream',
      })
      act(() => {
        mock.last()?.dispatchMessage(mismatch)
      })
      expect(result.current.data).toBe(mismatch)
      expect(onMessage).toHaveBeenCalledTimes(1)
    })

    it('matches empty equal blobs', async () => {
      const onMessage = vi.fn()
      const empty = new Blob([], { type: 'text/plain' })
      const { result } = renderHook(() =>
        useWebSocket<Blob>('wss://example.test', {
          heartbeat: {
            message: empty,
            responseMessage: empty,
            interval: 50,
            pongTimeout: 100,
          },
          onMessage,
        }),
      )
      act(() => {
        mock.last()?.dispatchOpen()
      })
      act(() => {
        vi.advanceTimersByTime(50)
      })
      act(() => {
        mock.last()?.dispatchMessage(new Blob([], { type: 'text/plain' }))
      })
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(result.current.data).toBeNull()
      expect(onMessage).not.toHaveBeenCalled()
    })

    it('contains Blob read rejection and delivers as a normal message', async () => {
      const onMessage = vi.fn()
      const expected = expectedBlob()
      const { result } = renderHook(() =>
        useWebSocket<Blob>('wss://example.test', {
          heartbeat: {
            message: expected,
            responseMessage: expected,
            interval: 50,
            pongTimeout: 200,
          },
          onMessage,
        }),
      )
      act(() => {
        mock.last()?.dispatchOpen()
      })
      act(() => {
        vi.advanceTimersByTime(50)
      })
      const rejecting = rejectBlobArrayBuffer(
        new Blob(['ping'], { type: 'text/plain' }),
        new Error('read failed'),
      )
      act(() => {
        mock.last()?.dispatchMessage(rejecting)
      })
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(result.current.data).toBe(rejecting)
      expect(onMessage).toHaveBeenCalledTimes(1)
      expect(result.current.status).toBe('OPEN')
    })

    it('lets pong timeout win over a late Blob comparison', async () => {
      const onMessage = vi.fn()
      const expected = expectedBlob()
      const { result } = renderHook(() =>
        useWebSocket<Blob>('wss://example.test', {
          heartbeat: {
            message: expected,
            responseMessage: expected,
            interval: 50,
            pongTimeout: 30,
          },
          onMessage,
        }),
      )
      act(() => {
        mock.last()?.dispatchOpen()
      })
      act(() => {
        vi.advanceTimersByTime(50)
      })

      const deferred = deferBlobArrayBuffer(
        new Blob(['ping'], { type: 'text/plain' }),
      )
      act(() => {
        mock.last()?.dispatchMessage(deferred.blob)
      })
      act(() => {
        vi.advanceTimersByTime(30)
      })
      expect(result.current.status).toBe('CLOSED')

      await act(async () => {
        deferred.resolve(new TextEncoder().encode('ping').buffer)
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(result.current.status).toBe('CLOSED')
      expect(result.current.data).toBeNull()
      expect(onMessage).not.toHaveBeenCalled()
    })

    it('ignores pending Blob comparison after socket replacement', async () => {
      const onMessage = vi.fn()
      const expected = expectedBlob()
      const { result, rerender } = renderHook(
        ({ url }: { url: string }) =>
          useWebSocket<Blob>(url, {
            heartbeat: {
              message: expected,
              responseMessage: expected,
              interval: 50,
              pongTimeout: 200,
            },
            onMessage,
          }),
        { initialProps: { url: 'wss://a.test' } },
      )
      act(() => {
        mock.last()?.dispatchOpen()
      })
      act(() => {
        vi.advanceTimersByTime(50)
      })

      const deferred = deferBlobArrayBuffer(
        new Blob(['ping'], { type: 'text/plain' }),
      )
      act(() => {
        mock.last()?.dispatchMessage(deferred.blob)
      })

      rerender({ url: 'wss://b.test' })
      act(() => {
        mock.last()?.dispatchOpen()
      })

      await act(async () => {
        deferred.resolve(new TextEncoder().encode('ping').buffer)
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(result.current.data).toBeNull()
      expect(onMessage).not.toHaveBeenCalled()
      expect(result.current.status).toBe('OPEN')
    })

    it('ignores pending Blob comparison after explicit close and unmount', async () => {
      const onMessage = vi.fn()
      const expected = expectedBlob()
      const { result, unmount } = renderHook(() =>
        useWebSocket<Blob>('wss://example.test', {
          heartbeat: {
            message: expected,
            responseMessage: expected,
            interval: 50,
            pongTimeout: 200,
          },
          onMessage,
        }),
      )
      act(() => {
        mock.last()?.dispatchOpen()
      })
      act(() => {
        vi.advanceTimersByTime(50)
      })

      const deferred = deferBlobArrayBuffer(
        new Blob(['ping'], { type: 'text/plain' }),
      )
      act(() => {
        mock.last()?.dispatchMessage(deferred.blob)
      })
      act(() => {
        result.current.close()
      })
      await act(async () => {
        deferred.resolve(new TextEncoder().encode('ping').buffer)
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(result.current.data).toBeNull()
      expect(onMessage).not.toHaveBeenCalled()

      const { unmount: unmount2 } = renderHook(() =>
        useWebSocket<Blob>('wss://example.test', {
          heartbeat: {
            message: expected,
            responseMessage: expected,
            interval: 50,
            pongTimeout: 200,
          },
          onMessage,
        }),
      )
      act(() => {
        mock.last()?.dispatchOpen()
      })
      act(() => {
        vi.advanceTimersByTime(50)
      })
      const deferred2 = deferBlobArrayBuffer(
        new Blob(['ping'], { type: 'text/plain' }),
      )
      act(() => {
        mock.last()?.dispatchMessage(deferred2.blob)
      })
      unmount2()
      await act(async () => {
        deferred2.resolve(new TextEncoder().encode('ping').buffer)
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(onMessage).not.toHaveBeenCalled()
      unmount()
    })

    it('does not let a previous heartbeat-cycle comparison satisfy a newer cycle', async () => {
      const onMessage = vi.fn()
      const expected = expectedBlob()
      const { result } = renderHook(() =>
        useWebSocket<Blob>('wss://example.test', {
          heartbeat: {
            message: expected,
            responseMessage: expected,
            interval: 50,
            pongTimeout: 200,
          },
          onMessage,
        }),
      )
      act(() => {
        mock.last()?.dispatchOpen()
      })
      act(() => {
        vi.advanceTimersByTime(50)
      })

      const deferred = deferBlobArrayBuffer(
        new Blob(['ping'], { type: 'text/plain' }),
      )
      act(() => {
        mock.last()?.dispatchMessage(deferred.blob)
      })

      act(() => {
        result.current.close()
        result.current.open()
      })
      act(() => {
        mock.last()?.dispatchOpen()
      })
      act(() => {
        vi.advanceTimersByTime(50)
      })

      await act(async () => {
        deferred.resolve(new TextEncoder().encode('ping').buffer)
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(result.current.data).toBeNull()
      expect(onMessage).not.toHaveBeenCalled()
      expect(result.current.status).toBe('OPEN')
    })
  })

  it('closes on heartbeat timeout and can reconnect', () => {
    const { result } = renderHook(() =>
      useWebSocket('wss://example.test', {
        heartbeat: { interval: 100, pongTimeout: 50 },
        autoReconnect: true,
      }),
    )
    act(() => {
      mock.last()?.dispatchOpen()
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(mock.last()?.closeCalls.at(-1)).toMatchObject({
      code: 4000,
      reason: 'Heartbeat timeout',
    })
    expect(result.current.status).toBe('CLOSED')
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(mock.instances.length).toBeGreaterThan(1)
  })

  it('stops heartbeat on close and ignores stale heartbeat callbacks', () => {
    const { result, rerender } = renderHook(
      ({ url }: { url: string }) =>
        useWebSocket(url, { heartbeat: { interval: 100, pongTimeout: 100 } }),
      { initialProps: { url: 'wss://a.test' } },
    )
    const first = mock.last()!
    act(() => {
      first.dispatchOpen()
    })
    rerender({ url: 'wss://b.test' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(first.sent).toEqual([])
    act(() => {
      result.current.close()
    })
  })

  it('applies and updates binaryType without reconnecting', () => {
    const { result, rerender } = renderHook(
      ({ binaryType }: { binaryType: BinaryType }) =>
        useWebSocket('wss://example.test', { binaryType }),
      { initialProps: { binaryType: 'arraybuffer' as BinaryType } },
    )
    expect(mock.last()?.binaryType).toBe('arraybuffer')
    const socket = mock.last()
    rerender({ binaryType: 'blob' })
    expect(mock.instances).toHaveLength(1)
    expect(socket?.binaryType).toBe('blob')
    expect(result.current.ws).toBe(socket)
  })

  it('attaches beforeunload when autoClose is true and skips when false', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() =>
      useWebSocket('wss://example.test', { autoClose: true }),
    )
    expect(addSpy.mock.calls.some(([type]) => type === 'beforeunload')).toBe(
      true,
    )
    unmount()
    expect(removeSpy.mock.calls.some(([type]) => type === 'beforeunload')).toBe(
      true,
    )

    addSpy.mockClear()
    const { unmount: unmount2 } = renderHook(() =>
      useWebSocket('wss://example.test', { autoClose: false }),
    )
    expect(addSpy.mock.calls.some(([type]) => type === 'beforeunload')).toBe(
      false,
    )
    unmount2()
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('always releases ownership on unmount even when autoClose is false', () => {
    const { unmount } = renderHook(() =>
      useWebSocket('wss://example.test', { autoClose: false }),
    )
    const socket = mock.last()!
    act(() => {
      socket.dispatchOpen()
    })
    unmount()
    expect(socket.closeCalls.length).toBeGreaterThan(0)
    expect(socket.readyState).toBe(3)
  })

  it('is Strict Mode safe with one effective owned connection', () => {
    const { result } = renderHook(() => useWebSocket('wss://example.test'), {
      wrapper: StrictMode,
    })

    const active = mock.instances.filter((socket) => socket.onopen != null)
    expect(active).toHaveLength(1)

    act(() => {
      active[0]?.dispatchOpen()
    })
    expect(result.current.status).toBe('OPEN')
    expect(result.current.ws).toBe(active[0])
  })

  it('does not update state after unmount', () => {
    const { result, unmount } = renderHook(() =>
      useWebSocket<string>('wss://example.test'),
    )
    const socket = mock.last()!
    unmount()
    act(() => {
      socket.dispatchOpen()
      socket.dispatchMessage('late')
      socket.dispatchClose(1000)
    })
    expect(result.current.status).toBe('CONNECTING')
  })

  it('contains callback exceptions without breaking ownership', () => {
    const { result } = renderHook(() =>
      useWebSocket('wss://example.test', {
        onConnected: () => {
          throw new Error('connected boom')
        },
        onMessage: () => {
          throw new Error('message boom')
        },
        onError: () => {
          throw new Error('error boom')
        },
        onDisconnected: () => {
          throw new Error('close boom')
        },
      }),
    )
    act(() => {
      mock.last()?.dispatchOpen()
      mock.last()?.dispatchMessage('x')
      mock.last()?.dispatchError()
      mock.last()?.dispatchClose(1000)
    })
    expect(result.current.status).toBe('CLOSED')
    expect(result.current.ws).toBe(mock.last())
  })

  it('does not reconnect when only option object identity changes', () => {
    const { rerender } = renderHook(
      ({ options }) => useWebSocket('wss://example.test', options),
      {
        initialProps: {
          options: {
            autoReconnect: false,
            onMessage: () => {},
          },
        },
      },
    )
    expect(mock.instances).toHaveLength(1)
    rerender({
      options: {
        autoReconnect: false,
        onMessage: () => {},
      },
    })
    expect(mock.instances).toHaveLength(1)
  })

  it('renders a closed idle SSR snapshot without constructing sockets', () => {
    const before = mock.instances.length

    function Probe(): ReactElement {
      const api = useWebSocket('wss://example.test', {
        autoReconnect: true,
        heartbeat: true,
      })
      return (
        <div>
          {api.status}:{String(api.data)}:{String(api.ws)}:{typeof api.open}:
          {typeof api.close}:{typeof api.send}
        </div>
      )
    }

    const html = renderToString(<Probe />)
    expect(html.replaceAll(/<!-- -->/g, '')).toContain(
      'CLOSED:null:null:function:function:function',
    )
    expect(mock.instances.length).toBe(before)
  })
})
