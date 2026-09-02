import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'

import {
  callNativeFocus,
  isBrowserFocusEnvironment,
  isTargetDirectlyFocused,
} from './focusHelpers'

export type UseFocusTarget = HTMLElement | SVGElement

export interface UseFocusOptions {
  enabled?: boolean
  initialValue?: boolean
  focusVisible?: boolean
  preventScroll?: boolean
}

export interface UseFocusReturn {
  focused: boolean
  focus: () => void
  blur: () => void
}

const DEFAULT_ENABLED = true
const DEFAULT_INITIAL_VALUE = false
const DEFAULT_FOCUS_VISIBLE = false
const DEFAULT_PREVENT_SCROLL = false

type TargetListeners<T extends UseFocusTarget> = {
  element: T
  onFocus: () => void
  onBlur: () => void
}

type InitialFocusState = {
  target: UseFocusTarget | null
  applied: boolean
  enabledGeneration: number
}

/**
 * Tracks whether the referenced element has direct native focus and exposes
 * stable imperative `focus` / `blur` methods.
 *
 * Descendant focus does not count as direct focus. After imperative
 * `ref.current` assignment, a later React commit is required before the hook
 * can synchronize to the new target.
 */
export function useFocus<T extends UseFocusTarget>(
  ref: RefObject<T | null>,
  options?: UseFocusOptions,
): UseFocusReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const initialValue = options?.initialValue ?? DEFAULT_INITIAL_VALUE
  const focusVisible = options?.focusVisible ?? DEFAULT_FOCUS_VISIBLE
  const preventScroll = options?.preventScroll ?? DEFAULT_PREVENT_SCROLL

  const [focused, setFocusedState] = useState(false)

  const mountedRef = useRef(true)
  const focusedRef = useRef(false)
  const activeTargetRef = useRef<T | null>(null)
  const attachedElementRef = useRef<T | null>(null)
  const attachedListenersRef = useRef<TargetListeners<T> | null>(null)
  const targetGenerationRef = useRef(0)
  const enabledGenerationRef = useRef(0)
  const initialFocusStateRef = useRef<InitialFocusState>({
    target: null,
    applied: false,
    enabledGeneration: 0,
  })
  const lastInitialValueRef = useRef(initialValue)

  const latestRef = useRef({
    enabled,
    initialValue,
    focusVisible,
    preventScroll,
  })

  useEffect(() => {
    latestRef.current = {
      enabled,
      initialValue,
      focusVisible,
      preventScroll,
    }
  })

  const setFocused = useCallback((next: boolean) => {
    if (!mountedRef.current) {
      return
    }

    setFocusedState((previous) => (Object.is(previous, next) ? previous : next))
    focusedRef.current = next
  }, [])

  const readFocusedFromTarget = useCallback((target: T): boolean => {
    if (!isBrowserFocusEnvironment()) {
      return false
    }

    return isTargetDirectlyFocused(target, latestRef.current.focusVisible)
  }, [])

  const detachCurrentListeners = useCallback(() => {
    const attachment = attachedListenersRef.current
    if (attachment == null) {
      return
    }

    attachment.element.removeEventListener('focus', attachment.onFocus)
    attachment.element.removeEventListener('blur', attachment.onBlur)
    attachedListenersRef.current = null
    attachedElementRef.current = null
  }, [])

  const shouldApplyInitialFocus = useCallback((target: T): boolean => {
    if (!latestRef.current.initialValue || !latestRef.current.enabled) {
      return false
    }

    const state = initialFocusStateRef.current
    return !(
      state.applied &&
      state.target === target &&
      state.enabledGeneration === enabledGenerationRef.current
    )
  }, [])

  const markInitialFocusApplied = useCallback((target: T) => {
    initialFocusStateRef.current = {
      target,
      applied: true,
      enabledGeneration: enabledGenerationRef.current,
    }
  }, [])

  const requestInitialFocus = useCallback(
    (target: T) => {
      if (!isBrowserFocusEnvironment()) {
        return
      }

      try {
        callNativeFocus(target, latestRef.current.preventScroll)
        markInitialFocusApplied(target)
      } catch {
        // Do not mark initial focus applied when native focus fails.
      }
    },
    [markInitialFocusApplied],
  )

  const focus = useCallback(() => {
    if (!latestRef.current.enabled || !isBrowserFocusEnvironment()) {
      return
    }

    const target = ref.current
    if (target == null) {
      return
    }

    callNativeFocus(target, latestRef.current.preventScroll)
  }, [ref])

  const blur = useCallback(() => {
    if (!latestRef.current.enabled || !isBrowserFocusEnvironment()) {
      return
    }

    const target = ref.current
    if (target == null) {
      return
    }

    target.blur()
  }, [ref])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      detachCurrentListeners()
    }
  }, [detachCurrentListeners])

  useEffect(() => {
    const nextElement = enabled ? ref.current : null
    const previousElement = attachedElementRef.current

    if (previousElement != null && previousElement !== nextElement) {
      detachCurrentListeners()
      targetGenerationRef.current += 1
      setFocused(false)
    }

    activeTargetRef.current = nextElement

    if (!enabled) {
      detachCurrentListeners()
      enabledGenerationRef.current += 1
      initialFocusStateRef.current = {
        target: null,
        applied: false,
        enabledGeneration: enabledGenerationRef.current,
      }
      setFocused(false)
      return undefined
    }

    if (nextElement == null) {
      detachCurrentListeners()
      setFocused(false)
      return undefined
    }

    if (previousElement === nextElement) {
      return undefined
    }

    targetGenerationRef.current += 1
    const generation = targetGenerationRef.current
    setFocused(false)

    const onFocus = () => {
      if (
        activeTargetRef.current !== nextElement ||
        generation !== targetGenerationRef.current ||
        !latestRef.current.enabled
      ) {
        return
      }

      setFocused(readFocusedFromTarget(nextElement))
    }

    const onBlur = () => {
      if (
        activeTargetRef.current !== nextElement ||
        generation !== targetGenerationRef.current ||
        !latestRef.current.enabled
      ) {
        return
      }

      setFocused(false)
    }

    nextElement.addEventListener('focus', onFocus)
    nextElement.addEventListener('blur', onBlur)
    attachedElementRef.current = nextElement
    attachedListenersRef.current = {
      element: nextElement,
      onFocus,
      onBlur,
    }

    setFocused(readFocusedFromTarget(nextElement))

    if (shouldApplyInitialFocus(nextElement)) {
      requestInitialFocus(nextElement)
    }

    return undefined
  })

  useEffect(() => {
    const target = activeTargetRef.current
    if (target == null || !enabled) {
      return
    }

    setFocused(readFocusedFromTarget(target))
  }, [enabled, focusVisible, readFocusedFromTarget, setFocused])

  useEffect(() => {
    const becameTrue = initialValue && !lastInitialValueRef.current
    const becameFalse = !initialValue && lastInitialValueRef.current
    lastInitialValueRef.current = initialValue

    if (becameFalse) {
      initialFocusStateRef.current = {
        target: initialFocusStateRef.current.target,
        applied: false,
        enabledGeneration: enabledGenerationRef.current,
      }
      return
    }

    if (!becameTrue || !enabled || !isBrowserFocusEnvironment()) {
      return
    }

    const target = ref.current
    if (target == null) {
      return
    }

    try {
      callNativeFocus(target, latestRef.current.preventScroll)
      markInitialFocusApplied(target)
    } catch {
      // Do not mark initial focus applied when native focus fails.
    }
  }, [enabled, initialValue, markInitialFocusApplied, ref])

  return useMemo(
    () => ({
      focused,
      focus,
      blur,
    }),
    [blur, focus, focused],
  )
}
