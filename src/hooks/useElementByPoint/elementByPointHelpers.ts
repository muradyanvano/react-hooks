export function areCoordinatesValid(x: number, y: number): boolean {
  return Number.isFinite(x) && Number.isFinite(y)
}

export function resolveDocumentOption(options: {
  document?: Document | null | undefined
}): Document | null {
  if ('document' in options) {
    return options.document ?? null
  }

  if (typeof document === 'undefined') {
    return null
  }

  return document
}

export function isElementByPointSupported(
  doc: Document | null,
  multiple: boolean,
): boolean {
  if (doc == null) {
    return false
  }

  if (multiple) {
    return typeof doc.elementsFromPoint === 'function'
  }

  return typeof doc.elementFromPoint === 'function'
}

export function lookupElementAtPoint(
  doc: Document,
  x: number,
  y: number,
  multiple: boolean,
): Element | null | readonly Element[] {
  if (multiple) {
    const elements = doc.elementsFromPoint(x, y)
    return [...elements]
  }

  return doc.elementFromPoint(x, y)
}

export function elementsListEqual(
  left: readonly Element[],
  right: readonly Element[],
): boolean {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

export const EMPTY_ELEMENT_LIST: readonly Element[] = Object.freeze([])

export function scheduleAnimationFrame(
  targetWindow: Window | null,
  callback: FrameRequestCallback,
): number | null {
  if (targetWindow == null) {
    return null
  }

  if (typeof targetWindow.requestAnimationFrame === 'function') {
    return targetWindow.requestAnimationFrame(callback)
  }

  return null
}

export function cancelAnimationFrameSafe(
  targetWindow: Window | null,
  frameId: number | null,
): void {
  if (frameId == null || targetWindow == null) {
    return
  }

  if (typeof targetWindow.cancelAnimationFrame === 'function') {
    targetWindow.cancelAnimationFrame(frameId)
  }
}
