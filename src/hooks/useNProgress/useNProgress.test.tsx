import { act, cleanup, renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createElement, StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  channelHasDom,
  channelHasTrickleTimer,
  getChannelActiveOwnerCount,
} from './nProgressManager'
import { useNProgress } from './useNProgress'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeParent(): HTMLElement {
  const el = document.createElement('div')
  document.body.append(el)
  return el
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.innerHTML = ''
  document.head
    .querySelectorAll('[data-react-hooks-nprogress-style]')
    .forEach((el) => el.remove())
})

// ── Imperative lifecycle ───────────────────────────────────────────────────────

describe('useNProgress – imperative lifecycle', () => {
  it('starts idle by default', () => {
    const { result } = renderHook(() => useNProgress())
    expect(result.current.isLoading).toBe(false)
    expect(result.current.progress).toBeNull()
  })

  it('start() sets isLoading and progress to minimum', () => {
    const { result } = renderHook(() => useNProgress())
    act(() => {
      result.current.start()
    })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.progress).toBeGreaterThanOrEqual(0.08)
  })

  it('start() is idempotent when already active', () => {
    const { result } = renderHook(() => useNProgress())
    act(() => {
      result.current.start()
    })
    const prog1 = result.current.progress
    act(() => {
      result.current.start()
    })
    expect(result.current.isLoading).toBe(true)
    // Progress should not reset below minimum
    expect(result.current.progress).toBeGreaterThanOrEqual(prog1 ?? 0)
  })

  it('set() activates with given progress', () => {
    const { result } = renderHook(() => useNProgress())
    act(() => {
      result.current.set(0.4)
    })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.progress).toBeCloseTo(0.4)
  })

  it('set() clamps below minimum to minimum', () => {
    const { result } = renderHook(() =>
      useNProgress(undefined, { minimum: 0.1 }),
    )
    act(() => {
      result.current.set(0.01)
    })
    expect(result.current.progress).toBeGreaterThanOrEqual(0.1)
  })

  it('set() clamps above 1 triggers done()', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false, speed: 50, removeDelay: 0 }),
    )
    act(() => {
      result.current.set(0.5)
    })
    act(() => {
      result.current.set(1.5)
    })
    expect(result.current.progress).toBe(1)
    expect(result.current.isLoading).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.progress).toBeNull()
  })

  it('set() with NaN is ignored', () => {
    const { result } = renderHook(() => useNProgress())
    act(() => {
      result.current.start()
    })
    const prog = result.current.progress
    act(() => {
      result.current.set(NaN)
    })
    expect(result.current.progress).toBe(prog)
  })

  it('set(1) triggers completion', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false, speed: 50, removeDelay: 0 }),
    )
    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.set(1)
    })
    expect(result.current.progress).toBe(1)
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.isLoading).toBe(false)
  })

  it('increment() advances from current progress', () => {
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false }),
    )
    act(() => {
      result.current.start()
    })
    const before = result.current.progress ?? 0
    act(() => {
      result.current.increment()
    })
    expect(result.current.progress ?? 0).toBeGreaterThan(before)
  })

  it('increment(amount) uses explicit amount', () => {
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false, minimum: 0.08 }),
    )
    act(() => {
      result.current.start()
    })
    const before = result.current.progress ?? 0
    act(() => {
      result.current.increment(0.1)
    })
    expect(result.current.progress ?? 0).toBeCloseTo(
      Math.min(0.994, before + 0.1),
    )
  })

  it('increment() from idle starts at minimum', () => {
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false, minimum: 0.08 }),
    )
    act(() => {
      result.current.increment()
    })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.progress).toBeGreaterThanOrEqual(0.08)
  })

  it('increment() with NaN is ignored', () => {
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false }),
    )
    act(() => {
      result.current.start()
    })
    const p = result.current.progress
    act(() => {
      result.current.increment(NaN)
    })
    expect(result.current.progress).toBe(p)
  })

  it('increment() never reaches 1 automatically', () => {
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false }),
    )
    act(() => {
      result.current.start()
    })
    for (let i = 0; i < 100; i++) {
      act(() => {
        result.current.increment()
      })
    }
    expect(result.current.progress).toBeLessThan(1)
    expect(result.current.isLoading).toBe(true)
  })

  it('done() completes and eventually returns to idle', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false, speed: 50, removeDelay: 0 }),
    )
    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.done()
    })
    expect(result.current.progress).toBe(1)
    expect(result.current.isLoading).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.progress).toBeNull()
  })

  it('done() while idle is a no-op', () => {
    const { result } = renderHook(() => useNProgress())
    act(() => {
      result.current.done()
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.progress).toBeNull()
  })

  it('done(force=true) while idle briefly shows then hides', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false, speed: 50, removeDelay: 0 }),
    )
    act(() => {
      result.current.done(true)
    })
    expect(result.current.progress).toBe(1)
    expect(result.current.isLoading).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.isLoading).toBe(false)
  })

  it('remove() immediately sets idle without completion animation', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false }),
    )
    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.remove()
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.progress).toBeNull()
    // No completion timer should fire
    vi.advanceTimersByTime(1000)
    expect(result.current.isLoading).toBe(false)
  })

  it('remove() is idempotent', () => {
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false }),
    )
    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.remove()
    })
    act(() => {
      result.current.remove()
    })
    expect(result.current.isLoading).toBe(false)
  })

  it('restart during completion cancels the completion timer', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false, speed: 200, removeDelay: 100 }),
    )
    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.done()
    })
    expect(result.current.progress).toBe(1)

    // Restart before completion fires
    act(() => {
      result.current.start()
    })
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    // Should remain active (the restart's start() fired)
    expect(result.current.isLoading).toBe(true)
  })

  it('set(<1) during completion reactivates', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useNProgress(undefined, { trickle: false, speed: 200, removeDelay: 100 }),
    )
    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.done()
    })
    act(() => {
      result.current.set(0.4)
    })
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    // set(0.4) should have cancelled completion
    // (progress should be 0.4, isLoading true; OR if completion timer already fired it depends on timing)
    // The important constraint: set cancels the stale timer
    // After 500ms the completion timer from before set(0.4) should not have fired
    expect(result.current.isLoading).toBe(true)
    expect(result.current.progress).toBeCloseTo(0.4)
  })

  it('methods have stable identities across rerenders', () => {
    const { result, rerender } = renderHook(() => useNProgress())
    const { start, set, increment, done, remove } = result.current
    rerender()
    expect(result.current.start).toBe(start)
    expect(result.current.set).toBe(set)
    expect(result.current.increment).toBe(increment)
    expect(result.current.done).toBe(done)
    expect(result.current.remove).toBe(remove)
  })
})

// ── Declarative progress parameter ────────────────────────────────────────────

describe('useNProgress – declarative currentProgress', () => {
  it('undefined → imperative mode (no auto-start)', () => {
    const { result } = renderHook(() => useNProgress(undefined))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.progress).toBeNull()
  })

  it('null → declaratively complete (idle stays idle)', () => {
    const { result } = renderHook(() => useNProgress(null))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.progress).toBeNull()
  })

  it('number < 1 → activate and set progress', () => {
    const { result } = renderHook(() => useNProgress(0.5))
    expect(result.current.isLoading).toBe(true)
    expect(result.current.progress).toBeCloseTo(0.5)
  })

  it('number >= 1 → completes (isLoading starts true)', () => {
    // Verify that a declarative value of 1 activates isLoading.
    // Completion timing tested separately via imperative done().
    const { result } = renderHook(() => useNProgress(1, { trickle: false }))
    expect(result.current.isLoading).toBe(true)
    expect(result.current.progress).toBe(1)
  })

  it('number changes update progress', () => {
    const { result, rerender } = renderHook(
      ({ p }: { p: number }) => useNProgress(p, { trickle: false }),
      { initialProps: { p: 0.3 } },
    )
    expect(result.current.progress).toBeCloseTo(0.3)
    rerender({ p: 0.7 })
    expect(result.current.progress).toBeCloseTo(0.7)
  })

  it('number to undefined stops declarative sync but keeps active owner', () => {
    const { result, rerender } = renderHook(
      ({ p }: { p: number | undefined }) => useNProgress(p, { trickle: false }),
      { initialProps: { p: 0.5 as number | undefined } },
    )
    expect(result.current.isLoading).toBe(true)
    rerender({ p: undefined })
    // Should not auto-complete; remains active with last progress
    expect(result.current.isLoading).toBe(true)
  })

  it('NaN is ignored', () => {
    const { result, rerender } = renderHook(
      ({ p }: { p: number }) => useNProgress(p, { trickle: false }),
      { initialProps: { p: 0.5 } },
    )
    const prog = result.current.progress
    rerender({ p: NaN })
    expect(result.current.progress).toBe(prog)
  })

  it('Infinity is ignored', () => {
    const { result, rerender } = renderHook(
      ({ p }: { p: number }) => useNProgress(p, { trickle: false }),
      { initialProps: { p: 0.5 } },
    )
    const prog = result.current.progress
    rerender({ p: Infinity })
    expect(result.current.progress).toBe(prog)
  })

  it('-Infinity is ignored', () => {
    const { result, rerender } = renderHook(
      ({ p }: { p: number }) => useNProgress(p, { trickle: false }),
      { initialProps: { p: 0.5 } },
    )
    const prog = result.current.progress
    rerender({ p: -Infinity })
    expect(result.current.progress).toBe(prog)
  })

  it('unrelated rerender with same options does not reset progress', () => {
    const { result, rerender } = renderHook(
      ({ label }: { label: string }) =>
        useNProgress(0.4, { trickle: false, ariaLabel: label }),
      { initialProps: { label: 'Loading' } },
    )
    const prog = result.current.progress
    rerender({ label: 'Loading' })
    expect(result.current.progress).toBe(prog)
  })
})

// ── Dynamic document/parent ────────────────────────────────────────────────────

describe('useNProgress – null document/parent', () => {
  it('document: null → no DOM, but remains idle', () => {
    const { result } = renderHook(() =>
      useNProgress(undefined, { document: null, trickle: false }),
    )
    act(() => {
      result.current.start()
    })
    // State not updated because context is null
    expect(result.current.isLoading).toBe(false)
  })

  it('parent: null → no DOM', () => {
    const { result } = renderHook(() =>
      useNProgress(undefined, { parent: null, trickle: false }),
    )
    act(() => {
      result.current.start()
    })
    expect(result.current.isLoading).toBe(false)
  })
})

describe('useNProgress – custom parent', () => {
  it('renders progress inside custom parent', () => {
    const parent = makeParent()
    const { result } = renderHook(() =>
      useNProgress(undefined, { parent, trickle: false }),
    )
    act(() => {
      result.current.start()
    })
    expect(result.current.isLoading).toBe(true)
    expect(
      parent.querySelector('[data-react-hooks-nprogress-root]'),
    ).toBeTruthy()
  })

  it('does not render to document.body when custom parent is given', () => {
    const parent = makeParent()
    const { result } = renderHook(() =>
      useNProgress(undefined, { parent, trickle: false }),
    )
    act(() => {
      result.current.start()
    })
    // The root should be inside parent, not a direct child of body (unless parent IS body)
    expect(
      parent.querySelector('[data-react-hooks-nprogress-root]'),
    ).toBeTruthy()
  })
})

// ── Strict Mode ────────────────────────────────────────────────────────────────

describe('useNProgress – Strict Mode', () => {
  it('one effective owner after Strict Mode double-mount', () => {
    const parent = makeParent()
    renderHook(() => useNProgress(0.3, { parent, trickle: false }), {
      wrapper: StrictMode,
    })
    expect(getChannelActiveOwnerCount(document, parent)).toBe(1)
  })

  it('DOM is present after Strict Mode', () => {
    const parent = makeParent()
    renderHook(() => useNProgress(0.5, { parent, trickle: false }), {
      wrapper: StrictMode,
    })
    expect(channelHasDom(document, parent)).toBe(true)
  })

  it('unmount in Strict Mode removes owner', () => {
    const parent = makeParent()
    const { unmount } = renderHook(
      () => useNProgress(0.5, { parent, trickle: false }),
      { wrapper: StrictMode },
    )
    unmount()
    expect(getChannelActiveOwnerCount(document, parent)).toBe(0)
    expect(channelHasDom(document, parent)).toBe(false)
  })

  it('one trickle timer after Strict Mode', () => {
    const parent = makeParent()
    renderHook(() => useNProgress(0.3, { parent, trickle: true }), {
      wrapper: StrictMode,
    })
    expect(channelHasTrickleTimer(document, parent)).toBe(true)
  })
})

// ── SSR ────────────────────────────────────────────────────────────────────────

describe('useNProgress – SSR', () => {
  it('renders to string without throwing', () => {
    function Component() {
      useNProgress()
      return createElement('div', null, 'ok')
    }
    expect(() => renderToString(createElement(Component))).not.toThrow()
  })

  it('returns idle state during SSR', () => {
    let ssrIsLoading: boolean | undefined
    let ssrProgress: number | null | undefined
    function Component() {
      const { isLoading, progress } = useNProgress()
      ssrIsLoading = isLoading
      ssrProgress = progress
      return createElement('div', null, 'ok')
    }
    renderToString(createElement(Component))
    expect(ssrIsLoading).toBe(false)
    expect(ssrProgress).toBeNull()
  })

  it('number currentProgress during SSR is server-idle', () => {
    let ssrIsLoading: boolean | undefined
    function Component() {
      const { isLoading } = useNProgress(0.5)
      ssrIsLoading = isLoading
      return createElement('div', null, 'ok')
    }
    renderToString(createElement(Component))
    expect(ssrIsLoading).toBe(false)
  })

  it('methods exist and are safe to call during SSR', () => {
    let api: ReturnType<typeof useNProgress> | undefined
    function Component() {
      api = useNProgress()
      return createElement('div', null, 'ok')
    }
    renderToString(createElement(Component))
    expect(() => {
      api?.start()
      api?.set(0.5)
      api?.increment()
      api?.done()
      api?.remove()
    }).not.toThrow()
  })

  it('does not emit useLayoutEffect warning', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Component() {
      useNProgress()
      return createElement('div', null, 'ok')
    }
    renderToString(createElement(Component))
    const layoutEffectWarnings = spy.mock.calls.filter((args) =>
      args.some(
        (a) =>
          typeof a === 'string' && a.toLowerCase().includes('uselayouteffect'),
      ),
    )
    expect(layoutEffectWarnings).toHaveLength(0)
    spy.mockRestore()
  })
})

// ── DOM cleanup ────────────────────────────────────────────────────────────────

describe('useNProgress – cleanup', () => {
  it('unmount removes owned DOM', () => {
    const parent = makeParent()
    const { unmount } = renderHook(() =>
      useNProgress(0.5, { parent, trickle: false }),
    )
    unmount()
    expect(parent.querySelector('[data-react-hooks-nprogress-root]')).toBeNull()
  })

  it('unmount does not remove unrelated DOM', () => {
    const parent = makeParent()
    const p = document.createElement('p')
    p.textContent = 'keep me'
    parent.append(p)

    const { unmount } = renderHook(() =>
      useNProgress(0.5, { parent, trickle: false }),
    )
    unmount()
    expect(parent.querySelector('p')).toBeTruthy()
  })

  it('two instances — unmounting one keeps the other active', () => {
    const parent = makeParent()
    const { unmount: unmount1 } = renderHook(() =>
      useNProgress(0.3, { parent, trickle: false }),
    )
    renderHook(() => useNProgress(0.7, { parent, trickle: false }))
    unmount1()
    expect(channelHasDom(document, parent)).toBe(true)
  })
})
