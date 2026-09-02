import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ARRIVED_THRESHOLD,
  arrivedStatesEqual,
  buildScrollState,
  cancelCoalescedMeasure,
  computeArrivedState,
  computeDirections,
  directionsEqual,
  IDLE_SCROLL_STATE,
  isDocumentTarget,
  isScrollableElementTarget,
  isWindowTarget,
  listenerOptionsEqual,
  normalizeIdle,
  normalizeListenerOptions,
  normalizeNegativeZero,
  normalizeObserveOptions,
  normalizeOffset,
  normalizePositionNumber,
  normalizeScrollBehavior,
  normalizeThrottle,
  performScrollTo,
  readScrollMetrics,
  RESET_DIRECTIONS,
  resolveOwningWindow,
  resolveRtlScrollMode,
  resolveScrollElement,
  scheduleCoalescedMeasure,
  scrollStatesEqual,
  type NormalizedOffset,
  type ScrollMetrics,
} from './scrollHelpers'

function createScrollElement(
  metrics: Partial<ScrollMetrics> = {},
): HTMLDivElement {
  const element = document.createElement('div')
  const state = {
    scrollLeft: metrics.x ?? 0,
    scrollTop: metrics.y ?? 0,
    scrollWidth: metrics.scrollWidth ?? 1000,
    scrollHeight: metrics.scrollHeight ?? 1000,
    clientWidth: metrics.clientWidth ?? 200,
    clientHeight: metrics.clientHeight ?? 200,
  }

  Object.defineProperties(element, {
    scrollLeft: {
      configurable: true,
      get: () => state.scrollLeft,
      set: (value: number) => {
        state.scrollLeft = value
      },
    },
    scrollTop: {
      configurable: true,
      get: () => state.scrollTop,
      set: (value: number) => {
        state.scrollTop = value
      },
    },
    scrollWidth: {
      configurable: true,
      get: () => state.scrollWidth,
    },
    scrollHeight: {
      configurable: true,
      get: () => state.scrollHeight,
    },
    clientWidth: {
      configurable: true,
      get: () => state.clientWidth,
    },
    clientHeight: {
      configurable: true,
      get: () => state.clientHeight,
    },
  })

  element.scrollTo = ((options: ScrollToOptions | number) => {
    if (typeof options === 'number') {
      return
    }

    if (options.left != null) {
      state.scrollLeft = options.left
    }
    if (options.top != null) {
      state.scrollTop = options.top
    }
  }) as typeof element.scrollTo

  return element
}

describe('scrollHelpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('normalization helpers', () => {
    it('normalizeThrottle falls back to zero for invalid values', () => {
      expect(normalizeThrottle(undefined)).toBe(0)
      expect(normalizeThrottle(-1)).toBe(0)
      expect(normalizeThrottle(Number.NaN)).toBe(0)
      expect(normalizeThrottle(16)).toBe(16)
    })

    it('normalizeIdle falls back to 200 for invalid values', () => {
      expect(normalizeIdle(undefined)).toBe(200)
      expect(normalizeIdle(-1)).toBe(200)
      expect(normalizeIdle(Number.NaN)).toBe(200)
      expect(normalizeIdle(0)).toBe(0)
      expect(normalizeIdle(150)).toBe(150)
    })

    it('normalizeOffset normalizes each edge independently', () => {
      expect(normalizeOffset(undefined)).toEqual({
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      })
      expect(
        normalizeOffset({
          left: -5,
          right: 12,
          top: Number.NaN,
          bottom: 3,
        }),
      ).toEqual({
        left: 0,
        right: 12,
        top: 0,
        bottom: 3,
      })
    })

    it('normalizeListenerOptions maps boolean and object shapes', () => {
      expect(normalizeListenerOptions(undefined)).toEqual({
        capture: false,
        passive: true,
      })
      expect(normalizeListenerOptions(true)).toEqual({
        capture: true,
        passive: true,
      })
      expect(normalizeListenerOptions(false)).toEqual({
        capture: false,
        passive: true,
      })

      const controller = new AbortController()
      expect(
        normalizeListenerOptions({
          capture: true,
          passive: false,
          once: true,
          signal: controller.signal,
        }),
      ).toEqual({
        capture: true,
        passive: false,
        once: true,
        signal: controller.signal,
      })
    })

    it('listenerOptionsEqual compares all normalized fields', () => {
      const signal = new AbortController().signal
      const left = normalizeListenerOptions({
        capture: true,
        passive: false,
        once: true,
        signal,
      })
      const right = normalizeListenerOptions({
        capture: true,
        passive: false,
        once: true,
        signal,
      })
      const different = normalizeListenerOptions({ capture: false })

      expect(listenerOptionsEqual(left, right)).toBe(true)
      expect(listenerOptionsEqual(left, different)).toBe(false)
    })

    it('normalizeObserveOptions maps boolean and object shapes', () => {
      expect(normalizeObserveOptions(undefined)).toEqual({ mutation: false })
      expect(normalizeObserveOptions(false)).toEqual({ mutation: false })
      expect(normalizeObserveOptions(true)).toEqual({ mutation: true })
      expect(normalizeObserveOptions({ mutation: true })).toEqual({
        mutation: true,
      })
      expect(normalizeObserveOptions({ mutation: false })).toEqual({
        mutation: false,
      })
    })

    it('normalizeNegativeZero converts negative zero to positive zero', () => {
      expect(normalizeNegativeZero(-0)).toBe(0)
      expect(Object.is(normalizeNegativeZero(-0), 0)).toBe(true)
      expect(normalizeNegativeZero(0)).toBe(0)
      expect(normalizeNegativeZero(12)).toBe(12)
    })

    it('normalizePositionNumber rejects invalid values and preserves negative zero', () => {
      expect(normalizePositionNumber(undefined)).toBeNull()
      expect(normalizePositionNumber(Number.NaN)).toBeNull()
      expect(normalizePositionNumber(Number.POSITIVE_INFINITY)).toBeNull()
      expect(normalizePositionNumber(-0)).toBe(0)
      expect(normalizePositionNumber(42)).toBe(42)
    })

    it('normalizeScrollBehavior accepts known values and defaults to auto', () => {
      expect(normalizeScrollBehavior('smooth')).toBe('smooth')
      expect(normalizeScrollBehavior('auto')).toBe('auto')
      expect(normalizeScrollBehavior('instant')).toBe('instant')
      expect(normalizeScrollBehavior(undefined)).toBe('auto')
      expect(normalizeScrollBehavior('unknown' as ScrollBehavior)).toBe('auto')
    })
  })

  describe('target detection', () => {
    it('isWindowTarget identifies window-like objects', () => {
      expect(isWindowTarget(window)).toBe(true)
      expect(isWindowTarget(document)).toBe(false)
      expect(isWindowTarget(document.createElement('div'))).toBe(false)
    })

    it('isDocumentTarget identifies document nodes', () => {
      expect(isDocumentTarget(document)).toBe(true)
      expect(isDocumentTarget(window)).toBe(false)
      expect(isDocumentTarget(document.createElement('div'))).toBe(false)
    })

    it('isScrollableElementTarget identifies element nodes only', () => {
      const element = document.createElement('div')
      expect(isScrollableElementTarget(element)).toBe(true)
      expect(isScrollableElementTarget(window)).toBe(false)
      expect(isScrollableElementTarget(document)).toBe(false)
    })
  })

  describe('target resolution and metrics', () => {
    it('resolveOwningWindow resolves window, document, and element owners', () => {
      const element = document.createElement('div')
      document.body.appendChild(element)

      expect(resolveOwningWindow(window)).toBe(window)
      expect(resolveOwningWindow(document)).toBe(window)
      expect(resolveOwningWindow(element)).toBe(window)

      element.remove()
    })

    it('resolveScrollElement returns the element or document scrolling element', () => {
      const element = createScrollElement()
      const fakeScroller = createScrollElement({ x: 10, y: 20 })

      expect(resolveScrollElement(element)).toBe(element)

      Object.defineProperty(document, 'scrollingElement', {
        configurable: true,
        value: fakeScroller,
      })

      expect(resolveScrollElement(window)).toBe(fakeScroller)
      expect(resolveScrollElement(document)).toBe(fakeScroller)
    })

    it('readScrollMetrics reads element metrics directly', () => {
      const element = createScrollElement({
        x: 25,
        y: 40,
        scrollWidth: 800,
        scrollHeight: 900,
        clientWidth: 200,
        clientHeight: 150,
      })

      expect(readScrollMetrics(element)).toEqual({
        x: 25,
        y: 40,
        scrollWidth: 800,
        scrollHeight: 900,
        clientWidth: 200,
        clientHeight: 150,
      })
    })

    it('readScrollMetrics reads window metrics from scrollingElement and scroll offsets', () => {
      const fakeScroller = createScrollElement({
        scrollWidth: 1200,
        scrollHeight: 1400,
        clientWidth: 300,
        clientHeight: 250,
      })

      Object.defineProperty(document, 'scrollingElement', {
        configurable: true,
        value: fakeScroller,
      })

      Object.defineProperty(window, 'scrollX', {
        configurable: true,
        value: 55,
      })
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: 66,
      })

      expect(readScrollMetrics(window)).toEqual({
        x: 55,
        y: 66,
        scrollWidth: 1200,
        scrollHeight: 1400,
        clientWidth: 300,
        clientHeight: 250,
      })
    })
  })

  describe('computeArrivedState', () => {
    const zeroOffset: NormalizedOffset = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    }

    it('marks all edges arrived for non-scrollable targets', () => {
      const metrics: ScrollMetrics = {
        x: 0,
        y: 0,
        scrollWidth: 200,
        scrollHeight: 200,
        clientWidth: 200,
        clientHeight: 200,
      }

      expect(computeArrivedState(metrics, zeroOffset, 'ltr')).toEqual({
        left: true,
        right: true,
        top: true,
        bottom: true,
      })
    })

    it('detects LTR arrival at each edge with offsets', () => {
      const metrics: ScrollMetrics = {
        x: 0,
        y: 0,
        scrollWidth: 1000,
        scrollHeight: 1000,
        clientWidth: 200,
        clientHeight: 200,
      }
      const offset: NormalizedOffset = {
        left: 10,
        right: 20,
        top: 5,
        bottom: 15,
      }

      expect(computeArrivedState(metrics, offset, 'ltr')).toEqual({
        left: true,
        right: false,
        top: true,
        bottom: false,
      })

      const middle: ScrollMetrics = { ...metrics, x: 400, y: 300 }
      expect(computeArrivedState(middle, offset, 'ltr')).toEqual({
        left: false,
        right: false,
        top: false,
        bottom: false,
      })

      const end: ScrollMetrics = {
        ...metrics,
        x: 800,
        y: 800,
      }
      expect(computeArrivedState(end, offset, 'ltr')).toEqual({
        left: false,
        right: true,
        top: false,
        bottom: true,
      })
    })

    it('treats near-max positions as arrived within the threshold', () => {
      const metrics: ScrollMetrics = {
        x: 799,
        y: 799,
        scrollWidth: 1000,
        scrollHeight: 1000,
        clientWidth: 200,
        clientHeight: 200,
      }

      expect(computeArrivedState(metrics, zeroOffset, 'ltr')).toEqual({
        left: false,
        right: true,
        top: false,
        bottom: true,
      })
    })

    it('handles elastic overscroll positions beyond max bounds in LTR mode', () => {
      const metrics: ScrollMetrics = {
        x: -50,
        y: -25,
        scrollWidth: 1000,
        scrollHeight: 1000,
        clientWidth: 200,
        clientHeight: 200,
      }

      expect(computeArrivedState(metrics, zeroOffset, 'ltr')).toEqual({
        left: true,
        right: false,
        top: true,
        bottom: false,
      })

      const beyond: ScrollMetrics = {
        ...metrics,
        x: 900,
        y: 950,
      }
      expect(computeArrivedState(beyond, zeroOffset, 'ltr')).toEqual({
        left: false,
        right: true,
        top: false,
        bottom: true,
      })
    })
  })

  describe('computeDirections', () => {
    it('returns reset directions when position is unchanged', () => {
      expect(computeDirections(10, 20, 10, 20)).toEqual(RESET_DIRECTIONS)
      expect(computeDirections(0, 0, -0, 0)).toEqual(RESET_DIRECTIONS)
    })

    it('derives axis directions from position deltas', () => {
      expect(computeDirections(0, 0, 10, 20)).toEqual({
        left: false,
        right: true,
        top: false,
        bottom: true,
      })
      expect(computeDirections(50, 80, 10, 20)).toEqual({
        left: true,
        right: false,
        top: true,
        bottom: false,
      })
    })
  })

  describe('equality helpers', () => {
    it('compares arrived, direction, and full scroll states', () => {
      const arrivedA = IDLE_SCROLL_STATE.arrivedState
      const arrivedB = { ...arrivedA }
      const directionsA = IDLE_SCROLL_STATE.directions
      const directionsB = { ...directionsA }

      expect(arrivedStatesEqual(arrivedA, arrivedB)).toBe(true)
      expect(directionsEqual(directionsA, directionsB)).toBe(true)
      expect(
        scrollStatesEqual(IDLE_SCROLL_STATE, { ...IDLE_SCROLL_STATE }),
      ).toBe(true)

      expect(arrivedStatesEqual(arrivedA, { ...arrivedA, right: true })).toBe(
        false,
      )
      expect(
        directionsEqual(directionsA, { ...directionsA, right: true }),
      ).toBe(false)
      expect(
        scrollStatesEqual(IDLE_SCROLL_STATE, {
          ...IDLE_SCROLL_STATE,
          x: 1,
        }),
      ).toBe(false)
    })
  })

  describe('resolveRtlScrollMode', () => {
    beforeEach(() => {
      vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
        const direction =
          element instanceof HTMLElement && element.dataset.direction === 'rtl'
            ? 'rtl'
            : 'ltr'
        return { direction } as CSSStyleDeclaration
      })
    })

    it('returns ltr for non-rtl computed direction', () => {
      const element = createScrollElement({
        x: 0,
        scrollWidth: 1000,
        clientWidth: 200,
      })
      const metrics = readScrollMetrics(element)!
      expect(resolveRtlScrollMode(element, metrics)).toBe('ltr')
    })

    it('returns negative rtl mode when scrollLeft is non-positive', () => {
      const element = createScrollElement({
        x: -100,
        scrollWidth: 1000,
        clientWidth: 200,
      })
      element.dataset.direction = 'rtl'
      const metrics = readScrollMetrics(element)!
      expect(resolveRtlScrollMode(element, metrics)).toBe('negative')
    })

    it('returns reverse rtl mode when scrollLeft is positive', () => {
      const element = createScrollElement({
        x: 100,
        scrollWidth: 1000,
        clientWidth: 200,
      })
      element.dataset.direction = 'rtl'
      const metrics = readScrollMetrics(element)!
      expect(resolveRtlScrollMode(element, metrics)).toBe('reverse')
    })

    it('computeArrivedState handles negative rtl scroll positions', () => {
      const metrics: ScrollMetrics = {
        x: 0,
        y: 0,
        scrollWidth: 1000,
        scrollHeight: 500,
        clientWidth: 200,
        clientHeight: 200,
      }
      const offset = normalizeOffset(undefined)

      expect(computeArrivedState(metrics, offset, 'negative')).toEqual({
        left: false,
        right: true,
        top: true,
        bottom: false,
      })

      const middle: ScrollMetrics = { ...metrics, x: -400 }
      expect(computeArrivedState(middle, offset, 'negative')).toEqual({
        left: false,
        right: false,
        top: true,
        bottom: false,
      })

      const end: ScrollMetrics = { ...metrics, x: -800 }
      expect(computeArrivedState(end, offset, 'negative')).toEqual({
        left: true,
        right: false,
        top: true,
        bottom: false,
      })
    })

    it('computeArrivedState handles reverse rtl scroll positions', () => {
      const metrics: ScrollMetrics = {
        x: 800,
        y: 0,
        scrollWidth: 1000,
        scrollHeight: 500,
        clientWidth: 200,
        clientHeight: 200,
      }
      const offset = normalizeOffset(undefined)

      expect(computeArrivedState(metrics, offset, 'reverse')).toEqual({
        left: true,
        right: false,
        top: true,
        bottom: false,
      })

      const middle: ScrollMetrics = { ...metrics, x: 400 }
      expect(computeArrivedState(middle, offset, 'reverse')).toEqual({
        left: false,
        right: false,
        top: true,
        bottom: false,
      })

      const start: ScrollMetrics = { ...metrics, x: 0 }
      expect(computeArrivedState(start, offset, 'reverse')).toEqual({
        left: false,
        right: true,
        top: true,
        bottom: false,
      })
    })
  })

  describe('buildScrollState', () => {
    it('builds scroll state with computed directions and arrived edges', () => {
      const metrics: ScrollMetrics = {
        x: 100,
        y: 50,
        scrollWidth: 1000,
        scrollHeight: 1000,
        clientWidth: 200,
        clientHeight: 200,
      }

      const next = buildScrollState(
        metrics,
        normalizeOffset(undefined),
        'ltr',
        { x: 0, y: 0 },
        { isScrolling: true },
      )

      expect(next).toMatchObject({
        x: 100,
        y: 50,
        isScrolling: true,
        directions: {
          left: false,
          right: true,
          top: false,
          bottom: true,
        },
      })
      expect(next.arrivedState.left).toBe(false)
      expect(next.arrivedState.top).toBe(false)
    })

    it('can reset directions explicitly', () => {
      const metrics: ScrollMetrics = {
        x: 10,
        y: 10,
        scrollWidth: 1000,
        scrollHeight: 1000,
        clientWidth: 200,
        clientHeight: 200,
      }

      const next = buildScrollState(
        metrics,
        normalizeOffset(undefined),
        'ltr',
        { x: 0, y: 0 },
        { resetDirections: true },
      )

      expect(next.directions).toEqual(RESET_DIRECTIONS)
    })
  })

  describe('performScrollTo', () => {
    it('scrolls elements with scrollTo when available', () => {
      const element = createScrollElement({ x: 0, y: 0 })
      const scrollTo = vi.fn()
      element.scrollTo = scrollTo

      performScrollTo(element, { x: 40, y: 60 }, 'auto')

      expect(scrollTo).toHaveBeenCalledWith({
        left: 40,
        top: 60,
        behavior: 'auto',
      })
    })

    it('assigns scrollLeft and scrollTop when scrollTo is unavailable', () => {
      const element = createScrollElement({ x: 5, y: 10 })

      performScrollTo(element, { x: 25, y: 35 }, 'auto')

      expect(element.scrollLeft).toBe(25)
      expect(element.scrollTop).toBe(35)
    })

    it('scrolls window targets through window.scrollTo', () => {
      const scrollTo = vi.fn()
      Object.defineProperty(window, 'scrollX', {
        configurable: true,
        value: 11,
      })
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: 22,
      })
      vi.spyOn(window, 'scrollTo').mockImplementation(scrollTo)

      performScrollTo(window, { x: 30, y: 40 }, 'smooth')

      expect(scrollTo).toHaveBeenCalledWith({
        left: 30,
        top: 40,
        behavior: 'smooth',
      })
    })

    it('scrolls document targets through the owning window', () => {
      const scrollTo = vi.fn()
      vi.spyOn(window, 'scrollTo').mockImplementation(scrollTo)

      performScrollTo(
        document,
        { x: 15, y: undefined as unknown as number },
        'auto',
      )

      expect(scrollTo).toHaveBeenCalledWith({
        left: 15,
        top: expect.any(Number),
        behavior: 'auto',
      })
    })

    it('no-ops when both coordinates are invalid', () => {
      const element = createScrollElement({ x: 1, y: 2 })
      const scrollTo = vi.fn()
      element.scrollTo = scrollTo

      performScrollTo(element, { x: Number.NaN, y: Number.NaN }, 'auto')

      expect(scrollTo).not.toHaveBeenCalled()
      expect(element.scrollLeft).toBe(1)
      expect(element.scrollTop).toBe(2)
    })
  })

  describe('scheduleCoalescedMeasure and cancelCoalescedMeasure', () => {
    it('runs the callback on the next microtask by default', async () => {
      const callback = vi.fn()
      scheduleCoalescedMeasure(window, callback)

      expect(callback).not.toHaveBeenCalled()
      await Promise.resolve()
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('cancels a pending microtask measurement', async () => {
      const callback = vi.fn()
      const handle = scheduleCoalescedMeasure(window, callback)
      cancelCoalescedMeasure(handle)

      await Promise.resolve()
      expect(callback).not.toHaveBeenCalled()
    })

    it('falls back to requestAnimationFrame when queueMicrotask is unavailable', async () => {
      const originalQueueMicrotask = globalThis.queueMicrotask
      Object.defineProperty(globalThis, 'queueMicrotask', {
        configurable: true,
        value: undefined,
      })

      const callback = vi.fn()
      const raf = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb) => {
          cb(0)
          return 1
        })

      try {
        scheduleCoalescedMeasure(window, callback)
        expect(raf).toHaveBeenCalled()
        expect(callback).toHaveBeenCalledTimes(1)
      } finally {
        Object.defineProperty(globalThis, 'queueMicrotask', {
          configurable: true,
          value: originalQueueMicrotask,
        })
      }
    })

    it('cancels a pending animation frame measurement', () => {
      const originalQueueMicrotask = globalThis.queueMicrotask
      Object.defineProperty(globalThis, 'queueMicrotask', {
        configurable: true,
        value: undefined,
      })

      const callback = vi.fn()
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
      vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42)

      try {
        const handle = scheduleCoalescedMeasure(window, callback)
        cancelCoalescedMeasure(handle)
        expect(cancelSpy).toHaveBeenCalledWith(42)
        expect(callback).not.toHaveBeenCalled()
      } finally {
        Object.defineProperty(globalThis, 'queueMicrotask', {
          configurable: true,
          value: originalQueueMicrotask,
        })
      }
    })

    it('cancels a pending timeout measurement when raf is unavailable', () => {
      const originalQueueMicrotask = globalThis.queueMicrotask
      Object.defineProperty(globalThis, 'queueMicrotask', {
        configurable: true,
        value: undefined,
      })

      const callback = vi.fn()
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
        throw new Error('no raf')
      })
      const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
      const handle = scheduleCoalescedMeasure(null, callback)

      cancelCoalescedMeasure(handle)
      expect(clearSpy).toHaveBeenCalledWith(
        handle.kind === 'timeout' ? handle.id : 0,
      )

      Object.defineProperty(globalThis, 'queueMicrotask', {
        configurable: true,
        value: originalQueueMicrotask,
      })
    })
  })

  describe('constants', () => {
    it('exposes the expected idle scroll defaults', () => {
      expect(ARRIVED_THRESHOLD).toBe(1)
      expect(IDLE_SCROLL_STATE).toMatchObject({
        x: 0,
        y: 0,
        isScrolling: false,
      })
    })
  })
})
