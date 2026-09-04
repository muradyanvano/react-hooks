import { useCallback, useEffect, useRef, useState } from 'react'

import {
  DEFAULT_ENABLED,
  DEFAULT_TREAT_ABORT_AS_ERROR,
  bridgeExternalAbort,
  eyeDropperStatesEqual,
  invokeOnErrorSafely,
  isAbortError,
  isEyeDropperSupported,
  normalizeError,
  normalizeInitialValue,
  resolveAbortControllerConstructor,
  resolveEffectiveWindow,
  resolveEyeDropperConstructor,
  validateEyeDropperResult,
  type EyeDropperViewState,
  type UseEyeDropperOpenOptions,
  type UseEyeDropperOptions,
  type UseEyeDropperReturn,
} from './eyeDropperHelpers'

export type {
  UseEyeDropperOpenOptions,
  UseEyeDropperOptions,
  UseEyeDropperReturn,
} from './eyeDropperHelpers'

function commitViewState(
  setState: (
    value:
      | EyeDropperViewState
      | ((previous: EyeDropperViewState) => EyeDropperViewState),
  ) => void,
  next:
    | EyeDropperViewState
    | ((previous: EyeDropperViewState) => EyeDropperViewState),
): void {
  setState((previous) => {
    const resolved = typeof next === 'function' ? next(previous) : next
    return eyeDropperStatesEqual(previous, resolved) ? previous : resolved
  })
}

/**
 * Wraps the native EyeDropper API for imperative, user-gesture-driven color
 * sampling. Never opens automatically — call `open()` directly from a click
 * (or equivalent) handler so transient user activation is preserved.
 *
 * Defaults: `initialValue: ''`, `enabled: true`, `treatAbortAsError: false`.
 * Successful colors are six-digit lowercase `#rrggbb`. Shorthand `#rgb` is
 * rejected. Browser support is limited and typically requires a secure context.
 *
 * Overlap: newest `open()` owns React state. A stale native success still
 * resolves that caller’s promise with its own color, but does not mutate hook
 * state. Failed/cancelled attempts resolve `null`.
 *
 * Without a usable `AbortController`, native `open()` is invoked without a
 * signal; `cancel()` still invalidates local ownership so late settlements
 * cannot update state, but the platform picker UI may remain open.
 */
export function useEyeDropper(
  options?: UseEyeDropperOptions,
): UseEyeDropperReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const windowOption = options?.window
  const treatAbortAsError =
    options?.treatAbortAsError ?? DEFAULT_TREAT_ABORT_AS_ERROR

  const latestInitialRef = useRef(normalizeInitialValue(options?.initialValue))
  const [state, setState] = useState<EyeDropperViewState>(() => ({
    sRGBHex: normalizeInitialValue(options?.initialValue),
    isPicking: false,
    error: null,
    isSupported: false,
  }))

  const generationIdRef = useRef(0)
  /** Generation of the attempt that currently owns React state, or null. */
  const activeGenerationRef = useRef<number | null>(null)
  const mountedRef = useRef(false)
  const activeControllerRef = useRef<AbortController | null>(null)
  const removeForwardRef = useRef<(() => void) | null>(null)

  const enabledRef = useRef(enabled)
  const windowOptionRef = useRef(windowOption)
  const treatAbortAsErrorRef = useRef(treatAbortAsError)
  const latestOnErrorRef = useRef(options?.onError)

  useEffect(() => {
    latestInitialRef.current = normalizeInitialValue(options?.initialValue)
    enabledRef.current = enabled
    windowOptionRef.current = windowOption
    treatAbortAsErrorRef.current = treatAbortAsError
    latestOnErrorRef.current = options?.onError
  })

  const clearForwardListener = useCallback(() => {
    removeForwardRef.current?.()
    removeForwardRef.current = null
  }, [])

  const invalidateActiveAttempt = useCallback(
    (abortNative: boolean) => {
      clearForwardListener()
      const controller = activeControllerRef.current
      activeControllerRef.current = null
      activeGenerationRef.current = null
      if (abortNative && controller != null && !controller.signal.aborted) {
        try {
          controller.abort()
        } catch {
          // Ignore abort races.
        }
      }
      generationIdRef.current += 1
    },
    [clearForwardListener],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      invalidateActiveAttempt(true)
    }
  }, [invalidateActiveAttempt])

  // Sync support after mount / window changes. Never constructs EyeDropper.
  useEffect(() => {
    const win = resolveEffectiveWindow(windowOption)
    const supported = isEyeDropperSupported(win)
    commitViewState(setState, (previous) =>
      previous.isSupported === supported
        ? previous
        : { ...previous, isSupported: supported },
    )
  }, [windowOption])

  // Cancel active work when disabled.
  useEffect(() => {
    if (!enabled) {
      invalidateActiveAttempt(true)
      commitViewState(setState, (previous) => {
        if (previous.isPicking) {
          return { ...previous, isPicking: false, error: null }
        }
        if (previous.error != null && isAbortError(previous.error)) {
          return { ...previous, error: null }
        }
        return previous
      })
    }
  }, [enabled, invalidateActiveAttempt])

  const previousWindowRef = useRef(windowOption)
  useEffect(() => {
    if (previousWindowRef.current !== windowOption) {
      previousWindowRef.current = windowOption
      invalidateActiveAttempt(true)
      commitViewState(setState, (previous) =>
        previous.isPicking ? { ...previous, isPicking: false } : previous,
      )
    }
  }, [windowOption, invalidateActiveAttempt])

  const cancel = useCallback(() => {
    // Ownership is generation-based so cancel works even without AbortController.
    if (activeGenerationRef.current == null) {
      return
    }

    clearForwardListener()
    const controller = activeControllerRef.current
    activeControllerRef.current = null
    activeGenerationRef.current = null
    if (controller != null && !controller.signal.aborted) {
      try {
        controller.abort()
      } catch {
        // Ignore abort races.
      }
    }
    // Invalidate so a late native AbortError / success cannot also notify.
    generationIdRef.current += 1

    if (treatAbortAsErrorRef.current) {
      const error = new Error('The EyeDropper request was aborted')
      error.name = 'AbortError'
      commitViewState(setState, (previous) => ({
        ...previous,
        isPicking: false,
        error,
      }))
      invokeOnErrorSafely(latestOnErrorRef.current, error)
      return
    }

    commitViewState(setState, (previous) => ({
      ...previous,
      isPicking: false,
      error: null,
    }))
  }, [clearForwardListener])

  const reset = useCallback(() => {
    const initial = latestInitialRef.current
    commitViewState(setState, (previous) => {
      if (previous.sRGBHex === initial && previous.error === null) {
        return previous
      }
      return {
        ...previous,
        sRGBHex: initial,
        error: null,
      }
    })
  }, [])

  const open = useCallback(
    async (openOptions?: UseEyeDropperOpenOptions): Promise<string | null> => {
      if (!enabledRef.current) {
        return null
      }

      const win = resolveEffectiveWindow(windowOptionRef.current)
      if (!isEyeDropperSupported(win)) {
        return null
      }

      const external = openOptions?.signal
      if (external?.aborted) {
        return null
      }

      // Invalidate any previous attempt before starting a new owned request.
      clearForwardListener()
      const previousController = activeControllerRef.current
      activeControllerRef.current = null
      activeGenerationRef.current = null
      if (previousController != null && !previousController.signal.aborted) {
        try {
          previousController.abort()
        } catch {
          // Ignore.
        }
      }

      const generationId = ++generationIdRef.current
      activeGenerationRef.current = generationId

      const AbortControllerCtor = resolveAbortControllerConstructor(win)
      let signal: AbortSignal | undefined
      let removeForward: (() => void) | null = null

      const cleanupThisAttempt = () => {
        if (removeForward != null) {
          removeForward()
          if (removeForwardRef.current === removeForward) {
            removeForwardRef.current = null
          }
          removeForward = null
        }
        if (activeGenerationRef.current === generationId) {
          activeGenerationRef.current = null
          activeControllerRef.current = null
        }
      }

      if (AbortControllerCtor != null) {
        try {
          const controller = new AbortControllerCtor()
          signal = controller.signal
          activeControllerRef.current = controller
          if (external != null) {
            removeForward = bridgeExternalAbort(external, controller)
            removeForwardRef.current = removeForward
          }
        } catch {
          signal = undefined
          activeControllerRef.current = null
        }
      }

      if (mountedRef.current) {
        commitViewState(setState, (previous) => ({
          ...previous,
          isPicking: true,
          error: null,
          isSupported: true,
        }))
      }

      const Ctor = resolveEyeDropperConstructor(win)
      if (Ctor == null) {
        cleanupThisAttempt()
        if (generationId === generationIdRef.current && mountedRef.current) {
          commitViewState(setState, (previous) => ({
            ...previous,
            isPicking: false,
            isSupported: false,
          }))
        }
        return null
      }

      // CRITICAL: construct and call native open() synchronously — before any
      // await — so transient user activation is preserved.
      let nativePromise: Promise<unknown>
      try {
        const picker = new Ctor()
        const openFn = picker?.open
        if (typeof openFn !== 'function') {
          throw new TypeError('EyeDropper instance is missing open()')
        }
        nativePromise =
          signal != null ? openFn.call(picker, { signal }) : openFn.call(picker)
      } catch (cause) {
        cleanupThisAttempt()
        const error = normalizeError(cause)
        if (generationId === generationIdRef.current && mountedRef.current) {
          commitViewState(setState, (previous) => ({
            ...previous,
            isPicking: false,
            error,
          }))
          invokeOnErrorSafely(latestOnErrorRef.current, error)
        }
        return null
      }

      try {
        const result = await nativePromise
        const validated = validateEyeDropperResult(result)
        const isCurrent =
          generationId === generationIdRef.current && mountedRef.current

        cleanupThisAttempt()

        if (!validated.ok) {
          if (isCurrent) {
            commitViewState(setState, (previous) => ({
              ...previous,
              isPicking: false,
              error: validated.error,
            }))
            invokeOnErrorSafely(latestOnErrorRef.current, validated.error)
          }
          return null
        }

        if (isCurrent) {
          commitViewState(setState, (previous) => ({
            ...previous,
            sRGBHex: validated.value,
            isPicking: false,
            error: null,
          }))
        }
        // Stale successes still resolve to their own color for the caller.
        return validated.value
      } catch (cause) {
        cleanupThisAttempt()

        const aborted = isAbortError(cause)
        const isCurrent =
          generationId === generationIdRef.current && mountedRef.current

        if (aborted) {
          if (treatAbortAsErrorRef.current) {
            const error = normalizeError(cause)
            if (isCurrent) {
              commitViewState(setState, (previous) => ({
                ...previous,
                isPicking: false,
                error,
              }))
              invokeOnErrorSafely(latestOnErrorRef.current, error)
            }
          } else if (isCurrent) {
            commitViewState(setState, (previous) => ({
              ...previous,
              isPicking: false,
              error: null,
            }))
          }
          return null
        }

        const error = normalizeError(cause)
        if (isCurrent) {
          commitViewState(setState, (previous) => ({
            ...previous,
            isPicking: false,
            error,
          }))
          invokeOnErrorSafely(latestOnErrorRef.current, error)
        }
        return null
      }
    },
    [clearForwardListener],
  )

  return {
    isSupported: state.isSupported,
    sRGBHex: state.sRGBHex,
    isPicking: state.isPicking,
    error: state.error,
    open,
    cancel,
    reset,
  }
}
