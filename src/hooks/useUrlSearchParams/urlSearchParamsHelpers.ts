export type UseUrlSearchParamsMode = 'history' | 'hash' | 'hash-params'

export type UseUrlSearchParamsWriteMode = 'replace' | 'push'

export type UseUrlSearchParamsValue = string | readonly string[]

export type UseUrlSearchParamsState = Readonly<
  Record<string, UseUrlSearchParamsValue>
>

export type UseUrlSearchParamsInputValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean | null | undefined)[]

export type UseUrlSearchParamsInput = Readonly<
  Record<string, UseUrlSearchParamsInputValue>
>

export type UseUrlSearchParamsStringify = (params: URLSearchParams) => string

export interface UseUrlSearchParamsOptions {
  window?: Window | null
  enabled?: boolean
  initialValue?: UseUrlSearchParamsInput
  write?: boolean
  writeMode?: UseUrlSearchParamsWriteMode
  removeNullishValues?: boolean
  removeFalsyValues?: boolean
  stringify?: UseUrlSearchParamsStringify
  onError?: (error: Error) => void
}

export interface UseUrlSearchParamsReturn {
  params: UseUrlSearchParamsState
  searchParams: URLSearchParams
  isReady: boolean
  error: Error | null
  get: (name: string) => string | null
  getAll: (name: string) => readonly string[]
  has: (name: string) => boolean
  set: (name: string, value: UseUrlSearchParamsInputValue) => void
  append: (name: string, value: string | number | boolean) => void
  remove: (name: string, value?: string) => void
  setParams: (params: UseUrlSearchParamsInput) => void
  clear: () => void
  reset: () => void
  refresh: () => void
}

export const DEFAULT_MODE: UseUrlSearchParamsMode = 'history'
export const DEFAULT_ENABLED = true
export const DEFAULT_WRITE = true
export const DEFAULT_WRITE_MODE: UseUrlSearchParamsWriteMode = 'replace'
export const DEFAULT_REMOVE_NULLISH = true
export const DEFAULT_REMOVE_FALSY = false

export type CanonicalEntry = { readonly name: string; readonly value: string }

export function normalizeError(cause: unknown): Error {
  if (cause instanceof Error) {
    return cause
  }
  if (typeof cause === 'string') {
    return new Error(cause)
  }
  if (cause != null && typeof cause === 'object') {
    const record = cause as { name?: unknown; message?: unknown }
    if (typeof record.message === 'string' || typeof record.name === 'string') {
      const error = new Error(
        typeof record.message === 'string'
          ? record.message
          : 'URL search params operation failed',
      )
      if (typeof record.name === 'string' && record.name.length > 0) {
        error.name = record.name
      }
      return error
    }
  }
  try {
    return new Error(String(cause))
  } catch {
    return new Error('Unknown URL search params error')
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

export function resolveGlobalWindow(): Window | null {
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    const value = (globalThis as { window?: Window }).window
    return value ?? null
  }
  return null
}

export function resolveOptionWindow(
  option: Window | null | undefined,
): Window | null {
  if (option === null) {
    return null
  }
  if (option !== undefined) {
    return option
  }
  return resolveGlobalWindow()
}

export function normalizeMode(mode: unknown): UseUrlSearchParamsMode | null {
  if (mode === 'history' || mode === 'hash' || mode === 'hash-params') {
    return mode
  }
  if (mode == null) {
    return DEFAULT_MODE
  }
  return null
}

export function normalizeWriteMode(
  mode: unknown,
): UseUrlSearchParamsWriteMode | null {
  if (mode === 'replace' || mode === 'push') {
    return mode
  }
  if (mode == null) {
    return DEFAULT_WRITE_MODE
  }
  return null
}

function ownKeys(record: object): string[] {
  return Object.keys(record)
}

function isOwn(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

/**
 * Scalar / array input → string tokens, applying nullish/falsy filters.
 * Non-finite numbers become exact tokens matching storage-hook style.
 */
export function normalizeScalarToken(value: string | number | boolean): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (Object.is(value, -0)) {
    return '0'
  }
  if (Number.isNaN(value)) {
    return 'NaN'
  }
  if (value === Number.POSITIVE_INFINITY) {
    return 'Infinity'
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return '-Infinity'
  }
  return String(value)
}

function shouldDropNullish(
  value: unknown,
  removeNullish: boolean,
  removeFalsy: boolean,
): boolean {
  if (value === null || value === undefined) {
    return removeNullish || removeFalsy
  }
  return false
}

function shouldDropFalsyScalar(
  value: string | number | boolean,
  removeFalsy: boolean,
): boolean {
  if (!removeFalsy) {
    return false
  }
  if (typeof value === 'string') {
    return value === ''
  }
  if (typeof value === 'boolean') {
    return value === false
  }
  return value === 0 || Number.isNaN(value)
}

export function normalizeInputValue(
  value: UseUrlSearchParamsInputValue,
  removeNullish: boolean,
  removeFalsy: boolean,
): string[] | null {
  if (Array.isArray(value)) {
    const out: string[] = []
    for (const entry of value) {
      if (shouldDropNullish(entry, removeNullish, removeFalsy)) {
        continue
      }
      if (entry === null || entry === undefined) {
        continue
      }
      if (shouldDropFalsyScalar(entry, removeFalsy)) {
        continue
      }
      out.push(normalizeScalarToken(entry))
    }
    return out.length === 0 ? null : out
  }

  if (shouldDropNullish(value, removeNullish, removeFalsy)) {
    return null
  }
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    return null
  }
  if (shouldDropFalsyScalar(value, removeFalsy)) {
    return null
  }
  return [normalizeScalarToken(value)]
}

export function normalizeInputRecord(
  input: UseUrlSearchParamsInput | undefined,
  removeNullish: boolean,
  removeFalsy: boolean,
): CanonicalEntry[] {
  if (input == null || typeof input !== 'object') {
    return []
  }
  const entries: CanonicalEntry[] = []
  for (const name of ownKeys(input)) {
    if (!isOwn(input, name)) {
      continue
    }
    const tokens = normalizeInputValue(
      (input as Record<string, UseUrlSearchParamsInputValue>)[name],
      removeNullish,
      removeFalsy,
    )
    if (tokens == null) {
      continue
    }
    for (const token of tokens) {
      entries.push({ name, value: token })
    }
  }
  return entries
}

export function entriesFromSearchParams(
  searchParams: URLSearchParams,
): CanonicalEntry[] {
  const entries: CanonicalEntry[] = []
  searchParams.forEach((value, name) => {
    entries.push({ name, value })
  })
  return entries
}

export function searchParamsFromEntries(
  entries: readonly CanonicalEntry[],
): URLSearchParams {
  const params = new URLSearchParams()
  for (const entry of entries) {
    params.append(entry.name, entry.value)
  }
  return params
}

export function snapshotFromEntries(
  entries: readonly CanonicalEntry[],
): UseUrlSearchParamsState {
  const order: string[] = []
  const buckets = new Map<string, string[]>()
  for (const entry of entries) {
    let bucket = buckets.get(entry.name)
    if (bucket == null) {
      bucket = []
      buckets.set(entry.name, bucket)
      order.push(entry.name)
    }
    bucket.push(entry.value)
  }

  const result: Record<string, UseUrlSearchParamsValue> = Object.create(null)
  for (const name of order) {
    const values = buckets.get(name) ?? []
    if (values.length === 1) {
      result[name] = values[0]!
    } else {
      result[name] = Object.freeze([...values])
    }
  }
  return Object.freeze(result) as UseUrlSearchParamsState
}

export function entriesEqual(
  a: readonly CanonicalEntry[],
  b: readonly CanonicalEntry[],
): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index]!
    const right = b[index]!
    if (left.name !== right.name || !Object.is(left.value, right.value)) {
      return false
    }
  }
  return true
}

export function extractQueryString(
  locationLike: { search: string; hash: string },
  mode: UseUrlSearchParamsMode,
): string {
  if (mode === 'history') {
    const search = locationLike.search ?? ''
    return search.startsWith('?') ? search.slice(1) : search
  }

  const hash = locationLike.hash ?? ''
  const raw = hash.startsWith('#') ? hash.slice(1) : hash

  if (mode === 'hash-params') {
    // Optional leading `?` after `#` is treated as a delimiter, not data
    // (e.g. `#?foo=bar` → `foo=bar`). Route-looking text remains parameter text.
    return raw.startsWith('?') ? raw.slice(1) : raw
  }

  // hash mode: first literal `?` separates route from params.
  // Without `?`, the entire hash is the route (e.g. `#foo=bar` is not params).
  const separator = raw.indexOf('?')
  if (separator === -1) {
    return ''
  }
  return raw.slice(separator + 1)
}

export function extractHashRoute(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const separator = raw.indexOf('?')
  if (separator === -1) {
    return raw
  }
  return raw.slice(0, separator)
}

export function normalizeStringifyOutput(
  value: unknown,
  mode: UseUrlSearchParamsMode,
): string {
  if (typeof value !== 'string') {
    throw new TypeError('stringify must return a string')
  }
  let body = value
  if (mode === 'history') {
    body = body.startsWith('?') ? body.slice(1) : body
  } else if (mode === 'hash-params') {
    body = body.startsWith('#') ? body.slice(1) : body
    if (body.startsWith('?')) {
      body = body.slice(1)
    }
  } else {
    // hash mode query body — strip a single leading `?` only.
    body = body.startsWith('?') ? body.slice(1) : body
  }

  // Custom output must not escape the mode-owned URL component.
  if (body.includes('#')) {
    throw new Error(
      `stringify output must not contain '#' in ${mode} mode (would corrupt URL ownership)`,
    )
  }
  return body
}

export function buildNextUrl(
  locationLike: {
    pathname: string
    search: string
    hash: string
    href: string
  },
  mode: UseUrlSearchParamsMode,
  queryBody: string,
): string {
  const pathname = locationLike.pathname || '/'
  const search = locationLike.search ?? ''
  const hash = locationLike.hash ?? ''

  if (mode === 'history') {
    const nextSearch = queryBody.length > 0 ? `?${queryBody}` : ''
    return `${pathname}${nextSearch}${hash}`
  }

  if (mode === 'hash-params') {
    const nextHash = queryBody.length > 0 ? `#${queryBody}` : ''
    return `${pathname}${search}${nextHash}`
  }

  // hash mode
  const route = extractHashRoute(hash)
  let nextHash = ''
  if (queryBody.length > 0) {
    nextHash = `#${route}?${queryBody}`
  } else if (route.length > 0) {
    nextHash = `#${route}`
  }
  return `${pathname}${search}${nextHash}`
}

export function readLocationHref(win: Window): string {
  return win.location.href
}

export function readLocationParts(win: Window): {
  pathname: string
  search: string
  hash: string
  href: string
} {
  return {
    pathname: win.location.pathname,
    search: win.location.search,
    hash: win.location.hash,
    href: win.location.href,
  }
}

export function readUrlEntries(
  win: Window,
  mode: UseUrlSearchParamsMode,
): CanonicalEntry[] {
  const parts = readLocationParts(win)
  const query = extractQueryString(parts, mode)
  return entriesFromSearchParams(new URLSearchParams(query))
}

export function mergeInitialWithUrl(
  initialEntries: readonly CanonicalEntry[],
  urlEntries: readonly CanonicalEntry[],
): CanonicalEntry[] {
  const urlNames = new Set(urlEntries.map((entry) => entry.name))
  const merged: CanonicalEntry[] = []
  for (const entry of initialEntries) {
    if (!urlNames.has(entry.name)) {
      merged.push(entry)
    }
  }
  for (const entry of urlEntries) {
    merged.push(entry)
  }
  return merged
}

export function applySet(
  entries: readonly CanonicalEntry[],
  name: string,
  tokens: string[] | null,
): CanonicalEntry[] {
  const next = entries.filter((entry) => entry.name !== name)
  if (tokens == null) {
    return next
  }
  for (const value of tokens) {
    next.push({ name, value })
  }
  return next
}

export function applyAppend(
  entries: readonly CanonicalEntry[],
  name: string,
  value: string,
): CanonicalEntry[] {
  return [...entries, { name, value }]
}

export function applyRemove(
  entries: readonly CanonicalEntry[],
  name: string,
  value?: string,
): CanonicalEntry[] {
  if (value === undefined) {
    return entries.filter((entry) => entry.name !== name)
  }
  return entries.filter(
    (entry) => !(entry.name === name && Object.is(entry.value, value)),
  )
}
