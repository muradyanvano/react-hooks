import { act, cleanup, render, screen } from '@testing-library/react'
import { StrictMode, useState, type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  useTextSelection,
  type UseTextSelectionOptions,
  type UseTextSelectionReturn,
} from './useTextSelection'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function rect(x: number): DOMRect {
  return {
    x,
    y: 2,
    width: 3,
    height: 4,
    top: 2,
    right: x + 3,
    bottom: 6,
    left: x,
  } as DOMRect
}

function selection(text: string, ranges: Range[]): Selection {
  return {
    toString: () => text,
    rangeCount: ranges.length,
    getRangeAt: (index: number) => {
      const range = ranges[index]
      if (range === undefined) throw new Error('missing range')
      return range
    },
  } as unknown as Selection
}

function Harness({
  options,
  onRender,
}: {
  options?: UseTextSelectionOptions
  onRender?: (value: UseTextSelectionReturn) => void
}): ReactElement {
  const value = useTextSelection(options)
  onRender?.(value)
  return (
    <output
      data-testid="selection"
      data-rects={value.rects.map((item) => item.x).join(',')}
      data-ranges={String(value.ranges.length)}
      data-selection={value.selection == null ? 'null' : 'selection'}
    >
      {value.text || 'empty'}
    </output>
  )
}

function dispatchSelectionChange(doc: Document): void {
  doc.dispatchEvent(new Event('selectionchange'))
}

function makeRange(...rects: DOMRect[]): Range {
  return { getClientRects: () => rects } as unknown as Range
}

function createIframeWindow(): { win: Window; cleanup: () => void } {
  const iframe = document.createElement('iframe')
  document.body.appendChild(iframe)
  const win = iframe.contentWindow
  if (win == null) throw new Error('iframe window unavailable')
  return { win, cleanup: () => iframe.remove() }
}

describe('useTextSelection', () => {
  it('syncs text, ranges, and flattened rectangles after attaching', () => {
    const first = makeRange(rect(10), rect(11))
    const second = makeRange(rect(20))
    const getSelection = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue(selection('  café\n世界  ', [first, second]))

    render(<Harness />)

    expect(getSelection).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('selection').textContent).toBe('  café\n世界  ')
    expect(screen.getByTestId('selection').getAttribute('data-rects')).toBe(
      '10,11,20',
    )
    expect(screen.getByTestId('selection').getAttribute('data-ranges')).toBe(
      '2',
    )
  })

  it('clears safely when getSelection, getRangeAt, or getClientRects throws', () => {
    const getSelection = vi.spyOn(window, 'getSelection')
    getSelection.mockImplementationOnce(() => {
      throw new Error('selection denied')
    })
    render(<Harness />)
    expect(screen.getByTestId('selection').textContent).toBe('empty')

    const badRange = {
      getClientRects: () => {
        throw new Error('layout denied')
      },
    } as unknown as Range
    getSelection.mockReturnValue(selection('would be partial', [badRange]))
    act(() => dispatchSelectionChange(document))
    expect(screen.getByTestId('selection').textContent).toBe('empty')
    expect(screen.getByTestId('selection').getAttribute('data-ranges')).toBe(
      '0',
    )
  })

  it('preserves state identity when selection data is unchanged', () => {
    const stable = selection('same', [makeRange(rect(1))])
    vi.spyOn(window, 'getSelection').mockReturnValue(stable)
    const values: UseTextSelectionReturn[] = []
    render(<Harness onRender={(value) => values.push(value)} />)
    const initial = values.at(-1)
    act(() => dispatchSelectionChange(document))
    expect(values.at(-1)).toBe(initial)
  })

  it('updates when rectangle geometry changes despite rect object identity changes', () => {
    const range = makeRange(rect(1))
    const current = selection('same', [range])
    vi.spyOn(window, 'getSelection').mockReturnValue(current)
    render(<Harness />)
    expect(screen.getByTestId('selection').getAttribute('data-rects')).toBe('1')

    vi.spyOn(range, 'getClientRects').mockReturnValue([
      rect(99),
    ] as unknown as DOMRectList)
    act(() => dispatchSelectionChange(document))
    expect(screen.getByTestId('selection').getAttribute('data-rects')).toBe(
      '99',
    )
  })

  it('does not register or read selection while disabled, and fresh-syncs on enable', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const getSelection = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue(selection('fresh', []))

    function Toggle(): ReactElement {
      const [enabled, setEnabled] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setEnabled((value) => !value)}>
            toggle
          </button>
          <Harness options={{ enabled }} />
        </>
      )
    }
    render(<Toggle />)
    expect(getSelection).not.toHaveBeenCalled()
    expect(
      add.mock.calls.filter(([event]) => event === 'selectionchange'),
    ).toHaveLength(0)

    act(() => screen.getByRole('button').click())
    expect(getSelection).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('selection').textContent).toBe('fresh')
  })

  it('does not churn listeners when only the options object changes', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    vi.spyOn(window, 'getSelection').mockReturnValue(null)
    function Churn(): ReactElement {
      const [, setTick] = useState(0)
      const value = useTextSelection({ enabled: true })
      return (
        <button onClick={() => setTick((tick) => tick + 1)}>
          {value.text}
        </button>
      )
    }
    render(<Churn />)
    const adds = add.mock.calls.filter(
      ([event]) => event === 'selectionchange',
    ).length
    const removes = remove.mock.calls.filter(
      ([event]) => event === 'selectionchange',
    ).length
    act(() => screen.getByRole('button').click())
    expect(
      add.mock.calls.filter(([event]) => event === 'selectionchange').length,
    ).toBe(adds)
    expect(
      remove.mock.calls.filter(([event]) => event === 'selectionchange').length,
    ).toBe(removes)
  })

  it('uses explicit null as no window and does not fall back', () => {
    const getSelection = vi.spyOn(window, 'getSelection')
    render(<Harness options={{ window: null }} />)
    expect(getSelection).not.toHaveBeenCalled()
    expect(screen.getByTestId('selection').textContent).toBe('empty')
  })

  it('observes only the selected custom window document', () => {
    const fixture = createIframeWindow()
    try {
      const customSelection = selection('iframe', [])
      vi.spyOn(fixture.win, 'getSelection').mockReturnValue(customSelection)
      render(<Harness options={{ window: fixture.win }} />)
      expect(screen.getByTestId('selection').textContent).toBe('iframe')
      vi.spyOn(fixture.win, 'getSelection').mockReturnValue(
        selection('new', []),
      )
      act(() => dispatchSelectionChange(fixture.win.document))
      expect(screen.getByTestId('selection').textContent).toBe('new')
      act(() => dispatchSelectionChange(document))
      expect(screen.getByTestId('selection').textContent).toBe('new')
    } finally {
      fixture.cleanup()
    }
  })

  it('clears and moves listener on window replacement, ignoring stale events', () => {
    const a = createIframeWindow()
    const b = createIframeWindow()
    try {
      vi.spyOn(a.win, 'getSelection').mockReturnValue(selection('a', []))
      vi.spyOn(b.win, 'getSelection').mockReturnValue(selection('b', []))
      function Switcher(): ReactElement {
        const [target, setTarget] = useState(a.win)
        return (
          <>
            <button type="button" onClick={() => setTarget(b.win)}>
              switch
            </button>
            <Harness options={{ window: target }} />
          </>
        )
      }
      render(<Switcher />)
      expect(screen.getByTestId('selection').textContent).toBe('a')
      act(() => screen.getByRole('button').click())
      expect(screen.getByTestId('selection').textContent).toBe('b')
      vi.spyOn(a.win, 'getSelection').mockReturnValue(selection('stale', []))
      act(() => dispatchSelectionChange(a.win.document))
      expect(screen.getByTestId('selection').textContent).toBe('b')
    } finally {
      a.cleanup()
      b.cleanup()
    }
  })

  it('removes its listener without calling getSelection during cleanup', () => {
    const getSelection = vi.spyOn(window, 'getSelection').mockReturnValue(null)
    const { unmount } = render(<Harness />)
    getSelection.mockClear()
    unmount()
    expect(getSelection).not.toHaveBeenCalled()
  })

  it('keeps one effective listener under Strict Mode', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    vi.spyOn(window, 'getSelection').mockReturnValue(null)
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    )
    const active =
      add.mock.calls.filter(([event]) => event === 'selectionchange').length -
      remove.mock.calls.filter(([event]) => event === 'selectionchange').length
    expect(active).toBe(1)
  })

  it('renders the empty state during SSR without selection access or layout-effect warnings', () => {
    const getSelection = vi.spyOn(window, 'getSelection')
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const html = renderToString(<Harness />)
    expect(html).toContain('empty')
    expect(getSelection).not.toHaveBeenCalled()
    expect(error.mock.calls.flat().join('\n').toLowerCase()).not.toContain(
      'uselayouteffect',
    )
  })

  it('exposes an empty browser selection as the package empty result', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue(null)
    render(<Harness />)
    expect(screen.getByTestId('selection').textContent).toBe('empty')
    expect(screen.getByTestId('selection').getAttribute('data-selection')).toBe(
      'null',
    )
  })

  it('keeps a collapsed range while preserving empty selected text', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue(
      selection('', [makeRange()]),
    )
    render(<Harness />)
    expect(screen.getByTestId('selection').textContent).toBe('empty')
    expect(screen.getByTestId('selection').getAttribute('data-ranges')).toBe(
      '1',
    )
    expect(screen.getByTestId('selection').getAttribute('data-rects')).toBe('')
  })

  it('clears a current selection when disabled and does not read while disabled', () => {
    const getSelection = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue(selection('selected', []))
    const { rerender } = render(<Harness options={{ enabled: true }} />)
    expect(screen.getByTestId('selection').textContent).toBe('selected')
    getSelection.mockClear()
    rerender(<Harness options={{ enabled: false }} />)
    expect(screen.getByTestId('selection').textContent).toBe('empty')
    expect(getSelection).not.toHaveBeenCalled()
    act(() => dispatchSelectionChange(document))
    expect(getSelection).not.toHaveBeenCalled()
  })

  it('does not rerender for an equal re-read from a distinct rectangle object', () => {
    const current = selection('same', [makeRange(rect(1))])
    vi.spyOn(window, 'getSelection').mockReturnValue(current)
    const values: UseTextSelectionReturn[] = []
    render(<Harness onRender={(value) => values.push(value)} />)
    const rendered = values.length
    act(() => dispatchSelectionChange(document))
    expect(values).toHaveLength(rendered)
  })

  it('does not retain selection state when the selected window becomes null', () => {
    const fixture = createIframeWindow()
    try {
      vi.spyOn(fixture.win, 'getSelection').mockReturnValue(
        selection('frame', []),
      )
      const { rerender } = render(<Harness options={{ window: fixture.win }} />)
      expect(screen.getByTestId('selection').textContent).toBe('frame')
      rerender(<Harness options={{ window: null }} />)
      expect(screen.getByTestId('selection').textContent).toBe('empty')
    } finally {
      fixture.cleanup()
    }
  })

  it('removes the exact registered listener during cleanup', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    vi.spyOn(window, 'getSelection').mockReturnValue(null)
    const { unmount } = render(<Harness />)
    const added = add.mock.calls.find(([type]) => type === 'selectionchange')
    unmount()
    expect(
      remove.mock.calls.some(
        ([type, listener]) =>
          type === 'selectionchange' && listener === added?.[1],
      ),
    ).toBe(true)
  })
})
