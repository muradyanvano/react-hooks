import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  StrictMode,
  createRef,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react'
import { renderToString } from 'react-dom/server'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'

import {
  useOnLongPress,
  type UseOnLongPressHandler,
  type UseOnLongPressOptions,
  type UseOnLongPressReleaseHandler,
} from './useOnLongPress'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function dispatchPointer(
  target: EventTarget,
  type: 'pointerdown' | 'pointerup' | 'pointermove' | 'pointercancel',
  init: PointerEventInit & {
    pointerId?: number
    clientX?: number
    clientY?: number
    button?: number
    pointerType?: string
  } = {},
): PointerEvent {
  const pointerId = init.pointerId ?? 1
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    button: init.button ?? 0,
    pointerType: init.pointerType ?? 'mouse',
    ...init,
  })

  Object.defineProperty(event, 'pointerId', {
    configurable: true,
    value: pointerId,
  })

  target.dispatchEvent(event)
  return event
}

function Harness({
  handler,
  options,
  elementRef,
}: {
  handler: UseOnLongPressHandler
  options?: UseOnLongPressOptions
  elementRef?: RefObject<HTMLDivElement | null>
}): ReactElement {
  const localRef = useRef<HTMLDivElement>(null)
  const ref = elementRef ?? localRef

  useOnLongPress(ref, handler, options)

  return (
    <div>
      <div ref={ref} data-testid="target">
        Target
        <button type="button" data-testid="descendant">
          Descendant
        </button>
      </div>
    </div>
  )
}

function EnabledToggleHarness({
  handler,
  onRelease,
  initialEnabled = false,
}: {
  handler: UseOnLongPressHandler
  onRelease?: UseOnLongPressReleaseHandler<HTMLDivElement>
  initialEnabled?: boolean
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(initialEnabled)

  useOnLongPress(ref, handler, onRelease ? { enabled, onRelease } : { enabled })

  return (
    <div>
      <div ref={ref} data-testid="target">
        Target
      </div>
      <button
        type="button"
        data-testid="toggle-enabled"
        onClick={() => {
          setEnabled((value) => !value)
        }}
      >
        Toggle
      </button>
    </div>
  )
}

function CaptureHarness({
  handler,
  capture,
}: {
  handler: UseOnLongPressHandler
  capture: boolean
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useOnLongPress(ref, handler, { capture })

  return (
    <div ref={ref} data-testid="target">
      Target
    </div>
  )
}

function SwitchTargetHarness({
  handler,
  onRelease,
  attachTo,
}: {
  handler: UseOnLongPressHandler
  onRelease?: UseOnLongPressReleaseHandler<HTMLDivElement>
  attachTo: 'a' | 'b'
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useOnLongPress(ref, handler, onRelease ? { onRelease } : undefined)

  return (
    <div>
      <div ref={attachTo === 'a' ? ref : undefined} data-testid="target-a">
        A
      </div>
      <div ref={attachTo === 'b' ? ref : undefined} data-testid="target-b">
        B
      </div>
    </div>
  )
}

function NullableRefHarness({
  handler,
  onRelease,
  attached,
}: {
  handler: UseOnLongPressHandler
  onRelease?: UseOnLongPressReleaseHandler<HTMLDivElement>
  attached: boolean
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useOnLongPress(ref, handler, onRelease ? { onRelease } : undefined)

  return (
    <div>
      {attached ? (
        <div ref={ref} data-testid="target">
          Target
        </div>
      ) : (
        <div data-testid="placeholder">Placeholder</div>
      )}
    </div>
  )
}

function LatestValuesHarness({
  handlers,
  onReleases,
  delays,
  buttons,
}: {
  handlers: UseOnLongPressHandler[]
  onReleases?: UseOnLongPressReleaseHandler<HTMLDivElement>[]
  delays?: UseOnLongPressOptions['delay'][]
  buttons?: number[]
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  useOnLongPress(ref, handlers[index]!, {
    ...(delays?.[index] !== undefined ? { delay: delays[index] } : {}),
    ...(buttons?.[index] !== undefined ? { button: buttons[index] } : {}),
    ...(onReleases?.[index] !== undefined
      ? { onRelease: onReleases[index] }
      : {}),
  })

  return (
    <div>
      <div ref={ref} data-testid="target">
        Target
      </div>
      <button
        type="button"
        data-testid="advance"
        onClick={() => {
          setIndex((value) => Math.min(value + 1, handlers.length - 1))
        }}
      >
        Advance
      </button>
    </div>
  )
}

function getDocumentListeners(
  spy: MockInstance<Document['addEventListener']>,
  type: string,
) {
  return spy.mock.calls.filter((call) => call[0] === type)
}

function pressTarget(
  target: Element = screen.getByTestId('target'),
  init: Parameters<typeof dispatchPointer>[2] = {},
) {
  return dispatchPointer(target, 'pointerdown', init)
}

function releasePointer(
  target: Element | Document = document,
  init: Parameters<typeof dispatchPointer>[2] = {},
) {
  return dispatchPointer(target, 'pointerup', init)
}

function movePointer(
  target: Element | Document = document,
  init: Parameters<typeof dispatchPointer>[2] = {},
) {
  return dispatchPointer(target, 'pointermove', init)
}

function cancelPointer(
  target: Element | Document = document,
  init: Parameters<typeof dispatchPointer>[2] = {},
) {
  return dispatchPointer(target, 'pointercancel', init)
}

describe('useOnLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  // -----------------------------------------------------------------------------
  // Basic activation
  // -----------------------------------------------------------------------------

  it('fires the handler after the default delay', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not fire the handler before the default delay elapses', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(499)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not fire the handler on a short tap', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(200)
    })
    releasePointer()

    expect(handler).not.toHaveBeenCalled()
  })

  it('passes the original pointerdown event to the handler', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    const downEvent = pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]?.[0]).toBe(downEvent)
    expect(handler.mock.calls[0]?.[0].type).toBe('pointerdown')
  })

  it('keeps the handler from firing again until pointerup after activation', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('registers a pointerdown listener on the target element', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(HTMLElement.prototype, 'addEventListener')
    render(<Harness handler={handler} />)
    const target = screen.getByTestId('target')

    expect(
      addSpy.mock.calls.some(
        (call, index) =>
          call[0] === 'pointerdown' && addSpy.mock.contexts[index] === target,
      ),
    ).toBe(true)
  })

  it('attaches temporary ownerDocument listeners during an active press', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)
    const addSpy = vi.spyOn(document, 'addEventListener')

    pressTarget()

    expect(getDocumentListeners(addSpy, 'pointermove').length).toBeGreaterThan(
      0,
    )
    expect(getDocumentListeners(addSpy, 'pointerup').length).toBeGreaterThan(0)
    expect(
      getDocumentListeners(addSpy, 'pointercancel').length,
    ).toBeGreaterThan(0)
  })

  it('removes temporary ownerDocument listeners after pointerup', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    pressTarget()
    releasePointer()

    expect(
      getDocumentListeners(removeSpy, 'pointermove').length,
    ).toBeGreaterThan(0)
    expect(getDocumentListeners(removeSpy, 'pointerup').length).toBeGreaterThan(
      0,
    )
    expect(
      getDocumentListeners(removeSpy, 'pointercancel').length,
    ).toBeGreaterThan(0)
  })

  it('fires the handler while the pointer remains down after the delay', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
    releasePointer()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('uses a single handler invocation per completed long press', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    releasePointer()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // Pointer filtering
  // -----------------------------------------------------------------------------

  it('ignores pointerdown with a non-default button', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget(screen.getByTestId('target'), { button: 2 })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('accepts pointerdown with a configured button', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ button: 2 }} />)

    pressTarget(screen.getByTestId('target'), { button: 2 })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores pointermove events from other pointer ids', () => {
    const handler = vi.fn()
    const onRelease = vi.fn()
    render(
      <Harness
        handler={handler}
        options={{ onRelease, distanceThreshold: 5 }}
      />,
    )

    pressTarget(undefined, { pointerId: 1, clientX: 0, clientY: 0 })
    movePointer(document, { pointerId: 2, clientX: 100, clientY: 100 })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores pointerup events from other pointer ids', () => {
    const handler = vi.fn()
    const onRelease = vi.fn()
    render(<Harness handler={handler} options={{ onRelease }} />)

    pressTarget(undefined, { pointerId: 1 })
    releasePointer(document, { pointerId: 2 })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(onRelease).not.toHaveBeenCalled()
    releasePointer(document, { pointerId: 1 })
    expect(onRelease).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores pointercancel events from other pointer ids', () => {
    const handler = vi.fn()
    const onRelease = vi.fn()
    render(<Harness handler={handler} options={{ onRelease }} />)

    pressTarget(undefined, { pointerId: 1 })
    cancelPointer(document, { pointerId: 2 })
    releasePointer(document, { pointerId: 1 })

    expect(onRelease).toHaveBeenCalledTimes(1)
  })

  it('handles mouse pointerType presses', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget(undefined, { pointerType: 'mouse' })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('handles touch pointerType presses', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget(undefined, { pointerType: 'touch' })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores a second pointerdown while a gesture is active', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget(undefined, { pointerId: 1 })
    pressTarget(undefined, { pointerId: 2 })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // Fixed and dynamic delay
  // -----------------------------------------------------------------------------

  it('uses a custom numeric delay', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ delay: 300 }} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(handler).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('fires immediately when delay is 0', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ delay: 0 }} />)

    pressTarget()
    act(() => {
      vi.runAllTimers()
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('normalizes negative delay to 0', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ delay: -100 }} />)

    pressTarget()
    act(() => {
      vi.runAllTimers()
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('normalizes NaN delay to the default 500ms', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ delay: Number.NaN }} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(handler).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('normalizes positive Infinity delay to the default 500ms', () => {
    const handler = vi.fn()
    render(
      <Harness
        handler={handler}
        options={{ delay: Number.POSITIVE_INFINITY }}
      />,
    )

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('normalizes negative Infinity delay to the default 500ms', () => {
    const handler = vi.fn()
    render(
      <Harness
        handler={handler}
        options={{ delay: Number.NEGATIVE_INFINITY }}
      />,
    )

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('resolves a function delay at pointerdown time', () => {
    const handler = vi.fn()
    const delayFn = vi.fn(() => 250)
    render(<Harness handler={handler} options={{ delay: delayFn }} />)

    pressTarget()
    expect(delayFn).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('passes the pointerdown event to a delay function', () => {
    const handler = vi.fn()
    const delayFn = vi.fn(() => 250)
    render(<Harness handler={handler} options={{ delay: delayFn }} />)

    const downEvent = pressTarget()
    expect(delayFn).toHaveBeenCalledWith(downEvent)
  })

  it('normalizes a negative function delay result to 0', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ delay: () => -50 }} />)

    pressTarget()
    act(() => {
      vi.runAllTimers()
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('normalizes a non-finite function delay result to 500ms', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ delay: () => Number.NaN }} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('uses delay resolved at pointerdown rather than a later rerender value', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <Harness handler={handler} options={{ delay: 400 }} />,
    )

    pressTarget()
    rerender(<Harness handler={handler} options={{ delay: 100 }} />)

    act(() => {
      vi.advanceTimersByTime(399)
    })
    expect(handler).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not fire when pointerup happens before a custom delay', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ delay: 800 }} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(400)
    })
    releasePointer()

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('schedules the timer via setTimeout on the target defaultView', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout')

    pressTarget()
    expect(setTimeoutSpy).toHaveBeenCalled()
    expect(setTimeoutSpy.mock.calls.at(-1)?.[1]).toBe(500)
  })

  it('clears the timer when the gesture ends early', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

    pressTarget()
    releasePointer()

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })

  it('supports a 1ms delay', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ delay: 1 }} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('calls the delay function once per gesture', () => {
    const handler = vi.fn()
    const delayFn = vi.fn(() => 100)
    render(<Harness handler={handler} options={{ delay: delayFn }} />)

    pressTarget()
    releasePointer()
    pressTarget()

    expect(delayFn).toHaveBeenCalledTimes(2)
  })

  // -----------------------------------------------------------------------------
  // Movement threshold
  // -----------------------------------------------------------------------------

  it('uses the default distanceThreshold of 10', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 11, clientY: 0 })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('cancels the timer when movement exceeds the threshold', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ distanceThreshold: 5 }} />)

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 6, clientY: 0 })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not fire the handler after movement exceeds the threshold', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 20, clientY: 0 })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    releasePointer()

    expect(handler).not.toHaveBeenCalled()
  })

  it('still calls onRelease on pointerup after movement cancels the timer', () => {
    const onRelease = vi.fn()
    render(
      <Harness
        handler={vi.fn()}
        options={{ onRelease, distanceThreshold: 5 }}
      />,
    )

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 20, clientY: 0 })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    releasePointer()

    expect(onRelease).toHaveBeenCalledTimes(1)
  })

  it('reports isLongPress false in onRelease after movement cancellation', () => {
    const onRelease = vi.fn()
    render(
      <Harness
        handler={vi.fn()}
        options={{ onRelease, distanceThreshold: 5 }}
      />,
    )

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 20, clientY: 0 })
    releasePointer()

    expect(onRelease).toHaveBeenCalledTimes(1)
    expect(onRelease.mock.calls[0]?.[0].isLongPress).toBe(false)
  })

  it('does not cancel when movement stays within the threshold', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ distanceThreshold: 10 }} />)

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 5, clientY: 5 })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not cancel when movement equals the threshold', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ distanceThreshold: 10 }} />)

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 10, clientY: 0 })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('disables movement cancellation when distanceThreshold is false', () => {
    const handler = vi.fn()
    render(
      <Harness
        handler={handler}
        options={{ distanceThreshold: false, delay: 100 }}
      />,
    )

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 200, clientY: 200 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('fires the handler despite large movement when distanceThreshold is false', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ distanceThreshold: false }} />)

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 500, clientY: 500 })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('normalizes negative distanceThreshold to 0', () => {
    const handler = vi.fn()
    render(
      <Harness
        handler={handler}
        options={{ distanceThreshold: -5, delay: 100 }}
      />,
    )

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 1, clientY: 0 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('normalizes non-finite distanceThreshold to 10', () => {
    const handler = vi.fn()
    render(
      <Harness
        handler={handler}
        options={{ distanceThreshold: Number.NaN, delay: 100 }}
      />,
    )

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 11, clientY: 0 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('tracks the maximum distance during the gesture', () => {
    const onRelease = vi.fn()
    render(
      <Harness
        handler={vi.fn()}
        options={{ onRelease, distanceThreshold: false, delay: 100 }}
      />,
    )

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 3, clientY: 4 })
    movePointer(document, { clientX: 0, clientY: 0 })
    releasePointer(undefined, { clientX: 6, clientY: 8 })

    expect(onRelease.mock.calls[0]?.[0].distance).toBe(10)
  })

  it('includes movement distance in release details', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 3, clientY: 4 })
    releasePointer()

    expect(onRelease.mock.calls[0]?.[0].distance).toBe(5)
  })

  it('does not cancel an already fired long press when movement continues', () => {
    const handler = vi.fn()
    const onRelease = vi.fn()
    render(
      <Harness
        handler={handler}
        options={{ onRelease, distanceThreshold: 5 }}
      />,
    )

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    movePointer(document, { clientX: 100, clientY: 100 })
    releasePointer()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(onRelease.mock.calls[0]?.[0].isLongPress).toBe(true)
  })

  // -----------------------------------------------------------------------------
  // Release details
  // -----------------------------------------------------------------------------

  it('calls onRelease after a successful long press', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    releasePointer()

    expect(onRelease).toHaveBeenCalledTimes(1)
  })

  it('calls onRelease after a short tap', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)

    pressTarget()
    releasePointer()

    expect(onRelease).toHaveBeenCalledTimes(1)
  })

  it('provides the target element in release details', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)
    const target = screen.getByTestId('target')

    pressTarget()
    releasePointer()

    expect(onRelease.mock.calls[0]?.[0].element).toBe(target)
  })

  it('provides the pointerup event in release details', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)

    pressTarget()
    const upEvent = releasePointer()

    expect(onRelease.mock.calls[0]?.[0].event).toBe(upEvent)
    expect(onRelease.mock.calls[0]?.[0].event.type).toBe('pointerup')
  })

  it('reports isLongPress true after the handler fired', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    releasePointer()

    expect(onRelease.mock.calls[0]?.[0].isLongPress).toBe(true)
  })

  it('reports isLongPress false on a short tap', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)

    pressTarget()
    releasePointer()

    expect(onRelease.mock.calls[0]?.[0].isLongPress).toBe(false)
  })

  it('reports a non-negative duration', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(120)
    })
    releasePointer()

    expect(onRelease.mock.calls[0]?.[0].duration).toBeGreaterThanOrEqual(0)
  })

  it('reports zero distance when the pointer did not move', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)

    pressTarget(undefined, { clientX: 10, clientY: 10 })
    releasePointer(undefined, { clientX: 10, clientY: 10 })

    expect(onRelease.mock.calls[0]?.[0].distance).toBe(0)
  })

  it('does not call onRelease when the option is omitted', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget()
    releasePointer()

    expect(handler).not.toHaveBeenCalled()
  })

  it('updates distance using the pointerup position', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    releasePointer(undefined, { clientX: 3, clientY: 4 })

    expect(onRelease.mock.calls[0]?.[0].distance).toBe(5)
  })

  // -----------------------------------------------------------------------------
  // Self behavior
  // -----------------------------------------------------------------------------

  it('activates on descendant pointerdown when self is false by default', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget(screen.getByTestId('descendant'))
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores descendant pointerdown when self is true', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ self: true }} />)

    pressTarget(screen.getByTestId('descendant'))
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('activates on direct target pointerdown when self is true', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ self: true }} />)

    pressTarget(screen.getByTestId('target'))
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('applies self filtering per gesture after option changes', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <Harness handler={handler} options={{ self: false }} />,
    )

    pressTarget(screen.getByTestId('descendant'))
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).toHaveBeenCalledTimes(1)

    releasePointer()
    handler.mockClear()

    rerender(<Harness handler={handler} options={{ self: true }} />)
    pressTarget(screen.getByTestId('descendant'))
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('defaults self to false', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget(screen.getByTestId('descendant'))
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // Modifiers
  // -----------------------------------------------------------------------------

  it('does not call preventDefault by default', () => {
    render(<Harness handler={vi.fn()} />)
    const preventDefault = vi.fn()
    const event = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    })
    Object.defineProperty(event, 'preventDefault', { value: preventDefault })

    screen.getByTestId('target').dispatchEvent(event)

    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('calls preventDefault on pointerdown when configured', () => {
    render(<Harness handler={vi.fn()} options={{ preventDefault: true }} />)
    const preventDefault = vi.fn()
    const event = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    })
    Object.defineProperty(event, 'preventDefault', { value: preventDefault })

    screen.getByTestId('target').dispatchEvent(event)

    expect(preventDefault).toHaveBeenCalledTimes(1)
  })

  it('does not call stopPropagation by default', () => {
    render(<Harness handler={vi.fn()} />)
    const stopPropagation = vi.fn()
    const event = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    })
    Object.defineProperty(event, 'stopPropagation', { value: stopPropagation })

    screen.getByTestId('target').dispatchEvent(event)

    expect(stopPropagation).not.toHaveBeenCalled()
  })

  it('calls stopPropagation on pointerdown when configured', () => {
    render(<Harness handler={vi.fn()} options={{ stopPropagation: true }} />)
    const stopPropagation = vi.fn()
    const event = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    })
    Object.defineProperty(event, 'stopPropagation', { value: stopPropagation })

    screen.getByTestId('target').dispatchEvent(event)

    expect(stopPropagation).toHaveBeenCalledTimes(1)
  })

  it('registers pointerdown without capture by default', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(HTMLElement.prototype, 'addEventListener')
    render(<Harness handler={handler} />)
    const target = screen.getByTestId('target')
    const listenerCall = addSpy.mock.calls.find(
      (call, index) =>
        call[0] === 'pointerdown' && addSpy.mock.contexts[index] === target,
    )

    expect(listenerCall?.[2]).toBeFalsy()
  })

  it('registers pointerdown with capture when configured', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(HTMLElement.prototype, 'addEventListener')
    render(<CaptureHarness handler={handler} capture />)
    const target = screen.getByTestId('target')
    const listenerCall = addSpy.mock.calls.find(
      (call, index) =>
        call[0] === 'pointerdown' && addSpy.mock.contexts[index] === target,
    )

    expect(listenerCall?.[2]).toBe(true)
  })

  it('rebinds the pointerdown listener when capture changes', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(HTMLElement.prototype, 'addEventListener')
    const removeSpy = vi.spyOn(HTMLElement.prototype, 'removeEventListener')

    const { rerender } = render(<CaptureHarness handler={handler} capture />)
    const target = screen.getByTestId('target')
    const initial = addSpy.mock.calls.find(
      (call, index) =>
        call[0] === 'pointerdown' && addSpy.mock.contexts[index] === target,
    )?.[1]

    rerender(<CaptureHarness handler={handler} capture={false} />)

    expect(
      removeSpy.mock.calls.some(
        (call) =>
          call[0] === 'pointerdown' && call[1] === initial && call[2] === true,
      ),
    ).toBe(true)

    const nextCall = addSpy.mock.calls.reduce<{
      call: (typeof addSpy.mock.calls)[number]
      index: number
    } | null>((latest, call, index) => {
      if (call[0] === 'pointerdown' && addSpy.mock.contexts[index] === target) {
        return { call, index }
      }
      return latest
    }, null)
    expect(nextCall?.call[2]).toBe(false)
    expect(nextCall?.call[1]).not.toBe(initial)
  })

  it('does not alter handler timing when preventDefault is enabled', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ preventDefault: true }} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // Enabled behavior
  // -----------------------------------------------------------------------------

  it('is enabled by default', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores pointerdown when disabled', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} options={{ enabled: false }} />)

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('starts listening when enabled changes from false to true', () => {
    const handler = vi.fn()
    render(<EnabledToggleHarness handler={handler} />)

    pressTarget()
    expect(handler).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('toggle-enabled'))

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('stops listening when enabled changes from true to false', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <Harness handler={handler} options={{ enabled: true }} />,
    )

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).toHaveBeenCalledTimes(1)

    handler.mockClear()
    rerender(<Harness handler={handler} options={{ enabled: false }} />)
    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('cancels an active gesture without onRelease when disabled mid-press', () => {
    const handler = vi.fn()
    const onRelease = vi.fn()
    const { rerender } = render(
      <Harness handler={handler} options={{ enabled: true, onRelease }} />,
    )

    pressTarget()
    rerender(
      <Harness handler={handler} options={{ enabled: false, onRelease }} />,
    )
    act(() => {
      vi.advanceTimersByTime(500)
    })
    releasePointer()

    expect(handler).not.toHaveBeenCalled()
    expect(onRelease).not.toHaveBeenCalled()
  })

  it('does not register a pointerdown listener while disabled', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(HTMLElement.prototype, 'addEventListener')
    render(<Harness handler={handler} options={{ enabled: false }} />)
    const target = screen.getByTestId('target')

    expect(
      addSpy.mock.calls.some(
        (call, index) =>
          call[0] === 'pointerdown' && addSpy.mock.contexts[index] === target,
      ),
    ).toBe(false)
  })

  it('allows new gestures after re-enabling', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <Harness handler={handler} options={{ enabled: false }} />,
    )

    rerender(<Harness handler={handler} options={{ enabled: true }} />)
    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not fire the handler when disabled before the timer elapses', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <Harness handler={handler} options={{ enabled: true, delay: 300 }} />,
    )

    pressTarget()
    rerender(
      <Harness handler={handler} options={{ enabled: false, delay: 300 }} />,
    )
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------------
  // Target refs
  // -----------------------------------------------------------------------------

  it('handles an initially null ref safely', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <NullableRefHarness handler={handler} attached={false} />,
    )

    pressTarget(screen.getByTestId('placeholder'))
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).not.toHaveBeenCalled()

    rerender(<NullableRefHarness handler={handler} attached />)
    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('attaches when the ref becomes non-null', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <NullableRefHarness handler={handler} attached={false} />,
    )
    const target = screen.queryByTestId('target')
    expect(target).toBeNull()

    rerender(<NullableRefHarness handler={handler} attached />)
    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('follows the latest ref target after rerender', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <SwitchTargetHarness handler={handler} attachTo="a" />,
    )

    pressTarget(screen.getByTestId('target-a'))
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).toHaveBeenCalledTimes(1)

    handler.mockClear()
    rerender(<SwitchTargetHarness handler={handler} attachTo="b" />)

    pressTarget(screen.getByTestId('target-a'))
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).not.toHaveBeenCalled()

    pressTarget(screen.getByTestId('target-b'))
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('switches listener registration when the ref target changes', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(HTMLElement.prototype, 'addEventListener')
    const removeSpy = vi.spyOn(HTMLElement.prototype, 'removeEventListener')

    const { rerender } = render(
      <SwitchTargetHarness handler={handler} attachTo="a" />,
    )
    const targetA = screen.getByTestId('target-a')
    const initial = addSpy.mock.calls.find(
      (call, index) =>
        call[0] === 'pointerdown' && addSpy.mock.contexts[index] === targetA,
    )?.[1]

    rerender(<SwitchTargetHarness handler={handler} attachTo="b" />)

    expect(
      removeSpy.mock.calls.some(
        (call) => call[0] === 'pointerdown' && call[1] === initial,
      ),
    ).toBe(true)
    expect(
      addSpy.mock.calls.some(
        (call, index) =>
          call[0] === 'pointerdown' &&
          addSpy.mock.contexts[index] === screen.getByTestId('target-b'),
      ),
    ).toBe(true)
  })

  it('cancels an active gesture without onRelease when the ref target changes', () => {
    const handler = vi.fn()
    const onRelease = vi.fn()
    const { rerender } = render(
      <SwitchTargetHarness
        handler={handler}
        onRelease={onRelease}
        attachTo="a"
      />,
    )

    pressTarget(screen.getByTestId('target-a'))
    rerender(
      <SwitchTargetHarness
        handler={handler}
        onRelease={onRelease}
        attachTo="b"
      />,
    )
    releasePointer()

    expect(onRelease).not.toHaveBeenCalled()
  })

  it('ignores non-element ref values', () => {
    const handler = vi.fn()
    const bogusRef = {
      current: {
        ownerDocument: document,
      } as unknown as HTMLDivElement,
    }

    function InvalidRefHarness(): ReactElement {
      useOnLongPress(bogusRef, handler)
      return <div data-testid="target">Target</div>
    }

    render(<InvalidRefHarness />)
    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('requires a rerender to observe imperative ref assignment', () => {
    const handler = vi.fn()
    const ref = createRef<HTMLDivElement>()
    render(<Harness handler={handler} elementRef={ref} />)

    const element = document.createElement('div')
    element.dataset.testid = 'imperative-target'
    ref.current = element

    dispatchPointer(element, 'pointerdown')
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('removes the pointerdown listener on unmount', () => {
    const handler = vi.fn()
    const removeSpy = vi.spyOn(HTMLElement.prototype, 'removeEventListener')
    const { unmount } = render(<Harness handler={handler} />)
    const target = screen.getByTestId('target')

    unmount()

    expect(
      removeSpy.mock.calls.some(
        (call) => call[0] === 'pointerdown' && call[2] === false,
      ),
    ).toBe(true)
    expect(target.isConnected).toBe(false)
  })

  it('does not fire after unmount', () => {
    const handler = vi.fn()
    const { unmount } = render(<Harness handler={handler} />)

    pressTarget()
    unmount()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------------
  // Cancellation
  // -----------------------------------------------------------------------------

  it('ends the gesture without onRelease on pointercancel', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)

    pressTarget()
    cancelPointer()
    releasePointer()

    expect(onRelease).not.toHaveBeenCalled()
  })

  it('ends the gesture without onRelease on window blur', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)

    pressTarget()
    window.dispatchEvent(new Event('blur'))
    releasePointer()

    expect(onRelease).not.toHaveBeenCalled()
  })

  it('ends the gesture without onRelease on unmount during press', () => {
    const onRelease = vi.fn()
    const { unmount } = render(
      <Harness handler={vi.fn()} options={{ onRelease }} />,
    )

    pressTarget()
    unmount()
    releasePointer()

    expect(onRelease).not.toHaveBeenCalled()
  })

  it('ends the gesture without onRelease when the ref target changes during press', () => {
    const onRelease = vi.fn()
    const { rerender } = render(
      <SwitchTargetHarness
        handler={vi.fn()}
        onRelease={onRelease}
        attachTo="a"
      />,
    )

    pressTarget(screen.getByTestId('target-a'))
    rerender(
      <SwitchTargetHarness
        handler={vi.fn()}
        onRelease={onRelease}
        attachTo="b"
      />,
    )
    releasePointer()

    expect(onRelease).not.toHaveBeenCalled()
  })

  it('still calls onRelease on pointerup after movement cancels only the timer', () => {
    const onRelease = vi.fn()
    render(
      <Harness
        handler={vi.fn()}
        options={{ onRelease, distanceThreshold: 5 }}
      />,
    )

    pressTarget(undefined, { clientX: 0, clientY: 0 })
    movePointer(document, { clientX: 20, clientY: 0 })
    releasePointer()

    expect(onRelease).toHaveBeenCalledTimes(1)
  })

  it('ignores pointerup after pointercancel cleared the gesture', () => {
    const onRelease = vi.fn()
    render(<Harness handler={vi.fn()} options={{ onRelease }} />)

    pressTarget(undefined, { pointerId: 1 })
    cancelPointer(document, { pointerId: 1 })
    releasePointer(document, { pointerId: 1 })

    expect(onRelease).not.toHaveBeenCalled()
  })

  it('removes all temporary document listeners on pointercancel', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    render(<Harness handler={vi.fn()} />)

    pressTarget()
    cancelPointer()

    expect(
      getDocumentListeners(removeSpy, 'pointermove').length,
    ).toBeGreaterThan(0)
    expect(getDocumentListeners(removeSpy, 'pointerup').length).toBeGreaterThan(
      0,
    )
    expect(
      getDocumentListeners(removeSpy, 'pointercancel').length,
    ).toBeGreaterThan(0)
  })

  it('removes blur listener on gesture end', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    render(<Harness handler={vi.fn()} />)

    pressTarget()
    releasePointer()

    expect(removeSpy.mock.calls.some((call) => call[0] === 'blur')).toBe(true)
  })

  it('cancels the timer on pointercancel', () => {
    const handler = vi.fn()
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
    render(<Harness handler={handler} />)

    pressTarget()
    cancelPointer()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------------
  // Latest callbacks
  // -----------------------------------------------------------------------------

  it('invokes the latest handler after rerender', () => {
    const firstHandler = vi.fn()
    const secondHandler = vi.fn()
    const { rerender } = render(<Harness handler={firstHandler} />)

    rerender(<Harness handler={secondHandler} />)
    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(firstHandler).not.toHaveBeenCalled()
    expect(secondHandler).toHaveBeenCalledTimes(1)
  })

  it('invokes the latest onRelease after rerender', () => {
    const firstRelease = vi.fn()
    const secondRelease = vi.fn()
    const { rerender } = render(
      <Harness handler={vi.fn()} options={{ onRelease: firstRelease }} />,
    )

    rerender(
      <Harness handler={vi.fn()} options={{ onRelease: secondRelease }} />,
    )
    pressTarget()
    releasePointer()

    expect(firstRelease).not.toHaveBeenCalled()
    expect(secondRelease).toHaveBeenCalledTimes(1)
  })

  it('does not re-register pointerdown when only the handler identity changes', () => {
    const addSpy = vi.spyOn(HTMLElement.prototype, 'addEventListener')
    const removeSpy = vi.spyOn(HTMLElement.prototype, 'removeEventListener')
    const firstHandler = vi.fn()
    const secondHandler = vi.fn()

    const { rerender } = render(<Harness handler={firstHandler} />)
    const target = screen.getByTestId('target')
    const addsAfterMount = addSpy.mock.calls.filter(
      (call, index) =>
        call[0] === 'pointerdown' && addSpy.mock.contexts[index] === target,
    ).length
    const removesAfterMount = removeSpy.mock.calls.filter(
      (call) => call[0] === 'pointerdown',
    ).length

    rerender(<Harness handler={secondHandler} />)

    expect(
      addSpy.mock.calls.filter(
        (call, index) =>
          call[0] === 'pointerdown' && addSpy.mock.contexts[index] === target,
      ),
    ).toHaveLength(addsAfterMount)
    expect(
      removeSpy.mock.calls.filter((call) => call[0] === 'pointerdown'),
    ).toHaveLength(removesAfterMount)
  })

  it('does not re-register pointerdown when only onRelease identity changes', () => {
    const addSpy = vi.spyOn(HTMLElement.prototype, 'addEventListener')
    const removeSpy = vi.spyOn(HTMLElement.prototype, 'removeEventListener')
    const firstRelease = vi.fn()
    const secondRelease = vi.fn()

    const { rerender } = render(
      <Harness handler={vi.fn()} options={{ onRelease: firstRelease }} />,
    )
    const target = screen.getByTestId('target')
    const addsAfterMount = addSpy.mock.calls.filter(
      (call, index) =>
        call[0] === 'pointerdown' && addSpy.mock.contexts[index] === target,
    ).length
    const removesAfterMount = removeSpy.mock.calls.filter(
      (call) => call[0] === 'pointerdown',
    ).length

    rerender(
      <Harness handler={vi.fn()} options={{ onRelease: secondRelease }} />,
    )

    expect(
      addSpy.mock.calls.filter(
        (call, index) =>
          call[0] === 'pointerdown' && addSpy.mock.contexts[index] === target,
      ),
    ).toHaveLength(addsAfterMount)
    expect(
      removeSpy.mock.calls.filter((call) => call[0] === 'pointerdown'),
    ).toHaveLength(removesAfterMount)
  })

  it('applies updated delay on the next gesture after rerender', () => {
    const handler = vi.fn()
    render(
      <LatestValuesHarness handlers={[handler, handler]} delays={[500, 100]} />,
    )

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(handler).not.toHaveBeenCalled()
    releasePointer()

    fireEvent.click(screen.getByTestId('advance'))

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('applies updated button filter on the next gesture after rerender', () => {
    const handler = vi.fn()
    render(
      <LatestValuesHarness handlers={[handler, handler]} buttons={[0, 2]} />,
    )

    pressTarget(undefined, { button: 2 })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).not.toHaveBeenCalled()
    releasePointer()

    fireEvent.click(screen.getByTestId('advance'))

    pressTarget(undefined, { button: 2 })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // StrictMode
  // -----------------------------------------------------------------------------

  it('registers a single pointerdown listener in StrictMode', () => {
    const handler = vi.fn()
    const listeners = new Set<EventListenerOrEventListenerObject>()
    const originalAdd = HTMLElement.prototype.addEventListener
    const originalRemove = HTMLElement.prototype.removeEventListener

    vi.spyOn(HTMLElement.prototype, 'addEventListener').mockImplementation(
      function (this: HTMLElement, type, listener, options) {
        if (
          type === 'pointerdown' &&
          listener != null &&
          this.dataset.testid === 'target'
        ) {
          listeners.add(listener)
        }
        return originalAdd.call(this, type, listener, options)
      },
    )
    vi.spyOn(HTMLElement.prototype, 'removeEventListener').mockImplementation(
      function (this: HTMLElement, type, listener, options) {
        if (
          type === 'pointerdown' &&
          listener != null &&
          this.dataset.testid === 'target'
        ) {
          listeners.delete(listener)
        }
        return originalRemove.call(this, type, listener, options)
      },
    )

    render(
      <StrictMode>
        <Harness handler={handler} />
      </StrictMode>,
    )

    expect(listeners.size).toBe(1)
  })

  it('activates correctly in StrictMode', () => {
    const handler = vi.fn()
    render(
      <StrictMode>
        <Harness handler={handler} />
      </StrictMode>,
    )

    pressTarget()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // SSR
  // -----------------------------------------------------------------------------

  it('imports without requiring document at module evaluation time', async () => {
    await expect(import('../../index')).resolves.toMatchObject({
      useOnLongPress: expect.any(Function),
    })
  })

  it('server-renders a component that calls the hook without throwing', () => {
    function ServerComponent(): ReactElement {
      const ref = useRef<HTMLDivElement>(null)
      useOnLongPress(ref, () => {
        // no-op
      })
      return <div ref={ref}>press target</div>
    }

    expect(() => renderToString(<ServerComponent />)).not.toThrow()
    expect(renderToString(<ServerComponent />)).toContain('press target')
  })

  it('does not register listeners during server rendering', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')

    function ServerComponent(): ReactElement {
      const ref = useRef<HTMLDivElement>(null)
      useOnLongPress(ref, () => {
        // no-op
      })
      return <div ref={ref}>press target</div>
    }

    addSpy.mockClear()
    renderToString(<ServerComponent />)

    expect(getDocumentListeners(addSpy, 'pointerdown')).toHaveLength(0)
    expect(getDocumentListeners(addSpy, 'pointermove')).toHaveLength(0)
    expect(getDocumentListeners(addSpy, 'pointerup')).toHaveLength(0)
  })

  it('does not register ownerDocument listeners during server rendering', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')

    function ServerComponent(): ReactElement {
      const ref = useRef<HTMLDivElement>(null)
      useOnLongPress(
        ref,
        () => {
          // no-op
        },
        { onRelease: () => {} },
      )
      return <div ref={ref}>press target</div>
    }

    addSpy.mockClear()
    renderToString(<ServerComponent />)

    expect(getDocumentListeners(addSpy, 'pointercancel')).toHaveLength(0)
  })

  it('exports useOnLongPress from the package entry', async () => {
    const entry = await import('../../index')
    expect(entry.useOnLongPress).toEqual(useOnLongPress)
  })

  it('server output contains expected markup', () => {
    function ServerComponent(): ReactElement {
      const ref = useRef<HTMLDivElement>(null)
      useOnLongPress(ref, () => {
        // no-op
      })
      return (
        <div ref={ref} data-testid="server-target">
          press target
        </div>
      )
    }

    const html = renderToString(<ServerComponent />)
    expect(html).toContain('data-testid="server-target"')
    expect(html).toContain('press target')
  })
})
