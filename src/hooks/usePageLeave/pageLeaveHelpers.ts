export interface UsePageLeaveOptions {
  /**
   * Enables page-boundary observation.
   *
   * @default true
   */
  enabled?: boolean

  /**
   * Browser window to observe.
   *
   * When omitted, the global window is resolved after mount.
   * Explicit null disables browser resolution.
   */
  window?: Window | null

  /**
   * Value used for the first render, SSR, and hydration.
   *
   * @default false
   */
  initialValue?: boolean
}

export type UsePageLeaveReturn = boolean

export const DEFAULT_ENABLED = true
export const DEFAULT_INITIAL_VALUE = false

/**
 * Resolves the observation window.
 *
 * - Omitted (`undefined`): global `window` after mount when available
 * - Explicit `null`: never falls back to the global window
 * - Explicit `Window`: that window only
 */
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

export function isEventTargetLike(value: unknown): value is {
  addEventListener: typeof Window.prototype.addEventListener
  removeEventListener: typeof Window.prototype.removeEventListener
} {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as { addEventListener?: unknown }).addEventListener ===
      'function' &&
    typeof (value as { removeEventListener?: unknown }).removeEventListener ===
      'function'
  )
}

/**
 * A qualifying page-leave `mouseout` has no related target (`== null`).
 * Internal movement between elements keeps a non-null relatedTarget.
 */
export function isQualifyingPageLeave(event: Event): boolean {
  const relatedTarget = (event as { relatedTarget?: EventTarget | null })
    .relatedTarget
  return relatedTarget == null
}
