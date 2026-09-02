import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import {
  buildScrollState,
  cancelCoalescedMeasure,
  containPlatformError,
  directionsEqual,
  IDLE_SCROLL_STATE,
  isBrowserEnvironment,
  isDocumentTarget,
  isScrollableElementTarget,
  isWindowTarget,
  normalizeIdle,
  normalizeListenerOptions,
  normalizeObserveOptions,
  normalizeOffset,
  normalizePositionNumber,
  normalizeScrollBehavior,
  normalizeThrottle,
  performScrollTo,
  readScrollMetrics,
  RESET_DIRECTIONS,
  resolveListenerTarget,
  resolveMutationObserveTarget,
  resolveMutationObserverConstructor,
  resolveOwningWindow,
  resolveRtlScrollMode,
  scheduleCoalescedMeasure,
  scrollStatesEqual,
  toAddEventListenerOptions,
  type NormalizedListenerOptions,
  type NormalizedOffset,
  type ScrollState,
  type UseScrollTarget,
} from './scrollHelpers'

export type { UseScrollTarget } from './scrollHelpers'

export interface UseScrollOffset {
  left?: number
  right?: number
  top?: number
  bottom?: number
}

export interface UseScrollObserveOptions {
  mutation?: boolean
}

export interface UseScrollArrivedState {
  left: boolean
  right: boolean
  top: boolean
  bottom: boolean
}

export interface UseScrollDirections {
  left: boolean
  right: boolean
  top: boolean
  bottom: boolean
}

export interface UseScrollPosition {
  x: number
  y: number
}

export type UseScrollHandler = (event: Event) => void

export type UseScrollErrorHandler = (error: unknown) => void

export interface UseScrollOptions {
  enabled?: boolean
  throttle?: number
  idle?: number
  offset?: UseScrollOffset
  observe?: boolean | UseScrollObserveOptions
  onScroll?: UseScrollHandler
  onStop?: UseScrollHandler
  onError?: UseScrollErrorHandler
  eventListenerOptions?: boolean | AddEventListenerOptions
  behavior?: ScrollBehavior
}

export interface UseScrollReturn {
  x: number
  y: number
  isScrolling: boolean
  arrivedState: UseScrollArrivedState
  directions: UseScrollDirections
  measure: () => void
  scrollTo: (position: UseScrollPosition, behavior?: ScrollBehavior) => void
  setX: (x: number, behavior?: ScrollBehavior) => void
  setY: (y: number, behavior?: ScrollBehavior) => void
}

const DEFAULT_ENABLED = true
const DEFAULT_BEHAVIOR: ScrollBehavior = 'auto'

type ThrottleState = {
  trailingTimer: ReturnType<typeof setTimeout> | null
  trailingEvent: Event | null
  windowEnd: number
  hasLeading: boolean
}

type Attachment = {
  listenerTarget: EventTarget
  onScroll: EventListener
  listenerOptions: NormalizedListenerOptions
  observer: MutationObserver | null
  measureHandle: ReturnType<typeof scheduleCoalescedMeasure> | null
}

/**
 * Tracks scroll position, arrival, direction, and scrolling state for a target.
 *
 * After imperative `ref.current` assignment, a later React commit is required
 * before the hook can attach to the new target.
 */
export function useScroll<T extends UseScrollTarget = HTMLElement>(
  ref: RefObject<T | null>,
  options?: UseScrollOptions,
): UseScrollReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const throttle = normalizeThrottle(options?.throttle)
  const idle = normalizeIdle(options?.idle)
  const behavior = normalizeScrollBehavior(
    options?.behavior ?? DEFAULT_BEHAVIOR,
  )
  const normalizedOffset = normalizeOffset(options?.offset)
  const normalizedListenerOptions = normalizeListenerOptions(
    options?.eventListenerOptions,
  )
  const normalizedObserveOptions = normalizeObserveOptions(options?.observe)

  const [state, setState] = useState<ScrollState>(IDLE_SCROLL_STATE)
  const [observedTarget, setObservedTarget] = useState<T | null>(null)

  const mountedRef = useRef(true)
  const lifecycleGenerationRef = useRef(0)
  const stateRef = useRef(state)
  const positionRef = useRef({ x: 0, y: 0 })
  const attachedTargetRef = useRef<T | null>(null)
  const attachmentRef = useRef<Attachment | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const throttleStateRef = useRef<ThrottleState>({
    trailingTimer: null,
    trailingEvent: null,
    windowEnd: 0,
    hasLeading: false,
  })
  const lastScrollEventRef = useRef<Event | null>(null)
  const hadScrollSessionRef = useRef(false)

  const latestRef = useRef({
    enabled,
    throttle,
    idle,
    offset: normalizedOffset,
    observe: normalizedObserveOptions,
    listenerOptions: normalizedListenerOptions,
    behavior,
    onScroll: options?.onScroll,
    onStop: options?.onStop,
    onError: options?.onError,
  })

  useEffect(() => {
    latestRef.current = {
      enabled,
      throttle,
      idle,
      offset: normalizedOffset,
      observe: normalizedObserveOptions,
      listenerOptions: normalizedListenerOptions,
      behavior,
      onScroll: options?.onScroll,
      onStop: options?.onStop,
      onError: options?.onError,
    }
  })

  useEffect(() => {
    stateRef.current = state
    positionRef.current = { x: state.x, y: state.y }
  })

  /* eslint-disable react-hooks/exhaustive-deps -- re-run after every commit; Object.is guards loops */
  useEffect(() => {
    const current = ref.current
    const next =
      current != null &&
      (isScrollableElementTarget(current) ||
        isWindowTarget(current) ||
        isDocumentTarget(current))
        ? current
        : null
    setObservedTarget((previous) =>
      Object.is(previous, next) ? previous : next,
    )
  })
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      lifecycleGenerationRef.current += 1
    }
  }, [])

  const commitState = useCallback((next: ScrollState) => {
    if (!mountedRef.current) {
      return
    }

    if (scrollStatesEqual(stateRef.current, next)) {
      return
    }

    stateRef.current = next
    positionRef.current = { x: next.x, y: next.y }
    setState(next)
  }, [])

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current != null) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
  }, [])

  const clearThrottleTimers = useCallback(() => {
    const throttleState = throttleStateRef.current
    if (throttleState.trailingTimer != null) {
      clearTimeout(throttleState.trailingTimer)
      throttleState.trailingTimer = null
    }
    throttleState.trailingEvent = null
    throttleState.windowEnd = 0
    throttleState.hasLeading = false
  }, [])

  const finishScrolling = useCallback(
    (generation: number, event: Event | null) => {
      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current
      ) {
        return
      }

      clearStopTimer()
      hadScrollSessionRef.current = false

      const next: ScrollState = {
        ...stateRef.current,
        isScrolling: false,
      }

      commitState(next)

      const onStop = latestRef.current.onStop
      if (onStop != null && event != null) {
        try {
          onStop(event)
        } catch {
          // Consumer callback errors do not affect cleanup.
        }
      }
    },
    [clearStopTimer, commitState],
  )

  const scheduleStopTimer = useCallback(
    (generation: number) => {
      clearStopTimer()
      const effectiveIdle = latestRef.current.idle + latestRef.current.throttle

      stopTimerRef.current = setTimeout(() => {
        finishScrolling(generation, lastScrollEventRef.current)
      }, effectiveIdle)
    },
    [clearStopTimer, finishScrolling],
  )

  const readTargetState = useCallback(
    (
      target: T,
      offset: NormalizedOffset,
      previous: Pick<ScrollState, 'x' | 'y'>,
      options: {
        isScrolling?: boolean
        resetDirections?: boolean
      } = {},
    ): ScrollState | null => {
      try {
        const metrics = readScrollMetrics(target)
        if (metrics == null) {
          return null
        }

        const rtlMode = resolveRtlScrollMode(target, metrics)
        return buildScrollState(metrics, offset, rtlMode, previous, options)
      } catch (error) {
        const onError = latestRef.current.onError
        if (onError != null) {
          try {
            onError(error)
          } catch {
            // Consumer onError failures must not break cleanup paths.
          }
        }
        return null
      }
    },
    [],
  )

  const applyMeasurement = useCallback(
    (
      generation: number,
      target: T,
      event: Event | null,
      options: {
        invokeOnScroll?: boolean
        isScrolling?: boolean
        resetDirections?: boolean
      } = {},
    ) => {
      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current
      ) {
        return
      }

      const offset = latestRef.current.offset
      const next = readTargetState(target, offset, positionRef.current, {
        ...(options.isScrolling !== undefined
          ? { isScrolling: options.isScrolling }
          : {}),
        ...(options.resetDirections !== undefined
          ? { resetDirections: options.resetDirections }
          : {}),
      })

      if (next == null) {
        return
      }

      let resolved = next
      if (
        !options.resetDirections &&
        options.isScrolling !== false &&
        directionsEqual(resolved.directions, RESET_DIRECTIONS) &&
        !directionsEqual(stateRef.current.directions, RESET_DIRECTIONS)
      ) {
        resolved = {
          ...resolved,
          directions: stateRef.current.directions,
        }
      }

      commitState(resolved)

      if (options.invokeOnScroll && event != null) {
        const onScroll = latestRef.current.onScroll
        if (onScroll != null) {
          try {
            onScroll(event)
          } catch {
            // Consumer callback errors do not affect cleanup.
          }
        }
      }
    },
    [commitState, readTargetState],
  )

  const processScrollEvent = useCallback(
    (generation: number, target: T, event: Event) => {
      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current
      ) {
        return
      }

      lastScrollEventRef.current = event
      hadScrollSessionRef.current = true

      if (!stateRef.current.isScrolling) {
        commitState({
          ...stateRef.current,
          isScrolling: true,
        })
      }

      scheduleStopTimer(generation)

      const currentThrottle = latestRef.current.throttle
      if (currentThrottle <= 0) {
        applyMeasurement(generation, target, event, {
          invokeOnScroll: true,
          isScrolling: true,
        })
        return
      }

      const throttleState = throttleStateRef.current
      const now = Date.now()

      const runMeasurement = (nativeEvent: Event, invokeOnScroll: boolean) => {
        applyMeasurement(generation, target, nativeEvent, {
          invokeOnScroll,
          isScrolling: true,
        })
      }

      if (!throttleState.hasLeading || now >= throttleState.windowEnd) {
        throttleState.hasLeading = true
        throttleState.windowEnd = now + currentThrottle
        runMeasurement(event, true)

        if (throttleState.trailingTimer != null) {
          clearTimeout(throttleState.trailingTimer)
          throttleState.trailingTimer = null
        }
        throttleState.trailingEvent = null
        return
      }

      throttleState.trailingEvent = event
      if (throttleState.trailingTimer != null) {
        return
      }

      const delay = throttleState.windowEnd - now
      throttleState.trailingTimer = setTimeout(() => {
        throttleState.trailingTimer = null
        const trailingEvent = throttleState.trailingEvent
        throttleState.trailingEvent = null
        throttleState.hasLeading = false
        throttleState.windowEnd = 0

        if (trailingEvent != null) {
          runMeasurement(trailingEvent, true)
        }
      }, delay)
    },
    [applyMeasurement, commitState, scheduleStopTimer],
  )

  const detachCurrent = useCallback(
    (
      options: { resetScrollingState?: boolean; invokeOnStop?: boolean } = {},
    ) => {
      const attachment = attachmentRef.current
      if (attachment != null) {
        attachment.listenerTarget.removeEventListener(
          'scroll',
          attachment.onScroll,
          toAddEventListenerOptions(attachment.listenerOptions),
        )
        attachment.observer?.disconnect()
        cancelCoalescedMeasure(attachment.measureHandle)
        attachmentRef.current = null
      }

      attachedTargetRef.current = null
      clearStopTimer()
      clearThrottleTimers()

      if (options.resetScrollingState && stateRef.current.isScrolling) {
        const generation = lifecycleGenerationRef.current
        if (options.invokeOnStop) {
          finishScrolling(generation, lastScrollEventRef.current)
        } else {
          commitState({
            ...stateRef.current,
            isScrolling: false,
          })
          hadScrollSessionRef.current = false
        }
      }
    },
    [clearStopTimer, clearThrottleTimers, commitState, finishScrolling],
  )

  const measure = useCallback(() => {
    if (!isBrowserEnvironment() || !latestRef.current.enabled) {
      return
    }

    const target = attachedTargetRef.current
    if (target == null) {
      return
    }

    const generation = lifecycleGenerationRef.current
    applyMeasurement(generation, target, null, {
      resetDirections: true,
      isScrolling: stateRef.current.isScrolling,
    })
  }, [applyMeasurement])

  const scrollToPosition = useCallback(
    (position: UseScrollPosition, behaviorOverride?: ScrollBehavior) => {
      if (!isBrowserEnvironment() || !latestRef.current.enabled) {
        return
      }

      const target = attachedTargetRef.current
      if (target == null) {
        return
      }

      const nextX = normalizePositionNumber(position.x)
      const nextY = normalizePositionNumber(position.y)
      if (nextX == null && nextY == null) {
        return
      }

      const current = readScrollMetrics(target)
      if (current == null) {
        return
      }

      const effectiveBehavior = normalizeScrollBehavior(
        behaviorOverride ?? latestRef.current.behavior,
      )

      containPlatformError(latestRef.current.onError, () => {
        performScrollTo(
          target,
          {
            x: nextX ?? current.x,
            y: nextY ?? current.y,
          },
          effectiveBehavior,
        )
      })

      if (effectiveBehavior === 'auto') {
        measure()
      }
    },
    [measure],
  )

  const setX = useCallback(
    (nextX: number, behaviorOverride?: ScrollBehavior) => {
      const target = attachedTargetRef.current
      if (target == null) {
        return
      }

      const current = readScrollMetrics(target)
      scrollToPosition(
        { x: nextX, y: current?.y ?? stateRef.current.y },
        behaviorOverride,
      )
    },
    [scrollToPosition],
  )

  const setY = useCallback(
    (nextY: number, behaviorOverride?: ScrollBehavior) => {
      const target = attachedTargetRef.current
      if (target == null) {
        return
      }

      const current = readScrollMetrics(target)
      scrollToPosition(
        { x: current?.x ?? stateRef.current.x, y: nextY },
        behaviorOverride,
      )
    },
    [scrollToPosition],
  )

  useEffect(() => {
    if (!stateRef.current.isScrolling) {
      return
    }

    scheduleStopTimer(lifecycleGenerationRef.current)
  }, [idle, scheduleStopTimer, throttle])

  useEffect(() => {
    const generation = ++lifecycleGenerationRef.current
    const target = observedTarget

    const resetDirectionsOnly = () => {
      if (directionsChanged(stateRef.current.directions, RESET_DIRECTIONS)) {
        commitState({
          ...stateRef.current,
          directions: RESET_DIRECTIONS,
        })
      }
    }

    if (!enabled || target == null) {
      detachCurrent()
      resetDirectionsOnly()
      return () => {
        if (generation === lifecycleGenerationRef.current) {
          detachCurrent()
        }
      }
    }

    const listenerOptions = latestRef.current.listenerOptions
    const observeOptions = latestRef.current.observe

    const onScroll: EventListener = (event) => {
      processScrollEvent(generation, target, event)
    }

    const scheduleMutationMeasure = () => {
      const attachment = attachmentRef.current
      if (attachment == null) {
        return
      }

      cancelCoalescedMeasure(attachment.measureHandle)
      attachment.measureHandle = scheduleCoalescedMeasure(
        resolveOwningWindow(target),
        () => {
          attachment.measureHandle = null
          if (generation !== lifecycleGenerationRef.current) {
            return
          }

          applyMeasurement(generation, target, null, {
            resetDirections: true,
            isScrolling: stateRef.current.isScrolling,
          })
        },
      )
    }

    const listenerTarget = resolveListenerTarget(target)
    const nativeListenerOptions = toAddEventListenerOptions(listenerOptions)
    listenerTarget.addEventListener('scroll', onScroll, nativeListenerOptions)

    let observer: MutationObserver | null = null
    if (observeOptions.mutation) {
      const observeTarget = resolveMutationObserveTarget(target)
      const Observer = resolveMutationObserverConstructor(
        resolveOwningWindow(target),
      )

      if (observeTarget != null && Observer != null) {
        observer = new Observer(() => {
          scheduleMutationMeasure()
        })
        observer.observe(observeTarget, {
          attributes: true,
          childList: true,
          subtree: true,
        })
      }
    }

    attachmentRef.current = {
      listenerTarget,
      onScroll,
      listenerOptions,
      observer,
      measureHandle: null,
    }
    attachedTargetRef.current = target

    applyMeasurement(generation, target, null, {
      resetDirections: true,
      isScrolling: false,
    })

    return () => {
      if (generation !== lifecycleGenerationRef.current) {
        return
      }

      detachCurrent({ resetScrollingState: true, invokeOnStop: false })
    }
  }, [
    applyMeasurement,
    commitState,
    detachCurrent,
    enabled,
    normalizedListenerOptions.capture,
    normalizedListenerOptions.passive,
    normalizedListenerOptions.once,
    normalizedListenerOptions.signal,
    normalizedObserveOptions.mutation,
    observedTarget,
    processScrollEvent,
  ])

  return {
    x: state.x,
    y: state.y,
    isScrolling: state.isScrolling,
    arrivedState: state.arrivedState,
    directions: state.directions,
    measure,
    scrollTo: scrollToPosition,
    setX,
    setY,
  }
}

function directionsChanged(
  current: ScrollState['directions'],
  next: ScrollState['directions'],
): boolean {
  return (
    current.left !== next.left ||
    current.right !== next.right ||
    current.top !== next.top ||
    current.bottom !== next.bottom
  )
}
