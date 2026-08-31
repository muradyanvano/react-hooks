import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  canGetDisplayMedia,
  createDefaultDisplayConstraints,
  getMediaDevicesForDisplay,
  isDisplayMediaSupported,
  normalizeDisplayMediaError,
  stopMediaStreamTracks,
} from './displayMediaHelpers'

export interface UseDisplayMediaOptions {
  enabled?: boolean
  video?: boolean | MediaTrackConstraints
  audio?: boolean | MediaTrackConstraints
}

export interface UseDisplayMediaReturn {
  isSupported: boolean
  stream: MediaStream | null
  isSharing: boolean
  isLoading: boolean
  error: Error | null
  start: () => Promise<MediaStream | null>
  stop: () => void
}

const DEFAULT_ENABLED = false

type ShareOrigin = 'none' | 'declarative' | 'imperative'

type TrackEndedListener = () => void

/**
 * Manages browser screen capture through `navigator.mediaDevices.getDisplayMedia`.
 * Prefer imperative `start()` from a user gesture; `enabled` is an advanced
 * declarative activation signal that may be blocked without one.
 */
export function useDisplayMedia(
  options?: UseDisplayMediaOptions,
): UseDisplayMediaReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const defaults = createDefaultDisplayConstraints()
  const video = options?.video ?? defaults.video
  const audio = options?.audio ?? defaults.audio

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const isSupported = isDisplayMediaSupported()

  const latestRef = useRef({
    enabled,
    video,
    audio,
  })

  const streamRef = useRef<MediaStream | null>(null)
  const shareOriginRef = useRef<ShareOrigin>('none')
  const requestGenerationRef = useRef(0)
  const loadingCountRef = useRef(0)
  const mountedRef = useRef(true)
  const trackListenersRef = useRef<Map<MediaStreamTrack, TrackEndedListener>>(
    new Map(),
  )
  const endingStreamRef = useRef<MediaStream | null>(null)
  const autoStartKeyRef = useRef<string | null>(null)

  useEffect(() => {
    latestRef.current = {
      enabled,
      video,
      audio,
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
    for (const track of target.getTracks()) {
      const listener = trackListenersRef.current.get(track)
      if (listener != null) {
        track.removeEventListener('ended', listener)
        trackListenersRef.current.delete(track)
      }
    }
  }, [])

  const clearOwnedStream = useCallback(
    (target: MediaStream | null, options?: { stopTracks?: boolean }) => {
      if (target == null) {
        return
      }

      detachTrackListeners(target)
      if (options?.stopTracks !== false) {
        stopMediaStreamTracks(target)
      }
    },
    [detachTrackListeners],
  )

  const syncIdleState = useCallback(() => {
    streamRef.current = null
    shareOriginRef.current = 'none'
    if (mountedRef.current) {
      setStream(null)
      setIsSharing(false)
    }
  }, [])

  const handleOwnedTrackEnded = useCallback(
    (ownedStream: MediaStream) => {
      if (endingStreamRef.current === ownedStream) {
        return
      }

      if (streamRef.current !== ownedStream) {
        return
      }

      endingStreamRef.current = ownedStream
      clearOwnedStream(ownedStream, { stopTracks: true })
      endingStreamRef.current = null
      syncIdleState()
    },
    [clearOwnedStream, syncIdleState],
  )

  const attachTrackListeners = useCallback(
    (nextStream: MediaStream) => {
      for (const track of nextStream.getTracks()) {
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
    (nextStream: MediaStream, origin: ShareOrigin) => {
      const previous = streamRef.current
      if (previous != null && previous !== nextStream) {
        clearOwnedStream(previous, { stopTracks: true })
      }

      streamRef.current = nextStream
      shareOriginRef.current = origin
      attachTrackListeners(nextStream)

      if (mountedRef.current) {
        setStream(nextStream)
        setIsSharing(true)
        setError(null)
      }
    },
    [attachTrackListeners, clearOwnedStream],
  )

  const stop = useCallback(() => {
    const current = streamRef.current
    clearOwnedStream(current, { stopTracks: true })
    syncIdleState()
  }, [clearOwnedStream, syncIdleState])

  const startInternal = useCallback(
    async (origin: ShareOrigin): Promise<MediaStream | null> => {
      const mediaDevices = getMediaDevicesForDisplay()
      if (!canGetDisplayMedia(mediaDevices)) {
        if (mountedRef.current) {
          setError(
            new Error(
              'MediaDevices.getDisplayMedia is not available in this environment.',
            ),
          )
          setIsSharing(streamRef.current != null)
        }
        return null
      }

      const requestGeneration = ++requestGenerationRef.current
      const constraints: DisplayMediaStreamOptions = {
        video: latestRef.current.video,
        audio: latestRef.current.audio,
      }

      beginLoading()
      if (mountedRef.current) {
        setError(null)
      }

      try {
        const nextStream = await mediaDevices.getDisplayMedia(constraints)

        if (
          !mountedRef.current ||
          requestGeneration !== requestGenerationRef.current
        ) {
          stopMediaStreamTracks(nextStream)
          return null
        }

        installStream(nextStream, origin)
        return nextStream
      } catch (cause) {
        if (
          !mountedRef.current ||
          requestGeneration !== requestGenerationRef.current
        ) {
          return null
        }

        // Keep an existing active stream when a replacement request fails.
        if (mountedRef.current) {
          setError(normalizeDisplayMediaError(cause))
          setIsSharing(streamRef.current != null)
        }
        return null
      } finally {
        endLoading()
      }
    },
    [beginLoading, endLoading, installStream],
  )

  const start = useCallback((): Promise<MediaStream | null> => {
    return startInternal('imperative')
  }, [startInternal])

  useEffect(() => {
    mountedRef.current = true

    // After Strict Mode cleanup, React may still hold a stopped stream in state.
    if (streamRef.current == null) {
      setStream(null)
      setIsSharing(false)
      if (loadingCountRef.current === 0) {
        setIsLoading(false)
      }
    }

    return () => {
      mountedRef.current = false
      requestGenerationRef.current += 1
      loadingCountRef.current = 0
      autoStartKeyRef.current = null
      clearOwnedStream(streamRef.current, { stopTracks: true })
      streamRef.current = null
      shareOriginRef.current = 'none'
    }
  }, [clearOwnedStream])

  useEffect(() => {
    if (!enabled) {
      autoStartKeyRef.current = null
      if (shareOriginRef.current === 'declarative') {
        stop()
      }
      return
    }

    // One declarative attempt per enabled stretch. Reset on disable/unmount so
    // Strict Mode remounts and re-enables can request again without stacking.
    const requestKey = 'auto'
    if (autoStartKeyRef.current === requestKey) {
      return
    }
    autoStartKeyRef.current = requestKey

    void startInternal('declarative')
  }, [enabled, startInternal, stop])

  return useMemo(
    () => ({
      isSupported,
      stream,
      isSharing,
      isLoading,
      error,
      start,
      stop,
    }),
    [isSupported, stream, isSharing, isLoading, error, start, stop],
  )
}
