export function normalizeMediaDevicesError(value: unknown): Error {
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

export function getMediaDevices(): MediaDevices | null {
  if (typeof navigator === 'undefined') {
    return null
  }

  const mediaDevices = navigator.mediaDevices
  if (mediaDevices == null) {
    return null
  }

  if (typeof mediaDevices.enumerateDevices !== 'function') {
    return null
  }

  return mediaDevices
}

export function canRequestUserMedia(
  mediaDevices: MediaDevices | null,
): mediaDevices is MediaDevices & {
  getUserMedia: MediaDevices['getUserMedia']
} {
  return mediaDevices != null && typeof mediaDevices.getUserMedia === 'function'
}

export function createDefaultConstraints(): MediaStreamConstraints {
  return {
    audio: true,
    video: true,
  }
}

export function groupMediaDevices(devices: readonly MediaDeviceInfo[]): {
  videoInputs: readonly MediaDeviceInfo[]
  audioInputs: readonly MediaDeviceInfo[]
  audioOutputs: readonly MediaDeviceInfo[]
} {
  const videoInputs: MediaDeviceInfo[] = []
  const audioInputs: MediaDeviceInfo[] = []
  const audioOutputs: MediaDeviceInfo[] = []

  for (const device of devices) {
    if (device.kind === 'videoinput') {
      videoInputs.push(device)
      continue
    }

    if (device.kind === 'audioinput') {
      audioInputs.push(device)
      continue
    }

    if (device.kind === 'audiooutput') {
      audioOutputs.push(device)
    }
  }

  return { videoInputs, audioInputs, audioOutputs }
}
