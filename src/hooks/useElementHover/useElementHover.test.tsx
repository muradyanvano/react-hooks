import { act, cleanup, render, screen } from '@testing-library/react'
import {
  StrictMode,
  createRef,
  useRef,
  type ReactElement,
  type RefObject,
} from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useElementHover, type UseElementHoverOptions } from './useElementHover'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function dispatchMouseBoundary(
  target: Element,
  type: 'mouseenter' | 'mouseleave',
): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: false,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
}

function Harness({
  options,
  elementRef,
}: {
  options?: UseElementHoverOptions
  elementRef?: RefObject<HTMLDivElement | null>
}): ReactElement {
  const localRef = useRef<HTMLDivElement>(null)
  const ref = elementRef ?? localRef
  const isHovered = useElementHover(ref, options)

  return (
    <div
      ref={ref}
      data-testid="target"
      data-hovered={isHovered ? 'true' : 'false'}
    >
      Target
    </div>
  )
}

function readHovered(): boolean {
  return screen.getByTestId('target').getAttribute('data-hovered') === 'true'
}

describe('useElementHover', () => {
  describe('initial behavior', () => {
    it('returns false initially and attaches native boundary listeners', () => {
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')

      render(<Harness />)

      expect(readHovered()).toBe(false)
      expect(addSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function))
      expect(addSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function))
    })
  })

  describe('immediate enter and leave', () => {
    it('sets true on mouseenter and false on mouseleave', () => {
      render(<Harness />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
      })
      expect(readHovered()).toBe(true)

      act(() => {
        dispatchMouseBoundary(target, 'mouseleave')
      })
      expect(readHovered()).toBe(false)
    })

    it('does not call preventDefault on handlers', () => {
      render(<Harness />)
      const target = screen.getByTestId('target')
      const event = dispatchMouseBoundary(target, 'mouseenter')
      expect(event.defaultPrevented).toBe(false)
    })

    it('keeps true on repeated enter and false on repeated leave', () => {
      render(<Harness />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
        dispatchMouseBoundary(target, 'mouseenter')
      })
      expect(readHovered()).toBe(true)

      act(() => {
        dispatchMouseBoundary(target, 'mouseleave')
        dispatchMouseBoundary(target, 'mouseleave')
      })
      expect(readHovered()).toBe(false)
    })
  })

  describe('nested content', () => {
    it('does not toggle when moving between descendants', () => {
      render(<NestedHarness />)

      const parent = screen.getByTestId('parent')
      const child = screen.getByTestId('child')

      act(() => {
        dispatchMouseBoundary(parent, 'mouseenter')
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('true')

      act(() => {
        dispatchMouseBoundary(child, 'mouseenter')
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('true')

      act(() => {
        dispatchMouseBoundary(child, 'mouseleave')
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('true')

      act(() => {
        dispatchMouseBoundary(parent, 'mouseleave')
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('false')
    })
  })

  describe('enter delay', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('waits for the configured delay before becoming true', () => {
      render(<Harness options={{ delayEnter: 200 }} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
      })
      expect(readHovered()).toBe(false)

      act(() => {
        vi.advanceTimersByTime(199)
      })
      expect(readHovered()).toBe(false)

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(readHovered()).toBe(true)
    })

    it.each([
      ['negative', -50],
      ['NaN', Number.NaN],
      ['positive infinity', Number.POSITIVE_INFINITY],
      ['negative infinity', Number.NEGATIVE_INFINITY],
    ])('normalizes invalid enter delay %s to zero', (_label, delayEnter) => {
      render(<Harness options={{ delayEnter }} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
      })
      expect(readHovered()).toBe(true)
    })

    it('accepts fractional finite delays', () => {
      render(<Harness options={{ delayEnter: 150.5 }} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
      })

      act(() => {
        vi.advanceTimersByTime(149)
      })
      expect(readHovered()).toBe(false)

      act(() => {
        vi.advanceTimersByTime(2)
      })
      expect(readHovered()).toBe(true)
    })

    it('snapshots delay at event time and does not reattach listeners on delay changes', () => {
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')
      const { rerender } = render(<Harness options={{ delayEnter: 300 }} />)
      const target = screen.getByTestId('target')
      const initialAddCalls = addSpy.mock.calls.filter(
        ([eventName]) => eventName === 'mouseenter',
      ).length

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
      })

      rerender(<Harness options={{ delayEnter: 50 }} />)

      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(readHovered()).toBe(true)

      const afterRerenderAddCalls = addSpy.mock.calls.filter(
        ([eventName]) => eventName === 'mouseenter',
      ).length
      expect(afterRerenderAddCalls).toBe(initialAddCalls)
    })
  })

  describe('leave delay', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('waits for the configured delay before becoming false', () => {
      render(<Harness options={{ delayLeave: 250 }} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
      })
      expect(readHovered()).toBe(true)

      act(() => {
        dispatchMouseBoundary(target, 'mouseleave')
      })
      expect(readHovered()).toBe(true)

      act(() => {
        vi.advanceTimersByTime(250)
      })
      expect(readHovered()).toBe(false)
    })

    it('uses the latest leave delay for the next leave event', () => {
      const { rerender } = render(<Harness options={{ delayLeave: 400 }} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
        dispatchMouseBoundary(target, 'mouseleave')
      })

      rerender(<Harness options={{ delayLeave: 100 }} />)

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
        dispatchMouseBoundary(target, 'mouseleave')
      })

      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(readHovered()).toBe(false)
    })
  })

  describe('cancellation behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('cancels delayed enter when leaving early', () => {
      render(<Harness options={{ delayEnter: 200, delayLeave: 0 }} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
        dispatchMouseBoundary(target, 'mouseleave')
      })

      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(readHovered()).toBe(false)
    })

    it('preserves true when re-entering before delayed leave completes', () => {
      render(<Harness options={{ delayLeave: 200 }} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
        dispatchMouseBoundary(target, 'mouseleave')
        dispatchMouseBoundary(target, 'mouseenter')
      })

      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(readHovered()).toBe(true)
    })

    it('ignores stale timer callbacks after cancellation', () => {
      render(<Harness options={{ delayEnter: 100 }} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
        dispatchMouseBoundary(target, 'mouseleave')
      })

      act(() => {
        vi.runAllTimers()
      })
      expect(readHovered()).toBe(false)
    })

    it('ends false after rapid enter, leave, enter, leave', () => {
      render(<Harness options={{ delayEnter: 50, delayLeave: 50 }} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
        dispatchMouseBoundary(target, 'mouseleave')
        dispatchMouseBoundary(target, 'mouseenter')
        dispatchMouseBoundary(target, 'mouseleave')
      })

      act(() => {
        vi.advanceTimersByTime(50)
      })
      expect(readHovered()).toBe(false)
    })
  })

  describe('enabled lifecycle', () => {
    it('registers no hover listeners when disabled and stays false', () => {
      render(<Harness options={{ enabled: false }} />)
      const target = screen.getByTestId('target')

      expect(readHovered()).toBe(false)

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
      })
      expect(readHovered()).toBe(false)
    })

    it('removes listeners and cancels pending transitions when disabled', () => {
      vi.useFakeTimers()
      const removeSpy = vi.spyOn(
        HTMLDivElement.prototype,
        'removeEventListener',
      )
      const { rerender } = render(<Harness options={{ delayEnter: 200 }} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
      })

      rerender(<Harness options={{ enabled: false, delayEnter: 200 }} />)
      expect(readHovered()).toBe(false)
      expect(removeSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function))

      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(readHovered()).toBe(false)
    })

    it('reattaches one listener pair when re-enabled and starts false', () => {
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')
      const { rerender } = render(<Harness options={{ enabled: false }} />)

      rerender(<Harness options={{ enabled: true }} />)

      const enterCalls = addSpy.mock.calls.filter(
        ([eventName]) => eventName === 'mouseenter',
      )
      expect(enterCalls.length).toBeGreaterThan(0)
      expect(readHovered()).toBe(false)
    })
  })

  describe('null target', () => {
    it('is safe when the ref is null', () => {
      function NullHarness(): ReactElement {
        const ref = useRef<HTMLDivElement | null>(null)
        const isHovered = useElementHover(ref)
        return <div data-testid="hover-value">{String(isHovered)}</div>
      }

      render(<NullHarness />)
      expect(screen.getByTestId('hover-value').textContent).toBe('false')
    })
  })

  describe('dynamic target replacement', () => {
    it('resets false and ignores old target events after replacement', () => {
      const { rerender } = render(<ReplacementHarness attachTo="a" />)

      act(() => {
        dispatchMouseBoundary(screen.getByTestId('target-a'), 'mouseenter')
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('true')

      act(() => {
        rerender(<ReplacementHarness attachTo="b" />)
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('false')

      vi.useFakeTimers()
      act(() => {
        dispatchMouseBoundary(screen.getByTestId('target-a'), 'mouseleave')
        vi.advanceTimersByTime(500)
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('false')

      act(() => {
        dispatchMouseBoundary(screen.getByTestId('target-b'), 'mouseenter')
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('true')
    })

    it('invalidates a delayed leave timer when the target is replaced', () => {
      vi.useFakeTimers()
      const { rerender } = render(<ReplacementHarness attachTo="a" />)

      act(() => {
        dispatchMouseBoundary(screen.getByTestId('target-a'), 'mouseenter')
        dispatchMouseBoundary(screen.getByTestId('target-a'), 'mouseleave')
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('true')

      act(() => {
        rerender(<ReplacementHarness attachTo="b" />)
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('false')

      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('false')

      act(() => {
        dispatchMouseBoundary(screen.getByTestId('target-b'), 'mouseenter')
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('true')
    })
  })

  describe('element removal', () => {
    it('does not create a MutationObserver when triggerOnRemoval is false', () => {
      const observerSpy = vi.spyOn(globalThis, 'MutationObserver')
      render(<Harness options={{ triggerOnRemoval: false }} />)
      expect(observerSpy).not.toHaveBeenCalled()
    })

    it('applies delayed leave after removal when triggerOnRemoval is true', async () => {
      vi.useFakeTimers()
      render(<RemovalHarness delayLeave={150} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('true')

      await act(async () => {
        screen.getByTestId('remove-target').click()
        await Promise.resolve()
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('true')

      act(() => {
        vi.advanceTimersByTime(150)
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('false')
    })

    it('does not schedule leave when already false on removal', () => {
      vi.useFakeTimers()
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
      render(<RemovalHarness delayLeave={150} />)

      act(() => {
        screen.getByTestId('remove-target').click()
      })

      expect(screen.getByTestId('hover-value').textContent).toBe('false')
      expect(setTimeoutSpy).not.toHaveBeenCalled()
    })

    it('cancels pending enter when the target is removed', async () => {
      vi.useFakeTimers()
      render(<RemovalHarness delayEnter={200} delayLeave={0} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('false')

      await act(async () => {
        screen.getByTestId('remove-target').click()
        await Promise.resolve()
      })

      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(screen.getByTestId('hover-value').textContent).toBe('false')
    })

    it('skips removal observation when MutationObserver is unavailable', () => {
      const view = document.defaultView
      expect(view).not.toBeNull()

      const original = view!.MutationObserver
      Object.defineProperty(view!, 'MutationObserver', {
        configurable: true,
        value: undefined,
      })

      try {
        render(<Harness options={{ triggerOnRemoval: true }} />)
        const target = screen.getByTestId('target')

        act(() => {
          dispatchMouseBoundary(target, 'mouseenter')
        })
        expect(readHovered()).toBe(true)
      } finally {
        Object.defineProperty(view!, 'MutationObserver', {
          configurable: true,
          value: original,
        })
      }
    })
  })

  describe('timer cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('creates and clears timers through the target owning window', () => {
      const iframe = document.createElement('iframe')
      document.body.appendChild(iframe)

      const doc = iframe.contentDocument
      const hostView = doc?.defaultView
      expect(doc).not.toBeNull()
      expect(hostView).not.toBeNull()

      const target = doc!.createElement('div')
      doc!.body.appendChild(target)

      const setSpy = vi.spyOn(hostView!, 'setTimeout')
      const clearSpy = vi.spyOn(hostView!, 'clearTimeout')

      function CustomDocumentHarness(): ReactElement {
        const ref = useRef<HTMLDivElement | null>(target)
        useElementHover(ref, { delayEnter: 100 })
        return <div data-testid="host-marker">host</div>
      }

      render(<CustomDocumentHarness />)

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
      })
      expect(setSpy).toHaveBeenCalled()

      act(() => {
        dispatchMouseBoundary(target, 'mouseleave')
      })
      expect(clearSpy).toHaveBeenCalled()

      document.body.removeChild(iframe)
    })

    it('does not update state after unmount', () => {
      const { unmount } = render(<Harness options={{ delayEnter: 100 }} />)
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
        unmount()
        vi.advanceTimersByTime(100)
      })

      expect(screen.queryByTestId('target')).toBeNull()
    })
  })

  describe('listener lifecycle', () => {
    it('removes the exact listener functions on unmount', () => {
      const removeSpy = vi.spyOn(
        HTMLDivElement.prototype,
        'removeEventListener',
      )
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')

      const { unmount } = render(<Harness />)

      const enterCall = addSpy.mock.calls.find(
        ([eventName]) => eventName === 'mouseenter',
      )
      const leaveCall = addSpy.mock.calls.find(
        ([eventName]) => eventName === 'mouseleave',
      )

      unmount()

      expect(removeSpy).toHaveBeenCalledWith('mouseenter', enterCall?.[1])
      expect(removeSpy).toHaveBeenCalledWith('mouseleave', leaveCall?.[1])
    })

    it('leaves one active listener pair under Strict Mode', () => {
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')
      const removeSpy = vi.spyOn(
        HTMLDivElement.prototype,
        'removeEventListener',
      )

      render(
        <StrictMode>
          <Harness />
        </StrictMode>,
      )

      const enterAdds = addSpy.mock.calls.filter(
        ([eventName]) => eventName === 'mouseenter',
      ).length
      const enterRemoves = removeSpy.mock.calls.filter(
        ([eventName]) => eventName === 'mouseenter',
      ).length

      expect(enterAdds - enterRemoves).toBe(1)
    })

    it('completes delayed enter after Strict Mode replay', () => {
      vi.useFakeTimers()
      render(
        <StrictMode>
          <Harness options={{ delayEnter: 100 }} />
        </StrictMode>,
      )
      const target = screen.getByTestId('target')

      act(() => {
        dispatchMouseBoundary(target, 'mouseenter')
      })
      expect(readHovered()).toBe(false)

      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(readHovered()).toBe(true)
    })
  })

  describe('SSR', () => {
    it('renders false on the server without listeners, timers, or observers', () => {
      const previousMO = globalThis.MutationObserver
      let mutationObserverCalls = 0

      class TrackingMutationObserver {
        constructor() {
          mutationObserverCalls += 1
        }

        observe() {}

        disconnect() {}
      }

      Object.defineProperty(globalThis, 'MutationObserver', {
        configurable: true,
        writable: true,
        value: TrackingMutationObserver,
      })

      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')

      function ServerHarness(): ReactElement {
        const ref = createRef<HTMLDivElement>()
        const isHovered = useElementHover(ref, { triggerOnRemoval: true })
        return <div data-hovered={String(isHovered)} />
      }

      const html = renderToString(<ServerHarness />)

      expect(html).toContain('data-hovered="false"')
      expect(addSpy).not.toHaveBeenCalled()
      expect(mutationObserverCalls).toBe(0)

      Object.defineProperty(globalThis, 'MutationObserver', {
        configurable: true,
        writable: true,
        value: previousMO,
      })
    })
  })
})

function NestedHarness(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const isHovered = useElementHover(ref)

  return (
    <div>
      <div ref={ref} data-testid="parent">
        <span data-testid="child">Child</span>
      </div>
      <div data-testid="hover-value">{String(isHovered)}</div>
    </div>
  )
}

function ReplacementHarness({
  attachTo,
}: {
  attachTo: 'a' | 'b'
}): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null)
  const isHovered = useElementHover(ref, { delayLeave: 500 })

  return (
    <div>
      <div ref={attachTo === 'a' ? ref : undefined} data-testid="target-a">
        a
      </div>
      <div ref={attachTo === 'b' ? ref : undefined} data-testid="target-b">
        b
      </div>
      <div data-testid="hover-value">{String(isHovered)}</div>
    </div>
  )
}

function RemovalHarness({
  delayLeave = 0,
  delayEnter = 0,
}: {
  delayLeave?: number
  delayEnter?: number
}): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null)
  const isHovered = useElementHover(ref, {
    triggerOnRemoval: true,
    delayLeave,
    delayEnter,
  })

  return (
    <div data-testid="removal-root">
      <div ref={ref} data-testid="target">
        Removable
      </div>
      <button
        type="button"
        data-testid="remove-target"
        onClick={() => {
          ref.current?.remove()
        }}
      >
        Remove
      </button>
      <div data-testid="hover-value">{String(isHovered)}</div>
    </div>
  )
}
