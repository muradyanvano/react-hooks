import { act, cleanup, render, screen } from '@testing-library/react'
import { StrictMode, useState, type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  useOnStartTyping,
  type UseOnStartTypingHandler,
  type UseOnStartTypingOptions,
} from './useOnStartTyping'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function Harness({
  handler,
  options,
}: {
  handler: UseOnStartTypingHandler
  options?: UseOnStartTypingOptions
}): ReactElement {
  useOnStartTyping(handler, options)
  return <div data-testid="harness">Start typing harness</div>
}

function dispatchDocumentKey(
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  document.dispatchEvent(event)
  return event
}

function focusBody(): void {
  ;(document.body as HTMLElement).tabIndex = -1
  document.body.focus()
}

describe('useOnStartTyping', () => {
  it('returns void', () => {
    function Probe(): ReactElement {
      const result = useOnStartTyping(() => {
        // no-op
      })
      expect(result).toBeUndefined()
      return <div />
    }

    render(<Probe />)
  })

  it('calls the handler for a lowercase letter and passes the original event', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)
    focusBody()

    const event = dispatchDocumentKey('a')

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('calls the handler for an uppercase letter with Shift', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)
    focusBody()

    dispatchDocumentKey('A', { shiftKey: true })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('calls the handler for each digit from 0 through 9', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)
    focusBody()

    for (const digit of '0123456789') {
      dispatchDocumentKey(digit)
    }

    expect(handler).toHaveBeenCalledTimes(10)
  })

  describe('invalid default keys', () => {
    it.each([
      ['whitespace', ' '],
      ['Enter', 'Enter'],
      ['Escape', 'Escape'],
      ['Tab', 'Tab'],
      ['Backspace', 'Backspace'],
      ['Delete', 'Delete'],
      ['ArrowLeft', 'ArrowLeft'],
      ['ArrowRight', 'ArrowRight'],
      ['ArrowUp', 'ArrowUp'],
      ['ArrowDown', 'ArrowDown'],
      ['Home', 'Home'],
      ['End', 'End'],
      ['PageUp', 'PageUp'],
      ['PageDown', 'PageDown'],
      ['function key', 'F1'],
      ['punctuation', '.'],
      ['symbol', '@'],
      ['non-Latin', 'я'],
      ['empty key', ''],
    ])('ignores %s', (_label, key) => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      focusBody()
      dispatchDocumentKey(key)
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('modifier behavior', () => {
    it('ignores Ctrl plus a valid letter', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      focusBody()
      dispatchDocumentKey('a', { ctrlKey: true })
      expect(handler).not.toHaveBeenCalled()
    })

    it('ignores Alt plus a valid letter', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      focusBody()
      dispatchDocumentKey('a', { altKey: true })
      expect(handler).not.toHaveBeenCalled()
    })

    it('ignores Meta plus a valid letter', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      focusBody()
      dispatchDocumentKey('a', { metaKey: true })
      expect(handler).not.toHaveBeenCalled()
    })

    it('allows Shift plus a valid letter', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      focusBody()
      dispatchDocumentKey('z', { shiftKey: true })
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('ignores combinations containing Ctrl, Alt, or Meta', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      focusBody()
      dispatchDocumentKey('a', { ctrlKey: true, shiftKey: true })
      dispatchDocumentKey('a', { altKey: true, shiftKey: true })
      dispatchDocumentKey('a', { metaKey: true, shiftKey: true })
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('repetition and composition', () => {
    it('ignores repeat: true', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      focusBody()
      dispatchDocumentKey('a', { repeat: true })
      expect(handler).not.toHaveBeenCalled()
    })

    it('ignores isComposing: true', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      focusBody()
      dispatchDocumentKey('a', { isComposing: true })
      expect(handler).not.toHaveBeenCalled()
    })

    it('calls for the equivalent valid non-repeated, non-composing event', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      focusBody()
      dispatchDocumentKey('a', { repeat: true, isComposing: true })
      dispatchDocumentKey('a')
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('editable focus protection', () => {
    it.each([
      [
        'text input',
        () => {
          const el = document.createElement('input')
          el.type = 'text'
          return el
        },
      ],
      [
        'search input',
        () => {
          const el = document.createElement('input')
          el.type = 'search'
          return el
        },
      ],
      [
        'number input',
        () => {
          const el = document.createElement('input')
          el.type = 'number'
          return el
        },
      ],
      [
        'checkbox input',
        () => {
          const el = document.createElement('input')
          el.type = 'checkbox'
          return el
        },
      ],
      ['textarea', () => document.createElement('textarea')],
      [
        'select',
        () => {
          const el = document.createElement('select')
          const option = document.createElement('option')
          option.value = 'a'
          option.textContent = 'A'
          el.appendChild(option)
          return el
        },
      ],
    ])('does not call when focus is in a %s', (_label, create) => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      const el = create()
      document.body.appendChild(el)
      el.focus()
      dispatchDocumentKey('a')
      expect(handler).not.toHaveBeenCalled()
    })

    it('does not call when focus is on a contenteditable element', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      const el = document.createElement('div')
      el.contentEditable = 'true'
      el.tabIndex = 0
      document.body.appendChild(el)
      el.focus()
      dispatchDocumentKey('a')
      expect(handler).not.toHaveBeenCalled()
    })

    it('does not call when focus is on a descendant of a contenteditable element', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      const parent = document.createElement('div')
      parent.contentEditable = 'true'
      const child = document.createElement('span')
      child.tabIndex = 0
      parent.appendChild(child)
      document.body.appendChild(parent)
      child.focus()
      dispatchDocumentKey('a')
      expect(handler).not.toHaveBeenCalled()
    })

    it('does not call for nested editable regions', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      const outer = document.createElement('div')
      outer.contentEditable = 'true'
      const inner = document.createElement('div')
      inner.contentEditable = 'true'
      inner.tabIndex = 0
      outer.appendChild(inner)
      document.body.appendChild(outer)
      inner.focus()
      dispatchDocumentKey('b')
      expect(handler).not.toHaveBeenCalled()
    })

    it('does not call when an editable element is focused inside an open shadow root', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      const host = document.createElement('div')
      const shadow = host.attachShadow({ mode: 'open' })
      const input = document.createElement('input')
      shadow.appendChild(input)
      document.body.appendChild(host)
      input.focus()
      expect(document.activeElement).toBe(host)
      dispatchDocumentKey('a')
      expect(handler).not.toHaveBeenCalled()
    })

    it.each([
      [
        'document.body',
        () => {
          focusBody()
          return document.body
        },
      ],
      [
        'a button',
        () => {
          const el = document.createElement('button')
          el.type = 'button'
          el.textContent = 'Go'
          document.body.appendChild(el)
          el.focus()
          return el
        },
      ],
      [
        'a link',
        () => {
          const el = document.createElement('a')
          el.href = '#search'
          el.textContent = 'Search'
          document.body.appendChild(el)
          el.focus()
          return el
        },
      ],
      [
        'a non-editable div',
        () => {
          const el = document.createElement('div')
          el.tabIndex = 0
          el.textContent = 'Panel'
          document.body.appendChild(el)
          el.focus()
          return el
        },
      ],
      [
        'contenteditable=false outside an editable parent',
        () => {
          const el = document.createElement('div')
          el.contentEditable = 'false'
          el.tabIndex = 0
          el.textContent = 'Static'
          document.body.appendChild(el)
          el.focus()
          return el
        },
      ],
    ])('calls when focus is on %s', (_label, focus) => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      focus()
      dispatchDocumentKey('k')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('treats nested contenteditable=false islands as non-editable', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      const outer = document.createElement('div')
      outer.contentEditable = 'true'
      const island = document.createElement('div')
      island.contentEditable = 'false'
      island.tabIndex = 0
      island.textContent = 'Island'
      outer.appendChild(island)
      document.body.appendChild(outer)
      island.focus()
      dispatchDocumentKey('a')
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('custom character validator', () => {
    it('accepts digits and rejects letters for a numeric-only validator', () => {
      const handler = vi.fn()
      const validator = vi.fn((event: KeyboardEvent) => /^\d$/.test(event.key))
      render(
        <Harness
          handler={handler}
          options={{ isTypedCharacterValid: validator }}
        />,
      )
      focusBody()
      dispatchDocumentKey('5')
      dispatchDocumentKey('a')
      expect(handler).toHaveBeenCalledTimes(1)
      expect(validator).toHaveBeenCalled()
    })

    it('receives the original event', () => {
      const handler = vi.fn()
      const validator = vi.fn(() => true)
      render(
        <Harness
          handler={handler}
          options={{ isTypedCharacterValid: validator }}
        />,
      )
      focusBody()
      const event = dispatchDocumentKey('!')
      expect(validator).toHaveBeenCalledWith(event)
      expect(handler).toHaveBeenCalledWith(event)
    })

    it('uses the latest validator after rerender without re-registering', () => {
      const handler = vi.fn()
      const first = vi.fn(() => false)
      const second = vi.fn(() => true)
      const addSpy = vi.spyOn(document, 'addEventListener')
      const removeSpy = vi.spyOn(document, 'removeEventListener')

      const { rerender } = render(
        <Harness
          handler={handler}
          options={{ isTypedCharacterValid: first }}
        />,
      )
      const addCount = addSpy.mock.calls.filter(
        (c) => c[0] === 'keydown',
      ).length

      rerender(
        <Harness
          handler={handler}
          options={{ isTypedCharacterValid: second }}
        />,
      )
      expect(addSpy.mock.calls.filter((c) => c[0] === 'keydown').length).toBe(
        addCount,
      )
      expect(
        removeSpy.mock.calls.filter((c) => c[0] === 'keydown').length,
      ).toBe(0)

      focusBody()
      dispatchDocumentKey('a')
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalled()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('can intentionally accept punctuation and control its own modifier filtering', () => {
      const handler = vi.fn()
      render(
        <Harness
          handler={handler}
          options={{
            isTypedCharacterValid: (event) =>
              event.key === '.' && !event.ctrlKey,
          }}
        />,
      )
      focusBody()
      dispatchDocumentKey('.', { ctrlKey: true })
      dispatchDocumentKey('.')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('is not called while an editable element blocks the event', () => {
      const handler = vi.fn()
      const validator = vi.fn(() => true)
      render(
        <Harness
          handler={handler}
          options={{ isTypedCharacterValid: validator }}
        />,
      )
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()
      dispatchDocumentKey('a')
      expect(validator).not.toHaveBeenCalled()
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('custom editable detector', () => {
    it('can block otherwise valid events', () => {
      const handler = vi.fn()
      render(
        <Harness
          handler={handler}
          options={{ isFocusedElementEditable: () => true }}
        />,
      )
      focusBody()
      dispatchDocumentKey('a')
      expect(handler).not.toHaveBeenCalled()
    })

    it('can allow events that the default detector would block', () => {
      const handler = vi.fn()
      render(
        <Harness
          handler={handler}
          options={{ isFocusedElementEditable: () => false }}
        />,
      )
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()
      dispatchDocumentKey('a')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('uses the latest detector after rerender without re-registering', () => {
      const handler = vi.fn()
      const first = vi.fn(() => true)
      const second = vi.fn(() => false)
      const addSpy = vi.spyOn(document, 'addEventListener')

      const { rerender } = render(
        <Harness
          handler={handler}
          options={{ isFocusedElementEditable: first }}
        />,
      )
      const addCount = addSpy.mock.calls.filter(
        (c) => c[0] === 'keydown',
      ).length

      rerender(
        <Harness
          handler={handler}
          options={{ isFocusedElementEditable: second }}
        />,
      )
      expect(addSpy.mock.calls.filter((c) => c[0] === 'keydown').length).toBe(
        addCount,
      )

      focusBody()
      dispatchDocumentKey('a')
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalled()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('runs before the character validator', () => {
      const order: string[] = []
      const handler = vi.fn()
      render(
        <Harness
          handler={handler}
          options={{
            isFocusedElementEditable: () => {
              order.push('editable')
              return true
            },
            isTypedCharacterValid: () => {
              order.push('validator')
              return true
            },
          }}
        />,
      )
      focusBody()
      dispatchDocumentKey('a')
      expect(order).toEqual(['editable'])
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('enabled behavior', () => {
    it('defaults to enabled', () => {
      const handler = vi.fn()
      render(<Harness handler={handler} />)
      focusBody()
      dispatchDocumentKey('a')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('registers no listener when enabled is false', () => {
      const handler = vi.fn()
      const addSpy = vi.spyOn(document, 'addEventListener')
      render(<Harness handler={handler} options={{ enabled: false }} />)
      expect(addSpy.mock.calls.filter((c) => c[0] === 'keydown').length).toBe(0)
      focusBody()
      dispatchDocumentKey('a')
      expect(handler).not.toHaveBeenCalled()
    })

    it('registers when changing from false to true and removes when disabling', () => {
      const handler = vi.fn()
      const addSpy = vi.spyOn(document, 'addEventListener')
      const removeSpy = vi.spyOn(document, 'removeEventListener')

      const { rerender } = render(
        <Harness handler={handler} options={{ enabled: false }} />,
      )
      expect(addSpy.mock.calls.filter((c) => c[0] === 'keydown').length).toBe(0)

      rerender(<Harness handler={handler} options={{ enabled: true }} />)
      const added = addSpy.mock.calls.filter((c) => c[0] === 'keydown')
      expect(added.length).toBe(1)
      const listener = added[0]?.[1]

      focusBody()
      dispatchDocumentKey('a')
      expect(handler).toHaveBeenCalledTimes(1)

      rerender(<Harness handler={handler} options={{ enabled: false }} />)
      expect(
        removeSpy.mock.calls.some(
          (c) => c[0] === 'keydown' && c[1] === listener,
        ),
      ).toBe(true)

      handler.mockClear()
      dispatchDocumentKey('b')
      expect(handler).not.toHaveBeenCalled()

      rerender(<Harness handler={handler} options={{ enabled: true }} />)
      dispatchDocumentKey('c')
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('handler freshness', () => {
    it('uses the latest handler after rerender without re-registering', () => {
      const first = vi.fn()
      const second = vi.fn()
      const addSpy = vi.spyOn(document, 'addEventListener')

      const { rerender } = render(<Harness handler={first} />)
      const addCount = addSpy.mock.calls.filter(
        (c) => c[0] === 'keydown',
      ).length

      rerender(<Harness handler={second} />)
      expect(addSpy.mock.calls.filter((c) => c[0] === 'keydown').length).toBe(
        addCount,
      )

      focusBody()
      dispatchDocumentKey('a')
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
    })
  })

  describe('listener lifecycle', () => {
    it('registers one keydown listener and removes the exact listener on unmount', () => {
      const handler = vi.fn()
      const addSpy = vi.spyOn(document, 'addEventListener')
      const removeSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = render(<Harness handler={handler} />)
      const added = addSpy.mock.calls.filter((c) => c[0] === 'keydown')
      expect(added.length).toBe(1)
      const listener = added[0]?.[1]

      unmount()
      expect(
        removeSpy.mock.calls.some(
          (c) => c[0] === 'keydown' && c[1] === listener,
        ),
      ).toBe(true)
    })

    it('does not leave multiple active listeners in Strict Mode', () => {
      const handler = vi.fn()
      render(
        <StrictMode>
          <Harness handler={handler} />
        </StrictMode>,
      )
      focusBody()
      dispatchDocumentKey('a')
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('SSR and environment safety', () => {
    it('importing the module without browser globals does not throw', async () => {
      vi.resetModules()
      vi.stubGlobal('document', undefined)
      vi.stubGlobal('window', undefined)
      await expect(import('./useOnStartTyping')).resolves.toMatchObject({
        useOnStartTyping: expect.any(Function),
      })
    })

    it('server rendering a component that calls the hook does not throw', () => {
      const handler = vi.fn()
      expect(() => renderToString(<Harness handler={handler} />)).not.toThrow()
      expect(handler).not.toHaveBeenCalled()
    })

    it('registers no document listener during SSR', () => {
      const handler = vi.fn()
      const addSpy = vi.spyOn(document, 'addEventListener')
      renderToString(<Harness handler={handler} />)
      expect(addSpy.mock.calls.filter((c) => c[0] === 'keydown').length).toBe(0)
    })

    it('skips listener registration when document is undefined at enable time', () => {
      const handler = vi.fn()
      const { rerender } = render(
        <Harness handler={handler} options={{ enabled: false }} />,
      )

      const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        enumerable: true,
        get() {
          return undefined
        },
      })

      try {
        expect(() => {
          rerender(<Harness handler={handler} options={{ enabled: true }} />)
        }).not.toThrow()
      } finally {
        if (descriptor == null) {
          Reflect.deleteProperty(globalThis, 'document')
        } else {
          Object.defineProperty(globalThis, 'document', descriptor)
        }
      }
    })
  })

  it('does not call preventDefault or stopPropagation', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)
    focusBody()
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    })
    const preventSpy = vi.spyOn(event, 'preventDefault')
    const stopSpy = vi.spyOn(event, 'stopPropagation')
    document.dispatchEvent(event)
    expect(handler).toHaveBeenCalled()
    expect(preventSpy).not.toHaveBeenCalled()
    expect(stopSpy).not.toHaveBeenCalled()
  })

  it('demonstrates focusing a search input from typing intent', async () => {
    function SearchDemo(): ReactElement {
      const [focused, setFocused] = useState(false)
      const inputId = 'search-demo'

      useOnStartTyping(() => {
        const input = document.getElementById(
          inputId,
        ) as HTMLInputElement | null
        input?.focus()
      })

      return (
        <div>
          <button type="button" data-testid="outside">
            Outside
          </button>
          <input
            id={inputId}
            data-testid="search"
            type="search"
            aria-label="Search"
            onFocus={() => {
              setFocused(true)
            }}
            onBlur={() => {
              setFocused(false)
            }}
          />
          <span data-testid="focus-state">
            {focused ? 'focused' : 'blurred'}
          </span>
        </div>
      )
    }

    render(<SearchDemo />)
    screen.getByTestId('outside').focus()
    expect(screen.getByTestId('focus-state').textContent).toBe('blurred')

    await act(async () => {
      dispatchDocumentKey('q')
    })

    expect(document.activeElement).toBe(screen.getByTestId('search'))
    expect(screen.getByTestId('focus-state').textContent).toBe('focused')
  })
})
