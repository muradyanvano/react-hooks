import { describe, expect, it } from 'vitest'

import {
  calcTrickleIncrement,
  clampFinite,
  normalizeAriaLabel,
  normalizeHeight,
  normalizeMinimum,
  normalizeNegativeZero,
  normalizeProgress,
  normalizeZIndex,
  normalizeDuration,
  normalizeDurationStrict,
  resolveEffectiveDocument,
  resolveEffectiveParent,
  safeCssNumber,
} from './nProgressHelpers'

describe('clampFinite', () => {
  it('clamps within range', () => {
    expect(clampFinite(0.5, 0, 1, 0)).toBe(0.5)
    expect(clampFinite(-1, 0, 1, 0)).toBe(0)
    expect(clampFinite(2, 0, 1, 0)).toBe(1)
  })

  it('returns fallback for non-finite', () => {
    expect(clampFinite(NaN, 0, 1, 0.5)).toBe(0.5)
    expect(clampFinite(Infinity, 0, 1, 0.5)).toBe(0.5)
    expect(clampFinite(-Infinity, 0, 1, 0.5)).toBe(0.5)
  })
})

describe('normalizeMinimum', () => {
  it('returns 0.08 for default/invalid', () => {
    expect(normalizeMinimum(undefined)).toBe(0.08)
    expect(normalizeMinimum(null)).toBe(0.08)
    expect(normalizeMinimum(NaN)).toBe(0.08)
    expect(normalizeMinimum(Infinity)).toBe(0.08)
    expect(normalizeMinimum(-Infinity)).toBe(0.08)
    expect(normalizeMinimum('0.1')).toBe(0.08)
  })

  it('returns 0.001 for zero or negative', () => {
    expect(normalizeMinimum(0)).toBe(0.001)
    expect(normalizeMinimum(-0.5)).toBe(0.001)
  })

  it('returns 0.08 for >= 1', () => {
    expect(normalizeMinimum(1)).toBe(0.08)
    expect(normalizeMinimum(2)).toBe(0.08)
  })

  it('returns the value for valid range (0, 1)', () => {
    expect(normalizeMinimum(0.05)).toBe(0.05)
    expect(normalizeMinimum(0.2)).toBe(0.2)
    expect(normalizeMinimum(0.999)).toBe(0.999)
  })
})

describe('normalizeDuration', () => {
  it('returns fallback for invalid/negative', () => {
    expect(normalizeDuration(undefined, 200)).toBe(200)
    expect(normalizeDuration(NaN, 200)).toBe(200)
    expect(normalizeDuration(Infinity, 200)).toBe(200)
    expect(normalizeDuration(-1, 200)).toBe(200)
  })

  it('allows zero (valid for removeDelay)', () => {
    expect(normalizeDuration(0, 200)).toBe(0)
  })

  it('rounds valid values', () => {
    expect(normalizeDuration(300, 200)).toBe(300)
    expect(normalizeDuration(150.7, 200)).toBe(151)
  })
})

describe('normalizeDurationStrict', () => {
  it('rejects zero and negative (prevents zero-delay loops)', () => {
    expect(normalizeDurationStrict(0, 200)).toBe(200)
    expect(normalizeDurationStrict(-1, 200)).toBe(200)
  })

  it('returns fallback for invalid', () => {
    expect(normalizeDurationStrict(NaN, 200)).toBe(200)
    expect(normalizeDurationStrict(Infinity, 200)).toBe(200)
  })

  it('allows positive values', () => {
    expect(normalizeDurationStrict(300, 200)).toBe(300)
  })
})

describe('normalizeZIndex', () => {
  it('returns 1031 for invalid', () => {
    expect(normalizeZIndex(undefined)).toBe(1031)
    expect(normalizeZIndex(NaN)).toBe(1031)
    expect(normalizeZIndex(Infinity)).toBe(1031)
  })

  it('returns 1 for negative', () => {
    expect(normalizeZIndex(-5)).toBe(1)
  })

  it('rounds valid values', () => {
    expect(normalizeZIndex(2000)).toBe(2000)
    expect(normalizeZIndex(0)).toBe(0)
    expect(normalizeZIndex(1031.7)).toBe(1032)
  })
})

describe('normalizeHeight', () => {
  it('returns 3 for invalid/zero/negative', () => {
    expect(normalizeHeight(undefined)).toBe(3)
    expect(normalizeHeight(NaN)).toBe(3)
    expect(normalizeHeight(0)).toBe(3)
    expect(normalizeHeight(-2)).toBe(3)
  })

  it('returns valid positive values', () => {
    expect(normalizeHeight(5)).toBe(5)
    expect(normalizeHeight(2.5)).toBe(2.5)
  })
})

describe('normalizeAriaLabel', () => {
  it('returns default for empty/invalid', () => {
    expect(normalizeAriaLabel(undefined)).toBe('Page loading progress')
    expect(normalizeAriaLabel('')).toBe('Page loading progress')
    expect(normalizeAriaLabel('   ')).toBe('Page loading progress')
    expect(normalizeAriaLabel(42)).toBe('Page loading progress')
  })

  it('returns the provided label', () => {
    expect(normalizeAriaLabel('Loading…')).toBe('Loading…')
  })
})

describe('calcTrickleIncrement', () => {
  it('returns 0 at the ceiling (0.994+)', () => {
    expect(calcTrickleIncrement(0.994)).toBe(0)
    expect(calcTrickleIncrement(1)).toBe(0)
  })

  it('returns smaller increments near completion', () => {
    const near = calcTrickleIncrement(0.91)
    const mid = calcTrickleIncrement(0.6)
    const early = calcTrickleIncrement(0.1)
    expect(near).toBeLessThan(mid)
    expect(mid).toBeLessThan(early)
  })

  it('slows dramatically near the ceiling (progress 0.99 → tiny increment)', () => {
    // At 0.99 the increment is 0.005 (slowed). The ceiling clamping to 0.994
    // is applied at the call site (hook/manager), not in calcTrickleIncrement itself.
    const inc = calcTrickleIncrement(0.99)
    expect(inc).toBeLessThanOrEqual(0.005)
    expect(inc).toBeGreaterThanOrEqual(0)
  })
})

describe('normalizeProgress', () => {
  it('returns minimum for non-finite or below minimum', () => {
    expect(normalizeProgress(NaN, 0.08)).toBe(0.08)
    expect(normalizeProgress(0, 0.08)).toBe(0.08)
    expect(normalizeProgress(-0.5, 0.08)).toBe(0.08)
    expect(normalizeProgress(0.02, 0.08)).toBe(0.08)
  })

  it('clamps to 1', () => {
    expect(normalizeProgress(1, 0.08)).toBe(1)
    expect(normalizeProgress(1.5, 0.08)).toBe(1)
  })

  it('returns valid values unchanged', () => {
    expect(normalizeProgress(0.5, 0.08)).toBe(0.5)
    expect(normalizeProgress(0.08, 0.08)).toBe(0.08)
  })
})

describe('resolveEffectiveDocument', () => {
  it('returns null for explicit null', () => {
    expect(resolveEffectiveDocument(null, document)).toBeNull()
  })

  it('returns provided document when given', () => {
    const doc = document
    expect(resolveEffectiveDocument(doc, null)).toBe(doc)
  })

  it('returns globalDoc when option is undefined', () => {
    expect(resolveEffectiveDocument(undefined, document)).toBe(document)
    expect(resolveEffectiveDocument(undefined, null)).toBeNull()
  })
})

describe('resolveEffectiveParent', () => {
  it('returns null for explicit null', () => {
    expect(resolveEffectiveParent(null, document)).toBeNull()
  })

  it('returns document.body when option is undefined', () => {
    expect(resolveEffectiveParent(undefined, document)).toBe(document.body)
  })

  it('returns null when doc is null', () => {
    expect(resolveEffectiveParent(undefined, null)).toBeNull()
  })

  it('returns provided element', () => {
    const el = document.createElement('div')
    expect(resolveEffectiveParent(el, document)).toBe(el)
  })
})

describe('safeCssNumber', () => {
  it('returns value for finite', () => {
    expect(safeCssNumber(200, 0)).toBe(200)
    expect(safeCssNumber(0, 100)).toBe(0)
  })

  it('returns fallback for non-finite', () => {
    expect(safeCssNumber(NaN, 100)).toBe(100)
    expect(safeCssNumber(Infinity, 100)).toBe(100)
  })
})

describe('normalizeNegativeZero', () => {
  it('converts negative zero to positive zero', () => {
    expect(1 / normalizeNegativeZero(-0)).toBe(Infinity) // +0
  })

  it('passes other values through', () => {
    expect(normalizeNegativeZero(0.5)).toBe(0.5)
    expect(normalizeNegativeZero(-0.5)).toBe(-0.5)
  })
})
