import { describe, expect, it, vi } from 'vitest'

import {
  applyMergeDefaults,
  createDefaultSerializer,
  isPlainObject,
  normalizeStorageError,
  resolveBrowserStorage,
  resolveStorageWindow,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  shallowMergeDefaults,
} from './browserStorageHelpers'
import {
  notifySameDocument,
  subscribeSameDocument,
} from './browserStorageRegistry'

describe('browserStorageHelpers', () => {
  it('resolves local and session storage independently', () => {
    expect(resolveBrowserStorage(null, (w) => w.localStorage)).toBeNull()
    expect(resolveBrowserStorage(window, (w) => w.localStorage)).toBe(
      window.localStorage,
    )
    expect(resolveBrowserStorage(window, (w) => w.sessionStorage)).toBe(
      window.sessionStorage,
    )
    expect(resolveStorageWindow(null)).toBeNull()
  })

  it('normalizes errors and merges plain objects only', () => {
    expect(normalizeStorageError('x').message).toBe('x')
    expect(isPlainObject({ a: 1 })).toBe(true)
    expect(isPlainObject([])).toBe(false)
    expect(shallowMergeDefaults({ a: 1 }, { a: 0, b: 2 })).toEqual({
      a: 1,
      b: 2,
    })
    expect(applyMergeDefaults(1, 2, false)).toBe(1)
  })

  it('creates matching serializers for supported defaults', () => {
    expect(createDefaultSerializer('x').write('y')).toBe('y')
    expect(createDefaultSerializer(false).write(true)).toBe('true')
    expect(createDefaultSerializer(0).write(Number.NaN)).toBe('NaN')
    expect(
      createDefaultSerializer(new Date(0)).write(
        new Date('2020-01-01T00:00:00.000Z'),
      ),
    ).toBe('2020-01-01T00:00:00.000Z')
  })

  it('wraps Storage methods safely', () => {
    const key = 'browser-storage-helpers'
    sessionStorage.removeItem(key)
    expect(safeSetItem(sessionStorage, key, 'v')).toEqual({ ok: true })
    expect(safeGetItem(sessionStorage, key)).toEqual({ ok: true, value: 'v' })
    expect(safeRemoveItem(sessionStorage, key)).toEqual({ ok: true })
  })
})

describe('browserStorageRegistry', () => {
  it('notifies by storage object identity', () => {
    const hits: string[] = []
    const unsubLocal = subscribeSameDocument(localStorage, 'k', () => {
      hits.push('local')
    })
    const unsubSession = subscribeSameDocument(sessionStorage, 'k', () => {
      hits.push('session')
    })
    notifySameDocument(localStorage, 'k', { type: 'remove' })
    expect(hits).toEqual(['local'])
    notifySameDocument(sessionStorage, 'k', { type: 'write', raw: '1' })
    expect(hits).toEqual(['local', 'session'])
    unsubLocal()
    unsubSession()
  })

  it('contains throwing subscribers', () => {
    const good = vi.fn()
    const unsubBad = subscribeSameDocument(sessionStorage, 'k', () => {
      throw new Error('boom')
    })
    const unsubGood = subscribeSameDocument(sessionStorage, 'k', good)
    expect(() =>
      notifySameDocument(sessionStorage, 'k', { type: 'remove' }),
    ).not.toThrow()
    expect(good).toHaveBeenCalledTimes(1)
    unsubBad()
    unsubGood()
  })
})
