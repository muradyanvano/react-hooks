export const liveScreenShareSnippet = `import { useEffect, useRef } from 'react'
import { useDisplayMedia } from '@muradyanvano/react-hooks'

function describeError(error: Error | null) {
  if (error == null) return null
  if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
    return 'Screen sharing was cancelled or blocked. Try again.'
  }
  return 'Screen sharing failed. Please try again.'
}

export function ScreenShareButton() {
  const { isSupported, stream, isSharing, isLoading, error, start, stop } =
    useDisplayMedia()
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
        Start sharing my screen
      </button>
      <button type="button" disabled={!isSharing} onClick={stop}>
        Stop sharing
      </button>

      <p role="alert">{describeError(error) ?? ''}</p>
    </section>
  )
}`

export const overviewSnippet = `import { useEffect, useRef } from 'react'
import { useDisplayMedia } from '@muradyanvano/react-hooks'

export function StudioScreenShare() {
  const { stream, isSharing, isLoading, error, start, stop } =
    useDisplayMedia() // defaults: { video: true, audio: false }
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
      <p>{isLoading ? 'Requesting…' : isSharing ? 'Sharing' : 'Idle'}</p>
      <p>Video tracks: {stream?.getVideoTracks().length ?? 0}</p>
      <p>Audio tracks: {stream?.getAudioTracks().length ?? 0}</p>

      <button
        type="button"
        disabled={isSharing || isLoading}
        onClick={() => void start()}
      >
        Start sharing my screen
      </button>
      <button type="button" disabled={!isSharing} onClick={stop}>
        Stop sharing
      </button>

      <p role="alert">{error?.message ?? ''}</p>
    </section>
  )
}`

export const videoPreviewSnippet = `import { useEffect, useRef } from 'react'
import { useDisplayMedia } from '@muradyanvano/react-hooks'

export function ScreenPreview() {
  const { stream, isSharing, start, stop } = useDisplayMedia()
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
      {!isSharing ? <p>Nothing shared yet</p> : null}

      <button
        type="button"
        disabled={isSharing}
        onClick={() => void start()}
      >
        Start sharing my screen
      </button>
      <button type="button" disabled={!isSharing} onClick={stop}>
        Stop sharing
      </button>
    </section>
  )
}`

export const systemAudioSnippet = `import { useDisplayMedia } from '@muradyanvano/react-hooks'

export function ScreenShareWithAudio() {
  const { stream, isSharing, start, stop } = useDisplayMedia({
    video: true,
    audio: true,
  })
  const audioTrackCount = stream?.getAudioTracks().length ?? 0

  return (
    <section>
      <button type="button" disabled={isSharing} onClick={() => void start()}>
        Start sharing my screen
      </button>
      <button type="button" disabled={!isSharing} onClick={stop}>
        Stop sharing
      </button>

      {/* System/tab audio is never guaranteed — handle 0 gracefully. */}
      <p>Audio tracks: {audioTrackCount}</p>
    </section>
  )
}`

export const browserEndedSnippet = `import { useDisplayMedia } from '@muradyanvano/react-hooks'

export function ScreenShareStatus() {
  const { isSharing, isLoading, start } = useDisplayMedia()

  return (
    <section>
      <button
        type="button"
        disabled={isSharing || isLoading}
        onClick={() => void start()}
      >
        Start sharing my screen
      </button>

      {/*
        No stop() call is needed here: when the user ends the capture from
        the browser's own "Stop sharing" bar, the hook detects the track's
        native "ended" event and resets isSharing/stream on its own.
      */}
      <p role="status">{isSharing ? 'Sharing' : 'Idle'}</p>
    </section>
  )
}`

export const permissionCancelledSnippet = `import { useDisplayMedia } from '@muradyanvano/react-hooks'

function describeError(error: Error | null) {
  if (error == null) return null
  if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
    return 'Screen sharing was cancelled or blocked. Try again.'
  }
  return 'Screen sharing failed. Please try again.'
}

export function CancellableScreenShare() {
  const { isSharing, isLoading, error, start } = useDisplayMedia()

  return (
    <section>
      <button type="button" disabled={isLoading} onClick={() => void start()}>
        Start sharing my screen
      </button>

      {/* start() never throws — a cancelled picker just sets error. */}
      <p role="alert">{describeError(error) ?? ''}</p>
      <p role="status">{isSharing ? 'Sharing' : 'Idle — safe to retry.'}</p>
    </section>
  )
}`

export const errorRecoverySnippet = `import { useDisplayMedia } from '@muradyanvano/react-hooks'

export function RecoverableScreenShare() {
  const { isSharing, isLoading, error, start } = useDisplayMedia()

  return (
    <section>
      <button type="button" disabled={isLoading} onClick={() => void start()}>
        Start sharing my screen
      </button>

      {/* Calling start() again after fixing the underlying issue (for
          example, a system policy) clears the previous error on success. */}
      <p role="alert">{error?.message ?? ''}</p>
      <p role="status">{isSharing ? 'Sharing — error cleared.' : 'Idle'}</p>
    </section>
  )
}`

export const streamReplacementSnippet = `import { useDisplayMedia } from '@muradyanvano/react-hooks'

export function ReplaceableScreenShare() {
  const { stream, isSharing, start } = useDisplayMedia()

  return (
    <section>
      {/*
        Calling start() again while already sharing requests a fresh
        stream. The hook stops every track on the previous stream, and a
        stale "ended" event from that old stream cannot clear the new one.
      */}
      <button type="button" onClick={() => void start()}>
        Start sharing my screen
      </button>

      <p>Stream id: {stream?.id ?? '—'}</p>
      <p role="status">{isSharing ? 'Sharing.' : 'Idle.'}</p>
    </section>
  )
}`

export const enabledStateSnippet = `import { useState } from 'react'
import { useDisplayMedia } from '@muradyanvano/react-hooks'

export function DeclarativeScreenShare() {
  const [enabled, setEnabled] = useState(false)
  // enabled is an advanced signal for state-machine-driven sharing.
  // Prefer imperative start() from a click handler in most UIs — without a
  // preceding user gesture, real browsers may block a declarative call.
  const { isSharing, isLoading } = useDisplayMedia({ enabled })

  return (
    <section>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Share declaratively
      </label>
      <p role="status">
        {isLoading ? 'Requesting…' : isSharing ? 'Sharing' : 'Idle'}
      </p>
    </section>
  )
}`

export const unsupportedSnippet = `import { useDisplayMedia } from '@muradyanvano/react-hooks'

export function GuardedScreenShareButton() {
  const { isSupported, start } = useDisplayMedia()

  return (
    <section>
      <button type="button" disabled={!isSupported} onClick={() => void start()}>
        Start sharing my screen
      </button>
      {!isSupported ? (
        <p>
          Screen sharing isn't available in this browser. Try the latest
          Chrome, Edge, or Firefox on desktop.
        </p>
      ) : null}
    </section>
  )
}`

export const playgroundSnippet = `import { useDisplayMedia } from '@muradyanvano/react-hooks'

export function Playground({
  enabled = false,
  video = true,
  audio = false,
}: {
  enabled?: boolean
  video?: boolean
  audio?: boolean
}) {
  const { stream, isSharing, isLoading, error, start, stop } =
    useDisplayMedia({ enabled, video, audio })

  return (
    <section>
      <button type="button" disabled={isLoading} onClick={() => void start()}>
        Start sharing my screen
      </button>
      <button type="button" disabled={!isSharing} onClick={stop}>
        Stop sharing
      </button>

      <p>Enabled: {String(enabled)}</p>
      <p>Video tracks: {stream?.getVideoTracks().length ?? 0}</p>
      <p>Audio tracks: {stream?.getAudioTracks().length ?? 0}</p>
      <p role="alert">{error?.message ?? ''}</p>
    </section>
  )
}`
