import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  StrictMode,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest'

import {
  useOnClickOutside,
  type UseOnClickOutsideHandler,
  type UseOnClickOutsideOptions,
} from './useOnClickOutside'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Harness({
  handler,
  options,
  elementRef,
}: {
  handler: UseOnClickOutsideHandler
  options?: UseOnClickOutsideOptions
  elementRef?: RefObject<HTMLDivElement | null>
}): ReactElement {
  const localRef = useRef<HTMLDivElement>(null)
  const ref = elementRef ?? localRef

  useOnClickOutside(ref, handler, options)

  return (
    <div>
      <div ref={ref} data-testid="inside">
        Inside
        <button type="button" data-testid="descendant">
          Descendant
        </button>
      </div>
      <button type="button" data-testid="outside">
        Outside
      </button>
    </div>
  )
}

function EnabledToggleHarness({
  handler,
}: {
  handler: UseOnClickOutsideHandler
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)

  useOnClickOutside(ref, handler, { enabled })

  return (
    <div>
      <div ref={ref} data-testid="inside">
        Inside
      </div>
      <button type="button" data-testid="outside">
        Outside
      </button>
      <button
        type="button"
        data-testid="toggle-enabled"
        onClick={() => {
          setEnabled((value) => !value)
        }}
      >
        Toggle enabled
      </button>
    </div>
  )
}

function EventTypeHarness({
  handler,
  eventType,
}: {
  handler: UseOnClickOutsideHandler
  eventType: 'pointerdown' | 'click'
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useOnClickOutside(ref, handler, { eventType })

  return (
    <div>
      <div ref={ref} data-testid="inside">
        Inside
      </div>
      <button type="button" data-testid="outside">
        Outside
      </button>
    </div>
  )
}

function CaptureHarness({
  handler,
  capture,
}: {
  handler: UseOnClickOutsideHandler
  capture: boolean
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useOnClickOutside(ref, handler, { capture })

  return (
    <div>
      <div ref={ref} data-testid="inside">
        Inside
      </div>
      <button type="button" data-testid="outside">
        Outside
      </button>
    </div>
  )
}

function LatestRefHarness({
  handler,
  attachTo,
}: {
  handler: UseOnClickOutsideHandler
  attachTo: 'a' | 'b'
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useOnClickOutside(ref, handler)

  return (
    <div>
      <div ref={attachTo === 'a' ? ref : undefined} data-testid="target-a">
        A
      </div>
      <div ref={attachTo === 'b' ? ref : undefined} data-testid="target-b">
        B
      </div>
      <button type="button" data-testid="outside">
        Outside
      </button>
    </div>
  )
}

function NullableRefHarness({
  handler,
  attached,
}: {
  handler: UseOnClickOutsideHandler
  attached: boolean
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useOnClickOutside(ref, handler)

  return (
    <div>
      {attached ? (
        <div ref={ref} data-testid="inside">
          Inside
        </div>
      ) : (
        <div data-testid="placeholder">Placeholder</div>
      )}
      <button type="button" data-testid="outside">
        Outside
      </button>
    </div>
  )
}

function getDocumentListeners(
  spy: MockInstance<typeof document.addEventListener>,
  type: string,
) {
  return spy.mock.calls.filter((call) => call[0] === type)
}

describe('useOnClickOutside', () => {
  // -----------------------------------------------------------------------------
  // Outside and inside events
  // -----------------------------------------------------------------------------

  it('calls the handler for an outside pointerdown', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    fireEvent.pointerDown(screen.getByTestId('outside'))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not call the handler for a pointerdown on the referenced element', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    fireEvent.pointerDown(screen.getByTestId('inside'))

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not call the handler for a descendant of the referenced element', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    fireEvent.pointerDown(screen.getByTestId('descendant'))

    expect(handler).not.toHaveBeenCalled()
  })

  it('passes the original PointerEvent to the handler', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    fireEvent.pointerDown(screen.getByTestId('outside'))

    expect(handler).toHaveBeenCalledTimes(1)
    const event = handler.mock.calls[0]?.[0]
    expect(event).toBeInstanceOf(PointerEvent)
    expect(event.type).toBe('pointerdown')
  })

  // -----------------------------------------------------------------------------
  // Event type defaults and configuration
  // -----------------------------------------------------------------------------

  it('listens to pointerdown by default', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    expect(getDocumentListeners(addSpy, 'pointerdown').length).toBeGreaterThan(
      0,
    )
    expect(getDocumentListeners(addSpy, 'click')).toHaveLength(0)

    fireEvent.pointerDown(screen.getByTestId('outside'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('supports eventType: "click"', () => {
    const handler = vi.fn()
    render(<EventTypeHarness handler={handler} eventType="click" />)

    fireEvent.click(screen.getByTestId('outside'))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(MouseEvent)
    expect(handler.mock.calls[0]?.[0].type).toBe('click')
  })

  it('does not react to pointerdown when configured for click', () => {
    const handler = vi.fn()
    render(<EventTypeHarness handler={handler} eventType="click" />)

    fireEvent.pointerDown(screen.getByTestId('outside'))

    expect(handler).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------------
  // Enabled option
  // -----------------------------------------------------------------------------

  it('does nothing when disabled', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ enabled: false }} />)

    fireEvent.pointerDown(screen.getByTestId('outside'))

    expect(handler).not.toHaveBeenCalled()
  })

  it('starts listening when enabled changes from false to true', () => {
    const handler = vi.fn()
    render(<EnabledToggleHarness handler={handler} />)

    fireEvent.pointerDown(screen.getByTestId('outside'))
    expect(handler).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('toggle-enabled'))
    fireEvent.pointerDown(screen.getByTestId('outside'))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('stops listening when enabled changes from true to false', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <Harness handler={handler} options={{ enabled: true }} />,
    )

    fireEvent.pointerDown(screen.getByTestId('outside'))
    expect(handler).toHaveBeenCalledTimes(1)

    rerender(<Harness handler={handler} options={{ enabled: false }} />)
    fireEvent.pointerDown(screen.getByTestId('outside'))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // Latest handler and listener stability
  // -----------------------------------------------------------------------------

  it('uses the latest handler after rerender', () => {
    const firstHandler = vi.fn()
    const secondHandler = vi.fn()
    const { rerender } = render(<Harness handler={firstHandler} />)

    rerender(<Harness handler={secondHandler} />)
    fireEvent.pointerDown(screen.getByTestId('outside'))

    expect(firstHandler).not.toHaveBeenCalled()
    expect(secondHandler).toHaveBeenCalledTimes(1)
  })

  it('does not re-register the listener only because the handler identity changes', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const firstHandler = vi.fn()
    const secondHandler = vi.fn()

    const { rerender } = render(<Harness handler={firstHandler} />)
    const addsAfterMount = getDocumentListeners(addSpy, 'pointerdown').length
    const removesAfterMount = removeSpy.mock.calls.filter(
      (call) => call[0] === 'pointerdown',
    ).length

    rerender(<Harness handler={secondHandler} />)

    expect(getDocumentListeners(addSpy, 'pointerdown')).toHaveLength(
      addsAfterMount,
    )
    expect(
      removeSpy.mock.calls.filter((call) => call[0] === 'pointerdown'),
    ).toHaveLength(removesAfterMount)
  })

  // -----------------------------------------------------------------------------
  // Ref timing and null safety
  // -----------------------------------------------------------------------------

  it('uses the latest ref.current when the event occurs', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <LatestRefHarness handler={handler} attachTo="a" />,
    )

    fireEvent.pointerDown(screen.getByTestId('target-a'))
    expect(handler).not.toHaveBeenCalled()

    rerender(<LatestRefHarness handler={handler} attachTo="b" />)

    fireEvent.pointerDown(screen.getByTestId('target-a'))
    expect(handler).toHaveBeenCalledTimes(1)

    fireEvent.pointerDown(screen.getByTestId('target-b'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('handles an initially null ref safely', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <NullableRefHarness handler={handler} attached={false} />,
    )

    fireEvent.pointerDown(screen.getByTestId('outside'))
    expect(handler).not.toHaveBeenCalled()

    rerender(<NullableRefHarness handler={handler} attached />)

    fireEvent.pointerDown(screen.getByTestId('outside'))
    expect(handler).toHaveBeenCalledTimes(1)

    fireEvent.pointerDown(screen.getByTestId('inside'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // Invalid / disconnected targets
  // -----------------------------------------------------------------------------

  it('ignores disconnected event targets', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(document, 'addEventListener')
    render(<Harness handler={handler} />)

    const listener = getDocumentListeners(addSpy, 'pointerdown').at(-1)?.[1]
    expect(listener).toBeTypeOf('function')

    const detached = document.createElement('div')
    expect(detached.isConnected).toBe(false)

    const event = new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
    })
    Object.defineProperty(event, 'target', { value: detached })
    Object.defineProperty(event, 'composedPath', {
      value: () => [detached],
    })

    ;(listener as EventListener)(event)

    expect(handler).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------------
  // Lifecycle, option changes, StrictMode
  // -----------------------------------------------------------------------------

  it('cleans up the listener on unmount', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const { unmount } = render(<Harness handler={handler} />)

    const added = getDocumentListeners(addSpy, 'pointerdown').at(-1)
    expect(added).toBeDefined()

    unmount()

    const removed = removeSpy.mock.calls.filter(
      (call) => call[0] === 'pointerdown' && call[1] === added?.[1],
    )
    expect(removed.length).toBeGreaterThan(0)

    fireEvent.pointerDown(document.body)
    expect(handler).not.toHaveBeenCalled()
  })

  it('changes listeners correctly when eventType changes', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <EventTypeHarness handler={handler} eventType="pointerdown" />,
    )

    fireEvent.pointerDown(screen.getByTestId('outside'))
    expect(handler).toHaveBeenCalledTimes(1)

    rerender(<EventTypeHarness handler={handler} eventType="click" />)

    fireEvent.pointerDown(screen.getByTestId('outside'))
    expect(handler).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('outside'))
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('changes capture behavior correctly when capture changes', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    const { rerender } = render(<CaptureHarness handler={handler} capture />)

    const initial = getDocumentListeners(addSpy, 'pointerdown').at(-1)
    expect(initial?.[2]).toBe(true)

    rerender(<CaptureHarness handler={handler} capture={false} />)

    expect(
      removeSpy.mock.calls.some(
        (call) =>
          call[0] === 'pointerdown' &&
          call[1] === initial?.[1] &&
          call[2] === true,
      ),
    ).toBe(true)

    const next = getDocumentListeners(addSpy, 'pointerdown').at(-1)
    expect(next?.[2]).toBe(false)
    expect(next?.[1]).not.toBe(initial?.[1])
  })

  it('does not leave duplicate listeners in React StrictMode', () => {
    const handler = vi.fn()
    const listeners = new Set<EventListenerOrEventListenerObject>()

    const originalAdd = document.addEventListener.bind(document)
    const originalRemove = document.removeEventListener.bind(document)

    vi.spyOn(document, 'addEventListener').mockImplementation(
      (type, listener, options) => {
        if (type === 'pointerdown' && listener != null) {
          listeners.add(listener)
        }
        return originalAdd(type, listener, options)
      },
    )
    vi.spyOn(document, 'removeEventListener').mockImplementation(
      (type, listener, options) => {
        if (type === 'pointerdown' && listener != null) {
          listeners.delete(listener)
        }
        return originalRemove(type, listener, options)
      },
    )

    render(
      <StrictMode>
        <Harness handler={handler} />
      </StrictMode>,
    )

    expect(listeners.size).toBe(1)

    fireEvent.pointerDown(screen.getByTestId('outside'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not invoke the handler after unmount', () => {
    const handler = vi.fn()
    const { unmount } = render(<Harness handler={handler} />)

    unmount()
    fireEvent.pointerDown(document.body)

    expect(handler).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------------
  // SSR / import safety
  // -----------------------------------------------------------------------------

  it('imports without requiring document at module evaluation time', async () => {
    await expect(import('../../index')).resolves.toMatchObject({
      useOnClickOutside: expect.any(Function),
    })
  })

  it('server-renders a component that calls the hook without throwing', () => {
    function ServerComponent(): ReactElement {
      const ref = useRef<HTMLDivElement>(null)
      useOnClickOutside(ref, () => {
        // no-op
      })
      return <div ref={ref}>menu</div>
    }

    expect(() => renderToString(<ServerComponent />)).not.toThrow()
    expect(renderToString(<ServerComponent />)).toContain('menu')
  })

  it('does not register document listeners during server rendering', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')

    function ServerComponent(): ReactElement {
      const ref = useRef<HTMLDivElement>(null)
      useOnClickOutside(ref, () => {
        // no-op
      })
      return <div ref={ref}>menu</div>
    }

    addSpy.mockClear()
    renderToString(<ServerComponent />)

    expect(getDocumentListeners(addSpy, 'pointerdown')).toHaveLength(0)
    expect(getDocumentListeners(addSpy, 'click')).toHaveLength(0)
  })
})
