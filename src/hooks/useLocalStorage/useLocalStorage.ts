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
  resolveLocalStorage,
  resolveStorageWindow,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  type SameDocumentNotification,
  type UseLocalStorageMergeDefaults,
  type UseLocalStorageSerializer,
} from './localStorageHelpers'
import {
  notifySameDocument,
  subscribeSameDocument,
} from './localStorageRegistry'

export type {
  UseLocalStorageMergeDefaults,
  UseLocalStorageSerializer,
} from './localStorageHelpers'

export interface UseLocalStorageOptions<T> {
  serializer?: UseLocalStorageSerializer<T>
  mergeDefaults?: UseLocalStorageMergeDefaults<T>
  writeDefaults?: boolean
  listenToStorageChanges?: boolean
  window?: Window | null
  onError?: (error: Error) => void
}

export interface UseLocalStorageReturn<T> {
  value: T
  setValue: Dispatch<SetStateAction<T>>
  remove: () => void
  reset: () => void
  isSupported: boolean
  isReady: boolean
  error: Error | null
}

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
  custom: UseLocalStorageSerializer<T> | undefined,
  defaultValue: T,
): UseLocalStorageSerializer<T> {
  return custom ?? createDefaultSerializer(defaultValue)
}

/**
 * Persist a value in `localStorage` with SSR-safe hydration, automatic
 * serialization, same-document registry sync, and optional cross-tab events.
 *
 * Browser storage is accessed only in effects. The first client render matches
 * the server (`value: defaultValue`, `isReady: false`, `isSupported: false`).
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options?: UseLocalStorageOptions<T>,
): UseLocalStorageReturn<T> {
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
  const latestRef = useRef({
    defaultValue,
    serializer: resolveSerializer(serializerOption, defaultValue),
    mergeDefaults: mergeDefaultsOption,
    writeDefaults,
    onError: onErrorOption,
  })
  const storageRef = useRef<Storage | null>(null)
  const generationRef = useRef(0)
  const selfListenerRef = useRef<
    ((notification: SameDocumentNotification) => void) | null
  >(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    valueRef.current = value
    keyRef.current = key
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

  const initializeFromStorage = useCallback(
    (storage: Storage | null, activeKey: string, generation: number) => {
      if (generation !== generationRef.current || !mountedRef.current) {
        return
      }

      if (storage == null) {
        setIsSupported(false)
        setIsReady(true)
        const nextDefault = latestRef.current.defaultValue
        setValueState(nextDefault)
        valueRef.current = nextDefault
        return
      }

      setIsSupported(true)

      const readResult = safeGetItem(storage, activeKey)
      if (generation !== generationRef.current || !mountedRef.current) {
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
    [clearError, decodeRaw, reportError],
  )

  useEffect(() => {
    const generation = ++generationRef.current
    // Mark not-ready while re-binding key/window so consumers can gate on
    // authoritative storage reads. Synchronous setState here mirrors other
    // capability hooks that reconcile browser APIs after commit.
    /* eslint-disable react-hooks/set-state-in-effect -- storage rebind readiness */
    setIsReady(false)
    /* eslint-enable react-hooks/set-state-in-effect */

    const targetWindow = resolveStorageWindow(windowOption)
    const storage = resolveLocalStorage(targetWindow)
    storageRef.current = storage

    initializeFromStorage(storage, key, generation)

    let unsubscribeRegistry: (() => void) | undefined
    let onStorage: ((event: StorageEvent) => void) | undefined

    if (storage != null) {
      // `listenToStorageChanges` controls both same-document registry fan-out
      // and native cross-tab `storage` events for a consistent sync switch.
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
            // `key === null` means clear(); treat as removal for this key.
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
      // Compare against the live generation so a superseded effect does not
      // clear the newer effect's storage ownership.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional live generation check
      if (generation === generationRef.current) {
        selfListenerRef.current = null
        storageRef.current = null
      }
    }
  }, [
    key,
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

      if (Object.is(current, next)) {
        return
      }

      valueRef.current = next
      setValueState(next)

      const storage = storageRef.current
      const activeKey = keyRef.current
      if (storage == null) {
        return
      }

      try {
        const raw = latestRef.current.serializer.write(next)
        const writeResult = safeSetItem(storage, activeKey, raw)
        if (!writeResult.ok) {
          reportError(writeResult.error)
          return
        }
        clearError()
        notifySameDocument(
          storage,
          activeKey,
          { type: 'write', raw },
          selfListenerRef.current ?? undefined,
        )
      } catch (writeError) {
        reportError(normalizeStorageError(writeError))
      }
    },
    [clearError, reportError],
  )

  const remove = useCallback(() => {
    const nextDefault = latestRef.current.defaultValue
    valueRef.current = nextDefault
    setValueState(nextDefault)

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

    const storage = storageRef.current
    const activeKey = keyRef.current
    if (storage == null) {
      return
    }

    try {
      const raw = latestRef.current.serializer.write(nextDefault)
      const writeResult = safeSetItem(storage, activeKey, raw)
      if (!writeResult.ok) {
        reportError(writeResult.error)
        return
      }
      clearError()
      notifySameDocument(
        storage,
        activeKey,
        { type: 'write', raw },
        selfListenerRef.current ?? undefined,
      )
    } catch (writeError) {
      reportError(normalizeStorageError(writeError))
    }
  }, [clearError, reportError])

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
