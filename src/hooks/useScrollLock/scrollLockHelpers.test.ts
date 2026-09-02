import { describe, expect, it } from 'vitest'

import {
  applyOverflowHidden,
  isDocumentTarget,
  isStyleCapableElement,
  isWindowTarget,
  readOverflowSnapshot,
  resolveDocumentScrollRoot,
  resolveLockElement,
  restoreOverflowSnapshot,
} from './scrollLockHelpers'

describe('scrollLockHelpers', () => {
  describe('target classification', () => {
    it('detects window and document', () => {
      expect(isWindowTarget(window)).toBe(true)
      expect(isDocumentTarget(document)).toBe(true)
      expect(isWindowTarget(document)).toBe(false)
      expect(isDocumentTarget(window)).toBe(false)
      expect(isWindowTarget(null)).toBe(false)
    })

    it('detects style-capable elements', () => {
      const div = document.createElement('div')
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      expect(isStyleCapableElement(div)).toBe(true)
      expect(isStyleCapableElement(svg)).toBe(true)
      expect(isStyleCapableElement(window)).toBe(false)
      expect(isStyleCapableElement(document)).toBe(false)
      expect(isStyleCapableElement(null)).toBe(false)
    })
  })

  describe('resolveLockElement', () => {
    it('returns HTML and SVG elements directly', () => {
      const div = document.createElement('div')
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      expect(resolveLockElement(div)).toBe(div)
      expect(resolveLockElement(svg)).toBe(svg)
    })

    it('resolves window and document to the same scroll root', () => {
      const fromWindow = resolveLockElement(window)
      const fromDocument = resolveLockElement(document)
      expect(fromWindow).not.toBeNull()
      expect(fromDocument).toBe(fromWindow)
      expect(fromWindow).toBe(resolveDocumentScrollRoot(document))
    })

    it('returns null for nullish targets', () => {
      expect(resolveLockElement(null)).toBeNull()
      expect(resolveLockElement(undefined)).toBeNull()
    })

    it('contains throwing accessors', () => {
      const hostile = {
        get ownerDocument() {
          throw new Error('cross-origin')
        },
      } as unknown as HTMLElement
      expect(resolveLockElement(hostile)).toBeNull()
    })
  })

  describe('overflow snapshot', () => {
    it('reads absent overflow as null axes', () => {
      const element = document.createElement('div')
      expect(readOverflowSnapshot(element)).toEqual({
        overflow: { value: null, priority: '' },
        overflowX: { value: null, priority: '' },
        overflowY: { value: null, priority: '' },
      })
    })

    it('reads value and important priority', () => {
      const element = document.createElement('div')
      element.style.setProperty('overflow', 'auto', 'important')
      const snapshot = readOverflowSnapshot(element)
      expect(snapshot?.overflow).toEqual({
        value: 'auto',
        priority: 'important',
      })
    })

    it('applies hidden and restores absent value by removal', () => {
      const element = document.createElement('div')
      expect(applyOverflowHidden(element)).toBe(true)
      expect(element.style.getPropertyValue('overflow')).toBe('hidden')
      expect(
        restoreOverflowSnapshot(element, {
          overflow: { value: null, priority: '' },
          overflowX: { value: null, priority: '' },
          overflowY: { value: null, priority: '' },
        }),
      ).toBe(true)
      expect(element.style.getPropertyValue('overflow')).toBe('')
    })

    it('restores important priority', () => {
      const element = document.createElement('div')
      const snapshot = {
        overflow: { value: 'scroll', priority: 'important' },
        overflowX: { value: null, priority: '' },
        overflowY: { value: null, priority: '' },
      }
      expect(restoreOverflowSnapshot(element, snapshot)).toBe(true)
      expect(element.style.getPropertyValue('overflow')).toBe('scroll')
      expect(element.style.getPropertyPriority('overflow')).toBe('important')
    })

    it('contains style read/write failures', () => {
      const hostile = {
        style: {
          getPropertyValue() {
            throw new Error('read failed')
          },
          getPropertyPriority() {
            throw new Error('priority failed')
          },
          setProperty() {
            throw new Error('write failed')
          },
          removeProperty() {
            throw new Error('remove failed')
          },
        },
      } as unknown as HTMLElement

      expect(readOverflowSnapshot(hostile)).toBeNull()
      expect(applyOverflowHidden(hostile)).toBe(false)
      expect(
        restoreOverflowSnapshot(hostile, {
          overflow: { value: 'auto', priority: '' },
          overflowX: { value: null, priority: '' },
          overflowY: { value: null, priority: '' },
        }),
      ).toBe(false)
    })
  })
})
