export type UseScrollLockTarget = HTMLElement | SVGElement | Window | Document

export type StyleCapableElement = HTMLElement | SVGElement

export interface AxisOverflowSnapshot {
  value: string | null
  priority: string
}

export interface OverflowSnapshot {
  overflow: AxisOverflowSnapshot
  overflowX: AxisOverflowSnapshot
  overflowY: AxisOverflowSnapshot
}

export function isBrowserEnvironment(): boolean {
  return typeof document !== 'undefined'
}

export function isWindowTarget(target: unknown): target is Window {
  const candidate = target as {
    addEventListener?: unknown
    document?: unknown
    window?: unknown
  } | null

  return (
    candidate != null &&
    typeof candidate.addEventListener === 'function' &&
    typeof candidate.document === 'object' &&
    candidate.document != null &&
    candidate.window === target
  )
}

export function isDocumentTarget(target: unknown): target is Document {
  const candidate = target as {
    nodeType?: unknown
    defaultView?: unknown
  } | null

  return (
    candidate != null &&
    typeof candidate.nodeType === 'number' &&
    candidate.nodeType === 9 &&
    'defaultView' in candidate
  )
}

export function isStyleCapableElement(
  value: unknown,
): value is StyleCapableElement {
  if (value == null || typeof value !== 'object') {
    return false
  }

  const candidate = value as {
    nodeType?: unknown
    style?: unknown
  }

  if (candidate.nodeType !== 1) {
    return false
  }

  const style = candidate.style as CSSStyleDeclaration | null | undefined
  return (
    style != null &&
    typeof style.getPropertyValue === 'function' &&
    typeof style.setProperty === 'function' &&
    typeof style.removeProperty === 'function'
  )
}

export function resolveOwningDocument(
  target: UseScrollLockTarget,
): Document | null {
  try {
    if (isDocumentTarget(target)) {
      return target
    }

    if (isWindowTarget(target)) {
      return target.document
    }

    return target.ownerDocument
  } catch {
    return null
  }
}

export function resolveDocumentScrollRoot(
  doc: Document,
): StyleCapableElement | null {
  try {
    const scrollingElement = doc.scrollingElement
    if (isStyleCapableElement(scrollingElement)) {
      return scrollingElement
    }

    if (isStyleCapableElement(doc.documentElement)) {
      return doc.documentElement
    }

    if (isStyleCapableElement(doc.body)) {
      return doc.body
    }
  } catch {
    return null
  }

  return null
}

/**
 * Resolves a hook target to the Element whose inline `overflow` is locked.
 * Window and Document targets that share a scrolling root resolve identically.
 */
export function resolveLockElement(
  target: UseScrollLockTarget | null | undefined,
): StyleCapableElement | null {
  if (target == null) {
    return null
  }

  try {
    if (isWindowTarget(target)) {
      const doc = resolveOwningDocument(target)
      return doc == null ? null : resolveDocumentScrollRoot(doc)
    }

    if (isDocumentTarget(target)) {
      return resolveDocumentScrollRoot(target)
    }

    if (isStyleCapableElement(target)) {
      return target
    }
  } catch {
    return null
  }

  return null
}

function readAxisSnapshot(
  style: CSSStyleDeclaration,
  property: 'overflow' | 'overflow-x' | 'overflow-y',
): AxisOverflowSnapshot {
  const value = style.getPropertyValue(property)
  const priority = style.getPropertyPriority(property)
  return {
    value: value === '' ? null : value,
    priority,
  }
}

function restoreAxisSnapshot(
  style: CSSStyleDeclaration,
  property: 'overflow' | 'overflow-x' | 'overflow-y',
  snapshot: AxisOverflowSnapshot,
): void {
  if (snapshot.value == null) {
    style.removeProperty(property)
    return
  }

  style.setProperty(
    property,
    snapshot.value,
    snapshot.priority === 'important' ? 'important' : '',
  )
}

export function readOverflowSnapshot(
  element: StyleCapableElement,
): OverflowSnapshot | null {
  try {
    const style = element.style
    return {
      overflow: readAxisSnapshot(style, 'overflow'),
      overflowX: readAxisSnapshot(style, 'overflow-x'),
      overflowY: readAxisSnapshot(style, 'overflow-y'),
    }
  } catch {
    return null
  }
}

export function applyOverflowHidden(element: StyleCapableElement): boolean {
  try {
    element.style.setProperty('overflow', 'hidden')
    return true
  } catch {
    return false
  }
}

export function restoreOverflowSnapshot(
  element: StyleCapableElement,
  snapshot: OverflowSnapshot,
): boolean {
  try {
    const style = element.style
    restoreAxisSnapshot(style, 'overflow', snapshot.overflow)
    restoreAxisSnapshot(style, 'overflow-x', snapshot.overflowX)
    restoreAxisSnapshot(style, 'overflow-y', snapshot.overflowY)
    return true
  } catch {
    return false
  }
}
