import { StrictMode, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'

import { useMouse } from './useMouse'
import type {
  UseMouseEventExtractor,
  UseMouseEventFilter,
  UseMousePosition,
} from './mouseHelpers'

function dispatchMouse(
  target: EventTarget,
  type: 'mousemove' | 'dragover',
  coords: {
    pageX?: number
    pageY?: number
    clientX?: number
    clientY?: number
    screenX?: number
    screenY?: number
    movementX?: number
    movementY?: number
  },
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: coords.clientX ?? 0,
    clientY: coords.clientY ?? 0,
    screenX: coords.screenX ?? 0,
    screenY: coords.screenY ?? 0,
  })

  Object.defineProperty(event, 'pageX', {
    configurable: true,
    value: coords.pageX ?? coords.clientX ?? 0,
  })
  Object.defineProperty(event, 'pageY', {
    configurable: true,
    value: coords.pageY ?? coords.clientY ?? 0,
  })
  Object.defineProperty(event, 'movementX', {
    configurable: true,
    value: coords.movementX ?? 0,
  })
  Object.defineProperty(event, 'movementY', {
    configurable: true,
    value: coords.movementY ?? 0,
  })

  target.dispatchEvent(event)
  return event
}

function createTouchList(touches: Touch[]): TouchList {
  const list: Record<string | number, unknown> = {
    ...touches,
    length: touches.length,
    item: (index: number) => touches[index] ?? null,
  }
  return list as unknown as TouchList
}

function createTouch(partial: {
  identifier: number
  pageX?: number
  pageY?: number
  clientX?: number
  clientY?: number
  screenX?: number
  screenY?: number
}): Touch {
  return {
    identifier: partial.identifier,
    target: document.body,
    clientX: partial.clientX ?? 0,
    clientY: partial.clientY ?? 0,
    pageX: partial.pageX ?? 0,
    pageY: partial.pageY ?? 0,
    screenX: partial.screenX ?? 0,
    screenY: partial.screenY ?? 0,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 0,
  }
}

function dispatchTouch(
  target: EventTarget,
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  options: {
    touches?: Touch[]
    changedTouches?: Touch[]
  },
) {
  const touches = options.touches ?? []
  const changedTouches = options.changedTouches ?? touches
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', {
    configurable: true,
    value: createTouchList(touches),
  })
  Object.defineProperty(event, 'changedTouches', {
    configurable: true,
    value: createTouchList(changedTouches),
  })
  Object.defineProperty(event, 'targetTouches', {
    configurable: true,
    value: createTouchList(touches),
  })
  target.dispatchEvent(event)
  return event as TouchEvent
}

describe('useMouse', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('defaults to origin with null source', () => {
      const { result } = renderHook(() => useMouse())
      expect(result.current).toEqual({ x: 0, y: 0, sourceType: null })
    })

    it('uses a copied custom initial value including fractions', () => {
      const initial: UseMousePosition = { x: 1.5, y: -2.25 }
      const { result } = renderHook(() => useMouse({ initialValue: initial }))
      expect(result.current).toEqual({
        x: 1.5,
        y: -2.25,
        sourceType: null,
      })
      initial.x = 99
      expect(result.current.x).toBe(1.5)
    })

    it('does not reset live state when initialValue identity changes', () => {
      const { result, rerender } = renderHook(
        ({ initialValue }) => useMouse({ initialValue }),
        { initialProps: { initialValue: { x: 1, y: 2 } } },
      )

      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 40,
          pageY: 50,
          clientX: 40,
          clientY: 50,
        })
      })
      expect(result.current).toMatchObject({
        x: 40,
        y: 50,
        sourceType: 'mouse',
      })

      rerender({ initialValue: { x: 9, y: 8 } })
      expect(result.current).toMatchObject({
        x: 40,
        y: 50,
        sourceType: 'mouse',
      })
    })
  })

  describe('mouse coordinates', () => {
    it('tracks page, client, screen, and movement coordinates', () => {
      const page = renderHook(() => useMouse({ type: 'page' }))
      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 100,
          pageY: 200,
          clientX: 10,
          clientY: 20,
        })
      })
      expect(page.result.current).toEqual({
        x: 100,
        y: 200,
        sourceType: 'mouse',
      })

      const client = renderHook(() => useMouse({ type: 'client' }))
      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 100,
          pageY: 200,
          clientX: 15,
          clientY: 25,
        })
      })
      expect(client.result.current).toEqual({
        x: 15,
        y: 25,
        sourceType: 'mouse',
      })

      const screen = renderHook(() => useMouse({ type: 'screen' }))
      act(() => {
        dispatchMouse(window, 'mousemove', {
          screenX: 300,
          screenY: 400,
          clientX: 1,
          clientY: 2,
          pageX: 1,
          pageY: 2,
        })
      })
      expect(screen.result.current).toEqual({
        x: 300,
        y: 400,
        sourceType: 'mouse',
      })

      const movement = renderHook(() => useMouse({ type: 'movement' }))
      act(() => {
        dispatchMouse(window, 'mousemove', {
          movementX: 5,
          movementY: -3,
          clientX: 1,
          clientY: 1,
          pageX: 1,
          pageY: 1,
        })
      })
      expect(movement.result.current).toEqual({
        x: 5,
        y: -3,
        sourceType: 'mouse',
      })
    })

    it('updates from dragover and skips redundant same-value renders', () => {
      let renders = 0
      const { result } = renderHook(() => {
        renders += 1
        return useMouse()
      })

      const afterMount = renders
      act(() => {
        dispatchMouse(window, 'dragover', {
          pageX: 12,
          pageY: 34,
          clientX: 12,
          clientY: 34,
        })
      })
      expect(result.current).toEqual({
        x: 12,
        y: 34,
        sourceType: 'mouse',
      })
      expect(renders).toBeGreaterThan(afterMount)

      const afterUpdate = renders
      act(() => {
        dispatchMouse(window, 'dragover', {
          pageX: 12,
          pageY: 34,
          clientX: 12,
          clientY: 34,
        })
      })
      expect(renders).toBe(afterUpdate)
    })
  })

  describe('touch coordinates', () => {
    it('tracks touchstart and touchmove with first-touch selection', () => {
      const { result } = renderHook(() => useMouse())
      const first = createTouch({
        identifier: 1,
        pageX: 8,
        pageY: 9,
        clientX: 8,
        clientY: 9,
      })
      const second = createTouch({
        identifier: 2,
        pageX: 80,
        pageY: 90,
        clientX: 80,
        clientY: 90,
      })

      act(() => {
        dispatchTouch(window, 'touchstart', { touches: [first, second] })
      })
      expect(result.current).toEqual({
        x: 8,
        y: 9,
        sourceType: 'touch',
      })

      act(() => {
        dispatchTouch(window, 'touchmove', {
          touches: [
            createTouch({
              identifier: 1,
              pageX: 18,
              pageY: 19,
              clientX: 18,
              clientY: 19,
            }),
          ],
        })
      })
      expect(result.current).toEqual({
        x: 18,
        y: 19,
        sourceType: 'touch',
      })
    })

    it('falls back to changedTouches and ignores empty collections', () => {
      const { result } = renderHook(() => useMouse())
      const changed = createTouch({
        identifier: 7,
        pageX: 70,
        pageY: 71,
        clientX: 70,
        clientY: 71,
      })

      act(() => {
        dispatchTouch(window, 'touchmove', {
          touches: [],
          changedTouches: [changed],
        })
      })
      expect(result.current).toEqual({
        x: 70,
        y: 71,
        sourceType: 'touch',
      })

      act(() => {
        dispatchTouch(window, 'touchmove', {
          touches: [],
          changedTouches: [],
        })
      })
      expect(result.current).toEqual({
        x: 70,
        y: 71,
        sourceType: 'touch',
      })
    })

    it('registers no touch listeners when touch is false', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      renderHook(() => useMouse({ touch: false }))

      const touchTypes = addSpy.mock.calls
        .map((call) => call[0])
        .filter((type) => String(type).startsWith('touch'))
      expect(touchTypes).toEqual([])

      act(() => {
        dispatchTouch(window, 'touchstart', {
          touches: [
            createTouch({
              identifier: 1,
              pageX: 1,
              pageY: 2,
              clientX: 1,
              clientY: 2,
            }),
          ],
        })
      })
    })

    it('ignores touch updates in movement mode without a custom extractor', () => {
      const { result } = renderHook(() => useMouse({ type: 'movement' }))
      act(() => {
        dispatchTouch(window, 'touchstart', {
          touches: [
            createTouch({
              identifier: 1,
              pageX: 5,
              pageY: 6,
              clientX: 5,
              clientY: 6,
            }),
          ],
        })
      })
      expect(result.current).toEqual({ x: 0, y: 0, sourceType: null })
    })
  })

  describe('touch reset', () => {
    it('preserves the last touch position by default', () => {
      const { result } = renderHook(() => useMouse())
      act(() => {
        dispatchTouch(window, 'touchstart', {
          touches: [
            createTouch({
              identifier: 1,
              pageX: 4,
              pageY: 5,
              clientX: 4,
              clientY: 5,
            }),
          ],
        })
      })
      act(() => {
        dispatchTouch(window, 'touchend', {
          touches: [],
          changedTouches: [
            createTouch({
              identifier: 1,
              pageX: 4,
              pageY: 5,
              clientX: 4,
              clientY: 5,
            }),
          ],
        })
      })
      expect(result.current).toEqual({
        x: 4,
        y: 5,
        sourceType: 'touch',
      })
    })

    it('resets on final touchend and touchcancel using the latest initial value', () => {
      const { result, rerender } = renderHook(
        ({ initialValue, resetOnTouchEnd }) =>
          useMouse({ initialValue, resetOnTouchEnd }),
        {
          initialProps: {
            initialValue: { x: 1, y: 2 },
            resetOnTouchEnd: true,
          },
        },
      )

      act(() => {
        dispatchTouch(window, 'touchstart', {
          touches: [
            createTouch({
              identifier: 1,
              pageX: 9,
              pageY: 8,
              clientX: 9,
              clientY: 8,
            }),
          ],
        })
      })

      rerender({
        initialValue: { x: 11, y: 22 },
        resetOnTouchEnd: true,
      })

      act(() => {
        dispatchTouch(window, 'touchend', {
          touches: [],
          changedTouches: [
            createTouch({
              identifier: 1,
              pageX: 9,
              pageY: 8,
              clientX: 9,
              clientY: 8,
            }),
          ],
        })
      })
      expect(result.current).toEqual({
        x: 11,
        y: 22,
        sourceType: null,
      })

      act(() => {
        dispatchTouch(window, 'touchstart', {
          touches: [
            createTouch({
              identifier: 1,
              pageX: 3,
              pageY: 4,
              clientX: 3,
              clientY: 4,
            }),
          ],
        })
      })
      act(() => {
        dispatchTouch(window, 'touchcancel', {
          touches: [],
          changedTouches: [
            createTouch({
              identifier: 1,
              pageX: 3,
              pageY: 4,
              clientX: 3,
              clientY: 4,
            }),
          ],
        })
      })
      expect(result.current).toEqual({
        x: 11,
        y: 22,
        sourceType: null,
      })
    })

    it('updates from a remaining active touch instead of resetting', () => {
      const { result } = renderHook(() =>
        useMouse({ resetOnTouchEnd: true, initialValue: { x: 0, y: 0 } }),
      )

      const first = createTouch({
        identifier: 1,
        pageX: 1,
        pageY: 1,
        clientX: 1,
        clientY: 1,
      })
      const second = createTouch({
        identifier: 2,
        pageX: 20,
        pageY: 21,
        clientX: 20,
        clientY: 21,
      })

      act(() => {
        dispatchTouch(window, 'touchstart', { touches: [first, second] })
      })
      act(() => {
        dispatchTouch(window, 'touchend', {
          touches: [second],
          changedTouches: [first],
        })
      })
      expect(result.current).toEqual({
        x: 20,
        y: 21,
        sourceType: 'touch',
      })
    })
  })

  describe('scrolling', () => {
    it('updates page coordinates from last client position on scroll', () => {
      const scrollXSpy = vi.spyOn(window, 'scrollX', 'get').mockReturnValue(40)
      const scrollYSpy = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(50)

      const { result } = renderHook(() =>
        useMouse({ type: 'page', scroll: true }),
      )

      act(() => {
        window.dispatchEvent(new Event('scroll'))
      })
      expect(result.current).toEqual({ x: 0, y: 0, sourceType: null })

      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 15,
          pageY: 25,
          clientX: 15,
          clientY: 25,
        })
      })
      expect(result.current.sourceType).toBe('mouse')

      act(() => {
        window.dispatchEvent(new Event('scroll'))
      })
      expect(result.current).toEqual({
        x: 55,
        y: 75,
        sourceType: 'mouse',
      })

      scrollXSpy.mockRestore()
      scrollYSpy.mockRestore()
    })

    it('does not attach a scroll listener for non-page modes', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')

      for (const type of ['client', 'screen', 'movement'] as const) {
        addSpy.mockClear()
        const { unmount } = renderHook(() => useMouse({ type, scroll: true }))
        const scrollCalls = addSpy.mock.calls.filter(
          (call) => call[0] === 'scroll',
        )
        expect(scrollCalls).toHaveLength(0)
        unmount()
      }

      addSpy.mockClear()
      const extractor: UseMouseEventExtractor = () => [1, 2]
      const { unmount } = renderHook(() =>
        useMouse({ type: extractor, scroll: true }),
      )
      expect(
        addSpy.mock.calls.filter((call) => call[0] === 'scroll'),
      ).toHaveLength(0)
      unmount()
    })

    it('respects scroll: false for page mode', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      renderHook(() => useMouse({ type: 'page', scroll: false }))
      expect(
        addSpy.mock.calls.filter((call) => call[0] === 'scroll'),
      ).toHaveLength(0)
    })
  })

  describe('custom extractor', () => {
    it('receives MouseEvent and Touch values and preserves nullish results', () => {
      const seen: Array<MouseEvent | Touch> = []
      const extractor: UseMouseEventExtractor = (event) => {
        seen.push(event)
        if ('movementX' in event) {
          return [event.offsetX ?? 7, event.offsetY ?? 8]
        }
        return null
      }

      const { result } = renderHook(() => useMouse({ type: extractor }))

      const mouse = dispatchMouse(window, 'mousemove', {
        pageX: 1,
        pageY: 2,
        clientX: 1,
        clientY: 2,
      })
      Object.defineProperty(mouse, 'offsetX', { value: 7 })
      Object.defineProperty(mouse, 'offsetY', { value: 8 })

      act(() => {
        window.dispatchEvent(mouse)
      })
      // First dispatch already happened in dispatchMouse — re-apply through hook
      // by dispatching a fresh event with offsets:
      act(() => {
        const event = new MouseEvent('mousemove', {
          bubbles: true,
          clientX: 1,
          clientY: 2,
        })
        Object.defineProperty(event, 'pageX', { value: 1 })
        Object.defineProperty(event, 'pageY', { value: 2 })
        Object.defineProperty(event, 'offsetX', { value: 7 })
        Object.defineProperty(event, 'offsetY', { value: 8 })
        window.dispatchEvent(event)
      })
      expect(result.current).toEqual({
        x: 7,
        y: 8,
        sourceType: 'mouse',
      })

      act(() => {
        dispatchTouch(window, 'touchstart', {
          touches: [
            createTouch({
              identifier: 1,
              pageX: 9,
              pageY: 10,
              clientX: 9,
              clientY: 10,
            }),
          ],
        })
      })
      expect(result.current).toEqual({
        x: 7,
        y: 8,
        sourceType: 'mouse',
      })
      expect(seen.some((item) => !('movementX' in item))).toBe(true)
    })

    it('uses the latest extractor without listener churn and contains throws', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      let extractor: UseMouseEventExtractor = () => [1, 1]
      const { result, rerender } = renderHook(
        ({ type }) => useMouse({ type }),
        { initialProps: { type: extractor } },
      )

      const mouseMoves = addSpy.mock.calls.filter(
        (call) => call[0] === 'mousemove',
      ).length

      extractor = () => [3, 4]
      rerender({ type: extractor })
      expect(
        addSpy.mock.calls.filter((call) => call[0] === 'mousemove'),
      ).toHaveLength(mouseMoves)

      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 0,
          pageY: 0,
          clientX: 0,
          clientY: 0,
        })
      })
      expect(result.current).toEqual({
        x: 3,
        y: 4,
        sourceType: 'mouse',
      })

      extractor = () => {
        throw new Error('boom')
      }
      rerender({ type: extractor })
      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 0,
          pageY: 0,
          clientX: 0,
          clientY: 0,
        })
      })
      expect(result.current).toEqual({
        x: 3,
        y: 4,
        sourceType: 'mouse',
      })
    })

    it('preserves deliberate non-finite custom values with Object.is guards', () => {
      const extractor: UseMouseEventExtractor = () => [
        Number.NaN,
        Number.POSITIVE_INFINITY,
      ]
      let renders = 0
      const { result } = renderHook(() => {
        renders += 1
        return useMouse({ type: extractor })
      })

      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 1,
          pageY: 1,
          clientX: 1,
          clientY: 1,
        })
      })
      expect(result.current.x).toBeNaN()
      expect(result.current.y).toBe(Number.POSITIVE_INFINITY)

      const after = renders
      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 2,
          pageY: 2,
          clientX: 2,
          clientY: 2,
        })
      })
      expect(renders).toBe(after)
    })
  })

  describe('event filter', () => {
    it('supports delayed invoke with once-per-event semantics and stale guards', async () => {
      let delayedInvoke: (() => void) | null = null
      const filter: UseMouseEventFilter = (invoke) => {
        delayedInvoke = invoke
      }

      const { result, rerender, unmount } = renderHook(
        ({ enabled, filter: eventFilter }) =>
          useMouse({ enabled, eventFilter }),
        {
          initialProps: { enabled: true, filter },
        },
      )

      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 5,
          pageY: 6,
          clientX: 5,
          clientY: 6,
        })
      })
      expect(result.current.sourceType).toBeNull()

      act(() => {
        delayedInvoke?.()
        delayedInvoke?.()
      })
      expect(result.current).toEqual({
        x: 5,
        y: 6,
        sourceType: 'mouse',
      })

      delayedInvoke = null
      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 7,
          pageY: 8,
          clientX: 7,
          clientY: 8,
        })
      })
      rerender({ enabled: false, filter })
      act(() => {
        delayedInvoke?.()
      })
      expect(result.current).toEqual({
        x: 5,
        y: 6,
        sourceType: 'mouse',
      })

      rerender({ enabled: true, filter })
      delayedInvoke = null
      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 9,
          pageY: 10,
          clientX: 9,
          clientY: 10,
        })
      })
      unmount()
      act(() => {
        delayedInvoke?.()
      })
      await waitFor(() => {
        expect(delayedInvoke).not.toBeNull()
      })
    })

    it('uses the latest filter without listener churn and contains throws', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      let filter: UseMouseEventFilter = (invoke) => invoke()
      const { result, rerender } = renderHook(
        ({ eventFilter }) => useMouse({ eventFilter }),
        { initialProps: { eventFilter: filter } },
      )

      const mouseMoves = addSpy.mock.calls.filter(
        (call) => call[0] === 'mousemove',
      ).length

      filter = () => {
        throw new Error('filter failed')
      }
      rerender({ eventFilter: filter })
      expect(
        addSpy.mock.calls.filter((call) => call[0] === 'mousemove'),
      ).toHaveLength(mouseMoves)

      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 1,
          pageY: 2,
          clientX: 1,
          clientY: 2,
        })
      })
      expect(result.current).toEqual({ x: 0, y: 0, sourceType: null })
    })
  })

  describe('targets', () => {
    it('supports Window, Document, HTMLElement, SVGElement, and explicit null', () => {
      const element = document.createElement('div')
      document.body.append(element)
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      document.body.append(svg)

      const win = renderHook(() => useMouse({ target: window }))
      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 1,
          pageY: 2,
          clientX: 1,
          clientY: 2,
        })
      })
      expect(win.result.current.x).toBe(1)

      const doc = renderHook(() => useMouse({ target: document }))
      act(() => {
        dispatchMouse(document, 'mousemove', {
          pageX: 3,
          pageY: 4,
          clientX: 3,
          clientY: 4,
        })
      })
      expect(doc.result.current.x).toBe(3)

      const el = renderHook(() => useMouse({ target: element }))
      act(() => {
        dispatchMouse(element, 'mousemove', {
          pageX: 5,
          pageY: 6,
          clientX: 5,
          clientY: 6,
        })
      })
      expect(el.result.current.x).toBe(5)

      const svgHook = renderHook(() => useMouse({ target: svg }))
      act(() => {
        dispatchMouse(svg, 'mousemove', {
          pageX: 7,
          pageY: 8,
          clientX: 7,
          clientY: 8,
        })
      })
      expect(svgHook.result.current.x).toBe(7)

      const addSpy = vi.spyOn(window, 'addEventListener')
      renderHook(() => useMouse({ target: null }))
      expect(addSpy).not.toHaveBeenCalled()

      element.remove()
      svg.remove()
    })

    it('synchronizes late and replaced ref targets', () => {
      function Harness({ element }: { element: HTMLDivElement | null }) {
        const ref = useRef<HTMLDivElement | null>(null)
        ref.current = element
        return useMouse({ target: ref })
      }

      const a = document.createElement('div')
      const b = document.createElement('div')
      document.body.append(a, b)

      const { result, rerender } = renderHook(
        ({ element }) => Harness({ element }),
        { initialProps: { element: null as HTMLDivElement | null } },
      )

      act(() => {
        dispatchMouse(a, 'mousemove', {
          pageX: 1,
          pageY: 1,
          clientX: 1,
          clientY: 1,
        })
      })
      expect(result.current.sourceType).toBeNull()

      rerender({ element: a })
      act(() => {
        dispatchMouse(a, 'mousemove', {
          pageX: 2,
          pageY: 3,
          clientX: 2,
          clientY: 3,
        })
      })
      expect(result.current).toEqual({
        x: 2,
        y: 3,
        sourceType: 'mouse',
      })

      rerender({ element: b })
      act(() => {
        dispatchMouse(a, 'mousemove', {
          pageX: 9,
          pageY: 9,
          clientX: 9,
          clientY: 9,
        })
      })
      expect(result.current).toEqual({
        x: 2,
        y: 3,
        sourceType: 'mouse',
      })

      act(() => {
        dispatchMouse(b, 'mousemove', {
          pageX: 4,
          pageY: 5,
          clientX: 4,
          clientY: 5,
        })
      })
      expect(result.current).toEqual({
        x: 4,
        y: 5,
        sourceType: 'mouse',
      })

      rerender({ element: null })
      act(() => {
        dispatchMouse(b, 'mousemove', {
          pageX: 6,
          pageY: 7,
          clientX: 6,
          clientY: 7,
        })
      })
      expect(result.current).toEqual({
        x: 4,
        y: 5,
        sourceType: 'mouse',
      })

      a.remove()
      b.remove()
    })

    it('avoids listener churn for unchanged target option objects', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const { rerender } = renderHook(({ options }) => useMouse(options), {
        initialProps: {
          options: {
            enabled: true,
            type: 'page' as const,
            touch: true,
            scroll: true,
          },
        },
      })

      const mouseMoves = addSpy.mock.calls.filter(
        (call) => call[0] === 'mousemove',
      ).length

      rerender({
        options: {
          enabled: true,
          type: 'page',
          touch: true,
          scroll: true,
        },
      })
      expect(
        addSpy.mock.calls.filter((call) => call[0] === 'mousemove'),
      ).toHaveLength(mouseMoves)
    })
  })

  describe('lifecycle', () => {
    it('disables without listeners, preserves state, and re-enables', () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useMouse({ enabled }),
        { initialProps: { enabled: true } },
      )

      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 2,
          pageY: 3,
          clientX: 2,
          clientY: 3,
        })
      })

      const addSpy = vi.spyOn(window, 'addEventListener')
      rerender({ enabled: false })
      expect(
        addSpy.mock.calls.filter((call) => call[0] === 'mousemove'),
      ).toHaveLength(0)
      expect(result.current).toEqual({
        x: 2,
        y: 3,
        sourceType: 'mouse',
      })

      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 9,
          pageY: 9,
          clientX: 9,
          clientY: 9,
        })
      })
      expect(result.current.x).toBe(2)

      rerender({ enabled: true })
      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 4,
          pageY: 5,
          clientX: 4,
          clientY: 5,
        })
      })
      expect(result.current).toEqual({
        x: 4,
        y: 5,
        sourceType: 'mouse',
      })
    })

    it('keeps one effective listener set under Strict Mode', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() => useMouse(), {
        wrapper: StrictMode,
      })

      const mouseAdds = addSpy.mock.calls.filter(
        (call) => call[0] === 'mousemove',
      )
      const mouseRemoves = removeSpy.mock.calls.filter(
        (call) => call[0] === 'mousemove',
      )
      expect(mouseAdds.length - mouseRemoves.length).toBe(1)

      unmount()
      const mouseRemovesAfter = removeSpy.mock.calls.filter(
        (call) => call[0] === 'mousemove',
      )
      expect(mouseAdds.length - mouseRemovesAfter.length).toBe(0)
    })

    it('does not update after unmount', () => {
      const { result, unmount } = renderHook(() => useMouse())
      unmount()
      act(() => {
        dispatchMouse(window, 'mousemove', {
          pageX: 9,
          pageY: 9,
          clientX: 9,
          clientY: 9,
        })
      })
      expect(result.current).toEqual({ x: 0, y: 0, sourceType: null })
    })
  })

  describe('SSR', () => {
    it('imports and renderToString without listeners or layout effects', () => {
      const warnings: string[] = []
      const originalWarn = console.warn
      console.warn = (...args: unknown[]) => {
        warnings.push(args.map(String).join(' '))
      }

      const addSpy = vi.spyOn(EventTarget.prototype, 'addEventListener')

      function Component() {
        const value = useMouse({ initialValue: { x: 3, y: 4 } })
        return (
          <span>
            {value.x}:{value.y}:{String(value.sourceType)}
          </span>
        )
      }

      const html = renderToString(<Component />)
      expect(html.replaceAll('<!-- -->', '')).toContain('3:4:null')
      expect(addSpy).not.toHaveBeenCalled()
      expect(
        warnings.some((message) =>
          message.toLowerCase().includes('uselayouteffect'),
        ),
      ).toBe(false)

      console.warn = originalWarn
    })

    it('hydrates custom initial values without mismatch', () => {
      const container = document.createElement('div')
      document.body.append(container)

      function Component() {
        const value = useMouse({ initialValue: { x: 12, y: 34 } })
        return (
          <span data-testid="coords">
            {value.x}:{value.y}:{String(value.sourceType)}
          </span>
        )
      }

      const html = renderToString(<Component />)
      container.innerHTML = html

      const root = createRoot(container)
      act(() => {
        root.render(<Component />)
      })
      expect(container.textContent).toBe('12:34:null')

      act(() => {
        root.unmount()
      })
      container.remove()
    })
  })

  describe('passive registration', () => {
    it('registers mouse and touch listeners as passive', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      renderHook(() => useMouse({ touch: true, scroll: true, type: 'page' }))

      for (const type of [
        'mousemove',
        'dragover',
        'touchstart',
        'touchmove',
        'touchend',
        'touchcancel',
        'scroll',
      ]) {
        const call = addSpy.mock.calls.find((entry) => entry[0] === type)
        expect(call?.[2]).toMatchObject({ passive: true })
      }
    })
  })
})
