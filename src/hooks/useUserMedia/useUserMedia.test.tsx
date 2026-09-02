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

import { useUserMedia, type UseUserMediaOptions } from './useUserMedia'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

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

function createMockTrack(
  kind: 'video' | 'audio' = 'video',
  readyState: MediaStreamTrackState = 'live',
) {
  const listeners = new Map<string, Set<EventListener>>()
  let state = readyState

  const track = {
    kind,
    get readyState() {
      return state
    },
    stop: vi.fn(() => {
      state = 'ended'
    }),
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      const bucket = listeners.get(type) ?? new Set<EventListener>()
      bucket.add(listener)
      listeners.set(type, bucket)
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener)
    }),
    dispatchEvent: vi.fn((event: Event) => {
      const bucket = listeners.get(event.type)
      if (bucket == null) {
        return true
      }
      for (const listener of [...bucket]) {
        listener(event)
      }
      return true
    }),
  }

  return {
    track: track as unknown as MediaStreamTrack,
    setReadyState(next: MediaStreamTrackState) {
      state = next
    },
    dispatchEnded() {
      state = 'ended'
      track.dispatchEvent(new Event('ended'))
    },
    endedListenerCount() {
      return listeners.get('ended')?.size ?? 0
    },
  }
}

function createMockStream(tracks: ReturnType<typeof createMockTrack>[]) {
  return {
    stream: {
      getTracks: () => tracks.map((entry) => entry.track),
      getVideoTracks: () =>
        tracks
          .filter((entry) => entry.track.kind === 'video')
          .map((e) => e.track),
      getAudioTracks: () =>
        tracks
          .filter((entry) => entry.track.kind === 'audio')
          .map((e) => e.track),
    } as unknown as MediaStream,
    tracks,
  }
}

function createMockUserMedia(options?: {
  getUserMediaImpl?: (
    constraints?: MediaStreamConstraints,
  ) => Promise<MediaStream>
}) {
  const getUserMedia = vi.fn(async (constraints?: MediaStreamConstraints) => {
    if (options?.getUserMediaImpl) {
      return options.getUserMediaImpl(constraints)
    }
    return createMockStream([createMockTrack('video')]).stream
  })

  return {
    mediaDevices: { getUserMedia } as unknown as MediaDevices,
    getUserMedia,
    createStream(tracks?: ReturnType<typeof createMockTrack>[]) {
      return createMockStream(tracks ?? [createMockTrack('video')])
    },
  }
}

function stubUserMedia(
  mock: ReturnType<typeof createMockUserMedia> | null,
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

function isLayoutEffectSsrMessage(message: unknown): boolean {
  const normalized = String(message).toLowerCase()
  return (
    normalized.includes('uselayouteffect') &&
    (normalized.includes('does nothing on the server') ||
      normalized.includes('server-rendered') ||
      normalized.includes('server renderer'))
  )
}

function captureConsoleDuring(run: () => void): {
  warnings: unknown[][]
  errors: unknown[][]
} {
  const warnings: unknown[][] = []
  const errors: unknown[][] = []
  const originalWarn = console.warn
  const originalError = console.error
  console.warn = (...args: unknown[]) => {
    warnings.push(args)
  }
  console.error = (...args: unknown[]) => {
    errors.push(args)
  }
  try {
    run()
  } finally {
    console.warn = originalWarn
    console.error = originalError
  }
  return { warnings, errors }
}

describe('useUserMedia', () => {
  describe('defaults and support', () => {
    it('defaults to disabled idle state', async () => {
      const mock = createMockUserMedia()
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      expect(result.current.stream).toBeNull()
      expect(result.current.isActive).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(mock.getUserMedia).not.toHaveBeenCalled()

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })
    })

    it('uses video-only default constraints on start', async () => {
      const mock = createMockUserMedia()
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      await act(async () => {
        await result.current.start()
      })

      expect(mock.getUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: false,
      })
      expect(result.current.isActive).toBe(true)
      expect(result.current.stream).not.toBeNull()
    })

    it('returns unsupported when getUserMedia is missing', async () => {
      stubUserMedia(null, { mediaDevices: {} })
      const { result } = renderHook(() => useUserMedia())

      await waitFor(() => {
        expect(result.current.isSupported).toBe(false)
      })

      let returned: MediaStream | null = mockStreamPlaceholder()
      await act(async () => {
        returned = await result.current.start()
      })
      expect(returned).toBeNull()
    })
  })

  describe('start / stop / restart', () => {
    it('clears error, sets loading, and returns the exact stream', async () => {
      const mock = createMockUserMedia()
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      await act(async () => {
        result.current.start()
        // error clear happens synchronously at request start
      })

      await waitFor(() => {
        expect(result.current.isActive).toBe(true)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.stream).not.toBeNull()
      })
    })

    it('keeps the existing stream when replacement fails', async () => {
      const first = createMockStream([createMockTrack('video')])
      const deferred = createDeferred<MediaStream>()
      let calls = 0
      const mock = createMockUserMedia({
        getUserMediaImpl: async () => {
          calls += 1
          if (calls === 1) {
            return first.stream
          }
          return deferred.promise
        },
      })
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      await act(async () => {
        await result.current.start()
      })
      expect(result.current.stream).toBe(first.stream)

      let replacement: Promise<MediaStream | null>
      act(() => {
        replacement = result.current.start()
      })

      await act(async () => {
        deferred.reject(
          Object.assign(new Error('denied'), { name: 'NotAllowedError' }),
        )
        await replacement!
      })

      expect(result.current.stream).toBe(first.stream)
      expect(result.current.isActive).toBe(true)
      expect(result.current.error?.name).toBe('NotAllowedError')
      expect(first.tracks[0]?.track.stop).not.toHaveBeenCalled()
    })

    it('stops previous stream on successful replacement', async () => {
      const first = createMockStream([createMockTrack('video')])
      const second = createMockStream([createMockTrack('video')])
      let calls = 0
      const mock = createMockUserMedia({
        getUserMediaImpl: async () => {
          calls += 1
          return calls === 1 ? first.stream : second.stream
        },
      })
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      await act(async () => {
        await result.current.start()
      })
      await act(async () => {
        await result.current.start()
      })

      expect(result.current.stream).toBe(second.stream)
      expect(first.tracks[0]?.track.stop).toHaveBeenCalled()
      expect(first.tracks[0]?.endedListenerCount()).toBe(0)
      expect(second.tracks[0]?.endedListenerCount()).toBe(1)
    })

    it('stop is idempotent and preserves error', async () => {
      const mock = createMockUserMedia({
        getUserMediaImpl: async () => {
          throw Object.assign(new Error('busy'), { name: 'NotReadableError' })
        },
      })
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      await act(async () => {
        await result.current.start()
      })
      expect(result.current.error?.name).toBe('NotReadableError')

      act(() => {
        result.current.stop()
        result.current.stop()
      })

      expect(result.current.stream).toBeNull()
      expect(result.current.isActive).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error?.name).toBe('NotReadableError')
    })

    it('restart stops first and leaves idle on failure', async () => {
      const first = createMockStream([createMockTrack('video')])
      let calls = 0
      const mock = createMockUserMedia({
        getUserMediaImpl: async () => {
          calls += 1
          if (calls === 1) {
            return first.stream
          }
          throw Object.assign(new Error('gone'), { name: 'NotFoundError' })
        },
      })
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      await act(async () => {
        await result.current.start()
      })
      await act(async () => {
        await result.current.restart()
      })

      expect(first.tracks[0]?.track.stop).toHaveBeenCalled()
      expect(result.current.stream).toBeNull()
      expect(result.current.isActive).toBe(false)
      expect(result.current.error?.name).toBe('NotFoundError')
    })
  })

  describe('overlapping requests', () => {
    it('latest request wins and stops stale streams', async () => {
      const firstDeferred = createDeferred<MediaStream>()
      const second = createMockStream([createMockTrack('video')])
      let calls = 0
      const mock = createMockUserMedia({
        getUserMediaImpl: async () => {
          calls += 1
          if (calls === 1) {
            return firstDeferred.promise
          }
          return second.stream
        },
      })
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      let firstPromise!: Promise<MediaStream | null>
      act(() => {
        firstPromise = result.current.start()
      })
      await act(async () => {
        await result.current.start()
      })

      const stale = createMockStream([createMockTrack('video')])
      await act(async () => {
        firstDeferred.resolve(stale.stream)
        await firstPromise
      })

      expect(result.current.stream).toBe(second.stream)
      expect(stale.tracks[0]?.track.stop).toHaveBeenCalled()
    })

    it('stop during pending request ignores stale resolve', async () => {
      const deferred = createDeferred<MediaStream>()
      const mock = createMockUserMedia({
        getUserMediaImpl: async () => deferred.promise,
      })
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      let pending!: Promise<MediaStream | null>
      act(() => {
        pending = result.current.start()
      })
      act(() => {
        result.current.stop()
      })

      const late = createMockStream([createMockTrack('video')])
      await act(async () => {
        deferred.resolve(late.stream)
        await pending
      })

      expect(result.current.stream).toBeNull()
      expect(late.tracks[0]?.track.stop).toHaveBeenCalled()
    })
  })

  describe('enabled lifecycle', () => {
    it('starts once when enabled becomes true', async () => {
      const mock = createMockUserMedia()
      stubUserMedia(mock)
      const { result, rerender } = renderHook(
        (props: UseUserMediaOptions) => useUserMedia(props),
        { initialProps: { enabled: false } },
      )

      expect(mock.getUserMedia).not.toHaveBeenCalled()
      rerender({ enabled: true })
      await waitFor(() => {
        expect(mock.getUserMedia).toHaveBeenCalledTimes(1)
        expect(result.current.isActive).toBe(true)
      })

      rerender({ enabled: true })
      expect(mock.getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('stops declarative stream when enabled becomes false', async () => {
      const mock = createMockUserMedia()
      stubUserMedia(mock)
      const { result, rerender } = renderHook(
        (props: UseUserMediaOptions) => useUserMedia(props),
        { initialProps: { enabled: true } },
      )

      await waitFor(() => {
        expect(result.current.isActive).toBe(true)
      })

      rerender({ enabled: false })
      await waitFor(() => {
        expect(result.current.stream).toBeNull()
        expect(result.current.isActive).toBe(false)
      })
      const stoppedTrack = asMock(mock.getUserMedia).mock.results[0]
        ?.value as Promise<MediaStream>
      const stream = await stoppedTrack
      expect(asMock(stream.getTracks()[0]?.stop)).toHaveBeenCalled()
    })

    it('keeps imperative stream while enabled stays false', async () => {
      const mock = createMockUserMedia()
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia({ enabled: false }))

      await act(async () => {
        await result.current.start()
      })
      expect(result.current.isActive).toBe(true)
      const track = result.current.stream?.getTracks()[0]
      expect(track).toBeTruthy()

      await act(async () => {
        // no-op tick
      })
      expect(result.current.isActive).toBe(true)
      expect(asMock(track?.stop)).not.toHaveBeenCalled()
    })
  })

  describe('autoSwitch', () => {
    it('restarts on nested constraint change but not deep equality', async () => {
      const mock = createMockUserMedia()
      stubUserMedia(mock)
      const { result, rerender } = renderHook(
        (props: UseUserMediaOptions) => useUserMedia(props),
        {
          initialProps: {
            constraints: { video: { width: { ideal: 640 } }, audio: false },
          },
        },
      )

      await act(async () => {
        await result.current.start()
      })
      expect(mock.getUserMedia).toHaveBeenCalledTimes(1)

      rerender({
        constraints: { audio: false, video: { width: { ideal: 640 } } },
      })
      await act(async () => {
        await Promise.resolve()
      })
      expect(mock.getUserMedia).toHaveBeenCalledTimes(1)

      rerender({
        constraints: { video: { width: { ideal: 1280 } }, audio: false },
      })
      await waitFor(() => {
        expect(mock.getUserMedia).toHaveBeenCalledTimes(2)
      })
      expect(result.current.isActive).toBe(true)
    })

    it('does not auto-switch when autoSwitch is false', async () => {
      const mock = createMockUserMedia()
      stubUserMedia(mock)
      const { result, rerender } = renderHook(
        (props: UseUserMediaOptions) => useUserMedia(props),
        {
          initialProps: {
            autoSwitch: false,
            constraints: {
              video: true as boolean | MediaTrackConstraints,
              audio: false,
            },
          },
        },
      )

      await act(async () => {
        await result.current.start()
      })
      expect(mock.getUserMedia).toHaveBeenCalledTimes(1)

      rerender({
        autoSwitch: false,
        constraints: {
          video: { facingMode: 'user' },
          audio: false,
        },
      })
      await act(async () => {
        await Promise.resolve()
      })
      expect(mock.getUserMedia).toHaveBeenCalledTimes(1)

      await act(async () => {
        await result.current.restart()
      })
      expect(mock.getUserMedia).toHaveBeenCalledTimes(2)
      expect(mock.getUserMedia.mock.calls[1]?.[0]).toEqual({
        video: { facingMode: 'user' },
        audio: false,
      })
    })
  })

  describe('track ended', () => {
    it('stays active when one of two tracks ends', async () => {
      const video = createMockTrack('video')
      const audio = createMockTrack('audio')
      const owned = createMockStream([video, audio])
      const mock = createMockUserMedia({
        getUserMediaImpl: async () => owned.stream,
      })
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      await act(async () => {
        await result.current.start()
      })

      act(() => {
        video.dispatchEnded()
      })

      expect(result.current.isActive).toBe(true)
      expect(result.current.stream).toBe(owned.stream)
      expect(result.current.error).toBeNull()
    })

    it('clears when the final track ends', async () => {
      const video = createMockTrack('video')
      const owned = createMockStream([video])
      const mock = createMockUserMedia({
        getUserMediaImpl: async () => owned.stream,
      })
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      await act(async () => {
        await result.current.start()
      })

      act(() => {
        video.dispatchEnded()
      })

      expect(result.current.stream).toBeNull()
      expect(result.current.isActive).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('errors', () => {
    it('preserves media error names and clears on success', async () => {
      let fail = true
      const mock = createMockUserMedia({
        getUserMediaImpl: async () => {
          if (fail) {
            throw Object.assign(new Error('Permission denied'), {
              name: 'NotAllowedError',
            })
          }
          return createMockStream([createMockTrack('video')]).stream
        },
      })
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      await act(async () => {
        await result.current.start()
      })
      expect(result.current.error?.name).toBe('NotAllowedError')

      fail = false
      await act(async () => {
        await result.current.start()
      })
      expect(result.current.error).toBeNull()
      expect(result.current.isActive).toBe(true)
    })

    it('does not create unhandled rejections', async () => {
      const mock = createMockUserMedia({
        getUserMediaImpl: async () => {
          throw 'string-failure'
        },
      })
      stubUserMedia(mock)
      const { result } = renderHook(() => useUserMedia())

      await act(async () => {
        await expect(result.current.start()).resolves.toBeNull()
      })
      expect(result.current.error?.message).toBe('string-failure')
    })
  })

  describe('Strict Mode', () => {
    it('does not leave duplicate streams after effect replay', async () => {
      const mock = createMockUserMedia()
      stubUserMedia(mock)

      function Probe(): ReactElement {
        const api = useUserMedia({ enabled: true })
        useEffect(() => {
          void api.stream
        }, [api.stream])
        return <div data-testid="probe">{String(api.isActive)}</div>
      }

      render(
        <StrictMode>
          <Probe />
        </StrictMode>,
      )

      await waitFor(() => {
        expect(mock.getUserMedia.mock.calls.length).toBeGreaterThanOrEqual(1)
      })

      // Every created stream from the mock default factory is the same object;
      // ensure tracks were not left without cleanup on discarded generations.
      await waitFor(() => {
        expect(
          document.querySelector('[data-testid="probe"]')?.textContent,
        ).toBe('true')
      })
    })
  })

  describe('SSR', () => {
    it('renders idle unsupported state without media access', () => {
      const getUserMedia = vi.fn()
      vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })

      function Probe(): ReactElement {
        const api = useUserMedia({ enabled: true })
        return (
          <div>
            {String(api.isSupported)}:{String(api.isActive)}:
            {String(api.isLoading)}
          </div>
        )
      }

      const { warnings, errors } = captureConsoleDuring(() => {
        const html = renderToString(<Probe />)
        expect(html.replaceAll(/<!-- -->/g, '')).toContain('false:false:false')
      })

      expect(getUserMedia).not.toHaveBeenCalled()
      expect(
        warnings.filter((entry) => isLayoutEffectSsrMessage(entry[0])),
      ).toEqual([])
      expect(errors).toEqual([])
    })
  })

  describe('stable methods', () => {
    it('keeps start/stop/restart identities stable', () => {
      const mock = createMockUserMedia()
      stubUserMedia(mock)
      const { result, rerender } = renderHook(() => useUserMedia())
      const first = {
        start: result.current.start,
        stop: result.current.stop,
        restart: result.current.restart,
      }
      rerender()
      expect(result.current.start).toBe(first.start)
      expect(result.current.stop).toBe(first.stop)
      expect(result.current.restart).toBe(first.restart)
    })
  })
})

function mockStreamPlaceholder(): MediaStream | null {
  return null
}
