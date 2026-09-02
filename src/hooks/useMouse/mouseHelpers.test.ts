import { describe, expect, it, vi } from 'vitest'

import {
  copyPosition,
  defaultEventFilter,
  getScrollOffsets,
  isBuiltInCoordinateType,
  isDocumentLike,
  isElementLike,
  isEventTargetLike,
  isMouseEventLike,
  isTargetRefObject,
  isTouchEventLike,
  isUseMouseTarget,
  isWindowLike,
  positionsEqual,
  readBuiltInCoordinates,
  readClientCoordinates,
  resolveDefaultWindow,
  resolveOwningWindow,
  selectTouch,
} from './mouseHelpers'

function createTouch(
  partial: Partial<Touch> & Pick<Touch, 'identifier'>,
): Touch {
  return {
    identifier: partial.identifier,
    target: partial.target ?? document.body,
    clientX: partial.clientX ?? 0,
    clientY: partial.clientY ?? 0,
    pageX: partial.pageX ?? 0,
    pageY: partial.pageY ?? 0,
    screenX: partial.screenX ?? 0,
    screenY: partial.screenY ?? 0,
    radiusX: partial.radiusX ?? 0,
    radiusY: partial.radiusY ?? 0,
    rotationAngle: partial.rotationAngle ?? 0,
    force: partial.force ?? 0,
  }
}

describe('mouseHelpers', () => {
  it('detects event targets, windows, documents, and elements', () => {
    expect(isEventTargetLike(window)).toBe(true)
    expect(isEventTargetLike(document)).toBe(true)
    expect(isEventTargetLike(document.body)).toBe(true)
    expect(isEventTargetLike(null)).toBe(false)
    expect(isEventTargetLike({})).toBe(false)

    expect(isWindowLike(window)).toBe(true)
    expect(isWindowLike(document)).toBe(false)

    expect(isDocumentLike(document)).toBe(true)
    expect(isDocumentLike(window)).toBe(false)

    expect(isElementLike(document.body)).toBe(true)
    expect(isElementLike(document)).toBe(false)

    expect(isUseMouseTarget(window)).toBe(true)
    expect(isUseMouseTarget(document)).toBe(true)
    expect(isUseMouseTarget(document.body)).toBe(true)
    expect(isUseMouseTarget({ current: null })).toBe(false)
  })

  it('detects target refs without treating event targets as refs', () => {
    expect(isTargetRefObject({ current: null })).toBe(true)
    expect(isTargetRefObject(window)).toBe(false)
    expect(isTargetRefObject(document.body)).toBe(false)
  })

  it('resolves owning windows and the default window', () => {
    expect(resolveOwningWindow(window)).toBe(window)
    expect(resolveOwningWindow(document)).toBe(window)
    expect(resolveOwningWindow(document.body)).toBe(window)
    expect(resolveDefaultWindow()).toBe(window)
  })

  it('reads scroll offsets with pageOffset fallbacks', () => {
    const host = {
      scrollX: 12,
      scrollY: 34,
      pageXOffset: 99,
      pageYOffset: 88,
    } as Window
    expect(getScrollOffsets(host)).toEqual({ scrollX: 12, scrollY: 34 })

    const fallback = {
      pageXOffset: 5,
      pageYOffset: 7,
    } as Window
    expect(getScrollOffsets(fallback)).toEqual({ scrollX: 5, scrollY: 7 })
  })

  it('selects the first active touch with changedTouches fallback', () => {
    const first = createTouch({ identifier: 1, clientX: 1 })
    const second = createTouch({ identifier: 2, clientX: 2 })
    const changed = createTouch({ identifier: 3, clientX: 3 })

    const withTouches = {
      touches: [first, second],
      changedTouches: [changed],
    } as unknown as TouchEvent
    expect(selectTouch(withTouches)).toBe(first)

    const emptyTouches = {
      touches: [],
      changedTouches: [changed],
    } as unknown as TouchEvent
    expect(selectTouch(emptyTouches)).toBe(changed)

    const empty = {
      touches: [],
      changedTouches: [],
    } as unknown as TouchEvent
    expect(selectTouch(empty)).toBeNull()
  })

  it('reads built-in and client coordinates', () => {
    const mouse = {
      pageX: 10,
      pageY: 20,
      clientX: 11,
      clientY: 21,
      screenX: 12,
      screenY: 22,
      movementX: 1,
      movementY: 2,
    } as MouseEvent

    expect(readBuiltInCoordinates('page', mouse)).toEqual([10, 20])
    expect(readBuiltInCoordinates('client', mouse)).toEqual([11, 21])
    expect(readBuiltInCoordinates('screen', mouse)).toEqual([12, 22])
    expect(readBuiltInCoordinates('movement', mouse)).toEqual([1, 2])
    expect(readClientCoordinates(mouse)).toEqual([11, 21])

    const touch = createTouch({
      identifier: 1,
      pageX: 30,
      pageY: 40,
      clientX: 31,
      clientY: 41,
      screenX: 32,
      screenY: 42,
    })
    expect(readBuiltInCoordinates('page', touch)).toEqual([30, 40])
    expect(readBuiltInCoordinates('movement', touch)).toBeNull()
  })

  it('classifies mouse and touch events by shape', () => {
    const mouse = new MouseEvent('mousemove', {
      clientX: 1,
      clientY: 2,
    })
    Object.defineProperty(mouse, 'pageX', { value: 1 })
    Object.defineProperty(mouse, 'pageY', { value: 2 })
    expect(isMouseEventLike(mouse)).toBe(true)

    const touchEvent = {
      touches: [],
      changedTouches: [],
      clientX: 1,
      clientY: 2,
      pageX: 1,
      pageY: 2,
    } as unknown as Event
    expect(isTouchEventLike(touchEvent)).toBe(true)
    expect(isMouseEventLike(touchEvent)).toBe(false)
  })

  it('copies positions without retaining the caller object', () => {
    const input = { x: 3, y: 4 }
    const copied = copyPosition(input)
    expect(copied).toEqual({ x: 3, y: 4 })
    expect(copied).not.toBe(input)

    expect(copyPosition(undefined)).toEqual({ x: 0, y: 0 })
  })

  it('compares positions with Object.is semantics', () => {
    expect(
      positionsEqual(
        { x: 1, y: 2, sourceType: 'mouse' },
        { x: 1, y: 2, sourceType: 'mouse' },
      ),
    ).toBe(true)
    expect(
      positionsEqual(
        { x: Number.NaN, y: 0, sourceType: null },
        { x: Number.NaN, y: 0, sourceType: null },
      ),
    ).toBe(true)
    expect(
      positionsEqual(
        { x: 1, y: 2, sourceType: 'mouse' },
        { x: 1, y: 2, sourceType: 'touch' },
      ),
    ).toBe(false)
  })

  it('recognizes built-in coordinate types and default filter', () => {
    expect(isBuiltInCoordinateType('page')).toBe(true)
    expect(isBuiltInCoordinateType('client')).toBe(true)
    expect(isBuiltInCoordinateType('screen')).toBe(true)
    expect(isBuiltInCoordinateType('movement')).toBe(true)
    expect(isBuiltInCoordinateType('offset')).toBe(false)

    const invoke = vi.fn()
    defaultEventFilter(invoke, new MouseEvent('mousemove'))
    expect(invoke).toHaveBeenCalledTimes(1)
  })
})
