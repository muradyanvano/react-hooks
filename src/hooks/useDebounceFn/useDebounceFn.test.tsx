import { act, cleanup, renderHook } from '@testing-library/react'
import { StrictMode, useLayoutEffect, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useDebounceFn } from './useDebounceFn'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('useDebounceFn', () => {
  it('uses the default 200ms trailing delay', async () => {
    vi.useFakeTimers()
    const fn = vi.fn((value: string) => value)
    const { result } = renderHook(() => useDebounceFn(fn))

    let promise!: Promise<string | undefined>
    act(() => {
      promise = result.current.run('value')
    })
    expect(result.current.isPending).toBe(true)
    await advance(199)
    expect(fn).not.toHaveBeenCalled()
    await advance(1)

    await expect(promise).resolves.toBe('value')
    expect(result.current.isPending).toBe(false)
  })

  it('resets delay, invokes once with latest arguments, and settles every caller', async () => {
    vi.useFakeTimers()
    const fn = vi.fn((value: string) => value.toUpperCase())
    const { result } = renderHook(() => useDebounceFn(fn, 100))

    const first = result.current.run('first')
    await advance(50)
    const second = result.current.run('last')
    await advance(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('last')
    await expect(first).resolves.toBe('LAST')
    await expect(second).resolves.toBe('LAST')
  })

  it('keeps zero delay asynchronous', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounceFn(fn, 0))
    result.current.run()
    expect(fn).not.toHaveBeenCalled()
    await advance(0)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it.each([-1, Number.NaN, Infinity, -Infinity])(
    'normalizes invalid delay %p to 200ms',
    async (delay) => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const { result } = renderHook(() => useDebounceFn(fn, delay))
      result.current.run()
      await advance(199)
      expect(fn).not.toHaveBeenCalled()
      await advance(1)
      expect(fn).toHaveBeenCalledTimes(1)
    },
  )

  it('invokes at maxWait from the first call and clears the delay timer', async () => {
    vi.useFakeTimers()
    const fn = vi.fn((value: number) => value)
    const { result } = renderHook(() =>
      useDebounceFn(fn, 100, { maxWait: 150 }),
    )

    const first = result.current.run(1)
    await advance(75)
    const second = result.current.run(2)
    await advance(75)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(2)
    await expect(first).resolves.toBe(2)
    await expect(second).resolves.toBe(2)
    await advance(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it.each([-1, Number.NaN, Infinity])(
    'disables invalid maxWait %p',
    async (maxWait) => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const { result } = renderHook(() => useDebounceFn(fn, 100, { maxWait }))
      result.current.run()
      await advance(99)
      result.current.run()
      await advance(99)
      expect(fn).not.toHaveBeenCalled()
      await advance(1)
      expect(fn).toHaveBeenCalledTimes(1)
    },
  )

  it('keeps maxWait zero asynchronous', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounceFn(fn, 100, { maxWait: 0 }))
    result.current.run()
    expect(fn).not.toHaveBeenCalled()
    await advance(0)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('rejects all callers when the callback throws', async () => {
    vi.useFakeTimers()
    const error = new Error('boom')
    const { result } = renderHook(() =>
      useDebounceFn(() => {
        throw error
      }, 10),
    )
    const first = result.current.run()
    const second = result.current.run()
    await advance(10)
    await expect(first).rejects.toBe(error)
    await expect(second).rejects.toBe(error)
  })

  it('settles all callers from an async callback', async () => {
    vi.useFakeTimers()
    const fn = vi.fn(async (value: string) => `${value}!`)
    const { result } = renderHook(() => useDebounceFn(fn, 10))
    const first = result.current.run('latest')
    const second = result.current.run('latest')
    await advance(10)
    await expect(first).resolves.toBe('latest!')
    await expect(second).resolves.toBe('latest!')
  })

  it('cancel resolves callers undefined by default and is idempotent', async () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useDebounceFn(fn, 100))
    const pending = result.current.run()
    act(() => result.current.cancel())
    act(() => result.current.cancel())
    await expect(pending).resolves.toBeUndefined()
    expect(result.current.isPending).toBe(false)
  })

  it('cancel rejects callers with a generic Error when configured', async () => {
    const { result } = renderHook(() =>
      useDebounceFn((value: string) => value, 100, { rejectOnCancel: true }),
    )
    const pending = result.current.run('private arguments')
    act(() => result.current.cancel())
    await expect(pending).rejects.toEqual(
      expect.objectContaining({ message: 'Debounced function canceled' }),
    )
  })

  it('flushes immediately and concurrent flushes join the callback promise', async () => {
    let resolve!: (value: string) => void
    const fn = vi.fn(
      () =>
        new Promise<string>((done) => {
          resolve = done
        }),
    )
    const { result } = renderHook(() => useDebounceFn(fn, 100))
    const run = result.current.run()
    let firstFlush!: Promise<string | undefined>
    let secondFlush!: Promise<string | undefined>
    act(() => {
      firstFlush = result.current.flush()
      secondFlush = result.current.flush()
    })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(firstFlush).toBe(secondFlush)
    await act(async () => {
      resolve('done')
    })
    await expect(run).resolves.toBe('done')
    await expect(firstFlush).resolves.toBe('done')
  })

  it('returns undefined when flush has nothing pending', async () => {
    const { result } = renderHook(() => useDebounceFn(() => 1))
    await expect(result.current.flush()).resolves.toBeUndefined()
  })

  it('uses the latest callback without changing command identities or cancelling', async () => {
    vi.useFakeTimers()
    const first = vi.fn(() => 'first')
    const second = vi.fn(() => 'second')
    const { result, rerender } = renderHook(
      ({ fn }) => useDebounceFn(fn, 100),
      {
        initialProps: { fn: first },
      },
    )
    const commands = result.current
    const pending = result.current.run()
    rerender({ fn: second })
    expect(result.current.run).toBe(commands.run)
    expect(result.current.cancel).toBe(commands.cancel)
    expect(result.current.flush).toBe(commands.flush)
    await advance(100)
    await expect(pending).resolves.toBe('second')
    expect(first).not.toHaveBeenCalled()
  })

  it('cancels a pending window with the old policy when configuration changes', async () => {
    const { result, rerender } = renderHook(
      ({ rejectOnCancel, delay }) =>
        useDebounceFn(() => 1, delay, { rejectOnCancel }),
      { initialProps: { rejectOnCancel: true, delay: 100 } },
    )
    const pending = result.current.run()
    rerender({ rejectOnCancel: false, delay: 200 })
    await expect(pending).rejects.toEqual(expect.any(Error))
    expect(result.current.isPending).toBe(false)
  })

  it('does not schedule timers while idle after option changes', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ delay }) => useDebounceFn(() => undefined, delay),
      { initialProps: { delay: 10 } },
    )
    rerender({ delay: 20 })
    expect(vi.getTimerCount()).toBe(0)
    expect(result.current.isPending).toBe(false)
  })

  it('keeps layout-phase run after option changes despite stale effect cleanup', async () => {
    vi.useFakeTimers()
    const fn = vi.fn((value: string) => value)
    const { rerender } = renderHook(
      ({ delay, maxWait, rejectOnCancel }) => {
        const options =
          maxWait === undefined
            ? { rejectOnCancel }
            : { maxWait, rejectOnCancel }
        const debounce = useDebounceFn(fn, delay, options)
        useLayoutEffect(() => {
          void debounce.run(`d${delay}`)
        }, [delay, maxWait, rejectOnCancel, debounce])
        return debounce
      },
      {
        initialProps: {
          delay: 100,
          maxWait: undefined as number | undefined,
          rejectOnCancel: false,
        },
      },
    )

    await advance(100)
    expect(fn).toHaveBeenCalledWith('d100')
    fn.mockClear()

    act(() => {
      rerender({ delay: 200, maxWait: undefined, rejectOnCancel: false })
    })
    await advance(200)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('d200')
    fn.mockClear()

    act(() => {
      rerender({ delay: 50, maxWait: 80, rejectOnCancel: false })
    })
    await advance(80)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('d50')
    fn.mockClear()

    act(() => {
      rerender({ delay: 60, maxWait: 80, rejectOnCancel: true })
    })
    await advance(60)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('d60')
  })

  it('preserves layout-phase flush and ignores layout cancel after unrelated rerenders', async () => {
    vi.useFakeTimers()
    const fn = vi.fn(() => 'flushed')
    let tick = 0
    const { result, rerender } = renderHook(
      ({ delay, mode }) => {
        const debounce = useDebounceFn(fn, delay)
        useLayoutEffect(() => {
          if (mode === 'flush') {
            void debounce.flush()
          }
          if (mode === 'cancel') {
            debounce.cancel()
          }
        }, [delay, mode, debounce])
        return debounce
      },
      {
        initialProps: {
          delay: 100,
          mode: 'idle' as 'idle' | 'flush' | 'cancel',
        },
      },
    )

    result.current.run()
    tick += 1
    act(() => {
      rerender({ delay: 100, mode: 'idle' })
    })
    expect(result.current.isPending).toBe(true)

    act(() => {
      rerender({ delay: 40, mode: 'flush' })
    })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith()
    expect(result.current.isPending).toBe(false)

    result.current.run()
    act(() => {
      rerender({ delay: 40, mode: 'cancel' })
    })
    expect(result.current.isPending).toBe(false)
    await advance(40)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(tick).toBe(1)
  })

  it('cancels without rejection on unmount and never invokes later', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result, unmount } = renderHook(() =>
      useDebounceFn(fn, 100, { rejectOnCancel: true }),
    )
    const pending = result.current.run()
    unmount()
    await expect(pending).resolves.toBeUndefined()
    await advance(100)
    expect(fn).not.toHaveBeenCalled()
  })

  it('is StrictMode safe', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    )
    const { result } = renderHook(() => useDebounceFn(fn, 10), { wrapper })
    result.current.run()
    await advance(10)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('server-renders without creating timers', () => {
    vi.useFakeTimers()
    function ServerComponent() {
      const debounce = useDebounceFn(() => undefined)
      return <span>{String(debounce.isPending)}</span>
    }
    expect(() => renderToString(<ServerComponent />)).not.toThrow()
    expect(vi.getTimerCount()).toBe(0)
  })
})
