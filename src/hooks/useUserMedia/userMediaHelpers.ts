export function normalizeUserMediaError(value: unknown): Error {
  if (value instanceof Error) {
    return value
  }

  if (typeof DOMException !== 'undefined' && value instanceof DOMException) {
    return value
  }

  if (
    value != null &&
    typeof value === 'object' &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  ) {
    const candidate = value as {
      message: string
      name?: unknown
      stack?: unknown
    }
    const error = new Error(candidate.message)
    if (typeof candidate.name === 'string') {
      error.name = candidate.name
    }
    if (typeof candidate.stack === 'string') {
      error.stack = candidate.stack
    }
    return error
  }

  if (typeof value === 'string') {
    return new Error(value)
  }

  try {
    return new Error(JSON.stringify(value))
  } catch {
    return new Error(String(value))
  }
}

export function getMediaDevicesForUserMedia(): MediaDevices | null {
  if (typeof navigator === 'undefined') {
    return null
  }

  try {
    const mediaDevices = navigator.mediaDevices
    if (mediaDevices == null) {
      return null
    }
    return mediaDevices
  } catch {
    return null
  }
}

export function canGetUserMedia(
  mediaDevices: MediaDevices | null,
): mediaDevices is MediaDevices & {
  getUserMedia: MediaDevices['getUserMedia']
} {
  return mediaDevices != null && typeof mediaDevices.getUserMedia === 'function'
}

export function isUserMediaSupported(): boolean {
  return canGetUserMedia(getMediaDevicesForUserMedia())
}

export function createDefaultUserMediaConstraints(): MediaStreamConstraints {
  return {
    video: true,
    audio: false,
  }
}

export function isTrackLive(track: MediaStreamTrack): boolean {
  try {
    if (typeof track.readyState === 'string') {
      return track.readyState === 'live'
    }
  } catch {
    // Fall through to defensive true for incomplete mocks.
  }

  return true
}

export function streamHasLiveTrack(
  stream: MediaStream | null | undefined,
): boolean {
  if (stream == null) {
    return false
  }

  try {
    return stream.getTracks().some((track) => isTrackLive(track))
  } catch {
    return false
  }
}

export function collectStreamTracks(
  stream: MediaStream | null | undefined,
): MediaStreamTrack[] {
  if (stream == null) {
    return []
  }

  try {
    return [...stream.getTracks()]
  } catch {
    return []
  }
}

export function stopMediaStreamTracks(
  stream: MediaStream | null | undefined,
): void {
  if (stream == null) {
    return
  }

  for (const track of collectStreamTracks(stream)) {
    try {
      track.stop()
    } catch {
      // Continue stopping remaining tracks.
    }
  }
}

/**
 * Stable deep signature for MediaStreamConstraints comparison.
 * Object key order is normalized; array order is preserved.
 * Cyclic / malformed values fall back to identity tagging without throwing.
 */
export function createConstraintsSignature(
  value: unknown,
  seen = new WeakMap<object, number>(),
  nextId = { current: 0 },
): string {
  if (value === null) {
    return 'null'
  }

  const valueType = typeof value
  if (valueType === 'undefined') {
    return 'undefined'
  }
  if (
    valueType === 'boolean' ||
    valueType === 'number' ||
    valueType === 'string'
  ) {
    return JSON.stringify(value)
  }
  if (valueType === 'bigint') {
    return `bigint:${String(value)}`
  }
  if (valueType === 'symbol') {
    return `symbol:${String(value)}`
  }
  if (valueType === 'function') {
    return 'function'
  }

  if (valueType !== 'object') {
    return `unknown:${String(value)}`
  }

  const objectValue = value as object
  const existing = seen.get(objectValue)
  if (existing != null) {
    return `cycle:${existing}`
  }

  const id = ++nextId.current
  seen.set(objectValue, id)

  try {
    if (Array.isArray(value)) {
      return `[${value
        .map((entry) => createConstraintsSignature(entry, seen, nextId))
        .join(',')}]`
    }

    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return `{${keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${createConstraintsSignature(
            record[key],
            seen,
            nextId,
          )}`,
      )
      .join(',')}}`
  } catch {
    return `opaque:${id}`
  }
}

export function constraintsSignaturesEqual(
  left: unknown,
  right: unknown,
): boolean {
  try {
    return (
      createConstraintsSignature(left) === createConstraintsSignature(right)
    )
  } catch {
    return Object.is(left, right)
  }
}
