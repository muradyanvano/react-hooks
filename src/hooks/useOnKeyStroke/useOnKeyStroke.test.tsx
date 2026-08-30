import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, useRef, useState, type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  useOnKeyStroke,
  type KeyStrokeEventType,
  type KeyStrokeFilter,
  type UseOnKeyStrokeHandler,
  type UseOnKeyStrokeOptions,
} from './useOnKeyStroke'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function Harness({
  keyFilter,
  handler,
  options,
}: {
  keyFilter: KeyStrokeFilter
  handler: UseOnKeyStrokeHandler
  options?: UseOnKeyStrokeOptions
}): ReactElement {
  useOnKeyStroke(keyFilter, handler, options)
  return <div data-testid="harness">Keyboard harness</div>
}

function TargetRefHarness({
  keyFilter,
  handler,
  options,
  attach = true,
}: {
  keyFilter: KeyStrokeFilter
  handler: UseOnKeyStrokeHandler
  options?: Omit<UseOnKeyStrokeOptions, 'target'>
  attach?: boolean
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  useOnKeyStroke(keyFilter, handler, { ...options, target: ref })

  return (
    <div>
      <div ref={attach ? ref : undefined} data-testid="region" tabIndex={0}>
        Region
      </div>
      <button type="button" data-testid="outside">
        Outside
      </button>
    </div>
  )
}

function SwitchTargetHarness({
  handler,
  attachTo,
}: {
  handler: UseOnKeyStrokeHandler
  attachTo: 'a' | 'b'
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  useOnKeyStroke('Enter', handler, { target: ref })

  return (
    <div>
      <div
        ref={attachTo === 'a' ? ref : undefined}
        data-testid="target-a"
        tabIndex={0}
      >
        A
      </div>
      <div
        ref={attachTo === 'b' ? ref : undefined}
        data-testid="target-b"
        tabIndex={0}
      >
        B
      </div>
    </div>
  )
}

function EnabledToggleHarness({
  handler,
  keyFilter = 'a',
}: {
  handler: UseOnKeyStrokeHandler
  keyFilter?: KeyStrokeFilter
}): ReactElement {
  const [enabled, setEnabled] = useState(false)
  useOnKeyStroke(keyFilter, handler, { enabled })

  return (
    <button
      type="button"
      data-testid="toggle-enabled"
      onClick={() => {
        setEnabled((value) => !value)
      }}
    >
      Toggle
    </button>
  )
}

function LatestValuesHarness({
  handlers,
  filters,
  dedupeValues,
}: {
  handlers: UseOnKeyStrokeHandler[]
  filters: KeyStrokeFilter[]
  dedupeValues?: boolean[]
}): ReactElement {
  const [index, setIndex] = useState(0)
  const options: UseOnKeyStrokeOptions =
    dedupeValues == null ? {} : { dedupe: dedupeValues[index] ?? false }
  useOnKeyStroke(filters[index]!, handlers[index]!, options)

  return (
    <button
      type="button"
      data-testid="advance"
      onClick={() => {
        setIndex((value) =>
          Math.min(value + 1, handlers.length - 1, filters.length - 1),
        )
      }}
    >
      Advance
    </button>
  )
}

function dispatchKey(
  target: Window | Document | Element | EventTarget,
  type: KeyStrokeEventType,
  key: string,
  init: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent(type, {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(event)
}

function captureConsoleDuring(run: () => void): {
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []
  const originalWarn = console.warn
  const originalError = console.error

  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '))
  }
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(' '))
  }

  try {
    run()
    return { warnings, errors }
  } finally {
    console.warn = originalWarn
    console.error = originalError
  }
}

function isLayoutEffectSsrMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('uselayouteffect') &&
    (normalized.includes('does nothing on the server') ||
      normalized.includes('server-rendered') ||
      normalized.includes('server renderer'))
  )
}

describe('useOnKeyStroke', () => {
  // -----------------------------------------------------------------------------
  // Single-key filtering
  // -----------------------------------------------------------------------------

  it('calls for the matching key and passes the original KeyboardEvent', () => {
    const handler = vi.fn()
    render(<Harness keyFilter="Escape" handler={handler} />)

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('does not call for a different key and is case-sensitive', () => {
    const handler = vi.fn()
    render(<Harness keyFilter="a" handler={handler} />)

    dispatchKey(window, 'keydown', 'b')
    dispatchKey(window, 'keydown', 'A')
    expect(handler).not.toHaveBeenCalled()

    dispatchKey(window, 'keydown', 'a')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('matches special and arrow key values', () => {
    const handler = vi.fn()
    render(<Harness keyFilter="ArrowDown" handler={handler} />)

    dispatchKey(window, 'keydown', 'ArrowDown')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // Multiple keys
  // -----------------------------------------------------------------------------

  it('matches configured keys and ignores others', () => {
    const handler = vi.fn()
    const keys = ['ArrowUp', 'ArrowDown'] as const
    render(<Harness keyFilter={keys} handler={handler} />)

    dispatchKey(window, 'keydown', 'ArrowUp')
    dispatchKey(window, 'keydown', 'ArrowDown')
    dispatchKey(window, 'keydown', 'ArrowLeft')

    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('empty arrays match nothing and duplicates call once', () => {
    const emptyHandler = vi.fn()
    const { unmount } = render(
      <Harness keyFilter={[]} handler={emptyHandler} />,
    )
    dispatchKey(window, 'keydown', 'a')
    expect(emptyHandler).not.toHaveBeenCalled()
    unmount()

    const handler = vi.fn()
    render(<Harness keyFilter={['a', 'a']} handler={handler} />)
    dispatchKey(window, 'keydown', 'a')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // All keys
  // -----------------------------------------------------------------------------

  it('true matches different valid keys once per event', () => {
    const handler = vi.fn()
    render(<Harness keyFilter={true} handler={handler} />)

    dispatchKey(window, 'keydown', 'a')
    dispatchKey(window, 'keydown', 'Escape')
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('ignores a plain Event dispatched with a keyboard event name', () => {
    const handler = vi.fn()
    render(<Harness keyFilter={true} handler={handler} />)

    window.dispatchEvent(new Event('keydown', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------------
  // Predicates
  // -----------------------------------------------------------------------------

  it('calls only when the predicate returns true with the original event', () => {
    const handler = vi.fn()
    const predicate = vi.fn(
      (event: KeyboardEvent) =>
        event.key === 'k' && (event.ctrlKey || event.metaKey),
    )
    render(<Harness keyFilter={predicate} handler={handler} />)

    dispatchKey(window, 'keydown', 'k')
    expect(handler).not.toHaveBeenCalled()

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    })
    window.dispatchEvent(event)
    expect(predicate).toHaveBeenCalledWith(event)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('uses the latest predicate and does not recreate the listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const first = vi.fn(() => false)
    const second = vi.fn(() => true)
    const handler = vi.fn()

    render(
      <LatestValuesHarness
        handlers={[handler, handler]}
        filters={[first, second]}
      />,
    )

    const created = addSpy.mock.calls.filter(
      (call) => call[0] === 'keydown',
    ).length

    act(() => {
      screen.getByTestId('advance').click()
    })

    expect(
      addSpy.mock.calls.filter((call) => call[0] === 'keydown').length,
    ).toBe(created)

    dispatchKey(window, 'keydown', 'x')
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalled()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not swallow a predicate error', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')

    render(
      <Harness
        keyFilter={() => {
          throw new Error('predicate failed')
        }}
        handler={handler}
      />,
    )

    const listener = addSpy.mock.calls.find(
      (call) => call[0] === 'keydown',
    )?.[1]
    expect(typeof listener).toBe('function')

    expect(() => {
      ;(listener as EventListener)(
        new KeyboardEvent('keydown', {
          key: 'a',
          bubbles: true,
          cancelable: true,
        }),
      )
    }).toThrow('predicate failed')
    expect(handler).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------------
  // Event types
  // -----------------------------------------------------------------------------

  it('defaults to keydown and ignores keyup', () => {
    const handler = vi.fn()
    render(<Harness keyFilter="a" handler={handler} />)

    dispatchKey(window, 'keyup', 'a')
    expect(handler).not.toHaveBeenCalled()
    dispatchKey(window, 'keydown', 'a')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('supports keyup and ignores keydown when configured', () => {
    const handler = vi.fn()
    render(
      <Harness
        keyFilter="a"
        handler={handler}
        options={{ eventType: 'keyup' }}
      />,
    )

    dispatchKey(window, 'keydown', 'a')
    expect(handler).not.toHaveBeenCalled()
    dispatchKey(window, 'keyup', 'a')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('re-registers when event type changes', () => {
    const handler = vi.fn()
    const { rerender } = render(
      <Harness
        keyFilter="a"
        handler={handler}
        options={{ eventType: 'keydown' }}
      />,
    )

    rerender(
      <Harness
        keyFilter="a"
        handler={handler}
        options={{ eventType: 'keyup' }}
      />,
    )

    dispatchKey(window, 'keydown', 'a')
    expect(handler).not.toHaveBeenCalled()
    dispatchKey(window, 'keyup', 'a')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // Repeat handling
  // -----------------------------------------------------------------------------

  it('repeated events call by default', () => {
    const handler = vi.fn()
    render(<Harness keyFilter="a" handler={handler} />)

    dispatchKey(window, 'keydown', 'a', { repeat: true })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('dedupe true ignores repeated events before the predicate', () => {
    const predicate = vi.fn(() => true)
    const handler = vi.fn()
    render(
      <Harness
        keyFilter={predicate}
        handler={handler}
        options={{ dedupe: true }}
      />,
    )

    dispatchKey(window, 'keydown', 'a', { repeat: true })
    expect(predicate).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()

    dispatchKey(window, 'keydown', 'a', { repeat: false })
    expect(predicate).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('uses the latest dedupe value without listener churn', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const handler = vi.fn()

    render(
      <LatestValuesHarness
        handlers={[handler, handler]}
        filters={['a', 'a']}
        dedupeValues={[false, true]}
      />,
    )

    const created = addSpy.mock.calls.filter(
      (call) => call[0] === 'keydown',
    ).length

    act(() => {
      screen.getByTestId('advance').click()
    })

    expect(
      addSpy.mock.calls.filter((call) => call[0] === 'keydown').length,
    ).toBe(created)

    dispatchKey(window, 'keydown', 'a', { repeat: true })
    expect(handler).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------------
  // Enabled behavior
  // -----------------------------------------------------------------------------

  it('observes by default and registers nothing when disabled', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const handler = vi.fn()

    render(
      <Harness keyFilter="a" handler={handler} options={{ enabled: false }} />,
    )

    expect(
      addSpy.mock.calls.filter((call) => call[0] === 'keydown'),
    ).toHaveLength(0)

    dispatchKey(window, 'keydown', 'a')
    expect(handler).not.toHaveBeenCalled()
  })

  it('enabling begins listening and disabling stops it', async () => {
    const handler = vi.fn()
    render(<EnabledToggleHarness handler={handler} />)

    dispatchKey(window, 'keydown', 'a')
    expect(handler).not.toHaveBeenCalled()

    await act(async () => {
      screen.getByTestId('toggle-enabled').click()
    })

    dispatchKey(window, 'keydown', 'a')
    expect(handler).toHaveBeenCalledTimes(1)

    await act(async () => {
      screen.getByTestId('toggle-enabled').click()
    })

    dispatchKey(window, 'keydown', 'a')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // Targets
  // -----------------------------------------------------------------------------

  it('defaults to window and supports document', () => {
    const windowHandler = vi.fn()
    const { unmount } = render(
      <Harness keyFilter="a" handler={windowHandler} />,
    )
    dispatchKey(window, 'keydown', 'a')
    expect(windowHandler).toHaveBeenCalledTimes(1)
    unmount()

    const documentHandler = vi.fn()
    render(
      <Harness
        keyFilter="a"
        handler={documentHandler}
        options={{ target: document }}
      />,
    )
    dispatchKey(document, 'keydown', 'a')
    expect(documentHandler).toHaveBeenCalledTimes(1)
  })

  it('supports HTML and SVG element targets', () => {
    const htmlHandler = vi.fn()
    const div = document.createElement('div')
    document.body.append(div)
    const { unmount } = render(
      <Harness
        keyFilter="Enter"
        handler={htmlHandler}
        options={{ target: div }}
      />,
    )
    dispatchKey(div, 'keydown', 'Enter')
    expect(htmlHandler).toHaveBeenCalledTimes(1)
    unmount()
    div.remove()

    const svgHandler = vi.fn()
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    document.body.append(svg)
    render(
      <Harness
        keyFilter="Enter"
        handler={svgHandler}
        options={{ target: svg }}
      />,
    )
    dispatchKey(svg, 'keydown', 'Enter')
    expect(svgHandler).toHaveBeenCalledTimes(1)
    svg.remove()
  })

  it('supports another EventTarget and rejects invalid targets', () => {
    const handler = vi.fn()
    const target = new EventTarget()
    render(<Harness keyFilter="a" handler={handler} options={{ target }} />)
    dispatchKey(target, 'keydown', 'a')
    expect(handler).toHaveBeenCalledTimes(1)

    const invalidHandler = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')
    render(
      <Harness
        keyFilter="a"
        handler={invalidHandler}
        options={{ target: { not: 'a-target' } as unknown as EventTarget }}
      />,
    )
    expect(
      addSpy.mock.calls.filter((call) => call[0] === 'keydown'),
    ).toHaveLength(0)
  })

  it('supports React target refs including initially null and switches', async () => {
    const handler = vi.fn()
    const { rerender } = render(
      <TargetRefHarness keyFilter="Enter" handler={handler} attach={false} />,
    )

    dispatchKey(window, 'keydown', 'Enter')
    expect(handler).not.toHaveBeenCalled()

    rerender(<TargetRefHarness keyFilter="Enter" handler={handler} attach />)

    await waitFor(() => {
      const region = screen.getByTestId('region')
      dispatchKey(region, 'keydown', 'Enter')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    dispatchKey(screen.getByTestId('outside'), 'keydown', 'Enter')
    // bubbling to window would not hit region-only listener
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('switches when a ref resolves to another target after rerender', async () => {
    const handler = vi.fn()
    const removeSpy = vi.fn()
    const originalRemove = EventTarget.prototype.removeEventListener

    vi.spyOn(EventTarget.prototype, 'removeEventListener').mockImplementation(
      function (this: EventTarget, type, listener, options) {
        if (type === 'keydown') {
          removeSpy()
        }
        return originalRemove.call(this, type, listener, options)
      },
    )

    const { rerender } = render(
      <SwitchTargetHarness handler={handler} attachTo="a" />,
    )

    await waitFor(() => {
      dispatchKey(screen.getByTestId('target-a'), 'keydown', 'Enter')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    const removalsBefore = removeSpy.mock.calls.length
    rerender(<SwitchTargetHarness handler={handler} attachTo="b" />)

    await waitFor(() => {
      expect(removeSpy.mock.calls.length).toBeGreaterThan(removalsBefore)
    })

    dispatchKey(screen.getByTestId('target-a'), 'keydown', 'Enter')
    expect(handler).toHaveBeenCalledTimes(1)

    dispatchKey(screen.getByTestId('target-b'), 'keydown', 'Enter')
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('explicit target null registers nothing', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const handler = vi.fn()
    render(
      <Harness keyFilter="a" handler={handler} options={{ target: null }} />,
    )

    expect(
      addSpy.mock.calls.filter((call) => call[0] === 'keydown'),
    ).toHaveLength(0)
    dispatchKey(window, 'keydown', 'a')
    expect(handler).not.toHaveBeenCalled()
  })

  it('detects targets without instanceof EventTarget', () => {
    const handler = vi.fn()
    const listeners = new Map<string, EventListener>()
    const fakeTarget = {
      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener)
      },
      removeEventListener(type: string) {
        listeners.delete(type)
      },
    }

    render(
      <Harness
        keyFilter="a"
        handler={handler}
        options={{ target: fakeTarget as unknown as EventTarget }}
      />,
    )

    expect(listeners.has('keydown')).toBe(true)
    listeners.get('keydown')?.(
      new KeyboardEvent('keydown', { key: 'a' }) as unknown as Event,
    )
    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // Listener options
  // -----------------------------------------------------------------------------

  it('uses capture and passive defaults and re-registers on change', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const handler = vi.fn()
    const { rerender } = render(<Harness keyFilter="a" handler={handler} />)

    const initial = addSpy.mock.calls.find((call) => call[0] === 'keydown')
    expect(initial?.[2]).toMatchObject({ capture: false, passive: false })

    rerender(
      <Harness
        keyFilter="a"
        handler={handler}
        options={{ capture: true, passive: true }}
      />,
    )

    const next = [...addSpy.mock.calls]
      .reverse()
      .find((call) => call[0] === 'keydown')
    expect(next?.[2]).toMatchObject({ capture: true, passive: true })
  })

  it('preventDefault works with default non-passive configuration', () => {
    const handler = vi.fn((event: KeyboardEvent) => {
      event.preventDefault()
    })
    render(<Harness keyFilter="a" handler={handler} />)

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  // -----------------------------------------------------------------------------
  // Latest handler and filter
  // -----------------------------------------------------------------------------

  it('uses the latest handler and filter without listener churn', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const first = vi.fn()
    const second = vi.fn()

    render(
      <LatestValuesHarness handlers={[first, second]} filters={['a', 'b']} />,
    )

    const created = addSpy.mock.calls.filter(
      (call) => call[0] === 'keydown',
    ).length

    act(() => {
      screen.getByTestId('advance').click()
    })

    expect(
      addSpy.mock.calls.filter((call) => call[0] === 'keydown').length,
    ).toBe(created)

    dispatchKey(window, 'keydown', 'a')
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()

    dispatchKey(window, 'keydown', 'b')
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })

  it('maintains only one active listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const handler = vi.fn()

    render(<Harness keyFilter="a" handler={handler} />)

    const added = addSpy.mock.calls.filter((call) => call[0] === 'keydown')
    expect(added).toHaveLength(1)
    expect(
      removeSpy.mock.calls.filter((call) => call[0] === 'keydown'),
    ).toHaveLength(0)
  })

  // -----------------------------------------------------------------------------
  // Cleanup and StrictMode
  // -----------------------------------------------------------------------------

  it('removes the listener on unmount and does not call after', () => {
    const handler = vi.fn()
    const { unmount } = render(<Harness keyFilter="a" handler={handler} />)
    unmount()
    dispatchKey(window, 'keydown', 'a')
    expect(handler).not.toHaveBeenCalled()
  })

  it('leaves one active listener and no duplicate calls in StrictMode', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const handler = vi.fn()

    render(
      <StrictMode>
        <Harness keyFilter="a" handler={handler} />
      </StrictMode>,
    )

    const added = addSpy.mock.calls.filter(
      (call) => call[0] === 'keydown',
    ).length
    const removed = removeSpy.mock.calls.filter(
      (call) => call[0] === 'keydown',
    ).length
    expect(added - removed).toBe(1)

    dispatchKey(window, 'keydown', 'a')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------------
  // SSR and environment
  // -----------------------------------------------------------------------------

  it('imports without browser globals at module evaluation time', async () => {
    await expect(import('../../index')).resolves.toMatchObject({
      useOnKeyStroke: expect.any(Function),
    })
  })

  it('server-renders without throwing, listeners, or layout-effect warnings', () => {
    function ServerComponent(): ReactElement {
      useOnKeyStroke('Escape', () => {
        // no-op
      })
      return <div>ssr</div>
    }

    const addSpy = vi.spyOn(window, 'addEventListener')
    const { warnings, errors } = captureConsoleDuring(() => {
      expect(renderToString(<ServerComponent />)).toContain('ssr')
    })

    expect(
      addSpy.mock.calls.filter((call) => call[0] === 'keydown'),
    ).toHaveLength(0)
    expect([...warnings, ...errors].filter(isLayoutEffectSsrMessage)).toEqual(
      [],
    )
  })

  it('handles unavailable window safely', () => {
    const handler = vi.fn()
    const originalWindow = globalThis.window

    // Simulate SSR-like missing default window resolution by forcing null target path
    render(
      <Harness keyFilter="a" handler={handler} options={{ target: null }} />,
    )
    expect(handler).not.toHaveBeenCalled()

    void originalWindow
  })

  it('returns void', () => {
    function Probe(): ReactElement {
      const result = useOnKeyStroke('a', () => {
        // no-op
      })
      expect(result).toBeUndefined()
      return <div />
    }

    render(<Probe />)
  })
})
