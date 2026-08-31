/**
 * Returns whether the currently focused element (including open shadow roots)
 * is an editable control or contenteditable region.
 *
 * Uses owning-window constructors when available. Nested
 * `contenteditable="false"` islands stop ancestor inheritance and are treated
 * as non-editable (matching platform `isContentEditable` semantics).
 */
export function isFocusedElementEditable(
  documentLike: Document | null | undefined = typeof document !== 'undefined'
    ? document
    : null,
): boolean {
  if (documentLike == null) {
    return false
  }

  let active: Element | null = documentLike.activeElement
  while (
    active != null &&
    'shadowRoot' in active &&
    active.shadowRoot != null &&
    active.shadowRoot.activeElement != null
  ) {
    active = active.shadowRoot.activeElement
  }

  if (active == null) {
    return false
  }

  return isElementInEditableContext(active)
}

function isFormControl(element: Element): boolean {
  const view = element.ownerDocument.defaultView
  const HTMLInputElementCtor = view?.HTMLInputElement
  const HTMLTextAreaElementCtor = view?.HTMLTextAreaElement
  const HTMLSelectElementCtor = view?.HTMLSelectElement

  if (HTMLInputElementCtor != null && element instanceof HTMLInputElementCtor) {
    return true
  }

  if (
    HTMLTextAreaElementCtor != null &&
    element instanceof HTMLTextAreaElementCtor
  ) {
    return true
  }

  if (
    HTMLSelectElementCtor != null &&
    element instanceof HTMLSelectElementCtor
  ) {
    return true
  }

  const tagName = element.tagName
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

/**
 * Resolves the contentEditable IDL / attribute to true, false, or inherit.
 * Supports environments (including jsdom) where `isContentEditable` may be
 * missing even after setting the IDL property.
 */
function resolveContentEditable(
  element: Element,
): 'true' | 'false' | 'inherit' {
  const htmlElement = element as HTMLElement

  if (htmlElement.isContentEditable === true) {
    return 'true'
  }

  const attribute = htmlElement.getAttribute?.('contenteditable')
  if (attribute != null) {
    const normalized = attribute.toLowerCase()
    if (normalized === 'false') {
      return 'false'
    }
    if (normalized === 'true' || normalized === '') {
      return 'true'
    }
  }

  const property = htmlElement.contentEditable
  if (typeof property === 'string') {
    const normalized = property.toLowerCase()
    if (normalized === 'false') {
      return 'false'
    }
    if (normalized === 'true') {
      return 'true'
    }
  }

  if (htmlElement.isContentEditable === false) {
    return 'false'
  }

  return 'inherit'
}

function isElementInEditableContext(element: Element): boolean {
  let current: Node | null = element

  while (current != null) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element

      if (isFormControl(el)) {
        return true
      }

      const state = resolveContentEditable(el)
      if (state === 'true') {
        return true
      }
      if (state === 'false') {
        return false
      }
    }

    const parent: Node | null = current.parentNode
    if (parent != null && parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      const root = parent as ShadowRoot
      current = root.host ?? null
      continue
    }

    current = parent
  }

  return false
}

export function isDefaultTypedCharacterValid(event: KeyboardEvent): boolean {
  return (
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.isComposing &&
    !event.repeat &&
    /^[a-z0-9]$/i.test(event.key)
  )
}
