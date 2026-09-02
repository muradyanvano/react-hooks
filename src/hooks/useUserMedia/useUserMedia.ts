import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import {
  canGetUserMedia,
  collectStreamTracks,
  createConstraintsSignature,
  createDefaultUserMediaConstraints,
  getMediaDevicesForUserMedia,
  isUserMediaSupported,
  normalizeUserMediaError,
  stopMediaStreamTracks,
  streamHasLiveTrack,
} from './userMediaHelpers'

export interface UseUserMediaOptions {
  enabled?: boolean
  autoSwitch?: boolean
  constraints?: MediaStreamConstraints
}

export interface UseUserMediaReturn {
  isSupported: boolean
  stream: MediaStream | null
  isActive: boolean
  isLoading: boolean
  error: Error | null
  start: () => Promise<MediaStream | null>
  stop: () => void
  restart: () => Promise<MediaStream | null>
}

const DEFAULT_ENABLED = false
const DEFAULT_AUTO_SWITCH = true

type StreamOrigin = 'none' | 'declarative' | 'imperative'
type TrackEndedListener = () => void

/**
 * Manages camera/microphone capture through `navigator.mediaDevices.getUserMedia`.
 * Prefer imperative `start()` from a user gesture; `enabled` is an advanced
 * declarative activation signal that may be blocked without one.
 */
export function useUserMedia(
  options?: UseUserMediaOptions,
): UseUserMediaReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const autoSwitch = options?.autoSwitch ?? DEFAULT_AUTO_SWITCH
  const constraints =
    options?.constraints ?? createDefaultUserMediaConstraints()
  const constraintsSignature = createConstraintsSignature(constraints)

  const isSupported = useSyncExternalStore(
    () => () => {},
    () => isUserMediaSupported(),
    () => false,
  )
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const latestRef = useRef({
    enabled,
    autoSwitch,
    constraints,
  })

  const streamRef = useRef<MediaStream | null>(null)
  const originRef = useRef<StreamOrigin>('none')
  const requestGenerationRef = useRef(0)
  const loadingCountRef = useRef(0)
  const mountedRef = useRef(true)
  const trackListenersRef = useRef<Map<MediaStreamTrack, TrackEndedListener>>(
    new Map(),
  )
  const endingStreamRef = useRef<MediaStream | null>(null)
  const autoStartKeyRef = useRef<string | null>(null)
  const activeConstraintsSignatureRef = useRef<string | null>(null)
  const pendingConstraintsSignatureRef = useRef<string | null>(null)
  const failedDeclarativeSignatureRef = useRef<string | null>(null)
  const previousAutoSwitchRef = useRef(autoSwitch)

  useEffect(() => {
    latestRef.current = {
      enabled,
      autoSwitch,
      constraints,
    }
  })

  const beginLoading = useCallback(() => {
    loadingCountRef.current += 1
    if (mountedRef.current) {
      setIsLoading(true)
    }
  }, [])

  const endLoading = useCallback(() => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1)
    if (mountedRef.current && loadingCountRef.current === 0) {
      setIsLoading(false)
    }
  }, [])

  const detachTrackListeners = useCallback((target: MediaStream) => {
    for (const track of collectStreamTracks(target)) {
      const listener = trackListenersRef.current.get(track)
      if (listener != null) {
        try {
          track.removeEventListener('ended', listener)
        } catch {
          // Ignore detach failures on hostile tracks.
        }
        trackListenersRef.current.delete(track)
      }
    }
  }, [])

  const clearOwnedStream = useCallback(
    (target: MediaStream | null, clearOptions?: { stopTracks?: boolean }) => {
      if (target == null) {
        return
      }

      detachTrackListeners(target)
      if (clearOptions?.stopTracks !== false) {
        stopMediaStreamTracks(target)
      }
    },
    [detachTrackListeners],
  )

  const syncIdleState = useCallback(() => {
    streamRef.current = null
    originRef.current = 'none'
    activeConstraintsSignatureRef.current = null
    if (mountedRef.current) {
      setStream(null)
      setIsActive(false)
    }
  }, [])

  const publishActivity = useCallback((nextStream: MediaStream | null) => {
    const active = streamHasLiveTrack(nextStream)
    if (mountedRef.current) {
      setIsActive((previous) => (previous === active ? previous : active))
    }
    return active
  }, [])

  const handleOwnedTrackEnded = useCallback(
    (ownedStream: MediaStream) => {
      if (endingStreamRef.current === ownedStream) {
        return
      }

      if (streamRef.current !== ownedStream) {
        return
      }

      if (streamHasLiveTrack(ownedStream)) {
        publishActivity(ownedStream)
        return
      }

      endingStreamRef.current = ownedStream
      clearOwnedStream(ownedStream, { stopTracks: true })
      endingStreamRef.current = null
      syncIdleState()
    },
    [clearOwnedStream, publishActivity, syncIdleState],
  )

  const attachTrackListeners = useCallback(
    (nextStream: MediaStream) => {
      for (const track of collectStreamTracks(nextStream)) {
        const onEnded: TrackEndedListener = () => {
          handleOwnedTrackEnded(nextStream)
        }
        track.addEventListener('ended', onEnded)
        trackListenersRef.current.set(track, onEnded)
      }
    },
    [handleOwnedTrackEnded],
  )

  const installStream = useCallback(
    (
      nextStream: MediaStream,
      origin: StreamOrigin,
      constraintsSnapshot: MediaStreamConstraints,
    ) => {
      if (!streamHasLiveTrack(nextStream)) {
        clearOwnedStream(nextStream, { stopTracks: true })
        return false
      }

      const previous = streamRef.current
      if (previous != null && previous !== nextStream) {
        clearOwnedStream(previous, { stopTracks: true })
      }

      streamRef.current = nextStream
      originRef.current = origin
      activeConstraintsSignatureRef.current =
        createConstraintsSignature(constraintsSnapshot)
      attachTrackListeners(nextStream)

      if (mountedRef.current) {
        setStream(nextStream)
        setIsActive(true)
        setError(null)
      }
      return true
    },
    [attachTrackListeners, clearOwnedStream],
  )

  const stop = useCallback(() => {
    requestGenerationRef.current += 1
    pendingConstraintsSignatureRef.current = null
    const current = streamRef.current
    endingStreamRef.current = current
    clearOwnedStream(current, { stopTracks: true })
    endingStreamRef.current = null
    syncIdleState()
    loadingCountRef.current = 0
    if (mountedRef.current) {
      setIsLoading(false)
    }
  }, [clearOwnedStream, syncIdleState])

  const startInternal = useCallback(
    async (
      origin: StreamOrigin,
      mode: 'replace' | 'restart',
    ): Promise<MediaStream | null> => {
      const mediaDevices = getMediaDevicesForUserMedia()
      if (!canGetUserMedia(mediaDevices)) {
        return null
      }

      const constraintsSnapshot = latestRef.current.constraints
      const nextSignature = createConstraintsSignature(constraintsSnapshot)
      const requestGeneration = ++requestGenerationRef.current
      pendingConstraintsSignatureRef.current = nextSignature

      if (mode === 'restart') {
        const current = streamRef.current
        endingStreamRef.current = current
        clearOwnedStream(current, { stopTracks: true })
        endingStreamRef.current = null
        syncIdleState()
      }

      beginLoading()
      if (mountedRef.current) {
        setError(null)
      }

      try {
        const nextStream = await mediaDevices.getUserMedia(constraintsSnapshot)

        if (
          !mountedRef.current ||
          requestGeneration !== requestGenerationRef.current
        ) {
          stopMediaStreamTracks(nextStream)
          return null
        }

        pendingConstraintsSignatureRef.current = null
        const installed = installStream(nextStream, origin, constraintsSnapshot)
        if (!installed) {
          if (origin === 'declarative') {
            failedDeclarativeSignatureRef.current = nextSignature
          }
          return null
        }

        failedDeclarativeSignatureRef.current = null
        return nextStream
      } catch (cause) {
        if (
          !mountedRef.current ||
          requestGeneration !== requestGenerationRef.current
        ) {
          return null
        }

        pendingConstraintsSignatureRef.current = null
        if (origin === 'declarative') {
          failedDeclarativeSignatureRef.current = nextSignature
        }

        if (mountedRef.current) {
          setError(normalizeUserMediaError(cause))
          publishActivity(streamRef.current)
        }
        return null
      } finally {
        endLoading()
      }
    },
    [
      beginLoading,
      clearOwnedStream,
      endLoading,
      installStream,
      publishActivity,
      syncIdleState,
    ],
  )

  const start = useCallback((): Promise<MediaStream | null> => {
    return startInternal('imperative', 'replace')
  }, [startInternal])

  const restart = useCallback((): Promise<MediaStream | null> => {
    return startInternal('imperative', 'restart')
  }, [startInternal])

  useEffect(() => {
    mountedRef.current = true

    if (streamRef.current == null) {
      setStream(null)
      setIsActive(false)
      if (loadingCountRef.current === 0) {
        setIsLoading(false)
      }
    }

    return () => {
      mountedRef.current = false
      requestGenerationRef.current += 1
      loadingCountRef.current = 0
      autoStartKeyRef.current = null
      pendingConstraintsSignatureRef.current = null
      clearOwnedStream(streamRef.current, { stopTracks: true })
      streamRef.current = null
      originRef.current = 'none'
      activeConstraintsSignatureRef.current = null
    }
  }, [clearOwnedStream])

  useEffect(() => {
    if (!enabled) {
      autoStartKeyRef.current = null
      if (originRef.current === 'declarative') {
        stop()
      }
      return
    }

    if (streamRef.current != null) {
      autoStartKeyRef.current = 'auto'
      return
    }

    if (autoStartKeyRef.current === 'auto') {
      return
    }
    autoStartKeyRef.current = 'auto'

    void startInternal('declarative', 'replace')
  }, [enabled, startInternal, stop])

  useEffect(() => {
    const wasAutoSwitch = previousAutoSwitchRef.current
    previousAutoSwitchRef.current = autoSwitch

    if (!autoSwitch) {
      return
    }

    const activeSignature = activeConstraintsSignatureRef.current
    const pendingSignature = pendingConstraintsSignatureRef.current
    const hasActiveOrPending =
      streamRef.current != null || pendingSignature != null

    if (!hasActiveOrPending) {
      if (
        enabled &&
        failedDeclarativeSignatureRef.current != null &&
        failedDeclarativeSignatureRef.current !== constraintsSignature
      ) {
        failedDeclarativeSignatureRef.current = null
        void startInternal('declarative', 'replace')
      }
      return
    }

    if (
      activeSignature === constraintsSignature ||
      pendingSignature === constraintsSignature
    ) {
      // false → true with unchanged constraints: no restart.
      if (!wasAutoSwitch && autoSwitch) {
        return
      }
      return
    }

    const origin: StreamOrigin =
      originRef.current === 'none' ? 'imperative' : originRef.current
    void startInternal(origin, 'replace')
  }, [autoSwitch, constraintsSignature, enabled, startInternal])

  return useMemo(
    () => ({
      isSupported,
      stream,
      isActive,
      isLoading,
      error,
      start,
      stop,
      restart,
    }),
    [isSupported, stream, isActive, isLoading, error, start, stop, restart],
  )
}
