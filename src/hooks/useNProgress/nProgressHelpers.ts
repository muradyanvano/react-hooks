/**
 * Private helpers for useNProgress.
 *
 * None of these are exported from the public package entry.
 */

/** Normalizes a numeric value to a finite number within [min, max], or returns fallback. */
export function clampFinite(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

/** Normalizes a minimum value: clamps to [0, 0.999]. Invalid → 0.08. */
export function normalizeMinimum(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0.08
  if (value <= 0) return 0.001
  if (value >= 1) return 0.08
  return value
}

/**
 * Normalizes a duration (speed, trickleSpeed, removeDelay).
 * Invalid or negative → fallback. Zero is allowed for removeDelay but prevented
 * for speed/trickleSpeed (use `normalizeDurationStrict` for those).
 */
export function normalizeDuration(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    return fallback
  return Math.round(value)
}

/**
 * Normalizes a timer duration where zero-delay loops must be prevented.
 * Invalid, negative, or zero → fallback.
 */
export function normalizeDurationStrict(
  value: unknown,
  fallback: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    return fallback
  return Math.round(value)
}

/** Normalizes a CSS z-index. Invalid → 1031. Negative → 1. */
export function normalizeZIndex(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1031
  if (value < 0) return 1
  return Math.round(value)
}

/** Normalizes height in pixels. Invalid/negative → 3. */
export function normalizeHeight(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    return 3
  return value
}

/** Normalizes an aria label. Empty string → default label. */
export function normalizeAriaLabel(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0)
    return 'Page loading progress'
  return value
}

/**
 * Calculates a trickle increment from current progress.
 * Larger when early, smaller near completion. Never reaches 1.
 */
export function calcTrickleIncrement(progress: number): number {
  if (progress >= 0.994) return 0
  if (progress >= 0.9) return 0.005
  if (progress >= 0.8) return 0.01
  if (progress >= 0.5) return 0.02
  return 0.05
}

/**
 * Clamps a progress value to [minimum, 1].
 * Values below minimum display at minimum.
 */
export function normalizeProgress(value: number, minimum: number): number {
  if (!Number.isFinite(value)) return minimum
  if (value <= 0 || value < minimum) return minimum
  if (value >= 1) return 1
  return value
}

/**
 * Resolves the effective document for a hook instance.
 * - Omitted (undefined): uses globalThis.document inside effects
 * - Explicit null: no DOM progress
 * - Explicit Document: uses that document
 */
export function resolveEffectiveDocument(
  optionDoc: Document | null | undefined,
  globalDoc: Document | null,
): Document | null {
  if (optionDoc === null) return null
  if (optionDoc !== undefined) return optionDoc
  return globalDoc
}

/**
 * Resolves the effective parent element.
 * - Omitted (undefined): uses effectiveDocument.body
 * - Explicit null: no DOM progress
 * - Explicit element: uses that element
 */
export function resolveEffectiveParent(
  optionParent: HTMLElement | null | undefined,
  effectiveDoc: Document | null,
): HTMLElement | null {
  if (optionParent === null) return null
  if (optionParent !== undefined) return optionParent
  if (effectiveDoc == null) return null
  return effectiveDoc.body ?? null
}

/** Returns a CSS-safe number string (no NaN/Infinity). */
export function safeCssNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

/** Clamps and normalizes negative zero to positive zero. */
export function normalizeNegativeZero(value: number): number {
  return value === 0 ? 0 : value
}
