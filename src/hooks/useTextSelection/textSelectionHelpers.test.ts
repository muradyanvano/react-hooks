import { describe, expect, it, vi } from 'vitest'

import {
  EMPTY_TEXT_SELECTION,
  readTextSelection,
  resolveTextSelectionWindow,
  textSelectionsAreEqual,
} from './textSelectionHelpers'

function rect(values: Partial<DOMRect> = {}): DOMRect {
  return {
    x: 1,
    y: 2,
    width: 3,
    height: 4,
    top: 2,
    right: 4,
    bottom: 6,
    left: 1,
    ...values,
  } as DOMRect
}

describe('textSelectionHelpers', () => {
  it('resolves omitted, explicit, and null windows', () => {
    expect(resolveTextSelectionWindow(undefined)).toBe(window)
    expect(resolveTextSelectionWindow(window)).toBe(window)
    expect(resolveTextSelectionWindow(null)).toBeNull()
  })

  it('returns frozen empty package-owned arrays', () => {
    expect(EMPTY_TEXT_SELECTION).toEqual({
      text: '',
      rects: [],
      ranges: [],
      selection: null,
    })
    expect(Object.isFrozen(EMPTY_TEXT_SELECTION.rects)).toBe(true)
    expect(Object.isFrozen(EMPTY_TEXT_SELECTION.ranges)).toBe(true)
  })

  it('reads text, ordered ranges, and flattened ordered rectangles', () => {
    const firstRange = {
      getClientRects: () => [rect({ x: 10 }), rect({ x: 11 })],
    } as unknown as Range
    const secondRange = {
      getClientRects: () => [rect({ x: 20 })],
    } as unknown as Range
    const selection = {
      toString: () => '  hello\nworld  ',
      rangeCount: 2,
      getRangeAt: vi.fn((index: number) =>
        index === 0 ? firstRange : secondRange,
      ),
    } as unknown as Selection
    const value = readTextSelection({
      getSelection: () => selection,
    } as Window)

    expect(value.text).toBe('  hello\nworld  ')
    expect(value.selection).toBe(selection)
    expect(value.ranges).toEqual([firstRange, secondRange])
    expect(value.rects.map((item) => item.x)).toEqual([10, 11, 20])
    expect(Object.isFrozen(value.ranges)).toBe(true)
    expect(Object.isFrozen(value.rects)).toBe(true)
  })

  it('returns a safe empty selection when browser calls throw', () => {
    expect(
      readTextSelection({
        getSelection: () => {
          throw new Error('blocked')
        },
      } as unknown as Window),
    ).toBe(EMPTY_TEXT_SELECTION)

    expect(
      readTextSelection({
        getSelection: () =>
          ({
            toString: () => 'x',
            rangeCount: 1,
            getRangeAt: () => {
              throw new Error('blocked')
            },
          }) as unknown as Selection,
      } as Window),
    ).toBe(EMPTY_TEXT_SELECTION)
  })

  it('returns empty state when the browser has no selection', () => {
    expect(
      readTextSelection({ getSelection: () => null } as unknown as Window),
    ).toBe(EMPTY_TEXT_SELECTION)
  })

  it('preserves exact text, including whitespace and Unicode', () => {
    const source = ' \tՎանո\n世界 🙂  '
    const selection = {
      toString: () => source,
      rangeCount: 0,
      getRangeAt: vi.fn(),
    } as unknown as Selection
    expect(
      readTextSelection({ getSelection: () => selection } as unknown as Window),
    ).toMatchObject({ text: source, ranges: [], rects: [], selection })
  })

  it('reads one collapsed range without rectangles', () => {
    const range = { getClientRects: () => [] } as unknown as Range
    const selection = {
      toString: () => '',
      rangeCount: 1,
      getRangeAt: () => range,
    } as unknown as Selection
    expect(
      readTextSelection({ getSelection: () => selection } as unknown as Window),
    ).toMatchObject({ text: '', ranges: [range], rects: [] })
  })

  it('returns empty state when range rectangles cannot be read', () => {
    const selection = {
      toString: () => 'partial',
      rangeCount: 1,
      getRangeAt: () =>
        ({
          getClientRects: () => {
            throw new Error('layout denied')
          },
        }) as unknown as Range,
    } as unknown as Selection
    expect(
      readTextSelection({ getSelection: () => selection } as unknown as Window),
    ).toBe(EMPTY_TEXT_SELECTION)
  })

  it('compares selection identity, range identity, and rect geometry', () => {
    const selection = {} as Selection
    const range = {} as Range
    const left = {
      text: 'same',
      selection,
      ranges: Object.freeze([range]),
      rects: Object.freeze([rect()]),
    }
    const sameGeometry = {
      ...left,
      rects: Object.freeze([rect()]),
    }
    expect(textSelectionsAreEqual(left, sameGeometry)).toBe(true)
    expect(
      textSelectionsAreEqual(left, {
        ...sameGeometry,
        rects: Object.freeze([rect({ width: 99 })]),
      }),
    ).toBe(false)
    expect(
      textSelectionsAreEqual(left, {
        ...sameGeometry,
        ranges: Object.freeze([{} as Range]),
      }),
    ).toBe(false)
    expect(
      textSelectionsAreEqual(left, { ...sameGeometry, selection: null }),
    ).toBe(false)
  })

  it('treats ordering and every rectangle field as observable selection data', () => {
    const selection = {} as Selection
    const first = {} as Range
    const second = {} as Range
    const left = {
      text: 'same',
      selection,
      ranges: [first, second],
      rects: [rect({ x: 1 }), rect({ x: 2 })],
    }
    expect(
      textSelectionsAreEqual(left, {
        ...left,
        ranges: [second, first],
      }),
    ).toBe(false)
    expect(
      textSelectionsAreEqual(left, {
        ...left,
        rects: [rect({ left: 0 }), rect({ x: 2 })],
      }),
    ).toBe(false)
  })

  it('treats text and collection lengths as observable selection data', () => {
    const shared = { text: 'a', selection: null, ranges: [], rects: [] }
    expect(textSelectionsAreEqual(shared, { ...shared, text: 'b' })).toBe(false)
    expect(
      textSelectionsAreEqual(shared, {
        ...shared,
        ranges: [{} as Range],
      }),
    ).toBe(false)
    expect(
      textSelectionsAreEqual(shared, {
        ...shared,
        rects: [rect()],
      }),
    ).toBe(false)
  })
})
