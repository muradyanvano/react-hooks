import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useDevicesList, useUserMedia } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  createMediaDevicesMock,
  DEFAULT_LABELED_DEVICES,
  type MediaDevicesMockController,
} from './mediaDevicesMock'
import {
  createUserMediaMock,
  type UserMediaMockController,
  type UserMediaResultMode,
} from './userMediaMock'
import {
  autoSwitchSnippet,
  cameraAndMicrophoneSnippet,
  constraintErrorSnippet,
  deviceBusySnippet,
  deviceSelectionSnippet,
  enabledStateSnippet,
  facingModeSnippet,
  liveCameraSnippet,
  manualRestartSnippet,
  microphoneOnlySnippet,
  noDeviceSnippet,
  overlappingRequestsSnippet,
  overviewSnippet,
  permissionDeniedSnippet,
  playgroundSnippet,
  resolutionConstraintsSnippet,
  trackEndedSnippet,
  unsupportedSnippet,
  videoPreviewSnippet,
} from './useUserMedia.snippets'

const primaryButtonClass =
  'rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60'
const dangerButtonClass =
  'rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800 outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60'
const videoFrameClass =
  'relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900'
const videoClass = 'aspect-video w-full bg-slate-900 object-contain'

function describeUserMediaError(error: Error | null): string | null {
  if (error == null) {
    return null
  }

  if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
    return 'Camera/microphone access was denied or blocked. Click "Start camera" to try again.'
  }

  if (error.name === 'NotFoundError') {
    return 'No camera or microphone matching the request was found.'
  }

  if (error.name === 'NotReadableError') {
    return 'The camera or microphone is already in use or cannot be read.'
  }

  if (error.name === 'OverconstrainedError') {
    return 'The requested camera or microphone constraints cannot be satisfied.'
  }

  if (error.name === 'NotSupportedError') {
    return 'Camera/microphone access is not available in this browser.'
  }

  return 'Camera/microphone access failed. Please try again.'
}

function useVideoPreview(stream: MediaStream | null) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

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

function WithUserMediaMock({
  children,
  resultMode = 'success',
  supported = true,
  deferred = false,
  onReady,
}: {
  children: (controller: UserMediaMockController) => ReactNode
  resultMode?: UserMediaResultMode
  supported?: boolean
  deferred?: boolean
  onReady?: ((controller: UserMediaMockController) => void) | undefined
}) {
  const [controller] = useState(() =>
    createUserMediaMock({ resultMode, supported, deferred }),
  )

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

function WithUserMediaAndDevicesMock({
  children,
  onReady,
}: {
  children: (controllers: {
    userMedia: UserMediaMockController
    devices: MediaDevicesMockController
  }) => ReactNode
  onReady?: (controllers: {
    userMedia: UserMediaMockController
    devices: MediaDevicesMockController
  }) => void
}) {
  const [devicesController] = useState(() =>
    createMediaDevicesMock({
      initialDevices: DEFAULT_LABELED_DEVICES,
      permissionGrantedLabels: true,
    }),
  )
  const [userMediaController] = useState(() => createUserMediaMock())

  if (!devicesController.isInstalled()) {
    devicesController.install()
  }
  if (!userMediaController.isInstalled()) {
    userMediaController.install()
  }

  useEffect(() => {
    devicesController.install()
    userMediaController.install()
    onReady?.({ userMedia: userMediaController, devices: devicesController })
    return () => {
      userMediaController.uninstall()
      devicesController.uninstall()
    }
  }, [devicesController, userMediaController, onReady])

  return (
    <>
      {children({ userMedia: userMediaController, devices: devicesController })}
    </>
  )
}

export function LiveCameraExample() {
  const [includeVideo, setIncludeVideo] = useState(true)
  const [includeAudio, setIncludeAudio] = useState(false)
  const {
    isSupported,
    stream,
    isActive,
    isLoading,
    error,
    start,
    stop,
    restart,
  } = useUserMedia({
    constraints: { video: includeVideo, audio: includeAudio },
  })
  const videoRef = useVideoPreview(stream)
  const descriptionId = useId()
  const videoToggleId = useId()
  const audioToggleId = useId()

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Live camera"
      description="Uses the real navigator.mediaDevices.getUserMedia — no Storybook mock. Your browser will ask for camera and/or microphone permission."
      instruction='Click "Start camera". Your browser shows its native permission prompt — allow or deny to see the result below.'
      badge={isLoading ? 'Requesting…' : isActive ? 'Active' : 'Idle'}
      code={liveCameraSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Supported',
              value: String(isSupported),
              testId: 'live-supported',
            },
            {
              label: 'Active',
              value: isActive ? 'true' : 'false',
              testId: 'live-active',
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
          aria-label="Live camera preview"
          aria-describedby={descriptionId}
          data-testid="live-video"
          className={videoClass}
        />
        {!isActive ? (
          <p
            className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-medium text-slate-300"
            data-testid="live-placeholder"
          >
            {isSupported
              ? 'No camera active yet.'
              : 'Camera access is not available in this browser.'}
          </p>
        ) : null}
      </div>
      <p id={descriptionId} className="mt-2 text-xs text-slate-500">
        The preview mirrors your selected camera when video is enabled.
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
          Start camera
        </button>
        <button
          type="button"
          data-testid="live-stop"
          disabled={!isActive}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop
        </button>
        <button
          type="button"
          data-testid="live-restart"
          disabled={!isActive || isLoading}
          className={secondaryButtonClass}
          onClick={() => {
            void restart()
          }}
        >
          Restart
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        <label
          htmlFor={videoToggleId}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"
        >
          <input
            id={videoToggleId}
            type="checkbox"
            data-testid="live-video-toggle"
            checked={includeVideo}
            onChange={(event) => {
              setIncludeVideo(event.target.checked)
            }}
            className="h-4 w-4 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
          Camera
        </label>
        <label
          htmlFor={audioToggleId}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"
        >
          <input
            id={audioToggleId}
            type="checkbox"
            data-testid="live-audio-toggle"
            checked={includeAudio}
            onChange={(event) => {
              setIncludeAudio(event.target.checked)
            }}
            className="h-4 w-4 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
          Microphone
        </label>
      </div>

      <p
        role="alert"
        data-testid="live-error"
        className="mt-3 min-h-5 text-sm font-semibold text-rose-700"
      >
        {describeUserMediaError(error) ?? ''}
      </p>

      {!isSupported ? (
        <p
          className="mt-2 text-sm text-slate-600"
          data-testid="live-unsupported-help"
        >
          Try the latest Chrome, Edge, or Firefox on desktop or mobile.
        </p>
      ) : null}
    </ExampleShowcase>
  )
}

export function OverviewExample() {
  return (
    <WithUserMediaMock resultMode="success">
      {() => <OverviewBody />}
    </WithUserMediaMock>
  )
}

function OverviewBody() {
  const { stream, isActive, isLoading, error, start, stop } = useUserMedia()
  const videoRef = useVideoPreview(stream)
  const videoTrackCount = stream?.getVideoTracks().length ?? 0
  const audioTrackCount = stream?.getAudioTracks().length ?? 0

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Studio camera"
      description="A deterministic mock stands in for the browser's permission prompt so this story is reproducible. Defaults request { video: true, audio: false }."
      instruction='Click "Start camera" to preview a mocked capture, then stop it.'
      badge={isLoading ? 'Requesting…' : isActive ? 'Active' : 'Idle'}
      code={overviewSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Status',
              value: isLoading ? 'Loading' : isActive ? 'Active' : 'Idle',
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
          aria-label="Studio camera preview"
          data-testid="overview-video"
          className={videoClass}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="overview-start"
          disabled={isActive || isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start camera
        </button>
        <button
          type="button"
          data-testid="overview-stop"
          disabled={!isActive}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop
        </button>
      </div>
      <p
        role="alert"
        data-testid="overview-error"
        className="mt-3 min-h-5 text-sm font-semibold text-rose-700"
      >
        {error ? describeUserMediaError(error) : ''}
      </p>
      <p className="mt-2 text-xs text-slate-500" data-testid="overview-privacy">
        Privacy: capture stops immediately on Stop or when every track ends
        (unplugged device, OS revoke).
      </p>
    </ExampleShowcase>
  )
}

export function VideoPreviewExample() {
  return (
    <WithUserMediaMock resultMode="success">
      {() => <VideoPreviewBody />}
    </WithUserMediaMock>
  )
}

function VideoPreviewBody() {
  const { stream, isActive, start, stop } = useUserMedia()
  const videoRef = useVideoPreview(stream)

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Video preview"
      description="Attach the returned stream to a <video> element with a srcObject effect, never createObjectURL — browsers removed object URL support for MediaStream."
      instruction="Start the camera to swap the placeholder for a live preview, then stop to clear it."
      code={videoPreviewSnippet}
    >
      <div
        data-testid="preview-frame"
        data-active={isActive ? 'true' : 'false'}
        className={videoFrameClass}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Preview of the camera"
          data-testid="preview-video"
          className={videoClass}
        />
        {!isActive ? (
          <p
            data-testid="preview-placeholder"
            className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-300"
          >
            No camera active yet
          </p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="preview-start"
          disabled={isActive}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start camera
        </button>
        <button
          type="button"
          data-testid="preview-stop"
          disabled={!isActive}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function MicrophoneOnlyExample() {
  return (
    <WithUserMediaMock resultMode="success">
      {() => <MicrophoneOnlyBody />}
    </WithUserMediaMock>
  )
}

function MicrophoneOnlyBody() {
  const { stream, isActive, start, stop } = useUserMedia({
    constraints: { video: false, audio: true },
  })
  const audioTrackCount = stream?.getAudioTracks().length ?? 0
  const videoTrackCount = stream?.getVideoTracks().length ?? 0

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Microphone only"
      description="Request { video: false, audio: true } for audio-only capture — useful for voice notes or audio meters without a camera preview."
      instruction='Click "Start microphone" to begin audio-only capture.'
      code={microphoneOnlySnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Audio tracks',
              value: String(audioTrackCount),
              testId: 'mic-audio-tracks',
            },
            {
              label: 'Video tracks',
              value: String(videoTrackCount),
              testId: 'mic-video-tracks',
            },
            {
              label: 'Active',
              value: isActive ? 'true' : 'false',
              testId: 'mic-active',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="mic-start"
          disabled={isActive}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start microphone
        </button>
        <button
          type="button"
          data-testid="mic-stop"
          disabled={!isActive}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function CameraAndMicrophoneExample() {
  return (
    <WithUserMediaMock resultMode="success">
      {() => <CameraAndMicrophoneBody />}
    </WithUserMediaMock>
  )
}

function CameraAndMicrophoneBody() {
  const { stream, isActive, start, stop } = useUserMedia({
    constraints: { video: true, audio: true },
  })
  const videoTrackCount = stream?.getVideoTracks().length ?? 0
  const audioTrackCount = stream?.getAudioTracks().length ?? 0

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Camera and microphone"
      description="Request { video: true, audio: true } for combined capture. Whether both tracks are returned depends on hardware and browser policy."
      instruction="Start capture to see how many video and audio tracks the (mocked) stream returned."
      code={cameraAndMicrophoneSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Video tracks',
              value: String(videoTrackCount),
              testId: 'both-video-tracks',
            },
            {
              label: 'Audio tracks',
              value: String(audioTrackCount),
              testId: 'both-audio-tracks',
            },
            {
              label: 'Active',
              value: isActive ? 'true' : 'false',
              testId: 'both-active',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="both-start"
          disabled={isActive}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start camera
        </button>
        <button
          type="button"
          data-testid="both-stop"
          disabled={!isActive}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function DeviceSelectionExample() {
  return (
    <WithUserMediaAndDevicesMock>
      {() => <DeviceSelectionBody />}
    </WithUserMediaAndDevicesMock>
  )
}

function DeviceSelectionBody() {
  const { devices, refresh, isLoading: devicesLoading } = useDevicesList()
  const [videoDeviceId, setVideoDeviceId] = useState('')
  const [audioDeviceId, setAudioDeviceId] = useState('')

  const constraints = {
    video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
    audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : false,
  } as const

  const { isActive, isLoading, start, stop } = useUserMedia({ constraints })

  const cameras = devices.filter((device) => device.kind === 'videoinput')
  const microphones = devices.filter((device) => device.kind === 'audioinput')
  const cameraSelectId = useId()
  const micSelectId = useId()

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Device selection"
      description="Compose useDevicesList for labeled device ids with useUserMedia constraints. Pick specific hardware or fall back to browser defaults."
      instruction="Choose a camera and optional microphone, then start capture."
      code={deviceSelectionSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Cameras',
              value: String(cameras.length),
              testId: 'device-cameras',
            },
            {
              label: 'Microphones',
              value: String(microphones.length),
              testId: 'device-microphones',
            },
            {
              label: 'Active',
              value: isActive ? 'true' : 'false',
              testId: 'device-active',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="device-refresh"
          disabled={devicesLoading}
          className={secondaryButtonClass}
          onClick={() => {
            void refresh()
          }}
        >
          Refresh devices
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label
          htmlFor={cameraSelectId}
          className="flex flex-col gap-1 text-sm font-semibold text-slate-800"
        >
          Camera
          <select
            id={cameraSelectId}
            data-testid="device-camera-select"
            value={videoDeviceId}
            onChange={(event) => {
              setVideoDeviceId(event.target.value)
            }}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal"
          >
            <option value="">Default camera</option>
            {cameras.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label.trim() ? device.label : 'Unnamed camera'}
              </option>
            ))}
          </select>
        </label>

        <label
          htmlFor={micSelectId}
          className="flex flex-col gap-1 text-sm font-semibold text-slate-800"
        >
          Microphone
          <select
            id={micSelectId}
            data-testid="device-mic-select"
            value={audioDeviceId}
            onChange={(event) => {
              setAudioDeviceId(event.target.value)
            }}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal"
          >
            <option value="">No microphone</option>
            {microphones.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label.trim() ? device.label : 'Unnamed microphone'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="device-start"
          disabled={isActive || isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start camera
        </button>
        <button
          type="button"
          data-testid="device-stop"
          disabled={!isActive}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function FacingModeExample() {
  return (
    <WithUserMediaMock resultMode="success">
      {() => <FacingModeBody />}
    </WithUserMediaMock>
  )
}

function FacingModeBody() {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const { isActive, isLoading, start, stop } = useUserMedia({
    autoSwitch: true,
    constraints: { video: { facingMode }, audio: false },
  })
  const frontId = useId()
  const backId = useId()

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Facing mode"
      description="Mobile browsers honor facingMode: 'user' (front) vs 'environment' (back). With autoSwitch (default), changing the constraint restarts capture automatically."
      instruction="Pick a facing mode, start the camera, then switch modes to see auto-switch restart."
      code={facingModeSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Facing',
              value: facingMode,
              testId: 'facing-mode',
            },
            {
              label: 'Active',
              value: isActive ? 'true' : 'false',
              testId: 'facing-active',
            },
          ]}
        />
      }
    >
      <fieldset className="flex flex-wrap gap-4">
        <legend className="sr-only">Camera facing mode</legend>
        <label
          htmlFor={frontId}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"
        >
          <input
            id={frontId}
            type="radio"
            name="facing-mode"
            data-testid="facing-user"
            checked={facingMode === 'user'}
            onChange={() => {
              setFacingMode('user')
            }}
            className="h-4 w-4 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
          Front (user)
        </label>
        <label
          htmlFor={backId}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"
        >
          <input
            id={backId}
            type="radio"
            name="facing-mode"
            data-testid="facing-environment"
            checked={facingMode === 'environment'}
            onChange={() => {
              setFacingMode('environment')
            }}
            className="h-4 w-4 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
          Back (environment)
        </label>
      </fieldset>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="facing-start"
          disabled={isActive || isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start camera
        </button>
        <button
          type="button"
          data-testid="facing-stop"
          disabled={!isActive}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function ResolutionConstraintsExample() {
  return (
    <WithUserMediaMock resultMode="success">
      {() => <ResolutionConstraintsBody />}
    </WithUserMediaMock>
  )
}

function ResolutionConstraintsBody() {
  const [width, setWidth] = useState(640)
  const { stream, isActive, isLoading, start, stop } = useUserMedia({
    autoSwitch: true,
    constraints: {
      video: { width: { ideal: width } },
      audio: false,
    },
  })
  const settings = stream?.getVideoTracks()[0]?.getSettings()
  const widthInputId = useId()

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Resolution constraints"
      description="Pass width/height ideals (or exact bounds) in video constraints. Browsers pick the closest supported resolution — actual settings may differ from the request."
      instruction="Change the ideal width while active to see auto-switch request a new stream."
      code={resolutionConstraintsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Ideal width',
              value: String(width),
              testId: 'resolution-ideal',
            },
            {
              label: 'Actual width',
              value: settings?.width != null ? String(settings.width) : '—',
              testId: 'resolution-actual',
            },
          ]}
        />
      }
    >
      <label
        htmlFor={widthInputId}
        className="flex flex-col gap-1 text-sm font-semibold text-slate-800 sm:max-w-xs"
      >
        Ideal width
        <input
          id={widthInputId}
          type="number"
          data-testid="resolution-width"
          value={width}
          min={160}
          step={160}
          onChange={(event) => {
            setWidth(Number(event.target.value))
          }}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="resolution-start"
          disabled={isActive || isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start camera
        </button>
        <button
          type="button"
          data-testid="resolution-stop"
          disabled={!isActive}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function AutoSwitchExample() {
  return (
    <WithUserMediaMock resultMode="success">
      {(controller) => <AutoSwitchBody controller={controller} />}
    </WithUserMediaMock>
  )
}

function AutoSwitchBody({
  controller,
}: {
  controller: UserMediaMockController
}) {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const { isActive, start } = useUserMedia({
    autoSwitch: true,
    constraints: { video: { facingMode }, audio: false },
  })
  const [callCount, setCallCount] = useState(0)

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Auto-switch"
      description="When autoSwitch is true (default), changing constraints while a stream is active automatically requests a replacement stream."
      instruction="Start the camera, toggle facing mode, and watch getUserMedia fire again."
      code={autoSwitchSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'getUserMedia calls',
              value: String(callCount),
              testId: 'autoswitch-calls',
            },
            {
              label: 'Facing',
              value: facingMode,
              testId: 'autoswitch-facing',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="autoswitch-start"
          disabled={isActive}
          className={primaryButtonClass}
          onClick={() => {
            void start().then(() => {
              setCallCount(controller.getCallCount())
            })
          }}
        >
          Start camera
        </button>
        <button
          type="button"
          data-testid="autoswitch-toggle"
          disabled={!isActive}
          className={secondaryButtonClass}
          onClick={() => {
            setFacingMode((current) =>
              current === 'user' ? 'environment' : 'user',
            )
            queueMicrotask(() => {
              setCallCount(controller.getCallCount())
            })
          }}
        >
          Toggle facing mode
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        data-testid="autoswitch-status"
        className="mt-3 text-sm text-slate-600"
      >
        Facing: {facingMode}.{' '}
        {isActive ? 'Active — constraint changes restart capture.' : 'Idle.'}
      </p>
    </ExampleShowcase>
  )
}

export function ManualRestartExample() {
  return (
    <WithUserMediaMock resultMode="success">
      {(controller) => <ManualRestartBody controller={controller} />}
    </WithUserMediaMock>
  )
}

function ManualRestartBody({
  controller,
}: {
  controller: UserMediaMockController
}) {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const { isActive, isLoading, start, restart } = useUserMedia({
    autoSwitch: false,
    constraints: { video: { facingMode }, audio: false },
  })
  const [callCount, setCallCount] = useState(0)

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Manual restart"
      description="With autoSwitch: false, constraint changes do not touch the active stream. Call restart() after updating constraints when you want a fresh capture."
      instruction='Start the camera, toggle facing mode, then click "Restart with new constraints".'
      code={manualRestartSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'getUserMedia calls',
              value: String(callCount),
              testId: 'manual-calls',
            },
            {
              label: 'Facing',
              value: facingMode,
              testId: 'manual-facing',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="manual-start"
          disabled={isActive || isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start().then(() => {
              setCallCount(controller.getCallCount())
            })
          }}
        >
          Start camera
        </button>
        <button
          type="button"
          data-testid="manual-toggle-facing"
          className={secondaryButtonClass}
          onClick={() => {
            setFacingMode((current) =>
              current === 'user' ? 'environment' : 'user',
            )
            setCallCount(controller.getCallCount())
          }}
        >
          Toggle facing mode
        </button>
        <button
          type="button"
          data-testid="manual-restart"
          disabled={!isActive || isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void restart().then(() => {
              setCallCount(controller.getCallCount())
            })
          }}
        >
          Restart with new constraints
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        data-testid="manual-status"
        className="mt-3 text-sm text-slate-600"
      >
        Facing: {facingMode}. Toggle alone does not restart when autoSwitch is
        false.
      </p>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  return (
    <WithUserMediaMock resultMode="success">
      {() => <EnabledStateBody />}
    </WithUserMediaMock>
  )
}

function EnabledStateBody() {
  const [enabled, setEnabled] = useState(false)
  const checkboxId = useId()
  const { isActive, isLoading, error } = useUserMedia({ enabled })

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Enabled state"
      description="enabled is an advanced declarative activation signal, mainly useful when an external state machine should own capture. Prefer imperative start() from a click handler — without a preceding user gesture, real browsers may block a declarative call with NotAllowedError."
      instruction="Toggle the checkbox to declaratively start and stop capture (mocked here for a reproducible demo)."
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
        Camera declaratively (enabled)
      </label>
      <p
        role="status"
        aria-live="polite"
        data-testid="declarative-status"
        className="mt-3 text-sm text-slate-600"
      >
        {isLoading ? 'Requesting…' : isActive ? 'Active' : 'Idle'}
      </p>
      <p
        className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"
        data-testid="declarative-warning"
      >
        Real browsers usually require a user gesture immediately before
        getUserMedia — flipping enabled from a background effect can be blocked.
      </p>
      {error ? (
        <p
          role="alert"
          data-testid="declarative-error"
          className="mt-2 text-sm font-semibold text-rose-700"
        >
          {describeUserMediaError(error)}
        </p>
      ) : null}
    </ExampleShowcase>
  )
}

export function PermissionDeniedExample() {
  return (
    <WithUserMediaMock resultMode="denied">
      {() => <PermissionDeniedBody />}
    </WithUserMediaMock>
  )
}

function PermissionDeniedBody() {
  const { isActive, isLoading, error, start } = useUserMedia()

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Permission denied"
      description="Denying the browser prompt (or a policy blocking access) rejects with NotAllowedError. The hook normalizes the failure into error and returns to idle — start() never throws."
      instruction='Click "Start camera" to simulate a denied prompt, then retry freely.'
      badge={isLoading ? 'Requesting…' : 'Idle'}
      code={permissionDeniedSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="denied-start"
          disabled={isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start camera
        </button>
      </div>
      <p
        role="alert"
        data-testid="denied-error"
        className="mt-3 min-h-5 text-sm font-semibold text-rose-700"
      >
        {describeUserMediaError(error) ?? ''}
      </p>
      <p
        role="status"
        aria-live="polite"
        data-testid="denied-status"
        className="mt-2 text-sm text-slate-600"
      >
        {isActive ? 'Active' : 'Idle — safe to retry.'}
      </p>
    </ExampleShowcase>
  )
}

export function NoDeviceExample() {
  return (
    <WithUserMediaMock resultMode="notfound">
      {() => <NoDeviceBody />}
    </WithUserMediaMock>
  )
}

function NoDeviceBody() {
  const { isActive, isLoading, error, start } = useUserMedia()

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="No device found"
      description="NotFoundError means no hardware matched the request — unplugged cameras, invalid deviceId, or empty constraint sets on some platforms."
      instruction='Click "Start camera" to simulate a missing device.'
      badge={isLoading ? 'Requesting…' : 'Idle'}
      code={noDeviceSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="notfound-start"
          disabled={isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start camera
        </button>
      </div>
      <p
        role="alert"
        data-testid="notfound-error"
        className="mt-3 min-h-5 text-sm font-semibold text-rose-700"
      >
        {describeUserMediaError(error) ?? ''}
      </p>
      <p
        role="status"
        aria-live="polite"
        data-testid="notfound-status"
        className="mt-2 text-sm text-slate-600"
      >
        {isActive ? 'Active' : 'Idle'}
      </p>
    </ExampleShowcase>
  )
}

export function DeviceBusyExample() {
  return (
    <WithUserMediaMock resultMode="notreadable">
      {() => <DeviceBusyBody />}
    </WithUserMediaMock>
  )
}

function DeviceBusyBody() {
  const { isActive, isLoading, error, start } = useUserMedia()

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Device busy"
      description="NotReadableError usually means the hardware is already captured by another tab or app, or the driver rejected the open request."
      instruction='Click "Start camera" to simulate a busy/unreadable device.'
      badge={isLoading ? 'Requesting…' : 'Idle'}
      code={deviceBusySnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="busy-start"
          disabled={isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start camera
        </button>
      </div>
      <p
        role="alert"
        data-testid="busy-error"
        className="mt-3 min-h-5 text-sm font-semibold text-rose-700"
      >
        {describeUserMediaError(error) ?? ''}
      </p>
      <p
        role="status"
        aria-live="polite"
        data-testid="busy-status"
        className="mt-2 text-sm text-slate-600"
      >
        {isActive ? 'Active' : 'Idle'}
      </p>
    </ExampleShowcase>
  )
}

export function ConstraintErrorExample() {
  return (
    <WithUserMediaMock resultMode="overconstrained">
      {() => <ConstraintErrorBody />}
    </WithUserMediaMock>
  )
}

function ConstraintErrorBody() {
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
    <ExampleShowcase
      hookName="useUserMedia"
      title="Constraint error"
      description="OverconstrainedError means the browser cannot satisfy the requested bounds — common with impossible exact width/height pairs."
      instruction='Click "Start camera" to simulate unsatisfiable constraints.'
      badge={isLoading ? 'Requesting…' : 'Idle'}
      code={constraintErrorSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="constraint-start"
          disabled={isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start camera
        </button>
      </div>
      <p
        role="alert"
        data-testid="constraint-error"
        className="mt-3 min-h-5 text-sm font-semibold text-rose-700"
      >
        {describeUserMediaError(error) ?? ''}
      </p>
      <p
        role="status"
        aria-live="polite"
        data-testid="constraint-status"
        className="mt-2 text-sm text-slate-600"
      >
        {isActive ? 'Active' : 'Idle'}
      </p>
    </ExampleShowcase>
  )
}

export function OverlappingRequestsExample() {
  return (
    <WithUserMediaMock resultMode="success" deferred>
      {(controller) => <OverlappingRequestsBody controller={controller} />}
    </WithUserMediaMock>
  )
}

function OverlappingRequestsBody({
  controller,
}: {
  controller: UserMediaMockController
}) {
  const { stream, isActive, start } = useUserMedia()
  const [note, setNote] = useState('Idle.')

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Overlapping requests"
      description="Rapid start() calls while a request is pending: the latest request wins. Stale streams from superseded calls are stopped automatically."
      instruction='Click "Start camera" twice quickly, then resolve the second pending request.'
      code={overlappingRequestsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Active',
              value: isActive ? 'true' : 'false',
              testId: 'overlap-active',
            },
            {
              label: 'Stream id',
              value: stream?.id ?? '—',
              testId: 'overlap-stream-id',
            },
            {
              label: 'Pending',
              value: controller.isPending() ? 'true' : 'false',
              testId: 'overlap-pending',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="overlap-start"
          className={primaryButtonClass}
          onClick={() => {
            void start()
            setNote('First start() fired.')
          }}
        >
          Start camera
        </button>
        <button
          type="button"
          data-testid="overlap-start-again"
          className={secondaryButtonClass}
          onClick={() => {
            void start()
            setNote('Second start() fired — latest wins when resolved.')
          }}
        >
          Start again (overlap)
        </button>
        <button
          type="button"
          data-testid="overlap-resolve"
          disabled={!controller.isPending()}
          className={secondaryButtonClass}
          onClick={() => {
            controller.resolvePending({ video: true, audio: false })
          }}
        >
          Resolve pending
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        data-testid="overlap-status"
        className="mt-3 text-sm text-slate-600"
      >
        {note}
      </p>
    </ExampleShowcase>
  )
}

export function TrackEndedExample() {
  return (
    <WithUserMediaMock resultMode="success">
      {(controller) => <TrackEndedBody controller={controller} />}
    </WithUserMediaMock>
  )
}

function TrackEndedBody({
  controller,
}: {
  controller: UserMediaMockController
}) {
  const { isActive, isLoading, start } = useUserMedia()

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Track ended"
      description='When the browser ends every track (unplugged device, OS revoke, etc.), the hook listens for native "ended" events and resets without stop().'
      instruction='Start capture, then click "Simulate track ended" to mimic hardware removal.'
      badge={isActive ? 'Active' : 'Idle'}
      code={trackEndedSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="ended-start"
          disabled={isActive || isLoading}
          className={primaryButtonClass}
          onClick={() => {
            void start()
          }}
        >
          Start camera
        </button>
        <button
          type="button"
          data-testid="ended-simulate"
          disabled={!isActive}
          className={dangerButtonClass}
          onClick={() => {
            controller.endAllActiveTracks()
          }}
        >
          Simulate track ended
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        data-testid="ended-status"
        className="mt-3 text-sm text-slate-600"
      >
        {isActive
          ? 'Active — try the button above.'
          : 'Idle. No stop() call was made — the hook detected the ended track itself.'}
      </p>
    </ExampleShowcase>
  )
}

export function UnsupportedBrowserExample() {
  return (
    <WithUserMediaMock resultMode="success" supported={false}>
      {() => <UnsupportedBrowserBody />}
    </WithUserMediaMock>
  )
}

function UnsupportedBrowserBody() {
  const { isSupported, start } = useUserMedia()

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Unsupported browser"
      description="When navigator.mediaDevices.getUserMedia does not exist, isSupported is false. Disable the entry point instead of letting users hit a confusing failure."
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
        Start camera
      </button>
      <p
        className="mt-3 text-sm text-slate-600"
        data-testid="unsupported-guidance"
      >
        Camera access isn&apos;t available in this browser. Try the latest
        Chrome, Edge, or Firefox.
      </p>
    </ExampleShowcase>
  )
}

export type PlaygroundResultMode = UserMediaResultMode | 'unsupported'

export function PlaygroundExample({
  enabled = false,
  autoSwitch = true,
  video = true,
  audio = false,
  resultMode = 'success',
}: {
  enabled?: boolean
  autoSwitch?: boolean
  video?: boolean
  audio?: boolean
  resultMode?: PlaygroundResultMode
}) {
  return (
    <WithUserMediaMock
      resultMode={resultMode === 'unsupported' ? 'success' : resultMode}
      supported={resultMode !== 'unsupported'}
    >
      {(controller) => (
        <PlaygroundBody
          controller={controller}
          enabled={enabled}
          autoSwitch={autoSwitch}
          video={video}
          audio={audio}
          resultMode={resultMode}
        />
      )}
    </WithUserMediaMock>
  )
}

function PlaygroundBody({
  controller,
  enabled,
  autoSwitch,
  video,
  audio,
  resultMode,
}: {
  controller: UserMediaMockController
  enabled: boolean
  autoSwitch: boolean
  video: boolean
  audio: boolean
  resultMode: PlaygroundResultMode
}) {
  const { stream, isActive, isLoading, error, start, stop } = useUserMedia({
    enabled,
    autoSwitch,
    constraints: { video, audio },
  })
  const videoRef = useVideoPreview(stream)
  const videoTrackCount = stream?.getVideoTracks().length ?? 0
  const audioTrackCount = stream?.getAudioTracks().length ?? 0

  return (
    <ExampleShowcase
      hookName="useUserMedia"
      title="Playground"
      description="Combine every option: enabled, autoSwitch, video/audio constraints, and a simulated result. This story always uses a mock — no real camera prompt ever opens here."
      instruction='Adjust the controls, click "Start camera", and try Simulate track ended.'
      badge={isLoading ? 'Requesting…' : isActive ? 'Active' : 'Idle'}
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
              label: 'Auto-switch',
              value: String(autoSwitch),
              testId: 'playground-autoswitch',
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
      {video ? (
        <div className={videoFrameClass} data-testid="playground-frame">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            aria-label="Playground camera preview"
            data-testid="playground-video"
            className={videoClass}
          />
        </div>
      ) : null}
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
          Start camera
        </button>
        <button
          type="button"
          data-testid="playground-stop"
          disabled={!isActive}
          className={secondaryButtonClass}
          onClick={stop}
        >
          Stop
        </button>
        <button
          type="button"
          data-testid="playground-simulate-end"
          disabled={!isActive}
          className={dangerButtonClass}
          onClick={() => {
            controller.endAllActiveTracks()
          }}
        >
          Simulate track ended
        </button>
      </div>
      <p
        role="alert"
        data-testid="playground-error"
        className="mt-3 min-h-5 text-sm font-semibold text-rose-700"
      >
        {describeUserMediaError(error) ?? ''}
      </p>
    </ExampleShowcase>
  )
}
