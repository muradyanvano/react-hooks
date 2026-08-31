export type MockDeviceKind = MediaDeviceKind

export interface MockDeviceSpec {
  deviceId: string
  kind: MockDeviceKind
  label: string
  groupId: string
}

export type PermissionOutcome = 'granted' | 'denied' | 'not-found' | 'error'
export type EnumerationOutcome = 'success' | 'error'

export const DEFAULT_LABELED_DEVICES: MockDeviceSpec[] = [
  {
    deviceId: 'cam-integrated',
    kind: 'videoinput',
    label: 'Integrated Camera',
    groupId: 'group-laptop',
  },
  {
    deviceId: 'cam-usb',
    kind: 'videoinput',
    label: 'Logitech USB Camera',
    groupId: 'group-usb',
  },
  {
    deviceId: 'cam-virtual',
    kind: 'videoinput',
    label: 'OBS Virtual Camera',
    groupId: 'group-virtual',
  },
  {
    deviceId: 'mic-default',
    kind: 'audioinput',
    label: 'Default - MacBook Pro Microphone',
    groupId: 'group-laptop',
  },
  {
    deviceId: 'mic-headset',
    kind: 'audioinput',
    label: 'Headset Microphone',
    groupId: 'group-headset',
  },
  {
    deviceId: 'spk-speakers',
    kind: 'audiooutput',
    label: 'MacBook Pro Speakers',
    groupId: 'group-laptop',
  },
  {
    deviceId: 'spk-headphones',
    kind: 'audiooutput',
    label: 'AirPods',
    groupId: 'group-headset',
  },
]

export const UNLABELED_DEVICES: MockDeviceSpec[] = DEFAULT_LABELED_DEVICES.map(
  (device) => ({
    ...device,
    label: '',
  }),
)

export function toMediaDeviceInfo(spec: MockDeviceSpec): MediaDeviceInfo {
  return {
    deviceId: spec.deviceId,
    kind: spec.kind,
    label: spec.label,
    groupId: spec.groupId,
    toJSON() {
      return {
        deviceId: spec.deviceId,
        kind: spec.kind,
        label: spec.label,
        groupId: spec.groupId,
      }
    },
  } as MediaDeviceInfo
}

export interface MediaDevicesMockController {
  getDevices: () => MediaDeviceInfo[]
  setDevices: (devices: MockDeviceSpec[]) => void
  setPermissionOutcome: (outcome: PermissionOutcome) => void
  setEnumerationOutcome: (outcome: EnumerationOutcome) => void
  setPermissionGrantedLabels: (granted: boolean) => void
  dispatchDeviceChange: () => void
  connectDevice: (device: MockDeviceSpec) => void
  removeDevice: (deviceId: string) => void
  restoreDefaults: () => void
  getStoppedTrackCount: () => number
  getUserMediaCallCount: () => number
  isInstalled: () => boolean
  install: () => void
  uninstall: () => void
}

export function createMediaDevicesMock(options?: {
  initialDevices?: MockDeviceSpec[]
  permissionOutcome?: PermissionOutcome
  enumerationOutcome?: EnumerationOutcome
  permissionGrantedLabels?: boolean
}): MediaDevicesMockController {
  let deviceSpecs = [...(options?.initialDevices ?? UNLABELED_DEVICES)]
  let permissionOutcome: PermissionOutcome =
    options?.permissionOutcome ?? 'granted'
  let enumerationOutcome: EnumerationOutcome =
    options?.enumerationOutcome ?? 'success'
  let permissionGrantedLabels = options?.permissionGrantedLabels ?? false
  let stoppedTrackCount = 0
  let getUserMediaCallCount = 0
  const listeners = new Set<EventListener>()
  let previousMediaDevices: MediaDevices | undefined
  let hadOwnMediaDevices = false
  let installed = false

  const getDevices = () => {
    const source = permissionGrantedLabels
      ? deviceSpecs.map((device) => {
          const labeled = DEFAULT_LABELED_DEVICES.find(
            (item) => item.deviceId === device.deviceId,
          )
          return labeled ?? device
        })
      : deviceSpecs
    return source.map(toMediaDeviceInfo)
  }

  const mediaDevices = {
    enumerateDevices: async () => {
      if (enumerationOutcome === 'error') {
        throw new Error('Failed to enumerate media devices.')
      }
      return getDevices()
    },
    getUserMedia: async () => {
      getUserMediaCallCount += 1
      if (permissionOutcome === 'denied') {
        const error = new Error('Permission denied')
        error.name = 'NotAllowedError'
        throw error
      }
      if (permissionOutcome === 'not-found') {
        const error = new Error('Requested device not found')
        error.name = 'NotFoundError'
        throw error
      }
      if (permissionOutcome === 'error') {
        throw new Error('getUserMedia failed')
      }

      permissionGrantedLabels = true
      const tracks = [
        {
          kind: 'audio',
          stop: () => {
            stoppedTrackCount += 1
          },
        },
        {
          kind: 'video',
          stop: () => {
            stoppedTrackCount += 1
          },
        },
      ]

      return {
        getTracks: () => tracks,
      } as unknown as MediaStream
    },
    addEventListener: (type: string, listener: EventListener) => {
      if (type === 'devicechange') {
        listeners.add(listener)
      }
    },
    removeEventListener: (type: string, listener: EventListener) => {
      if (type === 'devicechange') {
        listeners.delete(listener)
      }
    },
  }

  return {
    getDevices,
    setDevices(devices) {
      deviceSpecs = [...devices]
    },
    setPermissionOutcome(outcome) {
      permissionOutcome = outcome
    },
    setEnumerationOutcome(outcome) {
      enumerationOutcome = outcome
    },
    setPermissionGrantedLabels(granted) {
      permissionGrantedLabels = granted
    },
    dispatchDeviceChange() {
      for (const listener of [...listeners]) {
        listener(new Event('devicechange'))
      }
    },
    connectDevice(device) {
      if (deviceSpecs.some((item) => item.deviceId === device.deviceId)) {
        return
      }
      deviceSpecs = [...deviceSpecs, device]
      this.dispatchDeviceChange()
    },
    removeDevice(deviceId) {
      deviceSpecs = deviceSpecs.filter((item) => item.deviceId !== deviceId)
      this.dispatchDeviceChange()
    },
    restoreDefaults() {
      deviceSpecs = [...(options?.initialDevices ?? UNLABELED_DEVICES)]
      permissionGrantedLabels = options?.permissionGrantedLabels ?? false
      enumerationOutcome = options?.enumerationOutcome ?? 'success'
      permissionOutcome = options?.permissionOutcome ?? 'granted'
      this.dispatchDeviceChange()
    },
    getStoppedTrackCount: () => stoppedTrackCount,
    getUserMediaCallCount: () => getUserMediaCallCount,
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
        value: mediaDevices,
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

      listeners.clear()
      previousMediaDevices = undefined
      hadOwnMediaDevices = false
      installed = false
    },
  }
}
