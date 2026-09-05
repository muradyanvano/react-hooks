import { act, cleanup, renderHook } from '@testing-library/react'
import { StrictMode, useLayoutEffect, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getEventBusListenerCount } from './eventBusRegistry'
import { useEventBus } from './useEventBus'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useEventBus', () => {
  it('delivers ordered events and payloads without rerendering', () => {
    const key = Symbol('ordered')
    let renders = 0
    const receiver = renderHook(() => {
      renders += 1
      return useEventBus<string, number>(key)
    })
    const sender = renderHook(() => useEventBus<string, number>(key))
    const calls: string[] = []

    act(() => {
      receiver.result.current.on((event, payload) =>
        calls.push(`${event}:${payload}`),
      )
      receiver.result.current.on((event, payload) =>
        calls.push(`${event.toUpperCase()}:${payload + 1}`),
      )
      sender.result.current.emit('notice', 3)
    })

    expect(calls).toEqual(['notice:3', 'NOTICE:4'])
    expect(renders).toBe(1)
  })

  it('keeps controls stable while the key is unchanged', () => {
    const { result, rerender } = renderHook(() => useEventBus<string>('stable'))
    const controls = result.current
    rerender()
    expect(result.current).toEqual(controls)
  })

  it('treats duplicate registration by the same owner as idempotent', () => {
    const key = Symbol('dedupe')
    const listener = vi.fn()
    const receiver = renderHook(() => useEventBus<string>(key))
    const sender = renderHook(() => useEventBus<string>(key))
    act(() => {
      receiver.result.current.on(listener)
      receiver.result.current.on(listener)
      sender.result.current.emit('event')
    })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('allows identical listeners owned by different hook instances', () => {
    const key = Symbol('owners')
    const listener = vi.fn()
    const first = renderHook(() => useEventBus<string>(key))
    const second = renderHook(() => useEventBus<string>(key))
    const sender = renderHook(() => useEventBus<string>(key))
    act(() => {
      first.result.current.on(listener)
      second.result.current.on(listener)
      sender.result.current.emit('event')
    })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('keeps number and string channels independent', () => {
    const stringBus = renderHook(() => useEventBus<string>('1'))
    const numberBus = renderHook(() => useEventBus<string>(1))
    const stringListener = vi.fn()
    const numberListener = vi.fn()
    act(() => {
      stringBus.result.current.on(stringListener)
      numberBus.result.current.on(numberListener)
      stringBus.result.current.emit('string')
    })
    expect(stringListener).toHaveBeenCalledOnce()
    expect(numberListener).not.toHaveBeenCalled()
  })

  it('off removes only registrations owned by the current hook', () => {
    const key = Symbol('off')
    const listener = vi.fn()
    const first = renderHook(() => useEventBus<string>(key))
    const second = renderHook(() => useEventBus<string>(key))
    act(() => {
      first.result.current.on(listener)
      second.result.current.on(listener)
      first.result.current.off(listener)
      second.result.current.emit('event')
    })
    expect(listener).toHaveBeenCalledOnce()
  })

  it('clears all owners when reset is called', () => {
    const key = Symbol('reset')
    const first = renderHook(() => useEventBus<string>(key))
    const second = renderHook(() => useEventBus<string>(key))
    const listener = vi.fn()
    act(() => {
      first.result.current.on(listener)
      second.result.current.on(listener)
      first.result.current.reset()
      second.result.current.emit('event')
    })
    expect(listener).not.toHaveBeenCalled()
  })

  it('removes only its own subscriptions on unmount', () => {
    const key = Symbol('unmount')
    const first = renderHook(() => useEventBus<string>(key))
    const second = renderHook(() => useEventBus<string>(key))
    const listener = vi.fn()
    act(() => {
      first.result.current.on(listener)
      second.result.current.on(listener)
    })
    first.unmount()
    act(() => second.result.current.emit('event'))
    expect(listener).toHaveBeenCalledOnce()
  })

  it('rebinds on key changes without migrating old subscriptions', () => {
    const oldKey = Symbol('old')
    const newKey = Symbol('new')
    const listener = vi.fn()
    const { result, rerender } = renderHook(
      ({ key }) => useEventBus<string>(key),
      { initialProps: { key: oldKey } },
    )
    const oldStop = result.current.on(listener)
    rerender({ key: newKey })
    const newSender = renderHook(() => useEventBus<string>(newKey))
    const oldSender = renderHook(() => useEventBus<string>(oldKey))

    act(() => {
      oldStop()
      oldSender.result.current.emit('old')
      newSender.result.current.emit('new')
    })
    expect(listener).not.toHaveBeenCalled()

    act(() => {
      result.current.on(listener)
      newSender.result.current.emit('new')
    })
    expect(listener).toHaveBeenCalledWith('new', undefined)
  })

  it('supports snapshot iteration and nested emits', () => {
    const key = Symbol('snapshot')
    const receiver = renderHook(() => useEventBus<string>(key))
    const sender = renderHook(() => useEventBus<string>(key))
    const calls: string[] = []
    const late = (event: string) => calls.push(`late:${event}`)
    const second = (event: string) => calls.push(`second:${event}`)

    act(() => {
      receiver.result.current.on((event) => {
        calls.push(`first:${event}`)
        receiver.result.current.off(second)
        receiver.result.current.on(late)
        if (event === 'outer') sender.result.current.emit('inner')
      })
      receiver.result.current.on(second)
      sender.result.current.emit('outer')
    })
    expect(calls).toEqual([
      'first:outer',
      'first:inner',
      'late:inner',
      'second:outer',
    ])

    act(() => sender.result.current.emit('later'))
    expect(calls).toContain('late:later')
  })

  it('removes once listeners before invoking them, including when they throw', () => {
    const key = Symbol('once')
    const receiver = renderHook(() => useEventBus<string>(key))
    const sender = renderHook(() => useEventBus<string>(key))
    const once = vi.fn(() => {
      sender.result.current.emit('nested')
      throw new Error('once failure')
    })
    const regular = vi.fn()
    act(() => {
      receiver.result.current.once(once)
      receiver.result.current.on(regular)
    })
    expect(() => act(() => sender.result.current.emit('outer'))).toThrow(
      'once failure',
    )
    expect(once).toHaveBeenCalledOnce()
    expect(regular).toHaveBeenCalledTimes(2)
  })

  it('continues dispatch after listener failures and aggregates multiple failures', () => {
    const key = Symbol('errors')
    const receiver = renderHook(() => useEventBus<string>(key))
    const sender = renderHook(() => useEventBus<string>(key))
    const last = vi.fn()
    act(() => {
      receiver.result.current.on(() => {
        throw new Error('first')
      })
      receiver.result.current.on(() => {
        throw new Error('second')
      })
      receiver.result.current.on(last)
    })
    expect(() => act(() => sender.result.current.emit('event'))).toThrow()
    expect(last).toHaveBeenCalledOnce()
  })

  it('keeps one effective subscription through Strict Mode effect replay', () => {
    const key = Symbol('strict')
    const listener = vi.fn()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    )
    const receiver = renderHook(() => useEventBus<string>(key), { wrapper })
    const sender = renderHook(() => useEventBus<string>(key))
    act(() => {
      receiver.result.current.on(listener)
      sender.result.current.emit('event')
    })
    expect(listener).toHaveBeenCalledOnce()
    expect(getEventBusListenerCount(key)).toBe(1)
  })

  it('does not subscribe or emit during server rendering', () => {
    const key = Symbol('ssr')
    function ServerComponent() {
      const bus = useEventBus<string>(key)
      bus.on(() => undefined)
      bus.emit('render')
      return null
    }
    expect(() => renderToString(<ServerComponent />)).not.toThrow()
    expect(getEventBusListenerCount(key)).toBe(0)
  })

  it('isolates string, number, symbol, and typed-symbol channels', () => {
    const symbol = Symbol('symbol')
    const typed = Symbol('typed') as import('./useEventBus').EventBusKey<
      'typed',
      { id: number }
    >
    const stringBus = renderHook(() => useEventBus<string>('shared'))
    const numberBus = renderHook(() => useEventBus<string>(7))
    const symbolBus = renderHook(() => useEventBus<string>(symbol))
    const typedBus = renderHook(() =>
      useEventBus<'typed', { id: number }>(typed),
    )
    const calls = vi.fn()
    act(() => {
      stringBus.result.current.on(calls)
      numberBus.result.current.on(calls)
      symbolBus.result.current.on(calls)
      typedBus.result.current.on(calls)
      typedBus.result.current.emit('typed', { id: 1 })
    })
    expect(calls).toHaveBeenCalledOnce()
    expect(calls).toHaveBeenCalledWith('typed', { id: 1 })
  })

  it('keeps all control identities stable when the key changes', () => {
    const oldKey = Symbol('old')
    const newKey = Symbol('new')
    const { result, rerender } = renderHook(
      ({ key }) => useEventBus<string>(key),
      { initialProps: { key: oldKey } },
    )
    const controls = result.current
    rerender({ key: newKey })
    expect(result.current.on).toBe(controls.on)
    expect(result.current.once).toBe(controls.once)
    expect(result.current.emit).toBe(controls.emit)
    expect(result.current.off).toBe(controls.off)
    expect(result.current.reset).toBe(controls.reset)
  })

  it('routes emit to the latest key when called from useLayoutEffect after a key change', () => {
    const oldKey = Symbol('layout-old')
    const newKey = Symbol('layout-new')
    const oldListener = vi.fn()
    const newListener = vi.fn()

    const oldReceiver = renderHook(() => useEventBus<string>(oldKey))
    const newReceiver = renderHook(() => useEventBus<string>(newKey))
    act(() => {
      oldReceiver.result.current.on(oldListener)
      newReceiver.result.current.on(newListener)
    })

    const { rerender } = renderHook(
      ({ key }) => {
        const bus = useEventBus<string>(key)
        useLayoutEffect(() => {
          bus.emit('from-layout')
        }, [key, bus])
        return bus
      },
      { initialProps: { key: oldKey } },
    )

    act(() => {
      rerender({ key: newKey })
    })

    expect(newListener).toHaveBeenCalledWith('from-layout', undefined)
    expect(oldListener).not.toHaveBeenCalledWith('from-layout', undefined)
  })

  it('allows stop and off to be repeated safely', () => {
    const key = Symbol('repeat-stop')
    const receiver = renderHook(() => useEventBus<string>(key))
    const sender = renderHook(() => useEventBus<string>(key))
    const listener = vi.fn()
    act(() => {
      const stop = receiver.result.current.on(listener)
      stop()
      stop()
      receiver.result.current.off(listener)
      receiver.result.current.off(listener)
      sender.result.current.emit('event')
    })
    expect(listener).not.toHaveBeenCalled()
  })

  it('resets a channel during dispatch without cancelling the current snapshot', () => {
    const key = Symbol('reset-dispatch')
    const receiver = renderHook(() => useEventBus<string>(key))
    const sender = renderHook(() => useEventBus<string>(key))
    const later = vi.fn()
    act(() => {
      receiver.result.current.on(() => receiver.result.current.reset())
      receiver.result.current.on(later)
      sender.result.current.emit('first')
    })
    expect(later).toHaveBeenCalledOnce()
    act(() => sender.result.current.emit('second'))
    expect(later).toHaveBeenCalledOnce()
  })

  it('does not run an unsubscribed listener in a nested emit', () => {
    const key = Symbol('unsubscribe-nested')
    const receiver = renderHook(() => useEventBus<string>(key))
    const sender = renderHook(() => useEventBus<string>(key))
    const second = vi.fn()
    act(() => {
      receiver.result.current.on((event) => {
        if (event === 'outer') {
          receiver.result.current.off(second)
          sender.result.current.emit('inner')
        }
      })
      receiver.result.current.on(second)
      sender.result.current.emit('outer')
    })
    expect(second).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledWith('outer', undefined)
  })

  it('cleans up subscriptions after a key rebind and unmount', () => {
    const oldKey = Symbol('old-cleanup')
    const newKey = Symbol('new-cleanup')
    const { result, rerender, unmount } = renderHook(
      ({ key }) => useEventBus<string>(key),
      { initialProps: { key: oldKey } },
    )
    act(() => result.current.on(vi.fn()))
    expect(getEventBusListenerCount(oldKey)).toBe(1)
    rerender({ key: newKey })
    expect(getEventBusListenerCount(oldKey)).toBe(0)
    act(() => result.current.on(vi.fn()))
    unmount()
    expect(getEventBusListenerCount(newKey)).toBe(0)
  })
})
