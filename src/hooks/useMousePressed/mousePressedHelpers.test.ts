import { describe, expect, it } from 'vitest'

import {
  classifyPressSource,
  hasRemainingTouches,
  isUseMousePressedTarget,
  pressedStatesEqual,
  resolveDefaultWindow,
  resolveOwningWindow,
} from './mousePressedHelpers'

function createTouchList(touches: Touch[]): TouchList {
  const list: Record<string | number, unknown> = {
    ...touches,
    length: touches.length,
    item: (index: number) => touches[index] ?? null,
  }
  return list as unknown as TouchList
}

describe('mousePressedHelpers', () => {
  it('detects targets and resolves owning windows', () => {
    expect(isUseMousePressedTarget(window)).toBe(true)
    expect(isUseMousePressedTarget(document)).toBe(true)
    expect(isUseMousePressedTarget(document.body)).toBe(true)
    expect(resolveOwningWindow(window)).toBe(window)
    expect(resolveOwningWindow(document.body)).toBe(window)
    expect(resolveDefaultWindow()).toBe(window)
  })

  it('compares pressed state and classifies sources', () => {
    expect(
      pressedStatesEqual(
        { pressed: true, sourceType: 'mouse' },
        { pressed: true, sourceType: 'mouse' },
      ),
    ).toBe(true)
    expect(
      pressedStatesEqual(
        { pressed: true, sourceType: 'mouse' },
        { pressed: true, sourceType: 'touch' },
      ),
    ).toBe(false)

    const mouse = new MouseEvent('mousedown')
    const touch = {
      touches: createTouchList([]),
      changedTouches: createTouchList([]),
    } as unknown as TouchEvent
    expect(classifyPressSource(mouse)).toBe('mouse')
    expect(classifyPressSource(touch)).toBe('touch')
  })

  it('detects remaining touches defensively', () => {
    const touchPoint = {
      identifier: 1,
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

    const remaining = {
      touches: createTouchList([touchPoint as Touch]),
      changedTouches: createTouchList([touchPoint as Touch]),
    } as unknown as TouchEvent
    expect(hasRemainingTouches(remaining)).toBe(true)

    const ended = {
      touches: createTouchList([]),
      changedTouches: createTouchList([touchPoint as Touch]),
    } as unknown as TouchEvent
    expect(hasRemainingTouches(ended)).toBe(false)

    const malformed = {
      touches: null,
    } as unknown as TouchEvent
    expect(hasRemainingTouches(malformed)).toBe(false)
  })
})
