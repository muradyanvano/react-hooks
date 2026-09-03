import { describe, expect, it, vi } from 'vitest'

import {
  applyMergeDefaults,
  createDefaultSerializer,
  isBrowserEnvironment,
  isPlainObject,
  normalizeStorageError,
  resolveLocalStorage,
  resolveStorageWindow,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  shallowMergeDefaults,
} from './localStorageHelpers'
import {
  notifySameDocument,
  subscribeSameDocument,
} from './localStorageRegistry'

describe('localStorageHelpers', () => {
  it('normalizes non-Error throws', () => {
    expect(normalizeStorageError(new Error('x')).message).toBe('x')
    expect(normalizeStorageError('boom').message).toBe('boom')
    expect(normalizeStorageError(42).message).toBe('42')
  })

  it('detects browser environment without throwing', () => {
    expect(isBrowserEnvironment()).toBe(typeof window !== 'undefined')
  })

  it('resolves window with null preventing fallback', () => {
    expect(resolveStorageWindow(null)).toBeNull()
    expect(resolveStorageWindow(undefined)).toBe(window)
    expect(resolveStorageWindow(window)).toBe(window)
  })

  it('resolves localStorage safely', () => {
    expect(resolveLocalStorage(null)).toBeNull()
    expect(resolveLocalStorage(window)).toBe(window.localStorage)
  })

  it('returns null when localStorage getter throws', () => {
    const target = {
      get localStorage(): Storage {
        throw new Error('blocked')
      },
    } as Window
    expect(resolveLocalStorage(target)).toBeNull()
  })

  it('detects plain objects only', () => {
    expect(isPlainObject({ a: 1 })).toBe(true)
    expect(isPlainObject(Object.create(null))).toBe(true)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(new Date())).toBe(false)
    expect(isPlainObject(new Map())).toBe(false)
    expect(isPlainObject(new Set())).toBe(false)
    expect(isPlainObject(null)).toBe(false)
  })

  it('shallow-merges plain objects with stored precedence', () => {
    expect(shallowMergeDefaults({ a: 1, b: 2 }, { a: 0, c: 3 })).toEqual({
      a: 1,
      b: 2,
      c: 3,
    })
    expect(shallowMergeDefaults([1], [0, 2] as never)).toEqual([1])
  })

  it('applies mergeDefaults modes', () => {
    expect(applyMergeDefaults(1, 2, false)).toBe(1)
    expect(applyMergeDefaults({ a: 1 }, { a: 0, b: 2 }, true)).toEqual({
      a: 1,
      b: 2,
    })
    expect(
      applyMergeDefaults(1, 2, (stored, fallback) => stored + fallback),
    ).toBe(3)
  })

  it('serializes strings as raw text', () => {
    const serializer = createDefaultSerializer('hi')
    expect(serializer.write('hello')).toBe('hello')
    expect(serializer.read('world')).toBe('world')
  })

  it('serializes booleans', () => {
    const serializer = createDefaultSerializer(false)
    expect(serializer.write(true)).toBe('true')
    expect(serializer.write(false)).toBe('false')
    expect(serializer.read('true')).toBe(true)
    expect(serializer.read('false')).toBe(false)
    expect(() => serializer.read('yes')).toThrow()
  })

  it('serializes numbers including NaN and infinities', () => {
    const serializer = createDefaultSerializer(0)
    expect(serializer.write(Number.NaN)).toBe('NaN')
    expect(serializer.write(Number.POSITIVE_INFINITY)).toBe('Infinity')
    expect(serializer.write(Number.NEGATIVE_INFINITY)).toBe('-Infinity')
    expect(serializer.write(Object.is(-0, -0) ? -0 : 0)).toBe('0')
    expect(serializer.read('NaN')).toBeNaN()
    expect(serializer.read('Infinity')).toBe(Number.POSITIVE_INFINITY)
    expect(serializer.read('-Infinity')).toBe(Number.NEGATIVE_INFINITY)
    expect(serializer.read('12.5')).toBe(12.5)
    expect(() => serializer.read('')).toThrow()
    expect(() => serializer.read('nope')).toThrow()
  })

  it('serializes JSON objects and arrays', () => {
    const objectSerializer = createDefaultSerializer<{
      a: number
      b?: boolean
    }>({
      a: 1,
    })
    expect(objectSerializer.write({ a: 2, b: true })).toBe('{"a":2,"b":true}')
    expect(objectSerializer.read('{"a":3}')).toEqual({ a: 3 })

    const arraySerializer = createDefaultSerializer<number[]>([])
    expect(arraySerializer.write([1, 2])).toBe('[1,2]')
    expect(arraySerializer.read('[3]')).toEqual([3])
  })

  it('serializes Date, Map, and Set', () => {
    const date = new Date('2024-01-02T03:04:05.000Z')
    const dateSerializer = createDefaultSerializer(new Date(0))
    expect(dateSerializer.write(date)).toBe(date.toISOString())
    expect(dateSerializer.read(date.toISOString()).getTime()).toBe(
      date.getTime(),
    )
    expect(() => dateSerializer.write(new Date(Number.NaN))).toThrow()
    expect(() => dateSerializer.read('not-a-date')).toThrow()

    const mapSerializer = createDefaultSerializer(new Map())
    const writtenMap = mapSerializer.write(new Map([['a', 1]]))
    expect(writtenMap).toBe('[["a",1]]')
    expect(mapSerializer.read(writtenMap)).toEqual(new Map([['a', 1]]))

    const setSerializer = createDefaultSerializer(new Set())
    const writtenSet = setSerializer.write(new Set([1, 2]))
    expect(writtenSet).toBe('[1,2]')
    expect(setSerializer.read(writtenSet)).toEqual(new Set([1, 2]))
  })

  it('uses JSON for null defaults', () => {
    const serializer = createDefaultSerializer(null)
    expect(serializer.write(null)).toBe('null')
    expect(serializer.read('null')).toBeNull()
  })

  it('wraps Storage get/set/remove safely', () => {
    const key = 'helpers-safe-ops'
    localStorage.removeItem(key)
    expect(safeGetItem(localStorage, key)).toEqual({ ok: true, value: null })
    expect(safeSetItem(localStorage, key, 'v')).toEqual({ ok: true })
    expect(safeGetItem(localStorage, key)).toEqual({ ok: true, value: 'v' })
    expect(safeRemoveItem(localStorage, key)).toEqual({ ok: true })
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('captures Storage method failures', () => {
    const broken = {
      getItem() {
        throw 'get-fail'
      },
      setItem() {
        throw new Error('set-fail')
      },
      removeItem() {
        throw { message: 'remove-fail' }
      },
    } as unknown as Storage

    expect(safeGetItem(broken, 'k').ok).toBe(false)
    expect(safeSetItem(broken, 'k', 'v').ok).toBe(false)
    expect(safeRemoveItem(broken, 'k').ok).toBe(false)
  })
})

describe('localStorageRegistry', () => {
  it('notifies subscribers except the writer', () => {
    const storage = {} as object
    const seen: string[] = []
    const a = (notification: { type: string }) => {
      seen.push(`a:${notification.type}`)
    }
    const b = (notification: { type: string }) => {
      seen.push(`b:${notification.type}`)
    }
    const unsubscribeA = subscribeSameDocument(storage, 'k', a)
    const unsubscribeB = subscribeSameDocument(storage, 'k', b)

    notifySameDocument(storage, 'k', { type: 'write', raw: 'x' }, a)
    expect(seen).toEqual(['b:write'])

    notifySameDocument(storage, 'k', { type: 'remove' })
    expect(seen).toEqual(['b:write', 'a:remove', 'b:remove'])

    unsubscribeA()
    unsubscribeB()
    seen.length = 0
    notifySameDocument(storage, 'k', { type: 'write', raw: 'y' })
    expect(seen).toEqual([])
  })

  it('keeps different keys and storage objects independent', () => {
    const storageA = {} as object
    const storageB = {} as object
    const hits: string[] = []
    const unsubA = subscribeSameDocument(storageA, 'one', () => {
      hits.push('a1')
    })
    const unsubB = subscribeSameDocument(storageA, 'two', () => {
      hits.push('a2')
    })
    const unsubC = subscribeSameDocument(storageB, 'one', () => {
      hits.push('b1')
    })

    notifySameDocument(storageA, 'one', { type: 'remove' })
    expect(hits).toEqual(['a1'])

    unsubA()
    unsubB()
    unsubC()
  })

  it('contains throwing subscribers during fan-out', () => {
    const storage = {} as object
    const good = vi.fn()
    const unsubBad = subscribeSameDocument(storage, 'k', () => {
      throw new Error('subscriber boom')
    })
    const unsubGood = subscribeSameDocument(storage, 'k', good)

    expect(() =>
      notifySameDocument(storage, 'k', { type: 'write', raw: '1' }),
    ).not.toThrow()
    expect(good).toHaveBeenCalledTimes(1)

    unsubBad()
    unsubGood()
  })
})
