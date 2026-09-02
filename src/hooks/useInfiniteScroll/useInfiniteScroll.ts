import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'

import {
  cancelFrame,
  geometrySignature,
  getDistanceToEdge,
  isBrowserEnvironment,
  isWithinDistance,
  normalizeDistance,
  normalizeLoadError,
  readScrollMetrics,
  resolveListenerTarget,
  resolveObservedElement,
  resolveOwningWindow,
  resolveResizeObserverConstructor,
  scheduleFrame,
  type ScheduledFrameHandle,
  type UseInfiniteScrollDirection,
  type UseInfiniteScrollTarget,
} from './infiniteScrollHelpers'

export type {
  UseInfiniteScrollDirection,
  UseInfiniteScrollTarget,
} from './infiniteScrollHelpers'

export interface UseInfiniteScrollState<
  T extends UseInfiniteScrollTarget = UseInfiniteScrollTarget,
> {
  target: T
  direction: UseInfiniteScrollDirection
  scrollTop: number
  scrollLeft: number
  scrollHeight: number
  scrollWidth: number
  clientHeight: number
  clientWidth: number
  distanceToEdge: number
}

export type UseInfiniteScrollLoadMore<
  T extends UseInfiniteScrollTarget = UseInfiniteScrollTarget,
> = (state: UseInfiniteScrollState<T>) => void | Promise<void>

export type UseInfiniteScrollCanLoadMore<
  T extends UseInfiniteScrollTarget = UseInfiniteScrollTarget,
> = (state: UseInfiniteScrollState<T>) => boolean

export interface UseInfiniteScrollOptions<
  T extends UseInfiniteScrollTarget = UseInfiniteScrollTarget,
> {
  enabled?: boolean
  distance?: number
  direction?: UseInfiniteScrollDirection
  canLoadMore?: UseInfiniteScrollCanLoadMore<T>
}

export interface UseInfiniteScrollReturn {
  isLoading: boolean
  error: Error | null
  check: () => Promise<void>
  reset: () => void
}

const DEFAULT_ENABLED = true
const DEFAULT_DISTANCE = 0
const DEFAULT_DIRECTION: UseInfiniteScrollDirection = 'bottom'

type Attachment = {
  listenerTarget: EventTarget
  onScroll: EventListener
  observer: ResizeObserver | null
  scrollOptions: AddEventListenerOptions
}

type CheckFlags = {
  /** Skip the no-progress block for this attempt (scroll/resize/check/reset). */
  allowWhileBlocked?: boolean
  /** Post-load auto-chain; respects the no-progress block. */
  fromAutoChain?: boolean
}

/**
 * Loads more content when a scrollable target approaches a configured edge.
 *
 * After imperative `ref.current` assignment, a later React commit is required
 * before the hook can attach to the new target.
 */
export function useInfiniteScroll<
  T extends UseInfiniteScrollTarget = HTMLElement,
>(
  ref: RefObject<T | null>,
  onLoadMore: UseInfiniteScrollLoadMore<T>,
  options?: UseInfiniteScrollOptions<T>,
): UseInfiniteScrollReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const distance = normalizeDistance(options?.distance ?? DEFAULT_DISTANCE)
  const direction = options?.direction ?? DEFAULT_DIRECTION

  const [isLoading, setIsLoadingState] = useState(false)
  const [error, setErrorState] = useState<Error | null>(null)

  const mountedRef = useRef(true)
  const isLoadingRef = useRef(false)
  const activePromiseRef = useRef<Promise<void> | null>(null)
  const activeTargetRef = useRef<T | null>(null)
  const attachedTargetRef = useRef<T | null>(null)
  const attachmentRef = useRef<Attachment | null>(null)
  const loadGenerationRef = useRef(0)
  const frameHandleRef = useRef<ScheduledFrameHandle | null>(null)
  const checkScheduledRef = useRef(false)
  const blockedUntilExternalSignalRef = useRef(false)
  const latestRef = useRef({
    enabled,
    distance,
    direction,
    onLoadMore,
    canLoadMore: options?.canLoadMore,
  })

  const runCheckRef = useRef<
    (target: T | null, flags?: CheckFlags) => Promise<void>
  >(async () => undefined)

  useEffect(() => {
    latestRef.current = {
      enabled,
      distance,
      direction,
      onLoadMore,
      canLoadMore: options?.canLoadMore,
    }
  })

  const setIsLoading = useCallback((next: boolean) => {
    if (!mountedRef.current) {
      return
    }
    isLoadingRef.current = next
    setIsLoadingState((previous) =>
      Object.is(previous, next) ? previous : next,
    )
  }, [])

  const setError = useCallback((next: Error | null) => {
    if (!mountedRef.current) {
      return
    }
    setErrorState((previous) => (Object.is(previous, next) ? previous : next))
  }, [])

  const cancelScheduledWork = useCallback(() => {
    cancelFrame(frameHandleRef.current)
    frameHandleRef.current = null
    checkScheduledRef.current = false
  }, [])

  const detachCurrent = useCallback(() => {
    const attachment = attachmentRef.current
    if (attachment == null) {
      return
    }

    attachment.listenerTarget.removeEventListener('scroll', attachment.onScroll)
    attachment.observer?.disconnect()
    attachmentRef.current = null
    attachedTargetRef.current = null
  }, [])

  const buildState = useCallback(
    (target: T): UseInfiniteScrollState<T> | null => {
      const metrics = readScrollMetrics(target)
      if (metrics == null) {
        return null
      }

      const currentDirection = latestRef.current.direction
      return {
        target,
        direction: currentDirection,
        ...metrics,
        distanceToEdge: getDistanceToEdge(metrics, currentDirection),
      }
    },
    [],
  )

  const runLoadAttempt = useCallback(
    async (target: T, state: UseInfiniteScrollState<T>, generation: number) => {
      const signatureBefore = geometrySignature(state, state.direction)
      setError(null)
      setIsLoading(true)

      let failed = false
      try {
        await Promise.resolve(latestRef.current.onLoadMore(state))
      } catch (cause) {
        failed = true
        if (
          mountedRef.current &&
          generation === loadGenerationRef.current &&
          activeTargetRef.current === target
        ) {
          setError(normalizeLoadError(cause))
        }
      }

      if (
        !mountedRef.current ||
        generation !== loadGenerationRef.current ||
        activeTargetRef.current !== target
      ) {
        return
      }

      setIsLoading(false)
      activePromiseRef.current = null

      if (failed || !latestRef.current.enabled) {
        return
      }

      const owningWindow = resolveOwningWindow(target)
      cancelFrame(frameHandleRef.current)
      frameHandleRef.current = scheduleFrame(owningWindow, () => {
        if (
          !mountedRef.current ||
          generation !== loadGenerationRef.current ||
          activeTargetRef.current !== target ||
          !latestRef.current.enabled ||
          isLoadingRef.current
        ) {
          return
        }

        const nextState = buildState(target)
        if (nextState == null) {
          return
        }

        if (
          !isWithinDistance(
            nextState.distanceToEdge,
            latestRef.current.distance,
          )
        ) {
          blockedUntilExternalSignalRef.current = false
          return
        }

        const signatureAfter = geometrySignature(nextState, nextState.direction)
        if (signatureAfter === signatureBefore) {
          blockedUntilExternalSignalRef.current = true
          return
        }

        blockedUntilExternalSignalRef.current = false
        void runCheckRef.current(target, { fromAutoChain: true })
      })
    },
    [buildState, setError, setIsLoading],
  )

  const runCheck = useCallback(
    async (target: T | null, flags?: CheckFlags): Promise<void> => {
      if (!mountedRef.current || !latestRef.current.enabled || target == null) {
        return
      }

      if (activePromiseRef.current != null) {
        return activePromiseRef.current
      }

      if (blockedUntilExternalSignalRef.current && flags?.fromAutoChain) {
        return
      }

      const state = buildState(target)
      if (state == null) {
        return
      }

      if (!isWithinDistance(state.distanceToEdge, latestRef.current.distance)) {
        blockedUntilExternalSignalRef.current = false
        return
      }

      if (blockedUntilExternalSignalRef.current && !flags?.allowWhileBlocked) {
        return
      }

      const canLoadMore = latestRef.current.canLoadMore
      if (canLoadMore != null) {
        try {
          if (!canLoadMore(state)) {
            return
          }
        } catch (cause) {
          setError(normalizeLoadError(cause))
          return
        }
      }

      if (flags?.allowWhileBlocked) {
        blockedUntilExternalSignalRef.current = false
      }

      const generation = loadGenerationRef.current
      const attempt = runLoadAttempt(target, state, generation)
      activePromiseRef.current = attempt
      return attempt
    },
    [buildState, runLoadAttempt, setError],
  )

  useEffect(() => {
    runCheckRef.current = runCheck
  })

  const scheduleCheck = useCallback((target: T, allowWhileBlocked = false) => {
    if (checkScheduledRef.current) {
      return
    }

    checkScheduledRef.current = true
    const owningWindow = resolveOwningWindow(target)
    cancelFrame(frameHandleRef.current)
    frameHandleRef.current = scheduleFrame(owningWindow, () => {
      checkScheduledRef.current = false
      void runCheckRef.current(target, {
        allowWhileBlocked,
      })
    })
  }, [])

  const check = useCallback(async (): Promise<void> => {
    if (!isBrowserEnvironment()) {
      return
    }

    const target = activeTargetRef.current ?? ref.current
    return runCheck(target, { allowWhileBlocked: true })
  }, [ref, runCheck])

  const reset = useCallback(() => {
    loadGenerationRef.current += 1
    blockedUntilExternalSignalRef.current = false
    cancelScheduledWork()
    setError(null)

    if (!mountedRef.current || !latestRef.current.enabled) {
      return
    }

    const target = activeTargetRef.current ?? ref.current
    if (target == null || !isBrowserEnvironment()) {
      return
    }

    scheduleCheck(target, true)
  }, [cancelScheduledWork, ref, scheduleCheck, setError])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      loadGenerationRef.current += 1
      cancelScheduledWork()
      detachCurrent()
      activePromiseRef.current = null
      isLoadingRef.current = false
    }
  }, [cancelScheduledWork, detachCurrent])

  const previousOptionsRef = useRef({ distance, direction })

  useEffect(() => {
    const nextTarget = enabled ? ref.current : null
    const previousTarget = attachedTargetRef.current

    if (previousTarget != null && previousTarget !== nextTarget) {
      detachCurrent()
      cancelScheduledWork()
      loadGenerationRef.current += 1
      blockedUntilExternalSignalRef.current = false
      activePromiseRef.current = null
      setIsLoading(false)
    }

    activeTargetRef.current = nextTarget

    if (!enabled) {
      detachCurrent()
      cancelScheduledWork()
      loadGenerationRef.current += 1
      blockedUntilExternalSignalRef.current = false
      activePromiseRef.current = null
      setIsLoading(false)
      previousOptionsRef.current = { distance, direction }
      return undefined
    }

    if (nextTarget == null) {
      detachCurrent()
      cancelScheduledWork()
      setIsLoading(false)
      previousOptionsRef.current = { distance, direction }
      return undefined
    }

    if (previousTarget === nextTarget && attachmentRef.current != null) {
      const previousOptions = previousOptionsRef.current
      if (
        previousOptions.distance !== distance ||
        previousOptions.direction !== direction
      ) {
        previousOptionsRef.current = { distance, direction }
        scheduleCheck(nextTarget, true)
      }
      return undefined
    }

    previousOptionsRef.current = { distance, direction }

    const listenerTarget = resolveListenerTarget(nextTarget)
    const scrollOptions: AddEventListenerOptions = { passive: true }
    const onScroll: EventListener = () => {
      if (
        activeTargetRef.current !== nextTarget ||
        !latestRef.current.enabled
      ) {
        return
      }
      scheduleCheck(nextTarget, true)
    }

    listenerTarget.addEventListener('scroll', onScroll, scrollOptions)

    let observer: ResizeObserver | null = null
    const observedElement = resolveObservedElement(nextTarget)
    const ObserverCtor = resolveResizeObserverConstructor(
      resolveOwningWindow(nextTarget),
    )
    if (ObserverCtor != null && observedElement != null) {
      observer = new ObserverCtor(() => {
        if (
          activeTargetRef.current !== nextTarget ||
          !latestRef.current.enabled
        ) {
          return
        }
        scheduleCheck(nextTarget, true)
      })
      observer.observe(observedElement)
    }

    attachmentRef.current = {
      listenerTarget,
      onScroll,
      observer,
      scrollOptions,
    }
    attachedTargetRef.current = nextTarget
    blockedUntilExternalSignalRef.current = false
    scheduleCheck(nextTarget, true)

    return undefined
  })

  return useMemo(
    () => ({
      isLoading,
      error,
      check,
      reset,
    }),
    [isLoading, error, check, reset],
  )
}
