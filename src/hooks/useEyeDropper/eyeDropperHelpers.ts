export interface UseEyeDropperOpenOptions {
  signal?: AbortSignal
}

export interface UseEyeDropperOptions {
  initialValue?: string
  enabled?: boolean
  window?: Window | null
  treatAbortAsError?: boolean
  onError?: (error: Error) => void
}

export interface UseEyeDropperReturn {
  isSupported: boolean
  sRGBHex: string
  isPicking: boolean
  error: Error | null
  open: (options?: UseEyeDropperOpenOptions) => Promise<string | null>
  cancel: () => void
  reset: () => void
}

export const DEFAULT_ENABLED = true
export const DEFAULT_INITIAL_VALUE = ''
export const DEFAULT_TREAT_ABORT_AS_ERROR = false

/** Six-digit opaque sRGB hex (`#rrggbb`). Shorthand `#rgb` is rejected. */
const SRGB_HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export interface EyeDropperResultLike {
  sRGBHex: string
}

export interface EyeDropperInstanceLike {
  open: (options?: { signal?: AbortSignal }) => Promise<EyeDropperResultLike>
}

export interface EyeDropperConstructorLike {
  new (): EyeDropperInstanceLike
}

export type EyeDropperWindow = Window & {
  EyeDropper?: EyeDropperConstructorLike
  AbortController?: typeof AbortController
}

export interface EyeDropperViewState {
  sRGBHex: string
  isPicking: boolean
  error: Error | null
  isSupported: boolean
}

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
          : 'EyeDropper request failed',
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
    return new Error('Unknown EyeDropper error')
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

export function isAbortError(cause: unknown): boolean {
  if (cause == null || typeof cause !== 'object') {
    return false
  }
  return (cause as { name?: unknown }).name === 'AbortError'
}

/**
 * Validate and normalize a six-digit sRGB hex color.
 * Shorthand `#rgb` is rejected to match the native six-digit contract.
 */
export function normalizeSrgbHex(
  value: unknown,
): { ok: true; value: string } | { ok: false; error: Error } {
  if (typeof value !== 'string') {
    return {
      ok: false,
      error: new Error('sRGBHex must be a six-digit hexadecimal color'),
    }
  }
  if (!SRGB_HEX_PATTERN.test(value)) {
    return {
      ok: false,
      error: new Error('sRGBHex must be a six-digit hexadecimal color'),
    }
  }
  return { ok: true, value: value.toLowerCase() }
}

/**
 * Seed / reset initial color. Invalid values become `''` without throwing.
 * Successful native colors are always six-digit lowercase; invalid seeds are
 * cleared rather than preserved as display-only malformed strings.
 */
export function normalizeInitialValue(value: string | undefined): string {
  if (value == null || value === '') {
    return DEFAULT_INITIAL_VALUE
  }
  const normalized = normalizeSrgbHex(value)
  return normalized.ok ? normalized.value : DEFAULT_INITIAL_VALUE
}

export function validateEyeDropperResult(
  result: unknown,
): { ok: true; value: string } | { ok: false; error: Error } {
  if (result == null || typeof result !== 'object') {
    return {
      ok: false,
      error: new Error('EyeDropper result must be an object with sRGBHex'),
    }
  }
  if (!Object.prototype.hasOwnProperty.call(result, 'sRGBHex')) {
    return {
      ok: false,
      error: new Error('EyeDropper result must be an object with sRGBHex'),
    }
  }
  return normalizeSrgbHex((result as { sRGBHex: unknown }).sRGBHex)
}

export function resolveEffectiveWindow(
  option: Window | null | undefined,
): Window | null {
  if (option === null) {
    return null
  }
  if (option !== undefined) {
    return option
  }
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    const win = (globalThis as { window?: Window }).window
    return win ?? null
  }
  return null
}

export function resolveEyeDropperConstructor(
  win: Window | null,
): EyeDropperConstructorLike | null {
  if (win == null) {
    return null
  }
  const Ctor = (win as EyeDropperWindow).EyeDropper
  return typeof Ctor === 'function' ? Ctor : null
}

/**
 * Structural support: a constructible EyeDropper exists on the window.
 * Does not construct an instance during detection. Secure-context and
 * user-activation requirements are documented separately; constructor
 * presence alone sets `isSupported`.
 */
export function isEyeDropperSupported(win: Window | null): boolean {
  const Ctor = resolveEyeDropperConstructor(win)
  if (Ctor == null) {
    return false
  }
  const proto = Ctor.prototype as Partial<EyeDropperInstanceLike> | undefined
  if (proto != null && 'open' in proto && typeof proto.open !== 'function') {
    return false
  }
  return true
}

export function resolveAbortControllerConstructor(
  win: Window | null,
): (new () => AbortController) | null {
  if (win != null) {
    const fromWindow = (win as EyeDropperWindow).AbortController
    if (typeof fromWindow === 'function') {
      return fromWindow
    }
  }
  if (typeof AbortController === 'function') {
    return AbortController
  }
  return null
}

export function bridgeExternalAbort(
  external: AbortSignal,
  controller: AbortController,
): () => void {
  let removed = false
  const onAbort = () => {
    try {
      controller.abort(external.reason)
    } catch {
      try {
        controller.abort()
      } catch {
        // Ignore abort races on settled controllers.
      }
    }
  }
  if (external.aborted) {
    onAbort()
    return () => undefined
  }
  external.addEventListener('abort', onAbort)
  return () => {
    if (removed) {
      return
    }
    removed = true
    external.removeEventListener('abort', onAbort)
  }
}

export function eyeDropperStatesEqual(
  a: EyeDropperViewState,
  b: EyeDropperViewState,
): boolean {
  return (
    a.sRGBHex === b.sRGBHex &&
    a.isPicking === b.isPicking &&
    a.error === b.error &&
    a.isSupported === b.isSupported
  )
}
