/**
 * Storybook-only deterministic mock for `navigator.mediaDevices.getDisplayMedia`.
 * Never ship this module in `dist`/the npm tarball — it exists purely to make
 * screen-share stories reproducible without a real browser share picker.
 */

export type DisplayMediaResultMode =
  'success' | 'cancelled' | 'denied' | 'unavailable'

export interface DisplayMediaMockTrackHandle {
  track: MediaStreamTrack
  kind: 'video' | 'audio'
  dispatchEnded: () => void
  getStopCount: () => number
}

export interface DisplayMediaMockStreamHandle {
  id: string
  stream: MediaStream
  tracks: DisplayMediaMockTrackHandle[]
  dispatchEndedOnFirstTrack: () => void
}

export interface DisplayMediaMockController {
  install: () => void
  uninstall: () => void
  isInstalled: () => boolean
  setSupported: (supported: boolean) => void
  setResultMode: (mode: DisplayMediaResultMode) => void
  setDeferred: (deferred: boolean) => void
  isPending: () => boolean
  resolvePending: (specs?: {
    video?: boolean
    audio?: boolean
  }) => DisplayMediaMockStreamHandle | null
  rejectPending: (error?: Error) => void
  getCallCount: () => number
  getLastConstraints: () => DisplayMediaStreamOptions | null
  getActiveStream: () => DisplayMediaMockStreamHandle | null
  endActiveStream: () => void
  getTotalStopCount: () => number
}

let sharedAudioContext: AudioContext | null = null

function getSharedAudioContext(): AudioContext {
  sharedAudioContext ??= new AudioContext()
  return sharedAudioContext
}

/**
 * Real browsers reject non-`MediaStream` values assigned to
 * `HTMLMediaElement.srcObject`, so this mock backs every track with a
 * genuine `MediaStreamTrack` (a captured canvas frame, or a silent audio
 * destination) instead of a plain object. `ended` is still fired manually
 * via the track's own `dispatchEvent` so stories can simulate the browser
 * ending a share on demand.
 */
function createRealTrack(kind: 'video' | 'audio'): MediaStreamTrack {
  if (kind === 'video') {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 2
    const context = canvas.getContext('2d')
    context?.fillRect(0, 0, canvas.width, canvas.height)
    const track = canvas.captureStream().getVideoTracks()[0]
    if (track == null) {
      throw new Error('Unable to create a mock display-media video track.')
    }
    return track
  }

  const destination = getSharedAudioContext().createMediaStreamDestination()
  const track = destination.stream.getAudioTracks()[0]
  if (track == null) {
    throw new Error('Unable to create a mock display-media audio track.')
  }
  return track
}

function buildErrorForMode(mode: Exclude<DisplayMediaResultMode, 'success'>) {
  if (mode === 'cancelled') {
    const error = new Error(
      'The user closed the share picker before choosing a screen, window, or tab.',
    )
    error.name = 'NotAllowedError'
    return error
  }

  if (mode === 'denied') {
    const error = new Error(
      'Permission to capture the screen was denied by the user or the platform.',
    )
    error.name = 'NotAllowedError'
    return error
  }

  const error = new Error(
    'MediaDevices.getDisplayMedia is not available in this environment.',
  )
  error.name = 'NotSupportedError'
  return error
}

function createMockTrack(
  kind: 'video' | 'audio',
  onStop: () => void,
): DisplayMediaMockTrackHandle {
  const track = createRealTrack(kind)
  let stopCount = 0

  const originalStop = track.stop.bind(track)
  track.stop = () => {
    stopCount += 1
    originalStop()
    onStop()
  }

  return {
    track,
    kind,
    dispatchEnded: () => {
      track.dispatchEvent(new Event('ended'))
    },
    getStopCount: () => stopCount,
  }
}

function createMockStream(
  specs: { video: boolean; audio: boolean },
  onTrackStop: () => void,
): DisplayMediaMockStreamHandle {
  const tracks: DisplayMediaMockTrackHandle[] = []
  if (specs.video) {
    tracks.push(createMockTrack('video', onTrackStop))
  }
  if (specs.audio) {
    tracks.push(createMockTrack('audio', onTrackStop))
  }

  const stream = new MediaStream(tracks.map((entry) => entry.track))

  return {
    id: stream.id,
    stream,
    tracks,
    dispatchEndedOnFirstTrack: () => {
      tracks[0]?.dispatchEnded()
    },
  }
}

function constraintsToSpecs(
  constraints: DisplayMediaStreamOptions | undefined,
): {
  video: boolean
  audio: boolean
} {
  return {
    video: constraints?.video !== false,
    audio:
      constraints?.audio === true ||
      (typeof constraints?.audio === 'object' && constraints.audio != null),
  }
}

export function createDisplayMediaMock(options?: {
  resultMode?: DisplayMediaResultMode
  supported?: boolean
  deferred?: boolean
}): DisplayMediaMockController {
  let resultMode: DisplayMediaResultMode = options?.resultMode ?? 'success'
  let supported = options?.supported ?? true
  let deferred = options?.deferred ?? false
  let callCount = 0
  let lastConstraints: DisplayMediaStreamOptions | null = null
  let activeStream: DisplayMediaMockStreamHandle | null = null
  let totalStopCount = 0
  let installed = false
  let previousMediaDevices: MediaDevices | undefined
  let hadOwnMediaDevices = false

  let pending: {
    resolve: (stream: MediaStream) => void
    reject: (error: Error) => void
    constraints: DisplayMediaStreamOptions | undefined
  } | null = null

  const onTrackStop = () => {
    totalStopCount += 1
  }

  const settle = (
    specs: { video: boolean; audio: boolean } | undefined,
    constraints: DisplayMediaStreamOptions | undefined,
    resolve: (stream: MediaStream) => void,
    reject: (error: Error) => void,
  ) => {
    if (resultMode !== 'success') {
      reject(buildErrorForMode(resultMode))
      return
    }

    const handle = createMockStream(
      specs ?? constraintsToSpecs(constraints),
      onTrackStop,
    )
    activeStream = handle
    resolve(handle.stream)
  }

  const mediaDevicesMock: {
    getDisplayMedia?: MediaDevices['getDisplayMedia']
  } = {}

  const handleGetDisplayMedia = (
    constraints?: DisplayMediaStreamOptions,
  ): Promise<MediaStream> => {
    callCount += 1
    lastConstraints = constraints ?? null

    return new Promise<MediaStream>((resolve, reject) => {
      if (deferred) {
        pending = { resolve, reject, constraints }
        return
      }
      settle(undefined, constraints, resolve, reject)
    })
  }

  const syncSupported = () => {
    if (supported) {
      mediaDevicesMock.getDisplayMedia =
        handleGetDisplayMedia as MediaDevices['getDisplayMedia']
    } else {
      delete mediaDevicesMock.getDisplayMedia
    }
  }

  syncSupported()

  return {
    isInstalled: () => installed,
    install() {
      if (installed || typeof navigator === 'undefined') {
        return
      }

      hadOwnMediaDevices = Object.prototype.hasOwnProperty.call(
        navigator,
        'mediaDevices',
      )
      previousMediaDevices = navigator.mediaDevices

      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: mediaDevicesMock,
      })
      installed = true
    },
    uninstall() {
      if (!installed || typeof navigator === 'undefined') {
        return
      }

      if (hadOwnMediaDevices) {
        Object.defineProperty(navigator, 'mediaDevices', {
          configurable: true,
          enumerable: true,
          writable: true,
          value: previousMediaDevices,
        })
      } else {
        Reflect.deleteProperty(navigator, 'mediaDevices')
      }

      previousMediaDevices = undefined
      hadOwnMediaDevices = false
      pending = null
      installed = false
    },
    setSupported(next) {
      supported = next
      syncSupported()
    },
    setResultMode(mode) {
      resultMode = mode
    },
    setDeferred(next) {
      deferred = next
    },
    isPending: () => pending != null,
    resolvePending(specs) {
      if (pending == null) {
        return null
      }
      const { resolve, constraints } = pending
      pending = null
      let resolvedHandle: DisplayMediaMockStreamHandle | null = null
      settle(
        specs
          ? { video: specs.video ?? true, audio: specs.audio ?? false }
          : undefined,
        constraints,
        (stream) => {
          resolvedHandle = activeStream
          resolve(stream)
        },
        () => {
          // resultMode flipped to non-success while pending; caller should
          // use rejectPending explicitly for that case instead.
        },
      )
      return resolvedHandle
    },
    rejectPending(error) {
      if (pending == null) {
        return
      }
      const { reject } = pending
      pending = null
      reject(error ?? buildErrorForMode('denied'))
    },
    getCallCount: () => callCount,
    getLastConstraints: () => lastConstraints,
    getActiveStream: () => activeStream,
    endActiveStream() {
      activeStream?.dispatchEndedOnFirstTrack()
    },
    getTotalStopCount: () => totalStopCount,
  }
}
