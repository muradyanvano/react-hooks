import { act, cleanup, render, screen } from '@testing-library/react'
import {
  StrictMode,
  createRef,
  useRef,
  type ReactElement,
  type RefObject,
} from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useFocus, type UseFocusOptions } from './useFocus'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Harness({
  options,
  elementRef,
  renderExtra,
}: {
  options?: UseFocusOptions
  elementRef?: RefObject<HTMLInputElement | null>
  renderExtra?: ReactElement
}): ReactElement {
  const localRef = useRef<HTMLInputElement>(null)
  const ref = elementRef ?? localRef
  const { focused, focus, blur } = useFocus(ref, options)

  return (
    <div>
      <input
        ref={ref}
        data-testid="target"
        type="text"
        data-focused={focused ? 'true' : 'false'}
      />
      <button type="button" data-testid="focus-btn" onClick={focus}>
        Focus
      </button>
      <button type="button" data-testid="blur-btn" onClick={blur}>
        Blur
      </button>
      {renderExtra}
    </div>
  )
}

function readFocused(): boolean {
  return screen.getByTestId('target').getAttribute('data-focused') === 'true'
}

describe('useFocus', () => {
  describe('initial state', () => {
    it('returns false initially with stable focus and blur methods', () => {
      const { rerender } = render(<Harness />)
      expect(readFocused()).toBe(false)

      const focusBtn = screen.getByTestId('focus-btn')
      const blurBtn = screen.getByTestId('blur-btn')
      rerender(<Harness />)
      expect(screen.getByTestId('focus-btn')).toBe(focusBtn)
      expect(screen.getByTestId('blur-btn')).toBe(blurBtn)
    })
  })

  describe('user focus and blur', () => {
    it('tracks native focus and blur on the exact target', () => {
      render(<Harness />)
      const target = screen.getByTestId('target')

      act(() => {
        target.focus()
      })
      expect(readFocused()).toBe(true)
      expect(target.ownerDocument.activeElement).toBe(target)

      act(() => {
        target.blur()
      })
      expect(readFocused()).toBe(false)
    })

    it('does not count focus on a descendant as direct focus', () => {
      function NestedHarness(): ReactElement {
        const ref = useRef<HTMLDivElement>(null)
        const { focused } = useFocus(ref)

        return (
          <div ref={ref} data-testid="parent" data-focused={String(focused)}>
            <input data-testid="child" type="text" />
          </div>
        )
      }

      render(<NestedHarness />)
      const child = screen.getByTestId('child')

      act(() => {
        child.focus()
      })
      expect(screen.getByTestId('parent').getAttribute('data-focused')).toBe(
        'false',
      )
    })

    it('resets when focus moves to another element', () => {
      render(
        <Harness
          renderExtra={
            <button data-testid="other" type="button">
              Other
            </button>
          }
        />,
      )
      const target = screen.getByTestId('target')
      const other = screen.getByTestId('other')

      act(() => {
        target.focus()
      })
      expect(readFocused()).toBe(true)

      act(() => {
        other.focus()
      })
      expect(readFocused()).toBe(false)
    })
  })

  describe('already-focused target', () => {
    it('synchronizes true when the target is focused before listeners attach', () => {
      function PreFocusedHarness(): ReactElement {
        const ref = useRef<HTMLInputElement>(null)
        const { focused } = useFocus(ref)

        return (
          <input
            ref={(node) => {
              ref.current = node
              if (node != null && node.ownerDocument.activeElement !== node) {
                node.focus()
              }
            }}
            data-testid="target"
            data-focused={focused ? 'true' : 'false'}
            type="text"
          />
        )
      }

      render(<PreFocusedHarness />)
      expect(readFocused()).toBe(true)
      expect(screen.getByTestId('target').ownerDocument.activeElement).toBe(
        screen.getByTestId('target'),
      )
    })
  })

  describe('imperative focus', () => {
    it('calls native focus with preventScroll options', () => {
      render(<Harness options={{ preventScroll: true }} />)
      const target = screen.getByTestId('target')
      const focusSpy = vi.spyOn(target, 'focus')

      act(() => {
        screen.getByTestId('focus-btn').click()
      })

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
      expect(readFocused()).toBe(true)
    })

    it('uses the latest preventScroll after rerender', () => {
      const { rerender } = render(
        <Harness options={{ preventScroll: false }} />,
      )
      const target = screen.getByTestId('target')
      const focusSpy = vi.spyOn(target, 'focus')

      rerender(<Harness options={{ preventScroll: true }} />)

      act(() => {
        screen.getByTestId('focus-btn').click()
      })
      expect(focusSpy).toHaveBeenLastCalledWith({ preventScroll: true })
    })

    it('does nothing when disabled or target is null', () => {
      render(<Harness options={{ enabled: false }} />)
      const target = screen.getByTestId('target')
      const focusSpy = vi.spyOn(target, 'focus')

      act(() => {
        screen.getByTestId('focus-btn').click()
      })
      expect(focusSpy).not.toHaveBeenCalled()
    })
  })

  describe('imperative blur', () => {
    it('calls native blur and updates through native behavior', () => {
      render(<Harness />)
      const target = screen.getByTestId('target')
      const blurSpy = vi.spyOn(target, 'blur')

      act(() => {
        target.focus()
      })
      expect(readFocused()).toBe(true)

      act(() => {
        screen.getByTestId('blur-btn').click()
      })
      expect(blurSpy).toHaveBeenCalled()
      expect(readFocused()).toBe(false)
    })

    it('does nothing when disabled', () => {
      const { rerender } = render(<Harness />)
      const target = screen.getByTestId('target')
      const blurSpy = vi.spyOn(target, 'blur')

      act(() => {
        target.focus()
      })

      rerender(<Harness options={{ enabled: false }} />)
      act(() => {
        screen.getByTestId('blur-btn').click()
      })
      expect(blurSpy).not.toHaveBeenCalled()
    })
  })

  describe('initial focus', () => {
    it('focuses once when initialValue is true', () => {
      render(<Harness options={{ initialValue: true }} />)
      const target = screen.getByTestId('target')
      expect(target.ownerDocument.activeElement).toBe(target)
    })

    it('does not refocus on unrelated rerender after the user leaves', () => {
      const { rerender } = render(<Harness options={{ initialValue: true }} />)
      const target = screen.getByTestId('target')
      const other = document.createElement('button')
      document.body.appendChild(other)

      act(() => {
        other.focus()
      })
      expect(target.ownerDocument.activeElement).toBe(other)

      rerender(<Harness options={{ initialValue: true }} />)
      expect(target.ownerDocument.activeElement).toBe(other)

      document.body.removeChild(other)
    })

    it('focuses once when initialValue changes false to true', () => {
      const { rerender } = render(<Harness options={{ initialValue: false }} />)
      const target = screen.getByTestId('target')
      const focusSpy = vi.spyOn(target, 'focus')

      rerender(<Harness options={{ initialValue: true }} />)
      expect(focusSpy).toHaveBeenCalledTimes(1)
      expect(target.ownerDocument.activeElement).toBe(target)
    })

    it('does not blur when initialValue changes true to false', () => {
      const { rerender } = render(<Harness options={{ initialValue: true }} />)
      const target = screen.getByTestId('target')
      const blurSpy = vi.spyOn(target, 'blur')

      rerender(<Harness options={{ initialValue: false }} />)
      expect(blurSpy).not.toHaveBeenCalled()
      expect(target.ownerDocument.activeElement).toBe(target)
    })

    it('does not focus while disabled even when initialValue is true', () => {
      render(<Harness options={{ enabled: false, initialValue: true }} />)
      const target = screen.getByTestId('target')
      const focusSpy = vi.spyOn(target, 'focus')

      expect(focusSpy).not.toHaveBeenCalled()
      expect(readFocused()).toBe(false)
    })

    it('applies initial focus once after re-enable', () => {
      const { rerender } = render(
        <Harness options={{ enabled: false, initialValue: true }} />,
      )
      const target = screen.getByTestId('target')
      const focusSpy = vi.spyOn(target, 'focus')

      rerender(<Harness options={{ enabled: true, initialValue: true }} />)
      expect(focusSpy).toHaveBeenCalledTimes(1)
      expect(target.ownerDocument.activeElement).toBe(target)
    })

    it('focuses again when initialValue toggles false, true, false, true', () => {
      const { rerender } = render(<Harness options={{ initialValue: false }} />)
      const target = screen.getByTestId('target')
      const focusSpy = vi.spyOn(target, 'focus')

      rerender(<Harness options={{ initialValue: true }} />)
      rerender(<Harness options={{ initialValue: false }} />)
      rerender(<Harness options={{ initialValue: true }} />)

      expect(focusSpy).toHaveBeenCalledTimes(2)
    })

    it('focuses a replacement target once when initialValue is true', () => {
      const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus')
      const { rerender } = render(
        <ReplacementHarness attachTo="a" initialValue />,
      )
      const targetA = screen.getByTestId('target-a')

      expect(targetA.ownerDocument.activeElement).toBe(targetA)

      act(() => {
        rerender(<ReplacementHarness attachTo="b" initialValue />)
      })

      const targetB = screen.getByTestId('target-b')
      expect(targetB.ownerDocument.activeElement).toBe(targetB)
      expect(focusSpy).toHaveBeenCalledTimes(2)
    })

    it('does not refocus target A when switching back after initial focus', () => {
      const { rerender } = render(
        <ReplacementHarness attachTo="a" initialValue />,
      )
      const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus')

      act(() => {
        rerender(<ReplacementHarness attachTo="b" initialValue />)
      })
      act(() => {
        rerender(<ReplacementHarness attachTo="a" initialValue />)
      })

      expect(focusSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('focus-visible filtering', () => {
    it('accepts ordinary focus when focusVisible is false', () => {
      render(<Harness options={{ focusVisible: false }} />)
      const target = screen.getByTestId('target')

      act(() => {
        target.focus()
      })
      expect(readFocused()).toBe(true)
    })

    it('uses matches(:focus-visible) when focusVisible is true', () => {
      render(<Harness options={{ focusVisible: true }} />)
      const target = screen.getByTestId('target')
      const matchesSpy = vi
        .spyOn(target, 'matches')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)

      act(() => {
        target.focus()
      })
      expect(matchesSpy).toHaveBeenCalledWith(':focus-visible')
      expect(readFocused()).toBe(false)

      act(() => {
        target.dispatchEvent(new FocusEvent('focus', { bubbles: false }))
      })
      expect(readFocused()).toBe(true)
    })

    it('returns false when matches throws for unsupported selector', () => {
      render(<Harness options={{ focusVisible: true }} />)
      const target = screen.getByTestId('target')
      vi.spyOn(target, 'matches').mockImplementation(() => {
        throw new DOMException('unsupported', 'SyntaxError')
      })

      act(() => {
        target.focus()
      })
      expect(readFocused()).toBe(false)
    })

    it('resynchronizes when focusVisible changes while focused', () => {
      const { rerender } = render(<Harness options={{ focusVisible: false }} />)
      const target = screen.getByTestId('target')

      act(() => {
        target.focus()
      })
      expect(readFocused()).toBe(true)

      vi.spyOn(target, 'matches').mockReturnValue(false)
      rerender(<Harness options={{ focusVisible: true }} />)
      expect(readFocused()).toBe(false)
    })
  })

  describe('enabled lifecycle', () => {
    it('registers no listeners when disabled', () => {
      const addSpy = vi.spyOn(HTMLInputElement.prototype, 'addEventListener')
      render(<Harness options={{ enabled: false }} />)

      const focusCalls = addSpy.mock.calls.filter(([name]) => name === 'focus')
      expect(focusCalls).toHaveLength(0)
      expect(readFocused()).toBe(false)
    })

    it('keeps browser focus unchanged when disabling', () => {
      const { rerender } = render(<Harness />)
      const target = screen.getByTestId('target')
      const blurSpy = vi.spyOn(target, 'blur')

      act(() => {
        target.focus()
      })

      rerender(<Harness options={{ enabled: false }} />)
      expect(readFocused()).toBe(false)
      expect(target.ownerDocument.activeElement).toBe(target)
      expect(blurSpy).not.toHaveBeenCalled()
    })

    it('synchronizes an already-focused target when re-enabled', () => {
      const { rerender } = render(<Harness options={{ enabled: false }} />)
      const target = screen.getByTestId('target')

      act(() => {
        target.focus()
      })

      rerender(<Harness options={{ enabled: true }} />)
      expect(readFocused()).toBe(true)
    })

    it('leaves one listener pair under Strict Mode', () => {
      const addSpy = vi.spyOn(HTMLInputElement.prototype, 'addEventListener')
      const removeSpy = vi.spyOn(
        HTMLInputElement.prototype,
        'removeEventListener',
      )

      render(
        <StrictMode>
          <Harness />
        </StrictMode>,
      )

      const focusAdds = addSpy.mock.calls.filter(
        ([name]) => name === 'focus',
      ).length
      const focusRemoves = removeSpy.mock.calls.filter(
        ([name]) => name === 'focus',
      ).length
      expect(focusAdds - focusRemoves).toBe(1)
    })

    it('applies initial focus once under Strict Mode', () => {
      const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus')

      render(
        <StrictMode>
          <Harness options={{ initialValue: true }} />
        </StrictMode>,
      )

      const target = screen.getByTestId('target')
      expect(focusSpy).toHaveBeenCalledTimes(1)
      expect(target.ownerDocument.activeElement).toBe(target)
      expect(readFocused()).toBe(true)
    })
  })

  describe('dynamic target replacement', () => {
    it('resets state and tracks the new target', () => {
      const { rerender } = render(<ReplacementHarness attachTo="a" />)

      act(() => {
        screen.getByTestId('target-a').focus()
      })
      expect(screen.getByTestId('focus-value').textContent).toBe('true')

      act(() => {
        rerender(<ReplacementHarness attachTo="b" />)
      })
      expect(screen.getByTestId('focus-value').textContent).toBe('false')

      act(() => {
        screen.getByTestId('target-b').focus()
      })
      expect(screen.getByTestId('focus-value').textContent).toBe('true')
    })

    it('ignores stale focus events from a replaced target', () => {
      const { rerender } = render(<ReplacementHarness attachTo="a" />)
      const targetA = screen.getByTestId('target-a')

      act(() => {
        rerender(<ReplacementHarness attachTo="b" />)
      })
      expect(screen.getByTestId('focus-value').textContent).toBe('false')

      act(() => {
        targetA.dispatchEvent(new FocusEvent('focus', { bubbles: false }))
      })
      expect(screen.getByTestId('focus-value').textContent).toBe('false')
    })
  })

  describe('cross-document behavior', () => {
    it('checks activeElement through the target owning document', () => {
      const iframe = document.createElement('iframe')
      document.body.appendChild(iframe)
      const doc = iframe.contentDocument
      expect(doc).not.toBeNull()

      const target = doc!.createElement('input')
      doc!.body.appendChild(target)

      function IframeHarness(): ReactElement {
        const ref = useRef<HTMLInputElement | null>(target)
        const { focused, focus } = useFocus(ref)

        return (
          <div>
            <button type="button" data-testid="iframe-focus" onClick={focus}>
              Focus iframe input
            </button>
            <span data-testid="iframe-focused">{String(focused)}</span>
          </div>
        )
      }

      render(<IframeHarness />)

      act(() => {
        screen.getByTestId('iframe-focus').click()
      })

      expect(doc!.activeElement).toBe(target)
      expect(screen.getByTestId('iframe-focused').textContent).toBe('true')
      expect(document.activeElement).not.toBe(target)

      document.body.removeChild(iframe)
    })
  })

  describe('listener lifecycle', () => {
    it('removes exact listener functions on unmount', () => {
      const addSpy = vi.spyOn(HTMLInputElement.prototype, 'addEventListener')
      const removeSpy = vi.spyOn(
        HTMLInputElement.prototype,
        'removeEventListener',
      )
      const { unmount } = render(<Harness />)

      const focusCall = addSpy.mock.calls.find(([name]) => name === 'focus')
      const blurCall = addSpy.mock.calls.find(([name]) => name === 'blur')

      unmount()

      expect(removeSpy).toHaveBeenCalledWith('focus', focusCall?.[1])
      expect(removeSpy).toHaveBeenCalledWith('blur', blurCall?.[1])
    })

    it('does not reattach listeners when preventScroll changes', () => {
      const addSpy = vi.spyOn(HTMLInputElement.prototype, 'addEventListener')
      const { rerender } = render(
        <Harness options={{ preventScroll: false }} />,
      )
      const initialFocusAdds = addSpy.mock.calls.filter(
        ([name]) => name === 'focus',
      ).length

      rerender(<Harness options={{ preventScroll: true }} />)
      const afterRerenderAdds = addSpy.mock.calls.filter(
        ([name]) => name === 'focus',
      ).length
      expect(afterRerenderAdds).toBe(initialFocusAdds)
    })
  })

  describe('SSR and hydration', () => {
    it('renders false on the server without calling focus or attaching listeners', () => {
      const addSpy = vi.spyOn(HTMLInputElement.prototype, 'addEventListener')
      const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus')

      function ServerHarness(): ReactElement {
        const ref = createRef<HTMLInputElement>()
        const { focused, focus, blur } = useFocus(ref)
        return (
          <div
            data-focused={String(focused)}
            data-has-focus={String(typeof focus === 'function')}
            data-has-blur={String(typeof blur === 'function')}
          />
        )
      }

      const html = renderToString(<ServerHarness />)
      expect(html).toContain('data-focused="false"')
      expect(html).toContain('data-has-focus="true"')
      expect(html).toContain('data-has-blur="true"')
      expect(addSpy).not.toHaveBeenCalled()
      expect(focusSpy).not.toHaveBeenCalled()
    })

    it('allows safe focus and blur when the ref target is null', () => {
      function NullTargetHarness(): ReactElement {
        const ref = useRef<HTMLInputElement>(null)
        const { focus, blur } = useFocus(ref)

        return (
          <>
            <button
              data-testid="null-focus-btn"
              type="button"
              onClick={() => focus()}
            />
            <button
              data-testid="null-blur-btn"
              type="button"
              onClick={() => blur()}
            />
          </>
        )
      }

      render(<NullTargetHarness />)

      expect(() => {
        act(() => {
          screen.getByTestId('null-focus-btn').click()
        })
      }).not.toThrow()
      expect(() => {
        act(() => {
          screen.getByTestId('null-blur-btn').click()
        })
      }).not.toThrow()
    })

    it('hydrates without mismatch and synchronizes client focus state', () => {
      const container = document.createElement('div')
      document.body.appendChild(container)

      function ClientHarness(): ReactElement {
        const ref = useRef<HTMLInputElement>(null)
        const { focused } = useFocus(ref)

        return (
          <input
            ref={ref}
            data-testid="hydration-target"
            data-focused={focused ? 'true' : 'false'}
            type="text"
          />
        )
      }

      container.innerHTML = renderToString(<ClientHarness />)
      expect(container.querySelector('[data-focused="false"]')).not.toBeNull()

      act(() => {
        hydrateRoot(container, <ClientHarness />)
      })

      const target = container.querySelector(
        '[data-testid="hydration-target"]',
      ) as HTMLInputElement
      act(() => {
        target.focus()
      })
      expect(target.getAttribute('data-focused')).toBe('true')
      expect(target.ownerDocument.activeElement).toBe(target)

      container.remove()
    })
  })
})

function ReplacementHarness({
  attachTo,
  initialValue = false,
}: {
  attachTo: 'a' | 'b'
  initialValue?: boolean
}): ReactElement {
  const ref = useRef<HTMLInputElement | null>(null)
  const { focused } = useFocus(ref, { initialValue })

  return (
    <div>
      <input
        ref={attachTo === 'a' ? ref : undefined}
        data-testid="target-a"
        type="text"
      />
      <input
        ref={attachTo === 'b' ? ref : undefined}
        data-testid="target-b"
        type="text"
      />
      <div data-testid="focus-value">{String(focused)}</div>
    </div>
  )
}
