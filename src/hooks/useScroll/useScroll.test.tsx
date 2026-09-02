import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from '@testing-library/react'
import {
  StrictMode,
  createRef,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IDLE_SCROLL_STATE } from './scrollHelpers'
import {
  useScroll,
  type UseScrollOptions,
  type UseScrollReturn,
} from './useScroll'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    return window.setTimeout(() => {
      callback(0)
    }, 0) as unknown as number
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    window.clearTimeout(id)
  })
})

interface ScrollMetricsState {
  scrollTop: number
  scrollLeft: number
  scrollHeight: number
  scrollWidth: number
  clientHeight: number
  clientWidth: number
}

function createMetricsState(
  metrics: Partial<ScrollMetricsState> = {},
): ScrollMetricsState {
  return {
    scrollTop: metrics.scrollTop ?? 0,
    scrollLeft: metrics.scrollLeft ?? 0,
    scrollHeight: metrics.scrollHeight ?? 1000,
    scrollWidth: metrics.scrollWidth ?? 1000,
    clientHeight: metrics.clientHeight ?? 200,
    clientWidth: metrics.clientWidth ?? 200,
  }
}

function applyMetrics(
  element: HTMLElement,
  state: ScrollMetricsState,
): ScrollMetricsState {
  Object.defineProperties(element, {
    scrollTop: {
      configurable: true,
      get: () => state.scrollTop,
      set: (value: number) => {
        state.scrollTop = value
      },
    },
    scrollLeft: {
      configurable: true,
      get: () => state.scrollLeft,
      set: (value: number) => {
        state.scrollLeft = value
      },
    },
    scrollHeight: {
      configurable: true,
      get: () => state.scrollHeight,
    },
    scrollWidth: {
      configurable: true,
      get: () => state.scrollWidth,
    },
    clientHeight: {
      configurable: true,
      get: () => state.clientHeight,
    },
    clientWidth: {
      configurable: true,
      get: () => state.clientWidth,
    },
  })

  element.scrollTo = ((options: ScrollToOptions | number) => {
    if (typeof options === 'number') {
      return
    }

    if (options.left != null) {
      state.scrollLeft = options.left
    }
    if (options.top != null) {
      state.scrollTop = options.top
    }
  }) as typeof element.scrollTo

  return state
}

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function Harness({
  options,
  elementRef,
  metrics,
  onApi,
}: {
  options?: UseScrollOptions
  elementRef?: RefObject<HTMLDivElement | null>
  metrics?: ScrollMetricsState
  onApi?: (api: UseScrollReturn) => void
}): ReactElement {
  const localRef = useRef<HTMLDivElement>(null)
  const ref = elementRef ?? localRef
  const api = useScroll(ref, options)
  onApi?.(api)

  return (
    <div
      ref={(node) => {
        localRef.current = node
        if (elementRef != null) {
          elementRef.current = node
        }
        if (node != null && metrics != null) {
          applyMetrics(node, metrics)
        }
      }}
      data-testid="scroller"
      data-x={String(api.x)}
      data-y={String(api.y)}
      data-scrolling={String(api.isScrolling)}
      data-left={String(api.arrivedState.left)}
      data-right={String(api.arrivedState.right)}
      data-top={String(api.arrivedState.top)}
      data-bottom={String(api.arrivedState.bottom)}
      data-dir-left={String(api.directions.left)}
      data-dir-right={String(api.directions.right)}
      data-dir-top={String(api.directions.top)}
      data-dir-bottom={String(api.directions.bottom)}
    />
  )
}

function readScroller(): {
  x: number
  y: number
  isScrolling: boolean
  arrivedState: {
    left: boolean
    right: boolean
    top: boolean
    bottom: boolean
  }
  directions: {
    left: boolean
    right: boolean
    top: boolean
    bottom: boolean
  }
} {
  const node = screen.getByTestId('scroller')
  return {
    x: Number(node.getAttribute('data-x')),
    y: Number(node.getAttribute('data-y')),
    isScrolling: node.getAttribute('data-scrolling') === 'true',
    arrivedState: {
      left: node.getAttribute('data-left') === 'true',
      right: node.getAttribute('data-right') === 'true',
      top: node.getAttribute('data-top') === 'true',
      bottom: node.getAttribute('data-bottom') === 'true',
    },
    directions: {
      left: node.getAttribute('data-dir-left') === 'true',
      right: node.getAttribute('data-dir-right') === 'true',
      top: node.getAttribute('data-dir-top') === 'true',
      bottom: node.getAttribute('data-dir-bottom') === 'true',
    },
  }
}

describe('useScroll', () => {
  describe('SSR and initial state', () => {
    it('renders idle state on the server without listeners', () => {
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')

      function ServerHarness(): ReactElement {
        const ref = createRef<HTMLDivElement>()
        const api = useScroll(ref)
        return (
          <div
            data-x={String(api.x)}
            data-y={String(api.y)}
            data-scrolling={String(api.isScrolling)}
            data-left={String(api.arrivedState.left)}
            data-right={String(api.arrivedState.right)}
            data-top={String(api.arrivedState.top)}
            data-bottom={String(api.arrivedState.bottom)}
          />
        )
      }

      const html = renderToString(<ServerHarness />)
      expect(html).toContain(`data-x="${IDLE_SCROLL_STATE.x}"`)
      expect(html).toContain(`data-y="${IDLE_SCROLL_STATE.y}"`)
      expect(html).toContain('data-scrolling="false"')
      expect(html).toContain(
        `data-left="${IDLE_SCROLL_STATE.arrivedState.left}"`,
      )
      expect(html).toContain(
        `data-right="${IDLE_SCROLL_STATE.arrivedState.right}"`,
      )
      expect(html).toContain(`data-top="${IDLE_SCROLL_STATE.arrivedState.top}"`)
      expect(html).toContain(
        `data-bottom="${IDLE_SCROLL_STATE.arrivedState.bottom}"`,
      )
      expect(addSpy).not.toHaveBeenCalled()
    })

    it('keeps idle state while the ref is null', () => {
      function NullHarness(): ReactElement {
        const ref = useRef<HTMLDivElement | null>(null)
        const api = useScroll(ref)
        return (
          <div
            data-testid="null-host"
            data-x={String(api.x)}
            data-y={String(api.y)}
            data-scrolling={String(api.isScrolling)}
          />
        )
      }

      render(<NullHarness />)
      const host = screen.getByTestId('null-host')
      expect(host.getAttribute('data-x')).toBe('0')
      expect(host.getAttribute('data-y')).toBe('0')
      expect(host.getAttribute('data-scrolling')).toBe('false')
    })
  })

  describe('attachment and measurement', () => {
    it('measures element metrics after late attachment', async () => {
      function LateHarness(): ReactElement {
        const ref = useRef<HTMLDivElement | null>(null)
        const [ready, setReady] = useState(false)
        const api = useScroll(ref)

        return (
          <>
            <button
              type="button"
              data-testid="attach"
              onClick={() => {
                const node = document.createElement('div')
                applyMetrics(
                  node,
                  createMetricsState({ scrollLeft: 120, scrollTop: 45 }),
                )
                ref.current = node
                setReady(true)
              }}
            >
              Attach
            </button>
            <div
              data-testid="late-host"
              data-x={String(api.x)}
              data-y={String(api.y)}
              data-ready={String(ready)}
            />
          </>
        )
      }

      render(<LateHarness />)
      expect(screen.getByTestId('late-host').getAttribute('data-x')).toBe('0')

      await act(async () => {
        screen.getByTestId('attach').click()
      })
      await flushMicrotasks()
      expect(screen.getByTestId('late-host').getAttribute('data-x')).toBe('120')
      expect(screen.getByTestId('late-host').getAttribute('data-y')).toBe('45')
    })

    it('marks all edges arrived for non-scrollable elements', async () => {
      render(
        <Harness
          metrics={createMetricsState({
            scrollLeft: 0,
            scrollTop: 0,
            scrollWidth: 200,
            scrollHeight: 200,
            clientWidth: 200,
            clientHeight: 200,
          })}
        />,
      )

      await flushMicrotasks()
      const state = readScroller()
      expect(state.arrivedState).toEqual({
        left: true,
        right: true,
        top: true,
        bottom: true,
      })
    })

    it('updates x/y, directions, and arrived state on scroll', async () => {
      const ref = createRef<HTMLDivElement>()
      const metricsState = createMetricsState({
        scrollLeft: 0,
        scrollTop: 0,
      })

      render(
        <Harness
          elementRef={ref}
          metrics={metricsState}
          options={{ throttle: 0, idle: 200 }}
        />,
      )
      await flushMicrotasks()

      await act(async () => {
        metricsState.scrollLeft = 100
        metricsState.scrollTop = 50
        ref.current?.dispatchEvent(new Event('scroll'))
      })

      const state = readScroller()
      expect(state.x).toBe(100)
      expect(state.y).toBe(50)
      expect(state.directions).toEqual({
        left: false,
        right: true,
        top: false,
        bottom: true,
      })
      expect(state.arrivedState.left).toBe(false)
      expect(state.arrivedState.top).toBe(false)
    })
  })

  describe('isScrolling and onStop', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('sets isScrolling during scroll and calls onStop after idle', async () => {
      const onStop = vi.fn()
      const ref = createRef<HTMLDivElement>()
      const metricsState = createMetricsState()

      render(
        <Harness
          elementRef={ref}
          metrics={metricsState}
          options={{ idle: 200, throttle: 0, onStop }}
        />,
      )
      await flushMicrotasks()

      await act(async () => {
        metricsState.scrollLeft = 10
        ref.current?.dispatchEvent(new Event('scroll'))
      })
      expect(readScroller().isScrolling).toBe(true)
      expect(onStop).not.toHaveBeenCalled()

      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      expect(readScroller().isScrolling).toBe(false)
      expect(onStop).toHaveBeenCalledTimes(1)
      expect(onStop.mock.calls[0]?.[0]).toBeInstanceOf(Event)
    })

    it('waits for idle plus throttle before stopping', async () => {
      const onStop = vi.fn()
      const ref = createRef<HTMLDivElement>()
      const metricsState = createMetricsState()

      render(
        <Harness
          elementRef={ref}
          metrics={metricsState}
          options={{ idle: 200, throttle: 50, onStop }}
        />,
      )
      await flushMicrotasks()

      await act(async () => {
        metricsState.scrollLeft = 20
        ref.current?.dispatchEvent(new Event('scroll'))
      })

      await act(async () => {
        vi.advanceTimersByTime(200)
      })
      expect(readScroller().isScrolling).toBe(true)
      expect(onStop).not.toHaveBeenCalled()

      await act(async () => {
        vi.advanceTimersByTime(50)
      })
      expect(readScroller().isScrolling).toBe(false)
      expect(onStop).toHaveBeenCalledTimes(1)
    })
  })

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('invokes leading measurements immediately and trailing once per window', async () => {
      const onScroll = vi.fn()
      const ref = createRef<HTMLDivElement>()
      const metricsState = createMetricsState()

      render(
        <Harness
          elementRef={ref}
          metrics={metricsState}
          options={{ throttle: 100, idle: 200, onScroll }}
        />,
      )
      await flushMicrotasks()
      onScroll.mockClear()

      await act(async () => {
        metricsState.scrollLeft = 10
        ref.current?.dispatchEvent(new Event('scroll'))
      })
      expect(onScroll).toHaveBeenCalledTimes(1)
      expect(readScroller().x).toBe(10)

      await act(async () => {
        metricsState.scrollLeft = 20
        ref.current?.dispatchEvent(new Event('scroll'))
        metricsState.scrollLeft = 30
        ref.current?.dispatchEvent(new Event('scroll'))
      })
      expect(onScroll).toHaveBeenCalledTimes(1)
      expect(readScroller().x).toBe(10)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      expect(onScroll).toHaveBeenCalledTimes(2)
      expect(readScroller().x).toBe(30)
    })
  })

  describe('callbacks', () => {
    it('invokes onScroll for each processed scroll event', async () => {
      const onScroll = vi.fn()
      const ref = createRef<HTMLDivElement>()
      const metricsState = createMetricsState()

      render(
        <Harness
          elementRef={ref}
          metrics={metricsState}
          options={{ throttle: 0, onScroll }}
        />,
      )
      await flushMicrotasks()
      onScroll.mockClear()

      await act(async () => {
        metricsState.scrollLeft = 5
        ref.current?.dispatchEvent(new Event('scroll'))
      })

      expect(onScroll).toHaveBeenCalledTimes(1)
    })

    it('routes read failures through onError without crashing', async () => {
      const onError = vi.fn()
      const ref = createRef<HTMLDivElement>()

      render(
        <Harness
          elementRef={ref}
          options={{ onError }}
          metrics={createMetricsState()}
        />,
      )
      await flushMicrotasks()

      await act(async () => {
        Object.defineProperty(ref.current!, 'scrollLeft', {
          configurable: true,
          get: () => {
            throw new Error('read failed')
          },
        })
        ref.current?.dispatchEvent(new Event('scroll'))
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('measure', () => {
    it('keeps a stable identity and resets directions without callbacks', async () => {
      const onScroll = vi.fn()
      const onStop = vi.fn()
      const identities: Array<() => void> = []
      const ref = createRef<HTMLDivElement>()
      const metricsState = createMetricsState()

      function IdentityHarness(): ReactElement {
        const api = useScroll(ref, { throttle: 0, onScroll, onStop })
        identities.push(api.measure)

        return (
          <div
            ref={(node) => {
              ref.current = node
              if (node != null) {
                applyMetrics(node, metricsState)
              }
            }}
            data-testid="scroller"
            data-x={String(api.x)}
            data-dir-right={String(api.directions.right)}
          />
        )
      }

      const { rerender } = render(<IdentityHarness />)
      await flushMicrotasks()

      await act(async () => {
        metricsState.scrollLeft = 40
        ref.current?.dispatchEvent(new Event('scroll'))
      })
      expect(
        screen.getByTestId('scroller').getAttribute('data-dir-right'),
      ).toBe('true')

      onScroll.mockClear()
      onStop.mockClear()

      await act(async () => {
        identities[0]?.()
      })

      expect(screen.getByTestId('scroller').getAttribute('data-x')).toBe('40')
      expect(
        screen.getByTestId('scroller').getAttribute('data-dir-right'),
      ).toBe('false')
      expect(onScroll).not.toHaveBeenCalled()
      expect(onStop).not.toHaveBeenCalled()

      rerender(<IdentityHarness />)
      expect(identities[0]).toBe(identities[1])
    })
  })

  describe('imperative scrolling', () => {
    it('scrollTo, setX, and setY sync measurements with auto behavior', async () => {
      let api: UseScrollReturn | undefined
      const ref = createRef<HTMLDivElement>()
      const metricsState = createMetricsState()

      render(
        <Harness
          elementRef={ref}
          metrics={metricsState}
          options={{ behavior: 'auto', throttle: 0 }}
          onApi={(value) => {
            api = value
          }}
        />,
      )
      await flushMicrotasks()

      await act(async () => {
        api?.scrollTo({ x: 75, y: 90 })
      })
      expect(readScroller().x).toBe(75)
      expect(readScroller().y).toBe(90)
      expect(metricsState.scrollLeft).toBe(75)
      expect(metricsState.scrollTop).toBe(90)

      await act(async () => {
        api?.setX(120)
      })
      expect(readScroller().x).toBe(120)

      await act(async () => {
        api?.setY(150)
      })
      expect(readScroller().y).toBe(150)
    })
  })

  describe('enabled lifecycle', () => {
    it('preserves position when disabled and re-measures after re-enable', async () => {
      const ref = createRef<HTMLDivElement>()
      const metricsState = createMetricsState({
        scrollLeft: 55,
        scrollTop: 66,
      })

      const { rerender } = render(
        <Harness
          elementRef={ref}
          metrics={metricsState}
          options={{ enabled: true, throttle: 0 }}
        />,
      )
      await flushMicrotasks()
      expect(readScroller().x).toBe(55)
      expect(readScroller().y).toBe(66)

      rerender(
        <Harness
          elementRef={ref}
          metrics={metricsState}
          options={{ enabled: false, throttle: 0 }}
        />,
      )
      await flushMicrotasks()
      expect(readScroller().x).toBe(55)
      expect(readScroller().y).toBe(66)

      metricsState.scrollLeft = 200
      metricsState.scrollTop = 300
      await act(async () => {
        ref.current?.dispatchEvent(new Event('scroll'))
      })
      expect(readScroller().x).toBe(55)

      rerender(
        <Harness
          elementRef={ref}
          metrics={metricsState}
          options={{ enabled: true, throttle: 0 }}
        />,
      )
      await flushMicrotasks()
      expect(readScroller().x).toBe(200)
      expect(readScroller().y).toBe(300)
    })
  })

  describe('target replacement', () => {
    it('switches listeners and measurements to the new target', async () => {
      function DualHarness({ which }: { which: 'a' | 'b' }): ReactElement {
        const refA = useRef<HTMLDivElement>(null)
        const refB = useRef<HTMLDivElement>(null)
        const api = useScroll(which === 'a' ? refA : refB, { throttle: 0 })

        return (
          <>
            <div
              ref={(node) => {
                refA.current = node
                if (node != null) {
                  applyMetrics(
                    node,
                    createMetricsState({
                      scrollLeft: 10,
                      scrollTop: 20,
                    }),
                  )
                }
              }}
              data-testid="panel-a"
            />
            <div
              ref={(node) => {
                refB.current = node
                if (node != null) {
                  applyMetrics(
                    node,
                    createMetricsState({
                      scrollLeft: 300,
                      scrollTop: 400,
                    }),
                  )
                }
              }}
              data-testid="panel-b"
            />
            <div
              data-testid="value"
              data-x={String(api.x)}
              data-y={String(api.y)}
            />
          </>
        )
      }

      const { rerender } = render(<DualHarness which="a" />)
      await flushMicrotasks()
      expect(screen.getByTestId('value').getAttribute('data-x')).toBe('10')

      rerender(<DualHarness which="b" />)
      await flushMicrotasks()
      expect(screen.getByTestId('value').getAttribute('data-x')).toBe('300')
      expect(screen.getByTestId('value').getAttribute('data-y')).toBe('400')

      const metricsA = createMetricsState({
        scrollLeft: 999,
        scrollTop: 888,
      })
      await act(async () => {
        const panelA = screen.getByTestId('panel-a')
        applyMetrics(panelA, metricsA)
        panelA.dispatchEvent(new Event('scroll'))
      })
      expect(screen.getByTestId('value').getAttribute('data-x')).toBe('300')
    })
  })

  describe('mutation observation', () => {
    it('re-measures when observe is enabled and the target mutates', async () => {
      const observerInstances: Array<{
        callback: MutationCallback
        observe: ReturnType<typeof vi.fn>
        disconnect: ReturnType<typeof vi.fn>
      }> = []

      class TrackingMutationObserver {
        callback: MutationCallback
        observe = vi.fn()
        disconnect = vi.fn()

        constructor(callback: MutationCallback) {
          this.callback = callback
          observerInstances.push(this)
        }
      }

      vi.stubGlobal('MutationObserver', TrackingMutationObserver)

      const ref = createRef<HTMLDivElement>()
      const metricsState = createMetricsState()

      render(
        <Harness
          elementRef={ref}
          metrics={metricsState}
          options={{ observe: true, throttle: 0 }}
        />,
      )
      await flushMicrotasks()
      expect(observerInstances.length).toBeGreaterThan(0)

      metricsState.scrollHeight = 1500
      await act(async () => {
        observerInstances[0]?.callback([], {} as MutationObserver)
        await Promise.resolve()
      })

      expect(readScroller().arrivedState.bottom).toBe(false)
    })
  })

  describe('StrictMode', () => {
    it('leaves one active scroll listener under Strict Mode', async () => {
      const element = document.createElement('div')
      document.body.appendChild(element)
      applyMetrics(element, createMetricsState())
      const ref = { current: element }
      const addSpy = vi.spyOn(element, 'addEventListener')
      const removeSpy = vi.spyOn(element, 'removeEventListener')

      renderHook(() => useScroll(ref, { throttle: 0 }), {
        wrapper: StrictMode,
      })
      await flushMicrotasks()

      const scrollAdds = addSpy.mock.calls.filter(
        ([eventName]) => eventName === 'scroll',
      ).length
      const scrollRemoves = removeSpy.mock.calls.filter(
        ([eventName]) => eventName === 'scroll',
      ).length

      expect(scrollAdds - scrollRemoves).toBe(1)
      element.remove()
    })
  })

  describe('listener option changes', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('resets isScrolling without calling onStop when listener options change', async () => {
      const onStop = vi.fn()
      const ref = createRef<HTMLDivElement>()
      const metricsState = createMetricsState()

      const { rerender } = render(
        <Harness
          elementRef={ref}
          metrics={metricsState}
          options={{
            throttle: 0,
            idle: 500,
            onStop,
            eventListenerOptions: { capture: false, passive: true },
          }}
        />,
      )
      await flushMicrotasks()

      await act(async () => {
        metricsState.scrollLeft = 15
        ref.current?.dispatchEvent(new Event('scroll'))
      })
      expect(readScroller().isScrolling).toBe(true)

      rerender(
        <Harness
          elementRef={ref}
          metrics={metricsState}
          options={{
            throttle: 0,
            idle: 500,
            onStop,
            eventListenerOptions: { capture: true, passive: true },
          }}
        />,
      )
      await flushMicrotasks()

      expect(readScroller().isScrolling).toBe(false)
      expect(onStop).not.toHaveBeenCalled()
    })
  })

  describe('window target', () => {
    it('supports window targets using scrollingElement metrics', async () => {
      const fakeScroller = document.createElement('div')
      applyMetrics(
        fakeScroller,
        createMetricsState({
          scrollLeft: 120,
          scrollTop: 80,
        }),
      )

      Object.defineProperty(document, 'scrollingElement', {
        configurable: true,
        value: fakeScroller,
      })
      Object.defineProperty(window, 'scrollX', {
        configurable: true,
        value: 120,
      })
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: 80,
      })

      function WindowHarness(): ReactElement {
        const ref = useRef<Window | null>(window)
        const api = useScroll(ref, { throttle: 0 })
        return (
          <div
            data-testid="window-host"
            data-x={String(api.x)}
            data-y={String(api.y)}
          />
        )
      }

      render(<WindowHarness />)
      await flushMicrotasks()
      expect(screen.getByTestId('window-host').getAttribute('data-x')).toBe(
        '120',
      )
      expect(screen.getByTestId('window-host').getAttribute('data-y')).toBe(
        '80',
      )
    })
  })
})
