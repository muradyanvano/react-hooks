import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import {
  getTimerFunctions,
  getTimerHost,
  normalizeHoverDelay,
  recordsIncludeTargetRemoval,
  type TimerId,
} from './elementHoverHelpers'

export interface UseElementHoverOptions {
  enabled?: boolean
  delayEnter?: number
  delayLeave?: number
  triggerOnRemoval?: boolean
}

const DEFAULT_ENABLED = true
const DEFAULT_DELAY_ENTER = 0
const DEFAULT_DELAY_LEAVE = 0
const DEFAULT_TRIGGER_ON_REMOVAL = false

type TargetListeners<T extends Element> = {
  element: T
  onEnter: () => void
  onLeave: () => void
}

/**
 * Tracks whether the mouse pointer is hovering over the element referenced by
 * `ref` using native `mouseenter` / `mouseleave` listeners on the target.
 *
 * Keyboard focus and touch presses do not affect the returned boolean. After
 * imperative `ref.current` assignment, a later React commit is required before
 * the hook can synchronize to the new target.
 */
export function useElementHover<T extends Element>(
  ref: RefObject<T | null>,
  options?: UseElementHoverOptions,
): boolean {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const delayEnter = options?.delayEnter ?? DEFAULT_DELAY_ENTER
  const delayLeave = options?.delayLeave ?? DEFAULT_DELAY_LEAVE
  const triggerOnRemoval =
    options?.triggerOnRemoval ?? DEFAULT_TRIGGER_ON_REMOVAL

  const [isHovered, setIsHovered] = useState(false)
  const [observedElement, setObservedElement] = useState<T | null>(null)

  const mountedRef = useRef(true)
  const isHoveredRef = useRef(false)
  const activeTargetRef = useRef<T | null>(null)
  const attachedElementRef = useRef<T | null>(null)
  const attachedListenersRef = useRef<TargetListeners<T> | null>(null)
  const transitionGenerationRef = useRef(0)
  const timerIdRef = useRef<TimerId | null>(null)
  const timerHostRef = useRef<Window | null>(null)

  const latestRef = useRef({
    enabled,
    delayEnter,
    delayLeave,
    triggerOnRemoval,
  })

  useEffect(() => {
    latestRef.current = {
      enabled,
      delayEnter,
      delayLeave,
      triggerOnRemoval,
    }
  })

  /* eslint-disable react-hooks/exhaustive-deps -- re-run after every commit; Object.is guards loops */
  useEffect(() => {
    const next = ref.current
    setObservedElement((previous) =>
      Object.is(previous, next) ? previous : next,
    )
  })
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const attachment = attachedListenersRef.current
      if (attachment != null) {
        attachment.element.removeEventListener('mouseenter', attachment.onEnter)
        attachment.element.removeEventListener('mouseleave', attachment.onLeave)
        attachedListenersRef.current = null
      }
      attachedElementRef.current = null
    }
  }, [])

  const setHovered = useCallback((value: boolean) => {
    if (!mountedRef.current) {
      return
    }

    isHoveredRef.current = value
    setIsHovered(value)
  }, [])

  const clearPendingTransition = useCallback(() => {
    const host = timerHostRef.current
    const timerId = timerIdRef.current

    if (timerId != null) {
      getTimerFunctions(host).clearTimer(timerId)
      timerIdRef.current = null
    }

    timerHostRef.current = null
    transitionGenerationRef.current += 1
  }, [])

  const resetHoverState = useCallback(() => {
    clearPendingTransition()
    setHovered(false)
  }, [clearPendingTransition, setHovered])

  const detachCurrentListeners = useCallback(() => {
    const attachment = attachedListenersRef.current
    if (attachment == null) {
      return
    }

    attachment.element.removeEventListener('mouseenter', attachment.onEnter)
    attachment.element.removeEventListener('mouseleave', attachment.onLeave)
    attachedListenersRef.current = null
    attachedElementRef.current = null
  }, [])

  const scheduleHoverTransition = useCallback(
    (target: T, nextHovered: boolean, delay: number): void => {
      clearPendingTransition()

      if (delay === 0) {
        setHovered(nextHovered)
        return
      }

      if (nextHovered && isHoveredRef.current) {
        return
      }

      if (!nextHovered && !isHoveredRef.current) {
        return
      }

      const generation = transitionGenerationRef.current
      const timerHost = getTimerHost(target)
      const { setTimer } = getTimerFunctions(timerHost)

      timerHostRef.current = timerHost
      timerIdRef.current = setTimer(() => {
        if (
          !mountedRef.current ||
          generation !== transitionGenerationRef.current ||
          activeTargetRef.current !== target ||
          !latestRef.current.enabled
        ) {
          return
        }

        timerIdRef.current = null
        timerHostRef.current = null
        setHovered(nextHovered)
      }, delay)
    },
    [clearPendingTransition, setHovered],
  )

  const beginLeaveTransition = useCallback(
    (target: T, delayLeaveSnapshot: number) => {
      if (!isHoveredRef.current) {
        clearPendingTransition()
        return
      }

      scheduleHoverTransition(target, false, delayLeaveSnapshot)
    },
    [clearPendingTransition, scheduleHoverTransition],
  )

  useEffect(() => {
    const nextElement = enabled ? ref.current : null
    const previousElement = attachedElementRef.current

    if (previousElement != null && previousElement !== nextElement) {
      detachCurrentListeners()
      clearPendingTransition()
      setHovered(false)
    }

    activeTargetRef.current = nextElement

    if (!enabled) {
      detachCurrentListeners()
      resetHoverState()
      return undefined
    }

    if (nextElement == null) {
      resetHoverState()
      return undefined
    }

    if (previousElement === nextElement) {
      return undefined
    }

    resetHoverState()

    const onMouseEnter = () => {
      if (
        activeTargetRef.current !== nextElement ||
        !latestRef.current.enabled
      ) {
        return
      }

      const delayEnterSnapshot = normalizeHoverDelay(
        latestRef.current.delayEnter,
      )

      clearPendingTransition()

      if (delayEnterSnapshot === 0) {
        setHovered(true)
        return
      }

      if (isHoveredRef.current) {
        return
      }

      scheduleHoverTransition(nextElement, true, delayEnterSnapshot)
    }

    const onMouseLeave = () => {
      if (
        activeTargetRef.current !== nextElement ||
        !latestRef.current.enabled
      ) {
        return
      }

      const delayLeaveSnapshot = normalizeHoverDelay(
        latestRef.current.delayLeave,
      )

      clearPendingTransition()
      beginLeaveTransition(nextElement, delayLeaveSnapshot)
    }

    nextElement.addEventListener('mouseenter', onMouseEnter)
    nextElement.addEventListener('mouseleave', onMouseLeave)
    attachedElementRef.current = nextElement
    attachedListenersRef.current = {
      element: nextElement,
      onEnter: onMouseEnter,
      onLeave: onMouseLeave,
    }

    return undefined
  })

  useEffect(() => {
    if (!enabled || !triggerOnRemoval) {
      return
    }

    const element = observedElement
    if (element == null || !element.isConnected) {
      return
    }

    const { ownerDocument } = element
    const view = ownerDocument.defaultView
    if (view == null || typeof view.MutationObserver !== 'function') {
      return
    }

    let completed = false

    const observer = new view.MutationObserver((records) => {
      if (
        completed ||
        activeTargetRef.current !== element ||
        !recordsIncludeTargetRemoval(records, element)
      ) {
        return
      }

      completed = true
      observer.disconnect()

      clearPendingTransition()

      const delayLeaveSnapshot = normalizeHoverDelay(
        latestRef.current.delayLeave,
      )

      beginLeaveTransition(element, delayLeaveSnapshot)
    })

    observer.observe(ownerDocument, {
      childList: true,
      subtree: true,
    })

    return () => {
      completed = true
      observer.disconnect()
    }
  }, [
    enabled,
    triggerOnRemoval,
    observedElement,
    clearPendingTransition,
    beginLeaveTransition,
  ])

  return isHovered
}
