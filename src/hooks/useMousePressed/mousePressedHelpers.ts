import type { RefObject } from 'react'

import type { UseMouseSourceType } from '../useMouse/useMouse'

export type UseMousePressedTarget = Window | Document | HTMLElement | SVGElement

export type UseMousePressedEvent = MouseEvent | TouchEvent | DragEvent

export type UseMousePressedHandler = (event: UseMousePressedEvent) => void

export interface PressedState {
  pressed: boolean
  sourceType: UseMouseSourceType
}

export function isEventTargetLike(value: unknown): value is EventTarget {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as EventTarget).addEventListener === 'function' &&
    typeof (value as EventTarget).removeEventListener === 'function'
  )
}

export function isWindowLike(value: unknown): value is Window {
  const candidate = value as {
    addEventListener?: unknown
    document?: unknown
    window?: unknown
  }
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof candidate.addEventListener === 'function' &&
    typeof candidate.document === 'object' &&
    candidate.document != null &&
    candidate.window === value
  )
}

export function isDocumentLike(value: unknown): value is Document {
  const candidate = value as { nodeType?: unknown }
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof candidate.nodeType === 'number' &&
    candidate.nodeType === 9
  )
}

export function isElementLike(
  value: unknown,
): value is HTMLElement | SVGElement {
  const candidate = value as { nodeType?: unknown }
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof candidate.nodeType === 'number' &&
    candidate.nodeType === 1
  )
}

export function isUseMousePressedTarget(
  value: unknown,
): value is UseMousePressedTarget {
  return isWindowLike(value) || isDocumentLike(value) || isElementLike(value)
}

export function isTargetRefObject(
  value: object,
): value is RefObject<UseMousePressedTarget | null> {
  return 'current' in value && !isEventTargetLike(value)
}

export function resolveOwningWindow(
  target: UseMousePressedTarget,
): Window | null {
  if (isWindowLike(target)) {
    return target
  }

  if (isDocumentLike(target)) {
    return target.defaultView
  }

  return target.ownerDocument?.defaultView ?? null
}

export function resolveDefaultWindow(): Window | null {
  return typeof window !== 'undefined' && isWindowLike(window) ? window : null
}

export function isTouchEventLike(event: Event): event is TouchEvent {
  return (
    'touches' in event &&
    typeof (event as TouchEvent).touches === 'object' &&
    (event as TouchEvent).touches != null
  )
}

export function isMouseEventLike(event: Event): event is MouseEvent {
  if (isTouchEventLike(event)) {
    return false
  }

  const candidate = event as MouseEvent
  return (
    typeof candidate.clientX === 'number' &&
    typeof candidate.clientY === 'number'
  )
}

export function isDragEventLike(event: Event): event is DragEvent {
  return (
    typeof (event as DragEvent).dataTransfer === 'object' ||
    event.type === 'dragstart' ||
    event.type === 'dragend' ||
    event.type === 'drop'
  )
}

export function pressedStatesEqual(
  left: PressedState,
  right: PressedState,
): boolean {
  return (
    left.pressed === right.pressed &&
    Object.is(left.sourceType, right.sourceType)
  )
}

export function hasRemainingTouches(event: TouchEvent): boolean {
  const touches = event.touches
  if (touches == null || typeof touches.length !== 'number') {
    return false
  }

  return touches.length > 0
}

export function classifyPressSource(
  event: UseMousePressedEvent,
): ActivePressSource {
  if (isTouchEventLike(event)) {
    return 'touch'
  }

  return 'mouse'
}

export type ActivePressSource = Exclude<UseMouseSourceType, null>
