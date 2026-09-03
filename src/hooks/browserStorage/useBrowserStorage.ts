import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  applyMergeDefaults,
  createDefaultSerializer,
  normalizeStorageError,
  resolveBrowserStorage,
  resolveStorageWindow,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  type BrowserStorageAreaReader,
  type BrowserStorageOptions,
  type BrowserStorageReturn,
  type BrowserStorageSerializer,
  type PendingStorageMutation,
  type SameDocumentNotification,
} from './browserStorageHelpers'
import {
  notifySameDocument,
  subscribeSameDocument,
} from './browserStorageRegistry'

export type {
  BrowserStorageAreaReader,
  BrowserStorageMergeDefaults,
  BrowserStorageOptions,
  BrowserStorageReturn,
  BrowserStorageSerializer,
} from './browserStorageHelpers'

function invokeOnError(
  onError: ((error: Error) => void) | undefined,
  error: Error,
): void {
  if (onError == null) {
    return
  }
  try {
    onError(error)
  } catch {
    // Match package callback-error conventions: do not suppress via console.
  }
}

function resolveSerializer<T>(
  custom: BrowserStorageSerializer<T> | undefined,
  defaultValue: T,
): BrowserStorageSerializer<T> {
  return custom ?? createDefaultSerializer(defaultValue)
}

/**
 * Private browser Storage engine for localStorage / sessionStorage hooks.
 *
 * Storage access is effect-only. Pre-ready setValue/remove/reset mutations are
 * tracked so a later initialization read cannot overwrite newer consumer state.
 */
export function useBrowserStorage<T>(
  key: string,
  defaultValue: T,
  readArea: BrowserStorageAreaReader,
  options?: BrowserStorageOptions<T>,
): BrowserStorageReturn<T> {
  const serializerOption = options?.serializer
  const mergeDefaultsOption = options?.mergeDefaults ?? false
  const writeDefaults = options?.writeDefaults ?? true
  const listenToStorageChanges = options?.listenToStorageChanges ?? true
  const windowOption = options?.window
  const onErrorOption = options?.onError

  const [value, setValueState] = useState<T>(defaultValue)
  const [isSupported, setIsSupported] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const valueRef = useRef(value)
  const keyRef = useRef(key)
  const isReadyRef = useRef(false)
  const latestRef = useRef({
    defaultValue,
    serializer: resolveSerializer(serializerOption, defaultValue),
    mergeDefaults: mergeDefaultsOption,
    writeDefaults,
    onError: onErrorOption,
  })
  const storageRef = useRef<Storage | null>(null)
  const generationRef = useRef(0)
  const pendingMutationRef = useRef<PendingStorageMutation>({ type: 'none' })
  const selfListenerRef = useRef<
    ((notification: SameDocumentNotification) => void) | null
  >(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    // Do not mirror `value` into valueRef here: a layout-phase setValue/remove/reset
    // can update valueRef before this passive effect runs, and overwriting it would
    // drop pre-ready mutations (especially under Strict Mode remount).
    keyRef.current = key
    isReadyRef.current = isReady
    latestRef.current = {
      defaultValue,
      serializer: resolveSerializer(serializerOption, defaultValue),
      mergeDefaults: mergeDefaultsOption,
      writeDefaults,
      onError: onErrorOption,
    }
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const reportError = useCallback((nextError: Error) => {
    if (!mountedRef.current) {
      return
    }
    setError(nextError)
    invokeOnError(latestRef.current.onError, nextError)
  }, [])

  const clearError = useCallback(() => {
    if (!mountedRef.current) {
      return
    }
    setError(null)
  }, [])

  const decodeRaw = useCallback(
    (
      raw: string,
      generation: number,
    ): { ok: true; value: T } | { ok: false } => {
      try {
        const decoded = latestRef.current.serializer.read(raw)
        let merged: T
        try {
          merged = applyMergeDefaults(
            decoded,
            latestRef.current.defaultValue,
            latestRef.current.mergeDefaults,
          )
        } catch (mergeError) {
          if (generation !== generationRef.current || !mountedRef.current) {
            return { ok: false }
          }
          reportError(normalizeStorageError(mergeError))
          return { ok: false }
        }
        if (generation !== generationRef.current || !mountedRef.current) {
          return { ok: false }
        }
        return { ok: true, value: merged }
      } catch (readError) {
        if (generation !== generationRef.current || !mountedRef.current) {
          return { ok: false }
        }
        reportError(normalizeStorageError(readError))
        return { ok: false }
      }
    },
    [reportError],
  )

  const applyExternalRaw = useCallback(
    (raw: string | null, generation: number) => {
      if (generation !== generationRef.current || !mountedRef.current) {
        return
      }
      if (raw == null) {
        const nextDefault = latestRef.current.defaultValue
        setValueState(nextDefault)
        valueRef.current = nextDefault
        clearError()
        return
      }
      const decoded = decodeRaw(raw, generation)
      if (generation !== generationRef.current || !mountedRef.current) {
        return
      }
      if (!decoded.ok) {
        const nextDefault = latestRef.current.defaultValue
        setValueState(nextDefault)
        valueRef.current = nextDefault
        return
      }
      setValueState(decoded.value)
      valueRef.current = decoded.value
      clearError()
    },
    [clearError, decodeRaw],
  )

  const persistCurrentValue = useCallback(
    (storage: Storage, activeKey: string) => {
      try {
        const raw = latestRef.current.serializer.write(valueRef.current)
        const writeResult = safeSetItem(storage, activeKey, raw)
        if (!writeResult.ok) {
          reportError(writeResult.error)
          return false
        }
        clearError()
        notifySameDocument(
          storage,
          activeKey,
          { type: 'write', raw },
          selfListenerRef.current ?? undefined,
        )
        return true
      } catch (writeError) {
        reportError(normalizeStorageError(writeError))
        return false
      }
    },
    [clearError, reportError],
  )

  const initializeFromStorage = useCallback(
    (storage: Storage | null, activeKey: string, generation: number) => {
      if (generation !== generationRef.current || !mountedRef.current) {
        return
      }

      const pending = pendingMutationRef.current

      if (storage == null) {
        setIsSupported(false)
        // Keep any pre-ready consumer mutation; only seed the default when idle.
        if (pending.type === 'none') {
          const nextDefault = latestRef.current.defaultValue
          setValueState(nextDefault)
          valueRef.current = nextDefault
        }
        pendingMutationRef.current = { type: 'none' }
        setIsReady(true)
        return
      }

      setIsSupported(true)

      // A newer setValue/remove/reset must win over the initialization read.
      if (pending.type === 'write') {
        pendingMutationRef.current = { type: 'none' }
        persistCurrentValue(storage, activeKey)
        setIsReady(true)
        return
      }

      if (pending.type === 'remove') {
        pendingMutationRef.current = { type: 'none' }
        const result = safeRemoveItem(storage, activeKey)
        if (!result.ok) {
          reportError(result.error)
        } else {
          clearError()
          notifySameDocument(
            storage,
            activeKey,
            { type: 'remove' },
            selfListenerRef.current ?? undefined,
          )
        }
        setIsReady(true)
        return
      }

      const readResult = safeGetItem(storage, activeKey)
      if (generation !== generationRef.current || !mountedRef.current) {
        return
      }

      // Re-check pending: a mutation may have landed during getItem.
      const pendingAfterRead = pendingMutationRef.current
      if (pendingAfterRead.type === 'write') {
        pendingMutationRef.current = { type: 'none' }
        persistCurrentValue(storage, activeKey)
        setIsReady(true)
        return
      }
      if (pendingAfterRead.type === 'remove') {
        pendingMutationRef.current = { type: 'none' }
        const result = safeRemoveItem(storage, activeKey)
        if (!result.ok) {
          reportError(result.error)
        } else {
          clearError()
          notifySameDocument(
            storage,
            activeKey,
            { type: 'remove' },
            selfListenerRef.current ?? undefined,
          )
        }
        setIsReady(true)
        return
      }

      if (!readResult.ok) {
        reportError(readResult.error)
        const nextDefault = latestRef.current.defaultValue
        setValueState(nextDefault)
        valueRef.current = nextDefault
        setIsReady(true)
        return
      }

      if (readResult.value == null) {
        const nextDefault = latestRef.current.defaultValue
        setValueState(nextDefault)
        valueRef.current = nextDefault
        clearError()
        if (latestRef.current.writeDefaults) {
          try {
            const raw = latestRef.current.serializer.write(nextDefault)
            const writeResult = safeSetItem(storage, activeKey, raw)
            if (!writeResult.ok) {
              reportError(writeResult.error)
            } else {
              clearError()
            }
          } catch (writeError) {
            reportError(normalizeStorageError(writeError))
          }
        }
        setIsReady(true)
        return
      }

      const decoded = decodeRaw(readResult.value, generation)
      if (generation !== generationRef.current || !mountedRef.current) {
        return
      }
      if (pendingMutationRef.current.type !== 'none') {
        // Mutation won during decode; reconcile via pending path next tick by
        // re-entering through the pending branches already handled above.
        const latePending = pendingMutationRef.current
        pendingMutationRef.current = { type: 'none' }
        if (latePending.type === 'write') {
          persistCurrentValue(storage, activeKey)
        } else if (latePending.type === 'remove') {
          const result = safeRemoveItem(storage, activeKey)
          if (!result.ok) {
            reportError(result.error)
          } else {
            clearError()
            notifySameDocument(
              storage,
              activeKey,
              { type: 'remove' },
              selfListenerRef.current ?? undefined,
            )
          }
        }
        setIsReady(true)
        return
      }
      if (!decoded.ok) {
        const nextDefault = latestRef.current.defaultValue
        setValueState(nextDefault)
        valueRef.current = nextDefault
        setIsReady(true)
        return
      }

      setValueState(decoded.value)
      valueRef.current = decoded.value
      clearError()
      setIsReady(true)
    },
    [clearError, decodeRaw, persistCurrentValue, reportError],
  )

  useEffect(() => {
    const generation = ++generationRef.current
    /* eslint-disable react-hooks/set-state-in-effect -- storage rebind readiness */
    setIsReady(false)
    /* eslint-enable react-hooks/set-state-in-effect */

    const targetWindow = resolveStorageWindow(windowOption)
    const storage = resolveBrowserStorage(targetWindow, readArea)
    storageRef.current = storage

    initializeFromStorage(storage, key, generation)

    let unsubscribeRegistry: (() => void) | undefined
    let onStorage: ((event: StorageEvent) => void) | undefined

    if (storage != null) {
      // `listenToStorageChanges` controls both same-document registry fan-out
      // and native `storage` events for a consistent sync switch.
      if (listenToStorageChanges) {
        const listener = (notification: SameDocumentNotification) => {
          if (generation !== generationRef.current || !mountedRef.current) {
            return
          }
          if (notification.type === 'remove') {
            applyExternalRaw(null, generation)
            return
          }
          applyExternalRaw(notification.raw, generation)
        }
        selfListenerRef.current = listener
        unsubscribeRegistry = subscribeSameDocument(storage, key, listener)

        if (targetWindow != null) {
          onStorage = (event: StorageEvent) => {
            if (generation !== generationRef.current || !mountedRef.current) {
              return
            }
            if (event.storageArea !== storage) {
              return
            }
            if (event.key !== null && event.key !== key) {
              return
            }
            applyExternalRaw(event.newValue, generation)
          }
          targetWindow.addEventListener('storage', onStorage)
        }
      } else {
        selfListenerRef.current = null
      }
    } else {
      selfListenerRef.current = null
    }

    return () => {
      unsubscribeRegistry?.()
      if (onStorage != null && targetWindow != null) {
        targetWindow.removeEventListener('storage', onStorage)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional live generation check
      if (generation === generationRef.current) {
        selfListenerRef.current = null
        storageRef.current = null
      }
    }
  }, [
    key,
    readArea,
    windowOption,
    listenToStorageChanges,
    applyExternalRaw,
    initializeFromStorage,
  ])

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (updater) => {
      const current = valueRef.current
      const next =
        typeof updater === 'function'
          ? (updater as (previous: T) => T)(current)
          : updater

      // Skip only when fully bound and the committed value is unchanged.
      // Before readiness (or after Strict Mode remount resets state while
      // valueRef is still warm), still mark a pending write so init cannot
      // overwrite a newer consumer intent.
      const isBound = storageRef.current != null && isReadyRef.current
      if (Object.is(current, next) && isBound) {
        return
      }

      valueRef.current = next
      setValueState(next)
      pendingMutationRef.current = { type: 'write' }

      const storage = storageRef.current
      const activeKey = keyRef.current
      if (storage == null) {
        return
      }

      if (persistCurrentValue(storage, activeKey)) {
        pendingMutationRef.current = { type: 'none' }
      }
    },
    [persistCurrentValue],
  )

  const remove = useCallback(() => {
    const nextDefault = latestRef.current.defaultValue
    valueRef.current = nextDefault
    setValueState(nextDefault)
    pendingMutationRef.current = { type: 'remove' }

    const storage = storageRef.current
    const activeKey = keyRef.current
    if (storage == null) {
      return
    }

    const result = safeRemoveItem(storage, activeKey)
    if (!result.ok) {
      reportError(result.error)
      return
    }
    pendingMutationRef.current = { type: 'none' }
    clearError()
    notifySameDocument(
      storage,
      activeKey,
      { type: 'remove' },
      selfListenerRef.current ?? undefined,
    )
  }, [clearError, reportError])

  const reset = useCallback(() => {
    const nextDefault = latestRef.current.defaultValue
    valueRef.current = nextDefault
    setValueState(nextDefault)
    pendingMutationRef.current = { type: 'write' }

    const storage = storageRef.current
    const activeKey = keyRef.current
    if (storage == null) {
      return
    }

    if (persistCurrentValue(storage, activeKey)) {
      pendingMutationRef.current = { type: 'none' }
    }
  }, [persistCurrentValue])

  return {
    value,
    setValue,
    remove,
    reset,
    isSupported,
    isReady,
    error,
  }
}
