import { act, cleanup, render, screen } from '@testing-library/react'
import {
  StrictMode,
  createRef,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useFocusWithin, type UseFocusWithinOptions } from './useFocusWithin'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function dispatchFocusBoundary(
  target: Element,
  type: 'focusin' | 'focusout',
  relatedTarget: EventTarget | null = null,
): FocusEvent {
  const event = new FocusEvent(type, {
    bubbles: true,
    cancelable: false,
    relatedTarget: null,
  })

  Object.defineProperty(event, 'relatedTarget', {
    configurable: true,
    value: relatedTarget,
  })

  target.dispatchEvent(event)
  return event
}

function Harness({
  options,
  elementRef,
  tabIndex = undefined as number | undefined,
  children,
}: {
  options?: UseFocusWithinOptions
  elementRef?: RefObject<HTMLDivElement | null>
  tabIndex?: number
  children?: ReactElement
}): ReactElement {
  const localRef = useRef<HTMLDivElement>(null)
  const ref = elementRef ?? localRef
  const { focused } = useFocusWithin(ref, options)

  return (
    <div
      ref={ref}
      data-testid="target"
      data-focused={focused ? 'true' : 'false'}
      tabIndex={tabIndex}
    >
      {children ?? (
        <>
          <input data-testid="child-input" type="text" />
          <button data-testid="child-button" type="button">
            Child
          </button>
        </>
      )}
    </div>
  )
}

function readFocused(): boolean {
  return screen.getByTestId('target').getAttribute('data-focused') === 'true'
}

describe('useFocusWithin', () => {
  describe('initial state', () => {
    it('returns focused false and attaches focusin and focusout listeners', () => {
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')

      render(<Harness />)

      expect(readFocused()).toBe(false)
      expect(addSpy).toHaveBeenCalledWith('focusin', expect.any(Function))
      expect(addSpy).toHaveBeenCalledWith('focusout', expect.any(Function))
      expect(addSpy).not.toHaveBeenCalledWith('focus', expect.any(Function))
      expect(addSpy).not.toHaveBeenCalledWith('blur', expect.any(Function))
    })
  })

  describe('direct target focus', () => {
    it('tracks focus on the container itself', () => {
      render(
        <>
          <Harness tabIndex={0} />
          <button data-testid="outside-button" type="button">
            Outside
          </button>
        </>,
      )
      const target = screen.getByTestId('target')

      act(() => {
        target.focus()
      })
      expect(readFocused()).toBe(true)
      expect(target.ownerDocument.activeElement).toBe(target)

      act(() => {
        screen.getByTestId('outside-button').focus()
      })
      expect(readFocused()).toBe(false)
    })
  })

  describe('descendant focus', () => {
    it('returns true when a child input or button is focused', () => {
      render(<Harness />)

      act(() => {
        screen.getByTestId('child-input').focus()
      })
      expect(readFocused()).toBe(true)

      act(() => {
        screen.getByTestId('child-button').focus()
      })
      expect(readFocused()).toBe(true)
    })
  })

  describe('focus movement within', () => {
    it('does not become false while moving between descendants', () => {
      const observations: boolean[] = []

      function ObservingHarness(): ReactElement {
        const ref = useRef<HTMLDivElement>(null)
        const { focused } = useFocusWithin(ref)
        observations.push(focused)

        return (
          <div ref={ref} data-testid="target">
            <input data-testid="input-a" type="text" />
            <input data-testid="input-b" type="text" />
            <button data-testid="input-button" type="button">
              Go
            </button>
          </div>
        )
      }

      render(<ObservingHarness />)

      act(() => {
        screen.getByTestId('input-a').focus()
      })
      act(() => {
        screen.getByTestId('input-b').focus()
      })
      act(() => {
        screen.getByTestId('input-button').focus()
      })

      const firstTrueIndex = observations.findIndex((value) => value)
      expect(firstTrueIndex).toBeGreaterThanOrEqual(0)
      expect(observations.slice(firstTrueIndex).every((value) => value)).toBe(
        true,
      )
    })
  })

  describe('focus leaving target', () => {
    it('returns false when focus moves outside the container', () => {
      render(
        <>
          <Harness />
          <button data-testid="outside-button" type="button">
            Outside
          </button>
        </>,
      )

      act(() => {
        screen.getByTestId('child-input').focus()
      })
      expect(readFocused()).toBe(true)

      act(() => {
        screen.getByTestId('outside-button').focus()
      })
      expect(readFocused()).toBe(false)
    })
  })

  describe('relatedTarget handling', () => {
    it('handles internal, external, null, and non-element related targets safely', async () => {
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')

      render(
        <>
          <Harness tabIndex={0} />
          <button data-testid="outside-button" type="button">
            Outside
          </button>
        </>,
      )
      const child = screen.getByTestId('child-input')
      const focusOut = addSpy.mock.calls
        .filter(([name]) => name === 'focusout')
        .at(-1)?.[1] as EventListener | undefined
      expect(focusOut).toBeTypeOf('function')

      act(() => {
        child.focus()
      })
      expect(readFocused()).toBe(true)

      act(() => {
        dispatchFocusBoundary(child, 'focusout', child)
      })
      expect(readFocused()).toBe(true)

      act(() => {
        screen.getByTestId('outside-button').focus()
      })
      expect(readFocused()).toBe(false)

      act(() => {
        child.focus()
      })

      act(() => {
        dispatchFocusBoundary(child, 'focusout', null)
      })
      await flushMicrotasks()
      expect(readFocused()).toBe(true)

      act(() => {
        screen.getByTestId('outside-button').focus()
      })
      expect(readFocused()).toBe(false)

      act(() => {
        focusOut?.({ relatedTarget: document } as unknown as FocusEvent)
        focusOut?.({ relatedTarget: window } as unknown as FocusEvent)
        focusOut?.({
          relatedTarget: { nodeType: 'not-a-number' },
        } as unknown as FocusEvent)
      })
      expect(readFocused()).toBe(false)
    })
  })

  describe('null relatedTarget reconciliation', () => {
    it('invalidates deferred reconciliation on focusin, disable, replacement, and unmount', async () => {
      const { rerender, unmount } = render(
        <Harness options={{ enabled: true }} />,
      )
      const child = screen.getByTestId('child-input')

      act(() => {
        child.focus()
      })

      act(() => {
        dispatchFocusBoundary(child, 'focusout', null)
      })

      act(() => {
        dispatchFocusBoundary(child, 'focusin')
      })
      await flushMicrotasks()
      expect(readFocused()).toBe(true)

      act(() => {
        dispatchFocusBoundary(child, 'focusout', null)
      })
      rerender(<Harness options={{ enabled: false }} />)
      await flushMicrotasks()
      expect(readFocused()).toBe(false)

      rerender(<Harness options={{ enabled: true }} />)
      act(() => {
        child.focus()
      })
      act(() => {
        dispatchFocusBoundary(child, 'focusout', null)
      })
      unmount()
      await flushMicrotasks()
    })

    it('lets a newer focus transition win over an older queued reconciliation', async () => {
      render(
        <>
          <Harness />
          <button data-testid="outside-button" type="button">
            Outside
          </button>
        </>,
      )
      const child = screen.getByTestId('child-input')

      act(() => {
        child.focus()
      })
      act(() => {
        dispatchFocusBoundary(child, 'focusout', null)
      })
      act(() => {
        screen.getByTestId('outside-button').focus()
      })
      await flushMicrotasks()
      expect(readFocused()).toBe(false)
    })

    it('ignores deferred work after the target becomes null', async () => {
      function NullableHarness({
        showTarget,
      }: {
        showTarget: boolean
      }): ReactElement {
        const ref = useRef<HTMLDivElement | null>(null)
        const { focused } = useFocusWithin(ref)

        return (
          <>
            {showTarget ? (
              <div
                ref={ref}
                data-testid="target"
                data-focused={focused ? 'true' : 'false'}
              >
                <input data-testid="child-input" type="text" />
              </div>
            ) : (
              <div
                data-testid="target"
                data-focused={focused ? 'true' : 'false'}
              />
            )}
          </>
        )
      }

      const { rerender } = render(<NullableHarness showTarget />)
      const child = screen.getByTestId('child-input')

      act(() => {
        child.focus()
      })
      expect(readFocused()).toBe(true)

      act(() => {
        dispatchFocusBoundary(child, 'focusout', null)
      })
      rerender(<NullableHarness showTarget={false} />)
      await flushMicrotasks()
      expect(readFocused()).toBe(false)
    })

    it('ignores multiple deferred reconciliations from a discarded Strict Mode lifecycle', async () => {
      const observations: boolean[] = []

      function ObservingHarness(): ReactElement {
        const ref = useRef<HTMLDivElement>(null)
        const { focused } = useFocusWithin(ref)
        observations.push(focused)

        return (
          <div
            ref={ref}
            data-testid="target"
            data-focused={focused ? 'true' : 'false'}
          >
            <input data-testid="child-input" type="text" />
          </div>
        )
      }

      render(
        <StrictMode>
          <ObservingHarness />
        </StrictMode>,
      )

      const child = screen.getByTestId('child-input')
      act(() => {
        child.focus()
      })
      act(() => {
        dispatchFocusBoundary(child, 'focusout', null)
      })
      await flushMicrotasks()
      expect(readFocused()).toBe(true)
      expect(observations.at(-1)).toBe(true)
    })
  })

  describe('already-focused synchronization', () => {
    it('syncs true when a child is focused before listeners attach', () => {
      const ref = createRef<HTMLDivElement>()

      function RefCallbackHarness(): ReactElement {
        const { focused } = useFocusWithin(ref)

        return (
          <div
            ref={(node) => {
              ref.current = node
              if (node != null) {
                const input = node.querySelector('input')
                input?.focus()
              }
            }}
            data-testid="target"
            data-focused={focused ? 'true' : 'false'}
          >
            <input data-testid="child-input" type="text" />
          </div>
        )
      }

      render(<RefCallbackHarness />)
      expect(readFocused()).toBe(true)
    })

    it('syncs true after re-enable when a child remains focused', () => {
      const { rerender } = render(<Harness options={{ enabled: false }} />)

      act(() => {
        screen.getByTestId('child-input').focus()
      })
      expect(readFocused()).toBe(false)

      rerender(<Harness options={{ enabled: true }} />)
      expect(readFocused()).toBe(true)
    })
  })

  describe('enabled lifecycle', () => {
    it('does not attach listeners while disabled and preserves browser focus', () => {
      const { rerender } = render(<Harness options={{ enabled: false }} />)
      const target = screen.getByTestId('target')
      const addSpy = vi.spyOn(target, 'addEventListener')

      expect(
        addSpy.mock.calls.filter(([name]) => name === 'focusin'),
      ).toHaveLength(0)
      expect(readFocused()).toBe(false)

      act(() => {
        screen.getByTestId('child-input').focus()
      })
      expect(document.activeElement).toBe(screen.getByTestId('child-input'))

      rerender(<Harness options={{ enabled: true }} />)
      expect(readFocused()).toBe(true)
    })

    it('ignores stale focusin and focusout handlers after disable', () => {
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')
      const { rerender } = render(<Harness options={{ enabled: true }} />)
      const child = screen.getByTestId('child-input')
      const focusIn = addSpy.mock.calls
        .filter(([name]) => name === 'focusin')
        .at(-1)?.[1] as EventListener | undefined
      const focusOut = addSpy.mock.calls
        .filter(([name]) => name === 'focusout')
        .at(-1)?.[1] as EventListener | undefined

      act(() => {
        child.focus()
      })
      expect(readFocused()).toBe(true)

      rerender(<Harness options={{ enabled: false }} />)
      expect(readFocused()).toBe(false)

      act(() => {
        focusIn?.({} as unknown as FocusEvent)
        focusOut?.({ relatedTarget: null } as unknown as FocusEvent)
      })
      expect(readFocused()).toBe(false)
    })
  })

  describe('dynamic target replacement', () => {
    it('resets state and ignores stale events from the old target', async () => {
      function ReplacementHarness({
        attachTo,
      }: {
        attachTo: 'a' | 'b'
      }): ReactElement {
        const ref = useRef<HTMLDivElement | null>(null)
        const { focused } = useFocusWithin(ref)

        return (
          <div
            ref={ref}
            data-testid="target"
            data-focused={focused ? 'true' : 'false'}
          >
            {attachTo === 'a' ? (
              <input data-testid="target-a" type="text" />
            ) : (
              <input data-testid="target-b" type="text" />
            )}
          </div>
        )
      }

      const { rerender } = render(
        <>
          <ReplacementHarness attachTo="a" />
          <button data-testid="outside-button" type="button">
            Outside
          </button>
        </>,
      )
      const targetA = screen.getByTestId('target-a')

      act(() => {
        targetA.focus()
      })
      expect(readFocused()).toBe(true)

      act(() => {
        screen.getByTestId('outside-button').focus()
      })

      act(() => {
        rerender(
          <>
            <ReplacementHarness attachTo="b" />
            <button data-testid="outside-button" type="button">
              Outside
            </button>
          </>,
        )
      })
      expect(readFocused()).toBe(false)

      act(() => {
        dispatchFocusBoundary(targetA, 'focusin')
      })
      await flushMicrotasks()
      expect(readFocused()).toBe(false)
    })

    it('moves listeners from element A to element B without blurring A', () => {
      function DualTargetHarness({
        which,
      }: {
        which: 'a' | 'b'
      }): ReactElement {
        const refA = useRef<HTMLDivElement>(null)
        const refB = useRef<HTMLDivElement>(null)
        const { focused } = useFocusWithin(which === 'a' ? refA : refB)

        return (
          <>
            <div ref={refA} data-testid="panel-a" tabIndex={0}>
              A
            </div>
            <div ref={refB} data-testid="panel-b" tabIndex={0}>
              B
            </div>
            <div data-testid="focused-value">{String(focused)}</div>
          </>
        )
      }

      const { rerender } = render(<DualTargetHarness which="a" />)
      const panelA = screen.getByTestId('panel-a')
      const removeA = vi.spyOn(panelA, 'removeEventListener')
      const blurA = vi.spyOn(panelA, 'blur')

      act(() => {
        panelA.focus()
      })
      expect(screen.getByTestId('focused-value').textContent).toBe('true')

      rerender(<DualTargetHarness which="b" />)
      expect(removeA).toHaveBeenCalledWith('focusin', expect.any(Function))
      expect(removeA).toHaveBeenCalledWith('focusout', expect.any(Function))
      expect(blurA).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(panelA)
      expect(screen.getByTestId('focused-value').textContent).toBe('false')

      act(() => {
        screen.getByTestId('panel-b').focus()
      })
      expect(screen.getByTestId('focused-value').textContent).toBe('true')
    })

    it('attaches after a null ref becomes an element on a later commit', () => {
      function LateMountHarness({
        mounted,
      }: {
        mounted: boolean
      }): ReactElement {
        const ref = useRef<HTMLDivElement | null>(null)
        const { focused } = useFocusWithin(ref)

        return (
          <>
            {mounted ? (
              <div
                ref={ref}
                data-testid="target"
                data-focused={focused ? 'true' : 'false'}
              >
                <input data-testid="child-input" type="text" />
              </div>
            ) : (
              <div
                data-testid="target"
                data-focused={focused ? 'true' : 'false'}
              />
            )}
          </>
        )
      }

      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')
      const { rerender } = render(<LateMountHarness mounted={false} />)
      expect(readFocused()).toBe(false)
      const focusInBefore = addSpy.mock.calls.filter(
        ([name]) => name === 'focusin',
      ).length

      rerender(<LateMountHarness mounted />)
      const focusInAfter = addSpy.mock.calls.filter(
        ([name]) => name === 'focusin',
      ).length
      expect(focusInAfter).toBeGreaterThan(focusInBefore)

      act(() => {
        screen.getByTestId('child-input').focus()
      })
      expect(readFocused()).toBe(true)
    })
  })

  describe('nested transitions and render stability', () => {
    it('keeps true for nested descendant and target transitions without temporary false', () => {
      const observations: boolean[] = []

      function NestedHarness(): ReactElement {
        const ref = useRef<HTMLDivElement>(null)
        const { focused } = useFocusWithin(ref)
        observations.push(focused)

        return (
          <div ref={ref} data-testid="target" tabIndex={0}>
            <div>
              <input data-testid="nested-a" type="text" />
              <button data-testid="nested-b" type="button">
                Nested
              </button>
            </div>
          </div>
        )
      }

      render(<NestedHarness />)
      const target = screen.getByTestId('target')

      act(() => {
        screen.getByTestId('nested-a').focus()
      })
      act(() => {
        screen.getByTestId('nested-b').focus()
      })
      act(() => {
        target.focus()
      })
      act(() => {
        screen.getByTestId('nested-a').focus()
      })

      const firstTrueIndex = observations.findIndex((value) => value)
      expect(firstTrueIndex).toBeGreaterThanOrEqual(0)
      expect(observations.slice(firstTrueIndex).every((value) => value)).toBe(
        true,
      )
    })

    it('avoids unnecessary rerenders when synchronizing the same focused value', () => {
      const renders: boolean[] = []

      function CountHarness(): ReactElement {
        const ref = useRef<HTMLDivElement>(null)
        const { focused } = useFocusWithin(ref)
        renders.push(focused)

        return (
          <div ref={ref} data-testid="target" data-focused={String(focused)}>
            <input data-testid="child-input" type="text" />
          </div>
        )
      }

      render(<CountHarness />)
      const afterMount = renders.length

      act(() => {
        screen.getByTestId('child-input').focus()
      })
      const afterFocus = renders.length
      expect(afterFocus).toBeGreaterThan(afterMount)

      act(() => {
        dispatchFocusBoundary(screen.getByTestId('child-input'), 'focusin')
      })
      expect(renders.length).toBe(afterFocus)
    })
  })

  describe('svg targets', () => {
    it('tracks focus within an SVG container and focusable child', () => {
      function SvgHarness(): ReactElement {
        const ref = useRef<SVGSVGElement>(null)
        const { focused } = useFocusWithin(ref)

        return (
          <svg
            ref={ref}
            data-testid="target"
            data-focused={focused ? 'true' : 'false'}
          >
            <circle
              data-testid="svg-child"
              cx="10"
              cy="10"
              r="8"
              tabIndex={0}
            />
          </svg>
        )
      }

      render(<SvgHarness />)
      expect(readFocused()).toBe(false)

      act(() => {
        screen.getByTestId('svg-child').focus()
      })
      expect(readFocused()).toBe(true)
    })
  })

  describe('portal boundary', () => {
    it('does not count focus inside a portal rendered outside the target subtree', () => {
      function PortalHarness(): ReactElement {
        const ref = useRef<HTMLDivElement>(null)
        const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(
          null,
        )
        const { focused } = useFocusWithin(ref)

        return (
          <>
            <div
              ref={ref}
              data-testid="target"
              data-focused={focused ? 'true' : 'false'}
            >
              <input data-testid="inside-input" type="text" />
            </div>
            <div ref={setPortalRoot} data-testid="portal-root" />
            {portalRoot != null
              ? createPortal(
                  <input data-testid="portal-input" type="text" />,
                  portalRoot,
                )
              : null}
          </>
        )
      }

      render(<PortalHarness />)

      act(() => {
        screen.getByTestId('portal-input').focus()
      })
      expect(readFocused()).toBe(false)

      act(() => {
        screen.getByTestId('inside-input').focus()
      })
      expect(readFocused()).toBe(true)
    })
  })

  describe('cross-document behavior', () => {
    it('uses the iframe target owning document for containment', async () => {
      const iframe = document.createElement('iframe')
      document.body.appendChild(iframe)
      const doc = iframe.contentDocument
      expect(doc).not.toBeNull()

      const container = doc!.createElement('div')
      const input = doc!.createElement('input')
      container.appendChild(input)
      doc!.body.appendChild(container)

      function IframeHarness(): ReactElement {
        const ref = useRef<HTMLDivElement | null>(container)
        const { focused } = useFocusWithin(ref)

        return (
          <>
            <input data-testid="parent-input" type="text" />
            <div data-testid="iframe-focused-value">{String(focused)}</div>
          </>
        )
      }

      render(<IframeHarness />)

      act(() => {
        input.focus()
      })
      expect(screen.getByTestId('iframe-focused-value').textContent).toBe(
        'true',
      )
      expect(doc!.activeElement).toBe(input)
      expect(document.activeElement).not.toBe(input)

      act(() => {
        input.blur()
      })
      await flushMicrotasks()
      expect(screen.getByTestId('iframe-focused-value').textContent).toBe(
        'false',
      )

      document.body.removeChild(iframe)
    })
  })

  describe('listener lifecycle', () => {
    it('leaves one focusin and focusout pair under Strict Mode', () => {
      const addSpy = vi.spyOn(HTMLFormElement.prototype, 'addEventListener')
      const removeSpy = vi.spyOn(
        HTMLFormElement.prototype,
        'removeEventListener',
      )

      function FormHarness(): ReactElement {
        const ref = useRef<HTMLFormElement>(null)
        const { focused } = useFocusWithin(ref)

        return (
          <form ref={ref} data-testid="target">
            <input type="text" />
            <span data-focused={focused ? 'true' : 'false'} />
          </form>
        )
      }

      render(
        <StrictMode>
          <FormHarness />
        </StrictMode>,
      )

      const focusInAdds = addSpy.mock.calls.filter(
        ([name]) => name === 'focusin',
      ).length
      const focusInRemoves = removeSpy.mock.calls.filter(
        ([name]) => name === 'focusin',
      ).length
      expect(focusInAdds - focusInRemoves).toBe(1)
    })
  })

  describe('SSR and hydration', () => {
    it('renders false on the server without listeners or microtasks', () => {
      const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')
      const microtaskSpy = vi.spyOn(globalThis, 'queueMicrotask')

      function ServerHarness(): ReactElement {
        const ref = createRef<HTMLDivElement>()
        const { focused } = useFocusWithin(ref)
        return <div data-focused={String(focused)} />
      }

      const html = renderToString(<ServerHarness />)
      expect(html).toContain('data-focused="false"')
      expect(addSpy).not.toHaveBeenCalled()
      expect(microtaskSpy).not.toHaveBeenCalled()
    })

    it('hydrates without mismatch and synchronizes client focus state', () => {
      const container = document.createElement('div')
      document.body.appendChild(container)

      function ClientHarness(): ReactElement {
        const ref = useRef<HTMLDivElement>(null)
        const { focused } = useFocusWithin(ref)

        return (
          <div ref={ref} data-testid="hydration-target">
            <input data-testid="hydration-input" type="text" />
            <span data-focused={focused ? 'true' : 'false'} />
          </div>
        )
      }

      container.innerHTML = renderToString(<ClientHarness />)
      expect(container.querySelector('[data-focused="false"]')).not.toBeNull()

      act(() => {
        hydrateRoot(container, <ClientHarness />)
      })

      const input = container.querySelector(
        '[data-testid="hydration-input"]',
      ) as HTMLInputElement
      act(() => {
        input.focus()
      })
      expect(container.querySelector('[data-focused="true"]')).not.toBeNull()

      container.remove()
    })
  })
})
