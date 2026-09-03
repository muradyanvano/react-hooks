export type UseCookiesSameSite = true | 'strict' | 'lax' | 'none'

export interface UseCookiesGetOptions {
  doNotParse?: boolean
}

export interface UseCookiesSetOptions {
  path?: string
  domain?: string
  expires?: Date
  maxAge?: number
  secure?: boolean
  sameSite?: UseCookiesSameSite
  partitioned?: boolean
}

export interface UseCookiesChange {
  name: string
  value: unknown
  previousValue: unknown
  cause: 'set' | 'remove' | 'external'
}

export type UseCookiesChangeListener = (change: UseCookiesChange) => void

export interface UseCookiesOptions {
  doNotParse?: boolean
  autoUpdateDependencies?: boolean
  document?: Document | null
  initialCookies?: string
  watch?: boolean
  pollingInterval?: number
  onError?: (error: Error) => void
}

export interface UseCookiesReturn {
  get: <T = unknown>(
    name: string,
    options?: UseCookiesGetOptions,
  ) => T | undefined
  getAll: <T extends Record<string, unknown> = Record<string, unknown>>(
    options?: UseCookiesGetOptions,
  ) => T
  set: (name: string, value: unknown, options?: UseCookiesSetOptions) => boolean
  remove: (
    name: string,
    options?: Pick<UseCookiesSetOptions, 'path' | 'domain'>,
  ) => boolean
  refresh: () => void
  addChangeListener: (listener: UseCookiesChangeListener) => () => void
  removeChangeListener: (listener: UseCookiesChangeListener) => void
  isSupported: boolean
  isReady: boolean
  error: Error | null
}

/** Raw decoded name → raw decoded value (first visible occurrence wins). */
export type CookieRawMap = Map<string, string>

export type CookieParseResult = {
  raw: string
  map: CookieRawMap
}

export type CookieDiff = {
  added: string[]
  changed: string[]
  removed: string[]
  all: string[]
}

export function normalizeCookieError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }
  if (typeof error === 'string' && error.length > 0) {
    return new Error(error)
  }
  try {
    return new Error(String(error))
  } catch {
    return new Error('Unknown cookie error')
  }
}

/**
 * Cookie-name token check aligned with RFC 6265 tchar / modern browser-safe rules.
 * Rejects controls, whitespace, and separators such as `=`, `;`, and `,`.
 */
export function isValidCookieName(name: string): boolean {
  if (name.length === 0) {
    return false
  }
  return /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name)
}

export function encodeCookieComponent(value: string): string {
  return encodeURIComponent(value)
}

export function decodeCookieComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    // Malformed percent-encoding: keep the safest recoverable raw fragment.
    return value
  }
}

/**
 * Parse a `document.cookie` / Cookie-header style string.
 * First occurrence of a duplicate name wins (browsers commonly list more
 * specific paths first).
 */
export function parseCookieString(raw: string): CookieRawMap {
  const map: CookieRawMap = new Map()
  if (raw.length === 0) {
    return map
  }

  const parts = raw.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.length === 0) {
      continue
    }
    const separatorIndex = trimmed.indexOf('=')
    let encodedName: string
    let encodedValue: string
    if (separatorIndex === -1) {
      encodedName = trimmed
      encodedValue = ''
    } else {
      encodedName = trimmed.slice(0, separatorIndex)
      encodedValue = trimmed.slice(separatorIndex + 1)
    }
    const name = decodeCookieComponent(encodedName.trim())
    if (name.length === 0) {
      continue
    }
    if (map.has(name)) {
      continue
    }
    map.set(name, decodeCookieComponent(encodedValue))
  }
  return map
}

export function serializeCookieValue(
  value: unknown,
): { ok: true; encodedValue: string } | { ok: false; error: Error } {
  if (value === undefined) {
    return {
      ok: false,
      error: new Error('Cookie value cannot be undefined'),
    }
  }
  if (typeof value === 'function' || typeof value === 'symbol') {
    return {
      ok: false,
      error: new Error(`Cookie value cannot be a ${typeof value}`),
    }
  }

  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value)
    if (typeof text !== 'string') {
      return {
        ok: false,
        error: new Error('Cookie value could not be serialized to a string'),
      }
    }
    return { ok: true, encodedValue: encodeCookieComponent(text) }
  } catch (error) {
    return { ok: false, error: normalizeCookieError(error) }
  }
}

export function parseCookieValue(
  rawDecoded: string,
  doNotParse: boolean,
): unknown {
  if (doNotParse) {
    return rawDecoded
  }
  try {
    return JSON.parse(rawDecoded) as unknown
  } catch {
    return rawDecoded
  }
}

export function normalizeMaxAge(
  maxAge: number,
): { ok: true; value: number } | { ok: false; error: Error } {
  if (!Number.isFinite(maxAge)) {
    return {
      ok: false,
      error: new Error('Cookie maxAge must be a finite number'),
    }
  }
  return { ok: true, value: Math.trunc(maxAge) }
}

export function formatExpires(
  date: Date,
): { ok: true; value: string } | { ok: false; error: Error } {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return {
      ok: false,
      error: new Error('Cookie expires must be a valid Date'),
    }
  }
  return { ok: true, value: date.toUTCString() }
}

export function formatSameSite(sameSite: UseCookiesSameSite): string {
  if (sameSite === true || sameSite === 'strict') {
    return 'Strict'
  }
  if (sameSite === 'lax') {
    return 'Lax'
  }
  return 'None'
}

export function buildCookieAttributes(
  options: UseCookiesSetOptions | undefined,
): { ok: true; suffix: string } | { ok: false; error: Error } {
  if (options == null) {
    return { ok: true, suffix: '' }
  }

  const parts: string[] = []

  if (options.path != null) {
    parts.push(`Path=${options.path}`)
  }

  if (options.domain != null) {
    if (options.domain.includes('/') || options.domain.includes('://')) {
      return {
        ok: false,
        error: new Error('Cookie domain must not include protocol or path'),
      }
    }
    parts.push(`Domain=${options.domain}`)
  }

  if (options.expires != null) {
    const expires = formatExpires(options.expires)
    if (!expires.ok) {
      return expires
    }
    parts.push(`Expires=${expires.value}`)
  }

  if (options.maxAge != null) {
    const maxAge = normalizeMaxAge(options.maxAge)
    if (!maxAge.ok) {
      return maxAge
    }
    parts.push(`Max-Age=${maxAge.value}`)
  }

  if (options.secure === true) {
    parts.push('Secure')
  }

  if (options.sameSite != null) {
    parts.push(`SameSite=${formatSameSite(options.sameSite)}`)
  }

  if (options.partitioned === true) {
    parts.push('Partitioned')
  }

  return {
    ok: true,
    suffix: parts.length === 0 ? '' : `; ${parts.join('; ')}`,
  }
}

export function buildSetCookieAssignment(
  name: string,
  value: unknown,
  options?: UseCookiesSetOptions,
): { ok: true; assignment: string } | { ok: false; error: Error } {
  if (!isValidCookieName(name)) {
    return {
      ok: false,
      error: new Error(`Invalid cookie name: ${JSON.stringify(name)}`),
    }
  }

  const serialized = serializeCookieValue(value)
  if (!serialized.ok) {
    return serialized
  }

  const attributes = buildCookieAttributes(options)
  if (!attributes.ok) {
    return attributes
  }

  return {
    ok: true,
    assignment: `${encodeCookieComponent(name)}=${serialized.encodedValue}${attributes.suffix}`,
  }
}

const PAST_EXPIRES = new Date(0)

export function buildRemoveCookieAssignment(
  name: string,
  options?: Pick<UseCookiesSetOptions, 'path' | 'domain'>,
): { ok: true; assignment: string } | { ok: false; error: Error } {
  return buildSetCookieAssignment(name, '', {
    ...options,
    maxAge: 0,
    expires: PAST_EXPIRES,
  })
}

export function diffCookieMaps(
  previous: CookieRawMap,
  next: CookieRawMap,
): CookieDiff {
  const added: string[] = []
  const changed: string[] = []
  const removed: string[] = []

  for (const [name, value] of next) {
    if (!previous.has(name)) {
      added.push(name)
      continue
    }
    if (previous.get(name) !== value) {
      changed.push(name)
    }
  }

  for (const name of previous.keys()) {
    if (!next.has(name)) {
      removed.push(name)
    }
  }

  return {
    added,
    changed,
    removed,
    all: [...added, ...changed, ...removed],
  }
}

export function normalizeDependencies(
  dependencies: readonly string[] | null | undefined,
): 'all' | 'none' | Set<string> {
  if (dependencies == null) {
    return 'all'
  }
  if (dependencies.length === 0) {
    return 'none'
  }
  return new Set(dependencies)
}

export function dependencySetTouches(
  deps: 'all' | 'none' | Set<string>,
  names: readonly string[],
): boolean {
  if (deps === 'all') {
    return names.length > 0
  }
  if (deps === 'none') {
    return false
  }
  for (const name of names) {
    if (deps.has(name)) {
      return true
    }
  }
  return false
}

export function resolveCookieDocument(
  explicit: Document | null | undefined,
): Document | null {
  if (explicit === null) {
    return null
  }
  if (explicit != null) {
    return explicit
  }
  if (typeof document === 'undefined') {
    return null
  }
  return document
}

export function readDocumentCookie(
  targetDocument: Document | null,
): { ok: true; raw: string } | { ok: false; error: Error } {
  if (targetDocument == null) {
    return { ok: true, raw: '' }
  }
  try {
    const raw = targetDocument.cookie
    return { ok: true, raw: typeof raw === 'string' ? raw : String(raw) }
  } catch (error) {
    return { ok: false, error: normalizeCookieError(error) }
  }
}

export function writeDocumentCookie(
  targetDocument: Document | null,
  assignment: string,
): { ok: true } | { ok: false; error: Error } {
  if (targetDocument == null) {
    return {
      ok: false,
      error: new Error('Cookie document is not available'),
    }
  }
  try {
    targetDocument.cookie = assignment
    return { ok: true }
  } catch (error) {
    return { ok: false, error: normalizeCookieError(error) }
  }
}

export function normalizePollingInterval(interval: number | undefined): number {
  if (interval == null || !Number.isFinite(interval) || interval <= 0) {
    return 1000
  }
  return Math.trunc(interval)
}

/** Structural Cookie Store surface — avoid depending on incomplete DOM typings. */
export interface CookieStoreChangeEventLike {
  changed?: ReadonlyArray<{ name?: string | null } | null> | null
  deleted?: ReadonlyArray<{ name?: string | null } | null> | null
}

export interface CookieStoreLike {
  addEventListener: (
    type: 'change',
    listener: (event: CookieStoreChangeEventLike) => void,
  ) => void
  removeEventListener: (
    type: 'change',
    listener: (event: CookieStoreChangeEventLike) => void,
  ) => void
}

export function resolveCookieStore(
  targetDocument: Document | null,
): CookieStoreLike | null {
  if (targetDocument == null) {
    return null
  }
  try {
    const view = targetDocument.defaultView as
      (Window & { cookieStore?: unknown }) | null
    const store = view?.cookieStore
    if (
      store == null ||
      typeof (store as CookieStoreLike).addEventListener !== 'function' ||
      typeof (store as CookieStoreLike).removeEventListener !== 'function'
    ) {
      return null
    }
    return store as CookieStoreLike
  } catch {
    return null
  }
}

export function extractCookieStoreNames(
  event: CookieStoreChangeEventLike,
): string[] {
  const names = new Set<string>()
  for (const entry of event.changed ?? []) {
    if (entry?.name != null && entry.name.length > 0) {
      names.add(entry.name)
    }
  }
  for (const entry of event.deleted ?? []) {
    if (entry?.name != null && entry.name.length > 0) {
      names.add(entry.name)
    }
  }
  return [...names]
}
