import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DEBOUNCE_DELAY,
  createCancelError,
  normalizeDelay,
  normalizeMaxWait,
} from './debounceFnHelpers'

describe('useDebounceFn helpers', () => {
  it.each([undefined, -1, Number.NaN, Infinity, -Infinity])(
    'normalizes invalid delay %p to the default',
    (value) => {
      expect(normalizeDelay(value)).toBe(DEFAULT_DEBOUNCE_DELAY)
    },
  )

  it.each([0, 1, 12.5])('preserves valid delay %p', (value) => {
    expect(normalizeDelay(value)).toBe(value)
  })

  it.each([undefined, -1, Number.NaN, Infinity, -Infinity])(
    'disables invalid maxWait %p',
    (value) => {
      expect(normalizeMaxWait(value)).toBeUndefined()
    },
  )

  it.each([0, 1, 12.5])('preserves valid maxWait %p', (value) => {
    expect(normalizeMaxWait(value)).toBe(value)
  })

  it('creates a generic cancellation error without function arguments', () => {
    expect(createCancelError()).toEqual(
      expect.objectContaining({ message: 'Debounced function canceled' }),
    )
  })
})
