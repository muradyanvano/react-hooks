export function normalizeDisplayMediaError(value: unknown): Error {
  if (value instanceof Error) {
    return value
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

export function getMediaDevicesForDisplay(): MediaDevices | null {
  if (typeof navigator === 'undefined') {
    return null
  }

  const mediaDevices = navigator.mediaDevices
  if (mediaDevices == null) {
    return null
  }

  return mediaDevices
}

export function canGetDisplayMedia(
  mediaDevices: MediaDevices | null,
): mediaDevices is MediaDevices & {
  getDisplayMedia: MediaDevices['getDisplayMedia']
} {
  return (
    mediaDevices != null && typeof mediaDevices.getDisplayMedia === 'function'
  )
}

export function isDisplayMediaSupported(): boolean {
  return canGetDisplayMedia(getMediaDevicesForDisplay())
}

export function createDefaultDisplayConstraints(): {
  video: boolean
  audio: boolean
} {
  return {
    video: true,
    audio: false,
  }
}

export function stopMediaStreamTracks(
  stream: MediaStream | null | undefined,
): void {
  if (stream == null) {
    return
  }

  for (const track of stream.getTracks()) {
    track.stop()
  }
}
