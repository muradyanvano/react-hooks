export interface UseTextSelectionOptions {
  /**
   * Enables selection observation.
   *
   * @default true
   */
  enabled?: boolean

  /**
   * Browser window whose document selection is observed.
   *
   * Omitted resolves the global window after mount. Explicit null never falls
   * back to the global window.
   */
  window?: Window | null
}

export interface UseTextSelectionReturn {
  text: string
  rects: readonly DOMRect[]
  ranges: readonly Range[]
  selection: Selection | null
}

export const EMPTY_TEXT_SELECTION: UseTextSelectionReturn = {
  text: '',
  rects: Object.freeze([]) as readonly DOMRect[],
  ranges: Object.freeze([]) as readonly Range[],
  selection: null,
}

export function resolveTextSelectionWindow(
  option: Window | null | undefined,
): Window | null {
  if (option === null) {
    return null
  }
  if (option !== undefined) {
    return option
  }

  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    return (globalThis as { window?: Window }).window ?? null
  }
  return null
}

export function readTextSelection(
  win: Pick<Window, 'getSelection'>,
): UseTextSelectionReturn {
  try {
    const selection = win.getSelection()
    if (selection == null) {
      return EMPTY_TEXT_SELECTION
    }

    const text = selection.toString()
    const ranges: Range[] = []
    const rects: DOMRect[] = []

    for (let index = 0; index < selection.rangeCount; index += 1) {
      const range = selection.getRangeAt(index)
      ranges.push(range)
      for (const rect of Array.from(range.getClientRects())) {
        rects.push(rect)
      }
    }

    return {
      text,
      rects: Object.freeze(rects),
      ranges: Object.freeze(ranges),
      selection,
    }
  } catch {
    return EMPTY_TEXT_SELECTION
  }
}

function rectsAreEqual(left: DOMRect, right: DOMRect): boolean {
  return (
    Object.is(left.x, right.x) &&
    Object.is(left.y, right.y) &&
    Object.is(left.width, right.width) &&
    Object.is(left.height, right.height) &&
    Object.is(left.top, right.top) &&
    Object.is(left.right, right.right) &&
    Object.is(left.bottom, right.bottom) &&
    Object.is(left.left, right.left)
  )
}

export function textSelectionsAreEqual(
  left: UseTextSelectionReturn,
  right: UseTextSelectionReturn,
): boolean {
  if (
    left.text !== right.text ||
    left.selection !== right.selection ||
    left.ranges.length !== right.ranges.length ||
    left.rects.length !== right.rects.length
  ) {
    return false
  }

  for (let index = 0; index < left.ranges.length; index += 1) {
    if (left.ranges[index] !== right.ranges[index]) {
      return false
    }
  }
  for (let index = 0; index < left.rects.length; index += 1) {
    const leftRect = left.rects[index]
    const rightRect = right.rects[index]
    if (leftRect === undefined || rightRect === undefined) {
      return false
    }
    if (!rectsAreEqual(leftRect, rightRect)) {
      return false
    }
  }
  return true
}
