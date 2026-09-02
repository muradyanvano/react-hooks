import { StrictMode, useRef } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'

import { useMousePressed } from './useMousePressed'

function createTouchList(touches: Touch[]): TouchList {
  const list: Record<string | number, unknown> = {
    ...touches,
    length: touches.length,
    item: (index: number) => touches[index] ?? null,
  }
  return list as unknown as TouchList
}

function createTouch(partial: { identifier: number }): Touch {
  return {
    identifier: partial.identifier,
    target: document.body,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    screenX: 0,
    screenY: 0,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 0,
  }
}

function dispatchMouse(
  target: EventTarget,
  type: 'mousedown' | 'mouseup' | 'mouseleave' | 'click',
) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

function dispatchTouch(
  target: EventTarget,
  type: 'touchstart' | 'touchend' | 'touchcancel',
  options: { touches?: Touch[]; changedTouches?: Touch[] },
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
  target.dispatchEvent(event)
  return event as TouchEvent
}

function dispatchDrag(
  target: EventTarget,
  type: 'dragstart' | 'dragend' | 'drop',
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    configurable: true,
    value: { dropEffect: 'none', effectAllowed: 'all' },
  })
  target.dispatchEvent(event)
  return event as DragEvent
}

describe('useMousePressed', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('defaults to false with null source', () => {
      const { result } = renderHook(() => useMousePressed())
      expect(result.current).toEqual({ pressed: false, sourceType: null })
    })

    it('uses initial true with null source', () => {
      const { result } = renderHook(() =>
        useMousePressed({ initialValue: true }),
      )
      expect(result.current).toEqual({ pressed: true, sourceType: null })
    })

    it('does not reset when initialValue changes after mount', () => {
      const { result, rerender } = renderHook(
        ({ initialValue }) => useMousePressed({ initialValue }),
        { initialProps: { initialValue: false } },
      )

      act(() => {
        dispatchMouse(window, 'mousedown')
      })
      expect(result.current.pressed).toBe(true)

      rerender({ initialValue: true })
      expect(result.current.pressed).toBe(true)
    })
  })

  describe('mouse lifecycle', () => {
    it('presses on mousedown and releases on mouseup outside target', () => {
      const element = document.createElement('div')
      document.body.append(element)

      const { result } = renderHook(() => useMousePressed({ target: element }))

      act(() => {
        dispatchMouse(element, 'mousedown')
      })
      expect(result.current).toEqual({
        pressed: true,
        sourceType: 'mouse',
      })

      act(() => {
        dispatchMouse(document.body, 'mouseup')
      })
      expect(result.current).toEqual({
        pressed: false,
        sourceType: null,
      })

      element.remove()
    })

    it('releases on window mouseleave while pressed', () => {
      const { result } = renderHook(() => useMousePressed())

      act(() => {
        dispatchMouse(window, 'mousedown')
      })
      expect(result.current.pressed).toBe(true)

      act(() => {
        dispatchMouse(window, 'mouseleave')
      })
      expect(result.current.pressed).toBe(false)
    })

    it('ignores mouseup while idle and duplicate mousedown', () => {
      const onPressed = vi.fn()
      const { result } = renderHook(() => useMousePressed({ onPressed }))

      act(() => {
        dispatchMouse(window, 'mouseup')
      })
      expect(result.current.pressed).toBe(false)
      expect(onPressed).not.toHaveBeenCalled()

      act(() => {
        dispatchMouse(window, 'mousedown')
      })
      expect(onPressed).toHaveBeenCalledTimes(1)

      act(() => {
        dispatchMouse(window, 'mousedown')
      })
      expect(onPressed).toHaveBeenCalledTimes(1)
    })

    it('does not respond to click alone', () => {
      const { result } = renderHook(() => useMousePressed())
      act(() => {
        dispatchMouse(window, 'click')
      })
      expect(result.current.pressed).toBe(false)
    })
  })

  describe('touch lifecycle', () => {
    it('presses on touchstart and releases on final touchend', () => {
      const element = document.createElement('div')
      document.body.append(element)
      const touch = createTouch({ identifier: 1 })

      const { result } = renderHook(() => useMousePressed({ target: element }))

      act(() => {
        dispatchTouch(element, 'touchstart', { touches: [touch] })
      })
      expect(result.current).toEqual({
        pressed: true,
        sourceType: 'touch',
      })

      act(() => {
        dispatchTouch(window, 'touchend', {
          touches: [],
          changedTouches: [touch],
        })
      })
      expect(result.current).toEqual({
        pressed: false,
        sourceType: null,
      })

      element.remove()
    })

    it('stays pressed while other touches remain', () => {
      const first = createTouch({ identifier: 1 })
      const second = createTouch({ identifier: 2 })
      const { result } = renderHook(() => useMousePressed())

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
        pressed: true,
        sourceType: 'touch',
      })
    })

    it('registers no touch listeners when touch is false', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      renderHook(() => useMousePressed({ touch: false }))

      const touchTypes = addSpy.mock.calls
        .map((call) => call[0])
        .filter((type) => String(type).startsWith('touch'))
      expect(touchTypes).toEqual([])
    })

    it('resets without callback when touch is disabled during active touch', () => {
      const onReleased = vi.fn()
      const { result, rerender } = renderHook(
        ({ touch }) => useMousePressed({ touch, onReleased }),
        { initialProps: { touch: true } },
      )

      act(() => {
        dispatchTouch(window, 'touchstart', {
          touches: [createTouch({ identifier: 1 })],
        })
      })
      expect(result.current.pressed).toBe(true)

      rerender({ touch: false })
      expect(result.current.pressed).toBe(false)
      expect(onReleased).not.toHaveBeenCalled()
    })
  })

  describe('drag lifecycle', () => {
    it('presses on dragstart and releases on drop', () => {
      const element = document.createElement('div')
      document.body.append(element)

      const { result } = renderHook(() => useMousePressed({ target: element }))

      act(() => {
        dispatchDrag(element, 'dragstart')
      })
      expect(result.current).toEqual({
        pressed: true,
        sourceType: 'mouse',
      })

      act(() => {
        dispatchDrag(window, 'drop')
      })
      expect(result.current).toEqual({
        pressed: false,
        sourceType: null,
      })

      element.remove()
    })

    it('creates one press transition for mousedown followed by dragstart', () => {
      const onPressed = vi.fn()
      const element = document.createElement('div')
      document.body.append(element)

      renderHook(() => useMousePressed({ target: element, onPressed }))

      act(() => {
        dispatchMouse(element, 'mousedown')
        dispatchDrag(element, 'dragstart')
      })
      expect(onPressed).toHaveBeenCalledTimes(1)

      element.remove()
    })

    it('resets without callback when drag is disabled during active drag', () => {
      const onReleased = vi.fn()
      const element = document.createElement('div')
      document.body.append(element)

      const { result, rerender } = renderHook(
        ({ drag }) => useMousePressed({ target: element, drag, onReleased }),
        { initialProps: { drag: true } },
      )

      act(() => {
        dispatchDrag(element, 'dragstart')
      })
      expect(result.current.pressed).toBe(true)

      rerender({ drag: false })
      expect(result.current.pressed).toBe(false)
      expect(onReleased).not.toHaveBeenCalled()

      element.remove()
    })
  })

  describe('callbacks', () => {
    it('invokes transition callbacks with original events', () => {
      const onPressed = vi.fn()
      const onReleased = vi.fn()
      const element = document.createElement('div')
      document.body.append(element)

      renderHook(() =>
        useMousePressed({
          target: element,
          onPressed,
          onReleased,
        }),
      )

      act(() => {
        dispatchMouse(element, 'mousedown')
      })
      expect(onPressed.mock.calls[0]?.[0]).toBeInstanceOf(MouseEvent)

      act(() => {
        dispatchMouse(window, 'mouseup')
      })
      expect(onReleased.mock.calls[0]?.[0]).toBeInstanceOf(MouseEvent)

      element.remove()
    })

    it('uses latest callbacks without listener churn', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      let onPressed = vi.fn()
      const { rerender } = renderHook(
        ({ handler }) => useMousePressed({ onPressed: handler }),
        { initialProps: { handler: onPressed } },
      )

      const mousedownAdds = addSpy.mock.calls.filter(
        (call) => call[0] === 'mousedown',
      ).length

      onPressed = vi.fn()
      rerender({ handler: onPressed })
      expect(
        addSpy.mock.calls.filter((call) => call[0] === 'mousedown'),
      ).toHaveLength(mousedownAdds)

      act(() => {
        dispatchMouse(window, 'mousedown')
      })
      expect(onPressed).toHaveBeenCalledTimes(1)
    })

    it('does not invoke callbacks for administrative disable reset', () => {
      const onReleased = vi.fn()
      const { rerender } = renderHook(
        ({ enabled }) => useMousePressed({ enabled, onReleased }),
        { initialProps: { enabled: true } },
      )

      act(() => {
        dispatchMouse(window, 'mousedown')
      })

      rerender({ enabled: false })
      expect(onReleased).not.toHaveBeenCalled()
    })

    it('cleans up release listeners when press callback throws', () => {
      const onPressed = vi.fn(() => {
        throw new Error('boom')
      })
      const onReleased = vi.fn()
      const { result } = renderHook(() =>
        useMousePressed({ onPressed, onReleased }),
      )

      act(() => {
        dispatchMouse(window, 'mousedown')
      })
      expect(result.current.pressed).toBe(true)

      act(() => {
        dispatchMouse(window, 'mouseup')
      })
      expect(result.current.pressed).toBe(false)
      expect(onReleased).toHaveBeenCalledTimes(1)
    })
  })

  describe('targets and enabled lifecycle', () => {
    it('supports explicit null target without listeners', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      renderHook(() => useMousePressed({ target: null }))
      expect(addSpy).not.toHaveBeenCalled()
    })

    it('resets on target replacement without onReleased', () => {
      const onReleased = vi.fn()
      const a = document.createElement('div')
      const b = document.createElement('div')
      document.body.append(a, b)

      const { result, rerender } = renderHook(
        ({ target }) => useMousePressed({ target, onReleased }),
        { initialProps: { target: a as HTMLDivElement } },
      )

      act(() => {
        dispatchMouse(a, 'mousedown')
      })
      expect(result.current.pressed).toBe(true)

      rerender({ target: b })
      expect(result.current.pressed).toBe(false)
      expect(onReleased).not.toHaveBeenCalled()

      act(() => {
        dispatchMouse(a, 'mouseup')
      })
      expect(result.current.pressed).toBe(false)

      a.remove()
      b.remove()
    })

    it('syncs late ref attachment', () => {
      function Harness({ element }: { element: HTMLDivElement | null }) {
        const ref = useRef<HTMLDivElement | null>(null)
        ref.current = element
        return useMousePressed({ target: ref })
      }

      const element = document.createElement('div')
      document.body.append(element)

      const { result, rerender } = renderHook(
        ({ element: current }) => Harness({ element: current }),
        { initialProps: { element: null as HTMLDivElement | null } },
      )

      act(() => {
        dispatchMouse(element, 'mousedown')
      })
      expect(result.current.pressed).toBe(false)

      rerender({ element })
      act(() => {
        dispatchMouse(element, 'mousedown')
      })
      expect(result.current.pressed).toBe(true)

      element.remove()
    })
  })

  describe('capture', () => {
    it('registers listeners with capture true', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      renderHook(() => useMousePressed({ capture: true }))
      const mousedown = addSpy.mock.calls.find(
        (call) => call[0] === 'mousedown',
      )
      expect(mousedown?.[2]).toMatchObject({ capture: true })
    })
  })

  describe('Strict Mode and SSR', () => {
    it('keeps one effective mousedown listener under Strict Mode', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() => useMousePressed(), {
        wrapper: StrictMode,
      })

      const adds = addSpy.mock.calls.filter((call) => call[0] === 'mousedown')
      const removes = removeSpy.mock.calls.filter(
        (call) => call[0] === 'mousedown',
      )
      expect(adds.length - removes.length).toBe(1)

      unmount()
    })

    it('renderToString without listeners', () => {
      const addSpy = vi.spyOn(EventTarget.prototype, 'addEventListener')

      function Component() {
        const value = useMousePressed({ initialValue: true })
        return (
          <span>
            {String(value.pressed)}:{String(value.sourceType)}
          </span>
        )
      }

      const html = renderToString(<Component />)
      expect(html.replaceAll('<!-- -->', '')).toContain('true:null')
      expect(addSpy).not.toHaveBeenCalled()
    })
  })
})
