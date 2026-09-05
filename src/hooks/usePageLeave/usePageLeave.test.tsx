import { act, cleanup, render, screen } from '@testing-library/react'
import { StrictMode, useEffect, useState, type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { usePageLeave, type UsePageLeaveOptions } from './usePageLeave'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function dispatchMouseOut(
  target: EventTarget,
  relatedTarget: EventTarget | null,
): MouseEvent {
  const event = new MouseEvent('mouseout', {
    bubbles: true,
    cancelable: true,
    relatedTarget,
  })
  target.dispatchEvent(event)
  return event
}

function dispatchMouseOver(target: EventTarget): MouseEvent {
  const event = new MouseEvent('mouseover', {
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
}

function Harness({
  options,
  onRender,
  label = 'default',
}: {
  options?: UsePageLeaveOptions
  onRender?: (hasLeft: boolean) => void
  label?: string
}): ReactElement {
  const hasLeft = usePageLeave(options)
  onRender?.(hasLeft)
  return (
    <div data-testid={`page-leave-${label}`} data-has-left={String(hasLeft)}>
      {hasLeft ? 'left' : 'inside'}
    </div>
  )
}

function readHasLeft(label = 'default'): boolean {
  return (
    screen.getByTestId(`page-leave-${label}`).getAttribute('data-has-left') ===
    'true'
  )
}

function createIframeWindow(): {
  win: Window
  cleanup: () => void
} {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('srcdoc', '<!doctype html><html><body></body></html>')
  document.body.appendChild(iframe)
  const win = iframe.contentWindow
  if (win == null) {
    document.body.removeChild(iframe)
    throw new Error('iframe contentWindow unavailable')
  }
  return {
    win,
    cleanup: () => {
      if (iframe.isConnected) {
        document.body.removeChild(iframe)
      }
    },
  }
}

describe('usePageLeave', () => {
  describe('basic behavior', () => {
    it('defaults to false', () => {
      render(<Harness />)
      expect(readHasLeft()).toBe(false)
    })

    it('seeds custom initialValue true', () => {
      render(<Harness options={{ initialValue: true }} />)
      expect(readHasLeft()).toBe(true)
    })

    it('ignores qualifying mouseout until the pointer has entered once', () => {
      render(<Harness />)
      act(() => {
        dispatchMouseOut(window, null)
        dispatchMouseOut(window, null)
      })
      expect(readHasLeft()).toBe(false)
    })

    it('sets true on mouseout with relatedTarget null after enter', () => {
      render(<Harness />)
      act(() => {
        dispatchMouseOver(window)
        dispatchMouseOut(window, null)
      })
      expect(readHasLeft()).toBe(true)
    })

    it('sets false on mouseover', () => {
      render(<Harness options={{ initialValue: true }} />)
      act(() => {
        dispatchMouseOver(window)
      })
      expect(readHasLeft()).toBe(false)
    })

    it('supports leave → enter → leave transitions', () => {
      render(<Harness />)
      act(() => {
        dispatchMouseOver(window)
        dispatchMouseOut(window, null)
      })
      expect(readHasLeft()).toBe(true)
      act(() => {
        dispatchMouseOver(window)
      })
      expect(readHasLeft()).toBe(false)
      act(() => {
        dispatchMouseOut(window, null)
      })
      expect(readHasLeft()).toBe(true)
    })

    it('does not re-render on repeated leave while already true', () => {
      let renders = 0
      render(
        <Harness
          onRender={() => {
            renders += 1
          }}
        />,
      )
      const afterMount = renders
      act(() => {
        dispatchMouseOver(window)
        dispatchMouseOut(window, null)
      })
      const afterFirstLeave = renders
      expect(afterFirstLeave).toBeGreaterThan(afterMount)
      act(() => {
        dispatchMouseOut(window, null)
        dispatchMouseOut(window, null)
      })
      expect(renders).toBe(afterFirstLeave)
      expect(readHasLeft()).toBe(true)
    })

    it('does not re-render on repeated enter while already false', () => {
      let renders = 0
      render(
        <Harness
          onRender={() => {
            renders += 1
          }}
        />,
      )
      const afterMount = renders
      act(() => {
        dispatchMouseOver(window)
        dispatchMouseOver(window)
      })
      expect(renders).toBe(afterMount)
      expect(readHasLeft()).toBe(false)
    })
  })

  describe('internal movement', () => {
    it('ignores mouseout with another element as relatedTarget', () => {
      render(<Harness />)
      const other = document.createElement('div')
      document.body.appendChild(other)
      act(() => {
        dispatchMouseOut(window, other)
      })
      expect(readHasLeft()).toBe(false)
      other.remove()
    })

    it('ignores movement between nested descendants', () => {
      render(<Harness />)
      const parent = document.createElement('div')
      const child = document.createElement('span')
      parent.appendChild(child)
      document.body.appendChild(parent)
      act(() => {
        dispatchMouseOut(window, child)
        dispatchMouseOut(window, parent)
      })
      expect(readHasLeft()).toBe(false)
      parent.remove()
    })

    it('ignores moving onto an iframe element inside the document', () => {
      render(<Harness />)
      const iframe = document.createElement('iframe')
      document.body.appendChild(iframe)
      act(() => {
        dispatchMouseOut(window, iframe)
      })
      expect(readHasLeft()).toBe(false)
      iframe.remove()
    })

    it('keeps false on mouseover while already inside', () => {
      render(<Harness />)
      act(() => {
        dispatchMouseOver(window)
      })
      expect(readHasLeft()).toBe(false)
    })
  })

  describe('event exclusions', () => {
    it('ignores blur, focus, visibility, pagehide, beforeunload, touch, and keyboard', () => {
      render(<Harness />)
      act(() => {
        window.dispatchEvent(new Event('blur'))
        window.dispatchEvent(new Event('focus'))
        document.dispatchEvent(new Event('visibilitychange'))
        window.dispatchEvent(new Event('pagehide'))
        window.dispatchEvent(new Event('beforeunload'))
        window.dispatchEvent(new Event('touchend'))
        window.dispatchEvent(new Event('touchstart'))
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
        )
      })
      expect(readHasLeft()).toBe(false)
    })
  })

  describe('enabled lifecycle', () => {
    it('registers nothing when disabled on mount', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      render(<Harness options={{ enabled: false }} />)
      const mouseCalls = addSpy.mock.calls.filter(
        ([type]) => type === 'mouseout' || type === 'mouseover',
      )
      expect(mouseCalls).toHaveLength(0)
    })

    it('attaches when enabled becomes true and detaches when false', () => {
      function Toggle(): ReactElement {
        const [enabled, setEnabled] = useState(false)
        const hasLeft = usePageLeave({ enabled })
        return (
          <div>
            <button
              type="button"
              data-testid="toggle"
              onClick={() => setEnabled((value) => !value)}
            >
              toggle
            </button>
            <span
              data-testid="page-leave-default"
              data-has-left={String(hasLeft)}
            >
              {String(hasLeft)}
            </span>
          </div>
        )
      }

      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      render(<Toggle />)

      expect(
        addSpy.mock.calls.filter(
          ([type]) => type === 'mouseout' || type === 'mouseover',
        ),
      ).toHaveLength(0)

      act(() => {
        screen.getByTestId('toggle').click()
      })
      expect(
        addSpy.mock.calls.filter(
          ([type]) => type === 'mouseout' || type === 'mouseover',
        ),
      ).toHaveLength(2)

      act(() => {
        dispatchMouseOver(window)
        dispatchMouseOut(window, null)
      })
      expect(readHasLeft()).toBe(true)

      const removesBefore = removeSpy.mock.calls.filter(
        ([type]) => type === 'mouseout' || type === 'mouseover',
      ).length

      act(() => {
        screen.getByTestId('toggle').click()
      })
      expect(
        removeSpy.mock.calls.filter(
          ([type]) => type === 'mouseout' || type === 'mouseover',
        ).length,
      ).toBe(removesBefore + 2)
      expect(readHasLeft()).toBe(true)

      act(() => {
        screen.getByTestId('toggle').click()
      })
      expect(readHasLeft()).toBe(true)
    })

    it('ignores events after disable and preserves state on re-enable', () => {
      function Toggle(): ReactElement {
        const [enabled, setEnabled] = useState(true)
        const hasLeft = usePageLeave({ enabled })
        return (
          <div>
            <button
              type="button"
              data-testid="toggle"
              onClick={() => setEnabled((value) => !value)}
            >
              toggle
            </button>
            <span
              data-testid="page-leave-default"
              data-has-left={String(hasLeft)}
            >
              {String(hasLeft)}
            </span>
          </div>
        )
      }

      render(<Toggle />)
      act(() => {
        dispatchMouseOver(window)
        dispatchMouseOut(window, null)
      })
      expect(readHasLeft()).toBe(true)

      act(() => {
        screen.getByTestId('toggle').click()
      })
      act(() => {
        dispatchMouseOver(window)
        dispatchMouseOut(window, null)
      })
      expect(readHasLeft()).toBe(true)

      act(() => {
        screen.getByTestId('toggle').click()
      })
      expect(readHasLeft()).toBe(true)
    })

    it('does not churn listeners when only options object identity changes', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')

      function IdentityChurn(): ReactElement {
        const [, setTick] = useState(0)
        const hasLeft = usePageLeave({ enabled: true })
        return (
          <div>
            <button
              type="button"
              data-testid="rerender"
              onClick={() => setTick((value) => value + 1)}
            >
              rerender
            </button>
            <span
              data-testid="page-leave-default"
              data-has-left={String(hasLeft)}
            >
              {String(hasLeft)}
            </span>
          </div>
        )
      }

      render(<IdentityChurn />)
      const addsAfterMount = addSpy.mock.calls.filter(
        ([type]) => type === 'mouseout' || type === 'mouseover',
      ).length
      const removesAfterMount = removeSpy.mock.calls.filter(
        ([type]) => type === 'mouseout' || type === 'mouseover',
      ).length

      act(() => {
        screen.getByTestId('rerender').click()
        screen.getByTestId('rerender').click()
      })

      expect(
        addSpy.mock.calls.filter(
          ([type]) => type === 'mouseout' || type === 'mouseover',
        ).length,
      ).toBe(addsAfterMount)
      expect(
        removeSpy.mock.calls.filter(
          ([type]) => type === 'mouseout' || type === 'mouseover',
        ).length,
      ).toBe(removesAfterMount)
    })
  })

  describe('custom window lifecycle', () => {
    it('uses an explicit window only', () => {
      const fixture = createIframeWindow()
      try {
        const globalAdd = vi.spyOn(window, 'addEventListener')
        const customAdd = vi.spyOn(fixture.win, 'addEventListener')
        render(<Harness options={{ window: fixture.win }} />)

        expect(
          customAdd.mock.calls.filter(
            ([type]) => type === 'mouseout' || type === 'mouseover',
          ),
        ).toHaveLength(2)
        expect(
          globalAdd.mock.calls.filter(
            ([type]) => type === 'mouseout' || type === 'mouseover',
          ),
        ).toHaveLength(0)

        act(() => {
          dispatchMouseOver(fixture.win)
          dispatchMouseOut(fixture.win, null)
        })
        expect(readHasLeft()).toBe(true)

        act(() => {
          dispatchMouseOver(window)
        })
        expect(readHasLeft()).toBe(true)
      } finally {
        fixture.cleanup()
      }
    })

    it('registers nothing for explicit null', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      render(<Harness options={{ window: null }} />)
      expect(
        addSpy.mock.calls.filter(
          ([type]) => type === 'mouseout' || type === 'mouseover',
        ),
      ).toHaveLength(0)
    })

    it('uses the global window when omitted after mount', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      render(<Harness />)
      expect(
        addSpy.mock.calls.filter(
          ([type]) => type === 'mouseout' || type === 'mouseover',
        ),
      ).toHaveLength(2)
    })

    it('attaches when replacing null with a window and preserves state', () => {
      const fixture = createIframeWindow()
      try {
        function Switcher(): ReactElement {
          const [target, setTarget] = useState<Window | null>(null)
          const hasLeft = usePageLeave({ window: target, initialValue: true })
          return (
            <div>
              <button
                type="button"
                data-testid="bind"
                onClick={() => setTarget(fixture.win)}
              >
                bind
              </button>
              <span
                data-testid="page-leave-default"
                data-has-left={String(hasLeft)}
              >
                {String(hasLeft)}
              </span>
            </div>
          )
        }

        const addSpy = vi.spyOn(fixture.win, 'addEventListener')
        render(<Switcher />)
        expect(readHasLeft()).toBe(true)
        expect(
          addSpy.mock.calls.filter(
            ([type]) => type === 'mouseout' || type === 'mouseover',
          ),
        ).toHaveLength(0)

        act(() => {
          screen.getByTestId('bind').click()
        })
        expect(
          addSpy.mock.calls.filter(
            ([type]) => type === 'mouseout' || type === 'mouseover',
          ),
        ).toHaveLength(2)
        expect(readHasLeft()).toBe(true)
      } finally {
        fixture.cleanup()
      }
    })

    it('moves listeners from window A to B and ignores stale A events', () => {
      const a = createIframeWindow()
      const b = createIframeWindow()
      try {
        function Switcher(): ReactElement {
          const [target, setTarget] = useState<Window>(a.win)
          const hasLeft = usePageLeave({ window: target })
          return (
            <div>
              <button
                type="button"
                data-testid="switch"
                onClick={() => setTarget(b.win)}
              >
                switch
              </button>
              <span
                data-testid="page-leave-default"
                data-has-left={String(hasLeft)}
              >
                {String(hasLeft)}
              </span>
            </div>
          )
        }

        const removeA = vi.spyOn(a.win, 'removeEventListener')
        const addB = vi.spyOn(b.win, 'addEventListener')
        render(<Switcher />)

        act(() => {
          dispatchMouseOver(a.win)
          dispatchMouseOut(a.win, null)
        })
        expect(readHasLeft()).toBe(true)

        act(() => {
          screen.getByTestId('switch').click()
        })

        expect(
          removeA.mock.calls.filter(
            ([type]) => type === 'mouseout' || type === 'mouseover',
          ).length,
        ).toBeGreaterThanOrEqual(2)
        expect(
          addB.mock.calls.filter(
            ([type]) => type === 'mouseout' || type === 'mouseover',
          ),
        ).toHaveLength(2)
        expect(readHasLeft()).toBe(true)

        act(() => {
          dispatchMouseOver(a.win)
        })
        expect(readHasLeft()).toBe(true)

        act(() => {
          dispatchMouseOver(b.win)
        })
        expect(readHasLeft()).toBe(false)
      } finally {
        a.cleanup()
        b.cleanup()
      }
    })

    it('detaches when replacing a window with null and preserves state', () => {
      const fixture = createIframeWindow()
      try {
        function Switcher(): ReactElement {
          const [target, setTarget] = useState<Window | null>(fixture.win)
          const hasLeft = usePageLeave({ window: target })
          return (
            <div>
              <button
                type="button"
                data-testid="unbind"
                onClick={() => setTarget(null)}
              >
                unbind
              </button>
              <span
                data-testid="page-leave-default"
                data-has-left={String(hasLeft)}
              >
                {String(hasLeft)}
              </span>
            </div>
          )
        }

        const removeSpy = vi.spyOn(fixture.win, 'removeEventListener')
        render(<Switcher />)
        act(() => {
          dispatchMouseOver(fixture.win)
          dispatchMouseOut(fixture.win, null)
        })
        expect(readHasLeft()).toBe(true)

        act(() => {
          screen.getByTestId('unbind').click()
        })
        expect(
          removeSpy.mock.calls.filter(
            ([type]) => type === 'mouseout' || type === 'mouseover',
          ).length,
        ).toBeGreaterThanOrEqual(2)
        expect(readHasLeft()).toBe(true)

        act(() => {
          dispatchMouseOver(fixture.win)
        })
        expect(readHasLeft()).toBe(true)
      } finally {
        fixture.cleanup()
      }
    })
    it('ignores iframe attach-time mouseout before the first enter', () => {
      const fixture = createIframeWindow()
      try {
        render(<Harness options={{ window: fixture.win }} />)
        act(() => {
          // Simulate common contentWindow load/attach noise.
          dispatchMouseOut(fixture.win, null)
          dispatchMouseOut(fixture.win, null)
        })
        expect(readHasLeft()).toBe(false)
        act(() => {
          dispatchMouseOver(fixture.win)
          dispatchMouseOut(fixture.win, null)
        })
        expect(readHasLeft()).toBe(true)
      } finally {
        fixture.cleanup()
      }
    })
  })

  describe('lifecycle safety', () => {
    it('pairs add and remove listeners exactly', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = render(<Harness />)

      const addedOut = addSpy.mock.calls.filter(([type]) => type === 'mouseout')
      const addedOver = addSpy.mock.calls.filter(
        ([type]) => type === 'mouseover',
      )
      expect(addedOut).toHaveLength(1)
      expect(addedOver).toHaveLength(1)

      unmount()

      const removedOut = removeSpy.mock.calls.filter(
        ([type, listener]) =>
          type === 'mouseout' && listener === addedOut[0]?.[1],
      )
      const removedOver = removeSpy.mock.calls.filter(
        ([type, listener]) =>
          type === 'mouseover' && listener === addedOver[0]?.[1],
      )
      expect(removedOut).toHaveLength(1)
      expect(removedOver).toHaveLength(1)
    })

    it('keeps one effective listener pair under Strict Mode', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      render(
        <StrictMode>
          <Harness />
        </StrictMode>,
      )

      const netOut =
        addSpy.mock.calls.filter(([type]) => type === 'mouseout').length -
        removeSpy.mock.calls.filter(([type]) => type === 'mouseout').length
      const netOver =
        addSpy.mock.calls.filter(([type]) => type === 'mouseover').length -
        removeSpy.mock.calls.filter(([type]) => type === 'mouseover').length
      expect(netOut).toBe(1)
      expect(netOver).toBe(1)
    })

    it('ignores events after unmount', () => {
      let renders = 0
      const { unmount } = render(
        <Harness
          onRender={() => {
            renders += 1
          }}
        />,
      )
      const afterMount = renders
      unmount()
      act(() => {
        dispatchMouseOut(window, null)
        dispatchMouseOver(window)
      })
      expect(renders).toBe(afterMount)
    })

    it('keeps two instances independent', () => {
      const a = createIframeWindow()
      const b = createIframeWindow()
      try {
        render(
          <>
            <Harness options={{ window: a.win }} label="a" />
            <Harness options={{ window: b.win }} label="b" />
          </>,
        )

        act(() => {
          dispatchMouseOver(a.win)
          dispatchMouseOut(a.win, null)
        })
        expect(readHasLeft('a')).toBe(true)
        expect(readHasLeft('b')).toBe(false)

        act(() => {
          dispatchMouseOver(b.win)
          dispatchMouseOut(b.win, null)
        })
        expect(readHasLeft('a')).toBe(true)
        expect(readHasLeft('b')).toBe(true)

        act(() => {
          dispatchMouseOver(a.win)
        })
        expect(readHasLeft('a')).toBe(false)
        expect(readHasLeft('b')).toBe(true)
      } finally {
        a.cleanup()
        b.cleanup()
      }
    })

    it('unmounting one instance does not affect another', () => {
      const a = createIframeWindow()
      const b = createIframeWindow()
      try {
        function Dual(): ReactElement {
          const [showA, setShowA] = useState(true)
          return (
            <div>
              <button
                type="button"
                data-testid="hide-a"
                onClick={() => setShowA(false)}
              >
                hide
              </button>
              {showA ? <Harness options={{ window: a.win }} label="a" /> : null}
              <Harness options={{ window: b.win }} label="b" />
            </div>
          )
        }

        render(<Dual />)
        act(() => {
          dispatchMouseOver(a.win)
          dispatchMouseOut(a.win, null)
          dispatchMouseOver(b.win)
          dispatchMouseOut(b.win, null)
        })
        expect(readHasLeft('a')).toBe(true)
        expect(readHasLeft('b')).toBe(true)

        act(() => {
          screen.getByTestId('hide-a').click()
        })
        expect(readHasLeft('b')).toBe(true)
        act(() => {
          dispatchMouseOver(b.win)
        })
        expect(readHasLeft('b')).toBe(false)
      } finally {
        a.cleanup()
        b.cleanup()
      }
    })

    it('does not reseed initialValue after live updates, disable, or window change', () => {
      function ReseedProbe(): ReactElement {
        const [initialValue, setInitialValue] = useState(false)
        const [enabled, setEnabled] = useState(true)
        const [target, setTarget] = useState<Window | null | undefined>(
          undefined,
        )
        const hasLeft = usePageLeave({
          initialValue,
          enabled,
          ...(target === undefined ? {} : { window: target }),
        })
        return (
          <div>
            <button
              type="button"
              data-testid="flip-initial"
              onClick={() => setInitialValue(true)}
            >
              flip
            </button>
            <button
              type="button"
              data-testid="disable"
              onClick={() => setEnabled(false)}
            >
              disable
            </button>
            <button
              type="button"
              data-testid="enable"
              onClick={() => setEnabled(true)}
            >
              enable
            </button>
            <button
              type="button"
              data-testid="null-window"
              onClick={() => setTarget(null)}
            >
              null
            </button>
            <span
              data-testid="page-leave-default"
              data-has-left={String(hasLeft)}
            >
              {String(hasLeft)}
            </span>
          </div>
        )
      }

      render(<ReseedProbe />)
      act(() => {
        dispatchMouseOver(window)
        dispatchMouseOut(window, null)
      })
      expect(readHasLeft()).toBe(true)

      act(() => {
        screen.getByTestId('flip-initial').click()
      })
      expect(readHasLeft()).toBe(true)

      act(() => {
        screen.getByTestId('disable').click()
        screen.getByTestId('enable').click()
        screen.getByTestId('null-window').click()
      })
      expect(readHasLeft()).toBe(true)
    })
  })

  describe('SSR', () => {
    it('imports and render-to-strings without browser side effects', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined)
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined)

      function SsrComponent(): ReactElement {
        const hasLeft = usePageLeave({ initialValue: true })
        return <div>{String(hasLeft)}</div>
      }

      const html = renderToString(<SsrComponent />)
      expect(html).toContain('true')
      expect(
        addSpy.mock.calls.filter(
          ([type]) => type === 'mouseout' || type === 'mouseover',
        ),
      ).toHaveLength(0)

      const messages = [...warnSpy.mock.calls, ...errorSpy.mock.calls]
        .flat()
        .map(String)
        .join('\n')
        .toLowerCase()
      expect(messages).not.toContain('uselayouteffect')
    })

    it('returns default initial false during SSR', () => {
      function SsrComponent(): ReactElement {
        const hasLeft = usePageLeave()
        useEffect(() => {
          // no-op; ensures hook is effect-based
        }, [])
        return <div>{String(hasLeft)}</div>
      }
      expect(renderToString(<SsrComponent />)).toContain('false')
    })
  })
})
