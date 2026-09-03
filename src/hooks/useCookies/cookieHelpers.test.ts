import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildCookieAttributes,
  buildRemoveCookieAssignment,
  buildSetCookieAssignment,
  decodeCookieComponent,
  dependencySetTouches,
  diffCookieMaps,
  encodeCookieComponent,
  formatExpires,
  formatSameSite,
  isValidCookieName,
  normalizeCookieError,
  normalizeDependencies,
  normalizeMaxAge,
  normalizePollingInterval,
  parseCookieString,
  parseCookieValue,
  resolveCookieDocument,
  resolveCookieStore,
  serializeCookieValue,
} from './cookieHelpers'
import {
  getCookiePollerIntervalForTests,
  hasCookieStoreListenerForTests,
  publishCookieSnapshot,
  reconcileCookieDocumentObservation,
  subscribeCookieDocument,
} from './cookieRegistry'

describe('cookieHelpers', () => {
  it('validates cookie names', () => {
    expect(isValidCookieName('locale')).toBe(true)
    expect(isValidCookieName('rh_uc_locale')).toBe(true)
    expect(isValidCookieName('')).toBe(false)
    expect(isValidCookieName('a=b')).toBe(false)
    expect(isValidCookieName('a;b')).toBe(false)
    expect(isValidCookieName('a b')).toBe(false)
  })

  it('encodes and recovers malformed percent decoding', () => {
    expect(encodeCookieComponent('a b')).toBe('a%20b')
    expect(decodeCookieComponent('a%20b')).toBe('a b')
    expect(decodeCookieComponent('%E0%A4%A')).toBe('%E0%A4%A')
  })

  it('parses cookie strings with whitespace, empty values, and encoded equals', () => {
    const map = parseCookieString(
      ' first=one ; second= ; third=a%3Db ; first=ignored ',
    )
    expect(map.get('first')).toBe('one')
    expect(map.get('second')).toBe('')
    expect(map.get('third')).toBe('a=b')
    expect([...map.keys()]).toEqual(['first', 'second', 'third'])
  })

  it('parses empty cookie string and skips empty names', () => {
    expect(parseCookieString('').size).toBe(0)
    expect(parseCookieString('=value; ok=1').get('ok')).toBe('1')
  })

  it('serializes and parses values with doNotParse', () => {
    expect(serializeCookieValue('plain').ok).toBe(true)
    expect(serializeCookieValue(false)).toEqual({
      ok: true,
      encodedValue: 'false',
    })
    expect(serializeCookieValue(0)).toEqual({ ok: true, encodedValue: '0' })
    expect(serializeCookieValue(null)).toEqual({
      ok: true,
      encodedValue: 'null',
    })
    expect(serializeCookieValue({ a: 1 })).toEqual({
      ok: true,
      encodedValue: encodeURIComponent('{"a":1}'),
    })
    expect(serializeCookieValue(undefined).ok).toBe(false)
    expect(serializeCookieValue(() => 1).ok).toBe(false)
    expect(serializeCookieValue(Symbol('x')).ok).toBe(false)

    const circular: { self?: unknown } = {}
    circular.self = circular
    expect(serializeCookieValue(circular).ok).toBe(false)

    expect(parseCookieValue('true', false)).toBe(true)
    expect(parseCookieValue('42', false)).toBe(42)
    expect(parseCookieValue('null', false)).toBe(null)
    expect(parseCookieValue('true', true)).toBe('true')
    expect(parseCookieValue('not-json', false)).toBe('not-json')
  })

  it('formats attributes and rejects invalid expires/maxAge/domain', () => {
    expect(formatSameSite(true)).toBe('Strict')
    expect(formatSameSite('lax')).toBe('Lax')
    expect(formatSameSite('none')).toBe('None')
    expect(normalizeMaxAge(3.9)).toEqual({ ok: true, value: 3 })
    expect(normalizeMaxAge(-2)).toEqual({ ok: true, value: -2 })
    expect(normalizeMaxAge(Number.NaN).ok).toBe(false)
    expect(formatExpires(new Date('invalid')).ok).toBe(false)
    expect(formatExpires(new Date(0)).ok).toBe(true)

    const ok = buildCookieAttributes({
      path: '/',
      maxAge: 10,
      secure: true,
      sameSite: 'lax',
      partitioned: true,
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.suffix).toContain('Path=/')
      expect(ok.suffix).toContain('Max-Age=10')
      expect(ok.suffix).toContain('Secure')
      expect(ok.suffix).toContain('SameSite=Lax')
      expect(ok.suffix).toContain('Partitioned')
    }

    expect(buildCookieAttributes({ domain: 'https://evil' }).ok).toBe(false)
    expect(buildCookieAttributes({ domain: 'evil/path' }).ok).toBe(false)
  })

  it('builds set and remove assignments', () => {
    const set = buildSetCookieAssignment('locale', 'en-US', {
      path: '/',
      sameSite: 'lax',
      maxAge: 60,
    })
    expect(set.ok).toBe(true)
    if (set.ok) {
      expect(set.assignment.startsWith('locale=en-US')).toBe(true)
      expect(set.assignment).toContain('Path=/')
      expect(set.assignment).toContain('Max-Age=60')
      expect(set.assignment).toContain('SameSite=Lax')
    }

    expect(buildSetCookieAssignment('bad name', 'x').ok).toBe(false)

    const remove = buildRemoveCookieAssignment('locale', { path: '/' })
    expect(remove.ok).toBe(true)
    if (remove.ok) {
      expect(remove.assignment).toContain('Max-Age=0')
      expect(remove.assignment).toContain('Expires=')
      expect(remove.assignment).toContain('Path=/')
    }
  })

  it('diffs maps and normalizes dependencies', () => {
    const previous = new Map([
      ['a', '1'],
      ['b', '2'],
    ])
    const next = new Map([
      ['b', '3'],
      ['c', '4'],
    ])
    expect(diffCookieMaps(previous, next)).toEqual({
      added: ['c'],
      changed: ['b'],
      removed: ['a'],
      all: ['c', 'b', 'a'],
    })

    expect(normalizeDependencies(undefined)).toBe('all')
    expect(normalizeDependencies(null)).toBe('all')
    expect(normalizeDependencies([])).toBe('none')
    expect(normalizeDependencies(['a', 'a', 'b'])).toEqual(new Set(['a', 'b']))
    expect(dependencySetTouches('all', ['x'])).toBe(true)
    expect(dependencySetTouches('none', ['x'])).toBe(false)
    expect(dependencySetTouches(new Set(['a']), ['b'])).toBe(false)
    expect(dependencySetTouches(new Set(['a']), ['a'])).toBe(true)
  })

  it('normalizes errors, polling intervals, and document resolution', () => {
    expect(normalizeCookieError('x').message).toBe('x')
    expect(normalizePollingInterval(undefined)).toBe(1000)
    expect(normalizePollingInterval(-1)).toBe(1000)
    expect(normalizePollingInterval(250.9)).toBe(250)
    expect(resolveCookieDocument(null)).toBeNull()
    expect(resolveCookieDocument(document)).toBe(document)
    expect(resolveCookieDocument(undefined)).toBe(document)
  })
})

describe('cookieRegistry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shares one poller and uses the smallest positive interval', () => {
    const doc = document
    const first = {
      onChange: vi.fn(),
      needsPolling: true,
      pollingInterval: 2000,
    }
    const second = {
      onChange: vi.fn(),
      needsPolling: true,
      pollingInterval: 500,
    }

    const unsubFirst = subscribeCookieDocument(doc, first)
    expect(getCookiePollerIntervalForTests(doc)).toBe(2000)

    const unsubSecond = subscribeCookieDocument(doc, second)
    reconcileCookieDocumentObservation(doc)
    expect(getCookiePollerIntervalForTests(doc)).toBe(500)

    unsubFirst()
    unsubSecond()
    expect(getCookiePollerIntervalForTests(doc)).toBeNull()
  })

  it('notifies peers on publish and skips unchanged raw text', () => {
    const doc = document
    const peer = {
      onChange: vi.fn(),
      needsPolling: false,
      pollingInterval: 1000,
    }
    const writer = {
      onChange: vi.fn(),
      needsPolling: false,
      pollingInterval: 1000,
    }
    const unsubPeer = subscribeCookieDocument(doc, peer)
    const unsubWriter = subscribeCookieDocument(doc, writer)

    publishCookieSnapshot(doc, 'a=1', 'set', writer)
    expect(peer.onChange).toHaveBeenCalledTimes(1)
    expect(writer.onChange).not.toHaveBeenCalled()

    peer.onChange.mockClear()
    publishCookieSnapshot(doc, 'a=1', 'set', writer)
    expect(peer.onChange).not.toHaveBeenCalled()

    unsubPeer()
    unsubWriter()
  })

  it('detects Cookie Store structural presence', () => {
    expect(resolveCookieStore(null)).toBeNull()
    const store = resolveCookieStore(document)
    if (store != null) {
      const unsub = subscribeCookieDocument(document, {
        onChange: vi.fn(),
        needsPolling: true,
        pollingInterval: 1000,
      })
      expect(hasCookieStoreListenerForTests(document)).toBe(true)
      expect(getCookiePollerIntervalForTests(document)).toBeNull()
      unsub()
    }
  })
})
