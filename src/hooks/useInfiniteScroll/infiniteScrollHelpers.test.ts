import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  cancelFrame,
  geometrySignature,
  getDistanceToEdge,
  isWithinDistance,
  normalizeDistance,
  normalizeLoadError,
  readScrollMetrics,
  resolveListenerTarget,
  resolveObservedElement,
  resolveOwningWindow,
  resolveResizeObserverConstructor,
  scheduleFrame,
  type ScrollMetrics,
} from './infiniteScrollHelpers'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function metrics(partial: Partial<ScrollMetrics>): ScrollMetrics {
  return {
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 1000,
    scrollWidth: 1000,
    clientHeight: 200,
    clientWidth: 200,
    ...partial,
  }
}

describe('infiniteScrollHelpers', () => {
  it('normalizes distance values', () => {
    expect(normalizeDistance(undefined)).toBe(0)
    expect(normalizeDistance(-4)).toBe(0)
    expect(normalizeDistance(Number.NaN)).toBe(0)
    expect(normalizeDistance(Number.POSITIVE_INFINITY)).toBe(0)
    expect(normalizeDistance(12.5)).toBe(12.5)
  })

  it('computes distance to each edge', () => {
    const sample = metrics({
      scrollTop: 40,
      scrollLeft: 10,
      scrollHeight: 500,
      scrollWidth: 800,
      clientHeight: 100,
      clientWidth: 200,
    })

    expect(getDistanceToEdge(sample, 'top')).toBe(40)
    expect(getDistanceToEdge(sample, 'left')).toBe(10)
    expect(getDistanceToEdge(sample, 'bottom')).toBe(360)
    expect(getDistanceToEdge(sample, 'right')).toBe(590)
  })

  it('treats negative remaining distance as within distance', () => {
    expect(isWithinDistance(-0.4, 0)).toBe(true)
    expect(isWithinDistance(-2, 0)).toBe(true)
    expect(isWithinDistance(10, 10)).toBe(true)
    expect(isWithinDistance(10.1, 10)).toBe(false)
  })

  it('builds geometry signatures by axis', () => {
    const sample = metrics({
      scrollHeight: 9,
      clientHeight: 3,
      scrollWidth: 8,
      clientWidth: 2,
    })
    expect(geometrySignature(sample, 'bottom')).toBe('9:3')
    expect(geometrySignature(sample, 'left')).toBe('8:2')
  })

  it('normalizes load errors', () => {
    expect(normalizeLoadError(new Error('x'))).toMatchObject({ message: 'x' })
    expect(normalizeLoadError('boom')).toMatchObject({ message: 'boom' })
    expect(normalizeLoadError(123)).toMatchObject({
      message: 'Infinite scroll load failed',
    })
  })

  it('reads element metrics and resolves owning window listener targets', () => {
    const element = document.createElement('div')
    Object.defineProperties(element, {
      scrollTop: { value: 5, configurable: true },
      scrollLeft: { value: 1, configurable: true },
      scrollHeight: { value: 50, configurable: true },
      scrollWidth: { value: 40, configurable: true },
      clientHeight: { value: 20, configurable: true },
      clientWidth: { value: 10, configurable: true },
    })

    expect(readScrollMetrics(element)).toEqual({
      scrollTop: 5,
      scrollLeft: 1,
      scrollHeight: 50,
      scrollWidth: 40,
      clientHeight: 20,
      clientWidth: 10,
    })
    expect(resolveListenerTarget(element)).toBe(element)
    expect(resolveOwningWindow(element)).toBe(window)
    expect(resolveObservedElement(element)).toBe(element)
    expect(resolveListenerTarget(window)).toBe(window)
    expect(resolveListenerTarget(document)).toBe(document)
  })

  it('schedules and cancels frames with raf or timeout fallback', () => {
    const callback = vi.fn()
    const handle = scheduleFrame(window, callback)
    expect(handle).not.toBeNull()
    cancelFrame(handle)
    expect(callback).not.toHaveBeenCalled()

    vi.stubGlobal('requestAnimationFrame', undefined)
    vi.stubGlobal('cancelAnimationFrame', undefined)
    const fallback = scheduleFrame(window, callback)
    expect(fallback?.kind).toBe('timeout')
    cancelFrame(fallback)
  })

  it('resolves ResizeObserver constructors when available', () => {
    class FakeResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    expect(resolveResizeObserverConstructor(window)).toBe(FakeResizeObserver)
  })
})
