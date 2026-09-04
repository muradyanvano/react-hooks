import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useEyeDropper } from './useEyeDropper'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function installEyeDropperMock(options?: {
  openImpl?: (signal?: AbortSignal) => Promise<{ sRGBHex: string } | unknown>
  constructorThrow?: Error
  openThrow?: Error
}) {
  const order: string[] = []
  let openCount = 0
  let ctorCount = 0
  const original = Object.getOwnPropertyDescriptor(window, 'EyeDropper')

  class MockEyeDropper {
    open(openOptions?: { signal?: AbortSignal }) {
      openCount += 1
      order.push('native open() called')
      if (options?.openThrow) {
        throw options.openThrow
      }
      if (options?.openImpl) {
        return options.openImpl(openOptions?.signal) as Promise<{
          sRGBHex: string
        }>
      }
      return Promise.resolve({ sRGBHex: '#AABBCC' })
    }
  }

  const Ctor = options?.constructorThrow
    ? function ThrowingCtor() {
        ctorCount += 1
        order.push('constructor called')
        throw options.constructorThrow
      }
    : class TrackingCtor extends MockEyeDropper {
        constructor() {
          super()
          ctorCount += 1
          order.push('constructor called')
        }
      }

  Object.defineProperty(window, 'EyeDropper', {
    configurable: true,
    writable: true,
    value: Ctor,
  })

  return {
    order,
    get openCount() {
      return openCount
    },
    get ctorCount() {
      return ctorCount
    },
    restore() {
      if (original == null) {
        Reflect.deleteProperty(window, 'EyeDropper')
      } else {
        Object.defineProperty(window, 'EyeDropper', original)
      }
    },
  }
}

describe('useEyeDropper', () => {
  let restore: (() => void) | undefined

  afterEach(() => {
    restore?.()
    restore = undefined
  })

  it('starts idle unsupported until mount detects constructor', async () => {
    const mock = installEyeDropperMock()
    restore = mock.restore

    let first: ReturnType<typeof useEyeDropper> | null = null
    const { result, unmount } = renderHook(() => {
      const value = useEyeDropper()
      if (first == null) {
        first = { ...value }
      }
      return value
    })

    expect(first).toMatchObject({
      isSupported: false,
      sRGBHex: '',
      isPicking: false,
      error: null,
    })

    await waitFor(() => expect(result.current.isSupported).toBe(true))
    expect(mock.ctorCount).toBe(0)
    unmount()
  })

  it('opens synchronously preserving user-activation ordering', async () => {
    const mock = installEyeDropperMock()
    restore = mock.restore
    const { result } = renderHook(() => useEyeDropper())
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    mock.order.length = 0
    mock.order.push('consumer-open')
    // Synchronous section — no await until after native open has been invoked.
    const pending = result.current.open()
    mock.order.push('consumer-after-open-call')
    expect(mock.order.slice(0, 4)).toEqual([
      'consumer-open',
      'constructor called',
      'native open() called',
      'consumer-after-open-call',
    ])

    await act(async () => {
      mock.order.push('native-settlement')
      await pending
      mock.order.push('public-settlement')
    })

    expect(mock.order[0]).toBe('consumer-open')
    expect(mock.order[1]).toBe('constructor called')
    expect(mock.order[2]).toBe('native open() called')
    expect(mock.order[3]).toBe('consumer-after-open-call')
    expect(mock.order).toContain('native-settlement')
    expect(mock.order).toContain('public-settlement')
    await expect(pending).resolves.toBe('#aabbcc')
    expect(result.current.sRGBHex).toBe('#aabbcc')
    expect(result.current.isPicking).toBe(false)
  })

  it('seeds initialValue once and reset uses the latest committed value', async () => {
    const mock = installEyeDropperMock()
    restore = mock.restore
    const { result, rerender } = renderHook(
      ({ initialValue }) => useEyeDropper({ initialValue }),
      { initialProps: { initialValue: '#112233' } },
    )
    expect(result.current.sRGBHex).toBe('#112233')

    await act(async () => {
      await result.current.open()
    })
    expect(result.current.sRGBHex).toBe('#aabbcc')

    rerender({ initialValue: '#445566' })
    expect(result.current.sRGBHex).toBe('#aabbcc')

    act(() => {
      result.current.reset()
    })
    expect(result.current.sRGBHex).toBe('#445566')
  })

  it('cancels with AbortError without setting error by default', async () => {
    const pending = deferred<{ sRGBHex: string }>()
    const mock = installEyeDropperMock({
      openImpl: (signal) => {
        return new Promise((resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
          pending.promise.then(resolve, reject)
        })
      },
    })
    restore = mock.restore
    const { result } = renderHook(() => useEyeDropper())
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let openPromise!: Promise<string | null>
    await act(async () => {
      openPromise = result.current.open()
    })
    expect(result.current.isPicking).toBe(true)

    await act(async () => {
      result.current.cancel()
      await openPromise
    })
    expect(result.current.isPicking).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('reports abort when treatAbortAsError is true', async () => {
    const onError = vi.fn()
    const mock = installEyeDropperMock({
      openImpl: (signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    })
    restore = mock.restore
    const { result } = renderHook(() =>
      useEyeDropper({ treatAbortAsError: true, onError }),
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let openPromise!: Promise<string | null>
    await act(async () => {
      openPromise = result.current.open()
    })
    await act(async () => {
      result.current.cancel()
      await openPromise
    })
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.name).toBe('AbortError')
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('keeps newest request ownership across overlapping opens', async () => {
    const first = deferred<{ sRGBHex: string }>()
    const second = deferred<{ sRGBHex: string }>()
    let call = 0
    const mock = installEyeDropperMock({
      openImpl: () => {
        call += 1
        return call === 1 ? first.promise : second.promise
      },
    })
    restore = mock.restore
    const { result } = renderHook(() => useEyeDropper())
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let a!: Promise<string | null>
    let b!: Promise<string | null>
    await act(async () => {
      a = result.current.open()
      b = result.current.open()
    })

    await act(async () => {
      first.resolve({ sRGBHex: '#111111' })
      await a
    })
    expect(result.current.sRGBHex).toBe('')

    await act(async () => {
      second.resolve({ sRGBHex: '#222222' })
      await b
    })
    expect(result.current.sRGBHex).toBe('#222222')
    await expect(a).resolves.toBe('#111111')
    await expect(b).resolves.toBe('#222222')
  })

  it('returns null when disabled or window is null', async () => {
    const mock = installEyeDropperMock()
    restore = mock.restore
    const { result, rerender } = renderHook(
      ({ enabled, win }: { enabled: boolean; win?: Window | null }) =>
        useEyeDropper(
          win === undefined ? { enabled } : { enabled, window: win },
        ),
      {
        initialProps: { enabled: false } as {
          enabled: boolean
          win?: Window | null
        },
      },
    )
    await act(async () => {
      await expect(result.current.open()).resolves.toBeNull()
    })
    expect(mock.ctorCount).toBe(0)

    rerender({ enabled: true, win: null })
    await waitFor(() => expect(result.current.isSupported).toBe(false))
    await act(async () => {
      await expect(result.current.open()).resolves.toBeNull()
    })
  })

  it('handles NotAllowedError and clears error on later success', async () => {
    let fail = true
    const onError = vi.fn()
    const mock = installEyeDropperMock({
      openImpl: () => {
        if (fail) {
          return Promise.reject(new DOMException('Denied', 'NotAllowedError'))
        }
        return Promise.resolve({ sRGBHex: '#00FF00' })
      },
    })
    restore = mock.restore
    const { result } = renderHook(() => useEyeDropper({ onError }))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    await act(async () => {
      await result.current.open()
    })
    expect(result.current.error?.name).toBe('NotAllowedError')
    expect(onError).toHaveBeenCalledTimes(1)

    fail = false
    await act(async () => {
      await result.current.open()
    })
    expect(result.current.sRGBHex).toBe('#00ff00')
    expect(result.current.error).toBeNull()
  })

  it('rejects malformed results', async () => {
    const mock = installEyeDropperMock({
      openImpl: async () => ({ sRGBHex: '#fff' }),
    })
    restore = mock.restore
    const { result } = renderHook(() => useEyeDropper())
    await waitFor(() => expect(result.current.isSupported).toBe(true))
    await act(async () => {
      await expect(result.current.open()).resolves.toBeNull()
    })
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('forwards external AbortSignal and removes the listener', async () => {
    const mock = installEyeDropperMock({
      openImpl: (signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    })
    restore = mock.restore
    const { result } = renderHook(() => useEyeDropper())
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    const external = new AbortController()
    let openPromise!: Promise<string | null>
    await act(async () => {
      openPromise = result.current.open({ signal: external.signal })
    })
    await act(async () => {
      external.abort()
      await openPromise
    })
    expect(result.current.isPicking).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('does not open when the external signal is already aborted', async () => {
    const mock = installEyeDropperMock()
    restore = mock.restore
    const { result } = renderHook(() => useEyeDropper())
    await waitFor(() => expect(result.current.isSupported).toBe(true))
    const external = new AbortController()
    external.abort()
    await act(async () => {
      await expect(
        result.current.open({ signal: external.signal }),
      ).resolves.toBeNull()
    })
    expect(mock.ctorCount).toBe(0)
  })

  it('keeps control identities stable across rerenders', async () => {
    const mock = installEyeDropperMock()
    restore = mock.restore
    const { result, rerender } = renderHook(
      ({ onError }) => useEyeDropper({ onError }),
      { initialProps: { onError: () => undefined } },
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))
    const { open, cancel, reset } = result.current
    rerender({
      onError: () => {
        // new identity
      },
    })
    expect(result.current.open).toBe(open)
    expect(result.current.cancel).toBe(cancel)
    expect(result.current.reset).toBe(reset)
  })

  it('survives Strict Mode without constructing on mount', async () => {
    const mock = installEyeDropperMock()
    restore = mock.restore
    const { unmount } = renderHook(() => useEyeDropper(), {
      wrapper: StrictMode,
    })
    await waitFor(() => expect(mock.ctorCount).toBe(0))
    unmount()
  })

  it('contains throwing onError callbacks', async () => {
    const mock = installEyeDropperMock({
      openImpl: async () => {
        throw new DOMException('Denied', 'NotAllowedError')
      },
    })
    restore = mock.restore
    const { result } = renderHook(() =>
      useEyeDropper({
        onError: () => {
          throw new Error('consumer')
        },
      }),
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))
    await act(async () => {
      await result.current.open()
    })
    expect(result.current.error?.name).toBe('NotAllowedError')
  })

  it('reset during an active selection does not cancel the picker', async () => {
    const pending = deferred<{ sRGBHex: string }>()
    const mock = installEyeDropperMock({
      openImpl: () => pending.promise,
    })
    restore = mock.restore
    const { result } = renderHook(() =>
      useEyeDropper({ initialValue: '#010101' }),
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let openPromise!: Promise<string | null>
    await act(async () => {
      openPromise = result.current.open()
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.sRGBHex).toBe('#010101')
    expect(result.current.isPicking).toBe(true)

    await act(async () => {
      pending.resolve({ sRGBHex: '#ABCDEF' })
      await openPromise
    })
    expect(result.current.sRGBHex).toBe('#abcdef')
  })

  it('cancel then immediate reopen: stale AbortError cannot clear B', async () => {
    const first = deferred<{ sRGBHex: string }>()
    const second = deferred<{ sRGBHex: string }>()
    let call = 0
    const onError = vi.fn()
    const mock = installEyeDropperMock({
      openImpl: (signal) => {
        call += 1
        const pending = call === 1 ? first : second
        return new Promise((resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () => {
              reject(new DOMException('Aborted', 'AbortError'))
            },
            { once: true },
          )
          pending.promise.then(resolve, reject)
        })
      },
    })
    restore = mock.restore
    const { result } = renderHook(() => useEyeDropper({ onError }))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let a!: Promise<string | null>
    let b!: Promise<string | null>
    await act(async () => {
      a = result.current.open()
    })
    expect(result.current.isPicking).toBe(true)

    await act(async () => {
      result.current.cancel()
      b = result.current.open()
    })
    expect(result.current.isPicking).toBe(true)

    await act(async () => {
      await a
    })
    expect(result.current.isPicking).toBe(true)
    expect(result.current.error).toBeNull()
    expect(onError).not.toHaveBeenCalled()

    await act(async () => {
      second.resolve({ sRGBHex: '#BEEF00' })
      await b
    })
    expect(result.current.sRGBHex).toBe('#beef00')
    expect(result.current.isPicking).toBe(false)
    await expect(a).resolves.toBeNull()
  })

  it('cancel without AbortController still invalidates ownership', async () => {
    const pending = deferred<{ sRGBHex: string }>()
    const originalAC = window.AbortController
    // @ts-expect-error intentional removal for missing-controller coverage
    delete window.AbortController
    const mock = installEyeDropperMock({
      openImpl: () => pending.promise,
    })
    restore = () => {
      mock.restore()
      Object.defineProperty(window, 'AbortController', {
        configurable: true,
        writable: true,
        value: originalAC,
      })
    }

    const { result } = renderHook(() => useEyeDropper())
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let openPromise!: Promise<string | null>
    await act(async () => {
      openPromise = result.current.open()
    })
    expect(result.current.isPicking).toBe(true)

    act(() => {
      result.current.cancel()
    })
    expect(result.current.isPicking).toBe(false)

    await act(async () => {
      pending.resolve({ sRGBHex: '#123456' })
      await openPromise
    })
    expect(result.current.sRGBHex).toBe('')
    expect(result.current.isPicking).toBe(false)
  })

  it('stale failure after cancel→reopen does not notify or set error', async () => {
    const first = deferred<{ sRGBHex: string }>()
    const second = deferred<{ sRGBHex: string }>()
    let call = 0
    const onError = vi.fn()
    const mock = installEyeDropperMock({
      openImpl: () => {
        call += 1
        return call === 1 ? first.promise : second.promise
      },
    })
    restore = mock.restore
    const { result } = renderHook(() => useEyeDropper({ onError }))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let a!: Promise<string | null>
    let b!: Promise<string | null>
    await act(async () => {
      a = result.current.open()
      result.current.cancel()
      b = result.current.open()
    })

    await act(async () => {
      first.reject(new DOMException('Denied', 'NotAllowedError'))
      await a
    })
    expect(onError).not.toHaveBeenCalled()
    expect(result.current.error).toBeNull()
    expect(result.current.isPicking).toBe(true)

    await act(async () => {
      second.resolve({ sRGBHex: '#00AA00' })
      await b
    })
    expect(result.current.sRGBHex).toBe('#00aa00')
  })

  it('removes external abort listeners exactly once on success', async () => {
    const mock = installEyeDropperMock({
      openImpl: async () => ({ sRGBHex: '#112233' }),
    })
    restore = mock.restore
    const { result } = renderHook(() => useEyeDropper())
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    const external = new AbortController()
    const addSpy = vi.spyOn(external.signal, 'addEventListener')
    const removeSpy = vi.spyOn(external.signal, 'removeEventListener')

    await act(async () => {
      await result.current.open({ signal: external.signal })
    })

    expect(addSpy).toHaveBeenCalledTimes(1)
    expect(removeSpy).toHaveBeenCalledTimes(1)
    expect(result.current.sRGBHex).toBe('#112233')
  })

  it('notifies once per owned failure even when messages match', async () => {
    const onError = vi.fn()
    const mock = installEyeDropperMock({
      openImpl: async () => {
        throw new DOMException('Denied', 'NotAllowedError')
      },
    })
    restore = mock.restore
    const { result } = renderHook(() => useEyeDropper({ onError }))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    await act(async () => {
      await result.current.open()
    })
    await act(async () => {
      await result.current.open()
    })
    expect(onError).toHaveBeenCalledTimes(2)
  })

  it('three overlapping attempts: only C owns final state', async () => {
    const a = deferred<{ sRGBHex: string }>()
    const b = deferred<{ sRGBHex: string }>()
    const c = deferred<{ sRGBHex: string }>()
    const pending = [a, b, c]
    let call = 0
    const onError = vi.fn()
    const mock = installEyeDropperMock({
      openImpl: () => pending[call++]!.promise,
    })
    restore = mock.restore
    const { result } = renderHook(() => useEyeDropper({ onError }))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let pa!: Promise<string | null>
    let pb!: Promise<string | null>
    let pc!: Promise<string | null>
    await act(async () => {
      pa = result.current.open()
      pb = result.current.open()
      pc = result.current.open()
    })
    expect(result.current.isPicking).toBe(true)

    await act(async () => {
      b.resolve({ sRGBHex: '#BBBBBB' })
      await pb
    })
    expect(result.current.sRGBHex).toBe('')
    expect(result.current.isPicking).toBe(true)

    await act(async () => {
      a.reject(new DOMException('Denied', 'NotAllowedError'))
      await pa
    })
    expect(onError).not.toHaveBeenCalled()
    expect(result.current.error).toBeNull()
    expect(result.current.isPicking).toBe(true)

    await act(async () => {
      c.resolve({ sRGBHex: '#CCCCCC' })
      await pc
    })
    expect(result.current.sRGBHex).toBe('#cccccc')
    expect(result.current.isPicking).toBe(false)
    await expect(pa).resolves.toBeNull()
    await expect(pb).resolves.toBe('#bbbbbb')
  })

  it('disable during pick invalidates and ignores stale success', async () => {
    const pending = deferred<{ sRGBHex: string }>()
    const mock = installEyeDropperMock({
      openImpl: () => pending.promise,
    })
    restore = mock.restore
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useEyeDropper({ enabled, initialValue: '#111111' }),
      { initialProps: { enabled: true } },
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let openPromise!: Promise<string | null>
    await act(async () => {
      openPromise = result.current.open()
    })
    expect(result.current.isPicking).toBe(true)

    rerender({ enabled: false })
    expect(result.current.isPicking).toBe(false)
    expect(result.current.sRGBHex).toBe('#111111')

    await act(async () => {
      pending.resolve({ sRGBHex: '#222222' })
      await openPromise
    })
    expect(result.current.sRGBHex).toBe('#111111')
    expect(result.current.isPicking).toBe(false)

    rerender({ enabled: true })
    expect(result.current.sRGBHex).toBe('#111111')
  })

  it('window change during pick invalidates without global fallback', async () => {
    const pending = deferred<{ sRGBHex: string }>()
    const mock = installEyeDropperMock({
      openImpl: () => pending.promise,
    })
    restore = mock.restore
    const { result, rerender } = renderHook(
      ({ win }: { win: Window | null }) =>
        useEyeDropper({ window: win, initialValue: '#abcdef' }),
      { initialProps: { win: window as Window | null } },
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let openPromise!: Promise<string | null>
    await act(async () => {
      openPromise = result.current.open()
    })
    expect(result.current.isPicking).toBe(true)

    rerender({ win: null })
    expect(result.current.isPicking).toBe(false)
    expect(result.current.isSupported).toBe(false)
    expect(result.current.sRGBHex).toBe('#abcdef')

    await act(async () => {
      pending.resolve({ sRGBHex: '#ffffff' })
      await openPromise
    })
    expect(result.current.sRGBHex).toBe('#abcdef')
  })

  it('unmount invalidates without notifying late failures', async () => {
    const pending = deferred<{ sRGBHex: string }>()
    const onError = vi.fn()
    const mock = installEyeDropperMock({
      openImpl: () => pending.promise,
    })
    restore = mock.restore
    const { result, unmount } = renderHook(() => useEyeDropper({ onError }), {
      wrapper: StrictMode,
    })
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let openPromise!: Promise<string | null>
    await act(async () => {
      openPromise = result.current.open()
    })
    unmount()

    await act(async () => {
      pending.reject(new DOMException('Denied', 'NotAllowedError'))
      await openPromise
    })
    expect(onError).not.toHaveBeenCalled()
  })
})
