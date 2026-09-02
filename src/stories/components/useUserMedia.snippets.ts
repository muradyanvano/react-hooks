export const liveCameraSnippet = `import { useEffect, useRef, useState } from 'react'
import { useUserMedia } from '@muradyanvano/react-hooks'

function describeError(error: Error | null) {
  if (error == null) return null
  if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
    return 'Camera access was denied or blocked. Try again.'
  }
  return 'Camera access failed. Please try again.'
}

export function LiveCameraPreview() {
  const [includeVideo, setIncludeVideo] = useState(true)
  const [includeAudio, setIncludeAudio] = useState(false)
  const { isSupported, stream, isActive, isLoading, error, start, stop, restart } =
    useUserMedia({
      constraints: { video: includeVideo, audio: includeAudio },
    })
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (video == null) return
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  return (
    <section>
      <video ref={videoRef} autoPlay muted playsInline />

      <button
        type="button"
        disabled={!isSupported || isLoading}
        onClick={() => void start()}
      >
        Start camera
      </button>
      <button type="button" disabled={!isActive} onClick={stop}>
        Stop
      </button>
      <button type="button" disabled={!isActive || isLoading} onClick={() => void restart()}>
        Restart
      </button>

      <label>
        <input
          type="checkbox"
          checked={includeVideo}
          onChange={(event) => setIncludeVideo(event.target.checked)}
        />
        Camera
      </label>
      <label>
        <input
          type="checkbox"
          checked={includeAudio}
          onChange={(event) => setIncludeAudio(event.target.checked)}
        />
        Microphone
      </label>

      <p role="alert">{describeError(error) ?? ''}</p>
    </section>
  )
}`

export const overviewSnippet = `import { useEffect, useRef } from 'react'
import { useUserMedia } from '@muradyanvano/react-hooks'

export function StudioCamera() {
  const { stream, isActive, isLoading, error, start, stop } =
    useUserMedia() // defaults: { video: true, audio: false }
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (video == null) return
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  return (
    <section>
      <video ref={videoRef} autoPlay muted playsInline />
      <p>{isLoading ? 'Requesting…' : isActive ? 'Active' : 'Idle'}</p>
      <p>Video tracks: {stream?.getVideoTracks().length ?? 0}</p>
      <p>Audio tracks: {stream?.getAudioTracks().length ?? 0}</p>

      <button
        type="button"
        disabled={isActive || isLoading}
        onClick={() => void start()}
      >
        Start camera
      </button>
      <button type="button" disabled={!isActive} onClick={stop}>
        Stop
      </button>

      <p role="alert">{error?.message ?? ''}</p>
    </section>
  )
}`

export const videoPreviewSnippet = `import { useEffect, useRef } from 'react'
import { useUserMedia } from '@muradyanvano/react-hooks'

export function CameraPreview() {
  const { stream, isActive, start, stop } = useUserMedia()
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Assign the stream imperatively — MediaStream has no createObjectURL API.
  useEffect(() => {
    const video = videoRef.current
    if (video == null) return
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  return (
    <section>
      <video ref={videoRef} autoPlay muted playsInline />
      {!isActive ? <p>No camera active yet</p> : null}

      <button type="button" disabled={isActive} onClick={() => void start()}>
        Start camera
      </button>
      <button type="button" disabled={!isActive} onClick={stop}>
        Stop
      </button>
    </section>
  )
}`

export const microphoneOnlySnippet = `import { useUserMedia } from '@muradyanvano/react-hooks'

export function MicrophoneOnly() {
  const { stream, isActive, start, stop } = useUserMedia({
    constraints: { video: false, audio: true },
  })
  const audioTrackCount = stream?.getAudioTracks().length ?? 0

  return (
    <section>
      <button type="button" disabled={isActive} onClick={() => void start()}>
        Start microphone
      </button>
      <button type="button" disabled={!isActive} onClick={stop}>
        Stop
      </button>

      <p>Audio tracks: {audioTrackCount}</p>
    </section>
  )
}`

export const cameraAndMicrophoneSnippet = `import { useUserMedia } from '@muradyanvano/react-hooks'

export function CameraAndMicrophone() {
  const { stream, isActive, start, stop } = useUserMedia({
    constraints: { video: true, audio: true },
  })
  const videoTrackCount = stream?.getVideoTracks().length ?? 0
  const audioTrackCount = stream?.getAudioTracks().length ?? 0

  return (
    <section>
      <button type="button" disabled={isActive} onClick={() => void start()}>
        Start camera
      </button>
      <button type="button" disabled={!isActive} onClick={stop}>
        Stop
      </button>

      <p>Video tracks: {videoTrackCount}</p>
      <p>Audio tracks: {audioTrackCount}</p>
    </section>
  )
}`

export const deviceSelectionSnippet = `import { useMemo, useState } from 'react'
import { useDevicesList, useUserMedia } from '@muradyanvano/react-hooks'

export function DevicePickerCamera() {
  const { devices, refresh } = useDevicesList()
  const [videoDeviceId, setVideoDeviceId] = useState('')
  const [audioDeviceId, setAudioDeviceId] = useState('')

  const constraints = useMemo(
    () => ({
      video: videoDeviceId
        ? { deviceId: { exact: videoDeviceId } }
        : true,
      audio: audioDeviceId
        ? { deviceId: { exact: audioDeviceId } }
        : false,
    }),
    [videoDeviceId, audioDeviceId],
  )

  const { isActive, start, stop } = useUserMedia({ constraints })

  const cameras = devices.filter((device) => device.kind === 'videoinput')
  const microphones = devices.filter((device) => device.kind === 'audioinput')

  return (
    <section>
      <button type="button" onClick={() => void refresh()}>
        Refresh devices
      </button>

      <label>
        Camera
        <select
          value={videoDeviceId}
          onChange={(event) => setVideoDeviceId(event.target.value)}
        >
          <option value="">Default camera</option>
          {cameras.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || 'Unnamed camera'}
            </option>
          ))}
        </select>
      </label>

      <label>
        Microphone
        <select
          value={audioDeviceId}
          onChange={(event) => setAudioDeviceId(event.target.value)}
        >
          <option value="">No microphone</option>
          {microphones.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || 'Unnamed microphone'}
            </option>
          ))}
        </select>
      </label>

      <button type="button" disabled={isActive} onClick={() => void start()}>
        Start camera
      </button>
      <button type="button" disabled={!isActive} onClick={stop}>
        Stop
      </button>
    </section>
  )
}`

export const facingModeSnippet = `import { useState } from 'react'
import { useUserMedia } from '@muradyanvano/react-hooks'

export function FacingModeCamera() {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const { isActive, start, stop } = useUserMedia({
    constraints: { video: { facingMode }, audio: false },
  })

  return (
    <section>
      <label>
        <input
          type="radio"
          name="facing"
          checked={facingMode === 'user'}
          onChange={() => setFacingMode('user')}
        />
        Front (user)
      </label>
      <label>
        <input
          type="radio"
          name="facing"
          checked={facingMode === 'environment'}
          onChange={() => setFacingMode('environment')}
        />
        Back (environment)
      </label>

      <button type="button" disabled={isActive} onClick={() => void start()}>
        Start camera
      </button>
      <button type="button" disabled={!isActive} onClick={stop}>
        Stop
      </button>
    </section>
  )
}`

export const resolutionConstraintsSnippet = `import { useState } from 'react'
import { useUserMedia } from '@muradyanvano/react-hooks'

export function ResolutionCamera() {
  const [width, setWidth] = useState(640)
  const { stream, isActive, start, stop } = useUserMedia({
    constraints: {
      video: { width: { ideal: width } },
      audio: false,
    },
  })
  const settings = stream?.getVideoTracks()[0]?.getSettings()

  return (
    <section>
      <label>
        Ideal width
        <input
          type="number"
          value={width}
          onChange={(event) => setWidth(Number(event.target.value))}
        />
      </label>

      <button type="button" disabled={isActive} onClick={() => void start()}>
        Start camera
      </button>
      <button type="button" disabled={!isActive} onClick={stop}>
        Stop
      </button>

      <p>Actual width: {settings?.width ?? '—'}</p>
    </section>
  )
}`

export const autoSwitchSnippet = `import { useState } from 'react'
import { useUserMedia } from '@muradyanvano/react-hooks'

export function AutoSwitchCamera() {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const { isActive, start } = useUserMedia({
    autoSwitch: true,
    constraints: { video: { facingMode }, audio: false },
  })

  return (
    <section>
      {/*
        With autoSwitch (default), changing constraints while active
        requests a fresh stream automatically.
      */}
      <button
        type="button"
        onClick={() =>
          setFacingMode((current) =>
            current === 'user' ? 'environment' : 'user',
          )
        }
      >
        Toggle facing mode
      </button>

      <button type="button" disabled={isActive} onClick={() => void start()}>
        Start camera
      </button>
      <p role="status">Facing: {facingMode}</p>
    </section>
  )
}`

export const manualRestartSnippet = `import { useState } from 'react'
import { useUserMedia } from '@muradyanvano/react-hooks'

export function ManualRestartCamera() {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const { isActive, isLoading, restart } = useUserMedia({
    autoSwitch: false,
    constraints: { video: { facingMode }, audio: false },
  })

  return (
    <section>
      {/*
        With autoSwitch: false, constraint changes do not restart capture.
        Call restart() after updating constraints when you want a new stream.
      */}
      <button
        type="button"
        onClick={() =>
          setFacingMode((current) =>
            current === 'user' ? 'environment' : 'user',
          )
        }
      >
        Toggle facing mode
      </button>

      <button
        type="button"
        disabled={!isActive || isLoading}
        onClick={() => void restart()}
      >
        Restart with new constraints
      </button>
      <p role="status">Facing: {facingMode}</p>
    </section>
  )
}`

export const enabledStateSnippet = `import { useState } from 'react'
import { useUserMedia } from '@muradyanvano/react-hooks'

export function DeclarativeCamera() {
  const [enabled, setEnabled] = useState(false)
  // enabled is an advanced signal for state-machine-driven capture.
  // Prefer imperative start() from a click handler in most UIs — without a
  // preceding user gesture, real browsers may block a declarative call.
  const { isActive, isLoading } = useUserMedia({ enabled })

  return (
    <section>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Camera declaratively (enabled)
      </label>
      <p role="status">
        {isLoading ? 'Requesting…' : isActive ? 'Active' : 'Idle'}
      </p>
    </section>
  )
}`

export const permissionDeniedSnippet = `import { useUserMedia } from '@muradyanvano/react-hooks'

function describeError(error: Error | null) {
  if (error == null) return null
  if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
    return 'Camera access was denied or blocked. Try again.'
  }
  return 'Camera access failed. Please try again.'
}

export function DeniedCamera() {
  const { isActive, isLoading, error, start } = useUserMedia()

  return (
    <section>
      <button type="button" disabled={isLoading} onClick={() => void start()}>
        Start camera
      </button>

      {/* start() never throws — a denied prompt just sets error. */}
      <p role="alert">{describeError(error) ?? ''}</p>
      <p role="status">{isActive ? 'Active' : 'Idle — safe to retry.'}</p>
    </section>
  )
}`

export const noDeviceSnippet = `import { useUserMedia } from '@muradyanvano/react-hooks'

export function NoDeviceCamera() {
  const { isActive, isLoading, error, start } = useUserMedia()

  return (
    <section>
      <button type="button" disabled={isLoading} onClick={() => void start()}>
        Start camera
      </button>

      <p role="alert">{error?.message ?? ''}</p>
      <p role="status">{isActive ? 'Active' : 'Idle'}</p>
    </section>
  )
}`

export const deviceBusySnippet = `import { useUserMedia } from '@muradyanvano/react-hooks'

export function BusyDeviceCamera() {
  const { isActive, isLoading, error, start } = useUserMedia()

  return (
    <section>
      <button type="button" disabled={isLoading} onClick={() => void start()}>
        Start camera
      </button>

      <p role="alert">{error?.message ?? ''}</p>
      <p role="status">{isActive ? 'Active' : 'Idle'}</p>
    </section>
  )
}`

export const constraintErrorSnippet = `import { useUserMedia } from '@muradyanvano/react-hooks'

export function ConstrainedCamera() {
  const { isActive, isLoading, error, start } = useUserMedia({
    constraints: {
      video: {
        width: { exact: 99999 },
        height: { exact: 99999 },
      },
      audio: false,
    },
  })

  return (
    <section>
      <button type="button" disabled={isLoading} onClick={() => void start()}>
        Start camera
      </button>

      <p role="alert">{error?.message ?? ''}</p>
      <p role="status">{isActive ? 'Active' : 'Idle'}</p>
    </section>
  )
}`

export const overlappingRequestsSnippet = `import { useUserMedia } from '@muradyanvano/react-hooks'

export function OverlappingCamera() {
  const { stream, isActive, start } = useUserMedia()

  return (
    <section>
      {/*
        Rapid start() calls while a request is pending: the latest request
        wins; stale streams from superseded calls are stopped automatically.
      */}
      <button type="button" onClick={() => void start()}>
        Start camera
      </button>
      <button type="button" onClick={() => void start()}>
        Start again (overlap)
      </button>

      <p>Stream id: {stream?.id ?? '—'}</p>
      <p role="status">{isActive ? 'Active' : 'Idle'}</p>
    </section>
  )
}`

export const trackEndedSnippet = `import { useUserMedia } from '@muradyanvano/react-hooks'

export function TrackEndedCamera() {
  const { isActive, isLoading, start } = useUserMedia()

  return (
    <section>
      <button
        type="button"
        disabled={isActive || isLoading}
        onClick={() => void start()}
      >
        Start camera
      </button>

      {/*
        When the browser ends every track (unplugged device, OS revoke, etc.),
        the hook detects native "ended" events and resets without stop().
      */}
      <p role="status">{isActive ? 'Active' : 'Idle'}</p>
    </section>
  )
}`

export const unsupportedSnippet = `import { useUserMedia } from '@muradyanvano/react-hooks'

export function GuardedCameraButton() {
  const { isSupported, start } = useUserMedia()

  return (
    <section>
      <button type="button" disabled={!isSupported} onClick={() => void start()}>
        Start camera
      </button>
      {!isSupported ? (
        <p>
          Camera access isn't available in this browser. Try the latest Chrome,
          Edge, or Firefox.
        </p>
      ) : null}
    </section>
  )
}`

export const playgroundSnippet = `import { useUserMedia } from '@muradyanvano/react-hooks'

export function Playground({
  enabled = false,
  autoSwitch = true,
  video = true,
  audio = false,
}: {
  enabled?: boolean
  autoSwitch?: boolean
  video?: boolean
  audio?: boolean
}) {
  const { stream, isActive, isLoading, error, start, stop } = useUserMedia({
    enabled,
    autoSwitch,
    constraints: { video, audio },
  })

  return (
    <section>
      <button type="button" disabled={isLoading} onClick={() => void start()}>
        Start camera
      </button>
      <button type="button" disabled={!isActive} onClick={stop}>
        Stop
      </button>

      <p>Enabled: {String(enabled)}</p>
      <p>Auto-switch: {String(autoSwitch)}</p>
      <p>Video tracks: {stream?.getVideoTracks().length ?? 0}</p>
      <p>Audio tracks: {stream?.getAudioTracks().length ?? 0}</p>
      <p role="alert">{error?.message ?? ''}</p>
    </section>
  )
}`
