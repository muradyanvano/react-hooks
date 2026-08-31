import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react'
import { StrictMode, useEffect, type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

import {
  useDevicesList,
  type UseDevicesListOptions,
  type UseDevicesListUpdatedHandler,
} from './useDevicesList'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

type MockDevice = {
  deviceId: string
  kind: MediaDeviceKind
  label: string
  groupId: string
  toJSON?: () => object
}

function createDevice(
  partial: Omit<MockDevice, 'toJSON'> & { toJSON?: () => object },
): MediaDeviceInfo {
  const device: MockDevice = {
    ...partial,
    toJSON:
      partial.toJSON ??
      (() => ({
        deviceId: partial.deviceId,
        kind: partial.kind,
        label: partial.label,
        groupId: partial.groupId,
      })),
  }
  return device as MediaDeviceInfo
}

const LABELED_DEVICES: MediaDeviceInfo[] = [
  createDevice({
    deviceId: 'cam-1',
    kind: 'videoinput',
    label: 'Integrated Camera',
    groupId: 'group-a',
  }),
  createDevice({
    deviceId: 'cam-2',
    kind: 'videoinput',
    label: 'USB Camera',
    groupId: 'group-b',
  }),
  createDevice({
    deviceId: 'mic-1',
    kind: 'audioinput',
    label: 'Default Microphone',
    groupId: 'group-a',
  }),
  createDevice({
    deviceId: 'mic-2',
    kind: 'audioinput',
    label: 'Headset Mic',
    groupId: 'group-c',
  }),
  createDevice({
    deviceId: 'spk-1',
    kind: 'audiooutput',
    label: 'Speakers',
    groupId: 'group-a',
  }),
  createDevice({
    deviceId: 'spk-2',
    kind: 'audiooutput',
    label: 'Headphones',
    groupId: 'group-c',
  }),
]

const UNLABELED_DEVICES: MediaDeviceInfo[] = LABELED_DEVICES.map((device) =>
  createDevice({
    deviceId: device.deviceId,
    kind: device.kind,
    label: '',
    groupId: device.groupId,
  }),
)

function asMock(fn: unknown): Mock {
  return fn as Mock
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function createTrack(kind: string) {
  return {
    kind,
    stop: vi.fn(),
  }
}

function createMockMediaDevices(options?: {
  devices?: MediaDeviceInfo[]
  enumerateImpl?: () => Promise<MediaDeviceInfo[]>
  getUserMediaImpl?: (
    constraints?: MediaStreamConstraints,
  ) => Promise<MediaStream>
  includeGetUserMedia?: boolean
}) {
  let devices = options?.devices ?? [...UNLABELED_DEVICES]
  const listeners = new Set<EventListener>()
  const tracks = [createTrack('audio'), createTrack('video')]

  const mediaDevices = {
    enumerateDevices: vi.fn(async () => {
      if (options?.enumerateImpl) {
        return options.enumerateImpl()
      }
      return [...devices]
    }),
    getUserMedia: vi.fn(async (constraints?: MediaStreamConstraints) => {
      if (options?.getUserMediaImpl) {
        return options.getUserMediaImpl(constraints)
      }
      return {
        getTracks: () => tracks,
      } as unknown as MediaStream
    }),
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      if (type === 'devicechange') {
        listeners.add(listener)
      }
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      if (type === 'devicechange') {
        listeners.delete(listener)
      }
    }),
  }

  if (options?.includeGetUserMedia === false) {
    delete (mediaDevices as { getUserMedia?: unknown }).getUserMedia
  }

  const api = {
    mediaDevices: mediaDevices as unknown as MediaDevices,
    tracks,
    listeners,
    setDevices(next: MediaDeviceInfo[]) {
      devices = next
    },
    dispatchDeviceChange() {
      for (const listener of [...listeners]) {
        listener(new Event('devicechange'))
      }
    },
  }

  return api
}

function stubMediaDevices(
  mock: ReturnType<typeof createMockMediaDevices> | null,
  navigatorPartial?: object,
) {
  if (mock == null) {
    vi.stubGlobal('navigator', navigatorPartial ?? {})
    return
  }

  vi.stubGlobal('navigator', {
    mediaDevices: mock.mediaDevices,
    ...navigatorPartial,
  })
}

function Harness({
  options,
  onReady,
}: {
  options?: UseDevicesListOptions
  onReady?: (api: ReturnType<typeof useDevicesList>) => void
}): ReactElement {
  const api = useDevicesList(options)
  useEffect(() => {
    onReady?.(api)
  }, [api, onReady])
  return (
    <div
      data-testid="harness"
      data-loading={api.isLoading ? 'true' : 'false'}
      data-supported={api.isSupported ? 'true' : 'false'}
      data-permission={api.permissionGranted ? 'true' : 'false'}
      data-count={String(api.devices.length)}
    />
  )
}

describe('useDevicesList', () => {
  describe('initial state and support', () => {
    it('returns empty arrays and default flags before effects settle', () => {
      const mock = createMockMediaDevices({
        enumerateImpl: () => new Promise(() => {}),
      })
      stubMediaDevices(mock)

      const { result } = renderHook(() => useDevicesList())

      expect(result.current.devices).toEqual([])
      expect(result.current.videoInputs).toEqual([])
      expect(result.current.audioInputs).toEqual([])
      expect(result.current.audioOutputs).toEqual([])
      expect(result.current.permissionGranted).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('reports supported when enumeration exists', async () => {
      const mock = createMockMediaDevices()
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList())
      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
        expect(result.current.devices).toHaveLength(6)
      })
    })

    it('reports unsupported when navigator is unavailable', () => {
      vi.stubGlobal('navigator', undefined)
      const { result } = renderHook(() => useDevicesList())
      expect(result.current.isSupported).toBe(false)
    })

    it('reports unsupported when mediaDevices is missing', () => {
      stubMediaDevices(null)
      const { result } = renderHook(() => useDevicesList())
      expect(result.current.isSupported).toBe(false)
    })

    it('reports unsupported when enumerateDevices is missing', () => {
      vi.stubGlobal('navigator', {
        mediaDevices: {
          getUserMedia: vi.fn(),
        },
      })
      const { result } = renderHook(() => useDevicesList())
      expect(result.current.isSupported).toBe(false)
    })

    it('remains supported when only getUserMedia is missing', async () => {
      const mock = createMockMediaDevices({ includeGetUserMedia: false })
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList())
      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
        expect(result.current.devices).toHaveLength(6)
      })
    })
  })

  describe('initial enumeration', () => {
    it('enumerates after mounting and derives grouped lists in order', async () => {
      const mock = createMockMediaDevices({ devices: LABELED_DEVICES })
      stubMediaDevices(mock)
      const onUpdated = vi.fn()
      const { result } = renderHook(() => useDevicesList({ onUpdated }))

      await waitFor(() => {
        expect(result.current.devices).toEqual(LABELED_DEVICES)
      })

      expect(result.current.videoInputs.map((d) => d.deviceId)).toEqual([
        'cam-1',
        'cam-2',
      ])
      expect(result.current.audioInputs.map((d) => d.deviceId)).toEqual([
        'mic-1',
        'mic-2',
      ])
      expect(result.current.audioOutputs.map((d) => d.deviceId)).toEqual([
        'spk-1',
        'spk-2',
      ])
      expect(onUpdated).toHaveBeenCalledWith(LABELED_DEVICES)
      expect(result.current.isLoading).toBe(false)
    })

    it('handles an empty list', async () => {
      const mock = createMockMediaDevices({ devices: [] })
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList())
      await waitFor(() => {
        expect(result.current.devices).toEqual([])
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('clears a stale enumeration error after a later success', async () => {
      let fail = true
      const mock = createMockMediaDevices({
        enumerateImpl: async () => {
          if (fail) {
            throw new Error('enumerate failed')
          }
          return LABELED_DEVICES
        },
      })
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList())

      await waitFor(() => {
        expect(result.current.error?.message).toBe('enumerate failed')
      })

      fail = false
      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.devices).toEqual(LABELED_DEVICES)
    })
  })

  describe('device changes', () => {
    it('registers one listener, refreshes on event, and removes on unmount', async () => {
      const mock = createMockMediaDevices({ devices: LABELED_DEVICES })
      stubMediaDevices(mock)
      const onUpdated = vi.fn()
      const { result, unmount } = renderHook(() =>
        useDevicesList({ onUpdated }),
      )

      await waitFor(() => {
        expect(result.current.devices).toHaveLength(6)
      })
      expect(mock.listeners.size).toBe(1)

      const next = LABELED_DEVICES.slice(0, 3)
      mock.setDevices(next)
      onUpdated.mockClear()

      await act(async () => {
        mock.dispatchDeviceChange()
      })

      await waitFor(() => {
        expect(result.current.devices).toEqual(next)
      })
      expect(onUpdated).toHaveBeenCalledWith(next)

      unmount()
      expect(mock.listeners.size).toBe(0)
    })

    it('does not leave duplicate listeners in Strict Mode', async () => {
      const mock = createMockMediaDevices({ devices: LABELED_DEVICES })
      stubMediaDevices(mock)
      render(
        <StrictMode>
          <Harness />
        </StrictMode>,
      )

      await waitFor(() => {
        expect(mock.listeners.size).toBe(1)
      })
    })

    it('handles connection and removal without stale final state', async () => {
      const mock = createMockMediaDevices({ devices: LABELED_DEVICES })
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList())
      await waitFor(() => expect(result.current.devices).toHaveLength(6))

      const first = createDeferred<MediaDeviceInfo[]>()
      const second = createDeferred<MediaDeviceInfo[]>()
      let call = 0
      mock.mediaDevices.enumerateDevices = vi.fn(async () => {
        call += 1
        if (call === 1) {
          return first.promise
        }
        return second.promise
      })

      await act(async () => {
        mock.dispatchDeviceChange()
        mock.dispatchDeviceChange()
      })

      await act(async () => {
        second.resolve(LABELED_DEVICES.slice(0, 2))
      })
      await act(async () => {
        first.resolve(LABELED_DEVICES.slice(0, 5))
      })

      await waitFor(() => {
        expect(result.current.devices).toHaveLength(2)
      })
    })
  })

  describe('manual refresh', () => {
    it('exposes a stable async refresh and updates state', async () => {
      const mock = createMockMediaDevices({ devices: LABELED_DEVICES })
      stubMediaDevices(mock)
      const { result, rerender } = renderHook(() => useDevicesList())
      await waitFor(() => expect(result.current.devices).toHaveLength(6))

      const firstRefresh = result.current.refresh
      rerender()
      expect(result.current.refresh).toBe(firstRefresh)

      mock.setDevices(LABELED_DEVICES.slice(0, 1))
      await act(async () => {
        await result.current.refresh()
      })
      expect(result.current.devices).toHaveLength(1)
    })

    it('does nothing safely while disabled or unsupported', async () => {
      const mock = createMockMediaDevices()
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList({ enabled: false }))
      await act(async () => {
        await result.current.refresh()
      })
      expect(mock.mediaDevices.enumerateDevices).not.toHaveBeenCalled()

      stubMediaDevices(null)
      const unsupported = renderHook(() => useDevicesList())
      await act(async () => {
        await unsupported.result.current.refresh()
      })
    })

    it('preserves previous devices on enumeration failure without throwing', async () => {
      const mock = createMockMediaDevices({ devices: LABELED_DEVICES })
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList())
      await waitFor(() => expect(result.current.devices).toHaveLength(6))

      mock.mediaDevices.enumerateDevices = vi.fn(async () => {
        throw new Error('boom')
      })

      await act(async () => {
        await expect(result.current.refresh()).resolves.toBeUndefined()
      })

      expect(result.current.devices).toHaveLength(6)
      expect(result.current.error?.message).toBe('boom')
    })
  })

  describe('permission workflow', () => {
    it('requests with latest constraints, grants, refreshes, and stops tracks', async () => {
      const mock = createMockMediaDevices({ devices: UNLABELED_DEVICES })
      stubMediaDevices(mock)
      const { result, rerender } = renderHook(
        ({ constraints }: { constraints: MediaStreamConstraints }) =>
          useDevicesList({ constraints }),
        {
          initialProps: {
            constraints: { audio: true, video: false },
          },
        },
      )

      await waitFor(() => expect(result.current.devices).toHaveLength(6))
      expect(result.current.devices[0]?.label).toBe('')

      mock.setDevices(LABELED_DEVICES)
      rerender({ constraints: { audio: false, video: true } })

      let granted = false
      await act(async () => {
        granted = await result.current.ensurePermissions()
      })

      expect(granted).toBe(true)
      expect(result.current.permissionGranted).toBe(true)
      expect(mock.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: false,
        video: true,
      })
      expect(mock.tracks[0]?.stop).toHaveBeenCalledTimes(1)
      expect(mock.tracks[1]?.stop).toHaveBeenCalledTimes(1)
      expect(result.current.devices).toEqual(LABELED_DEVICES)
    })

    it('stops tracks even when the subsequent enumeration fails', async () => {
      const mock = createMockMediaDevices({ devices: UNLABELED_DEVICES })
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList())
      await waitFor(() => expect(result.current.isSupported).toBe(true))

      mock.mediaDevices.enumerateDevices = vi.fn(async () => {
        throw new Error('after permission')
      })

      await act(async () => {
        await result.current.ensurePermissions()
      })

      expect(result.current.permissionGranted).toBe(true)
      expect(mock.tracks[0]?.stop).toHaveBeenCalled()
      expect(mock.tracks[1]?.stop).toHaveBeenCalled()
      expect(result.current.error?.message).toBe('after permission')
    })

    it('handles NotAllowedError and unknown values without unhandled rejection', async () => {
      const mock = createMockMediaDevices()
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList())
      await waitFor(() => expect(result.current.isSupported).toBe(true))

      mock.mediaDevices.getUserMedia = vi.fn(async () => {
        const error = new Error('denied')
        error.name = 'NotAllowedError'
        throw error
      })

      let granted = true
      await act(async () => {
        granted = await result.current.ensurePermissions()
      })
      expect(granted).toBe(false)
      expect(result.current.permissionGranted).toBe(false)
      expect(result.current.error?.name).toBe('NotAllowedError')
      expect(result.current.error).toBeInstanceOf(Error)

      mock.mediaDevices.getUserMedia = vi.fn(async () => {
        throw 'string-failure'
      })
      await act(async () => {
        granted = await result.current.ensurePermissions()
      })
      expect(granted).toBe(false)
      expect(result.current.error?.message).toBe('string-failure')
    })

    it('returns false when getUserMedia is missing', async () => {
      const mock = createMockMediaDevices({ includeGetUserMedia: false })
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList())
      await waitFor(() => expect(result.current.isSupported).toBe(true))

      let granted = true
      await act(async () => {
        granted = await result.current.ensurePermissions()
      })
      expect(granted).toBe(false)
      expect(result.current.permissionGranted).toBe(false)
      expect(result.current.error).not.toBeNull()
    })

    it('returns false while disabled and does not acquire media', async () => {
      const mock = createMockMediaDevices()
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList({ enabled: false }))
      const granted = await result.current.ensurePermissions()
      expect(granted).toBe(false)
      expect(mock.mediaDevices.getUserMedia).not.toHaveBeenCalled()
    })
  })

  describe('automatic permission option', () => {
    it('defaults to no automatic request', async () => {
      const mock = createMockMediaDevices()
      stubMediaDevices(mock)
      renderHook(() => useDevicesList())
      await waitFor(() =>
        expect(mock.mediaDevices.enumerateDevices).toHaveBeenCalled(),
      )
      expect(mock.mediaDevices.getUserMedia).not.toHaveBeenCalled()
    })

    it('requests after mounting when requestPermissions is true', async () => {
      const mock = createMockMediaDevices()
      stubMediaDevices(mock)
      const { result } = renderHook(() =>
        useDevicesList({ requestPermissions: true }),
      )
      await waitFor(() => {
        expect(result.current.permissionGranted).toBe(true)
      })
      expect(mock.tracks[0]?.stop).toHaveBeenCalled()
    })

    it('false-to-true transitions request once; constraint changes do not', async () => {
      const mock = createMockMediaDevices()
      stubMediaDevices(mock)
      const { result, rerender } = renderHook(
        ({
          requestPermissions,
          constraints,
        }: {
          requestPermissions: boolean
          constraints: MediaStreamConstraints
        }) => useDevicesList({ requestPermissions, constraints }),
        {
          initialProps: {
            requestPermissions: false,
            constraints: { audio: true, video: true },
          },
        },
      )

      await waitFor(() => expect(result.current.devices).toHaveLength(6))
      expect(mock.mediaDevices.getUserMedia).not.toHaveBeenCalled()

      rerender({
        requestPermissions: true,
        constraints: { audio: true, video: true },
      })
      await waitFor(() => expect(result.current.permissionGranted).toBe(true))
      const calls = asMock(mock.mediaDevices.getUserMedia).mock.calls.length

      rerender({
        requestPermissions: true,
        constraints: { audio: false, video: true },
      })
      await act(async () => {})
      expect(asMock(mock.mediaDevices.getUserMedia).mock.calls.length).toBe(
        calls,
      )
    })

    it('does not leave duplicate requests or tracks under Strict Mode', async () => {
      const mock = createMockMediaDevices()
      stubMediaDevices(mock)
      render(
        <StrictMode>
          <Harness options={{ requestPermissions: true }} />
        </StrictMode>,
      )

      await waitFor(() => {
        expect(mock.mediaDevices.getUserMedia).toHaveBeenCalled()
      })
      expect(
        asMock(mock.mediaDevices.getUserMedia).mock.calls.length,
      ).toBeLessThanOrEqual(2)
      await waitFor(() => {
        expect(mock.tracks[0]?.stop).toHaveBeenCalled()
        expect(mock.tracks[1]?.stop).toHaveBeenCalled()
      })
    })
  })

  describe('enabled lifecycle', () => {
    it('performs no work while disabled and resumes when enabled', async () => {
      const mock = createMockMediaDevices({ devices: LABELED_DEVICES })
      stubMediaDevices(mock)
      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => useDevicesList({ enabled }),
        { initialProps: { enabled: false } },
      )

      await act(async () => {})
      expect(mock.mediaDevices.enumerateDevices).not.toHaveBeenCalled()
      expect(mock.listeners.size).toBe(0)

      rerender({ enabled: true })
      await waitFor(() => expect(result.current.devices).toHaveLength(6))
      expect(mock.listeners.size).toBe(1)

      const snapshot = result.current.devices
      rerender({ enabled: false })
      await waitFor(() => expect(mock.listeners.size).toBe(0))
      expect(result.current.devices).toBe(snapshot)
    })

    it('invalidates pending async updates after disable', async () => {
      const deferred = createDeferred<MediaDeviceInfo[]>()
      const mock = createMockMediaDevices({
        enumerateImpl: () => deferred.promise,
      })
      stubMediaDevices(mock)
      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => useDevicesList({ enabled }),
        { initialProps: { enabled: true } },
      )

      await waitFor(() => expect(result.current.isLoading).toBe(true))
      rerender({ enabled: false })

      await act(async () => {
        deferred.resolve(LABELED_DEVICES)
      })

      expect(result.current.devices).toEqual([])
    })
  })

  describe('callback freshness', () => {
    it('uses the latest onUpdated without re-registering or re-enumerating', async () => {
      const mock = createMockMediaDevices({ devices: LABELED_DEVICES })
      stubMediaDevices(mock)
      const first = vi.fn()
      const second = vi.fn()
      const { result, rerender } = renderHook(
        ({ onUpdated }: { onUpdated: UseDevicesListUpdatedHandler }) =>
          useDevicesList({ onUpdated }),
        { initialProps: { onUpdated: first } },
      )

      await waitFor(() => expect(first).toHaveBeenCalled())
      const enumerateCalls = asMock(mock.mediaDevices.enumerateDevices).mock
        .calls.length
      const addCalls = asMock(mock.mediaDevices.addEventListener).mock.calls
        .length

      rerender({ onUpdated: second })
      expect(asMock(mock.mediaDevices.enumerateDevices).mock.calls.length).toBe(
        enumerateCalls,
      )
      expect(asMock(mock.mediaDevices.addEventListener).mock.calls.length).toBe(
        addCalls,
      )

      mock.setDevices(LABELED_DEVICES.slice(0, 1))
      await act(async () => {
        mock.dispatchDeviceChange()
      })
      await waitFor(() => expect(second).toHaveBeenCalled())
      expect(first).toHaveBeenCalledTimes(1)
      expect(result.current.devices).toHaveLength(1)
    })
  })

  describe('async races', () => {
    it('keeps the newer enumeration when an older one resolves later', async () => {
      const first = createDeferred<MediaDeviceInfo[]>()
      const second = createDeferred<MediaDeviceInfo[]>()
      let call = 0
      const mock = createMockMediaDevices({
        enumerateImpl: async () => {
          call += 1
          return call === 1 ? first.promise : second.promise
        },
      })
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList())

      await waitFor(() => expect(result.current.isLoading).toBe(true))

      await act(async () => {
        void result.current.refresh()
      })

      await act(async () => {
        second.resolve(LABELED_DEVICES.slice(0, 2))
      })
      await waitFor(() => expect(result.current.devices).toHaveLength(2))

      await act(async () => {
        first.resolve(LABELED_DEVICES)
      })

      expect(result.current.devices).toHaveLength(2)
    })

    it('keeps loading true until overlapping operations settle', async () => {
      const first = createDeferred<MediaDeviceInfo[]>()
      const second = createDeferred<MediaDeviceInfo[]>()
      let call = 0
      const mock = createMockMediaDevices({
        enumerateImpl: async () => {
          call += 1
          return call === 1 ? first.promise : second.promise
        },
      })
      stubMediaDevices(mock)
      const { result } = renderHook(() => useDevicesList())

      await waitFor(() => expect(result.current.isLoading).toBe(true))
      await act(async () => {
        void result.current.refresh()
      })
      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        first.resolve([])
      })
      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        second.resolve(LABELED_DEVICES)
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })

    it('does not update after unmount', async () => {
      const deferred = createDeferred<MediaDeviceInfo[]>()
      const mock = createMockMediaDevices({
        enumerateImpl: () => deferred.promise,
      })
      stubMediaDevices(mock)
      const { result, unmount } = renderHook(() => useDevicesList())
      await waitFor(() => expect(result.current.isLoading).toBe(true))
      unmount()

      await act(async () => {
        deferred.resolve(LABELED_DEVICES)
      })
    })

    it('does not let a stale permission failure overwrite a later success', async () => {
      const first = createDeferred<MediaStream>()
      const second = createDeferred<MediaStream>()
      let call = 0
      const mock = createMockMediaDevices({ devices: LABELED_DEVICES })
      stubMediaDevices(mock)
      mock.mediaDevices.getUserMedia = vi.fn(async () => {
        call += 1
        return call === 1 ? first.promise : second.promise
      })

      const { result } = renderHook(() => useDevicesList())
      await waitFor(() => expect(result.current.devices).toHaveLength(6))

      let firstResult: Promise<boolean>
      let secondResult: Promise<boolean>
      await act(async () => {
        firstResult = result.current.ensurePermissions()
        secondResult = result.current.ensurePermissions()
      })

      const successStream = {
        getTracks: () => mock.tracks,
      } as unknown as MediaStream

      await act(async () => {
        second.resolve(successStream)
      })
      await expect(secondResult!).resolves.toBe(true)
      expect(result.current.permissionGranted).toBe(true)

      await act(async () => {
        first.reject(new Error('late failure'))
      })
      await expect(firstResult!).resolves.toBe(false)
      expect(result.current.permissionGranted).toBe(true)
      expect(result.current.error).toBeNull()
    })
  })

  describe('track cleanup on unmount during permission', () => {
    it('stops tracks when the stream resolves after unmount', async () => {
      const deferred = createDeferred<MediaStream>()
      const mock = createMockMediaDevices()
      stubMediaDevices(mock)
      mock.mediaDevices.getUserMedia = vi.fn(async () => deferred.promise)

      const { result, unmount } = renderHook(() => useDevicesList())
      await waitFor(() => expect(result.current.isSupported).toBe(true))

      await act(async () => {
        void result.current.ensurePermissions()
      })
      unmount()

      await act(async () => {
        deferred.resolve({
          getTracks: () => mock.tracks,
        } as unknown as MediaStream)
      })

      expect(mock.tracks[0]?.stop).toHaveBeenCalled()
      expect(mock.tracks[1]?.stop).toHaveBeenCalled()
    })
  })

  describe('return stability', () => {
    it('keeps refresh and ensurePermissions stable across ordinary rerenders', async () => {
      const mock = createMockMediaDevices()
      stubMediaDevices(mock)
      const { result, rerender } = renderHook(() => useDevicesList())
      await waitFor(() => expect(result.current.devices).toHaveLength(6))

      const refresh = result.current.refresh
      const ensurePermissions = result.current.ensurePermissions
      rerender()
      expect(result.current.refresh).toBe(refresh)
      expect(result.current.ensurePermissions).toBe(ensurePermissions)
    })
  })

  describe('SSR and environment safety', () => {
    it('importing without browser globals does not throw', async () => {
      vi.resetModules()
      vi.stubGlobal('navigator', undefined)
      await expect(import('./useDevicesList')).resolves.toMatchObject({
        useDevicesList: expect.any(Function),
      })
    })

    it('server rendering does not enumerate or request permission', () => {
      const mock = createMockMediaDevices()
      stubMediaDevices(mock)

      function ServerComponent(): ReactElement {
        const api = useDevicesList({ requestPermissions: true })
        return (
          <div>
            {api.isSupported ? 'yes' : 'no'}:{api.devices.length}
          </div>
        )
      }

      expect(() => renderToString(<ServerComponent />)).not.toThrow()
      expect(mock.mediaDevices.enumerateDevices).not.toHaveBeenCalled()
      expect(mock.mediaDevices.getUserMedia).not.toHaveBeenCalled()
      expect(mock.listeners.size).toBe(0)
    })
  })

  it('exposes a usable API from a mounted component', async () => {
    const mock = createMockMediaDevices()
    stubMediaDevices(mock)
    const { result } = renderHook(() => useDevicesList())
    await waitFor(() => {
      expect(result.current.devices).toHaveLength(6)
    })
    expect(result.current.refresh).toBeTypeOf('function')
    expect(result.current.ensurePermissions).toBeTypeOf('function')
  })
})
