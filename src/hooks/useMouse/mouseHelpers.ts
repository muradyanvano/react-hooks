import type { RefObject } from 'react'

export type UseMouseCoordinateType = 'page' | 'client' | 'screen' | 'movement'

export type UseMouseSourceType = 'mouse' | 'touch' | null

export type UseMouseTarget = Window | Document | HTMLElement | SVGElement

export interface UseMousePosition {
  x: number
  y: number
}

export type UseMouseEventExtractor = (
  event: MouseEvent | Touch,
) => readonly [x: number, y: number] | null | undefined

export type UseMouseEventFilter = (
  invoke: () => void,
  event: MouseEvent | TouchEvent,
) => void

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

export function isUseMouseTarget(value: unknown): value is UseMouseTarget {
  return isWindowLike(value) || isDocumentLike(value) || isElementLike(value)
}

export function isTargetRefObject(
  value: object,
): value is RefObject<UseMouseTarget | null> {
  return 'current' in value && !isEventTargetLike(value)
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
    typeof candidate.clientY === 'number' &&
    typeof candidate.pageX === 'number' &&
    typeof candidate.pageY === 'number'
  )
}

export function resolveOwningWindow(target: UseMouseTarget): Window | null {
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

export function getScrollOffsets(win: Window): {
  scrollX: number
  scrollY: number
} {
  const scrollX =
    typeof win.scrollX === 'number'
      ? win.scrollX
      : typeof win.pageXOffset === 'number'
        ? win.pageXOffset
        : 0
  const scrollY =
    typeof win.scrollY === 'number'
      ? win.scrollY
      : typeof win.pageYOffset === 'number'
        ? win.pageYOffset
        : 0

  return { scrollX, scrollY }
}

function touchAt(list: TouchList, index: number): Touch | null {
  if (typeof list.item === 'function') {
    return list.item(index) ?? list[index] ?? null
  }

  return list[index] ?? null
}

export function selectTouch(event: TouchEvent): Touch | null {
  if (event.touches.length > 0) {
    return touchAt(event.touches, 0)
  }

  if (event.changedTouches.length > 0) {
    return touchAt(event.changedTouches, 0)
  }

  return null
}

export function readBuiltInCoordinates(
  type: UseMouseCoordinateType,
  source: MouseEvent | Touch,
): readonly [number, number] | null {
  if (type === 'page') {
    return [source.pageX, source.pageY]
  }

  if (type === 'client') {
    return [source.clientX, source.clientY]
  }

  if (type === 'screen') {
    return [source.screenX, source.screenY]
  }

  // movement — Touch has no meaningful movement deltas
  if (!('movementX' in source) || !('movementY' in source)) {
    return null
  }

  const mouse = source as MouseEvent
  return [mouse.movementX, mouse.movementY]
}

export function readClientCoordinates(
  source: MouseEvent | Touch,
): readonly [number, number] {
  return [source.clientX, source.clientY]
}

export function copyPosition(
  value: UseMousePosition | undefined,
): UseMousePosition {
  return {
    x: value?.x ?? 0,
    y: value?.y ?? 0,
  }
}

export function positionsEqual(
  left: { x: number; y: number; sourceType: UseMouseSourceType },
  right: { x: number; y: number; sourceType: UseMouseSourceType },
): boolean {
  return (
    Object.is(left.x, right.x) &&
    Object.is(left.y, right.y) &&
    Object.is(left.sourceType, right.sourceType)
  )
}

export function isBuiltInCoordinateType(
  value: unknown,
): value is UseMouseCoordinateType {
  return (
    value === 'page' ||
    value === 'client' ||
    value === 'screen' ||
    value === 'movement'
  )
}

export function defaultEventFilter(
  invoke: () => void,
  event: MouseEvent | TouchEvent,
): void {
  void event
  invoke()
}
