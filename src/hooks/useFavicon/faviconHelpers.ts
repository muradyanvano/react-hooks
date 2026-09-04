export interface UseFaviconOptions {
  enabled?: boolean
  document?: Document | null
  baseUrl?: string
  rel?: string
  restoreOnUnmount?: boolean
  onError?: (error: Error) => void
}

export interface UseFaviconReturn {
  href: string | null
  isSupported: boolean
  error: Error | null
}

export const DEFAULT_ENABLED = true
export const DEFAULT_REL = 'icon'
export const DEFAULT_RESTORE_ON_UNMOUNT = true

export interface FaviconViewState {
  href: string | null
  isSupported: boolean
  error: Error | null
}

export const IDLE_STATE: FaviconViewState = {
  href: null,
  isSupported: false,
  error: null,
}

export interface AttributeSnapshot {
  present: boolean
  value: string | null
}

export interface ExistingLinkSnapshot {
  kind: 'existing'
  element: HTMLLinkElement
  href: AttributeSnapshot
  rel: AttributeSnapshot
}

export interface CreatedLinkSnapshot {
  kind: 'created'
  element: HTMLLinkElement
}

export type LinkSnapshot = ExistingLinkSnapshot | CreatedLinkSnapshot

export function normalizeError(cause: unknown): Error {
  if (cause instanceof Error) {
    return cause
  }
  if (typeof cause === 'string') {
    return new Error(cause)
  }
  try {
    return new Error(String(cause))
  } catch {
    return new Error('Unknown favicon error')
  }
}

export function invokeOnErrorSafely(
  onError: ((error: Error) => void) | undefined,
  error: Error,
): void {
  if (onError == null) {
    return
  }
  try {
    onError(error)
  } catch {
    // Consumer callback failures must not break the hook lifecycle.
  }
}

/**
 * Collapse insignificant surrounding / inter-token whitespace while preserving
 * meaningful relation tokens (case preserved for writing attributes).
 */
export function normalizeRelDisplay(rel: string): string {
  return rel.trim().split(/\s+/).filter(Boolean).join(' ')
}

/**
 * Case-insensitive registry / matching key from relation tokens.
 * Token order is sorted so `shortcut icon` and `icon shortcut` share a channel.
 * Duplicate tokens collapse so `icon icon` matches `icon`.
 */
export function normalizeRelKey(rel: string): string {
  const tokens = normalizeRelDisplay(rel)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  return [...new Set(tokens)].sort().join(' ')
}

export function validateRel(
  rel: unknown,
): { ok: true; display: string; key: string } | { ok: false; error: Error } {
  if (typeof rel !== 'string') {
    return {
      ok: false,
      error: new Error('rel must be a non-empty relation string'),
    }
  }
  const display = normalizeRelDisplay(rel)
  if (display.length === 0) {
    return {
      ok: false,
      error: new Error('rel must be a non-empty relation string'),
    }
  }
  return { ok: true, display, key: normalizeRelKey(display) }
}

export function relationKeysEqual(a: string, b: string): boolean {
  return normalizeRelKey(a) === normalizeRelKey(b)
}

export function linkMatchesRelKey(
  link: HTMLLinkElement,
  relKey: string,
): boolean {
  const attr = link.getAttribute('rel')
  if (attr == null) {
    return false
  }
  return normalizeRelKey(attr) === relKey
}

/**
 * Collect matching `<link>` elements in document order without building a
 * CSS selector from consumer-provided `rel`.
 */
export function findMatchingIconLinks(
  doc: Document,
  relKey: string,
): HTMLLinkElement[] {
  const head = doc.head
  if (head == null) {
    return []
  }
  const candidates = head.querySelectorAll('link')
  const matches: HTMLLinkElement[] = []
  for (let index = 0; index < candidates.length; index += 1) {
    const node = candidates[index]
    if (node != null && isLinkElement(node)) {
      if (linkMatchesRelKey(node, relKey)) {
        matches.push(node)
      }
    }
  }
  return matches
}

function isLinkElement(node: Element): node is HTMLLinkElement {
  return (
    typeof (node as HTMLLinkElement).rel === 'string' &&
    'href' in node &&
    node.tagName.toLowerCase() === 'link'
  )
}

/** Prefer the last matching link (later candidates commonly take precedence). */
export function selectManagedLink(
  matches: HTMLLinkElement[],
): HTMLLinkElement | null {
  if (matches.length === 0) {
    return null
  }
  return matches[matches.length - 1] ?? null
}

export function isFaviconDocumentSupported(doc: Document | null): boolean {
  if (doc == null) {
    return false
  }
  if (typeof doc.createElement !== 'function') {
    return false
  }
  if (doc.head == null) {
    return false
  }
  if (typeof doc.head.appendChild !== 'function') {
    return false
  }
  return true
}

export function resolveIconHref(
  icon: string,
  baseUrl: string | undefined,
  doc: Document,
): { ok: true; href: string } | { ok: false; error: Error } {
  try {
    const base = baseUrl ?? doc.baseURI
    if (baseUrl !== undefined) {
      // Validate explicit baseUrl independently so failures are clear.
      new URL(baseUrl)
    }
    const href = new URL(icon, base).href
    return { ok: true, href }
  } catch (cause) {
    return { ok: false, error: normalizeError(cause) }
  }
}

export function readAttributeSnapshot(
  element: Element,
  name: string,
): AttributeSnapshot {
  const present = element.hasAttribute(name)
  return {
    present,
    value: present ? element.getAttribute(name) : null,
  }
}

export function snapshotExistingLink(
  element: HTMLLinkElement,
): ExistingLinkSnapshot {
  return {
    kind: 'existing',
    element,
    href: readAttributeSnapshot(element, 'href'),
    rel: readAttributeSnapshot(element, 'rel'),
  }
}

export function applyIconToLink(
  link: HTMLLinkElement,
  href: string,
  relDisplay: string,
): void {
  link.setAttribute('rel', relDisplay)
  link.setAttribute('href', href)
}

export function restoreLinkSnapshot(snapshot: LinkSnapshot): void {
  if (snapshot.kind === 'created') {
    const parent = snapshot.element.parentNode
    if (parent != null) {
      parent.removeChild(snapshot.element)
    }
    return
  }

  const { element, href, rel } = snapshot
  if (!element.isConnected) {
    return
  }

  if (href.present) {
    if (href.value == null) {
      element.setAttribute('href', '')
    } else {
      element.setAttribute('href', href.value)
    }
  } else {
    element.removeAttribute('href')
  }

  if (rel.present) {
    if (rel.value == null) {
      element.setAttribute('rel', '')
    } else {
      element.setAttribute('rel', rel.value)
    }
  } else {
    element.removeAttribute('rel')
  }
}

export function createIconLink(
  doc: Document,
  href: string,
  relDisplay: string,
): HTMLLinkElement {
  const link = doc.createElement('link')
  applyIconToLink(link, href, relDisplay)
  const head = doc.head
  if (head == null) {
    throw new Error('Document head is unavailable')
  }
  head.appendChild(link)
  return link
}

export function faviconStatesEqual(
  a: FaviconViewState,
  b: FaviconViewState,
): boolean {
  return (
    a.href === b.href && a.isSupported === b.isSupported && a.error === b.error
  )
}

/**
 * Resolve the effective document for client effects.
 * - omitted / undefined → global `document` when available
 * - explicit `null` → never fall back
 * - explicit Document → that document
 */
export function resolveEffectiveDocument(
  option: Document | null | undefined,
): Document | null {
  if (option === null) {
    return null
  }
  if (option !== undefined) {
    return option
  }
  if (typeof document !== 'undefined') {
    return document
  }
  return null
}

export function isActiveIconRequest(
  icon: string | null | undefined,
): icon is string {
  return typeof icon === 'string' && icon.length > 0
}
