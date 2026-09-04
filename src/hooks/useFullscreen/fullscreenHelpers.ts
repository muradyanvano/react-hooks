import type { RefObject } from 'react'

export type UseFullscreenTarget = Element

export type UseFullscreenNavigationUI = 'auto' | 'show' | 'hide'

export interface UseFullscreenOptions {
  enabled?: boolean
  autoExit?: boolean
  document?: Document | null
  navigationUI?: UseFullscreenNavigationUI
  onError?: (error: Error) => void
}

export interface UseFullscreenReturn {
  isSupported: boolean
  isFullscreen: boolean
  fullscreenElement: Element | null
  error: Error | null
  enter: () => Promise<boolean>
  exit: () => Promise<boolean>
  toggle: () => Promise<boolean>
}

export const DEFAULT_ENABLED = true
export const DEFAULT_AUTO_EXIT = false
export const DEFAULT_NAVIGATION_UI: UseFullscreenNavigationUI = 'auto'

export const MISMATCH_ERROR_MESSAGE =
  'Fullscreen target ownerDocument does not match the explicit document option'

export type FullscreenFamily = 'standard' | 'webkit'

export interface FullscreenAdapter {
  family: FullscreenFamily
  changeEvent: 'fullscreenchange' | 'webkitfullscreenchange'
  errorEvent: 'fullscreenerror' | 'webkitfullscreenerror'
  request(
    element: Element,
    options?: { navigationUI?: UseFullscreenNavigationUI },
  ): unknown
  exit(doc: Document): unknown
  getFullscreenElement(doc: Document): Element | null
  isFullscreenEnabled(doc: Document): boolean
}

export interface FullscreenViewState {
  isSupported: boolean
  isFullscreen: boolean
  fullscreenElement: Element | null
  error: Error | null
}

export interface ResolvedFullscreenContext {
  target: Element | null
  document: Document | null
  adapter: FullscreenAdapter | null
  mismatch: boolean
}

type WebkitDocument = Document & {
  webkitExitFullscreen?: () => void | PromiseLike<void>
  webkitFullscreenElement?: Element | null
  webkitFullscreenEnabled?: boolean
}

type WebkitElement = Element & {
  webkitRequestFullscreen?: (options?: unknown) => void | PromiseLike<void>
}

const NAVIGATION_VALUES: ReadonlySet<string> = new Set(['auto', 'show', 'hide'])

export function normalizeError(cause: unknown): Error {
  if (cause instanceof Error) {
    return cause
  }
  if (cause != null && typeof cause === 'object') {
    const record = cause as { name?: unknown; message?: unknown }
    if (typeof record.message === 'string' || typeof record.name === 'string') {
      const error = new Error(
        typeof record.message === 'string'
          ? record.message
          : 'Fullscreen request failed',
      )
      if (typeof record.name === 'string' && record.name.length > 0) {
        error.name = record.name
      }
      return error
    }
  }
  if (typeof cause === 'string') {
    return new Error(cause)
  }
  try {
    return new Error(String(cause))
  } catch {
    return new Error('Unknown fullscreen error')
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

export function normalizeNavigationUI(
  value: unknown,
): UseFullscreenNavigationUI | null {
  if (typeof value !== 'string' || !NAVIGATION_VALUES.has(value)) {
    return null
  }
  return value as UseFullscreenNavigationUI
}

export function resolveGlobalDocument(): Document | null {
  if (typeof globalThis !== 'undefined' && 'document' in globalThis) {
    const doc = (globalThis as { document?: Document }).document
    return doc ?? null
  }
  return null
}

export function resolveOptionDocument(
  option: Document | null | undefined,
): Document | null {
  if (option === null) {
    return null
  }
  if (option !== undefined) {
    return option
  }
  return resolveGlobalDocument()
}

function readStandardFullscreenElement(doc: Document): Element | null {
  try {
    return doc.fullscreenElement ?? null
  } catch {
    return null
  }
}

function readWebkitFullscreenElement(doc: Document): Element | null {
  try {
    const value = (doc as WebkitDocument).webkitFullscreenElement
    return value ?? null
  } catch {
    return null
  }
}

function readStandardEnabled(doc: Document): boolean {
  try {
    return Boolean(doc.fullscreenEnabled)
  } catch {
    return false
  }
}

function readWebkitEnabled(doc: Document): boolean {
  try {
    return Boolean((doc as WebkitDocument).webkitFullscreenEnabled)
  } catch {
    return false
  }
}

function hasCallable(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === 'function'
}

function hasProperty(target: object, key: string): boolean {
  let current: object | null = target
  while (current != null) {
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      return true
    }
    current = Object.getPrototypeOf(current)
  }
  return false
}

/**
 * A family is complete when request, exit, and fullscreen-element state exist
 * on the same realm. Event names cannot be probed and are assumed for the
 * chosen family. Do not mix standard and WebKit members.
 */
export function isStandardFamilyComplete(
  doc: Document,
  sampleTarget?: Element | null,
): boolean {
  const probe =
    sampleTarget ??
    (typeof doc.documentElement !== 'undefined' ? doc.documentElement : null)
  return (
    probe != null &&
    hasCallable(probe.requestFullscreen) &&
    hasCallable(doc.exitFullscreen) &&
    hasProperty(doc, 'fullscreenElement')
  )
}

export function isWebkitFamilyComplete(
  doc: Document,
  sampleTarget?: Element | null,
): boolean {
  const probe =
    sampleTarget ??
    (typeof doc.documentElement !== 'undefined' ? doc.documentElement : null)
  return (
    probe != null &&
    hasCallable((probe as WebkitElement).webkitRequestFullscreen) &&
    hasCallable((doc as WebkitDocument).webkitExitFullscreen) &&
    hasProperty(doc, 'webkitFullscreenElement')
  )
}

export function createStandardAdapter(): FullscreenAdapter {
  return {
    family: 'standard',
    changeEvent: 'fullscreenchange',
    errorEvent: 'fullscreenerror',
    request(element, options) {
      const fn = element.requestFullscreen
      if (!hasCallable(fn)) {
        throw new TypeError('requestFullscreen is not available')
      }
      if (options != null) {
        return fn.call(element, options)
      }
      return fn.call(element)
    },
    exit(doc) {
      const fn = doc.exitFullscreen
      if (!hasCallable(fn)) {
        throw new TypeError('exitFullscreen is not available')
      }
      return fn.call(doc)
    },
    getFullscreenElement: readStandardFullscreenElement,
    isFullscreenEnabled: readStandardEnabled,
  }
}

export function createWebkitAdapter(): FullscreenAdapter {
  return {
    family: 'webkit',
    changeEvent: 'webkitfullscreenchange',
    errorEvent: 'webkitfullscreenerror',
    request(element) {
      const fn = (element as WebkitElement).webkitRequestFullscreen
      if (!hasCallable(fn)) {
        throw new TypeError('webkitRequestFullscreen is not available')
      }
      // Prefixed WebKit methods typically do not accept FullscreenOptions.
      return fn.call(element)
    },
    exit(doc) {
      const fn = (doc as WebkitDocument).webkitExitFullscreen
      if (!hasCallable(fn)) {
        throw new TypeError('webkitExitFullscreen is not available')
      }
      return fn.call(doc)
    },
    getFullscreenElement: readWebkitFullscreenElement,
    isFullscreenEnabled: readWebkitEnabled,
  }
}

/**
 * Prefer a coherent standard family when complete. Fall back to a coherent
 * WebKit-prefixed family. Do not mix families.
 *
 * Incomplete standard request/exit without state yields to a complete WebKit
 * family. Event presence cannot be detected; the chosen family's event names
 * are assumed.
 */
export function resolveFullscreenAdapter(
  doc: Document | null,
  sampleTarget?: Element | null,
): FullscreenAdapter | null {
  if (doc == null) {
    return null
  }

  if (isStandardFamilyComplete(doc, sampleTarget)) {
    return createStandardAdapter()
  }

  if (isWebkitFamilyComplete(doc, sampleTarget)) {
    return createWebkitAdapter()
  }

  return null
}

export function isFullscreenSupported(
  doc: Document | null,
  sampleTarget?: Element | null,
): boolean {
  // Presence of a coherent request/exit/state family is support; enabled may
  // still be false under permissions policy (requests can still fail).
  return resolveFullscreenAdapter(doc, sampleTarget) != null
}

export function createMismatchError(): Error {
  return new Error(MISMATCH_ERROR_MESSAGE)
}

export function isMismatchError(error: Error | null | undefined): boolean {
  return error != null && error.message === MISMATCH_ERROR_MESSAGE
}

export function resolveTargetElement<T extends UseFullscreenTarget>(
  ref: RefObject<T | null> | undefined,
  resolvedDocument: Document | null,
): Element | null {
  if (ref != null) {
    const current = ref.current
    if (current != null) {
      return current
    }
    // Explicit ref with null current: do not fall back to documentElement.
    return null
  }
  if (resolvedDocument == null) {
    return null
  }
  try {
    return resolvedDocument.documentElement ?? null
  } catch {
    return null
  }
}

/**
 * Resolve the effective target/document/adapter.
 * When a target exists, its ownerDocument is authoritative.
 * An explicit document that differs from the target's ownerDocument is a mismatch.
 */
export function resolveFullscreenContext<T extends UseFullscreenTarget>(
  ref: RefObject<T | null> | undefined,
  documentOption: Document | null | undefined,
): ResolvedFullscreenContext {
  const optionDocument = resolveOptionDocument(documentOption)

  if (ref != null) {
    const target = ref.current
    if (target == null) {
      return {
        target: null,
        document: optionDocument,
        adapter:
          optionDocument != null
            ? resolveFullscreenAdapter(optionDocument)
            : null,
        mismatch: false,
      }
    }

    let owner: Document | null
    try {
      owner = target.ownerDocument ?? null
    } catch {
      owner = null
    }

    if (
      documentOption !== undefined &&
      documentOption !== null &&
      owner != null &&
      documentOption !== owner
    ) {
      return {
        target,
        document: owner,
        adapter: resolveFullscreenAdapter(owner, target),
        mismatch: true,
      }
    }

    return {
      target,
      document: owner,
      adapter: owner != null ? resolveFullscreenAdapter(owner, target) : null,
      mismatch: false,
    }
  }

  // Omitted ref: use selected document's documentElement.
  const target =
    optionDocument != null
      ? resolveTargetElement(undefined, optionDocument)
      : null
  return {
    target,
    document: optionDocument,
    adapter:
      optionDocument != null
        ? resolveFullscreenAdapter(optionDocument, target)
        : null,
    mismatch: false,
  }
}

export function normalizeThenables(result: unknown): Promise<void> {
  return Promise.resolve(result as void | PromiseLike<void>).then(
    () => undefined,
  )
}

export function fullscreenStatesEqual(
  a: FullscreenViewState,
  b: FullscreenViewState,
): boolean {
  return (
    a.isSupported === b.isSupported &&
    a.isFullscreen === b.isFullscreen &&
    a.fullscreenElement === b.fullscreenElement &&
    a.error === b.error
  )
}

export function deriveFullscreenState(
  adapter: FullscreenAdapter | null,
  doc: Document | null,
  target: Element | null,
  error: Error | null,
): FullscreenViewState {
  if (adapter == null || doc == null) {
    return {
      isSupported: false,
      isFullscreen: false,
      fullscreenElement: null,
      error,
    }
  }

  let fullscreenElement: Element | null
  try {
    fullscreenElement = adapter.getFullscreenElement(doc)
  } catch (cause) {
    return {
      isSupported: true,
      isFullscreen: false,
      fullscreenElement: null,
      error: error ?? normalizeError(cause),
    }
  }

  return {
    isSupported: true,
    isFullscreen: target != null && fullscreenElement === target,
    fullscreenElement,
    error,
  }
}
