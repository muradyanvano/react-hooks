import { useEffect, useRef, useState, type RefObject } from 'react'

import {
  normalizeDelay,
  normalizeDistanceThreshold,
  updateMaxDistance,
} from './normalizeLongPressOptions'

export type UseOnLongPressDelay = number | ((event: PointerEvent) => number)

export interface UseOnLongPressReleaseDetails<T extends Element = Element> {
  element: T
  event: PointerEvent
  duration: number
  distance: number
  isLongPress: boolean
}

export type UseOnLongPressHandler = (event: PointerEvent) => void

export type UseOnLongPressReleaseHandler<T extends Element = Element> = (
  details: UseOnLongPressReleaseDetails<T>,
) => void

export interface UseOnLongPressOptions<T extends Element = Element> {
  enabled?: boolean
  delay?: UseOnLongPressDelay
  distanceThreshold?: number | false
  button?: number
  self?: boolean
  preventDefault?: boolean
  stopPropagation?: boolean
  capture?: boolean
  onRelease?: UseOnLongPressReleaseHandler<T>
}

const DEFAULT_ENABLED = true
const DEFAULT_BUTTON = 0
const DEFAULT_SELF = false
const DEFAULT_PREVENT_DEFAULT = false
const DEFAULT_STOP_PROPAGATION = false
const DEFAULT_CAPTURE = false

type TimerId = ReturnType<typeof setTimeout>

interface ActiveGesture<T extends Element> {
  element: T
  pointerId: number
  pointerDownEvent: PointerEvent
  startX: number
  startY: number
  startTime: number
  resolvedThreshold: number | false
  maxDistance: number
  timerId: TimerId | null
  isLongPressFired: boolean
  /** False after activation or movement cancellation; timer may still be cleared. */
  timerPending: boolean
  ownerDocument: Document
  onMove: (event: Event) => void
  onUp: (event: Event) => void
  onCancel: (event: Event) => void
  onBlur: () => void
}

function isElementLike(value: unknown): value is Element {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ownerDocument' in value &&
    typeof (value as Element).addEventListener === 'function' &&
    typeof (value as Element).removeEventListener === 'function'
  )
}

function getMonotonicNow(defaultView: Window | null): number {
  const performanceLike = defaultView?.performance ?? globalThis.performance
  if (performanceLike != null && typeof performanceLike.now === 'function') {
    return performanceLike.now()
  }

  return Date.now()
}

function getTimerFunctions(defaultView: Window | null): {
  setTimer: (handler: () => void, timeout: number) => TimerId
  clearTimer: (id: TimerId) => void
} {
  if (defaultView != null) {
    return {
      setTimer: (handler, timeout) =>
        defaultView.setTimeout(handler, timeout) as unknown as TimerId,
      clearTimer: (id) => {
        defaultView.clearTimeout(id as unknown as number)
      },
    }
  }

  return {
    setTimer: (handler, timeout) => setTimeout(handler, timeout),
    clearTimer: (id) => {
      clearTimeout(id)
    },
  }
}

function detachTemporaryListeners<T extends Element>(
  gesture: ActiveGesture<T>,
): void {
  const defaultView = gesture.ownerDocument.defaultView
  const { clearTimer } = getTimerFunctions(defaultView)

  if (gesture.timerId != null) {
    clearTimer(gesture.timerId)
    gesture.timerId = null
  }

  gesture.ownerDocument.removeEventListener('pointermove', gesture.onMove)
  gesture.ownerDocument.removeEventListener('pointerup', gesture.onUp)
  gesture.ownerDocument.removeEventListener('pointercancel', gesture.onCancel)

  if (defaultView != null) {
    defaultView.removeEventListener('blur', gesture.onBlur)
  }
}

/**
 * Invokes a handler after a sustained pointer press on the referenced element.
 *
 * Uses Pointer Events only. Imperative changes to `ref.current` require a later
 * React commit before the hook can synchronize the target.
 */
export function useOnLongPress<T extends Element>(
  ref: RefObject<T | null>,
  handler: UseOnLongPressHandler,
  options?: UseOnLongPressOptions<T>,
): void {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const capture = options?.capture ?? DEFAULT_CAPTURE

  const handlerRef = useRef(handler)
  const onReleaseRef = useRef(options?.onRelease)
  const optionsRef = useRef({
    delay: options?.delay,
    distanceThreshold: options?.distanceThreshold,
    button: options?.button ?? DEFAULT_BUTTON,
    self: options?.self ?? DEFAULT_SELF,
    preventDefault: options?.preventDefault ?? DEFAULT_PREVENT_DEFAULT,
    stopPropagation: options?.stopPropagation ?? DEFAULT_STOP_PROPAGATION,
  })

  useEffect(() => {
    handlerRef.current = handler
    onReleaseRef.current = options?.onRelease
    optionsRef.current = {
      delay: options?.delay,
      distanceThreshold: options?.distanceThreshold,
      button: options?.button ?? DEFAULT_BUTTON,
      self: options?.self ?? DEFAULT_SELF,
      preventDefault: options?.preventDefault ?? DEFAULT_PREVENT_DEFAULT,
      stopPropagation: options?.stopPropagation ?? DEFAULT_STOP_PROPAGATION,
    }
  })

  const gestureRef = useRef<ActiveGesture<T> | null>(null)
  const [refTarget, setRefTarget] = useState<T | null>(null)

  /* eslint-disable react-hooks/exhaustive-deps -- re-run after every commit; Object.is guards loops */
  useEffect(() => {
    const current = ref.current
    const next = isElementLike(current) ? current : null
    setRefTarget((previous) => (Object.is(previous, next) ? previous : next))
  })
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const cancelGesture = () => {
      const gesture = gestureRef.current
      if (gesture == null) {
        return
      }

      detachTemporaryListeners(gesture)
      gestureRef.current = null
    }

    const finalizeRelease = (
      gesture: ActiveGesture<T>,
      event: PointerEvent,
    ) => {
      const defaultView = gesture.ownerDocument.defaultView

      gesture.maxDistance = updateMaxDistance(
        gesture.maxDistance,
        gesture.startX,
        gesture.startY,
        event.clientX,
        event.clientY,
      )

      const duration = Math.max(
        0,
        getMonotonicNow(defaultView) - gesture.startTime,
      )
      const releaseHandler = onReleaseRef.current
      const isLongPress = gesture.isLongPressFired
      const element = gesture.element

      detachTemporaryListeners(gesture)
      gestureRef.current = null

      releaseHandler?.({
        element,
        event,
        duration,
        distance: gesture.maxDistance,
        isLongPress,
      })
    }

    if (!enabled || refTarget == null) {
      return cancelGesture
    }

    const element = refTarget

    const onPointerDown = (event: Event) => {
      if (gestureRef.current != null) {
        return
      }

      const pointerEvent = event as PointerEvent
      const currentOptions = optionsRef.current

      if (pointerEvent.button !== currentOptions.button) {
        return
      }

      if (currentOptions.self && pointerEvent.target !== element) {
        return
      }

      if (currentOptions.preventDefault) {
        pointerEvent.preventDefault()
      }

      if (currentOptions.stopPropagation) {
        pointerEvent.stopPropagation()
      }

      const ownerDocument = element.ownerDocument
      const defaultView = ownerDocument.defaultView
      const { setTimer, clearTimer } = getTimerFunctions(defaultView)

      const resolvedDelay = normalizeDelay(currentOptions.delay, pointerEvent)
      const resolvedThreshold = normalizeDistanceThreshold(
        currentOptions.distanceThreshold,
      )

      const gesture = {
        element,
        pointerId: pointerEvent.pointerId,
        pointerDownEvent: pointerEvent,
        startX: pointerEvent.clientX,
        startY: pointerEvent.clientY,
        startTime: getMonotonicNow(defaultView),
        resolvedThreshold,
        maxDistance: 0,
        timerId: null as TimerId | null,
        isLongPressFired: false,
        timerPending: true,
        ownerDocument,
      } as ActiveGesture<T>

      gesture.onMove = (moveEvent: Event) => {
        const movePointer = moveEvent as PointerEvent
        if (movePointer.pointerId !== gesture.pointerId) {
          return
        }

        gesture.maxDistance = updateMaxDistance(
          gesture.maxDistance,
          gesture.startX,
          gesture.startY,
          movePointer.clientX,
          movePointer.clientY,
        )

        if (
          gesture.timerPending &&
          gesture.resolvedThreshold !== false &&
          gesture.maxDistance > gesture.resolvedThreshold
        ) {
          if (gesture.timerId != null) {
            clearTimer(gesture.timerId)
            gesture.timerId = null
          }
          gesture.timerPending = false
        }
      }

      gesture.onUp = (upEvent: Event) => {
        const upPointer = upEvent as PointerEvent
        if (upPointer.pointerId !== gesture.pointerId) {
          return
        }

        finalizeRelease(gesture, upPointer)
      }

      gesture.onCancel = (cancelEvent: Event) => {
        const cancelPointer = cancelEvent as PointerEvent
        if (cancelPointer.pointerId !== gesture.pointerId) {
          return
        }

        cancelGesture()
      }

      gesture.onBlur = () => {
        cancelGesture()
      }

      ownerDocument.addEventListener('pointermove', gesture.onMove)
      ownerDocument.addEventListener('pointerup', gesture.onUp)
      ownerDocument.addEventListener('pointercancel', gesture.onCancel)

      if (defaultView != null) {
        defaultView.addEventListener('blur', gesture.onBlur)
      }

      gestureRef.current = gesture

      gesture.timerId = setTimer(() => {
        gesture.timerId = null
        gesture.timerPending = false
        gesture.isLongPressFired = true
        handlerRef.current(gesture.pointerDownEvent)
      }, resolvedDelay)
    }

    element.addEventListener('pointerdown', onPointerDown, capture)

    return () => {
      cancelGesture()
      element.removeEventListener('pointerdown', onPointerDown, capture)
    }
  }, [enabled, refTarget, capture])
}
