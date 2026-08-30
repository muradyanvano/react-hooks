import { useEffect, useRef, type RefObject } from 'react'

export type UseOnClickOutsideEventType = 'pointerdown' | 'click'

export interface UseOnClickOutsideOptions {
  enabled?: boolean
  eventType?: UseOnClickOutsideEventType
  capture?: boolean
}

export type UseOnClickOutsideHandler = (
  event: PointerEvent | MouseEvent,
) => void

const DEFAULT_ENABLED = true
const DEFAULT_EVENT_TYPE: UseOnClickOutsideEventType = 'pointerdown'
const DEFAULT_CAPTURE = true

function isDomNode(value: EventTarget | null): value is Node {
  return value instanceof Node
}

function isEventInsideElement(
  event: Event,
  element: Element,
  target: Node,
): boolean {
  if (typeof event.composedPath === 'function') {
    const path = event.composedPath()
    if (path.length > 0) {
      return path.includes(element)
    }
  }

  return element.contains(target)
}

/**
 * Calls `handler` when a document-level pointer/click event happens outside
 * the element referenced by `ref`.
 */
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: UseOnClickOutsideHandler,
  options?: UseOnClickOutsideOptions,
): void {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const eventType = options?.eventType ?? DEFAULT_EVENT_TYPE
  const capture = options?.capture ?? DEFAULT_CAPTURE

  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    if (!enabled) {
      return
    }

    const onEvent = (event: Event) => {
      const element = ref.current
      if (element == null) {
        return
      }

      const { target } = event
      if (!isDomNode(target) || !target.isConnected) {
        return
      }

      if (isEventInsideElement(event, element, target)) {
        return
      }

      handlerRef.current(event as PointerEvent | MouseEvent)
    }

    document.addEventListener(eventType, onEvent, capture)

    return () => {
      document.removeEventListener(eventType, onEvent, capture)
    }
  }, [ref, enabled, eventType, capture])
}
