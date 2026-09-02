import { describe, expect, it } from 'vitest'

import {
  applyAdjusters,
  clampNumber,
  isFiniteNumber,
  isParallaxTarget,
  normalizeMouseAxes,
  normalizeOrientationAxes,
  normalizeScreenAngle,
  normalizeZero,
  parallaxStatesEqual,
  resolveOwningWindow,
  resolveScreenAngle,
  rotateSensorVector,
} from './parallaxHelpers'

describe('parallaxHelpers', () => {
  describe('normalizeZero', () => {
    it('converts negative zero to zero', () => {
      expect(Object.is(normalizeZero(-0), 0)).toBe(true)
      expect(normalizeZero(0.25)).toBe(0.25)
    })
  })

  describe('clampNumber', () => {
    it('clamps to the inclusive range', () => {
      expect(clampNumber(-1, -0.5, 0.5)).toBe(-0.5)
      expect(clampNumber(1, -0.5, 0.5)).toBe(0.5)
      expect(clampNumber(0.1, -0.5, 0.5)).toBe(0.1)
    })
  })

  describe('isFiniteNumber', () => {
    it('rejects non-finite values', () => {
      expect(isFiniteNumber(1)).toBe(true)
      expect(isFiniteNumber(NaN)).toBe(false)
      expect(isFiniteNumber(Infinity)).toBe(false)
      expect(isFiniteNumber(null)).toBe(false)
    })
  })

  describe('target and window resolution', () => {
    it('detects HTML and SVG element targets', () => {
      const div = document.createElement('div')
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      expect(isParallaxTarget(div)).toBe(true)
      expect(isParallaxTarget(svg)).toBe(true)
      expect(isParallaxTarget(window)).toBe(false)
      expect(isParallaxTarget(document)).toBe(false)
      expect(isParallaxTarget(null)).toBe(false)
    })

    it('resolves the owning window from an element', () => {
      const div = document.createElement('div')
      document.body.append(div)
      expect(resolveOwningWindow(div)).toBe(window)
      div.remove()
    })
  })

  describe('screen angle', () => {
    it('normalizes supported and negative angles', () => {
      expect(normalizeScreenAngle(0)).toBe(0)
      expect(normalizeScreenAngle(90)).toBe(90)
      expect(normalizeScreenAngle(180)).toBe(180)
      expect(normalizeScreenAngle(270)).toBe(270)
      expect(normalizeScreenAngle(-90)).toBe(270)
      expect(normalizeScreenAngle(450)).toBe(90)
      expect(normalizeScreenAngle(NaN)).toBe(0)
    })

    it('reads modern screen.orientation.angle', () => {
      const owningWindow = {
        screen: { orientation: { angle: 90 } },
      } as unknown as Window
      expect(resolveScreenAngle(owningWindow)).toBe(90)
    })

    it('falls back to legacy window.orientation', () => {
      const owningWindow = {
        orientation: -90,
      } as unknown as Window
      expect(resolveScreenAngle(owningWindow)).toBe(270)
    })

    it('defaults to zero when orientation APIs are missing', () => {
      expect(resolveScreenAngle({} as Window)).toBe(0)
    })
  })

  describe('rotateSensorVector', () => {
    it('maps all four screen angles', () => {
      expect(rotateSensorVector(0.2, 0.1, 0)).toEqual({
        roll: 0.2,
        tilt: 0.1,
      })
      expect(rotateSensorVector(0.2, 0.1, 90)).toEqual({
        roll: -0.1,
        tilt: 0.2,
      })
      expect(rotateSensorVector(0.2, 0.1, 180)).toEqual({
        roll: -0.2,
        tilt: -0.1,
      })
      expect(rotateSensorVector(0.2, 0.1, 270)).toEqual({
        roll: 0.1,
        tilt: -0.2,
      })
    })
  })

  describe('normalizeMouseAxes', () => {
    it('normalizes center and corners', () => {
      const rect = {
        left: 100,
        top: 50,
        width: 200,
        height: 100,
      } as DOMRect

      expect(normalizeMouseAxes(200, 100, rect)).toEqual({
        roll: 0,
        tilt: 0,
      })
      expect(normalizeMouseAxes(100, 50, rect)).toEqual({
        roll: -0.5,
        tilt: -0.5,
      })
      expect(normalizeMouseAxes(300, 150, rect)).toEqual({
        roll: 0.5,
        tilt: 0.5,
      })
    })

    it('rejects zero-size targets', () => {
      const rect = {
        left: 0,
        top: 0,
        width: 0,
        height: 40,
      } as DOMRect
      expect(normalizeMouseAxes(10, 10, rect)).toBeNull()
    })
  })

  describe('normalizeOrientationAxes', () => {
    it('normalizes finite beta/gamma', () => {
      expect(normalizeOrientationAxes(90, -90)).toEqual({
        horizontal: -0.5,
        vertical: 0.5,
      })
    })

    it('rejects null, NaN, and Infinity', () => {
      expect(normalizeOrientationAxes(null, 10)).toBeNull()
      expect(normalizeOrientationAxes(10, null)).toBeNull()
      expect(normalizeOrientationAxes(NaN, 10)).toBeNull()
      expect(normalizeOrientationAxes(10, Infinity)).toBeNull()
    })
  })

  describe('applyAdjusters', () => {
    it('applies adjusters and clamps', () => {
      expect(
        applyAdjusters(
          0.2,
          -0.2,
          (value) => value * 2,
          (value) => value * 2,
          true,
        ),
      ).toEqual({
        roll: 0.4,
        tilt: -0.4,
      })

      expect(
        applyAdjusters(
          0.4,
          -0.4,
          (value) => value * 2,
          (value) => value * 2,
          true,
        ),
      ).toEqual({
        roll: 0.5,
        tilt: -0.5,
      })
    })

    it('preserves overflow when clamp is false', () => {
      expect(
        applyAdjusters(
          0.4,
          -0.4,
          (value) => value * 2,
          (value) => value * 2,
          false,
        ),
      ).toEqual({
        roll: 0.8,
        tilt: -0.8,
      })
    })

    it('rejects throwing or non-finite adjusters', () => {
      expect(
        applyAdjusters(
          0.1,
          0.1,
          () => {
            throw new Error('boom')
          },
          (value) => value,
          true,
        ),
      ).toBeNull()

      expect(
        applyAdjusters(
          0.1,
          0.1,
          () => Number.NaN,
          (value) => value,
          true,
        ),
      ).toBeNull()
    })
  })

  describe('parallaxStatesEqual', () => {
    it('compares all fields with Object.is', () => {
      expect(
        parallaxStatesEqual(
          { roll: 0, tilt: 0, source: 'mouse' },
          { roll: 0, tilt: 0, source: 'mouse' },
        ),
      ).toBe(true)
      expect(
        parallaxStatesEqual(
          { roll: 0, tilt: 0, source: 'mouse' },
          { roll: 0, tilt: 0, source: 'deviceOrientation' },
        ),
      ).toBe(false)
    })
  })
})
