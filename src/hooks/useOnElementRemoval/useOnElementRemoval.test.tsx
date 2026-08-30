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
  useOnElementRemoval,
  type UseOnElementRemovalHandler,
  type UseOnElementRemovalOptions,
} from './useOnElementRemoval'

const NativeMutationObserver = window.MutationObserver

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  window.MutationObserver = NativeMutationObserver
})

function DirectTargetHarness({
  handler,
  options,
  elementRef,
}: {
  handler: UseOnElementRemovalHandler<HTMLDivElement>
  options?: UseOnElementRemovalOptions
  elementRef?: RefObject<HTMLDivElement | null>
}): ReactElement {
  const localRef = useRef<HTMLDivElement>(null)
  const ref = elementRef ?? localRef

  useOnElementRemoval(ref, handler, options)

  return (
    <div data-testid="host">
      <div ref={ref} data-testid="target">
        Target
        <span data-testid="descendant">Descendant</span>
      </div>
      <div data-testid="sibling">Sibling</div>
    </div>
  )
}

function AncestorHarness({
  handler,
}: {
  handler: UseOnElementRemovalHandler<HTMLDivElement>
}): ReactElement {
  const targetRef = useRef<HTMLDivElement>(null)

  useOnElementRemoval(targetRef, handler)

  return (
    <div data-testid="root">
      <div data-testid="ancestor">
        <div data-testid="shell">
          <div ref={targetRef} data-testid="nested-target">
            Nested target
          </div>
        </div>
      </div>
      <div data-testid="unrelated-sibling">Unrelated</div>
    </div>
  )
}

function EnabledToggleHarness({
  handler,
  initialEnabled = false,
}: {
  handler: UseOnElementRemovalHandler<HTMLDivElement>
  initialEnabled?: boolean
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(initialEnabled)

  useOnElementRemoval(ref, handler, { enabled })

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

function SwitchTargetHarness({
  handler,
  attachTo,
}: {
  handler: UseOnElementRemovalHandler<HTMLDivElement>
  attachTo: 'a' | 'b'
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useOnElementRemoval(ref, handler)

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

function LatestHandlerHarness({
  handlers,
}: {
  handlers: Array<UseOnElementRemovalHandler<HTMLDivElement>>
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  useOnElementRemoval(ref, handlers[index]!)

  return (
    <div>
      <div ref={ref} data-testid="target">
        Target
      </div>
      <button
        type="button"
        data-testid="next-handler"
        onClick={() => {
          setIndex((value) => Math.min(value + 1, handlers.length - 1))
        }}
      >
        Next handler
      </button>
    </div>
  )
}

function SvgHarness({
  handler,
}: {
  handler: UseOnElementRemovalHandler<SVGRectElement>
}): ReactElement {
  const ref = useRef<SVGRectElement>(null)

  useOnElementRemoval(ref, handler)

  return (
    <svg data-testid="svg-root" width="40" height="40">
      <rect
        ref={ref}
        data-testid="svg-target"
        x="4"
        y="4"
        width="32"
        height="32"
      />
    </svg>
  )
}

function NullRefHarness({
  handler,
}: {
  handler: UseOnElementRemovalHandler<HTMLDivElement>
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  useOnElementRemoval(ref, handler)
  return <div data-testid="without-target">No target attached</div>
}

function DisconnectedAtSetupHarness({
  handler,
}: {
  handler: UseOnElementRemovalHandler<HTMLDivElement>
}): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null)

  if (ref.current == null) {
    const orphan = document.createElement('div')
    orphan.dataset.testid = 'orphan'
    ref.current = orphan
  }

  useOnElementRemoval(ref, handler)

  return <div data-testid="host">Host without attached orphan</div>
}

function installTrackingMutationObserver() {
  const construct = vi.fn()
  const disconnect = vi.fn()
  const observe = vi.fn()
  const observeTargets: Node[] = []

  vi.stubGlobal(
    'MutationObserver',
    class {
      constructor(callback: MutationCallback) {
        construct()
        const real = new NativeMutationObserver(callback)
        this.observe = (target: Node, options?: MutationObserverInit) => {
          observe()
          observeTargets.push(target)
          real.observe(target, options)
        }
        this.disconnect = () => {
          disconnect()
          real.disconnect()
        }
        this.takeRecords = () => real.takeRecords()
      }

      observe!: MutationObserver['observe']
      disconnect!: MutationObserver['disconnect']
      takeRecords!: MutationObserver['takeRecords']
    },
  )

  return { construct, disconnect, observe, observeTargets }
}

describe('useOnElementRemoval', () => {
  // -----------------------------------------------------------------------------
  // Basic removal
  // -----------------------------------------------------------------------------

  it('calls the handler when the target is removed directly', async () => {
    const handler = vi.fn()
    render(<DirectTargetHarness handler={handler} />)

    const target = screen.getByTestId('target')
    target.remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  it('passes the exact removed element to the handler', async () => {
    const handler = vi.fn()
    render(<DirectTargetHarness handler={handler} />)

    const target = screen.getByTestId('target')
    target.remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledWith(target)
    })
  })

  it('calls the handler once and does not call again after completion', async () => {
    const handler = vi.fn()
    render(<DirectTargetHarness handler={handler} />)

    screen.getByTestId('target').remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1)
    })

    screen.getByTestId('sibling').remove()
    await act(async () => {
      await Promise.resolve()
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('disconnects the observer after detection', async () => {
    const { disconnect, observe } = installTrackingMutationObserver()
    const handler = vi.fn()
    render(<DirectTargetHarness handler={handler} />)

    await waitFor(() => {
      expect(observe).toHaveBeenCalled()
    })

    const disconnectCallsBefore = disconnect.mock.calls.length
    screen.getByTestId('target').remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1)
    })

    expect(disconnect.mock.calls.length).toBeGreaterThan(disconnectCallsBefore)
  })

  // -----------------------------------------------------------------------------
  // Ancestor removal
  // -----------------------------------------------------------------------------

  it('calls the handler when an ancestor containing the target is removed', async () => {
    const handler = vi.fn()
    render(<AncestorHarness handler={handler} />)

    const target = screen.getByTestId('nested-target')
    screen.getByTestId('ancestor').remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledWith(target)
    })
  })

  it('detects deeply nested ancestor removal', async () => {
    const handler = vi.fn()
    render(<AncestorHarness handler={handler} />)

    const target = screen.getByTestId('nested-target')
    screen.getByTestId('shell').remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledWith(target)
    })
  })

  it('detects the target among multiple removed nodes', async () => {
    const handler = vi.fn()
    render(<DirectTargetHarness handler={handler} />)

    const host = screen.getByTestId('host')
    const target = screen.getByTestId('target')

    host.replaceChildren()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledWith(target)
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('detects removal across multiple mutation records', async () => {
    const handler = vi.fn()
    render(<AncestorHarness handler={handler} />)

    const target = screen.getByTestId('nested-target')
    const shell = screen.getByTestId('shell')

    screen.getByTestId('ancestor').remove()
    screen.getByTestId('unrelated-sibling').remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledWith(target)
    })
    expect(shell.isConnected).toBe(false)
  })

  // -----------------------------------------------------------------------------
  // Unrelated mutations
  // -----------------------------------------------------------------------------

  it('does not call for unrelated sibling removal', async () => {
    const handler = vi.fn()
    render(<DirectTargetHarness handler={handler} />)

    screen.getByTestId('sibling').remove()

    await act(async () => {
      await Promise.resolve()
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not call when a descendant is removed from inside the target', async () => {
    const handler = vi.fn()
    render(<DirectTargetHarness handler={handler} />)

    screen.getByTestId('descendant').remove()

    await act(async () => {
      await Promise.resolve()
    })

    expect(handler).not.toHaveBeenCalled()
    expect(screen.getByTestId('target').isConnected).toBe(true)
  })

  it('does not call for attribute changes', async () => {
    const handler = vi.fn()
    render(<DirectTargetHarness handler={handler} />)

    screen.getByTestId('target').setAttribute('data-changed', '1')

    await act(async () => {
      await Promise.resolve()
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not call for text changes', async () => {
    const handler = vi.fn()
    render(<DirectTargetHarness handler={handler} />)

    screen.getByTestId('target').append(' more text')

    await act(async () => {
      await Promise.resolve()
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not call while the target remains connected', async () => {
    const handler = vi.fn()
    render(<DirectTargetHarness handler={handler} />)

    const target = screen.getByTestId('target')
    screen.getByTestId('host').append(document.createElement('div'))

    await act(async () => {
      await Promise.resolve()
    })

    expect(handler).not.toHaveBeenCalled()
    expect(target.isConnected).toBe(true)
  })

  // -----------------------------------------------------------------------------
  // Enabled behavior
  // -----------------------------------------------------------------------------

  it('observes by default', async () => {
    const handler = vi.fn()
    render(<DirectTargetHarness handler={handler} />)

    screen.getByTestId('target').remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  it('does not create an observer when enabled is false', async () => {
    const { construct } = installTrackingMutationObserver()

    render(
      <DirectTargetHarness handler={vi.fn()} options={{ enabled: false }} />,
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(construct).not.toHaveBeenCalled()
  })

  it('starts observing when changed from disabled to enabled', async () => {
    const handler = vi.fn()
    render(<EnabledToggleHarness handler={handler} initialEnabled={false} />)

    await act(async () => {
      screen.getByTestId('toggle-enabled').click()
    })

    screen.getByTestId('target').remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  it('stops observing when changed from enabled to disabled', async () => {
    const handler = vi.fn()
    render(<EnabledToggleHarness handler={handler} initialEnabled />)

    await act(async () => {
      screen.getByTestId('toggle-enabled').click()
    })

    screen.getByTestId('target').remove()

    await act(async () => {
      await Promise.resolve()
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not invoke after being disabled', async () => {
    const handler = vi.fn()
    render(<EnabledToggleHarness handler={handler} initialEnabled />)

    await act(async () => {
      screen.getByTestId('toggle-enabled').click()
    })

    screen.getByTestId('target').remove()

    await act(async () => {
      await Promise.resolve()
    })

    expect(handler).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------------
  // Ref and element behavior
  // -----------------------------------------------------------------------------

  it('handles an initially null ref safely', () => {
    const handler = vi.fn()
    expect(() => render(<NullRefHarness handler={handler} />)).not.toThrow()
    expect(handler).not.toHaveBeenCalled()
  })

  it('observes the element available after commit', async () => {
    const handler = vi.fn()
    render(<DirectTargetHarness handler={handler} />)

    screen.getByTestId('target').remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  it('switches observation when rerender assigns a different element', async () => {
    const handler = vi.fn()
    const { rerender } = render(
      <SwitchTargetHarness handler={handler} attachTo="a" />,
    )

    rerender(<SwitchTargetHarness handler={handler} attachTo="b" />)

    const targetA = screen.getByTestId('target-a')
    targetA.remove()

    await act(async () => {
      await Promise.resolve()
    })
    expect(handler).not.toHaveBeenCalled()

    const targetB = screen.getByTestId('target-b')
    targetB.remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(targetB)
    })
  })

  it('disconnects the previous observer when switching targets', async () => {
    const { disconnect } = installTrackingMutationObserver()
    const handler = vi.fn()
    const { rerender } = render(
      <SwitchTargetHarness handler={handler} attachTo="a" />,
    )

    await waitFor(() => {
      expect(disconnect).toHaveBeenCalledTimes(0)
    })

    const before = disconnect.mock.calls.length
    rerender(<SwitchTargetHarness handler={handler} attachTo="b" />)

    await waitFor(() => {
      expect(disconnect.mock.calls.length).toBeGreaterThan(before)
    })
  })

  it('uses the captured element after its ref has been cleared', async () => {
    const handler = vi.fn()
    const elementRef: RefObject<HTMLDivElement | null> = {
      current: null,
    }

    render(<DirectTargetHarness handler={handler} elementRef={elementRef} />)

    const target = screen.getByTestId('target')
    expect(elementRef.current).toBe(target)

    target.remove()
    elementRef.current = null

    await waitFor(() => {
      expect(handler).toHaveBeenCalledWith(target)
    })
  })

  it('supports SVGElement targets', async () => {
    const handler = vi.fn()
    render(<SvgHarness handler={handler} />)

    const target = screen.getByTestId('svg-target')
    target.remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledWith(target)
    })
  })

  it('uses the target owning document for observation', async () => {
    const { observeTargets } = installTrackingMutationObserver()

    render(<DirectTargetHarness handler={vi.fn()} />)

    await waitFor(() => {
      expect(observeTargets.length).toBeGreaterThan(0)
    })

    expect(observeTargets.at(-1)).toBe(document)
  })

  it('handles an already disconnected target safely', async () => {
    const { construct } = installTrackingMutationObserver()
    const handler = vi.fn()

    expect(() =>
      render(<DisconnectedAtSetupHarness handler={handler} />),
    ).not.toThrow()

    await act(async () => {
      await Promise.resolve()
    })

    expect(construct).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------------
  // Handler lifecycle
  // -----------------------------------------------------------------------------

  it('uses the latest handler after rerender and does not call a stale handler', async () => {
    const first = vi.fn()
    const second = vi.fn()
    render(<LatestHandlerHarness handlers={[first, second]} />)

    await act(async () => {
      screen.getByTestId('next-handler').click()
    })

    screen.getByTestId('target').remove()

    await waitFor(() => {
      expect(second).toHaveBeenCalledTimes(1)
    })
    expect(first).not.toHaveBeenCalled()
  })

  it('does not recreate the observer only because handler identity changes', async () => {
    const { construct } = installTrackingMutationObserver()

    function HandlerChurn(): ReactElement {
      const ref = useRef<HTMLDivElement>(null)
      const [, setTick] = useState(0)
      useOnElementRemoval(ref, () => {
        // new function each render
      })
      return (
        <div>
          <div ref={ref} data-testid="target">
            Target
          </div>
          <button
            type="button"
            data-testid="rerender"
            onClick={() => {
              setTick((value) => value + 1)
            }}
          >
            Rerender
          </button>
        </div>
      )
    }

    render(<HandlerChurn />)

    await waitFor(() => {
      expect(construct.mock.calls.length).toBeGreaterThan(0)
    })

    const created = construct.mock.calls.length

    await act(async () => {
      screen.getByTestId('rerender').click()
      screen.getByTestId('rerender').click()
    })

    expect(construct.mock.calls.length).toBe(created)
  })

  // -----------------------------------------------------------------------------
  // Cleanup and StrictMode
  // -----------------------------------------------------------------------------

  it('disconnects on unmount and does not call after unmount', async () => {
    const handler = vi.fn()
    const { unmount } = render(<DirectTargetHarness handler={handler} />)
    const target = screen.getByTestId('target')

    unmount()
    target.remove()

    await act(async () => {
      await Promise.resolve()
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('leaves no duplicate observers and does not duplicate calls in StrictMode', async () => {
    const { construct, disconnect } = installTrackingMutationObserver()
    const handler = vi.fn()

    render(
      <StrictMode>
        <DirectTargetHarness handler={handler} />
      </StrictMode>,
    )

    await waitFor(() => {
      expect(construct.mock.calls.length).toBeGreaterThan(0)
    })

    const activeObservers =
      construct.mock.calls.length - disconnect.mock.calls.length
    expect(activeObservers).toBe(1)

    screen.getByTestId('target').remove()

    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  it('cleans up observers after option and target changes', async () => {
    const { disconnect } = installTrackingMutationObserver()
    const handler = vi.fn()
    const { rerender } = render(
      <DirectTargetHarness handler={handler} options={{ enabled: true }} />,
    )

    await waitFor(() => {
      expect(disconnect).toHaveBeenCalledTimes(0)
    })

    rerender(
      <DirectTargetHarness handler={handler} options={{ enabled: false }} />,
    )

    await waitFor(() => {
      expect(disconnect.mock.calls.length).toBeGreaterThan(0)
    })
  })

  // -----------------------------------------------------------------------------
  // Environment safety
  // -----------------------------------------------------------------------------

  it('handles missing MutationObserver safely', () => {
    vi.stubGlobal('MutationObserver', undefined)

    const handler = vi.fn()
    expect(() =>
      render(<DirectTargetHarness handler={handler} />),
    ).not.toThrow()
    expect(handler).not.toHaveBeenCalled()
  })

  it('handles missing defaultView safely', async () => {
    const handler = vi.fn()

    Object.defineProperty(document, 'defaultView', {
      configurable: true,
      get: () => null,
    })

    expect(() =>
      render(<DirectTargetHarness handler={handler} />),
    ).not.toThrow()

    await act(async () => {
      await Promise.resolve()
    })

    expect(handler).not.toHaveBeenCalled()

    Object.defineProperty(document, 'defaultView', {
      configurable: true,
      get: () => window,
    })
  })

  // -----------------------------------------------------------------------------
  // SSR / import safety
  // -----------------------------------------------------------------------------

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

  it('imports without requiring DOM globals at module evaluation time', async () => {
    await expect(import('../../index')).resolves.toMatchObject({
      useOnElementRemoval: expect.any(Function),
    })
  })

  it('server-renders a component that calls the hook without throwing', () => {
    function ServerComponent(): ReactElement {
      const ref = useRef<HTMLDivElement>(null)
      useOnElementRemoval(ref, () => {
        // no-op
      })
      return <div ref={ref}>host</div>
    }

    const { warnings, errors } = captureConsoleDuring(() => {
      expect(() => renderToString(<ServerComponent />)).not.toThrow()
      expect(renderToString(<ServerComponent />)).toContain('host')
    })

    expect(warnings.filter(isLayoutEffectSsrMessage)).toEqual([])
    expect(errors.filter(isLayoutEffectSsrMessage)).toEqual([])
  })

  it('does not emit layout-effect SSR warnings during server rendering', () => {
    function ServerComponent(): ReactElement {
      const ref = useRef<HTMLDivElement>(null)
      useOnElementRemoval(ref, () => {
        // no-op
      })
      return <div ref={ref}>host</div>
    }

    const { warnings, errors } = captureConsoleDuring(() => {
      renderToString(<ServerComponent />)
    })

    expect([...warnings, ...errors].filter(isLayoutEffectSsrMessage)).toEqual(
      [],
    )
  })

  it('does not instantiate MutationObserver during server rendering', () => {
    const { construct } = installTrackingMutationObserver()

    function ServerComponent(): ReactElement {
      const ref = useRef<HTMLDivElement>(null)
      useOnElementRemoval(ref, () => {
        // no-op
      })
      return <div ref={ref}>host</div>
    }

    construct.mockClear()
    const { warnings, errors } = captureConsoleDuring(() => {
      renderToString(<ServerComponent />)
    })

    expect(construct).not.toHaveBeenCalled()
    expect([...warnings, ...errors].filter(isLayoutEffectSsrMessage)).toEqual(
      [],
    )
  })

  it('does not access or mutate the document during server rendering', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild')

    function ServerComponent(): ReactElement {
      const ref = useRef<HTMLDivElement>(null)
      useOnElementRemoval(ref, () => {
        // no-op
      })
      return <div ref={ref}>host</div>
    }

    appendSpy.mockClear()
    renderToString(<ServerComponent />)

    expect(appendSpy).not.toHaveBeenCalled()
  })

  it('returns void', () => {
    function Probe(): ReactElement {
      const ref = useRef<HTMLDivElement>(null)
      const result = useOnElementRemoval(ref, () => {
        // no-op
      })
      expect(result).toBeUndefined()
      return <div ref={ref} />
    }

    render(<Probe />)
  })
})
