import { act, cleanup, render, screen } from '@testing-library/react'
import { createRef, useRef, type ReactElement, type RefObject } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useInfiniteScroll,
  type UseInfiniteScrollDirection,
  type UseInfiniteScrollOptions,
  type UseInfiniteScrollState,
} from './useInfiniteScroll'

afterEach(() => {
  cleanup()
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

async function flushFrames(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0)
    })
    await Promise.resolve()
  })
}

function applyMetrics(
  element: HTMLElement,
  metrics: {
    scrollTop?: number
    scrollLeft?: number
    scrollHeight?: number
    scrollWidth?: number
    clientHeight?: number
    clientWidth?: number
  },
): void {
  Object.defineProperties(element, {
    scrollTop: {
      configurable: true,
      get: () => metrics.scrollTop ?? 0,
      set: () => undefined,
    },
    scrollLeft: {
      configurable: true,
      get: () => metrics.scrollLeft ?? 0,
      set: () => undefined,
    },
    scrollHeight: {
      configurable: true,
      get: () => metrics.scrollHeight ?? 1000,
    },
    scrollWidth: {
      configurable: true,
      get: () => metrics.scrollWidth ?? 1000,
    },
    clientHeight: {
      configurable: true,
      get: () => metrics.clientHeight ?? 200,
    },
    clientWidth: {
      configurable: true,
      get: () => metrics.clientWidth ?? 200,
    },
  })
}

function Harness({
  options,
  onLoadMore,
  elementRef,
  metrics,
}: {
  options?: UseInfiniteScrollOptions
  onLoadMore?: (state: UseInfiniteScrollState) => void | Promise<void>
  elementRef?: RefObject<HTMLDivElement | null>
  metrics?: {
    scrollTop?: number
    scrollLeft?: number
    scrollHeight?: number
    scrollWidth?: number
    clientHeight?: number
    clientWidth?: number
  }
}): ReactElement {
  const localRef = useRef<HTMLDivElement>(null)
  const ref = elementRef ?? localRef
  const loader = onLoadMore ?? (() => undefined)
  const { isLoading, error, check, reset } = useInfiniteScroll(
    ref,
    loader,
    options,
  )

  return (
    <div>
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
        data-loading={isLoading ? 'true' : 'false'}
        data-error={error?.message ?? ''}
      />
      <button
        type="button"
        data-testid="check"
        onClick={() => {
          void check()
        }}
      >
        Check
      </button>
      <button type="button" data-testid="reset" onClick={reset}>
        Reset
      </button>
    </div>
  )
}

describe('useInfiniteScroll', () => {
  describe('edge detection', () => {
    it('loads at the bottom threshold and respects exact distance', async () => {
      const onLoadMore = vi.fn()
      render(
        <Harness
          onLoadMore={onLoadMore}
          options={{ distance: 10, direction: 'bottom' }}
          metrics={{
            scrollTop: 790,
            scrollHeight: 1000,
            clientHeight: 200,
          }}
        />,
      )

      await flushFrames()
      expect(onLoadMore).toHaveBeenCalledTimes(1)
      expect(onLoadMore.mock.calls[0]?.[0]).toMatchObject({
        direction: 'bottom',
        distanceToEdge: 10,
      })
    })

    it('does not load when farther than the threshold', async () => {
      const onLoadMore = vi.fn()
      render(
        <Harness
          onLoadMore={onLoadMore}
          options={{ distance: 10 }}
          metrics={{
            scrollTop: 0,
            scrollHeight: 1000,
            clientHeight: 200,
          }}
        />,
      )

      await flushFrames()
      expect(onLoadMore).not.toHaveBeenCalled()
    })

    it.each([
      ['top', { scrollTop: 5 }, 5],
      ['left', { scrollLeft: 4, scrollWidth: 800, clientWidth: 200 }, 4],
      [
        'right',
        {
          scrollLeft: 590,
          scrollWidth: 800,
          clientWidth: 200,
        },
        10,
      ],
    ] as const)(
      'loads for %s direction at the threshold',
      async (direction, partial, distanceToEdge) => {
        const onLoadMore = vi.fn()
        render(
          <Harness
            onLoadMore={onLoadMore}
            options={{
              direction: direction as UseInfiniteScrollDirection,
              distance: 10,
            }}
            metrics={{
              scrollTop: 0,
              scrollLeft: 0,
              scrollHeight: 1000,
              scrollWidth: 1000,
              clientHeight: 200,
              clientWidth: 200,
              ...partial,
            }}
          />,
        )

        await flushFrames()
        expect(onLoadMore).toHaveBeenCalledTimes(1)
        expect(onLoadMore.mock.calls[0]?.[0].distanceToEdge).toBe(
          distanceToEdge,
        )
      },
    )

    it('treats small negative remaining distance as reached', async () => {
      const onLoadMore = vi.fn()
      render(
        <Harness
          onLoadMore={onLoadMore}
          options={{ distance: 0 }}
          metrics={{
            scrollTop: 801,
            scrollHeight: 1000,
            clientHeight: 200,
          }}
        />,
      )

      await flushFrames()
      expect(onLoadMore).toHaveBeenCalledTimes(1)
    })
  })

  describe('loading', () => {
    it('sets isLoading around asynchronous loaders and clears errors', async () => {
      let resolveLoad!: () => void
      const onLoadMore = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveLoad = resolve
          }),
      )

      render(
        <Harness
          onLoadMore={onLoadMore}
          options={{ distance: 1000 }}
          metrics={{ scrollTop: 0, scrollHeight: 100, clientHeight: 100 }}
        />,
      )

      await flushFrames()
      expect(screen.getByTestId('scroller').getAttribute('data-loading')).toBe(
        'true',
      )

      await act(async () => {
        resolveLoad()
        await Promise.resolve()
      })
      await flushFrames()
      expect(screen.getByTestId('scroller').getAttribute('data-loading')).toBe(
        'false',
      )
    })

    it('does not start concurrent duplicate loads', async () => {
      let resolveLoad!: () => void
      const onLoadMore = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveLoad = resolve
          }),
      )
      const ref = createRef<HTMLDivElement>()

      render(
        <Harness
          elementRef={ref}
          onLoadMore={onLoadMore}
          options={{ distance: 1000 }}
          metrics={{ scrollTop: 0, scrollHeight: 50, clientHeight: 50 }}
        />,
      )
      await flushFrames()
      expect(onLoadMore).toHaveBeenCalledTimes(1)

      await act(async () => {
        ref.current?.dispatchEvent(new Event('scroll'))
        await Promise.resolve()
      })
      await flushFrames()
      expect(onLoadMore).toHaveBeenCalledTimes(1)

      await act(async () => {
        resolveLoad()
        await Promise.resolve()
      })
    })

    it('normalizes rejection values into error without unhandled rejections', async () => {
      const onLoadMore = vi.fn(async () => {
        throw 'nope'
      })

      render(
        <Harness
          onLoadMore={onLoadMore}
          options={{ distance: 1000 }}
          metrics={{ scrollTop: 0, scrollHeight: 40, clientHeight: 40 }}
        />,
      )

      await flushFrames()
      expect(screen.getByTestId('scroller').getAttribute('data-error')).toBe(
        'nope',
      )
      expect(screen.getByTestId('scroller').getAttribute('data-loading')).toBe(
        'false',
      )
    })

    it('joins an in-flight request from check()', async () => {
      let resolveLoad!: () => void
      const onLoadMore = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveLoad = resolve
          }),
      )

      render(
        <Harness
          onLoadMore={onLoadMore}
          options={{ distance: 1000 }}
          metrics={{ scrollTop: 0, scrollHeight: 40, clientHeight: 40 }}
        />,
      )
      await flushFrames()

      await act(async () => {
        screen.getByTestId('check').click()
        screen.getByTestId('check').click()
      })
      expect(onLoadMore).toHaveBeenCalledTimes(1)

      await act(async () => {
        resolveLoad()
        await Promise.resolve()
      })
    })
  })

  describe('canLoadMore and controls', () => {
    it('skips the loader when canLoadMore returns false', async () => {
      const onLoadMore = vi.fn()
      render(
        <Harness
          onLoadMore={onLoadMore}
          options={{
            distance: 1000,
            canLoadMore: () => false,
          }}
          metrics={{ scrollTop: 0, scrollHeight: 40, clientHeight: 40 }}
        />,
      )
      await flushFrames()
      expect(onLoadMore).not.toHaveBeenCalled()
    })

    it('stores canLoadMore thrown errors without calling onLoadMore', async () => {
      const onLoadMore = vi.fn()
      render(
        <Harness
          onLoadMore={onLoadMore}
          options={{
            distance: 1000,
            canLoadMore: () => {
              throw new Error('predicate failed')
            },
          }}
          metrics={{ scrollTop: 0, scrollHeight: 40, clientHeight: 40 }}
        />,
      )
      await flushFrames()
      expect(onLoadMore).not.toHaveBeenCalled()
      expect(screen.getByTestId('scroller').getAttribute('data-error')).toBe(
        'predicate failed',
      )
    })

    it('exposes stable check and reset identities', () => {
      const identities: Array<{ check: unknown; reset: unknown }> = []

      function IdentityHarness(): ReactElement {
        const ref = useRef<HTMLDivElement>(null)
        const api = useInfiniteScroll(ref, () => undefined)
        identities.push({ check: api.check, reset: api.reset })
        return <div ref={ref} />
      }

      const { rerender } = render(<IdentityHarness />)
      rerender(<IdentityHarness />)
      expect(identities[0]?.check).toBe(identities[1]?.check)
      expect(identities[0]?.reset).toBe(identities[1]?.reset)
    })

    it('reset clears errors and re-arms loading', async () => {
      const onLoadMore = vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(undefined)

      render(
        <Harness
          onLoadMore={onLoadMore}
          options={{ distance: 1000 }}
          metrics={{ scrollTop: 0, scrollHeight: 40, clientHeight: 40 }}
        />,
      )
      await flushFrames()
      expect(screen.getByTestId('scroller').getAttribute('data-error')).toBe(
        'boom',
      )

      await act(async () => {
        screen.getByTestId('reset').click()
      })
      await flushFrames()
      expect(screen.getByTestId('scroller').getAttribute('data-error')).toBe('')
      expect(onLoadMore).toHaveBeenCalledTimes(2)
    })
  })

  describe('automatic filling and no-progress', () => {
    it('chains loads while geometry progresses and stops without progress', async () => {
      const heightRef = { current: 100 }
      const onLoadMore = vi.fn(async () => {
        if (heightRef.current < 300) {
          heightRef.current += 100
        }
      })
      const ref = createRef<HTMLDivElement>()

      function GrowingHarness(): ReactElement {
        const { isLoading } = useInfiniteScroll(ref, onLoadMore, {
          distance: 1000,
        })
        return (
          <div
            ref={(node) => {
              ref.current = node
              if (node != null) {
                Object.defineProperties(node, {
                  scrollTop: {
                    configurable: true,
                    get: () => 0,
                    set: () => undefined,
                  },
                  scrollLeft: {
                    configurable: true,
                    get: () => 0,
                    set: () => undefined,
                  },
                  scrollHeight: {
                    configurable: true,
                    get: () => heightRef.current,
                  },
                  scrollWidth: {
                    configurable: true,
                    get: () => 1000,
                  },
                  clientHeight: {
                    configurable: true,
                    get: () => 200,
                  },
                  clientWidth: {
                    configurable: true,
                    get: () => 200,
                  },
                })
              }
            }}
            data-testid="scroller"
            data-loading={String(isLoading)}
          />
        )
      }

      render(<GrowingHarness />)
      await flushFrames()
      await flushFrames()
      await flushFrames()
      expect(onLoadMore.mock.calls.length).toBeGreaterThanOrEqual(2)
      const callsAfterFill = onLoadMore.mock.calls.length
      await flushFrames()
      await flushFrames()
      expect(onLoadMore.mock.calls.length).toBe(callsAfterFill)
    })
  })

  describe('enabled and target lifecycle', () => {
    it('does not load while disabled and loads after re-enable', async () => {
      const onLoadMore = vi.fn()
      const { rerender } = render(
        <Harness
          onLoadMore={onLoadMore}
          options={{ enabled: false, distance: 1000 }}
          metrics={{ scrollTop: 0, scrollHeight: 40, clientHeight: 40 }}
        />,
      )
      await flushFrames()
      expect(onLoadMore).not.toHaveBeenCalled()

      rerender(
        <Harness
          onLoadMore={onLoadMore}
          options={{ enabled: true, distance: 1000 }}
          metrics={{ scrollTop: 0, scrollHeight: 40, clientHeight: 40 }}
        />,
      )
      await flushFrames()
      expect(onLoadMore).toHaveBeenCalledTimes(1)
    })

    it('ignores stale resolutions after unmount', async () => {
      let resolveLoad!: () => void
      const onLoadMore = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveLoad = resolve
          }),
      )
      const { unmount } = render(
        <Harness
          onLoadMore={onLoadMore}
          options={{ distance: 1000 }}
          metrics={{ scrollTop: 0, scrollHeight: 40, clientHeight: 40 }}
        />,
      )
      await flushFrames()
      unmount()
      await act(async () => {
        resolveLoad()
        await Promise.resolve()
      })
    })

    it('attaches a passive scroll listener and removes it on disable', async () => {
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')
      const removeSpy = vi.spyOn(
        HTMLDivElement.prototype,
        'removeEventListener',
      )
      const { rerender } = render(
        <Harness
          options={{ enabled: true, distance: 0 }}
          metrics={{ scrollTop: 0, scrollHeight: 500, clientHeight: 100 }}
        />,
      )

      expect(
        addSpy.mock.calls.some(
          ([name, , options]) =>
            name === 'scroll' &&
            typeof options === 'object' &&
            options != null &&
            'passive' in options &&
            (options as AddEventListenerOptions).passive === true,
        ),
      ).toBe(true)

      rerender(
        <Harness
          options={{ enabled: false, distance: 0 }}
          metrics={{ scrollTop: 0, scrollHeight: 500, clientHeight: 100 }}
        />,
      )

      expect(removeSpy.mock.calls.some(([name]) => name === 'scroll')).toBe(
        true,
      )
    })

    it('does not churn listeners for a new options object with the same values', async () => {
      const ref = createRef<HTMLDivElement>()
      const { rerender } = render(
        <Harness
          elementRef={ref}
          options={{ enabled: true, distance: 8, direction: 'bottom' }}
          metrics={{ scrollTop: 0, scrollHeight: 500, clientHeight: 100 }}
        />,
      )
      const target = screen.getByTestId('scroller')
      const addSpy = vi.spyOn(target, 'addEventListener')
      const removeSpy = vi.spyOn(target, 'removeEventListener')

      rerender(
        <Harness
          elementRef={ref}
          options={{ enabled: true, distance: 8, direction: 'bottom' }}
          metrics={{ scrollTop: 0, scrollHeight: 500, clientHeight: 100 }}
        />,
      )

      expect(
        addSpy.mock.calls.filter(([name]) => name === 'scroll'),
      ).toHaveLength(0)
      expect(
        removeSpy.mock.calls.filter(([name]) => name === 'scroll'),
      ).toHaveLength(0)
    })
  })

  describe('window and document targets', () => {
    it('supports window targets using scrollingElement metrics', async () => {
      const onLoadMore = vi.fn()
      const fakeScroller = document.createElement('div')
      applyMetrics(fakeScroller, {
        scrollTop: 900,
        scrollHeight: 1000,
        clientHeight: 100,
      })
      Object.defineProperty(document, 'scrollingElement', {
        configurable: true,
        value: fakeScroller,
      })

      function WindowHarness(): ReactElement {
        const ref = useRef<Window | null>(window)
        useInfiniteScroll(ref, onLoadMore, { distance: 50 })
        return <div data-testid="window-host" />
      }

      render(<WindowHarness />)
      await flushFrames()
      expect(onLoadMore).toHaveBeenCalled()
    })
  })

  describe('SSR', () => {
    it('renders idle state without listeners or frames', () => {
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame')

      function ServerHarness(): ReactElement {
        const ref = createRef<HTMLDivElement>()
        const { isLoading, error, check, reset } = useInfiniteScroll(
          ref,
          () => {
            throw new Error('should not run')
          },
        )
        void check
        void reset
        return (
          <div
            data-loading={String(isLoading)}
            data-error={error == null ? 'none' : 'err'}
          />
        )
      }

      const html = renderToString(<ServerHarness />)
      expect(html).toContain('data-loading="false"')
      expect(html).toContain('data-error="none"')
      expect(addSpy).not.toHaveBeenCalled()
      expect(rafSpy).not.toHaveBeenCalled()
    })
  })

  describe('dynamic target', () => {
    it('stops loading from the previous target after replacement', async () => {
      const onLoadMore = vi.fn()

      function DualHarness({ which }: { which: 'a' | 'b' }): ReactElement {
        const refA = useRef<HTMLDivElement>(null)
        const refB = useRef<HTMLDivElement>(null)
        useInfiniteScroll(which === 'a' ? refA : refB, onLoadMore, {
          distance: 1000,
        })

        return (
          <>
            <div
              ref={(node) => {
                refA.current = node
                if (node != null) {
                  applyMetrics(node, {
                    scrollTop: 0,
                    scrollHeight: 40,
                    clientHeight: 40,
                  })
                }
              }}
              data-testid="panel-a"
            />
            <div
              ref={(node) => {
                refB.current = node
                if (node != null) {
                  applyMetrics(node, {
                    scrollTop: 0,
                    scrollHeight: 500,
                    clientHeight: 40,
                  })
                }
              }}
              data-testid="panel-b"
            />
          </>
        )
      }

      const { rerender } = render(<DualHarness which="a" />)
      await flushFrames()
      const firstCalls = onLoadMore.mock.calls.length
      expect(firstCalls).toBeGreaterThanOrEqual(1)

      rerender(<DualHarness which="b" />)
      await flushFrames()
      const afterSwitch = onLoadMore.mock.calls.length

      await act(async () => {
        screen.getByTestId('panel-a').dispatchEvent(new Event('scroll'))
      })
      await flushFrames()
      expect(onLoadMore.mock.calls.length).toBe(afterSwitch)
    })
  })
})
