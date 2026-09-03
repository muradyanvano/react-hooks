export interface BrowserStorageSerializer<T> {
  read: (raw: string) => T
  write: (value: T) => string
}

export type BrowserStorageMergeDefaults<T> =
  boolean | ((storedValue: T, defaultValue: T) => T)

/** Reads a Storage area from a window. Keep local/session readers separate for tree-shaking. */
export type BrowserStorageAreaReader = (targetWindow: Window) => Storage

export function readLocalStorageArea(targetWindow: Window): Storage {
  return targetWindow.localStorage
}

export function readSessionStorageArea(targetWindow: Window): Storage {
  return targetWindow.sessionStorage
}

export interface BrowserStorageOptions<T> {
  serializer?: BrowserStorageSerializer<T>
  mergeDefaults?: BrowserStorageMergeDefaults<T>
  writeDefaults?: boolean
  listenToStorageChanges?: boolean
  window?: Window | null
  onError?: (error: Error) => void
}

export interface BrowserStorageReturn<T> {
  value: T
  setValue: import('react').Dispatch<import('react').SetStateAction<T>>
  remove: () => void
  reset: () => void
  isSupported: boolean
  isReady: boolean
  error: Error | null
}

export function normalizeStorageError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }
  if (typeof error === 'string' && error.length > 0) {
    return new Error(error)
  }
  try {
    return new Error(String(error))
  } catch {
    return new Error('Unknown storage error')
  }
}

export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined'
}

export function resolveStorageWindow(
  explicit: Window | null | undefined,
): Window | null {
  if (explicit === null) {
    return null
  }
  if (explicit != null) {
    return explicit
  }
  if (typeof window === 'undefined') {
    return null
  }
  return window
}

/**
 * Resolve a Storage-like object without destructive probes.
 * Operation-specific failures are reported separately via `error`.
 */
export function resolveBrowserStorage(
  targetWindow: Window | null,
  readArea: BrowserStorageAreaReader,
): Storage | null {
  if (targetWindow == null) {
    return null
  }

  try {
    const storage = readArea(targetWindow)
    if (
      storage == null ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function' ||
      typeof storage.removeItem !== 'function'
    ) {
      return null
    }
    return storage
  } catch {
    return null
  }
}

export function resolveLocalStorage(
  targetWindow: Window | null,
): Storage | null {
  return resolveBrowserStorage(targetWindow, readLocalStorageArea)
}

export function resolveSessionStorage(
  targetWindow: Window | null,
): Storage | null {
  return resolveBrowserStorage(targetWindow, readSessionStorageArea)
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (value == null || typeof value !== 'object') {
    return false
  }
  if (Array.isArray(value)) {
    return false
  }
  if (value instanceof Date || value instanceof Map || value instanceof Set) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function shallowMergeDefaults<T>(storedValue: T, defaultValue: T): T {
  if (!isPlainObject(storedValue) || !isPlainObject(defaultValue)) {
    return storedValue
  }
  return {
    ...defaultValue,
    ...storedValue,
  } as T
}

export function applyMergeDefaults<T>(
  storedValue: T,
  defaultValue: T,
  mergeDefaults: BrowserStorageMergeDefaults<T>,
): T {
  if (mergeDefaults === false) {
    return storedValue
  }
  if (mergeDefaults === true) {
    return shallowMergeDefaults(storedValue, defaultValue)
  }
  return mergeDefaults(storedValue, defaultValue)
}

const stringSerializer: BrowserStorageSerializer<string> = {
  read: (raw) => raw,
  write: (value) => value,
}

const booleanSerializer: BrowserStorageSerializer<boolean> = {
  read: (raw) => {
    if (raw === 'true') {
      return true
    }
    if (raw === 'false') {
      return false
    }
    throw new Error(`Invalid boolean storage value: ${raw}`)
  },
  write: (value) => (value ? 'true' : 'false'),
}

const numberSerializer: BrowserStorageSerializer<number> = {
  read: (raw) => {
    if (raw === 'NaN') {
      return Number.NaN
    }
    if (raw === 'Infinity') {
      return Number.POSITIVE_INFINITY
    }
    if (raw === '-Infinity') {
      return Number.NEGATIVE_INFINITY
    }
    if (raw.trim() === '') {
      throw new Error(`Invalid number storage value: ${raw}`)
    }
    const parsed = Number(raw)
    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid number storage value: ${raw}`)
    }
    return Object.is(parsed, -0) ? 0 : parsed
  },
  write: (value) => {
    if (Number.isNaN(value)) {
      return 'NaN'
    }
    if (value === Number.POSITIVE_INFINITY) {
      return 'Infinity'
    }
    if (value === Number.NEGATIVE_INFINITY) {
      return '-Infinity'
    }
    return String(Object.is(value, -0) ? 0 : value)
  },
}

const jsonSerializer: BrowserStorageSerializer<unknown> = {
  read: (raw) => JSON.parse(raw) as unknown,
  write: (value) => JSON.stringify(value),
}

const dateSerializer: BrowserStorageSerializer<Date> = {
  read: (raw) => {
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid Date storage value: ${raw}`)
    }
    return date
  },
  write: (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new Error('Invalid Date value')
    }
    return value.toISOString()
  },
}

const mapSerializer: BrowserStorageSerializer<Map<unknown, unknown>> = {
  read: (raw) => {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid Map storage value')
    }
    return new Map(parsed as Array<[unknown, unknown]>)
  },
  write: (value) => JSON.stringify([...value.entries()]),
}

const setSerializer: BrowserStorageSerializer<Set<unknown>> = {
  read: (raw) => {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid Set storage value')
    }
    return new Set(parsed)
  },
  write: (value) => JSON.stringify([...value.values()]),
}

export function createDefaultSerializer<T>(
  defaultValue: T,
): BrowserStorageSerializer<T> {
  if (typeof defaultValue === 'string') {
    return stringSerializer as unknown as BrowserStorageSerializer<T>
  }
  if (typeof defaultValue === 'boolean') {
    return booleanSerializer as unknown as BrowserStorageSerializer<T>
  }
  if (typeof defaultValue === 'number') {
    return numberSerializer as unknown as BrowserStorageSerializer<T>
  }
  if (defaultValue instanceof Date) {
    return dateSerializer as unknown as BrowserStorageSerializer<T>
  }
  if (defaultValue instanceof Map) {
    return mapSerializer as unknown as BrowserStorageSerializer<T>
  }
  if (defaultValue instanceof Set) {
    return setSerializer as unknown as BrowserStorageSerializer<T>
  }
  return jsonSerializer as unknown as BrowserStorageSerializer<T>
}

export function safeGetItem(
  storage: Storage,
  key: string,
): { ok: true; value: string | null } | { ok: false; error: Error } {
  try {
    return { ok: true, value: storage.getItem(key) }
  } catch (error) {
    return { ok: false, error: normalizeStorageError(error) }
  }
}

export function safeSetItem(
  storage: Storage,
  key: string,
  value: string,
): { ok: true } | { ok: false; error: Error } {
  try {
    storage.setItem(key, value)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: normalizeStorageError(error) }
  }
}

export function safeRemoveItem(
  storage: Storage,
  key: string,
): { ok: true } | { ok: false; error: Error } {
  try {
    storage.removeItem(key)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: normalizeStorageError(error) }
  }
}

export type SameDocumentNotification =
  { type: 'write'; raw: string } | { type: 'remove' }

export type SameDocumentListener = (
  notification: SameDocumentNotification,
) => void

export type PendingStorageMutation =
  { type: 'none' } | { type: 'write' } | { type: 'remove' }
