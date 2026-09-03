import { useCallback, useEffect, useRef, useState } from 'react'

import {
  calcTrickleIncrement,
  clampFinite,
  normalizeDuration,
  normalizeDurationStrict,
  normalizeHeight,
  normalizeMinimum,
  normalizeZIndex,
  resolveEffectiveDocument,
  resolveEffectiveParent,
} from './nProgressHelpers'

import {
  acquireOwner,
  cancelCompletion,
  completeOwner,
  createOwnerToken,
  evictOwner,
  getOwnerProgress,
  isOwnerActive,
  releaseOwner,
  updateOwner,
  type ChannelOptions,
  type OwnerToken,
} from './nProgressManager'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface UseNProgressOptions {
  minimum?: number
  easing?: string
  speed?: number
  trickle?: boolean
  trickleSpeed?: number
  showSpinner?: boolean
  color?: string
  height?: number
  zIndex?: number
  removeDelay?: number
  ariaLabel?: string
  document?: Document | null
  parent?: HTMLElement | null
}

export interface UseNProgressReturn {
  isLoading: boolean
  progress: number | null
  start: () => void
  set: (value: number) => void
  increment: (amount?: number) => void
  done: (force?: boolean) => void
  remove: () => void
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function resolveChannelOptions(
  options: UseNProgressOptions | undefined,
): ChannelOptions {
  return {
    minimum: normalizeMinimum(options?.minimum),
    easing:
      typeof options?.easing === 'string' && options.easing.trim().length > 0
        ? options.easing
        : 'ease',
    speed: normalizeDurationStrict(options?.speed, 200),
    trickle: options?.trickle !== false,
    trickleSpeed: normalizeDurationStrict(options?.trickleSpeed, 200),
    showSpinner: options?.showSpinner !== false,
    color:
      typeof options?.color === 'string' && options.color.trim().length > 0
        ? options.color
        : '#4f46e5',
    height: normalizeHeight(options?.height),
    zIndex: normalizeZIndex(options?.zIndex),
    removeDelay: normalizeDuration(options?.removeDelay, 200),
    ariaLabel:
      typeof options?.ariaLabel === 'string' &&
      options.ariaLabel.trim().length > 0
        ? options.ariaLabel
        : 'Page loading progress',
  }
}

function isBrowserEnvironment(): boolean {
  return typeof document !== 'undefined'
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Package-native top-of-page progress indicator.
 *
 * `currentProgress` semantics:
 * - `undefined`:   imperative mode; start/set/increment/done/remove control this instance
 * - `null`:        declaratively complete (equivalent to done())
 * - `< 1`:         declaratively activate and set to this normalized progress
 * - `>= 1`:        declaratively complete
 * - NaN/Infinity:  ignored; keep previous coherent state
 *
 * SSR: returns idle state with safe no-op methods. All DOM work runs in effects.
 */
export function useNProgress(
  currentProgress?: number | null,
  options?: UseNProgressOptions,
): UseNProgressReturn {
  // Per-instance state
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  // Stable owner token (never changes for this hook instance)
  const tokenRef = useRef<OwnerToken | null>(null)
  if (tokenRef.current === null) {
    tokenRef.current = createOwnerToken()
  }

  // Latest options ref (avoids stale closures without re-registering)
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  // Current channel ref (for imperative methods and cleanup)
  const channelRef = useRef<ReturnType<typeof acquireOwner> | null>(null)

  // Track whether we're mounted (SSR guard)
  const mountedRef = useRef(false)

  // Track whether this owner is currently in a completion phase (prevents re-triggering)
  const completingRef = useRef(false)

  // Resolved document/parent from latest effect
  const resolvedDocRef = useRef<Document | null>(null)
  const resolvedParentRef = useRef<HTMLElement | null>(null)

  // ── Stable helper: get latest channel options ─────────────────────────────
  const getOptions = useCallback((): ChannelOptions => {
    return resolveChannelOptions(optionsRef.current)
  }, [])

  // ── Stable helper: get current effective doc/parent ──────────────────────
  const getContext = useCallback((): {
    doc: Document | null
    parent: HTMLElement | null
  } => {
    if (!isBrowserEnvironment()) return { doc: null, parent: null }
    const optDoc = optionsRef.current?.document
    const optParent = optionsRef.current?.parent
    const globalDoc = typeof document !== 'undefined' ? document : null
    const doc = resolveEffectiveDocument(optDoc, globalDoc)
    const parent = doc != null ? resolveEffectiveParent(optParent, doc) : null
    return { doc, parent }
  }, [])

  // ── Internal: set this owner's progress state (atomic) ───────────────────
  const setOwnerState = useCallback((p: number | null, loading: boolean) => {
    setProgress((prev) => (Object.is(prev, p) ? prev : p))
    setIsLoading((prev) => (prev === loading ? prev : loading))
  }, [])

  // ── Internal: release this owner from the current channel ─────────────────
  const releaseFromChannel = useCallback(() => {
    const channel = channelRef.current
    const token = tokenRef.current!
    if (channel == null) return
    evictOwner(channel, token)
    channelRef.current = null
  }, [])

  // ── Mount/unmount effect ──────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      releaseFromChannel()
    }
  }, [releaseFromChannel])

  // ── Context synchronization effect ───────────────────────────────────────
  // Runs every render so it can react to doc/parent option changes
  useEffect(() => {
    if (!isBrowserEnvironment()) return

    const { doc, parent } = getContext()

    const prevDoc = resolvedDocRef.current
    const prevParent = resolvedParentRef.current

    // If context didn't change, nothing to do
    if (Object.is(prevDoc, doc) && Object.is(prevParent, parent)) return

    // Context changed — release from old channel
    const channel = channelRef.current
    const token = tokenRef.current!
    if (channel != null) {
      evictOwner(channel, token)
      channelRef.current = null
    }

    resolvedDocRef.current = doc
    resolvedParentRef.current = parent
  })

  // ── Declarative currentProgress synchronization ───────────────────────────
  useEffect(() => {
    if (!isBrowserEnvironment()) return

    // undefined → imperative mode; if switching from declarative, leave current state
    if (currentProgress === undefined) return

    // null → declaratively complete
    if (currentProgress === null) {
      // Only call done if currently active and not already completing
      if (isLoading && !completingRef.current) {
        const { doc, parent } = getContext()
        if (doc == null || parent == null) {
          // No DOM context; remain idle (state will reconcile on next update)
          return
        }
        const token = tokenRef.current!
        const opts = getOptions()
        if (channelRef.current == null) return
        completingRef.current = true
        completeOwner(channelRef.current, token, opts, () => {
          completingRef.current = false
          if (mountedRef.current) setOwnerState(null, false)
        })
        setOwnerState(1, true)
      }
      return
    }

    // Invalid number → ignore
    if (!Number.isFinite(currentProgress)) return

    // >= 1 → complete
    if (currentProgress >= 1) {
      // Only trigger completion once per >=1 transition; re-renders re-use the same timer
      if (completingRef.current) return

      const { doc, parent } = getContext()
      if (doc == null || parent == null) {
        // No DOM context; cannot show completion indicator
        return
      }
      const token = tokenRef.current!
      const opts = getOptions()
      const minimum = opts.minimum

      if (channelRef.current == null) {
        // Acquire first to show completion
        channelRef.current = acquireOwner(doc, parent, token, opts, minimum)
        setOwnerState(minimum, true)
      }
      completingRef.current = true
      completeOwner(channelRef.current, token, opts, () => {
        completingRef.current = false
        if (mountedRef.current) setOwnerState(null, false)
      })
      // Functional updater guards prevent cascading renders when value is unchanged.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOwnerState(1, true)
      return
    }

    // New < 1 value: reset completing flag (owner is back to active progress)
    completingRef.current = false

    // Finite < 1 → set declarative progress
    const { doc, parent } = getContext()
    if (doc == null || parent == null) return

    const token = tokenRef.current!
    const opts = getOptions()
    const minimum = opts.minimum
    const normalized = Math.max(minimum, Math.min(0.999, currentProgress))

    if (channelRef.current == null) {
      // Acquire new channel
      channelRef.current = acquireOwner(doc, parent, token, opts, normalized)
    } else {
      cancelCompletion(channelRef.current, token)
      updateOwner(channelRef.current, token, normalized, opts)
    }
    setOwnerState(normalized, true)
  })

  // ─── Imperative methods ────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (!isBrowserEnvironment()) return
    const token = tokenRef.current!
    const opts = getOptions()
    const minimum = opts.minimum

    const { doc, parent } = getContext()
    if (doc == null || parent == null) return

    const channel = channelRef.current

    // Always cancel any pending completion (e.g. restart during done())
    completingRef.current = false
    if (channel != null) {
      cancelCompletion(channel, token)
    }

    if (channel != null && isOwnerActive(channel, token)) {
      // Already active after cancelling completion — update options only
      updateOwner(
        channel,
        token,
        getOwnerProgress(channel, token) ?? minimum,
        opts,
      )
      return
    }

    channelRef.current = acquireOwner(doc, parent, token, opts, minimum)
    setOwnerState(minimum, true)
  }, [getOptions, getContext, setOwnerState])

  const set = useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return
      if (!isBrowserEnvironment()) return

      const token = tokenRef.current!
      const opts = getOptions()
      const minimum = opts.minimum
      const clamped = clampFinite(value, 0, 1, minimum)

      const { doc, parent } = getContext()
      if (doc == null || parent == null) return

      if (clamped >= 1) {
        // done()
        if (channelRef.current == null) {
          channelRef.current = acquireOwner(doc, parent, token, opts, minimum)
          setOwnerState(minimum, true)
        } else {
          cancelCompletion(channelRef.current, token)
        }
        completeOwner(channelRef.current, token, opts, () => {
          if (mountedRef.current) setOwnerState(null, false)
        })
        setOwnerState(1, true)
        return
      }

      const displayed = Math.max(minimum, clamped)

      if (channelRef.current == null) {
        channelRef.current = acquireOwner(doc, parent, token, opts, displayed)
      } else {
        cancelCompletion(channelRef.current, token)
        updateOwner(channelRef.current, token, displayed, opts)
      }
      setOwnerState(displayed, true)
    },
    [getOptions, getContext, setOwnerState],
  )

  const increment = useCallback(
    (amount?: number) => {
      if (!isBrowserEnvironment()) return
      const token = tokenRef.current!
      const opts = getOptions()
      const minimum = opts.minimum

      const { doc, parent } = getContext()
      if (doc == null || parent == null) return

      const channel = channelRef.current
      const currentProg =
        channel != null ? getOwnerProgress(channel, token) : null

      const base = currentProg ?? minimum
      let delta: number

      if (amount !== undefined) {
        if (!Number.isFinite(amount)) return
        delta = amount
      } else {
        delta = calcTrickleIncrement(base)
      }

      const next = Math.min(0.994, base + delta)
      const displayed = Math.max(minimum, next)

      if (channelRef.current == null) {
        channelRef.current = acquireOwner(doc, parent, token, opts, displayed)
      } else {
        cancelCompletion(channelRef.current, token)
        updateOwner(channelRef.current, token, displayed, opts)
      }
      setOwnerState(displayed, true)
    },
    [getOptions, getContext, setOwnerState],
  )

  const done = useCallback(
    (force = false) => {
      if (!isBrowserEnvironment()) return
      const token = tokenRef.current!
      const opts = getOptions()
      const minimum = opts.minimum

      const { doc, parent } = getContext()

      const channel = channelRef.current
      const active = channel != null && isOwnerActive(channel, token)

      if (!active) {
        if (!force) return
        // force: briefly show a complete bar
        if (doc == null || parent == null) return
        channelRef.current = acquireOwner(doc, parent, token, opts, minimum)
        setOwnerState(minimum, true)
        completeOwner(channelRef.current, token, opts, () => {
          if (mountedRef.current) setOwnerState(null, false)
        })
        setOwnerState(1, true)
        return
      }

      completeOwner(channel!, token, opts, () => {
        if (mountedRef.current) setOwnerState(null, false)
      })
      setOwnerState(1, true)
    },
    [getOptions, getContext, setOwnerState],
  )

  const remove = useCallback(() => {
    if (!isBrowserEnvironment()) return
    const token = tokenRef.current!
    const channel = channelRef.current

    if (channel == null) return

    completingRef.current = false
    releaseOwner(channel, token)
    channelRef.current = null
    setOwnerState(null, false)
  }, [setOwnerState])

  return {
    isLoading,
    progress,
    start,
    set,
    increment,
    done,
    remove,
  }
}
