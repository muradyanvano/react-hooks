import { describe, expect, it } from 'vitest'

import {
  applyIconToLink,
  createIconLink,
  faviconStatesEqual,
  findMatchingIconLinks,
  isActiveIconRequest,
  isFaviconDocumentSupported,
  linkMatchesRelKey,
  normalizeError,
  normalizeRelDisplay,
  normalizeRelKey,
  readAttributeSnapshot,
  resolveEffectiveDocument,
  resolveIconHref,
  restoreLinkSnapshot,
  selectManagedLink,
  snapshotExistingLink,
  validateRel,
} from './faviconHelpers'

function makeDoc(
  html = '<!doctype html><html><head></head><body></body></html>',
) {
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('faviconHelpers', () => {
  it('normalizes relation display and keys', () => {
    expect(normalizeRelDisplay('  shortcut   icon  ')).toBe('shortcut icon')
    expect(normalizeRelKey('ICON Shortcut')).toBe('icon shortcut')
    expect(normalizeRelKey('shortcut icon')).toBe(
      normalizeRelKey('ICON shortcut'),
    )
    expect(validateRel('').ok).toBe(false)
    expect(validateRel('   ').ok).toBe(false)
    expect(validateRel('apple-touch-icon').ok).toBe(true)
  })

  it('matches link relations case-insensitively without CSS selectors', () => {
    const doc = makeDoc()
    const link = doc.createElement('link')
    link.setAttribute('rel', 'SHORTCUT Icon')
    doc.head!.appendChild(link)
    expect(linkMatchesRelKey(link, normalizeRelKey('shortcut icon'))).toBe(true)
    expect(linkMatchesRelKey(link, normalizeRelKey('icon'))).toBe(false)
    expect(
      findMatchingIconLinks(doc, normalizeRelKey('shortcut icon')),
    ).toEqual([link])
  })

  it('selects the last matching link in document order', () => {
    const doc = makeDoc()
    const first = doc.createElement('link')
    first.setAttribute('rel', 'icon')
    first.setAttribute('href', '/a.ico')
    const second = doc.createElement('link')
    second.setAttribute('rel', 'icon')
    second.setAttribute('href', '/b.ico')
    doc.head!.appendChild(first)
    doc.head!.appendChild(second)
    const matches = findMatchingIconLinks(doc, normalizeRelKey('icon'))
    expect(selectManagedLink(matches)).toBe(second)
  })

  it('resolves absolute, relative, root-relative, data, and blob URLs', () => {
    const doc = makeDoc()
    Object.defineProperty(doc, 'baseURI', {
      value: 'https://example.com/app/',
      configurable: true,
    })

    expect(
      resolveIconHref('https://cdn.example/x.ico', undefined, doc),
    ).toEqual({
      ok: true,
      href: 'https://cdn.example/x.ico',
    })
    expect(resolveIconHref('icons/a.svg', undefined, doc)).toEqual({
      ok: true,
      href: 'https://example.com/app/icons/a.svg',
    })
    expect(resolveIconHref('/root.svg', undefined, doc)).toEqual({
      ok: true,
      href: 'https://example.com/root.svg',
    })
    expect(
      resolveIconHref('icons/a.svg', 'https://cdn.example/base/', doc),
    ).toEqual({
      ok: true,
      href: 'https://cdn.example/base/icons/a.svg',
    })
    expect(resolveIconHref('data:image/svg+xml,test', undefined, doc).ok).toBe(
      true,
    )
    expect(
      resolveIconHref('blob:https://example.com/1-2-3', undefined, doc).ok,
    ).toBe(true)
    expect(resolveIconHref('x', '::bad-base::', doc).ok).toBe(false)
  })

  it('preserves query strings and fragments', () => {
    const doc = makeDoc()
    Object.defineProperty(doc, 'baseURI', {
      value: 'https://example.com/',
      configurable: true,
    })
    const result = resolveIconHref('/icon.svg?v=1#hash', undefined, doc)
    expect(result).toEqual({
      ok: true,
      href: 'https://example.com/icon.svg?v=1#hash',
    })
  })

  it('snapshots and restores existing links without dropping unrelated attrs', () => {
    const doc = makeDoc()
    const link = doc.createElement('link')
    link.setAttribute('rel', 'icon')
    link.setAttribute('href', '/original.ico')
    link.setAttribute('type', 'image/x-icon')
    link.setAttribute('sizes', '32x32')
    link.setAttribute('data-demo', 'keep')
    doc.head!.appendChild(link)

    const snapshot = snapshotExistingLink(link)
    applyIconToLink(link, '/next.svg', 'icon')
    expect(link.getAttribute('href')).toBe('/next.svg')
    restoreLinkSnapshot(snapshot)
    expect(link.getAttribute('href')).toBe('/original.ico')
    expect(link.getAttribute('rel')).toBe('icon')
    expect(link.getAttribute('type')).toBe('image/x-icon')
    expect(link.getAttribute('sizes')).toBe('32x32')
    expect(link.getAttribute('data-demo')).toBe('keep')
  })

  it('restores empty-string href attributes exactly', () => {
    const doc = makeDoc()
    const link = doc.createElement('link')
    link.setAttribute('rel', 'icon')
    link.setAttribute('href', '')
    doc.head!.appendChild(link)
    const snapshot = snapshotExistingLink(link)
    applyIconToLink(link, '/next.ico', 'icon')
    restoreLinkSnapshot(snapshot)
    expect(link.getAttribute('href')).toBe('')
    expect(link.hasAttribute('href')).toBe(true)
  })

  it('treats repeated relation tokens as a single sorted key', () => {
    expect(normalizeRelKey('icon icon shortcut')).toBe('icon shortcut')
    expect(normalizeRelKey('shortcut   icon')).toBe(
      normalizeRelKey('ICON\tshortcut'),
    )
  })

  it('removes href on restore when it was originally absent', () => {
    const doc = makeDoc()
    const link = doc.createElement('link')
    link.setAttribute('rel', 'icon')
    doc.head!.appendChild(link)
    const snapshot = snapshotExistingLink(link)
    expect(readAttributeSnapshot(link, 'href').present).toBe(false)
    applyIconToLink(link, '/added.ico', 'icon')
    restoreLinkSnapshot(snapshot)
    expect(link.hasAttribute('href')).toBe(false)
  })

  it('removes created links on restore', () => {
    const doc = makeDoc()
    const link = createIconLink(doc, '/created.svg', 'icon')
    expect(doc.head!.contains(link)).toBe(true)
    restoreLinkSnapshot({ kind: 'created', element: link })
    expect(doc.head!.contains(link)).toBe(false)
  })

  it('detects support and resolves documents', () => {
    const doc = makeDoc()
    expect(isFaviconDocumentSupported(doc)).toBe(true)
    expect(isFaviconDocumentSupported(null)).toBe(false)
    expect(resolveEffectiveDocument(null)).toBeNull()
    expect(resolveEffectiveDocument(doc)).toBe(doc)
  })

  it('classifies active icon requests and normalizes errors', () => {
    expect(isActiveIconRequest('a')).toBe(true)
    expect(isActiveIconRequest('')).toBe(false)
    expect(isActiveIconRequest(null)).toBe(false)
    expect(isActiveIconRequest(undefined)).toBe(false)
    const err = new Error('x')
    expect(normalizeError(err)).toBe(err)
    expect(normalizeError('y').message).toBe('y')
    expect(
      faviconStatesEqual(
        { href: null, isSupported: false, error: null },
        { href: null, isSupported: false, error: null },
      ),
    ).toBe(true)
  })
})
