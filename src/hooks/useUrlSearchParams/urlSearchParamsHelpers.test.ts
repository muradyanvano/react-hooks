import { describe, expect, it, vi } from 'vitest'

import {
  applyAppend,
  applyRemove,
  applySet,
  buildNextUrl,
  entriesEqual,
  entriesFromSearchParams,
  extractHashRoute,
  extractQueryString,
  mergeInitialWithUrl,
  normalizeError,
  normalizeInputRecord,
  normalizeInputValue,
  normalizeScalarToken,
  normalizeStringifyOutput,
  searchParamsFromEntries,
  snapshotFromEntries,
} from './urlSearchParamsHelpers'
import {
  notifyUrlSearchParams,
  subscribeUrlSearchParams,
} from './urlSearchParamsRegistry'

describe('urlSearchParamsHelpers', () => {
  it('extracts history, hash, and hash-params query bodies', () => {
    expect(
      extractQueryString(
        { search: '?a=1&b=2', hash: '#/route?x=9' },
        'history',
      ),
    ).toBe('a=1&b=2')
    expect(
      extractQueryString(
        { search: '?keep=1', hash: '#/products/list?query=keyboard&page=2' },
        'hash',
      ),
    ).toBe('query=keyboard&page=2')
    expect(
      extractQueryString(
        { search: '?view=grid', hash: '#query=k&page=2' },
        'hash-params',
      ),
    ).toBe('query=k&page=2')
    expect(extractHashRoute('#/route?foo=bar')).toBe('/route')
    expect(extractHashRoute('#?foo=bar')).toBe('')
    expect(extractQueryString({ search: '', hash: '#foo=bar' }, 'hash')).toBe(
      '',
    )
  })

  it('builds URLs without dangling separators', () => {
    expect(
      buildNextUrl(
        { pathname: '/p', search: '', hash: '#h', href: '/p#h' },
        'history',
        '',
      ),
    ).toBe('/p#h')
    expect(
      buildNextUrl(
        { pathname: '/p', search: '?a=1', hash: '#/r?x=1', href: '' },
        'hash',
        '',
      ),
    ).toBe('/p?a=1#/r')
    expect(
      buildNextUrl(
        { pathname: '/p', search: '?a=1', hash: '#x=1', href: '' },
        'hash-params',
        '',
      ),
    ).toBe('/p?a=1')
    expect(
      buildNextUrl(
        { pathname: '/p', search: '', hash: '#/r', href: '' },
        'hash',
        'a=1',
      ),
    ).toBe('/p#/r?a=1')
  })

  it('treats only the first literal ? as the hash-mode separator', () => {
    expect(
      extractQueryString({ search: '', hash: '#/r?a=1%3Fb=2&c=3' }, 'hash'),
    ).toBe('a=1%3Fb=2&c=3')
  })

  it('normalizes scalars, arrays, nullish, and falsy filters', () => {
    expect(normalizeScalarToken(-0)).toBe('0')
    expect(normalizeScalarToken(Number.NaN)).toBe('NaN')
    expect(normalizeScalarToken(true)).toBe('true')
    expect(normalizeInputValue(null, true, false)).toBeNull()
    expect(normalizeInputValue('', false, true)).toBeNull()
    expect(normalizeInputValue('0', false, true)).toEqual(['0'])
    expect(normalizeInputValue([1, null, 2], true, false)).toEqual(['1', '2'])
    expect(normalizeInputValue([], true, false)).toBeNull()
    const input = Object.freeze({
      tag: Object.freeze(['a', 'b']) as readonly string[],
      empty: '',
    })
    expect(normalizeInputRecord(input, true, true)).toEqual([
      { name: 'tag', value: 'a' },
      { name: 'tag', value: 'b' },
    ])
  })

  it('builds immutable snapshots with repeated keys', () => {
    const entries = entriesFromSearchParams(
      new URLSearchParams('tag=react&tag=ts&q=hi'),
    )
    const snap = snapshotFromEntries(entries)
    expect(snap.q).toBe('hi')
    expect(snap.tag).toEqual(['react', 'ts'])
    expect(Object.isFrozen(snap)).toBe(true)
    expect(Object.isFrozen(snap.tag)).toBe(true)
    expect(entriesEqual(entries, entries)).toBe(true)
    expect(entriesEqual(entries, [{ name: 'q', value: 'hi' }])).toBe(false)
  })

  it('supports prototype-sensitive names as ordinary keys', () => {
    const input = Object.create(null) as Record<string, string>
    Object.defineProperty(input, '__proto__', {
      value: 'x',
      enumerable: true,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(input, 'constructor', {
      value: 'y',
      enumerable: true,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(input, 'toString', {
      value: 'z',
      enumerable: true,
      configurable: true,
      writable: true,
    })
    const entries = normalizeInputRecord(input, true, false)
    const snap = snapshotFromEntries(entries)
    expect(snap.__proto__).toBe('x')
    expect(snap.constructor).toBe('y')
    expect(snap.toString).toBe('z')
  })

  it('applies set/append/remove and merge helpers', () => {
    let entries = [
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ]
    entries = applySet(entries, 'a', ['9', '8'])
    expect(entries).toEqual([
      { name: 'b', value: '2' },
      { name: 'a', value: '9' },
      { name: 'a', value: '8' },
    ])
    entries = applyAppend(entries, 'b', '3')
    entries = applyRemove(entries, 'a', '9')
    expect(entries.map((e) => `${e.name}=${e.value}`)).toEqual([
      'b=2',
      'a=8',
      'b=3',
    ])
    expect(
      mergeInitialWithUrl(
        [
          { name: 'i', value: '1' },
          { name: 'a', value: 'fallback' },
        ],
        [{ name: 'a', value: 'url' }],
      ),
    ).toEqual([
      { name: 'i', value: '1' },
      { name: 'a', value: 'url' },
    ])
  })

  it('normalizes stringify output and errors', () => {
    expect(normalizeStringifyOutput('?a=1', 'history')).toBe('a=1')
    expect(normalizeStringifyOutput('#a=1', 'hash-params')).toBe('a=1')
    expect(normalizeStringifyOutput('#?a=1', 'hash-params')).toBe('a=1')
    expect(() => normalizeStringifyOutput(1, 'history')).toThrow(TypeError)
    expect(() => normalizeStringifyOutput('a=1#x', 'history')).toThrow(/#/)
    expect(normalizeError('boom').message).toBe('boom')
    expect(searchParamsFromEntries([{ name: 'a', value: '1' }]).get('a')).toBe(
      '1',
    )
  })

  it('treats hash-mode hashes without ? as routes only', () => {
    expect(extractQueryString({ search: '', hash: '#foo=bar' }, 'hash')).toBe(
      '',
    )
    expect(extractHashRoute('#foo=bar')).toBe('foo=bar')
    expect(
      extractQueryString({ search: '', hash: '#?foo=bar' }, 'hash-params'),
    ).toBe('foo=bar')
  })
})

describe('urlSearchParamsRegistry', () => {
  it('notifies peers with writer exclusion and mode isolation', () => {
    const win = {}
    const a = vi.fn()
    const b = vi.fn()
    const otherMode = vi.fn()
    const unsubA = subscribeUrlSearchParams(win, 'history', a)
    const unsubB = subscribeUrlSearchParams(win, 'history', b)
    const unsubOther = subscribeUrlSearchParams(win, 'hash', otherMode)
    const writer = Symbol('w')
    notifyUrlSearchParams(win, 'history', writer, a)
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
    expect(otherMode).not.toHaveBeenCalled()
    unsubA()
    unsubB()
    unsubOther()
  })

  it('contains throwing peers', () => {
    const win = {}
    const good = vi.fn()
    subscribeUrlSearchParams(win, 'history', () => {
      throw new Error('peer failed')
    })
    subscribeUrlSearchParams(win, 'history', good)
    expect(() =>
      notifyUrlSearchParams(win, 'history', Symbol('w')),
    ).not.toThrow()
    expect(good).toHaveBeenCalled()
  })
})
