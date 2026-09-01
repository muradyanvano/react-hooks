import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react'
import { StrictMode, useEffect, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

import {
  useElementByPoint,
  type UseElementByPointOptions,
} from './useElementByPoint'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

type RafControl = {
  elementFromPoint: Mock<(x: number, y: number) => Element | null>
  elementsFromPoint: Mock<(x: number, y: number) => Element[]>
  requestAnimationFrame: Mock<(callback: FrameRequestCallback) => number>
  cancelAnimationFrame: Mock<(id: number) => void>
  flushRaf: (id?: number) => void
  flushAllRaf: () => void
  pendingFrameIds: () => number[]
  scheduledCount: () => number
  cancelledIds: () => number[]
}

function createRafControl(): {
  callbacks: Map<number, FrameRequestCallback>
  nextId: number
} {
  return {
    callbacks: new Map<number, FrameRequestCallback>(),
    nextId: 1,
  }
}

function attachRafToWindow(
  targetWindow: Window,
  control: ReturnType<typeof createRafControl>,
): Pick<RafControl, 'requestAnimationFrame' | 'cancelAnimationFrame'> {
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    const id = control.nextId
    control.nextId += 1
    control.callbacks.set(id, callback)
    return id
  })

  const cancelAnimationFrame = vi.fn((id: number) => {
    control.callbacks.delete(id)
  })

  Object.defineProperty(targetWindow, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: requestAnimationFrame,
  })
  Object.defineProperty(targetWindow, 'cancelAnimationFrame', {
    configurable: true,
    writable: true,
    value: cancelAnimationFrame,
  })

  return {
    requestAnimationFrame,
    cancelAnimationFrame,
  }
}

function flushRafControl(
  control: ReturnType<typeof createRafControl>,
  id?: number,
): void {
  if (id != null) {
    const callback = control.callbacks.get(id)
    control.callbacks.delete(id)
    callback?.(0)
    return
  }

  const ids = [...control.callbacks.keys()]
  for (const frameId of ids) {
    const callback = control.callbacks.get(frameId)
    control.callbacks.delete(frameId)
    callback?.(0)
  }
}

function ensureDocumentHitTestMethods(): void {
  if (typeof document.elementFromPoint !== 'function') {
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      writable: true,
      value: () => null,
    })
  }

  if (typeof document.elementsFromPoint !== 'function') {
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      writable: true,
      value: () => [],
    })
  }
}

function stubGlobalElementByPoint(options?: {
  elementFromPointImpl?: (x: number, y: number) => Element | null
  elementsFromPointImpl?: (x: number, y: number) => Element[]
}): RafControl {
  ensureDocumentHitTestMethods()
  const rafControl = createRafControl()
  const elementFromPoint = vi
    .spyOn(document, 'elementFromPoint')
    .mockImplementation(options?.elementFromPointImpl ?? (() => null))
  const elementsFromPoint = vi
    .spyOn(document, 'elementsFromPoint')
    .mockImplementation(options?.elementsFromPointImpl ?? (() => []))

  const { requestAnimationFrame, cancelAnimationFrame } = attachRafToWindow(
    window,
    rafControl,
  )

  return {
    elementFromPoint,
    elementsFromPoint,
    requestAnimationFrame,
    cancelAnimationFrame,
    flushRaf: (id?: number) => flushRafControl(rafControl, id),
    flushAllRaf: () => flushRafControl(rafControl),
    pendingFrameIds: () => [...rafControl.callbacks.keys()],
    scheduledCount: () => requestAnimationFrame.mock.calls.length,
    cancelledIds: () => cancelAnimationFrame.mock.calls.map(([id]) => id),
  }
}

function createCustomDocument(options?: {
  elementFromPointImpl?: (x: number, y: number) => Element | null
  elementsFromPointImpl?: (x: number, y: number) => Element[]
  includeDefaultView?: boolean
}): {
  doc: Document
  raf: RafControl
} {
  const rafControl = createRafControl()
  const elementFromPoint = vi.fn(options?.elementFromPointImpl ?? (() => null))
  const elementsFromPoint = vi.fn(options?.elementsFromPointImpl ?? (() => []))

  const includeDefaultView = options?.includeDefaultView ?? true
  let requestAnimationFrame =
    vi.fn<(callback: FrameRequestCallback) => number>()
  let cancelAnimationFrame = vi.fn<(id: number) => void>()
  let defaultView: Window | null = null

  if (includeDefaultView) {
    defaultView = {
      document: undefined,
    } as unknown as Window
    const attached = attachRafToWindow(defaultView, rafControl)
    requestAnimationFrame = attached.requestAnimationFrame
    cancelAnimationFrame = attached.cancelAnimationFrame
  }

  const doc = {
    elementFromPoint,
    elementsFromPoint,
    defaultView,
  } as unknown as Document

  return {
    doc,
    raf: {
      elementFromPoint,
      elementsFromPoint,
      requestAnimationFrame,
      cancelAnimationFrame,
      flushRaf: (id?: number) => flushRafControl(rafControl, id),
      flushAllRaf: () => flushRafControl(rafControl),
      pendingFrameIds: () => [...rafControl.callbacks.keys()],
      scheduledCount: () => requestAnimationFrame.mock.calls.length,
      cancelledIds: () => cancelAnimationFrame.mock.calls.map(([id]) => id),
    },
  }
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

function isLayoutEffectSsrMessage(message: unknown): boolean {
  const normalized = String(message).toLowerCase()
  return (
    normalized.includes('uselayouteffect') &&
    (normalized.includes('does nothing on the server') ||
      normalized.includes('server-rendered') ||
      normalized.includes('server renderer'))
  )
}

function Harness({
  options,
  onReady,
}: {
  options: UseElementByPointOptions<boolean>
  onReady?: (api: ReturnType<typeof useElementByPoint>) => void
}): ReactElement {
  const api = useElementByPoint(options)
  useEffect(() => {
    onReady?.(api)
  }, [api, onReady])
  return (
    <div
      data-testid="harness"
      data-supported={api.isSupported ? 'true' : 'false'}
      data-paused={api.isPaused ? 'true' : 'false'}
      data-element-count={
        Array.isArray(api.element) ? String(api.element.length) : 'single'
      }
    />
  )
}

async function flushLookup(raf: RafControl): Promise<void> {
  await act(async () => {
    raf.flushAllRaf()
  })
}

describe('useElementByPoint', () => {
  describe('defaults and support', () => {
    it('defaults to multiple false, enabled true, and animationFrame scheduler', async () => {
      const raf = stubGlobalElementByPoint()
      const div = document.createElement('div')
      raf.elementFromPoint.mockReturnValue(div)

      const { result } = renderHook(() => useElementByPoint({ x: 5, y: 10 }))

      expect(result.current.element).toBeNull()
      expect(result.current.isPaused).toBe(false)
      expect(result.current.isSupported).toBe(true)
      expect(raf.requestAnimationFrame).toHaveBeenCalled()

      await flushLookup(raf)

      expect(result.current.element).toBe(div)
      expect(raf.elementFromPoint).toHaveBeenCalledWith(5, 10)
      expect(raf.elementsFromPoint).not.toHaveBeenCalled()
    })

    it('reports unsupported when elementFromPoint is missing in single mode', () => {
      const doc = {
        defaultView: window,
      } as unknown as Document
      const { result } = renderHook(() =>
        useElementByPoint({ x: 0, y: 0, document: doc }),
      )
      expect(result.current.isSupported).toBe(false)
    })

    it('reports unsupported when elementsFromPoint is missing in multiple mode', () => {
      const doc = {
        elementFromPoint: vi.fn(),
        defaultView: window,
      } as unknown as Document
      const { result } = renderHook(() =>
        useElementByPoint({ x: 0, y: 0, multiple: true, document: doc }),
      )
      expect(result.current.isSupported).toBe(false)
    })

    it('reports supported in multiple mode when elementsFromPoint exists', () => {
      const doc = {
        elementsFromPoint: vi.fn(() => []),
        defaultView: window,
      } as unknown as Document
      const { result } = renderHook(() =>
        useElementByPoint({ x: 0, y: 0, multiple: true, document: doc }),
      )
      expect(result.current.isSupported).toBe(true)
    })
  })

  describe('coordinates', () => {
    it.each([
      ['NaN x', Number.NaN, 10],
      ['NaN y', 10, Number.NaN],
      ['Infinity x', Number.POSITIVE_INFINITY, 10],
      ['Infinity y', 10, Number.NEGATIVE_INFINITY],
    ] as const)(
      'skips lookup for %s and keeps empty result',
      async (label, x, y) => {
        void label
        const raf = stubGlobalElementByPoint({
          elementFromPointImpl: () => document.createElement('div'),
        })

        const { result } = renderHook(() => useElementByPoint({ x, y }))
        await flushLookup(raf)

        expect(result.current.element).toBeNull()
        expect(raf.elementFromPoint).not.toHaveBeenCalled()
      },
    )

    it('passes finite coordinates through to lookup', async () => {
      const raf = stubGlobalElementByPoint()
      const { result } = renderHook(() =>
        useElementByPoint({ x: 12.5, y: 33.75 }),
      )

      await flushLookup(raf)

      expect(raf.elementFromPoint).toHaveBeenCalledWith(12.5, 33.75)
      expect(result.current.element).toBeNull()
    })
  })

  describe('single mode lookup', () => {
    it('uses elementFromPoint with exact coordinates and returns HTMLElement', async () => {
      const raf = stubGlobalElementByPoint()
      const div = document.createElement('div')
      raf.elementFromPoint.mockReturnValue(div)

      const { result } = renderHook(() => useElementByPoint({ x: 4, y: 8 }))
      await flushLookup(raf)

      expect(result.current.element).toBe(div)
      expect(raf.elementFromPoint).toHaveBeenCalledWith(4, 8)
    })

    it('supports fractional coordinates and SVG elements', async () => {
      const raf = stubGlobalElementByPoint()
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      raf.elementFromPoint.mockReturnValue(svg)

      const { result } = renderHook(() =>
        useElementByPoint({ x: 1.25, y: 2.5 }),
      )
      await flushLookup(raf)

      expect(result.current.element).toBe(svg)
      expect(raf.elementFromPoint).toHaveBeenCalledWith(1.25, 2.5)
    })

    it('returns null when elementFromPoint returns null', async () => {
      const raf = stubGlobalElementByPoint()
      raf.elementFromPoint.mockReturnValue(null)

      const { result } = renderHook(() => useElementByPoint({ x: 0, y: 0 }))
      await flushLookup(raf)

      expect(result.current.element).toBeNull()
    })

    it('skips state update when the resolved element identity is unchanged', async () => {
      const raf = stubGlobalElementByPoint()
      const div = document.createElement('div')
      raf.elementFromPoint.mockReturnValue(div)

      const renderSpy = vi.fn()
      const { result, rerender } = renderHook(
        ({ x, y }: { x: number; y: number }) => {
          const api = useElementByPoint({ x, y })
          renderSpy()
          return api
        },
        { initialProps: { x: 1, y: 1 } },
      )

      await flushLookup(raf)
      const rendersAfterFirstLookup = renderSpy.mock.calls.length
      const elementRef = result.current.element

      rerender({ x: 2, y: 2 })
      const rendersAfterRerender = renderSpy.mock.calls.length
      await flushLookup(raf)

      expect(result.current.element).toBe(elementRef)
      expect(result.current.element).toBe(div)
      expect(renderSpy.mock.calls.length).toBe(rendersAfterRerender)
      expect(rendersAfterRerender).toBeGreaterThan(rendersAfterFirstLookup)
    })
  })

  describe('multiple mode lookup', () => {
    it('uses elementsFromPoint, preserves order, and does not call elementFromPoint', async () => {
      const raf = stubGlobalElementByPoint()
      const first = document.createElement('div')
      const second = document.createElement('span')
      raf.elementsFromPoint.mockReturnValue([first, second])

      const { result } = renderHook(() =>
        useElementByPoint({ x: 3, y: 6, multiple: true }),
      )
      await flushLookup(raf)

      expect(result.current.element).toEqual([first, second])
      expect(raf.elementsFromPoint).toHaveBeenCalledWith(3, 6)
      expect(raf.elementFromPoint).not.toHaveBeenCalled()
    })

    it('returns the readonly empty snapshot when nothing is hit', async () => {
      const raf = stubGlobalElementByPoint()
      raf.elementsFromPoint.mockReturnValue([])

      const { result } = renderHook(() =>
        useElementByPoint({ x: 0, y: 0, multiple: true }),
      )
      await flushLookup(raf)

      expect(result.current.element).toEqual([])
      expect(Object.isFrozen(result.current.element)).toBe(true)
    })

    it('skips state update when the element list is unchanged by identity', async () => {
      const raf = stubGlobalElementByPoint()
      const first = document.createElement('div')
      const second = document.createElement('span')
      raf.elementsFromPoint.mockReturnValue([first, second])

      const renderSpy = vi.fn()
      const { result, rerender } = renderHook(
        ({ x, y }: { x: number; y: number }) => {
          const api = useElementByPoint({ x, y, multiple: true })
          renderSpy()
          return api
        },
        { initialProps: { x: 0, y: 0 } },
      )

      await flushLookup(raf)
      const rendersAfterFirstLookup = renderSpy.mock.calls.length
      const listRef = result.current.element

      rerender({ x: 5, y: 5 })
      const rendersAfterRerender = renderSpy.mock.calls.length
      await flushLookup(raf)

      expect(result.current.element).toBe(listRef)
      expect(renderSpy.mock.calls.length).toBe(rendersAfterRerender)
      expect(rendersAfterRerender).toBeGreaterThan(rendersAfterFirstLookup)
    })
  })

  describe('mode changes', () => {
    it('changes result shape when multiple toggles false to true and back', async () => {
      const raf = stubGlobalElementByPoint()
      const single = document.createElement('div')
      const stack = [
        document.createElement('span'),
        document.createElement('p'),
      ]
      raf.elementFromPoint.mockReturnValue(single)
      raf.elementsFromPoint.mockReturnValue(stack)

      const { result, rerender } = renderHook(
        ({ multiple }: { multiple: boolean }) =>
          useElementByPoint({ x: 1, y: 2, multiple }),
        { initialProps: { multiple: false } },
      )

      await flushLookup(raf)
      expect(result.current.element).toBe(single)

      rerender({ multiple: true })
      await flushLookup(raf)
      expect(result.current.element).toEqual(stack)
      expect(raf.elementsFromPoint).toHaveBeenCalled()

      rerender({ multiple: false })
      await flushLookup(raf)
      expect(result.current.element).toBe(single)
    })

    it('ignores a stale single-mode frame after switching to multiple before rAF fires', async () => {
      const raf = stubGlobalElementByPoint()
      const single = document.createElement('div')
      const stack = [document.createElement('span')]
      raf.elementFromPoint.mockReturnValue(single)
      raf.elementsFromPoint.mockReturnValue(stack)

      const { result, rerender } = renderHook(
        ({ multiple }: { multiple: boolean }) =>
          useElementByPoint({ x: 1, y: 2, multiple }),
        { initialProps: { multiple: false } },
      )

      const staleFrameId = raf.pendingFrameIds().at(-1)
      rerender({ multiple: true })
      await flushLookup(raf)

      if (staleFrameId != null) {
        await act(async () => {
          raf.flushRaf(staleFrameId)
        })
      }

      expect(Array.isArray(result.current.element)).toBe(true)
      expect(result.current.element).toEqual(stack)
    })
  })

  describe('animationFrame scheduler', () => {
    it('schedules lookup on document.defaultView and resolves after rAF', async () => {
      const raf = stubGlobalElementByPoint()
      const div = document.createElement('div')
      raf.elementFromPoint.mockReturnValue(div)

      const { result } = renderHook(() => useElementByPoint({ x: 7, y: 9 }))
      expect(raf.requestAnimationFrame).toHaveBeenCalled()
      expect(raf.elementFromPoint).not.toHaveBeenCalled()

      await flushLookup(raf)

      expect(result.current.element).toBe(div)
    })

    it('cancels stale frames when coordinates change before rAF fires', async () => {
      const raf = stubGlobalElementByPoint()
      const first = document.createElement('div')
      const second = document.createElement('span')
      raf.elementFromPoint.mockImplementation((x) => (x === 1 ? first : second))

      const { rerender } = renderHook(
        ({ x }: { x: number }) => useElementByPoint({ x, y: 0 }),
        { initialProps: { x: 1 } },
      )

      const firstFrameId = raf.pendingFrameIds().at(-1)
      expect(firstFrameId).toBeDefined()

      rerender({ x: 2 })
      expect(raf.cancelAnimationFrame).toHaveBeenCalledWith(firstFrameId)

      await flushLookup(raf)
      expect(raf.elementFromPoint).toHaveBeenLastCalledWith(2, 0)
    })

    it('ignores stale generation callbacks after a newer schedule', async () => {
      const raf = stubGlobalElementByPoint()
      const stale = document.createElement('div')
      const latest = document.createElement('span')
      raf.elementFromPoint.mockImplementation((x) => (x === 1 ? stale : latest))

      const { result, rerender } = renderHook(
        ({ x }: { x: number }) => useElementByPoint({ x, y: 0 }),
        { initialProps: { x: 1 } },
      )

      const staleFrameId = raf.pendingFrameIds().at(-1)
      rerender({ x: 2 })
      await flushLookup(raf)

      if (staleFrameId != null) {
        await act(async () => {
          raf.flushRaf(staleFrameId)
        })
      }

      expect(result.current.element).toBe(latest)
    })

    it('cancels pending frames on unmount cleanup', async () => {
      const raf = stubGlobalElementByPoint()
      const { unmount } = renderHook(() => useElementByPoint({ x: 0, y: 0 }))

      const pendingId = raf.pendingFrameIds().at(-1)
      expect(pendingId).toBeDefined()

      unmount()

      expect(raf.cancelAnimationFrame).toHaveBeenCalledWith(pendingId)
      await act(async () => {
        raf.flushRaf(pendingId)
      })
      expect(raf.elementFromPoint).not.toHaveBeenCalled()
    })

    it('cancels pending frames when paused, disabled, or scheduler changes', async () => {
      const raf = stubGlobalElementByPoint()

      const paused = renderHook(() => useElementByPoint({ x: 0, y: 0 }))
      const pausedFrameId = raf.pendingFrameIds().at(-1)
      act(() => {
        paused.result.current.pause()
      })
      expect(raf.cancelAnimationFrame).toHaveBeenCalledWith(pausedFrameId)
      paused.unmount()
      raf.cancelAnimationFrame.mockClear()

      const disabled = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useElementByPoint({ x: 0, y: 0, enabled }),
        { initialProps: { enabled: true } },
      )
      const disabledFrameId = raf.pendingFrameIds().at(-1)
      raf.cancelAnimationFrame.mockClear()
      disabled.rerender({ enabled: false })
      expect(raf.cancelAnimationFrame).toHaveBeenCalledWith(disabledFrameId)
      disabled.unmount()
      raf.cancelAnimationFrame.mockClear()

      const scheduler = renderHook(
        ({ scheduler }: { scheduler: 'animationFrame' | 'sync' }) =>
          useElementByPoint({ x: 0, y: 0, scheduler }),
        {
          initialProps: {
            scheduler: 'animationFrame' as 'animationFrame' | 'sync',
          },
        },
      )
      const schedulerFrameId = raf.pendingFrameIds().at(-1)
      raf.cancelAnimationFrame.mockClear()
      scheduler.rerender({ scheduler: 'sync' })
      expect(raf.cancelAnimationFrame).toHaveBeenCalledWith(schedulerFrameId)
    })
  })

  describe('sync scheduler', () => {
    it('queries immediately after effect without scheduling rAF', async () => {
      const raf = stubGlobalElementByPoint()
      const div = document.createElement('div')
      raf.elementFromPoint.mockReturnValue(div)

      const { result } = renderHook(() =>
        useElementByPoint({ x: 11, y: 22, scheduler: 'sync' }),
      )

      expect(raf.requestAnimationFrame).not.toHaveBeenCalled()
      expect(result.current.element).toBe(div)
      expect(raf.elementFromPoint).toHaveBeenCalledWith(11, 22)
    })
  })

  describe('update()', () => {
    it('runs an immediate lookup with latest coordinates', async () => {
      const raf = stubGlobalElementByPoint()
      const div = document.createElement('div')
      raf.elementFromPoint.mockReturnValue(div)

      const { result, rerender } = renderHook(
        ({ x, y }: { x: number; y: number }) =>
          useElementByPoint({ x, y, scheduler: 'animationFrame' }),
        { initialProps: { x: 0, y: 0 } },
      )

      await flushLookup(raf)
      raf.elementFromPoint.mockClear()

      rerender({ x: 40, y: 50 })
      act(() => {
        result.current.update()
      })

      expect(raf.elementFromPoint).toHaveBeenCalledWith(40, 50)
      expect(raf.requestAnimationFrame.mock.calls.length).toBeGreaterThan(0)
    })

    it('is a no-op while paused or disabled but keeps stable identity', async () => {
      const raf = stubGlobalElementByPoint()
      const div = document.createElement('div')
      raf.elementFromPoint.mockReturnValue(div)

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useElementByPoint({ x: 1, y: 1, enabled }),
        { initialProps: { enabled: true } },
      )

      await flushLookup(raf)
      const update = result.current.update

      act(() => {
        result.current.pause()
      })
      raf.elementFromPoint.mockClear()
      act(() => {
        result.current.update()
      })
      expect(raf.elementFromPoint).not.toHaveBeenCalled()

      rerender({ enabled: false })
      act(() => {
        result.current.update()
      })
      expect(raf.elementFromPoint).not.toHaveBeenCalled()

      rerender({ enabled: true })
      expect(result.current.update).toBe(update)
    })
  })

  describe('pause and resume', () => {
    it('freezes the result while paused and refreshes on resume', async () => {
      const raf = stubGlobalElementByPoint()
      const initial = document.createElement('div')
      const refreshed = document.createElement('span')
      raf.elementFromPoint.mockReturnValue(initial)

      const { result, rerender } = renderHook(
        ({ x, y }: { x: number; y: number }) => useElementByPoint({ x, y }),
        { initialProps: { x: 0, y: 0 } },
      )
      await flushLookup(raf)

      act(() => {
        result.current.pause()
      })
      expect(result.current.isPaused).toBe(true)

      raf.elementFromPoint.mockReturnValue(refreshed)
      rerender({ x: 10, y: 10 })
      await act(async () => {})
      expect(result.current.element).toBe(initial)

      act(() => {
        result.current.resume()
      })
      await flushLookup(raf)

      expect(result.current.isPaused).toBe(false)
      expect(result.current.element).toBe(refreshed)
    })
  })

  describe('enabled lifecycle', () => {
    it('clears results when disabled and refreshes when re-enabled', async () => {
      const raf = stubGlobalElementByPoint()
      const div = document.createElement('div')
      raf.elementFromPoint.mockReturnValue(div)

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useElementByPoint({ x: 0, y: 0, enabled }),
        { initialProps: { enabled: true } },
      )

      await flushLookup(raf)
      expect(result.current.element).toBe(div)

      rerender({ enabled: false })
      expect(result.current.element).toBeNull()

      raf.elementFromPoint.mockReturnValue(div)
      rerender({ enabled: true })
      await flushLookup(raf)
      expect(result.current.element).toBe(div)
    })

    it('keeps paused state independent from enabled transitions', async () => {
      const raf = stubGlobalElementByPoint()
      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useElementByPoint({ x: 0, y: 0, enabled }),
        { initialProps: { enabled: true } },
      )

      act(() => {
        result.current.pause()
      })
      expect(result.current.isPaused).toBe(true)

      rerender({ enabled: false })
      expect(result.current.isPaused).toBe(true)

      rerender({ enabled: true })
      expect(result.current.isPaused).toBe(true)
      expect(raf.pendingFrameIds()).toHaveLength(0)
    })
  })

  describe('document option', () => {
    it('uses a custom document when provided', async () => {
      stubGlobalElementByPoint()
      const { doc, raf } = createCustomDocument({
        elementFromPointImpl: () => document.createElement('article'),
      })

      const { result } = renderHook(() =>
        useElementByPoint({ x: 3, y: 4, document: doc }),
      )
      await flushLookup(raf)

      expect(raf.elementFromPoint).toHaveBeenCalledWith(3, 4)
      expect(result.current.element).not.toBeNull()
    })

    it('does not fall back to global document when document is explicitly null', async () => {
      const global = stubGlobalElementByPoint({
        elementFromPointImpl: () => document.createElement('div'),
      })

      const { result } = renderHook(() =>
        useElementByPoint({ x: 0, y: 0, document: null }),
      )
      await act(async () => {})

      expect(result.current.isSupported).toBe(false)
      expect(result.current.element).toBeNull()
      expect(global.elementFromPoint).not.toHaveBeenCalled()
    })

    it('uses the global document when the option is omitted', async () => {
      const raf = stubGlobalElementByPoint()
      const div = document.createElement('div')
      raf.elementFromPoint.mockReturnValue(div)

      const { result } = renderHook(() => useElementByPoint({ x: 8, y: 9 }))
      await flushLookup(raf)

      expect(raf.elementFromPoint).toHaveBeenCalledWith(8, 9)
      expect(result.current.element).toBe(div)
    })
  })

  describe('StrictMode', () => {
    it('does not leave duplicate active frames or leaked lookups', async () => {
      const raf = stubGlobalElementByPoint()
      const div = document.createElement('div')
      raf.elementFromPoint.mockReturnValue(div)

      render(
        <StrictMode>
          <Harness options={{ x: 1, y: 2 }} />
        </StrictMode>,
      )

      await waitFor(() => {
        expect(raf.scheduledCount()).toBeGreaterThan(0)
      })

      expect(raf.scheduledCount()).toBeLessThanOrEqual(2)

      await flushLookup(raf)

      expect(raf.elementFromPoint.mock.calls.length).toBeLessThanOrEqual(2)
      expect(raf.pendingFrameIds()).toHaveLength(0)
    })
  })

  describe('SSR and environment safety', () => {
    it('importing without browser globals does not throw', async () => {
      vi.resetModules()
      vi.stubGlobal('document', undefined)
      await expect(import('./useElementByPoint')).resolves.toMatchObject({
        useElementByPoint: expect.any(Function),
      })
    })

    it('server rendering stays empty without layout effect warnings', () => {
      const raf = stubGlobalElementByPoint()

      function ServerComponent(): ReactElement {
        const api = useElementByPoint({ x: 0, y: 0 })
        return (
          <div>
            {api.isSupported ? 'supported' : 'unsupported'}:
            {api.element == null ? 'empty' : 'hit'}
          </div>
        )
      }

      const { warnings, errors } = captureConsoleDuring(() => {
        const html = renderToString(<ServerComponent />)
        expect(html).toContain('unsupported')
        expect(html).toContain('empty')
      })

      expect(raf.requestAnimationFrame).not.toHaveBeenCalled()
      expect(raf.elementFromPoint).not.toHaveBeenCalled()

      const layoutWarnings = [...warnings, ...errors]
        .flat()
        .filter(isLayoutEffectSsrMessage)
      expect(layoutWarnings).toHaveLength(0)
    })

    it('server rendering with multiple mode stays empty without lookup', () => {
      const raf = stubGlobalElementByPoint()

      function ServerComponent(): ReactElement {
        const api = useElementByPoint({ x: 0, y: 0, multiple: true })
        return (
          <div>
            {Array.isArray(api.element) ? api.element.length : 'not-array'}
          </div>
        )
      }

      const html = renderToString(<ServerComponent />)
      expect(html).toContain('0')
      expect(raf.elementsFromPoint).not.toHaveBeenCalled()
      expect(raf.requestAnimationFrame).not.toHaveBeenCalled()
    })

    it('hydrates without a support-state mismatch warning', () => {
      const raf = stubGlobalElementByPoint()
      const messages: string[] = []
      const originalError = console.error
      console.error = (...args: unknown[]) => {
        messages.push(args.map(String).join(' '))
      }

      function Component(): ReactElement {
        const api = useElementByPoint({ x: 0, y: 0 })
        return (
          <div data-testid="hydrate-root">
            {api.isSupported ? 'supported' : 'unsupported'}:
            {api.element == null ? 'empty' : 'hit'}
          </div>
        )
      }

      const html = renderToString(<Component />)
      expect(html).toContain('unsupported')

      const container = document.createElement('div')
      container.innerHTML = html

      act(() => {
        hydrateRoot(container, <Component />)
      })

      const hydrationErrors = messages.filter((message) =>
        /hydration|did not match/i.test(message),
      )
      expect(hydrationErrors).toHaveLength(0)
      expect(raf.elementFromPoint).not.toHaveBeenCalled()

      console.error = originalError
    })
  })

  it('exposes a usable API from a mounted component', async () => {
    const raf = stubGlobalElementByPoint()
    const { result } = renderHook(() => useElementByPoint({ x: 0, y: 0 }))

    await flushLookup(raf)

    expect(result.current.update).toBeTypeOf('function')
    expect(result.current.pause).toBeTypeOf('function')
    expect(result.current.resume).toBeTypeOf('function')
    expect(result.current.isSupported).toBeTypeOf('boolean')
  })
})
