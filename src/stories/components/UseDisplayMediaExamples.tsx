import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useDisplayMedia } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  createDisplayMediaMock,
  type DisplayMediaMockController,
  type DisplayMediaMockStreamHandle,
  type DisplayMediaResultMode,
} from './displayMediaMock'
import {
  browserEndedSnippet,
  enabledStateSnippet,
  errorRecoverySnippet,
  liveScreenShareSnippet,
  overviewSnippet,
  permissionCancelledSnippet,
  playgroundSnippet,
  streamReplacementSnippet,
  systemAudioSnippet,
  unsupportedSnippet,
  videoPreviewSnippet,
} from './useDisplayMedia.snippets'

const primaryButtonClass =
  'rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60'
const dangerButtonClass =
  'rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800 outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60'
const videoFrameClass =
  'relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900'
const videoClass = 'aspect-video w-full bg-slate-900 object-contain'

function describeDisplayMediaError(error: Error | null): string | null {
  if (error == null) {
    return null
  }

  if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
    return 'Screen sharing was cancelled or blocked. Click "Start sharing my screen" to try again.'
  }

  if (error.name === 'NotFoundError') {
    return 'No shareable screen, window, or tab was found.'
  }

  if (error.name === 'NotSupportedError') {
    return 'Screen sharing is not available in this browser.'
  }

  return 'Screen sharing failed. Please try again.'
}

function useVideoPreview(stream: MediaStream | null) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Attach the live stream imperatively — MediaStream has no URL to assign
  // via `src`, and `URL.createObjectURL(MediaStream)` was removed from browsers.
  useEffect(() => {
    const video = videoRef.current
    if (video == null) {
      return
    }
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  return videoRef
}

function WithDisplayMediaMock({
  children,
  resultMode = 'success',
  supported = true,
  deferred = false,
  onReady,
}: {
  children: (controller: DisplayMediaMockController) => ReactNode
  resultMode?: DisplayMediaResultMode
  supported?: boolean
  deferred?: boolean
  onReady?: ((controller: DisplayMediaMockController) => void) | undefined
}) {
  const [controller] = useState(() =>
    createDisplayMediaMock({ resultMode, supported, deferred }),
  )

  // Install during render so children see the mock before their effects run.
  // Re-install after Strict Mode cleanup (useState initializer does not re-run).
  if (!controller.isInstalled()) {
    controller.install()
  }

  useEffect(() => {
    controller.install()
    onReady?.(controller)
    return () => {
      controller.uninstall()
    }
  }, [controller, onReady])

  useEffect(() => {
    controller.setResultMode(resultMode)
    controller.setSupported(supported)
    controller.setDeferred(deferred)
  }, [controller, resultMode, supported, deferred])

  return <>{children(controller)}</>
}

export function LiveScreenShareExample() {
  const { isSupported, stream, isSharing, isLoading, error, start, stop } =
    useDisplayMedia()
  const videoRef = useVideoPreview(stream)
  const descriptionId = useId()

  return (
    <ExampleShowcase
      hookName="useDisplayMedia"
      title="Live screen sharing"
      description="Uses the real navigator.mediaDevices.getDisplayMedia — no Storybook mock. Your browser will ask what to share: a screen, a window, or a tab."
      instruction='Click "Start sharing my screen". Your browser shows its native picker — choose anything (or cancel it) to see the result below.'
      badge={isLoading ? 'Requesting…' : isSharing ? 'Sharing' : 'Idle'}
      code={liveScreenShareSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Supported',
              value: String(isSupported),
              testId: 'live-supported',
            },
            {
              label: 'Sharing',
              value: isSharing ? 'true' : 'false',
              testId: 'live-sharing',
            },
            {
              label: 'Loading',
              value: isLoading ? 'true' : 'false',
              testId: 'live-loading',
            },
          ]}
        />
      }
    >
      <div className={videoFrameClass} data-testid="live-frame">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Live screen share preview"
          aria-describedby={descriptionId}
          data-testid="live-video"
          className={videoClass}
        />
        {!isSharing ? (
          <p
            className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-medium text-slate-300"
            data-testid="live-placeholder"
          >
            {isSupported
              ? 'No screen shared yet.'
              : 'Screen sharing is not available in this browser.'}
          </p>
        ) : null}
      </div>
      <p id={descriptionId} className="mt-2 text-xs text-slate-500">
        The preview mirrors whatever you choose in the browser&apos;s share
        picker.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="live-start"
          disabled={!isSupported || isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start sharing my screen
        </button>
        <button
          type="button"
          data-testid="live-stop"
          disabled={!isSharing}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop sharing
        </button>
      </div>

      <p
        role="alert"
        data-testid="live-error"
        className="mt-3 min-h-5 text-sm font-semibold text-rose-700"
      >
        {describeDisplayMediaError(error) ?? ''}
      </p>

      {!isSupported ? (
        <p
          className="mt-2 text-sm text-slate-600"
          data-testid="live-unsupported-help"
        >
          Try the latest Chrome, Edge, or Firefox on desktop.
        </p>
      ) : null}
    </ExampleShowcase>
  )
}

export function OverviewExample() {
  return (
    <WithDisplayMediaMock resultMode="success">
      {() => <OverviewBody />}
    </WithDisplayMediaMock>
  )
}

function OverviewBody() {
  const { stream, isSharing, isLoading, error, start, stop } = useDisplayMedia()
  const videoRef = useVideoPreview(stream)
  const videoTrackCount = stream?.getVideoTracks().length ?? 0
  const audioTrackCount = stream?.getAudioTracks().length ?? 0

  return (
    <ExampleShowcase
      hookName="useDisplayMedia"
      title="Studio screen share"
      description="A deterministic mock stands in for the browser's share picker so this story is reproducible. Defaults request { video: true, audio: false }."
      instruction='Click "Start sharing my screen" to preview a mocked capture, then stop it.'
      badge={isLoading ? 'Requesting…' : isSharing ? 'Sharing' : 'Idle'}
      code={overviewSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Status',
              value: isLoading ? 'Loading' : isSharing ? 'Sharing' : 'Idle',
              testId: 'overview-status',
            },
            {
              label: 'Video tracks',
              value: String(videoTrackCount),
              testId: 'overview-video-tracks',
            },
            {
              label: 'Audio tracks',
              value: String(audioTrackCount),
              testId: 'overview-audio-tracks',
            },
            {
              label: 'Constraints',
              value: 'video: true, audio: false',
              testId: 'overview-constraints',
            },
          ]}
        />
      }
    >
      <div className={videoFrameClass} data-testid="overview-frame">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Studio screen share preview"
          data-testid="overview-video"
          className={videoClass}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="overview-start"
          disabled={isSharing || isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start sharing my screen
        </button>
        <button
          type="button"
          data-testid="overview-stop"
          disabled={!isSharing}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop sharing
        </button>
      </div>
      <p
        role="alert"
        data-testid="overview-error"
        className="mt-3 min-h-5 text-sm font-semibold text-rose-700"
      >
        {error ? describeDisplayMediaError(error) : ''}
      </p>
      <p className="mt-2 text-xs text-slate-500" data-testid="overview-privacy">
        Privacy: sharing stops immediately on Stop, on the browser&apos;s own
        &quot;Stop sharing&quot; control, or when the shared tab/window closes.
      </p>
    </ExampleShowcase>
  )
}

export function VideoPreviewExample() {
  return (
    <WithDisplayMediaMock resultMode="success">
      {() => <VideoPreviewBody />}
    </WithDisplayMediaMock>
  )
}

function VideoPreviewBody() {
  const { stream, isSharing, start, stop } = useDisplayMedia()
  const videoRef = useVideoPreview(stream)

  return (
    <ExampleShowcase
      hookName="useDisplayMedia"
      title="Video preview"
      description="Attach the returned stream to a <video> element with a srcObject effect, never createObjectURL — browsers removed object URL support for MediaStream."
      instruction="Start sharing to swap the placeholder for a live preview, then stop to clear it."
      code={videoPreviewSnippet}
    >
      <div
        data-testid="preview-frame"
        data-active={isSharing ? 'true' : 'false'}
        className={videoFrameClass}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Preview of the shared screen"
          data-testid="preview-video"
          className={videoClass}
        />
        {!isSharing ? (
          <p
            data-testid="preview-placeholder"
            className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-300"
          >
            Nothing shared yet
          </p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="preview-start"
          disabled={isSharing}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start sharing my screen
        </button>
        <button
          type="button"
          data-testid="preview-stop"
          disabled={!isSharing}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop sharing
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function SystemAudioExample() {
  return (
    <WithDisplayMediaMock resultMode="success">
      {() => <SystemAudioBody />}
    </WithDisplayMediaMock>
  )
}

function SystemAudioBody() {
  const { stream, isSharing, start, stop } = useDisplayMedia({
    video: true,
    audio: true,
  })
  const audioTrackCount = stream?.getAudioTracks().length ?? 0

  return (
    <ExampleShowcase
      hookName="useDisplayMedia"
      title="System audio"
      description="Requesting { video: true, audio: true } asks the browser to also capture audio. Whether audio actually comes back depends on the OS, browser, and what the user picks (a full screen vs. a single window often differ)."
      instruction="Start sharing to see how many audio tracks the (mocked) capture returned."
      code={systemAudioSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Audio tracks',
              value: String(audioTrackCount),
              testId: 'audio-audio-tracks',
            },
            {
              label: 'Sharing',
              value: isSharing ? 'true' : 'false',
              testId: 'audio-sharing',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="audio-start"
          disabled={isSharing}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start sharing my screen
        </button>
        <button
          type="button"
          data-testid="audio-stop"
          disabled={!isSharing}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop sharing
        </button>
      </div>
      <p
        className="mt-3 text-sm text-slate-600"
        data-testid="audio-note"
        role="status"
        aria-live="polite"
      >
        System/tab audio is never guaranteed — always handle audioTrackCount ===
        0 gracefully.
      </p>
    </ExampleShowcase>
  )
}

export function BrowserEndedSharingExample() {
  return (
    <WithDisplayMediaMock resultMode="success">
      {(controller) => <BrowserEndedSharingBody controller={controller} />}
    </WithDisplayMediaMock>
  )
}

function BrowserEndedSharingBody({
  controller,
}: {
  controller: DisplayMediaMockController
}) {
  const { isSharing, isLoading, start } = useDisplayMedia()

  return (
    <ExampleShowcase
      hookName="useDisplayMedia"
      title="Browser-ended sharing"
      description='Browsers show their own "Stop sharing" bar while a tab, window, or screen is shared. When the capture ends from outside your page, the hook detects it and resets automatically — no stop() call is needed.'
      instruction='Start sharing, then click "Simulate browser stop sharing" to mimic the native control.'
      badge={isSharing ? 'Sharing' : 'Idle'}
      code={browserEndedSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="ended-start"
          disabled={isSharing || isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start sharing my screen
        </button>
        <button
          type="button"
          data-testid="ended-simulate"
          disabled={!isSharing}
          className={dangerButtonClass}
          onClick={() => {
            controller.endActiveStream()
          }}
        >
          Simulate browser stop sharing
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        data-testid="ended-status"
        className="mt-3 text-sm text-slate-600"
      >
        {isSharing
          ? 'Sharing — try the button above.'
          : 'Idle. No stop() call was made — the hook detected the ended track itself.'}
      </p>
    </ExampleShowcase>
  )
}

export function PermissionCancelledExample() {
  return (
    <WithDisplayMediaMock resultMode="cancelled">
      {() => <PermissionCancelledBody />}
    </WithDisplayMediaMock>
  )
}

function PermissionCancelledBody() {
  const { isSharing, isLoading, error, start } = useDisplayMedia()

  return (
    <ExampleShowcase
      hookName="useDisplayMedia"
      title="Permission cancelled"
      description="Closing the native share picker (or a policy blocking it) rejects with NotAllowedError or AbortError. The hook normalizes either into error and returns to idle — start() never throws."
      instruction='Click "Start sharing my screen" to simulate cancelling the picker, then retry freely.'
      badge={isLoading ? 'Requesting…' : 'Idle'}
      code={permissionCancelledSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="cancel-start"
          disabled={isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start sharing my screen
        </button>
      </div>
      <p
        role="alert"
        data-testid="cancel-error"
        className="mt-3 min-h-5 text-sm font-semibold text-rose-700"
      >
        {describeDisplayMediaError(error) ?? ''}
      </p>
      <p
        role="status"
        aria-live="polite"
        data-testid="cancel-status"
        className="mt-2 text-sm text-slate-600"
      >
        {isSharing ? 'Sharing' : 'Idle — safe to retry.'}
      </p>
    </ExampleShowcase>
  )
}

export function ErrorRecoveryExample() {
  return (
    <WithDisplayMediaMock resultMode="denied">
      {(controller) => <ErrorRecoveryBody controller={controller} />}
    </WithDisplayMediaMock>
  )
}

function ErrorRecoveryBody({
  controller,
}: {
  controller: DisplayMediaMockController
}) {
  const { isSharing, isLoading, error, start } = useDisplayMedia()
  const [fixed, setFixed] = useState(false)

  return (
    <ExampleShowcase
      hookName="useDisplayMedia"
      title="Error recovery"
      description="A failed start() keeps a normalized error without crashing. Once whatever blocked access is resolved, calling start() again on success clears the previous error."
      instruction='Click "Start sharing my screen" to see the failure, then "Grant access" and try again.'
      badge={isLoading ? 'Requesting…' : isSharing ? 'Sharing' : 'Idle'}
      code={errorRecoverySnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="recovery-start"
          disabled={isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start sharing my screen
        </button>
        <button
          type="button"
          data-testid="recovery-fix"
          disabled={fixed}
          className={secondaryButtonClass}
          onClick={() => {
            controller.setResultMode('success')
            setFixed(true)
          }}
        >
          Grant access (fix)
        </button>
      </div>
      <p
        role="alert"
        data-testid="recovery-error"
        className="mt-3 min-h-5 text-sm font-semibold text-rose-700"
      >
        {describeDisplayMediaError(error) ?? ''}
      </p>
      <p
        role="status"
        aria-live="polite"
        data-testid="recovery-status"
        className="mt-2 text-sm text-slate-600"
      >
        {isSharing ? 'Sharing — error cleared.' : 'Idle'}
      </p>
    </ExampleShowcase>
  )
}

export function StreamReplacementExample() {
  return (
    <WithDisplayMediaMock resultMode="success">
      {(controller) => <StreamReplacementBody controller={controller} />}
    </WithDisplayMediaMock>
  )
}

function StreamReplacementBody({
  controller,
}: {
  controller: DisplayMediaMockController
}) {
  const { stream, isSharing, start } = useDisplayMedia()
  const previousHandleRef = useRef<DisplayMediaMockStreamHandle | null>(null)
  const [hasPreviousHandle, setHasPreviousHandle] = useState(false)
  const [staleNote, setStaleNote] = useState('')
  const [stoppedCount, setStoppedCount] = useState(0)

  return (
    <ExampleShowcase
      hookName="useDisplayMedia"
      title="Stream replacement"
      description="Calling start() again while already sharing requests a fresh stream. The hook stops every track on the previous stream, and an ended event from that old (already-stopped) stream cannot clear the new one."
      instruction='Click "Start sharing my screen" twice, then "Dispatch ended on old stream" to confirm the current share stays active.'
      code={streamReplacementSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Sharing',
              value: isSharing ? 'true' : 'false',
              testId: 'replace-sharing',
            },
            {
              label: 'Stream id',
              value: stream?.id ?? '—',
              testId: 'replace-stream-id',
            },
            {
              label: 'Tracks stopped',
              value: String(stoppedCount),
              testId: 'replace-stopped-count',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="replace-start"
          className={primaryButtonClass}
          onClick={() => {
            previousHandleRef.current = controller.getActiveStream()
            setHasPreviousHandle(previousHandleRef.current != null)
            void start().then(() => {
              setStoppedCount(controller.getTotalStopCount())
            })
          }}
        >
          Start sharing my screen
        </button>
        <button
          type="button"
          data-testid="replace-dispatch-old-ended"
          disabled={!hasPreviousHandle}
          className={dangerButtonClass}
          onClick={() => {
            previousHandleRef.current?.dispatchEndedOnFirstTrack()
            setStaleNote(
              'Dispatched ended on the previous (already replaced) stream.',
            )
          }}
        >
          Dispatch ended on old stream
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        data-testid="replace-status"
        className="mt-3 text-sm text-slate-600"
      >
        {staleNote || (isSharing ? 'Sharing.' : 'Idle.')}
      </p>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  return (
    <WithDisplayMediaMock resultMode="success">
      {() => <EnabledStateBody />}
    </WithDisplayMediaMock>
  )
}

function EnabledStateBody() {
  const [enabled, setEnabled] = useState(false)
  const checkboxId = useId()
  const { isSharing, isLoading, error } = useDisplayMedia({ enabled })

  return (
    <ExampleShowcase
      hookName="useDisplayMedia"
      title="Enabled state"
      description="enabled is an advanced declarative activation signal, mainly useful when an external state machine should own sharing. Prefer imperative start() from a click handler — without a preceding user gesture, real browsers may block a declarative call with NotAllowedError."
      instruction="Toggle the checkbox to declaratively start and stop sharing (mocked here for a reproducible demo)."
      badge={enabled ? 'Enabled' : 'Disabled'}
      code={enabledStateSnippet}
    >
      <label
        htmlFor={checkboxId}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"
      >
        <input
          id={checkboxId}
          type="checkbox"
          data-testid="declarative-enabled-checkbox"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked)
          }}
          className="h-4 w-4 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        Share declaratively (enabled)
      </label>
      <p
        role="status"
        aria-live="polite"
        data-testid="declarative-status"
        className="mt-3 text-sm text-slate-600"
      >
        {isLoading ? 'Requesting…' : isSharing ? 'Sharing' : 'Idle'}
      </p>
      <p
        className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"
        data-testid="declarative-warning"
      >
        Real browsers usually require a user gesture immediately before
        getDisplayMedia — flipping enabled from a background effect can be
        blocked.
      </p>
      {error ? (
        <p
          role="alert"
          data-testid="declarative-error"
          className="mt-2 text-sm font-semibold text-rose-700"
        >
          {describeDisplayMediaError(error)}
        </p>
      ) : null}
    </ExampleShowcase>
  )
}

export function UnsupportedBrowserExample() {
  return (
    <WithDisplayMediaMock resultMode="success" supported={false}>
      {() => <UnsupportedBrowserBody />}
    </WithDisplayMediaMock>
  )
}

function UnsupportedBrowserBody() {
  const { isSupported, start } = useDisplayMedia()

  return (
    <ExampleShowcase
      hookName="useDisplayMedia"
      title="Unsupported browser"
      description="When navigator.mediaDevices.getDisplayMedia does not exist, isSupported is false. Disable the entry point instead of letting users hit a confusing failure."
      instruction="This story mocks an unsupported browser, so the button below stays disabled."
      badge="Unsupported"
      code={unsupportedSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Supported',
              value: String(isSupported),
              testId: 'unsupported-supported',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        data-testid="unsupported-start"
        disabled={!isSupported}
        className={primaryButtonClass}
        onClick={() => {
          void start()
        }}
      >
        Start sharing my screen
      </button>
      <p
        className="mt-3 text-sm text-slate-600"
        data-testid="unsupported-guidance"
      >
        Screen sharing isn&apos;t available in this browser. Try the latest
        Chrome, Edge, or Firefox on desktop.
      </p>
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  enabled = false,
  video = true,
  audio = false,
  resultMode = 'success',
}: {
  enabled?: boolean
  video?: boolean
  audio?: boolean
  resultMode?: DisplayMediaResultMode
}) {
  return (
    <WithDisplayMediaMock
      resultMode={resultMode === 'unavailable' ? 'success' : resultMode}
      supported={resultMode !== 'unavailable'}
    >
      {(controller) => (
        <PlaygroundBody
          controller={controller}
          enabled={enabled}
          video={video}
          audio={audio}
          resultMode={resultMode}
        />
      )}
    </WithDisplayMediaMock>
  )
}

function PlaygroundBody({
  controller,
  enabled,
  video,
  audio,
  resultMode,
}: {
  controller: DisplayMediaMockController
  enabled: boolean
  video: boolean
  audio: boolean
  resultMode: DisplayMediaResultMode
}) {
  const { stream, isSharing, isLoading, error, start, stop } = useDisplayMedia({
    enabled,
    video,
    audio,
  })
  const videoRef = useVideoPreview(stream)
  const videoTrackCount = stream?.getVideoTracks().length ?? 0
  const audioTrackCount = stream?.getAudioTracks().length ?? 0

  return (
    <ExampleShowcase
      hookName="useDisplayMedia"
      title="Playground"
      description="Combine every option: enabled, video/audio constraints, and a simulated result. This story always uses a mock — no real screen-share prompt ever opens here."
      instruction='Adjust the controls, click "Start sharing my screen", and try Simulate browser stop sharing.'
      badge={isLoading ? 'Requesting…' : isSharing ? 'Sharing' : 'Idle'}
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: String(enabled),
              testId: 'playground-enabled',
            },
            {
              label: 'Result mode',
              value: resultMode,
              testId: 'playground-result-mode',
            },
            {
              label: 'Video tracks',
              value: String(videoTrackCount),
              testId: 'playground-video-tracks',
            },
            {
              label: 'Audio tracks',
              value: String(audioTrackCount),
              testId: 'playground-audio-tracks',
            },
          ]}
        />
      }
    >
      <div className={videoFrameClass} data-testid="playground-frame">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Playground screen share preview"
          data-testid="playground-video"
          className={videoClass}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="playground-start"
          disabled={isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start sharing my screen
        </button>
        <button
          type="button"
          data-testid="playground-stop"
          disabled={!isSharing}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop sharing
        </button>
        <button
          type="button"
          data-testid="playground-simulate-end"
          disabled={!isSharing}
          className={dangerButtonClass}
          onClick={() => {
            controller.endActiveStream()
          }}
        >
          Simulate browser stop sharing
        </button>
      </div>
      <p
        role="alert"
        data-testid="playground-error"
        className="mt-3 min-h-5 text-sm font-semibold text-rose-700"
      >
        {describeDisplayMediaError(error) ?? ''}
      </p>
    </ExampleShowcase>
  )
}
