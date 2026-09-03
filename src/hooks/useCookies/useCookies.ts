import { useCallback, useEffect, useRef, useState } from 'react'

import {
  buildRemoveCookieAssignment,
  buildSetCookieAssignment,
  decodeCookieComponent,
  dependencySetTouches,
  diffCookieMaps,
  normalizeDependencies,
  normalizePollingInterval,
  parseCookieString,
  parseCookieValue,
  readDocumentCookie,
  resolveCookieDocument,
  serializeCookieValue,
  writeDocumentCookie,
  type CookieRawMap,
  type UseCookiesChange,
  type UseCookiesChangeListener,
  type UseCookiesGetOptions,
  type UseCookiesOptions,
  type UseCookiesReturn,
  type UseCookiesSetOptions,
} from './cookieHelpers'
import {
  publishCookieSnapshot,
  reconcileCookieDocumentObservation,
  seedCookieRegistryRaw,
  subscribeCookieDocument,
  type CookieRegistryNotification,
  type CookieRegistrySubscriber,
} from './cookieRegistry'

export type {
  UseCookiesChange,
  UseCookiesChangeListener,
  UseCookiesGetOptions,
  UseCookiesOptions,
  UseCookiesReturn,
  UseCookiesSameSite,
  UseCookiesSetOptions,
} from './cookieHelpers'

type PendingOperation = {
  assignment: string
  cause: 'set' | 'remove'
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
    // Contain onError exceptions.
  }
}

function mergeDependencyWatch(
  explicit: 'all' | 'none' | Set<string>,
  automatic: Set<string>,
  autoUpdate: boolean,
): 'all' | 'none' | Set<string> {
  if (explicit === 'all') {
    return 'all'
  }
  if (!autoUpdate || automatic.size === 0) {
    return explicit
  }
  if (explicit === 'none') {
    return new Set(automatic)
  }
  const merged = new Set(explicit)
  for (const name of automatic) {
    merged.add(name)
  }
  return merged
}

function mapToParsedRecord(
  map: CookieRawMap,
  doNotParse: boolean,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [name, raw] of map) {
    result[name] = parseCookieValue(raw, doNotParse)
  }
  return result
}

function rawFromMap(map: CookieRawMap): string {
  const pairs: string[] = []
  for (const [name, value] of map) {
    pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
  }
  return pairs.join('; ')
}

/**
 * Reactive browser cookie manager with SSR injection, same-document sync,
 * Cookie Store observation when available, and shared polling fallback.
 *
 * Cookies are not Web Storage. JavaScript cannot read or create HttpOnly cookies.
 */
export function useCookies(
  dependencies?: readonly string[] | null,
  options?: UseCookiesOptions,
): UseCookiesReturn {
  const doNotParseOption = options?.doNotParse ?? false
  const autoUpdateDependencies = options?.autoUpdateDependencies ?? false
  const documentOption = options?.document
  const initialCookies = options?.initialCookies
  const watchOption = options?.watch ?? true
  const pollingIntervalOption = normalizePollingInterval(
    options?.pollingInterval,
  )
  const onErrorOption = options?.onError

  const hasInitialCookies = typeof initialCookies === 'string'
  const initialRaw = hasInitialCookies ? initialCookies : ''
  const initialMap = parseCookieString(initialRaw)

  const [revision, setRevision] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [isReady, setIsReady] = useState(hasInitialCookies)
  const [error, setError] = useState<Error | null>(null)

  const rawRef = useRef(initialRaw)
  const mapRef = useRef<CookieRawMap>(initialMap)
  const explicitDepsRef = useRef(normalizeDependencies(dependencies))
  const autoNamesRef = useRef(new Set<string>())
  const changeListenersRef = useRef(new Set<UseCookiesChangeListener>())
  const pendingOpsRef = useRef<PendingOperation[]>([])
  const pendingRefreshRef = useRef(false)
  const generationRef = useRef(0)
  const mountedRef = useRef(true)
  const documentRef = useRef<Document | null>(null)
  const subscriberRef = useRef<CookieRegistrySubscriber | null>(null)

  const latestRef = useRef({
    doNotParse: doNotParseOption,
    autoUpdateDependencies,
    watch: watchOption,
    pollingInterval: pollingIntervalOption,
    onError: onErrorOption,
  })

  useEffect(() => {
    explicitDepsRef.current = normalizeDependencies(dependencies)
    latestRef.current = {
      doNotParse: doNotParseOption,
      autoUpdateDependencies,
      watch: watchOption,
      pollingInterval: pollingIntervalOption,
      onError: onErrorOption,
    }
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const reportError = useCallback((nextError: Error) => {
    setError(nextError)
    invokeOnError(latestRef.current.onError, nextError)
  }, [])

  const bumpIfNeeded = useCallback((changedNames: readonly string[]) => {
    const watch = mergeDependencyWatch(
      explicitDepsRef.current,
      autoNamesRef.current,
      latestRef.current.autoUpdateDependencies,
    )
    if (dependencySetTouches(watch, changedNames)) {
      setRevision((value) => value + 1)
    }
  }, [])

  const emitChanges = useCallback(
    (
      previousMap: CookieRawMap,
      nextMap: CookieRawMap,
      cause: UseCookiesChange['cause'],
      changedNames: readonly string[],
    ) => {
      const watch = mergeDependencyWatch(
        explicitDepsRef.current,
        autoNamesRef.current,
        latestRef.current.autoUpdateDependencies,
      )
      const doNotParse = latestRef.current.doNotParse
      for (const name of changedNames) {
        if (!dependencySetTouches(watch, [name])) {
          continue
        }
        const change: UseCookiesChange = {
          name,
          value: nextMap.has(name)
            ? parseCookieValue(nextMap.get(name) as string, doNotParse)
            : undefined,
          previousValue: previousMap.has(name)
            ? parseCookieValue(previousMap.get(name) as string, doNotParse)
            : undefined,
          cause,
        }
        for (const listener of [...changeListenersRef.current]) {
          try {
            listener(change)
          } catch {
            // Contain listener exceptions.
          }
        }
      }
    },
    [],
  )

  const applySnapshot = useCallback(
    (nextRaw: string, cause: UseCookiesChange['cause']) => {
      const previousRaw = rawRef.current
      const previousMap = mapRef.current
      if (previousRaw === nextRaw) {
        return
      }

      const nextMap = parseCookieString(nextRaw)
      const diff = diffCookieMaps(previousMap, nextMap)
      rawRef.current = nextRaw
      mapRef.current = nextMap

      if (diff.all.length > 0) {
        emitChanges(previousMap, nextMap, cause, diff.all)
        bumpIfNeeded(diff.all)
      }
    },
    [bumpIfNeeded, emitChanges],
  )

  const handleRegistryNotification = useCallback(
    (notification: CookieRegistryNotification) => {
      if (!mountedRef.current) {
        return
      }
      if (pendingOpsRef.current.length > 0 || pendingRefreshRef.current) {
        return
      }
      applySnapshot(notification.raw, notification.cause)
    },
    [applySnapshot],
  )

  const flushPendingOperations = useCallback(
    (targetDocument: Document): boolean => {
      const ops = pendingOpsRef.current
      pendingOpsRef.current = []
      let lastCause: 'set' | 'remove' = 'set'
      for (const op of ops) {
        const write = writeDocumentCookie(targetDocument, op.assignment)
        if (!write.ok) {
          reportError(write.error)
          return false
        }
        lastCause = op.cause
      }
      const read = readDocumentCookie(targetDocument)
      if (!read.ok) {
        reportError(read.error)
        return false
      }
      applySnapshot(read.raw, lastCause)
      publishCookieSnapshot(
        targetDocument,
        read.raw,
        lastCause,
        subscriberRef.current ?? undefined,
      )
      clearError()
      return true
    },
    [applySnapshot, clearError, reportError],
  )

  useEffect(() => {
    const generation = ++generationRef.current
    const changeListeners = changeListenersRef.current
    /* eslint-disable react-hooks/set-state-in-effect -- document bind readiness */
    if (!hasInitialCookies) {
      setIsReady(false)
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    const targetDocument = resolveCookieDocument(documentOption)
    documentRef.current = targetDocument

    const needsPolling =
      watchOption && normalizeDependencies(dependencies) !== 'none'

    let unsubscribe: (() => void) | undefined

    if (targetDocument != null) {
      const subscriber: CookieRegistrySubscriber = {
        onChange: handleRegistryNotification,
        needsPolling,
        pollingInterval: pollingIntervalOption,
      }
      subscriberRef.current = subscriber
      unsubscribe = subscribeCookieDocument(targetDocument, subscriber)
    } else {
      subscriberRef.current = null
      setIsSupported(false)
    }

    if (generation !== generationRef.current) {
      unsubscribe?.()
      return
    }

    if (targetDocument != null && pendingOpsRef.current.length > 0) {
      setIsSupported(true)
      flushPendingOperations(targetDocument)
      pendingRefreshRef.current = false
      setIsReady(true)
    } else if (pendingRefreshRef.current) {
      pendingRefreshRef.current = false
      if (targetDocument != null) {
        const read = readDocumentCookie(targetDocument)
        if (read.ok) {
          setIsSupported(true)
          applySnapshot(read.raw, 'external')
          seedCookieRegistryRaw(targetDocument, read.raw)
          clearError()
        } else {
          setIsSupported(false)
          reportError(read.error)
        }
      } else {
        setIsSupported(false)
      }
      setIsReady(true)
    } else if (targetDocument != null) {
      const read = readDocumentCookie(targetDocument)
      if (read.ok) {
        setIsSupported(true)
        applySnapshot(read.raw, 'external')
        seedCookieRegistryRaw(targetDocument, read.raw)
        clearError()
      } else {
        setIsSupported(false)
        reportError(read.error)
      }
      setIsReady(true)
    } else {
      setIsSupported(false)
      // Client resolved an explicit/omitted-unavailable document.
      // SSR never reaches this effect, so initial isReady stays false there.
      setIsReady(true)
    }

    return () => {
      unsubscribe?.()
      // eslint-disable-next-line react-hooks/exhaustive-deps -- compare live generation
      if (generation === generationRef.current) {
        subscriberRef.current = null
        documentRef.current = null
        changeListeners.clear()
      }
    }
  }, [
    applySnapshot,
    clearError,
    dependencies,
    documentOption,
    flushPendingOperations,
    handleRegistryNotification,
    hasInitialCookies,
    pollingIntervalOption,
    reportError,
    watchOption,
  ])

  useEffect(() => {
    const subscriber = subscriberRef.current
    const targetDocument = documentRef.current
    if (subscriber == null || targetDocument == null) {
      return
    }
    const needsPolling =
      watchOption && normalizeDependencies(dependencies) !== 'none'
    const nextInterval = pollingIntervalOption
    if (
      subscriber.needsPolling === needsPolling &&
      subscriber.pollingInterval === nextInterval
    ) {
      return
    }
    subscriber.needsPolling = needsPolling
    subscriber.pollingInterval = nextInterval
    reconcileCookieDocumentObservation(targetDocument)
  }, [dependencies, pollingIntervalOption, watchOption])

  const get = useCallback(
    <T = unknown>(
      name: string,
      getOptions?: UseCookiesGetOptions,
    ): T | undefined => {
      if (latestRef.current.autoUpdateDependencies) {
        autoNamesRef.current.add(name)
      }
      void revision
      const raw = mapRef.current.get(name)
      if (raw === undefined) {
        return undefined
      }
      const doNotParse = getOptions?.doNotParse ?? latestRef.current.doNotParse
      return parseCookieValue(raw, doNotParse) as T
    },
    [revision],
  )

  const getAll = useCallback(
    <T extends Record<string, unknown> = Record<string, unknown>>(
      getOptions?: UseCookiesGetOptions,
    ): T => {
      void revision
      const doNotParse = getOptions?.doNotParse ?? latestRef.current.doNotParse
      return mapToParsedRecord(mapRef.current, doNotParse) as T
    },
    [revision],
  )

  const set = useCallback(
    (
      name: string,
      value: unknown,
      setOptions?: UseCookiesSetOptions,
    ): boolean => {
      const built = buildSetCookieAssignment(name, value, setOptions)
      if (!built.ok) {
        reportError(built.error)
        return false
      }

      const serialized = serializeCookieValue(value)
      if (!serialized.ok) {
        reportError(serialized.error)
        return false
      }

      const targetDocument = documentRef.current
      if (targetDocument == null) {
        const previousMap = mapRef.current
        const nextMap = new Map(previousMap)
        nextMap.set(name, decodeCookieComponent(serialized.encodedValue))
        pendingOpsRef.current = [
          ...pendingOpsRef.current,
          { assignment: built.assignment, cause: 'set' },
        ]
        applySnapshot(rawFromMap(nextMap), 'set')
        return true
      }

      const write = writeDocumentCookie(targetDocument, built.assignment)
      if (!write.ok) {
        reportError(write.error)
        return false
      }

      const read = readDocumentCookie(targetDocument)
      if (!read.ok) {
        reportError(read.error)
        return false
      }

      applySnapshot(read.raw, 'set')
      publishCookieSnapshot(
        targetDocument,
        read.raw,
        'set',
        subscriberRef.current ?? undefined,
      )
      clearError()
      return true
    },
    [applySnapshot, clearError, reportError],
  )

  const remove = useCallback(
    (
      name: string,
      removeOptions?: Pick<UseCookiesSetOptions, 'path' | 'domain'>,
    ): boolean => {
      const built = buildRemoveCookieAssignment(name, removeOptions)
      if (!built.ok) {
        reportError(built.error)
        return false
      }

      const targetDocument = documentRef.current
      if (targetDocument == null) {
        const previousMap = mapRef.current
        const nextMap = new Map(previousMap)
        nextMap.delete(name)
        pendingOpsRef.current = [
          ...pendingOpsRef.current,
          { assignment: built.assignment, cause: 'remove' },
        ]
        applySnapshot(rawFromMap(nextMap), 'remove')
        return true
      }

      const write = writeDocumentCookie(targetDocument, built.assignment)
      if (!write.ok) {
        reportError(write.error)
        return false
      }

      const read = readDocumentCookie(targetDocument)
      if (!read.ok) {
        reportError(read.error)
        return false
      }

      applySnapshot(read.raw, 'remove')
      publishCookieSnapshot(
        targetDocument,
        read.raw,
        'remove',
        subscriberRef.current ?? undefined,
      )
      clearError()
      return true
    },
    [applySnapshot, clearError, reportError],
  )

  const refresh = useCallback(() => {
    const targetDocument = documentRef.current
    if (targetDocument == null) {
      pendingRefreshRef.current = true
      return
    }

    const read = readDocumentCookie(targetDocument)
    if (!read.ok) {
      reportError(read.error)
      return
    }

    applySnapshot(read.raw, 'external')
    publishCookieSnapshot(
      targetDocument,
      read.raw,
      'external',
      subscriberRef.current ?? undefined,
    )
    clearError()
  }, [applySnapshot, clearError, reportError])

  const addChangeListener = useCallback(
    (listener: UseCookiesChangeListener) => {
      changeListenersRef.current.add(listener)
      return () => {
        changeListenersRef.current.delete(listener)
      }
    },
    [],
  )

  const removeChangeListener = useCallback(
    (listener: UseCookiesChangeListener) => {
      changeListenersRef.current.delete(listener)
    },
    [],
  )

  return {
    get,
    getAll,
    set,
    remove,
    refresh,
    addChangeListener,
    removeChangeListener,
    isSupported,
    isReady,
    error,
  }
}
