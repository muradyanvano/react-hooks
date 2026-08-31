import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  canRequestUserMedia,
  createDefaultConstraints,
  getMediaDevices,
  groupMediaDevices,
  normalizeMediaDevicesError,
  stopMediaStreamTracks,
} from './mediaDevicesHelpers'

export type UseDevicesListUpdatedHandler = (
  devices: readonly MediaDeviceInfo[],
) => void

export interface UseDevicesListOptions {
  enabled?: boolean
  requestPermissions?: boolean
  constraints?: MediaStreamConstraints
  onUpdated?: UseDevicesListUpdatedHandler
}

export interface UseDevicesListReturn {
  isSupported: boolean
  devices: readonly MediaDeviceInfo[]
  videoInputs: readonly MediaDeviceInfo[]
  audioInputs: readonly MediaDeviceInfo[]
  audioOutputs: readonly MediaDeviceInfo[]
  permissionGranted: boolean
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  ensurePermissions: () => Promise<boolean>
}

const DEFAULT_ENABLED = true
const DEFAULT_REQUEST_PERMISSIONS = false

/**
 * Provides a reactive list of available media devices via
 * `navigator.mediaDevices`, with manual refresh and an explicit permission
 * workflow that immediately stops temporary tracks.
 */
export function useDevicesList(
  options?: UseDevicesListOptions,
): UseDevicesListReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const requestPermissions =
    options?.requestPermissions ?? DEFAULT_REQUEST_PERMISSIONS

  const [devices, setDevices] = useState<readonly MediaDeviceInfo[]>([])
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const isSupported = getMediaDevices() != null

  const latestRef = useRef({
    enabled,
    constraints: options?.constraints ?? createDefaultConstraints(),
    onUpdated: options?.onUpdated,
  })

  const lifecycleGenerationRef = useRef(0)
  const enumerateGenerationRef = useRef(0)
  const permissionGenerationRef = useRef(0)
  const loadingCountRef = useRef(0)
  const autoRequestKeyRef = useRef<string | null>(null)

  useEffect(() => {
    latestRef.current = {
      enabled,
      constraints: options?.constraints ?? createDefaultConstraints(),
      onUpdated: options?.onUpdated,
    }
  })

  const beginLoading = useCallback(() => {
    loadingCountRef.current += 1
    setIsLoading(true)
  }, [])

  const endLoading = useCallback(() => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1)
    if (loadingCountRef.current === 0) {
      setIsLoading(false)
    }
  }, [])

  const refreshInternal = useCallback(
    async (lifecycleGeneration: number): Promise<boolean> => {
      const mediaDevices = getMediaDevices()
      if (mediaDevices == null) {
        return false
      }

      if (!latestRef.current.enabled) {
        return false
      }

      const enumerateGeneration = ++enumerateGenerationRef.current
      beginLoading()

      try {
        const nextDevices = await mediaDevices.enumerateDevices()

        if (
          lifecycleGeneration !== lifecycleGenerationRef.current ||
          enumerateGeneration !== enumerateGenerationRef.current ||
          !latestRef.current.enabled
        ) {
          return false
        }

        const snapshot = Object.freeze([...nextDevices])
        setDevices(snapshot)
        setError(null)
        latestRef.current.onUpdated?.(snapshot)
        return true
      } catch (cause) {
        if (
          lifecycleGeneration !== lifecycleGenerationRef.current ||
          enumerateGeneration !== enumerateGenerationRef.current ||
          !latestRef.current.enabled
        ) {
          return false
        }

        setError(normalizeMediaDevicesError(cause))
        return false
      } finally {
        endLoading()
      }
    },
    [beginLoading, endLoading],
  )

  const refresh = useCallback(async (): Promise<void> => {
    if (!latestRef.current.enabled) {
      return
    }

    if (getMediaDevices() == null) {
      return
    }

    await refreshInternal(lifecycleGenerationRef.current)
  }, [refreshInternal])

  const ensurePermissions = useCallback(async (): Promise<boolean> => {
    if (!latestRef.current.enabled) {
      return false
    }

    const mediaDevices = getMediaDevices()
    if (!canRequestUserMedia(mediaDevices)) {
      if (latestRef.current.enabled) {
        setPermissionGranted(false)
        setError(
          new Error(
            'MediaDevices.getUserMedia is not available in this environment.',
          ),
        )
      }
      return false
    }

    const lifecycleGeneration = lifecycleGenerationRef.current
    const permissionGeneration = ++permissionGenerationRef.current
    beginLoading()

    let stream: MediaStream | null = null

    try {
      stream = await mediaDevices.getUserMedia(latestRef.current.constraints)

      if (
        lifecycleGeneration !== lifecycleGenerationRef.current ||
        permissionGeneration !== permissionGenerationRef.current ||
        !latestRef.current.enabled
      ) {
        return false
      }

      setPermissionGranted(true)
      setError(null)
      await refreshInternal(lifecycleGeneration)
      return true
    } catch (cause) {
      if (
        lifecycleGeneration !== lifecycleGenerationRef.current ||
        permissionGeneration !== permissionGenerationRef.current ||
        !latestRef.current.enabled
      ) {
        return false
      }

      setPermissionGranted(false)
      setError(normalizeMediaDevicesError(cause))
      return false
    } finally {
      stopMediaStreamTracks(stream)
      endLoading()
    }
  }, [beginLoading, endLoading, refreshInternal])

  useEffect(() => {
    const mediaDevices = getMediaDevices()

    if (!enabled || mediaDevices == null) {
      return
    }

    const lifecycleGeneration = ++lifecycleGenerationRef.current

    const onDeviceChange = () => {
      void refreshInternal(lifecycleGeneration)
    }

    mediaDevices.addEventListener('devicechange', onDeviceChange)
    void refreshInternal(lifecycleGeneration)

    return () => {
      lifecycleGenerationRef.current += 1
      mediaDevices.removeEventListener('devicechange', onDeviceChange)
    }
  }, [enabled, refreshInternal])

  useEffect(() => {
    if (!enabled || !requestPermissions) {
      autoRequestKeyRef.current = null
      return
    }

    const mediaDevices = getMediaDevices()
    if (!canRequestUserMedia(mediaDevices)) {
      return
    }

    // Preserve across Strict Mode remounts while React keeps hook state.
    const requestKey = 'auto'
    if (autoRequestKeyRef.current === requestKey) {
      return
    }
    autoRequestKeyRef.current = requestKey

    void ensurePermissions()
  }, [enabled, requestPermissions, ensurePermissions])

  const grouped = useMemo(() => groupMediaDevices(devices), [devices])

  return useMemo(
    () => ({
      isSupported,
      devices,
      videoInputs: grouped.videoInputs,
      audioInputs: grouped.audioInputs,
      audioOutputs: grouped.audioOutputs,
      permissionGranted,
      isLoading,
      error,
      refresh,
      ensurePermissions,
    }),
    [
      isSupported,
      devices,
      grouped.videoInputs,
      grouped.audioInputs,
      grouped.audioOutputs,
      permissionGranted,
      isLoading,
      error,
      refresh,
      ensurePermissions,
    ],
  )
}
