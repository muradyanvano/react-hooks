import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'

import {
  classifyRelatedTarget,
  isBrowserFocusEnvironment,
  isTargetFocusWithin,
  scheduleMicrotask,
} from './focusWithinHelpers'

export interface UseFocusWithinOptions {
  enabled?: boolean
}

export interface UseFocusWithinReturn {
  focused: boolean
}

const DEFAULT_ENABLED = true

type TargetListeners<T extends Element> = {
  element: T
  onFocusIn: EventListener
  onFocusOut: EventListener
}

/**
 * Tracks whether the referenced element or any of its DOM descendants
 * currently contains focus, aligned with CSS `:focus-within` semantics.
 *
 * After imperative `ref.current` assignment, a later React commit is
 * required before the hook can synchronize to the new target.
 */
export function useFocusWithin<T extends Element>(
  ref: RefObject<T | null>,
  options?: UseFocusWithinOptions,
): UseFocusWithinReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED

  const [focused, setFocusedState] = useState(false)

  const mountedRef = useRef(true)
  const activeTargetRef = useRef<T | null>(null)
  const attachedElementRef = useRef<T | null>(null)
  const attachedListenersRef = useRef<TargetListeners<T> | null>(null)
  const targetGenerationRef = useRef(0)
  const reconciliationGenerationRef = useRef(0)
  const latestRef = useRef({ enabled })

  useEffect(() => {
    latestRef.current = { enabled }
  })

  const setFocused = useCallback((next: boolean) => {
    if (!mountedRef.current) {
      return
    }

    setFocusedState((previous) => (Object.is(previous, next) ? previous : next))
  }, [])

  const invalidateReconciliation = useCallback(() => {
    reconciliationGenerationRef.current += 1
  }, [])

  const readFocusedFromTarget = useCallback((target: T): boolean => {
    if (!isBrowserFocusEnvironment()) {
      return false
    }

    return isTargetFocusWithin(target)
  }, [])

  const syncFocusedFromTarget = useCallback(
    (target: T) => {
      setFocused(readFocusedFromTarget(target))
    },
    [readFocusedFromTarget, setFocused],
  )

  const detachCurrentListeners = useCallback(() => {
    const attachment = attachedListenersRef.current
    if (attachment == null) {
      return
    }

    attachment.element.removeEventListener('focusin', attachment.onFocusIn)
    attachment.element.removeEventListener('focusout', attachment.onFocusOut)
    attachedListenersRef.current = null
    attachedElementRef.current = null
  }, [])

  const scheduleFocusOutReconciliation = useCallback(
    (target: T, generation: number) => {
      const reconciliationGeneration = reconciliationGenerationRef.current

      scheduleMicrotask(() => {
        if (
          !mountedRef.current ||
          !latestRef.current.enabled ||
          activeTargetRef.current !== target ||
          generation !== targetGenerationRef.current ||
          reconciliationGeneration !== reconciliationGenerationRef.current
        ) {
          return
        }

        syncFocusedFromTarget(target)
      })
    },
    [syncFocusedFromTarget],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      invalidateReconciliation()
      detachCurrentListeners()
    }
  }, [detachCurrentListeners, invalidateReconciliation])

  useEffect(() => {
    const nextElement = enabled ? ref.current : null
    const previousElement = attachedElementRef.current

    if (previousElement != null && previousElement !== nextElement) {
      detachCurrentListeners()
      invalidateReconciliation()
      targetGenerationRef.current += 1
      setFocused(false)
    }

    activeTargetRef.current = nextElement

    if (!enabled) {
      detachCurrentListeners()
      invalidateReconciliation()
      setFocused(false)
      return undefined
    }

    if (nextElement == null) {
      detachCurrentListeners()
      invalidateReconciliation()
      setFocused(false)
      return undefined
    }

    if (previousElement === nextElement) {
      syncFocusedFromTarget(nextElement)
      return undefined
    }

    invalidateReconciliation()
    targetGenerationRef.current += 1
    const generation = targetGenerationRef.current

    const onFocusIn = () => {
      if (
        activeTargetRef.current !== nextElement ||
        generation !== targetGenerationRef.current ||
        !latestRef.current.enabled
      ) {
        return
      }

      invalidateReconciliation()
      syncFocusedFromTarget(nextElement)
    }

    const onFocusOut: EventListener = (event) => {
      if (
        activeTargetRef.current !== nextElement ||
        generation !== targetGenerationRef.current ||
        !latestRef.current.enabled
      ) {
        return
      }

      const relatedClassification = classifyRelatedTarget(
        nextElement,
        (event as FocusEvent).relatedTarget,
      )

      if (relatedClassification === 'inside') {
        setFocused(true)
        return
      }

      if (relatedClassification === 'outside') {
        invalidateReconciliation()
        setFocused(false)
        return
      }

      scheduleFocusOutReconciliation(nextElement, generation)
    }

    nextElement.addEventListener('focusin', onFocusIn)
    nextElement.addEventListener('focusout', onFocusOut)
    attachedElementRef.current = nextElement
    attachedListenersRef.current = {
      element: nextElement,
      onFocusIn,
      onFocusOut,
    }

    syncFocusedFromTarget(nextElement)

    return undefined
  })

  return useMemo(() => ({ focused }), [focused])
}
