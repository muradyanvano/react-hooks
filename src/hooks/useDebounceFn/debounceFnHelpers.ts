/** Private helpers for useDebounceFn. */

export const DEFAULT_DEBOUNCE_DELAY = 200

export function normalizeDelay(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return DEFAULT_DEBOUNCE_DELAY
  }

  return value
}

export function normalizeMaxWait(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined
  }

  return value
}

export function createCancelError(): Error {
  return new Error('Debounced function canceled')
}
