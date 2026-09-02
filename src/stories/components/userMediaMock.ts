/**
 * Storybook-only deterministic mock for `navigator.mediaDevices.getUserMedia`.
 * Never ship this module in `dist`/the npm tarball — it exists purely to make
 * camera/microphone stories reproducible without real hardware prompts.
 */

export type UserMediaResultMode =
  'success' | 'denied' | 'notfound' | 'notreadable' | 'overconstrained'

export interface UserMediaMockTrackHandle {
  track: MediaStreamTrack
  kind: 'video' | 'audio'
  dispatchEnded: () => void
  getStopCount: () => number
}

export interface UserMediaMockStreamHandle {
  id: string
  stream: MediaStream
  tracks: UserMediaMockTrackHandle[]
  dispatchEndedOnFirstTrack: () => void
  dispatchEndedOnAllTracks: () => void
}

export interface UserMediaMockController {
  install: () => void
  uninstall: () => void
  isInstalled: () => boolean
  setSupported: (supported: boolean) => void
  setResultMode: (mode: UserMediaResultMode) => void
  setDeferred: (deferred: boolean) => void
  isPending: () => boolean
  resolvePending: (specs?: {
    video?: boolean
    audio?: boolean
  }) => UserMediaMockStreamHandle | null
  rejectPending: (error?: Error) => void
  getCallCount: () => number
  getLastConstraints: () => MediaStreamConstraints | null
  getActiveStream: () => UserMediaMockStreamHandle | null
  endActiveStream: () => void
  endAllActiveTracks: () => void
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
 * ending capture on demand.
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
      throw new Error('Unable to create a mock user-media video track.')
    }
    return track
  }

  const destination = getSharedAudioContext().createMediaStreamDestination()
  const track = destination.stream.getAudioTracks()[0]
  if (track == null) {
    throw new Error('Unable to create a mock user-media audio track.')
  }
  return track
}

function buildErrorForMode(mode: Exclude<UserMediaResultMode, 'success'>) {
  if (mode === 'denied') {
    const error = new Error(
      'Permission to use camera or microphone was denied by the user or the platform.',
    )
    error.name = 'NotAllowedError'
    return error
  }

  if (mode === 'notfound') {
    const error = new Error(
      'No camera or microphone matching the requested constraints was found.',
    )
    error.name = 'NotFoundError'
    return error
  }

  if (mode === 'notreadable') {
    const error = new Error(
      'The camera or microphone is already in use or cannot be read.',
    )
    error.name = 'NotReadableError'
    return error
  }

  const error = new Error(
    'The requested camera or microphone constraints cannot be satisfied.',
  )
  error.name = 'OverconstrainedError'
  return error
}

function createMockTrack(
  kind: 'video' | 'audio',
  onStop: () => void,
): UserMediaMockTrackHandle {
  const track = createRealTrack(kind)
  let stopCount = 0
  let forcedReadyState: MediaStreamTrackState = 'live'

  Object.defineProperty(track, 'readyState', {
    configurable: true,
    get() {
      return forcedReadyState
    },
  })

  const originalStop = track.stop.bind(track)
  track.stop = () => {
    stopCount += 1
    forcedReadyState = 'ended'
    originalStop()
    onStop()
  }

  return {
    track,
    kind,
    dispatchEnded: () => {
      if (forcedReadyState !== 'ended') {
        forcedReadyState = 'ended'
        originalStop()
      }
      track.dispatchEvent(new Event('ended'))
    },
    getStopCount: () => stopCount,
  }
}

function createMockStream(
  specs: { video: boolean; audio: boolean },
  onTrackStop: () => void,
): UserMediaMockStreamHandle {
  const tracks: UserMediaMockTrackHandle[] = []
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
    dispatchEndedOnAllTracks: () => {
      for (const entry of tracks) {
        entry.dispatchEnded()
      }
    },
  }
}

function constraintsToSpecs(constraints: MediaStreamConstraints | undefined): {
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

function preserveMediaDevicesMethods(
  source: MediaDevices | undefined,
): Partial<MediaDevices> {
  if (source == null) {
    return {}
  }

  const preserved: Partial<MediaDevices> = {}
  if (typeof source.enumerateDevices === 'function') {
    preserved.enumerateDevices = source.enumerateDevices.bind(source)
  }
  if (typeof source.addEventListener === 'function') {
    preserved.addEventListener = source.addEventListener.bind(source)
  }
  if (typeof source.removeEventListener === 'function') {
    preserved.removeEventListener = source.removeEventListener.bind(source)
  }
  if (typeof source.getDisplayMedia === 'function') {
    preserved.getDisplayMedia = source.getDisplayMedia.bind(source)
  }
  return preserved
}

export function createUserMediaMock(options?: {
  resultMode?: UserMediaResultMode
  supported?: boolean
  deferred?: boolean
}): UserMediaMockController {
  let resultMode: UserMediaResultMode = options?.resultMode ?? 'success'
  let supported = options?.supported ?? true
  let deferred = options?.deferred ?? false
  let callCount = 0
  let lastConstraints: MediaStreamConstraints | null = null
  let activeStream: UserMediaMockStreamHandle | null = null
  let totalStopCount = 0
  let installed = false
  let previousMediaDevices: MediaDevices | undefined
  let hadOwnMediaDevices = false
  let preservedMethods: Partial<MediaDevices> = {}

  let pending: {
    resolve: (stream: MediaStream) => void
    reject: (error: Error) => void
    constraints: MediaStreamConstraints | undefined
  } | null = null

  const onTrackStop = () => {
    totalStopCount += 1
  }

  const settle = (
    specs: { video: boolean; audio: boolean } | undefined,
    constraints: MediaStreamConstraints | undefined,
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

  const mediaDevicesMock: Partial<MediaDevices> = {}

  const handleGetUserMedia = (
    constraints?: MediaStreamConstraints,
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
      mediaDevicesMock.getUserMedia =
        handleGetUserMedia as MediaDevices['getUserMedia']
    } else {
      delete mediaDevicesMock.getUserMedia
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
      preservedMethods = preserveMediaDevicesMethods(previousMediaDevices)

      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: { ...preservedMethods, ...mediaDevicesMock },
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
      preservedMethods = {}
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
      let resolvedHandle: UserMediaMockStreamHandle | null = null
      settle(
        specs
          ? {
              video: specs.video ?? true,
              audio: specs.audio ?? false,
            }
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
    endAllActiveTracks() {
      activeStream?.dispatchEndedOnAllTracks()
    },
    getTotalStopCount: () => totalStopCount,
  }
}
