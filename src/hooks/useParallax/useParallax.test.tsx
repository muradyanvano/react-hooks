import { act, renderHook } from '@testing-library/react'
import { createRef, StrictMode, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useParallax } from './useParallax'

function mockRect(
  element: Element,
  rect: Partial<DOMRect> & Pick<DOMRect, 'width' | 'height' | 'left' | 'top'>,
) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: rect.left,
    y: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect)
}

function dispatchMouseMove(
  target: EventTarget,
  clientX: number,
  clientY: number,
) {
  target.dispatchEvent(
    new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    }),
  )
}

function dispatchOrientation(
  target: EventTarget,
  beta: number | null,
  gamma: number | null,
) {
  const event = new Event('deviceorientation')
  Object.defineProperty(event, 'beta', { value: beta })
  Object.defineProperty(event, 'gamma', { value: gamma })
  Object.defineProperty(event, 'alpha', { value: 0 })
  target.dispatchEvent(event)
}

describe('useParallax', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('returns centered mouse fallback state', () => {
      const ref = createRef<HTMLDivElement>()
      const { result } = renderHook(() => useParallax(ref))
      expect(result.current).toEqual({
        roll: 0,
        tilt: 0,
        source: 'mouse',
      })
    })

    it('stays idle while the ref is null', () => {
      const ref = createRef<HTMLDivElement>()
      const windowAdd = vi.spyOn(window, 'addEventListener')
      const { result } = renderHook(() => useParallax(ref))
      expect(result.current).toEqual({
        roll: 0,
        tilt: 0,
        source: 'mouse',
      })
      expect(
        windowAdd.mock.calls.some((call) => call[0] === 'deviceorientation'),
      ).toBe(false)
    })
  })

  describe('mouse behavior', () => {
    it('normalizes center and corners relative to the target', () => {
      const element = document.createElement('div')
      document.body.append(element)
      mockRect(element, { left: 100, top: 50, width: 200, height: 100 })

      const ref = { current: element }
      const { result } = renderHook(() => useParallax(ref))

      act(() => {
        dispatchMouseMove(element, 200, 100)
      })
      expect(result.current).toEqual({
        roll: 0,
        tilt: 0,
        source: 'mouse',
      })

      act(() => {
        dispatchMouseMove(element, 100, 50)
      })
      expect(result.current.roll).toBeCloseTo(-0.5)
      expect(result.current.tilt).toBeCloseTo(-0.5)

      act(() => {
        dispatchMouseMove(element, 300, 150)
      })
      expect(result.current.roll).toBeCloseTo(0.5)
      expect(result.current.tilt).toBeCloseTo(0.5)

      element.remove()
    })

    it('preserves previous state for zero-size targets', () => {
      const element = document.createElement('div')
      document.body.append(element)
      mockRect(element, { left: 0, top: 0, width: 100, height: 100 })

      const ref = { current: element }
      const { result } = renderHook(() => useParallax(ref))

      act(() => {
        dispatchMouseMove(element, 75, 25)
      })
      const previous = { ...result.current }

      mockRect(element, { left: 0, top: 0, width: 0, height: 100 })
      act(() => {
        dispatchMouseMove(element, 10, 10)
      })
      expect(result.current).toEqual(previous)

      element.remove()
    })

    it('registers no mouse listener when mouse is false', () => {
      const element = document.createElement('div')
      document.body.append(element)
      const addSpy = vi.spyOn(element, 'addEventListener')
      const ref = { current: element }

      renderHook(() => useParallax(ref, { mouse: false }))
      expect(addSpy.mock.calls.some((call) => call[0] === 'mousemove')).toBe(
        false,
      )

      element.remove()
    })

    it('registers passive mouse listeners', () => {
      const element = document.createElement('div')
      document.body.append(element)
      const addSpy = vi.spyOn(element, 'addEventListener')
      const ref = { current: element }

      renderHook(() => useParallax(ref, { deviceOrientation: false }))
      const move = addSpy.mock.calls.find((call) => call[0] === 'mousemove')
      expect(move?.[2]).toMatchObject({ passive: true })

      element.remove()
    })

    it('skips duplicate mouse updates', () => {
      const element = document.createElement('div')
      document.body.append(element)
      mockRect(element, { left: 0, top: 0, width: 100, height: 100 })
      const ref = { current: element }
      let renders = 0

      const { result } = renderHook(() => {
        renders += 1
        return useParallax(ref, { deviceOrientation: false })
      })

      const baseline = renders
      act(() => {
        dispatchMouseMove(element, 50, 50)
      })
      expect(result.current).toEqual({ roll: 0, tilt: 0, source: 'mouse' })
      const afterFirst = renders

      act(() => {
        dispatchMouseMove(element, 50, 50)
      })
      expect(renders).toBe(afterFirst)
      expect(renders).toBeGreaterThanOrEqual(baseline)

      element.remove()
    })
  })

  describe('device orientation', () => {
    it('updates from valid beta/gamma and switches source', () => {
      const element = document.createElement('div')
      document.body.append(element)
      const ref = { current: element }
      const { result } = renderHook(() => useParallax(ref, { mouse: false }))

      act(() => {
        dispatchOrientation(window, 90, -90)
      })
      expect(result.current.source).toBe('deviceOrientation')
      expect(result.current.roll).toBeCloseTo(-0.5)
      expect(result.current.tilt).toBeCloseTo(0.5)

      element.remove()
    })

    it('ignores invalid orientation samples without switching source', () => {
      const element = document.createElement('div')
      document.body.append(element)
      mockRect(element, { left: 0, top: 0, width: 100, height: 100 })
      const ref = { current: element }
      const { result } = renderHook(() => useParallax(ref))

      act(() => {
        dispatchMouseMove(element, 75, 25)
      })
      expect(result.current.source).toBe('mouse')

      act(() => {
        dispatchOrientation(window, null, 10)
      })
      expect(result.current.source).toBe('mouse')

      act(() => {
        dispatchOrientation(window, Number.NaN, 10)
      })
      expect(result.current.source).toBe('mouse')

      element.remove()
    })

    it('registers orientation on the owning window', () => {
      const element = document.createElement('div')
      document.body.append(element)
      const addSpy = vi.spyOn(window, 'addEventListener')
      const ref = { current: element }

      renderHook(() => useParallax(ref, { mouse: false }))
      expect(
        addSpy.mock.calls.some((call) => call[0] === 'deviceorientation'),
      ).toBe(true)

      element.remove()
    })

    it('registers no orientation listener when disabled', () => {
      const element = document.createElement('div')
      document.body.append(element)
      const addSpy = vi.spyOn(window, 'addEventListener')
      const ref = { current: element }

      renderHook(() =>
        useParallax(ref, { deviceOrientation: false, mouse: true }),
      )
      expect(
        addSpy.mock.calls.some((call) => call[0] === 'deviceorientation'),
      ).toBe(false)

      element.remove()
    })
  })

  describe('screen orientation compensation', () => {
    it('rotates sensor axes for 90 degree screen angle', () => {
      const element = document.createElement('div')
      document.body.append(element)
      const ref = { current: element }
      Object.defineProperty(window.screen, 'orientation', {
        configurable: true,
        value: { angle: 90 },
      })

      const { result } = renderHook(() => useParallax(ref, { mouse: false }))
      act(() => {
        dispatchOrientation(window, 90, 0)
      })
      expect(result.current.roll).toBeCloseTo(-0.5)
      expect(result.current.tilt).toBeCloseTo(0)

      element.remove()
    })
  })

  describe('source switching', () => {
    it('lets the most recent valid input win', () => {
      const element = document.createElement('div')
      document.body.append(element)
      mockRect(element, { left: 0, top: 0, width: 100, height: 100 })
      const ref = { current: element }
      const { result } = renderHook(() => useParallax(ref))

      act(() => {
        dispatchMouseMove(element, 80, 20)
      })
      expect(result.current.source).toBe('mouse')

      act(() => {
        dispatchOrientation(window, 45, 0)
      })
      expect(result.current.source).toBe('deviceOrientation')

      act(() => {
        dispatchMouseMove(element, 20, 80)
      })
      expect(result.current.source).toBe('mouse')

      element.remove()
    })
  })

  describe('adjusters and clamp', () => {
    it('uses latest mouse adjusters without listener churn', () => {
      const element = document.createElement('div')
      document.body.append(element)
      mockRect(element, { left: 0, top: 0, width: 100, height: 100 })
      const addSpy = vi.spyOn(element, 'addEventListener')
      const ref = { current: element }

      const { result, rerender } = renderHook(
        ({ rollAdjust }) =>
          useParallax(ref, {
            deviceOrientation: false,
            mouseRollAdjust: rollAdjust,
          }),
        { initialProps: { rollAdjust: (value: number) => value } },
      )

      const moveAdds = addSpy.mock.calls.filter(
        (call) => call[0] === 'mousemove',
      ).length

      rerender({ rollAdjust: (value: number) => value * 2 })
      expect(
        addSpy.mock.calls.filter((call) => call[0] === 'mousemove'),
      ).toHaveLength(moveAdds)

      act(() => {
        dispatchMouseMove(element, 100, 50)
      })
      expect(result.current.roll).toBeCloseTo(0.5)
      expect(result.current.tilt).toBeCloseTo(0)

      element.remove()
    })

    it('contains throwing adjusters and rejects non-finite results', () => {
      const element = document.createElement('div')
      document.body.append(element)
      mockRect(element, { left: 0, top: 0, width: 100, height: 100 })
      const ref = { current: element }
      const { result } = renderHook(() =>
        useParallax(ref, {
          deviceOrientation: false,
          mouseRollAdjust: () => {
            throw new Error('boom')
          },
        }),
      )

      act(() => {
        dispatchMouseMove(element, 100, 50)
      })
      expect(result.current).toEqual({
        roll: 0,
        tilt: 0,
        source: 'mouse',
      })

      element.remove()
    })

    it('preserves overflow when clamp is false', () => {
      const element = document.createElement('div')
      document.body.append(element)
      mockRect(element, { left: 0, top: 0, width: 100, height: 100 })
      const ref = { current: element }
      const { result } = renderHook(() =>
        useParallax(ref, {
          deviceOrientation: false,
          clamp: false,
          mouseRollAdjust: (value) => value * 3,
          mouseTiltAdjust: (value) => value * 3,
        }),
      )

      act(() => {
        dispatchMouseMove(element, 100, 100)
      })
      expect(result.current.roll).toBeCloseTo(1.5)
      expect(result.current.tilt).toBeCloseTo(1.5)

      element.remove()
    })
  })

  describe('target and enabled lifecycle', () => {
    it('syncs late ref attachment', () => {
      function Harness({ element }: { element: HTMLDivElement | null }) {
        const ref = useRef<HTMLDivElement | null>(null)
        ref.current = element
        return useParallax(ref, { deviceOrientation: false })
      }

      const element = document.createElement('div')
      document.body.append(element)
      mockRect(element, { left: 0, top: 0, width: 100, height: 100 })

      const { result, rerender } = renderHook(
        ({ element: current }) => Harness({ element: current }),
        { initialProps: { element: null as HTMLDivElement | null } },
      )

      act(() => {
        dispatchMouseMove(element, 100, 50)
      })
      expect(result.current.roll).toBe(0)

      rerender({ element })
      act(() => {
        dispatchMouseMove(element, 100, 50)
      })
      expect(result.current.roll).toBeCloseTo(0.5)

      element.remove()
    })

    it('resets when the target is replaced', () => {
      const a = document.createElement('div')
      const b = document.createElement('div')
      document.body.append(a, b)
      mockRect(a, { left: 0, top: 0, width: 100, height: 100 })
      mockRect(b, { left: 0, top: 0, width: 100, height: 100 })

      const { result, rerender } = renderHook(
        ({ target }) =>
          useParallax({ current: target }, { deviceOrientation: false }),
        { initialProps: { target: a } },
      )

      act(() => {
        dispatchMouseMove(a, 100, 50)
      })
      expect(result.current.roll).toBeCloseTo(0.5)

      rerender({ target: b })
      expect(result.current).toEqual({
        roll: 0,
        tilt: 0,
        source: 'mouse',
      })

      act(() => {
        dispatchMouseMove(a, 100, 100)
      })
      expect(result.current.roll).toBe(0)

      a.remove()
      b.remove()
    })

    it('disabling resets and removes listeners', () => {
      const element = document.createElement('div')
      document.body.append(element)
      mockRect(element, { left: 0, top: 0, width: 100, height: 100 })
      const removeSpy = vi.spyOn(element, 'removeEventListener')
      const ref = { current: element }

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useParallax(ref, { enabled, deviceOrientation: false }),
        { initialProps: { enabled: true } },
      )

      act(() => {
        dispatchMouseMove(element, 100, 50)
      })
      expect(result.current.roll).toBeCloseTo(0.5)

      rerender({ enabled: false })
      expect(result.current).toEqual({
        roll: 0,
        tilt: 0,
        source: 'mouse',
      })
      expect(removeSpy.mock.calls.some((call) => call[0] === 'mousemove')).toBe(
        true,
      )

      element.remove()
    })

    it('supports SVG targets', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      document.body.append(svg)
      mockRect(svg, { left: 0, top: 0, width: 100, height: 100 })
      const ref = { current: svg }
      const { result } = renderHook(() =>
        useParallax(ref, { deviceOrientation: false }),
      )

      act(() => {
        dispatchMouseMove(svg, 0, 0)
      })
      expect(result.current.roll).toBeCloseTo(-0.5)
      expect(result.current.tilt).toBeCloseTo(-0.5)

      svg.remove()
    })
  })

  describe('Strict Mode and SSR', () => {
    it('keeps one effective mouse listener under Strict Mode', () => {
      const element = document.createElement('div')
      document.body.append(element)
      const addSpy = vi.spyOn(element, 'addEventListener')
      const removeSpy = vi.spyOn(element, 'removeEventListener')
      const ref = { current: element }

      const { unmount } = renderHook(
        () => useParallax(ref, { deviceOrientation: false }),
        { wrapper: StrictMode },
      )

      const adds = addSpy.mock.calls.filter((call) => call[0] === 'mousemove')
      const removes = removeSpy.mock.calls.filter(
        (call) => call[0] === 'mousemove',
      )
      expect(adds.length - removes.length).toBe(1)

      unmount()
      element.remove()
    })

    it('renderToString without listeners or measurements', () => {
      const addSpy = vi.spyOn(EventTarget.prototype, 'addEventListener')
      const measureSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect')

      function Component() {
        const ref = useRef<HTMLDivElement>(null)
        const value = useParallax(ref)
        return (
          <span>
            {value.roll}:{value.tilt}:{value.source}
          </span>
        )
      }

      const html = renderToString(<Component />)
      expect(html.replaceAll('<!-- -->', '')).toContain('0:0:mouse')
      expect(addSpy).not.toHaveBeenCalled()
      expect(measureSpy).not.toHaveBeenCalled()
    })
  })
})
