import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  StrictMode,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  useEventListener,
  type UseEventListenerOptions,
} from './useEventListener'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

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

function WindowHarness({
  eventName,
  handler,
  options,
}: {
  eventName: string | readonly string[]
  handler: (event: Event) => void
  options?: UseEventListenerOptions
}): ReactElement {
  useEventListener(eventName, handler, options)
  return <div data-testid="harness">window</div>
}

function TargetHarness({
  target,
  eventName,
  handler,
  options,
}: {
  target: EventTarget | RefObject<EventTarget | null> | null
  eventName: string | readonly string[]
  handler: (event: Event) => void
  options?: UseEventListenerOptions
}): ReactElement {
  useEventListener(target, eventName, handler, options)
  return <div data-testid="harness">target</div>
}

function ElementRefHarness({
  eventName,
  handler,
  options,
  attach = true,
}: {
  eventName: string | readonly string[]
  handler: (event: Event) => void
  options?: {
    enabled?: boolean
    capture?: boolean
    passive?: boolean
    once?: boolean
  }
  attach?: boolean
}): ReactElement {
  const ref = useRef<HTMLButtonElement>(null)
  useEventListener(ref, eventName, handler, options)
  return (
    <button
      ref={attach ? ref : undefined}
      type="button"
      data-testid="target-button"
    >
      Target
    </button>
  )
}

function SwitchRefHarness({
  handler,
  attachTo,
}: {
  handler: (event: Event) => void
  attachTo: 'a' | 'b' | 'none'
}): ReactElement {
  const ref = useRef<HTMLButtonElement>(null)
  useEventListener(ref, 'click', handler)
  return (
    <div>
      <button
        ref={attachTo === 'a' ? ref : undefined}
        type="button"
        data-testid="button-a"
      >
        A
      </button>
      <button
        ref={attachTo === 'b' ? ref : undefined}
        type="button"
        data-testid="button-b"
      >
        B
      </button>
    </div>
  )
}

describe('useEventListener', () => {
  // ---------------------------------------------------------------------------
  // Default window
  // ---------------------------------------------------------------------------

  it('omitted target registers on window and passes the original event', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')

    render(<WindowHarness eventName="resize" handler={handler} />)

    expect(
      addSpy.mock.calls.some((call) => {
        const options = call[2]
        return (
          call[0] === 'resize' &&
          typeof options === 'object' &&
          options !== null &&
          'capture' in options &&
          options.capture === false
        )
      }),
    ).toBe(true)

    const event = new Event('resize')
    window.dispatchEvent(event)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('cleans up window listeners on unmount', () => {
    const handler = vi.fn()
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(
      <WindowHarness eventName="resize" handler={handler} />,
    )

    unmount()
    expect(removeSpy.mock.calls.some((call) => call[0] === 'resize')).toBe(true)

    window.dispatchEvent(new Event('resize'))
    expect(handler).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Direct targets
  // ---------------------------------------------------------------------------

  it('supports Window, Document, HTMLElement, and SVGElement', () => {
    const handler = vi.fn()
    const div = document.createElement('div')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    document.body.append(div, svg)

    const { rerender, unmount } = render(
      <TargetHarness target={window} eventName="blur" handler={handler} />,
    )
    window.dispatchEvent(new Event('blur'))
    expect(handler).toHaveBeenCalledTimes(1)

    handler.mockClear()
    rerender(
      <TargetHarness
        target={document}
        eventName="visibilitychange"
        handler={handler}
      />,
    )
    document.dispatchEvent(new Event('visibilitychange'))
    expect(handler).toHaveBeenCalledTimes(1)

    handler.mockClear()
    rerender(<TargetHarness target={div} eventName="click" handler={handler} />)
    div.dispatchEvent(new MouseEvent('click'))
    expect(handler).toHaveBeenCalledTimes(1)

    handler.mockClear()
    rerender(<TargetHarness target={svg} eventName="click" handler={handler} />)
    svg.dispatchEvent(new MouseEvent('click'))
    expect(handler).toHaveBeenCalledTimes(1)

    unmount()
    div.remove()
    svg.remove()
  })

  it('supports MediaQueryList-like targets and generic EventTarget', () => {
    const handler = vi.fn()
    const listeners = new Map<string, Set<EventListener>>()
    const mql = {
      matches: false,
      media: '(min-width: 600px)',
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener(type: string, listener: EventListener) {
        const set = listeners.get(type) ?? new Set()
        set.add(listener)
        listeners.set(type, set)
      },
      removeEventListener(type: string, listener: EventListener) {
        listeners.get(type)?.delete(listener)
      },
      dispatchEvent(event: Event) {
        listeners.get(event.type)?.forEach((listener) => {
          listener.call(mql as unknown as EventTarget, event)
        })
        return true
      },
    }

    const { unmount } = render(
      <TargetHarness
        target={mql as unknown as MediaQueryList}
        eventName="change"
        handler={handler}
      />,
    )

    mql.dispatchEvent(new Event('change'))
    expect(handler).toHaveBeenCalledTimes(1)
    unmount()

    handler.mockClear()
    const target = new EventTarget()
    render(
      <TargetHarness target={target} eventName="custom" handler={handler} />,
    )
    target.dispatchEvent(new Event('custom'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores invalid targets and does not use instanceof EventTarget', () => {
    const handler = vi.fn()
    const invalid = {
      addEventListener: 'nope',
      removeEventListener: () => {},
    }

    expect(() => {
      render(
        <TargetHarness
          target={invalid as unknown as EventTarget}
          eventName="click"
          handler={handler}
        />,
      )
    }).not.toThrow()
    expect(handler).not.toHaveBeenCalled()
  })

  it('explicit null registers nothing', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')
    render(<TargetHarness target={null} eventName="click" handler={handler} />)
    expect(addSpy.mock.calls.some((call) => call[0] === 'click')).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // React ref targets
  // ---------------------------------------------------------------------------

  it('supports element refs including initially null and commit sync', async () => {
    const handler = vi.fn()
    const { rerender } = render(
      <ElementRefHarness eventName="click" handler={handler} attach={false} />,
    )

    expect(handler).not.toHaveBeenCalled()

    rerender(
      <ElementRefHarness eventName="click" handler={handler} attach={true} />,
    )

    await waitFor(() => {
      screen.getByTestId('target-button').click()
      expect(handler).toHaveBeenCalled()
    })
  })

  it('moves between ref targets and clears when ref returns to null', async () => {
    const handler = vi.fn()
    const { rerender } = render(
      <SwitchRefHarness handler={handler} attachTo="a" />,
    )

    await waitFor(() => {
      screen.getByTestId('button-a').click()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    handler.mockClear()
    rerender(<SwitchRefHarness handler={handler} attachTo="b" />)

    await waitFor(() => {
      screen.getByTestId('button-a').click()
      expect(handler).not.toHaveBeenCalled()
      screen.getByTestId('button-b').click()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    handler.mockClear()
    rerender(<SwitchRefHarness handler={handler} attachTo="none" />)

    await waitFor(() => {
      screen.getByTestId('button-b').click()
      expect(handler).not.toHaveBeenCalled()
    })
  })

  it('does not duplicate registrations while the ref target is unchanged', () => {
    const handler = vi.fn()
    const button = document.createElement('button')
    document.body.append(button)
    const addSpy = vi.spyOn(button, 'addEventListener')
    const ref: RefObject<HTMLButtonElement | null> = { current: button }

    const { rerender } = render(
      <TargetHarness target={ref} eventName="click" handler={handler} />,
    )
    const initialAdds = addSpy.mock.calls.filter(
      (call) => call[0] === 'click',
    ).length

    rerender(<TargetHarness target={ref} eventName="click" handler={handler} />)
    const afterRerender = addSpy.mock.calls.filter(
      (call) => call[0] === 'click',
    ).length

    expect(afterRerender).toBe(initialAdds)
    button.remove()
  })

  // ---------------------------------------------------------------------------
  // Single and multiple events
  // ---------------------------------------------------------------------------

  it('registers one event and ignores other types', () => {
    const handler = vi.fn()
    render(<WindowHarness eventName="focus" handler={handler} />)

    window.dispatchEvent(new Event('blur'))
    expect(handler).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('focus'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('registers unique names from arrays without mutating input', () => {
    const handler = vi.fn()
    const names = ['mouseenter', 'mouseleave', 'mouseenter']
    const snapshot = [...names]
    const addSpy = vi.spyOn(window, 'addEventListener')

    render(<WindowHarness eventName={names} handler={handler} />)

    expect(names).toEqual(snapshot)
    const registered = addSpy.mock.calls
      .map((call) => call[0])
      .filter((name) => name === 'mouseenter' || name === 'mouseleave')
    expect(registered.filter((name) => name === 'mouseenter')).toHaveLength(1)
    expect(registered.filter((name) => name === 'mouseleave')).toHaveLength(1)

    window.dispatchEvent(new Event('mouseenter'))
    window.dispatchEvent(new Event('mouseleave'))
    window.dispatchEvent(new Event('click'))
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('empty arrays register nothing', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')
    render(<WindowHarness eventName={[]} handler={handler} />)
    expect(addSpy).not.toHaveBeenCalled()
  })

  it('equivalent arrays avoid churn; content changes update registrations', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { rerender } = render(
      <WindowHarness eventName={['resize', 'focus']} handler={handler} />,
    )
    const afterFirst = addSpy.mock.calls.length

    rerender(
      <WindowHarness eventName={['resize', 'focus']} handler={handler} />,
    )
    expect(addSpy.mock.calls.length).toBe(afterFirst)

    rerender(<WindowHarness eventName={['resize', 'blur']} handler={handler} />)
    expect(removeSpy.mock.calls.some((call) => call[0] === 'focus')).toBe(true)
    expect(addSpy.mock.calls.some((call) => call[0] === 'blur')).toBe(true)
  })

  it('detects in-place array mutation on rerender', () => {
    const handler = vi.fn()
    const names = ['resize']
    const addSpy = vi.spyOn(window, 'addEventListener')

    function MutableHarness({ list }: { list: string[] }): ReactElement {
      useEventListener(list, handler)
      return <div />
    }

    const { rerender } = render(<MutableHarness list={names} />)
    const before = addSpy.mock.calls.filter(
      (call) => call[0] === 'focus',
    ).length

    names.push('focus')
    rerender(<MutableHarness list={names} />)

    expect(
      addSpy.mock.calls.filter((call) => call[0] === 'focus').length,
    ).toBeGreaterThan(before)
  })

  it('cleanup removes every registered name', () => {
    const handler = vi.fn()
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(
      <WindowHarness eventName={['resize', 'focus']} handler={handler} />,
    )
    unmount()
    expect(removeSpy.mock.calls.some((call) => call[0] === 'resize')).toBe(true)
    expect(removeSpy.mock.calls.some((call) => call[0] === 'focus')).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Latest handler
  // ---------------------------------------------------------------------------

  it('uses the latest handler without re-registering', () => {
    const first = vi.fn()
    const second = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')

    const { rerender } = render(
      <WindowHarness eventName="resize" handler={first} />,
    )
    const afterFirst = addSpy.mock.calls.filter(
      (call) => call[0] === 'resize',
    ).length

    rerender(<WindowHarness eventName="resize" handler={second} />)
    expect(
      addSpy.mock.calls.filter((call) => call[0] === 'resize').length,
    ).toBe(afterFirst)

    window.dispatchEvent(new Event('resize'))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('does not swallow handler errors', () => {
    const error = new Error('handler failed')
    const handler = vi.fn(() => {
      throw error
    })
    const addSpy = vi.spyOn(window, 'addEventListener')

    render(<WindowHarness eventName="resize" handler={handler} />)

    const listener = addSpy.mock.calls.find((call) => call[0] === 'resize')?.[1]
    expect(typeof listener).toBe('function')
    expect(() => {
      ;(listener as EventListener).call(window, new Event('resize'))
    }).toThrow(error)
  })

  // ---------------------------------------------------------------------------
  // Enabled
  // ---------------------------------------------------------------------------

  it('is enabled by default and disables cleanly', async () => {
    const handler = vi.fn()

    function Toggle(): ReactElement {
      const [enabled, setEnabled] = useState(true)
      useEventListener('resize', handler, { enabled })
      return (
        <button
          type="button"
          data-testid="toggle"
          onClick={() => {
            setEnabled((value) => !value)
          }}
        >
          toggle
        </button>
      )
    }

    render(<Toggle />)
    window.dispatchEvent(new Event('resize'))
    expect(handler).toHaveBeenCalledTimes(1)

    await act(async () => {
      screen.getByTestId('toggle').click()
    })
    handler.mockClear()
    window.dispatchEvent(new Event('resize'))
    expect(handler).not.toHaveBeenCalled()

    await act(async () => {
      screen.getByTestId('toggle').click()
    })
    window.dispatchEvent(new Event('resize'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('registers nothing when disabled', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')
    render(
      <WindowHarness
        eventName="resize"
        handler={handler}
        options={{ enabled: false }}
      />,
    )
    expect(addSpy.mock.calls.some((call) => call[0] === 'resize')).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Capture / passive / once / signal / options identity
  // ---------------------------------------------------------------------------

  it('defaults capture and passive to false and re-registers on change', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { rerender } = render(
      <WindowHarness eventName="resize" handler={handler} />,
    )
    const initial = addSpy.mock.calls.find((call) => call[0] === 'resize')
    expect(initial?.[2]).toMatchObject({
      capture: false,
      passive: false,
      once: false,
    })

    rerender(
      <WindowHarness
        eventName="resize"
        handler={handler}
        options={{ capture: true }}
      />,
    )
    expect(
      removeSpy.mock.calls.some(
        (call) =>
          call[0] === 'resize' &&
          typeof call[2] === 'object' &&
          call[2] !== null &&
          'capture' in call[2] &&
          call[2].capture === false,
      ),
    ).toBe(true)
    expect(
      addSpy.mock.calls.some(
        (call) =>
          call[0] === 'resize' &&
          typeof call[2] === 'object' &&
          call[2] !== null &&
          'capture' in call[2] &&
          call[2].capture === true,
      ),
    ).toBe(true)

    rerender(
      <WindowHarness
        eventName="resize"
        handler={handler}
        options={{ capture: true, passive: true }}
      />,
    )
    expect(
      addSpy.mock.calls.some(
        (call) =>
          call[0] === 'resize' &&
          typeof call[2] === 'object' &&
          call[2] !== null &&
          'passive' in call[2] &&
          call[2].passive === true,
      ),
    ).toBe(true)
  })

  it('allows preventDefault with default non-passive configuration', () => {
    const handler = vi.fn((event: Event) => {
      event.preventDefault()
    })
    render(<WindowHarness eventName="keydown" handler={handler} />)

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      cancelable: true,
    })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('supports once per event name and does not re-arm on handler change', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(
      <WindowHarness
        eventName={['focus', 'blur']}
        handler={first}
        options={{ once: true }}
      />,
    )

    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('blur'))
    window.dispatchEvent(new Event('blur'))
    expect(first).toHaveBeenCalledTimes(2)

    rerender(
      <WindowHarness
        eventName={['focus', 'blur']}
        handler={second}
        options={{ once: true }}
      />,
    )
    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('blur'))
    expect(second).not.toHaveBeenCalled()
  })

  it('changing once re-registers', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')
    const { rerender } = render(
      <WindowHarness eventName="resize" handler={handler} />,
    )
    const before = addSpy.mock.calls.length
    rerender(
      <WindowHarness
        eventName="resize"
        handler={handler}
        options={{ once: true }}
      />,
    )
    expect(addSpy.mock.calls.length).toBeGreaterThan(before)
  })

  it('supports AbortSignal lifecycle without mutating the signal', () => {
    const handler = vi.fn()
    const controller = new AbortController()
    const abortSpy = vi.spyOn(controller, 'abort')

    render(
      <WindowHarness
        eventName="resize"
        handler={handler}
        options={{ signal: controller.signal }}
      />,
    )

    window.dispatchEvent(new Event('resize'))
    expect(handler).toHaveBeenCalledTimes(1)

    controller.abort()
    handler.mockClear()
    window.dispatchEvent(new Event('resize'))
    expect(handler).not.toHaveBeenCalled()
    expect(abortSpy).toHaveBeenCalledTimes(1)
  })

  it('already-aborted signals register nothing', () => {
    const handler = vi.fn()
    const controller = new AbortController()
    controller.abort()
    const addSpy = vi.spyOn(window, 'addEventListener')

    render(
      <WindowHarness
        eventName="resize"
        handler={handler}
        options={{ signal: controller.signal }}
      />,
    )

    expect(addSpy.mock.calls.some((call) => call[0] === 'resize')).toBe(false)
  })

  it('changing signal identity re-registers and cleanup stays safe after abort', () => {
    const handler = vi.fn()
    const first = new AbortController()
    const second = new AbortController()
    const addSpy = vi.spyOn(window, 'addEventListener')

    const { rerender, unmount } = render(
      <WindowHarness
        eventName="resize"
        handler={handler}
        options={{ signal: first.signal }}
      />,
    )
    const before = addSpy.mock.calls.length

    rerender(
      <WindowHarness
        eventName="resize"
        handler={handler}
        options={{ signal: second.signal }}
      />,
    )
    expect(addSpy.mock.calls.length).toBeGreaterThan(before)

    second.abort()
    expect(() => {
      unmount()
    }).not.toThrow()
  })

  it('equivalent options objects do not cause churn; enabled is not passed through', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')

    const { rerender } = render(
      <WindowHarness
        eventName="resize"
        handler={handler}
        options={{ enabled: true, capture: false, passive: false, once: false }}
      />,
    )
    const afterFirst = addSpy.mock.calls.length
    const lastOptions = addSpy.mock.calls.at(-1)?.[2]
    expect(lastOptions).not.toHaveProperty('enabled')

    rerender(
      <WindowHarness
        eventName="resize"
        handler={handler}
        options={{ enabled: true, capture: false, passive: false, once: false }}
      />,
    )
    expect(addSpy.mock.calls.length).toBe(afterFirst)
  })

  // ---------------------------------------------------------------------------
  // Custom events
  // ---------------------------------------------------------------------------

  it('supports CustomEvent and preserves the exact event object', () => {
    const handler = vi.fn()
    const target = new EventTarget()
    render(
      <TargetHarness
        target={target}
        eventName="item:selected"
        handler={handler}
      />,
    )

    const event = new CustomEvent('item:selected', {
      detail: { id: '42' },
    })
    target.dispatchEvent(event)
    expect(handler).toHaveBeenCalledWith(event)
  })

  // ---------------------------------------------------------------------------
  // StrictMode
  // ---------------------------------------------------------------------------

  it('leaves one active registration per name in StrictMode', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    render(
      <StrictMode>
        <WindowHarness eventName="resize" handler={handler} />
      </StrictMode>,
    )

    const added = addSpy.mock.calls.filter(
      (call) => call[0] === 'resize',
    ).length
    const removed = removeSpy.mock.calls.filter(
      (call) => call[0] === 'resize',
    ).length
    expect(added - removed).toBe(1)

    window.dispatchEvent(new Event('resize'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------
  // SSR
  // ---------------------------------------------------------------------------

  it('imports without browser globals and server-renders safely', async () => {
    await expect(import('../../index')).resolves.toMatchObject({
      useEventListener: expect.any(Function),
    })

    function ServerComponent(): ReactElement {
      useEventListener('resize', () => {
        // no-op
      })
      return <div>ssr</div>
    }

    const addSpy = vi.spyOn(window, 'addEventListener')
    const { warnings, errors } = captureConsoleDuring(() => {
      expect(renderToString(<ServerComponent />)).toContain('ssr')
    })

    expect(addSpy.mock.calls.some((call) => call[0] === 'resize')).toBe(false)
    expect([...warnings, ...errors].filter(isLayoutEffectSsrMessage)).toEqual(
      [],
    )
  })

  it('returns void', () => {
    function Probe(): ReactElement {
      const result = useEventListener('resize', () => {
        // no-op
      })
      expect(result).toBeUndefined()
      return <div />
    }

    render(<Probe />)
  })
})
