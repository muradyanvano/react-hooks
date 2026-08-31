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

import { useDisplayMedia, type UseDisplayMediaOptions } from './useDisplayMedia'

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

function createMockTrack(kind: 'video' | 'audio' = 'video') {
  const listeners = new Map<string, Set<EventListener>>()

  const track = {
    kind,
    stop: vi.fn(),
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
    dispatchEnded() {
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
    } as unknown as MediaStream,
    tracks,
  }
}

function createMockDisplayMedia(options?: {
  getDisplayMediaImpl?: (
    constraints?: DisplayMediaStreamOptions,
  ) => Promise<MediaStream>
  defaultTracks?: ReturnType<typeof createMockTrack>[]
}) {
  const defaultTracks = options?.defaultTracks ?? [
    createMockTrack('video'),
    createMockTrack('audio'),
  ]
  const defaultStream = createMockStream(defaultTracks)

  const getDisplayMedia = vi.fn(
    async (constraints?: DisplayMediaStreamOptions) => {
      if (options?.getDisplayMediaImpl) {
        return options.getDisplayMediaImpl(constraints)
      }
      return defaultStream.stream
    },
  )

  const mediaDevices = {
    getDisplayMedia,
  }

  return {
    mediaDevices: mediaDevices as unknown as MediaDevices,
    getDisplayMedia,
    defaultStream,
    createStream(tracks?: ReturnType<typeof createMockTrack>[]) {
      return createMockStream(tracks ?? [createMockTrack('video')])
    },
  }
}

function stubDisplayMedia(
  mock: ReturnType<typeof createMockDisplayMedia> | null,
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

function Harness({
  options,
  onReady,
}: {
  options?: UseDisplayMediaOptions
  onReady?: (api: ReturnType<typeof useDisplayMedia>) => void
}): ReactElement {
  const api = useDisplayMedia(options)
  useEffect(() => {
    onReady?.(api)
  }, [api, onReady])
  return (
    <div
      data-testid="harness"
      data-sharing={api.isSharing ? 'true' : 'false'}
      data-loading={api.isLoading ? 'true' : 'false'}
      data-supported={api.isSupported ? 'true' : 'false'}
    />
  )
}

describe('useDisplayMedia', () => {
  describe('initial state and support', () => {
    it('defaults to idle with enabled false and does not auto request', async () => {
      const mock = createMockDisplayMedia({
        getDisplayMediaImpl: () => new Promise(() => {}),
      })
      stubDisplayMedia(mock)

      const { result } = renderHook(() => useDisplayMedia())

      expect(result.current.stream).toBeNull()
      expect(result.current.isSharing).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      await act(async () => {})
      expect(mock.getDisplayMedia).not.toHaveBeenCalled()
    })

    it('reports supported when getDisplayMedia exists', () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())
      expect(result.current.isSupported).toBe(true)
    })

    it('reports unsupported when navigator is unavailable', () => {
      vi.stubGlobal('navigator', undefined)
      const { result } = renderHook(() => useDisplayMedia())
      expect(result.current.isSupported).toBe(false)
    })

    it('reports unsupported when mediaDevices is missing', () => {
      stubDisplayMedia(null)
      const { result } = renderHook(() => useDisplayMedia())
      expect(result.current.isSupported).toBe(false)
    })

    it('reports unsupported when getDisplayMedia is missing', () => {
      vi.stubGlobal('navigator', {
        mediaDevices: {
          getUserMedia: vi.fn(),
        },
      })
      const { result } = renderHook(() => useDisplayMedia())
      expect(result.current.isSupported).toBe(false)
    })
  })

  describe('start and stop', () => {
    it('starts successfully, toggles loading, and clears a previous error', async () => {
      const mock = createMockDisplayMedia({
        getDisplayMediaImpl: async () => {
          const error = new Error('denied')
          error.name = 'NotAllowedError'
          throw error
        },
      })
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())

      await act(async () => {
        await result.current.start()
      })
      expect(result.current.error?.name).toBe('NotAllowedError')

      mock.getDisplayMedia.mockImplementation(
        async () => mock.defaultStream.stream,
      )

      let returned: MediaStream | null = null
      await act(async () => {
        returned = await result.current.start()
      })

      expect(returned).toBe(mock.defaultStream.stream)
      expect(result.current.stream).toBe(mock.defaultStream.stream)
      expect(result.current.isSharing).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('uses default constraints video true and audio false', async () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())

      await act(async () => {
        await result.current.start()
      })

      expect(mock.getDisplayMedia).toHaveBeenCalledWith({
        video: true,
        audio: false,
      })
    })

    it('keeps start and stop stable across rerenders', async () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result, rerender } = renderHook(() => useDisplayMedia())

      const start = result.current.start
      const stop = result.current.stop
      rerender()
      expect(result.current.start).toBe(start)
      expect(result.current.stop).toBe(stop)
    })

    it('stop stops all tracks once and removes ended listeners', async () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())

      await act(async () => {
        await result.current.start()
      })

      const [videoTrack, audioTrack] = mock.defaultStream.tracks
      expect(videoTrack?.endedListenerCount()).toBe(1)
      expect(audioTrack?.endedListenerCount()).toBe(1)

      await act(async () => {
        result.current.stop()
      })

      expect(videoTrack?.track.stop).toHaveBeenCalledTimes(1)
      expect(audioTrack?.track.stop).toHaveBeenCalledTimes(1)
      expect(videoTrack?.track.removeEventListener).toHaveBeenCalled()
      expect(audioTrack?.track.removeEventListener).toHaveBeenCalled()
      expect(result.current.isSharing).toBe(false)
      expect(result.current.stream).toBeNull()
    })
  })

  describe('browser track ended', () => {
    it('clears sharing and stops remaining tracks when any track ends', async () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())

      await act(async () => {
        await result.current.start()
      })

      const [videoTrack, audioTrack] = mock.defaultStream.tracks
      await act(async () => {
        videoTrack?.dispatchEnded()
      })

      expect(result.current.isSharing).toBe(false)
      expect(result.current.stream).toBeNull()
      expect(videoTrack?.track.stop).toHaveBeenCalled()
      expect(audioTrack?.track.stop).toHaveBeenCalled()
    })

    it('does not let an old track ended event clear a newer stream', async () => {
      const first = createMockStream([createMockTrack('video')])
      const second = createMockStream([createMockTrack('video')])
      let call = 0
      const mock = createMockDisplayMedia({
        getDisplayMediaImpl: async () => {
          call += 1
          return call === 1 ? first.stream : second.stream
        },
      })
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())

      await act(async () => {
        await result.current.start()
      })
      await act(async () => {
        await result.current.start()
      })

      expect(result.current.stream).toBe(second.stream)
      expect(first.tracks[0]?.track.stop).toHaveBeenCalled()

      await act(async () => {
        first.tracks[0]?.dispatchEnded()
      })

      expect(result.current.stream).toBe(second.stream)
      expect(result.current.isSharing).toBe(true)
    })
  })

  describe('stream replacement', () => {
    it('keeps the existing stream when a replacement request fails', async () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())

      await act(async () => {
        await result.current.start()
      })
      const active = result.current.stream

      mock.getDisplayMedia.mockImplementationOnce(async () => {
        throw new Error('replacement failed')
      })

      await act(async () => {
        await result.current.start()
      })

      expect(result.current.stream).toBe(active)
      expect(result.current.isSharing).toBe(true)
      expect(result.current.error?.message).toBe('replacement failed')
    })

    it('stops the previous stream when replacement succeeds', async () => {
      const first = createMockStream([createMockTrack('video')])
      const second = createMockStream([createMockTrack('video')])
      let call = 0
      const mock = createMockDisplayMedia({
        getDisplayMediaImpl: async () => {
          call += 1
          return call === 1 ? first.stream : second.stream
        },
      })
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())

      await act(async () => {
        await result.current.start()
      })
      await act(async () => {
        await result.current.start()
      })

      expect(result.current.stream).toBe(second.stream)
      expect(first.tracks[0]?.track.stop).toHaveBeenCalled()
    })
  })

  describe('async races', () => {
    it('keeps the newer stream when an older deferred request resolves later', async () => {
      const firstDeferred = createDeferred<MediaStream>()
      const secondDeferred = createDeferred<MediaStream>()
      const firstStream = createMockStream([createMockTrack('video')])
      const secondStream = createMockStream([createMockTrack('video')])
      let call = 0
      const mock = createMockDisplayMedia({
        getDisplayMediaImpl: async () => {
          call += 1
          return call === 1 ? firstDeferred.promise : secondDeferred.promise
        },
      })
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())

      let firstResult!: Promise<MediaStream | null>
      let secondResult!: Promise<MediaStream | null>
      await act(async () => {
        firstResult = result.current.start()
        secondResult = result.current.start()
      })

      await act(async () => {
        secondDeferred.resolve(secondStream.stream)
      })
      await expect(secondResult).resolves.toBe(secondStream.stream)
      await waitFor(() => {
        expect(result.current.stream).toBe(secondStream.stream)
      })

      await act(async () => {
        firstDeferred.resolve(firstStream.stream)
      })
      await expect(firstResult).resolves.toBeNull()
      expect(result.current.stream).toBe(secondStream.stream)
      expect(firstStream.tracks[0]?.track.stop).toHaveBeenCalled()
    })

    it('does not let a stale rejection overwrite a later success', async () => {
      const firstDeferred = createDeferred<MediaStream>()
      const secondDeferred = createDeferred<MediaStream>()
      const successStream = createMockStream([createMockTrack('video')])
      let call = 0
      const mock = createMockDisplayMedia({
        getDisplayMediaImpl: async () => {
          call += 1
          return call === 1 ? firstDeferred.promise : secondDeferred.promise
        },
      })
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())

      let firstResult!: Promise<MediaStream | null>
      let secondResult!: Promise<MediaStream | null>
      await act(async () => {
        firstResult = result.current.start()
        secondResult = result.current.start()
      })

      await act(async () => {
        secondDeferred.resolve(successStream.stream)
      })
      await expect(secondResult).resolves.toBe(successStream.stream)
      expect(result.current.error).toBeNull()

      await act(async () => {
        firstDeferred.reject(new Error('late failure'))
      })
      await expect(firstResult).resolves.toBeNull()
      expect(result.current.stream).toBe(successStream.stream)
      expect(result.current.error).toBeNull()
    })

    it('keeps loading true until overlapping operations settle', async () => {
      const firstDeferred = createDeferred<MediaStream>()
      const secondDeferred = createDeferred<MediaStream>()
      const firstStream = createMockStream([createMockTrack('video')])
      const secondStream = createMockStream([createMockTrack('video')])
      let call = 0
      const mock = createMockDisplayMedia({
        getDisplayMediaImpl: async () => {
          call += 1
          return call === 1 ? firstDeferred.promise : secondDeferred.promise
        },
      })
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())

      await act(async () => {
        void result.current.start()
      })
      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        void result.current.start()
      })
      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        firstDeferred.resolve(firstStream.stream)
      })
      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        secondDeferred.resolve(secondStream.stream)
      })
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('unmount cleanup', () => {
    it('stops owned tracks on unmount', async () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result, unmount } = renderHook(() => useDisplayMedia())

      await act(async () => {
        await result.current.start()
      })

      unmount()

      for (const track of mock.defaultStream.tracks) {
        expect(track.track.stop).toHaveBeenCalled()
      }
    })

    it('stops a stream that resolves after unmount without state update warnings', async () => {
      const deferred = createDeferred<MediaStream>()
      const lateStream = createMockStream([createMockTrack('video')])
      const mock = createMockDisplayMedia({
        getDisplayMediaImpl: () => deferred.promise,
      })
      stubDisplayMedia(mock)

      const consoleCapture = captureConsoleDuring(() => {})
      const { result, unmount } = renderHook(() => useDisplayMedia())

      await act(async () => {
        void result.current.start()
      })
      unmount()

      await act(async () => {
        deferred.resolve(lateStream.stream)
      })

      expect(lateStream.tracks[0]?.track.stop).toHaveBeenCalled()
      const unmountedUpdate = [
        ...consoleCapture.errors,
        ...consoleCapture.warnings,
      ]
        .flat()
        .some((message) => String(message).includes('unmounted component'))
      expect(unmountedUpdate).toBe(false)
    })
  })

  describe('enabled lifecycle', () => {
    it('auto starts once when enabled transitions false to true', async () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => useDisplayMedia({ enabled }),
        { initialProps: { enabled: false } },
      )

      await act(async () => {})
      expect(mock.getDisplayMedia).not.toHaveBeenCalled()

      rerender({ enabled: true })
      await waitFor(() => {
        expect(result.current.isSharing).toBe(true)
      })
      expect(mock.getDisplayMedia).toHaveBeenCalledTimes(1)

      rerender({ enabled: true })
      await act(async () => {})
      expect(mock.getDisplayMedia).toHaveBeenCalledTimes(1)
    })

    it('stops only declarative streams when enabled becomes false', async () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => useDisplayMedia({ enabled }),
        { initialProps: { enabled: true } },
      )

      await waitFor(() => {
        expect(result.current.isSharing).toBe(true)
      })

      rerender({ enabled: false })
      await waitFor(() => {
        expect(result.current.isSharing).toBe(false)
      })
      for (const track of mock.defaultStream.tracks) {
        expect(track.track.stop).toHaveBeenCalled()
      }
    })

    it('does not stop an imperative stream while enabled remains false', async () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia({ enabled: false }))

      await act(async () => {
        await result.current.start()
      })

      await act(async () => {})
      expect(result.current.isSharing).toBe(true)
      expect(mock.getDisplayMedia).toHaveBeenCalledTimes(1)
      for (const track of mock.defaultStream.tracks) {
        expect(track.track.stop).not.toHaveBeenCalled()
      }
    })

    it('does not stop an imperative stream when enabled toggles false after imperative start', async () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => useDisplayMedia({ enabled }),
        { initialProps: { enabled: false } },
      )

      await act(async () => {
        await result.current.start()
      })

      rerender({ enabled: false })
      await act(async () => {})

      expect(result.current.isSharing).toBe(true)
      for (const track of mock.defaultStream.tracks) {
        expect(track.track.stop).not.toHaveBeenCalled()
      }
    })
  })

  describe('constraint options', () => {
    type ConstraintProps = {
      enabled: boolean
      video: boolean | MediaTrackConstraints
      audio: boolean | MediaTrackConstraints
    }

    it('does not auto restart or change start identity when constraints change', async () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result, rerender } = renderHook<
        ReturnType<typeof useDisplayMedia>,
        ConstraintProps
      >(
        ({ enabled, video, audio }) =>
          useDisplayMedia({ enabled, video, audio }),
        {
          initialProps: {
            enabled: true,
            video: true,
            audio: false,
          },
        },
      )

      await waitFor(() => {
        expect(result.current.isSharing).toBe(true)
      })
      const start = result.current.start
      const calls = mock.getDisplayMedia.mock.calls.length

      rerender({
        enabled: true,
        video: { displaySurface: 'monitor' },
        audio: true,
      })
      await act(async () => {})
      expect(result.current.start).toBe(start)
      expect(mock.getDisplayMedia.mock.calls.length).toBe(calls)
    })

    type MediaConstraintProps = {
      video: boolean | MediaTrackConstraints
      audio: boolean | MediaTrackConstraints
    }

    it('uses the latest constraints on the next manual start', async () => {
      const mock = createMockDisplayMedia()
      stubDisplayMedia(mock)
      const { result, rerender } = renderHook<
        ReturnType<typeof useDisplayMedia>,
        MediaConstraintProps
      >(({ video, audio }) => useDisplayMedia({ video, audio }), {
        initialProps: {
          video: true,
          audio: false,
        },
      })

      rerender({
        video: { displaySurface: 'window' },
        audio: { echoCancellation: true },
      })

      await act(async () => {
        await result.current.start()
      })

      expect(mock.getDisplayMedia).toHaveBeenLastCalledWith({
        video: { displaySurface: 'window' },
        audio: { echoCancellation: true },
      })
    })
  })

  describe('errors', () => {
    it.each([
      ['NotAllowedError', 'NotAllowedError'],
      ['AbortError', 'AbortError'],
      ['NotFoundError', 'NotFoundError'],
      ['NotReadableError', 'NotReadableError'],
    ] as const)(
      'normalizes %s without throwing',
      async (name, expectedName) => {
        const mock = createMockDisplayMedia({
          getDisplayMediaImpl: async () => {
            const error = new Error(`${name} message`)
            error.name = name
            throw error
          },
        })
        stubDisplayMedia(mock)
        const { result } = renderHook(() => useDisplayMedia())

        await act(async () => {
          await expect(result.current.start()).resolves.toBeNull()
        })

        expect(result.current.error?.name).toBe(expectedName)
        expect(result.current.isSharing).toBe(false)
      },
    )

    it('normalizes generic Error, string, and unknown rejection values', async () => {
      const mock = createMockDisplayMedia({
        getDisplayMediaImpl: async () => {
          throw new Error('generic failure')
        },
      })
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())

      await act(async () => {
        await result.current.start()
      })
      expect(result.current.error?.message).toBe('generic failure')

      mock.getDisplayMedia.mockImplementationOnce(async () => {
        throw 'string failure'
      })
      await act(async () => {
        await result.current.start()
      })
      expect(result.current.error?.message).toBe('string failure')

      mock.getDisplayMedia.mockImplementationOnce(async () => {
        throw { code: 42 }
      })
      await act(async () => {
        await result.current.start()
      })
      expect(result.current.error?.message).toBe('{"code":42}')
    })

    it('recovers after an error when a later start succeeds', async () => {
      const mock = createMockDisplayMedia({
        getDisplayMediaImpl: async () => {
          throw new Error('first failure')
        },
      })
      stubDisplayMedia(mock)
      const { result } = renderHook(() => useDisplayMedia())

      await act(async () => {
        await result.current.start()
      })
      expect(result.current.error).not.toBeNull()

      mock.getDisplayMedia.mockImplementation(
        async () => mock.defaultStream.stream,
      )
      await act(async () => {
        await result.current.start()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.isSharing).toBe(true)
    })

    it('sets an error when starting in an unsupported environment', async () => {
      vi.stubGlobal('navigator', undefined)
      const { result } = renderHook(() => useDisplayMedia())

      await act(async () => {
        const value = await result.current.start()
        expect(value).toBeNull()
      })

      expect(result.current.error?.message).toContain('not available')
      expect(result.current.isSharing).toBe(false)
    })
  })

  describe('StrictMode', () => {
    it('does not leave duplicate active ownership or leaked tracks', async () => {
      const deferred = createDeferred<MediaStream>()
      const mock = createMockDisplayMedia({
        getDisplayMediaImpl: () => deferred.promise,
      })
      stubDisplayMedia(mock)

      render(
        <StrictMode>
          <Harness options={{ enabled: true }} />
        </StrictMode>,
      )

      await waitFor(() => {
        expect(mock.getDisplayMedia).toHaveBeenCalled()
      })
      expect(
        asMock(mock.getDisplayMedia).mock.calls.length,
      ).toBeLessThanOrEqual(2)

      const activeStream = createMockStream([createMockTrack('video')])
      await act(async () => {
        deferred.resolve(activeStream.stream)
      })

      await waitFor(() => {
        expect(
          activeStream.tracks[0]?.track.addEventListener,
        ).toHaveBeenCalled()
      })
    })
  })

  describe('SSR and environment safety', () => {
    it('importing without browser globals does not throw', async () => {
      vi.resetModules()
      vi.stubGlobal('navigator', undefined)
      await expect(import('./useDisplayMedia')).resolves.toMatchObject({
        useDisplayMedia: expect.any(Function),
      })
    })

    it('server rendering stays idle without layout effect warnings', () => {
      vi.stubGlobal('navigator', undefined)

      function ServerComponent(): ReactElement {
        const api = useDisplayMedia({ enabled: true })
        return (
          <div>
            {api.isSupported ? 'supported' : 'unsupported'}:
            {api.isSharing ? 'sharing' : 'idle'}
          </div>
        )
      }

      const { warnings, errors } = captureConsoleDuring(() => {
        const html = renderToString(<ServerComponent />)
        expect(html).toContain('unsupported')
        expect(html).toContain('idle')
      })

      const layoutWarnings = [...warnings, ...errors]
        .flat()
        .filter(isLayoutEffectSsrMessage)
      expect(layoutWarnings).toHaveLength(0)
    })

    it('start returns null and stop is a noop in unsupported environments', async () => {
      vi.stubGlobal('navigator', undefined)
      const { result } = renderHook(() => useDisplayMedia())

      let value: MediaStream | null = null
      await act(async () => {
        value = await result.current.start()
      })
      expect(value).toBeNull()

      await act(async () => {
        result.current.stop()
      })
      expect(result.current.stream).toBeNull()
      expect(result.current.isSharing).toBe(false)
    })
  })

  it('exposes a usable API from a mounted component', async () => {
    const mock = createMockDisplayMedia()
    stubDisplayMedia(mock)
    const { result } = renderHook(() => useDisplayMedia())

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.start).toBeTypeOf('function')
    expect(result.current.stop).toBeTypeOf('function')
    expect(result.current.isSharing).toBe(true)
  })
})
