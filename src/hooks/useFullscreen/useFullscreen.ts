import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import {
  DEFAULT_AUTO_EXIT,
  DEFAULT_ENABLED,
  DEFAULT_NAVIGATION_UI,
  createMismatchError,
  deriveFullscreenState,
  fullscreenStatesEqual,
  invokeOnErrorSafely,
  isMismatchError,
  normalizeError,
  normalizeNavigationUI,
  normalizeThenables,
  resolveFullscreenContext,
  type FullscreenAdapter,
  type FullscreenViewState,
  type UseFullscreenOptions,
  type UseFullscreenReturn,
  type UseFullscreenTarget,
} from './fullscreenHelpers'

export type {
  UseFullscreenNavigationUI,
  UseFullscreenOptions,
  UseFullscreenReturn,
  UseFullscreenTarget,
} from './fullscreenHelpers'

function commitViewState(
  setState: (
    value:
      | FullscreenViewState
      | ((previous: FullscreenViewState) => FullscreenViewState),
  ) => void,
  next:
    | FullscreenViewState
    | ((previous: FullscreenViewState) => FullscreenViewState),
): void {
  setState((previous) => {
    const resolved = typeof next === 'function' ? next(previous) : next
    return fullscreenStatesEqual(previous, resolved) ? previous : resolved
  })
}

type AttachedListeners = {
  document: Document
  adapter: FullscreenAdapter
  target: Element | null
  onChange: () => void
  onError: () => void
}

/**
 * Observes and controls the native Fullscreen API for a target element (or the
 * document element when `ref` is omitted). Never enters fullscreen automatically —
 * call `enter()` / `toggle()` directly from a user-gesture handler so transient
 * user activation is preserved.
 *
 * Defaults: `enabled: true`, `autoExit: false`, `navigationUI: 'auto'`.
 * Document events are the source of truth for `isFullscreen` / `fullscreenElement`.
 * `exit()` only exits when this hook’s target is the active fullscreen element.
 * `autoExit` best-effort exits on genuine unmount only (not target replacement or
 * Strict Mode remount).
 */
export function useFullscreen<T extends UseFullscreenTarget = HTMLElement>(
  ref?: RefObject<T | null>,
  options?: UseFullscreenOptions,
): UseFullscreenReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const autoExit = options?.autoExit ?? DEFAULT_AUTO_EXIT
  const documentOption = options?.document
  const navigationUI = options?.navigationUI ?? DEFAULT_NAVIGATION_UI

  const [state, setState] = useState<FullscreenViewState>(() => ({
    isSupported: false,
    isFullscreen: false,
    fullscreenElement: null,
    error: null,
  }))

  const mountedRef = useRef(false)
  const lifecycleGenerationRef = useRef(0)
  const operationGenerationRef = useRef(0)
  const targetIdentityRef = useRef<Element | null>(null)
  const documentIdentityRef = useRef<Document | null>(null)
  const attachedRef = useRef<AttachedListeners | null>(null)
  const mismatchActiveRef = useRef(false)
  const pendingOperationRef = useRef<{
    generation: number
    errorNotified: boolean
  } | null>(null)

  const enabledRef = useRef(enabled)
  const autoExitRef = useRef(autoExit)
  const documentOptionRef = useRef(documentOption)
  const navigationUIRef = useRef(navigationUI)
  const latestOnErrorRef = useRef(options?.onError)
  const refHolderRef = useRef(ref)

  useEffect(() => {
    enabledRef.current = enabled
    autoExitRef.current = autoExit
    documentOptionRef.current = documentOption
    navigationUIRef.current = navigationUI
    latestOnErrorRef.current = options?.onError
    refHolderRef.current = ref
  })

  const invalidateOperations = useCallback(() => {
    operationGenerationRef.current += 1
    pendingOperationRef.current = null
  }, [])

  const detachListeners = useCallback(() => {
    const attached = attachedRef.current
    if (attached == null) {
      return
    }
    attached.document.removeEventListener(
      attached.adapter.changeEvent,
      attached.onChange,
    )
    attached.document.removeEventListener(
      attached.adapter.errorEvent,
      attached.onError,
    )
    attachedRef.current = null
  }, [])

  const notifyOwnedError = useCallback((error: Error, generation: number) => {
    const pending = pendingOperationRef.current
    if (pending != null && pending.generation === generation) {
      if (pending.errorNotified) {
        return
      }
      pending.errorNotified = true
      invokeOnErrorSafely(latestOnErrorRef.current, error)
      return
    }
    invokeOnErrorSafely(latestOnErrorRef.current, error)
  }, [])

  const applyOwnedError = useCallback(
    (error: Error, generation: number) => {
      if (
        !mountedRef.current ||
        generation !== operationGenerationRef.current ||
        !enabledRef.current
      ) {
        return
      }
      commitViewState(setState, (previous) => ({
        ...previous,
        error,
      }))
      notifyOwnedError(error, generation)
    },
    [notifyOwnedError],
  )

  const reconcileFromPlatform = useCallback((clearError: boolean) => {
    if (!mountedRef.current || !enabledRef.current) {
      return
    }
    const context = resolveFullscreenContext(
      refHolderRef.current,
      documentOptionRef.current,
    )
    if (context.mismatch) {
      commitViewState(setState, (previous) => {
        if (
          isMismatchError(previous.error) &&
          !previous.isFullscreen &&
          previous.fullscreenElement == null
        ) {
          return previous
        }
        return {
          isSupported: context.adapter != null,
          isFullscreen: false,
          fullscreenElement: null,
          error: isMismatchError(previous.error)
            ? previous.error
            : createMismatchError(),
        }
      })
      return
    }
    const next = deriveFullscreenState(
      context.adapter,
      context.document,
      context.target,
      null,
    )
    commitViewState(setState, (previous) => ({
      ...next,
      error: clearError ? null : previous.error,
    }))
  }, [])

  // Mount bookkeeping + autoExit on genuine unmount.
  useEffect(() => {
    mountedRef.current = true
    const lifecycleGeneration = ++lifecycleGenerationRef.current

    return () => {
      mountedRef.current = false
      invalidateOperations()
      detachListeners()

      if (!autoExitRef.current) {
        return
      }

      const target = targetIdentityRef.current
      const doc = documentIdentityRef.current
      if (target == null || doc == null) {
        return
      }

      queueMicrotask(() => {
        // Compare against the latest generation intentionally — a Strict Mode
        // remount increments the ref before this microtask runs.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- generation-owned autoExit
        if (lifecycleGenerationRef.current !== lifecycleGeneration) {
          return
        }
        const context = resolveFullscreenContext(
          { current: target } as RefObject<Element | null>,
          doc,
        )
        const adapter = context.adapter
        if (adapter == null) {
          return
        }
        let current: Element | null
        try {
          current = adapter.getFullscreenElement(doc)
        } catch {
          return
        }
        if (current !== target) {
          return
        }
        try {
          const result = adapter.exit(doc)
          void normalizeThenables(result).catch(() => undefined)
        } catch {
          // Best-effort only; never notify after unmount.
        }
      })
    }
  }, [detachListeners, invalidateOperations])

  // Sync observation after every commit (ref.current is not reactive).
  /* eslint-disable react-hooks/exhaustive-deps -- re-run after every commit; equality guards loops */
  useEffect(() => {
    if (!enabled) {
      invalidateOperations()
      detachListeners()
      targetIdentityRef.current = null
      documentIdentityRef.current = null
      mismatchActiveRef.current = false
      commitViewState(setState, {
        isSupported: false,
        isFullscreen: false,
        fullscreenElement: null,
        error: null,
      })
      return
    }

    const context = resolveFullscreenContext(ref, documentOption)

    const targetChanged = context.target !== targetIdentityRef.current
    const documentChanged = context.document !== documentIdentityRef.current

    if (targetChanged || documentChanged) {
      invalidateOperations()
    }

    targetIdentityRef.current = context.target
    documentIdentityRef.current = context.document

    if (context.mismatch) {
      detachListeners()
      let mismatchError: Error | null = null
      commitViewState(setState, (previous) => {
        if (
          isMismatchError(previous.error) &&
          !previous.isFullscreen &&
          previous.fullscreenElement == null
        ) {
          mismatchError = previous.error
          return previous
        }
        const error = isMismatchError(previous.error)
          ? previous.error
          : createMismatchError()
        mismatchError = error
        return {
          isSupported: context.adapter != null,
          isFullscreen: false,
          fullscreenElement: null,
          error,
        }
      })
      if (!mismatchActiveRef.current && mismatchError != null) {
        mismatchActiveRef.current = true
        invokeOnErrorSafely(latestOnErrorRef.current, mismatchError)
      }
      return
    }

    mismatchActiveRef.current = false

    if (context.document == null || context.adapter == null) {
      detachListeners()
      commitViewState(setState, (previous) => ({
        isSupported: false,
        isFullscreen: false,
        fullscreenElement: null,
        error: previous.error,
      }))
      return
    }

    const { document: doc, adapter, target } = context
    const attached = attachedRef.current
    const needsAttach =
      attached == null ||
      attached.document !== doc ||
      attached.adapter.family !== adapter.family ||
      attached.target !== target

    if (needsAttach) {
      detachListeners()

      const onChange = () => {
        reconcileFromPlatform(false)
      }
      const onErrorEvent = () => {
        if (!mountedRef.current || !enabledRef.current) {
          return
        }
        const error = new Error('Fullscreen request failed')
        error.name = 'FullscreenError'
        const latest = resolveFullscreenContext(
          refHolderRef.current,
          documentOptionRef.current,
        )
        if (latest.mismatch) {
          commitViewState(setState, (previous) => ({
            isSupported: latest.adapter != null,
            isFullscreen: false,
            fullscreenElement: null,
            error: isMismatchError(previous.error)
              ? previous.error
              : createMismatchError(),
          }))
        } else {
          const next = deriveFullscreenState(
            latest.adapter,
            latest.document,
            latest.target,
            error,
          )
          commitViewState(setState, next)
        }

        const pending = pendingOperationRef.current
        if (pending != null) {
          if (!pending.errorNotified) {
            pending.errorNotified = true
            invokeOnErrorSafely(latestOnErrorRef.current, error)
          }
        } else {
          invokeOnErrorSafely(latestOnErrorRef.current, error)
        }
      }

      doc.addEventListener(adapter.changeEvent, onChange)
      doc.addEventListener(adapter.errorEvent, onErrorEvent)
      attachedRef.current = {
        document: doc,
        adapter,
        target,
        onChange,
        onError: onErrorEvent,
      }
      reconcileFromPlatform(false)
    } else if (attached != null) {
      attached.target = target
      if (targetChanged) {
        reconcileFromPlatform(false)
      }
    }
  })
  /* eslint-enable react-hooks/exhaustive-deps */

  const enter = useCallback(async (): Promise<boolean> => {
    if (!enabledRef.current) {
      return false
    }

    const context = resolveFullscreenContext(
      refHolderRef.current,
      documentOptionRef.current,
    )

    if (context.mismatch) {
      const error = createMismatchError()
      const generation = ++operationGenerationRef.current
      pendingOperationRef.current = { generation, errorNotified: false }
      applyOwnedError(error, generation)
      pendingOperationRef.current = null
      return false
    }

    if (
      context.target == null ||
      context.document == null ||
      context.adapter == null
    ) {
      return false
    }

    const { target, document: doc, adapter } = context
    targetIdentityRef.current = target
    documentIdentityRef.current = doc

    let current: Element | null
    try {
      current = adapter.getFullscreenElement(doc)
    } catch (cause) {
      const generation = ++operationGenerationRef.current
      pendingOperationRef.current = { generation, errorNotified: false }
      applyOwnedError(normalizeError(cause), generation)
      pendingOperationRef.current = null
      return false
    }

    if (current === target) {
      if (mountedRef.current) {
        commitViewState(setState, (previous) => ({
          ...previous,
          isSupported: true,
          isFullscreen: true,
          fullscreenElement: target,
          error: null,
        }))
      }
      return true
    }

    const navigation = normalizeNavigationUI(navigationUIRef.current)
    if (navigation == null) {
      const generation = ++operationGenerationRef.current
      pendingOperationRef.current = { generation, errorNotified: false }
      applyOwnedError(new Error('Invalid navigationUI option'), generation)
      pendingOperationRef.current = null
      return false
    }

    const generation = ++operationGenerationRef.current
    pendingOperationRef.current = { generation, errorNotified: false }

    if (mountedRef.current) {
      commitViewState(setState, (previous) => ({
        ...previous,
        error: null,
        isSupported: true,
      }))
    }

    // CRITICAL: invoke native request synchronously before any await.
    let nativeResult: unknown
    try {
      nativeResult =
        adapter.family === 'standard'
          ? adapter.request(target, { navigationUI: navigation })
          : adapter.request(target)
    } catch (cause) {
      const error = normalizeError(cause)
      applyOwnedError(error, generation)
      if (generation === operationGenerationRef.current && mountedRef.current) {
        reconcileFromPlatform(false)
        commitViewState(setState, (previous) => ({ ...previous, error }))
      }
      if (pendingOperationRef.current?.generation === generation) {
        pendingOperationRef.current = null
      }
      return false
    }

    try {
      await normalizeThenables(nativeResult)
    } catch (cause) {
      if (generation === operationGenerationRef.current && mountedRef.current) {
        const error = normalizeError(cause)
        applyOwnedError(error, generation)
        reconcileFromPlatform(false)
        commitViewState(setState, (previous) => ({ ...previous, error }))
      }
      if (pendingOperationRef.current?.generation === generation) {
        pendingOperationRef.current = null
      }
      return false
    }

    if (pendingOperationRef.current?.generation === generation) {
      pendingOperationRef.current = null
    }

    if (generation !== operationGenerationRef.current || !mountedRef.current) {
      return false
    }

    let after: Element | null = null
    try {
      after = adapter.getFullscreenElement(doc)
    } catch (cause) {
      applyOwnedError(normalizeError(cause), generation)
      return false
    }

    const isOwned = after === target
    commitViewState(setState, (previous) => ({
      ...previous,
      isSupported: true,
      isFullscreen: isOwned,
      fullscreenElement: after,
      error: isOwned ? null : previous.error,
    }))
    return isOwned
  }, [applyOwnedError, reconcileFromPlatform])

  const exit = useCallback(async (): Promise<boolean> => {
    if (!enabledRef.current) {
      return false
    }

    const context = resolveFullscreenContext(
      refHolderRef.current,
      documentOptionRef.current,
    )

    if (
      context.mismatch ||
      context.document == null ||
      context.adapter == null ||
      context.target == null
    ) {
      return false
    }

    const { target, document: doc, adapter } = context

    let current: Element | null
    try {
      current = adapter.getFullscreenElement(doc)
    } catch (cause) {
      const generation = ++operationGenerationRef.current
      pendingOperationRef.current = { generation, errorNotified: false }
      applyOwnedError(normalizeError(cause), generation)
      pendingOperationRef.current = null
      return false
    }

    if (current == null || current !== target) {
      return false
    }

    const generation = ++operationGenerationRef.current
    pendingOperationRef.current = { generation, errorNotified: false }

    if (mountedRef.current) {
      commitViewState(setState, (previous) => ({
        ...previous,
        error: null,
      }))
    }

    let nativeResult: unknown
    try {
      nativeResult = adapter.exit(doc)
    } catch (cause) {
      const error = normalizeError(cause)
      applyOwnedError(error, generation)
      if (generation === operationGenerationRef.current && mountedRef.current) {
        reconcileFromPlatform(false)
        commitViewState(setState, (previous) => ({ ...previous, error }))
      }
      if (pendingOperationRef.current?.generation === generation) {
        pendingOperationRef.current = null
      }
      return false
    }

    try {
      await normalizeThenables(nativeResult)
    } catch (cause) {
      if (generation === operationGenerationRef.current && mountedRef.current) {
        const error = normalizeError(cause)
        applyOwnedError(error, generation)
        reconcileFromPlatform(false)
        commitViewState(setState, (previous) => ({ ...previous, error }))
      }
      if (pendingOperationRef.current?.generation === generation) {
        pendingOperationRef.current = null
      }
      return false
    }

    if (pendingOperationRef.current?.generation === generation) {
      pendingOperationRef.current = null
    }

    if (generation !== operationGenerationRef.current || !mountedRef.current) {
      return false
    }

    let after: Element | null = null
    try {
      after = adapter.getFullscreenElement(doc)
    } catch (cause) {
      applyOwnedError(normalizeError(cause), generation)
      return false
    }

    const left = after !== target
    commitViewState(setState, (previous) => ({
      ...previous,
      isSupported: true,
      isFullscreen: after === target,
      fullscreenElement: after,
      error: left ? null : previous.error,
    }))
    return left
  }, [applyOwnedError, reconcileFromPlatform])

  const toggle = useCallback(async (): Promise<boolean> => {
    if (!enabledRef.current) {
      return false
    }

    const context = resolveFullscreenContext(
      refHolderRef.current,
      documentOptionRef.current,
    )

    if (
      context.document == null ||
      context.adapter == null ||
      context.target == null
    ) {
      if (context.mismatch) {
        return enter()
      }
      return false
    }

    let current: Element | null
    try {
      current = context.adapter.getFullscreenElement(context.document)
    } catch {
      return enter()
    }

    if (current === context.target) {
      return exit()
    }
    return enter()
  }, [enter, exit])

  return {
    isSupported: state.isSupported,
    isFullscreen: state.isFullscreen,
    fullscreenElement: state.fullscreenElement,
    error: state.error,
    enter,
    exit,
    toggle,
  }
}
