import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  DEFAULT_ENABLED,
  DEFAULT_MODE,
  DEFAULT_REMOVE_FALSY,
  DEFAULT_REMOVE_NULLISH,
  DEFAULT_WRITE,
  DEFAULT_WRITE_MODE,
  applyAppend,
  applyRemove,
  applySet,
  buildNextUrl,
  entriesEqual,
  invokeOnErrorSafely,
  mergeInitialWithUrl,
  normalizeError,
  normalizeInputRecord,
  normalizeInputValue,
  normalizeMode,
  normalizeScalarToken,
  normalizeStringifyOutput,
  normalizeWriteMode,
  readLocationParts,
  readUrlEntries,
  resolveOptionWindow,
  searchParamsFromEntries,
  snapshotFromEntries,
  type CanonicalEntry,
  type UseUrlSearchParamsInput,
  type UseUrlSearchParamsInputValue,
  type UseUrlSearchParamsMode,
  type UseUrlSearchParamsOptions,
  type UseUrlSearchParamsReturn,
  type UseUrlSearchParamsState,
  type UseUrlSearchParamsWriteMode,
} from './urlSearchParamsHelpers'
import {
  notifyUrlSearchParams,
  subscribeUrlSearchParams,
  type UrlSearchParamsListener,
} from './urlSearchParamsRegistry'

export type {
  UseUrlSearchParamsInput,
  UseUrlSearchParamsInputValue,
  UseUrlSearchParamsMode,
  UseUrlSearchParamsOptions,
  UseUrlSearchParamsReturn,
  UseUrlSearchParamsState,
  UseUrlSearchParamsStringify,
  UseUrlSearchParamsValue,
  UseUrlSearchParamsWriteMode,
} from './urlSearchParamsHelpers'

type ViewState = {
  entries: CanonicalEntry[]
  params: UseUrlSearchParamsState
  isReady: boolean
  error: Error | null
}

function viewFromEntries(
  entries: CanonicalEntry[],
  isReady: boolean,
  error: Error | null,
  previous?: ViewState,
): ViewState {
  if (
    previous != null &&
    previous.isReady === isReady &&
    previous.error === error &&
    entriesEqual(previous.entries, entries)
  ) {
    return previous
  }
  return {
    entries,
    params: snapshotFromEntries(entries),
    isReady,
    error,
  }
}

function emptyView(initial: CanonicalEntry[]): ViewState {
  return viewFromEntries(initial, false, null)
}

/**
 * Observes and updates URL search parameters for `history`, `hash`, or
 * `hash-params` modes using explicit immutable snapshots and stable controls.
 *
 * Defaults: `mode: 'history'`, `enabled: true`, `write: true`,
 * `writeMode: 'replace'`, `removeNullishValues: true`, `removeFalsyValues: false`.
 *
 * `initialValue` merges only on initial bind, mode/window rebind, and `reset()` —
 * not on `refresh()`, peer sync, or navigation rereads. Same-window peers sync via
 * a private registry; unrelated `history.pushState`/`replaceState` require `refresh()`.
 */
export function useUrlSearchParams(
  modeArgument: UseUrlSearchParamsMode = DEFAULT_MODE,
  options?: UseUrlSearchParamsOptions,
): UseUrlSearchParamsReturn {
  const mode = normalizeMode(modeArgument) ?? DEFAULT_MODE
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const write = options?.write ?? DEFAULT_WRITE
  const writeMode = normalizeWriteMode(options?.writeMode) ?? DEFAULT_WRITE_MODE
  const removeNullish = options?.removeNullishValues ?? DEFAULT_REMOVE_NULLISH
  const removeFalsy = options?.removeFalsyValues ?? DEFAULT_REMOVE_FALSY
  const effectiveRemoveNullish = removeNullish || removeFalsy
  const windowOption = options?.window
  const stringify = options?.stringify
  const initialValue = options?.initialValue

  const writerIdRef = useRef(Symbol('useUrlSearchParams'))
  const mountedRef = useRef(false)
  const lifecycleRef = useRef(0)
  const isReadyRef = useRef(false)
  /** True after local-only edits (`write: false` / disabled / null window). */
  const localOnlyDirtyRef = useRef(false)
  /** Names observed on the bound URL — used to avoid resurrecting removed keys. */
  const seenUrlNamesRef = useRef<Set<string>>(new Set())
  // Mount-only seed so the first client render matches SSR without reading refs.
  const initialEntries = useMemo(
    () =>
      normalizeInputRecord(
        options?.initialValue,
        (options?.removeNullishValues ?? DEFAULT_REMOVE_NULLISH) ||
          (options?.removeFalsyValues ?? DEFAULT_REMOVE_FALSY),
        options?.removeFalsyValues ?? DEFAULT_REMOVE_FALSY,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydration-stable seed
    [],
  )
  const entriesRef = useRef<CanonicalEntry[]>(initialEntries)
  const initialEntriesRef = useRef<CanonicalEntry[]>(initialEntries)
  const modeRef = useRef(mode)
  const enabledRef = useRef(enabled)
  const writeRef = useRef(write)
  const writeModeRef = useRef(writeMode)
  const removeNullishRef = useRef(effectiveRemoveNullish)
  const removeFalsyRef = useRef(removeFalsy)
  const windowOptionRef = useRef(windowOption)
  const stringifyRef = useRef(stringify)
  const onErrorRef = useRef(options?.onError)
  const boundWindowRef = useRef<Window | null>(null)

  const [state, setState] = useState<ViewState>(() => emptyView(initialEntries))

  useEffect(() => {
    modeRef.current = mode
    enabledRef.current = enabled
    writeRef.current = write
    writeModeRef.current = writeMode
    removeNullishRef.current = effectiveRemoveNullish
    removeFalsyRef.current = removeFalsy
    windowOptionRef.current = windowOption
    stringifyRef.current = stringify
    onErrorRef.current = options?.onError
  })

  useEffect(() => {
    initialEntriesRef.current = normalizeInputRecord(
      initialValue,
      removeNullishRef.current,
      removeFalsyRef.current,
    )
  }, [initialValue])

  const commitEntries = useCallback(
    (nextEntries: CanonicalEntry[], error: Error | null, ready: boolean) => {
      if (!mountedRef.current) {
        return
      }
      entriesRef.current = nextEntries
      isReadyRef.current = ready
      setState((previous) =>
        viewFromEntries(nextEntries, ready, error, previous),
      )
    },
    [],
  )

  const applyOwnedError = useCallback((error: Error) => {
    if (!mountedRef.current) {
      return
    }
    setState((previous) => ({
      ...previous,
      error,
    }))
    invokeOnErrorSafely(onErrorRef.current, error)
  }, [])

  const observeUrlEntries = useCallback((entries: CanonicalEntry[]) => {
    for (const entry of entries) {
      seenUrlNamesRef.current.add(entry.name)
    }
  }, [])

  const rebaseForWrite = useCallback(
    (local: CanonicalEntry[], url: CanonicalEntry[]): CanonicalEntry[] => {
      observeUrlEntries(url)
      // Keep instance-local soft defaults (initialValue keys never seen on the URL).
      // Keys previously observed on the URL follow the live URL (no resurrection).
      const soft = local.filter(
        (entry) => !seenUrlNamesRef.current.has(entry.name),
      )
      return [...soft, ...url]
    },
    [observeUrlEntries],
  )

  const writeEntriesToHistory = useCallback(
    (
      win: Window,
      currentMode: UseUrlSearchParamsMode,
      entries: CanonicalEntry[],
      method: UseUrlSearchParamsWriteMode,
    ): void => {
      const params = searchParamsFromEntries(entries)
      let body: string
      const custom = stringifyRef.current
      if (custom != null) {
        // Defensive copy so custom stringify cannot mutate our entries source.
        const forStringify = new URLSearchParams(params)
        body = normalizeStringifyOutput(custom(forStringify), currentMode)
      } else {
        body = params.toString()
      }

      const parts = readLocationParts(win)
      const nextUrl = buildNextUrl(parts, currentMode, body)
      const currentHref = `${parts.pathname}${parts.search}${parts.hash}`
      if (nextUrl === currentHref) {
        return
      }

      // Pass history.state through by identity — never clone or serialize it.
      const historyState = win.history.state
      if (method === 'push') {
        win.history.pushState(historyState, '', nextUrl)
      } else {
        win.history.replaceState(historyState, '', nextUrl)
      }
    },
    [],
  )

  const mutate = useCallback(
    (updater: (current: CanonicalEntry[]) => CanonicalEntry[]) => {
      const win = boundWindowRef.current
      const currentMode = modeRef.current
      const canWrite = enabledRef.current && writeRef.current && win != null

      let base = entriesRef.current
      if (canWrite && win != null && !localOnlyDirtyRef.current) {
        try {
          const urlEntries = readUrlEntries(win, currentMode)
          base = rebaseForWrite(entriesRef.current, urlEntries)
        } catch (cause) {
          applyOwnedError(normalizeError(cause))
          return
        }
      }

      const next = updater(base)
      if (entriesEqual(entriesRef.current, next) && entriesEqual(base, next)) {
        return
      }

      if (canWrite && win != null) {
        try {
          writeEntriesToHistory(win, currentMode, next, writeModeRef.current)
          const urlEntries = readUrlEntries(win, currentMode)
          observeUrlEntries(urlEntries)
          localOnlyDirtyRef.current = false
          commitEntries(urlEntries, null, true)
          notifyUrlSearchParams(win, currentMode, writerIdRef.current)
          return
        } catch (cause) {
          // Failed writes are atomic: keep previous bound state, set error only.
          applyOwnedError(normalizeError(cause))
          return
        }
      }

      localOnlyDirtyRef.current = true
      commitEntries(next, null, isReadyRef.current || win == null)
    },
    [
      applyOwnedError,
      commitEntries,
      observeUrlEntries,
      rebaseForWrite,
      writeEntriesToHistory,
    ],
  )

  // Mount / bind window+mode, listeners, registry.
  useEffect(() => {
    mountedRef.current = true
    const lifecycle = ++lifecycleRef.current
    const currentMode = mode
    const win = resolveOptionWindow(windowOption)
    boundWindowRef.current = win
    seenUrlNamesRef.current = new Set()
    localOnlyDirtyRef.current = false

    const applyFromLocation = (mergeInitial: boolean) => {
      if (
        lifecycle !== lifecycleRef.current ||
        !mountedRef.current ||
        !enabledRef.current
      ) {
        return
      }
      try {
        let next: CanonicalEntry[]
        if (win == null) {
          next = mergeInitial
            ? [...initialEntriesRef.current]
            : [...entriesRef.current]
        } else {
          const urlEntries = readUrlEntries(win, currentMode)
          observeUrlEntries(urlEntries)
          next = mergeInitial
            ? mergeInitialWithUrl(initialEntriesRef.current, urlEntries)
            : urlEntries
        }
        localOnlyDirtyRef.current = false
        commitEntries(next, null, true)
      } catch (cause) {
        applyOwnedError(normalizeError(cause))
      }
    }

    if (!enabled) {
      commitEntries(entriesRef.current, null, true)
      return () => {
        mountedRef.current = false
      }
    }

    // Merge initialValue only on bind / mode / window change — not on later rereads.
    applyFromLocation(true)

    let unsubscribeRegistry: (() => void) | undefined
    const onPeer: UrlSearchParamsListener = (notification) => {
      if (notification.writerId === writerIdRef.current) {
        return
      }
      if (notification.mode !== modeRef.current) {
        return
      }
      // Peer sync reads the canonical URL without resurrecting removed defaults.
      applyFromLocation(false)
    }

    if (win != null) {
      unsubscribeRegistry = subscribeUrlSearchParams(win, currentMode, onPeer)

      const onPopState = () => {
        if (lifecycle !== lifecycleRef.current) {
          return
        }
        applyFromLocation(false)
      }
      const onHashChange = () => {
        if (lifecycle !== lifecycleRef.current) {
          return
        }
        applyFromLocation(false)
      }

      win.addEventListener('popstate', onPopState)
      if (currentMode === 'hash' || currentMode === 'hash-params') {
        win.addEventListener('hashchange', onHashChange)
      }

      return () => {
        mountedRef.current = false
        win.removeEventListener('popstate', onPopState)
        if (currentMode === 'hash' || currentMode === 'hash-params') {
          win.removeEventListener('hashchange', onHashChange)
        }
        unsubscribeRegistry?.()
      }
    }

    return () => {
      mountedRef.current = false
      unsubscribeRegistry?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind on mode/window/enabled
  }, [mode, windowOption, enabled])

  const get = useCallback((name: string): string | null => {
    for (const entry of entriesRef.current) {
      if (entry.name === name) {
        return entry.value
      }
    }
    return null
  }, [])

  const getAll = useCallback((name: string): readonly string[] => {
    const values: string[] = []
    for (const entry of entriesRef.current) {
      if (entry.name === name) {
        values.push(entry.value)
      }
    }
    return Object.freeze(values)
  }, [])

  const has = useCallback((name: string): boolean => {
    return entriesRef.current.some((entry) => entry.name === name)
  }, [])

  const set = useCallback(
    (name: string, value: UseUrlSearchParamsInputValue) => {
      mutate((current) => {
        const tokens = normalizeInputValue(
          value,
          removeNullishRef.current,
          removeFalsyRef.current,
        )
        return applySet(current, name, tokens)
      })
    },
    [mutate],
  )

  const append = useCallback(
    (name: string, value: string | number | boolean) => {
      mutate((current) =>
        applyAppend(current, name, normalizeScalarToken(value)),
      )
    },
    [mutate],
  )

  const remove = useCallback(
    (name: string, value?: string) => {
      mutate((current) => applyRemove(current, name, value))
    },
    [mutate],
  )

  const setParams = useCallback(
    (params: UseUrlSearchParamsInput) => {
      mutate(() =>
        normalizeInputRecord(
          params,
          removeNullishRef.current,
          removeFalsyRef.current,
        ),
      )
    },
    [mutate],
  )

  const clear = useCallback(() => {
    mutate(() => [])
  }, [mutate])

  const reset = useCallback(() => {
    mutate(() => [...initialEntriesRef.current])
  }, [mutate])

  const refresh = useCallback(() => {
    if (!enabledRef.current) {
      return
    }
    const win = boundWindowRef.current
    try {
      // refresh() is an external reread: URL only, no initialValue resurrection.
      const next =
        win == null
          ? [...entriesRef.current]
          : (() => {
              const urlEntries = readUrlEntries(win, modeRef.current)
              observeUrlEntries(urlEntries)
              return urlEntries
            })()
      localOnlyDirtyRef.current = false
      commitEntries(next, null, true)
    } catch (cause) {
      applyOwnedError(normalizeError(cause))
    }
  }, [applyOwnedError, commitEntries, observeUrlEntries])

  const searchParams = useMemo(
    () => searchParamsFromEntries(state.entries),
    [state.entries],
  )

  return {
    params: state.params,
    searchParams,
    isReady: state.isReady,
    error: state.error,
    get,
    getAll,
    has,
    set,
    append,
    remove,
    setParams,
    clear,
    reset,
    refresh,
  }
}
