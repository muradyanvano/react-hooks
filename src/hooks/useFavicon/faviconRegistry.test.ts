import { describe, expect, it, vi } from 'vitest'

import { normalizeRelKey } from './faviconHelpers'
import {
  acquireOrUpdateFavicon,
  clearFaviconDocumentRegistry,
  createFaviconOwnerToken,
  getCurrentFaviconHref,
  getFaviconOwnerCount,
  getFaviconOwnerHrefs,
  ownerHoldsFavicon,
  releaseFavicon,
} from './faviconRegistry'

function makeDoc(
  html = '<!doctype html><html><head></head><body></body></html>',
) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  Object.defineProperty(doc, 'baseURI', {
    value: 'https://example.com/',
    configurable: true,
  })
  return doc
}

describe('faviconRegistry', () => {
  it('acquires, updates current owner, and restores on final release', () => {
    const doc = makeDoc()
    const original = doc.createElement('link')
    original.setAttribute('rel', 'icon')
    original.setAttribute('href', '/original.ico')
    doc.head!.appendChild(original)

    const relKey = normalizeRelKey('icon')
    const a = createFaviconOwnerToken()
    const b = createFaviconOwnerToken()

    expect(
      acquireOrUpdateFavicon({
        document: doc,
        relKey,
        relDisplay: 'icon',
        href: 'https://example.com/a.svg',
        token: a,
      }).ok,
    ).toBe(true)
    expect(original.getAttribute('href')).toBe('https://example.com/a.svg')

    expect(
      acquireOrUpdateFavicon({
        document: doc,
        relKey,
        relDisplay: 'icon',
        href: 'https://example.com/b.svg',
        token: b,
      }).ok,
    ).toBe(true)
    expect(getCurrentFaviconHref(doc, relKey)).toBe('https://example.com/b.svg')
    expect(getFaviconOwnerCount(doc, relKey)).toBe(2)

    // Non-current A updates → becomes current
    expect(
      acquireOrUpdateFavicon({
        document: doc,
        relKey,
        relDisplay: 'icon',
        href: 'https://example.com/a2.svg',
        token: a,
      }).ok,
    ).toBe(true)
    expect(getCurrentFaviconHref(doc, relKey)).toBe(
      'https://example.com/a2.svg',
    )

    releaseFavicon({ document: doc, relKey, token: b, mode: 'restore' })
    expect(ownerHoldsFavicon(doc, relKey, b)).toBe(false)
    expect(getCurrentFaviconHref(doc, relKey)).toBe(
      'https://example.com/a2.svg',
    )

    releaseFavicon({ document: doc, relKey, token: a, mode: 'restore' })
    expect(getFaviconOwnerCount(doc, relKey)).toBe(0)
    expect(original.getAttribute('href')).toBe('/original.ico')
  })

  it('does not reorder or rewrite on equivalent owner updates', () => {
    const doc = makeDoc()
    const relKey = normalizeRelKey('icon')
    const a = createFaviconOwnerToken()
    const b = createFaviconOwnerToken()

    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/a.svg',
      token: a,
    })
    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/b.svg',
      token: b,
    })

    const link = doc.head!.querySelector('link')!
    const setAttribute = vi.spyOn(link, 'setAttribute')
    setAttribute.mockClear()

    const result = acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/a.svg',
      token: a,
    })
    expect(result).toMatchObject({ ok: true, wrote: false })
    expect(getFaviconOwnerHrefs(doc, relKey)).toEqual([
      'https://example.com/a.svg',
      'https://example.com/b.svg',
    ])
    expect(getCurrentFaviconHref(doc, relKey)).toBe('https://example.com/b.svg')
    expect(setAttribute).not.toHaveBeenCalled()
  })

  it('does not rewrite DOM when releasing a non-current owner', () => {
    const doc = makeDoc()
    const relKey = normalizeRelKey('icon')
    const a = createFaviconOwnerToken()
    const b = createFaviconOwnerToken()
    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/a.svg',
      token: a,
    })
    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/b.svg',
      token: b,
    })
    const link = doc.head!.querySelector('link')!
    const setAttribute = vi.spyOn(link, 'setAttribute')
    setAttribute.mockClear()

    const released = releaseFavicon({
      document: doc,
      relKey,
      token: a,
      mode: 'restore',
    })
    expect(released).toMatchObject({ ok: true, wrote: false })
    expect(getCurrentFaviconHref(doc, relKey)).toBe('https://example.com/b.svg')
    expect(setAttribute).not.toHaveBeenCalled()
  })

  it('keeps three-owner ordering under nontrivial updates and releases', () => {
    const doc = makeDoc()
    const relKey = normalizeRelKey('icon')
    const a = createFaviconOwnerToken()
    const b = createFaviconOwnerToken()
    const c = createFaviconOwnerToken()

    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/a.svg',
      token: a,
    })
    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/b.svg',
      token: b,
    })
    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/c.svg',
      token: c,
    })
    expect(getFaviconOwnerHrefs(doc, relKey)).toEqual([
      'https://example.com/a.svg',
      'https://example.com/b.svg',
      'https://example.com/c.svg',
    ])

    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/a2.svg',
      token: a,
    })
    expect(getCurrentFaviconHref(doc, relKey)).toBe(
      'https://example.com/a2.svg',
    )
    expect(getFaviconOwnerHrefs(doc, relKey)).toEqual([
      'https://example.com/b.svg',
      'https://example.com/c.svg',
      'https://example.com/a2.svg',
    ])

    releaseFavicon({ document: doc, relKey, token: c, mode: 'restore' })
    expect(getCurrentFaviconHref(doc, relKey)).toBe(
      'https://example.com/a2.svg',
    )

    releaseFavicon({ document: doc, relKey, token: a, mode: 'restore' })
    expect(getCurrentFaviconHref(doc, relKey)).toBe('https://example.com/b.svg')

    releaseFavicon({ document: doc, relKey, token: b, mode: 'restore' })
    expect(getFaviconOwnerCount(doc, relKey)).toBe(0)
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)
  })

  it('creates a link when none exists and removes it on restore', () => {
    const doc = makeDoc()
    const relKey = normalizeRelKey('icon')
    const token = createFaviconOwnerToken()
    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/created.svg',
      token,
    })
    const links = doc.head!.querySelectorAll('link')
    expect(links).toHaveLength(1)
    releaseFavicon({ document: doc, relKey, token, mode: 'restore' })
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)
  })

  it('persists final DOM state without restoring', () => {
    const doc = makeDoc()
    const relKey = normalizeRelKey('icon')
    const token = createFaviconOwnerToken()
    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/persist.svg',
      token,
    })
    releaseFavicon({ document: doc, relKey, token, mode: 'persist' })
    expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
      'https://example.com/persist.svg',
    )
    expect(getFaviconOwnerCount(doc, relKey)).toBe(0)
  })

  it('treats persisted DOM as the baseline for a later independent owner', () => {
    const doc = makeDoc()
    const relKey = normalizeRelKey('icon')
    const first = createFaviconOwnerToken()
    const second = createFaviconOwnerToken()

    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/persist.svg',
      token: first,
    })
    releaseFavicon({ document: doc, relKey, token: first, mode: 'persist' })

    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/next.svg',
      token: second,
    })
    releaseFavicon({ document: doc, relKey, token: second, mode: 'restore' })
    expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
      'https://example.com/persist.svg',
    )
  })

  it('isolates documents and relations', () => {
    const docA = makeDoc()
    const docB = makeDoc()
    const iconKey = normalizeRelKey('icon')
    const appleKey = normalizeRelKey('apple-touch-icon')
    const a = createFaviconOwnerToken()
    const b = createFaviconOwnerToken()
    const c = createFaviconOwnerToken()

    acquireOrUpdateFavicon({
      document: docA,
      relKey: iconKey,
      relDisplay: 'icon',
      href: 'https://example.com/a.svg',
      token: a,
    })
    acquireOrUpdateFavicon({
      document: docB,
      relKey: iconKey,
      relDisplay: 'icon',
      href: 'https://example.com/b.svg',
      token: b,
    })
    acquireOrUpdateFavicon({
      document: docA,
      relKey: appleKey,
      relDisplay: 'apple-touch-icon',
      href: 'https://example.com/apple.svg',
      token: c,
    })

    expect(getCurrentFaviconHref(docA, iconKey)).toBe(
      'https://example.com/a.svg',
    )
    expect(getCurrentFaviconHref(docB, iconKey)).toBe(
      'https://example.com/b.svg',
    )
    expect(getCurrentFaviconHref(docA, appleKey)).toBe(
      'https://example.com/apple.svg',
    )

    clearFaviconDocumentRegistry(docA)
    clearFaviconDocumentRegistry(docB)
  })

  it('ignores unknown owner release and supports idempotent release', () => {
    const doc = makeDoc()
    const relKey = normalizeRelKey('icon')
    const token = createFaviconOwnerToken()
    const unknown = createFaviconOwnerToken()
    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/x.svg',
      token,
    })
    expect(
      releaseFavicon({
        document: doc,
        relKey,
        token: unknown,
        mode: 'restore',
      }).ok,
    ).toBe(true)
    expect(getFaviconOwnerCount(doc, relKey)).toBe(1)
    expect(
      releaseFavicon({ document: doc, relKey, token, mode: 'restore' }).ok,
    ).toBe(true)
    expect(
      releaseFavicon({ document: doc, relKey, token, mode: 'restore' }).ok,
    ).toBe(true)
  })

  it('rebinds after external removal without resurrecting the old node', () => {
    const doc = makeDoc()
    const relKey = normalizeRelKey('icon')
    const token = createFaviconOwnerToken()
    const original = doc.createElement('link')
    original.setAttribute('rel', 'icon')
    original.setAttribute('href', '/original.ico')
    doc.head!.appendChild(original)

    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/a.svg',
      token,
    })
    original.remove()
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)

    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/b.svg',
      token,
    })
    const replacement = doc.head!.querySelector('link')
    expect(replacement).not.toBeNull()
    expect(replacement).not.toBe(original)
    expect(replacement!.getAttribute('href')).toBe('https://example.com/b.svg')

    releaseFavicon({ document: doc, relKey, token, mode: 'restore' })
    expect(doc.contains(original)).toBe(false)
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)
  })

  it('does not fight external href edits on equivalent updates', () => {
    const doc = makeDoc()
    const relKey = normalizeRelKey('icon')
    const token = createFaviconOwnerToken()
    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/a.svg',
      token,
    })
    const link = doc.head!.querySelector('link')!
    link.setAttribute('href', 'https://example.com/external.svg')

    const result = acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/a.svg',
      token,
    })
    expect(result).toMatchObject({ ok: true, wrote: false })
    expect(link.getAttribute('href')).toBe('https://example.com/external.svg')

    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/b.svg',
      token,
    })
    expect(link.getAttribute('href')).toBe('https://example.com/b.svg')
  })

  it('rolls back phantom owners when apply fails', () => {
    const doc = makeDoc()
    const relKey = normalizeRelKey('icon')
    const token = createFaviconOwnerToken()
    const link = doc.createElement('link')
    link.setAttribute('rel', 'icon')
    link.setAttribute('href', '/original.ico')
    doc.head!.appendChild(link)

    const setAttribute = vi
      .spyOn(link, 'setAttribute')
      .mockImplementation(() => {
        throw new Error('setAttribute failed')
      })

    const result = acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/a.svg',
      token,
    })
    expect(result.ok).toBe(false)
    expect(getFaviconOwnerCount(doc, relKey)).toBe(0)
    expect(ownerHoldsFavicon(doc, relKey, token)).toBe(false)
    setAttribute.mockRestore()
  })

  it('keeps registry clean when restore throws', () => {
    const doc = makeDoc()
    const relKey = normalizeRelKey('icon')
    const token = createFaviconOwnerToken()
    const link = doc.createElement('link')
    link.setAttribute('rel', 'icon')
    link.setAttribute('href', '/original.ico')
    doc.head!.appendChild(link)

    acquireOrUpdateFavicon({
      document: doc,
      relKey,
      relDisplay: 'icon',
      href: 'https://example.com/a.svg',
      token,
    })

    const setAttribute = vi
      .spyOn(link, 'setAttribute')
      .mockImplementation(() => {
        throw new Error('restore failed')
      })

    const released = releaseFavicon({
      document: doc,
      relKey,
      token,
      mode: 'restore',
    })
    expect(released.ok).toBe(false)
    expect(getFaviconOwnerCount(doc, relKey)).toBe(0)
    setAttribute.mockRestore()
  })
})
