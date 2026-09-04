import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearFaviconDocumentRegistry } from './faviconRegistry'
import { useFavicon } from './useFavicon'

function makeDoc(
  html = '<!doctype html><html><head></head><body></body></html>',
) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  Object.defineProperty(doc, 'baseURI', {
    value: 'https://example.com/app/',
    configurable: true,
  })
  return doc
}

describe('useFavicon', () => {
  afterEach(() => {
    clearFaviconDocumentRegistry(document)
  })

  it('starts idle before effects and applies after mount', async () => {
    const doc = makeDoc()
    let first: ReturnType<typeof useFavicon> | null = null
    const { result, unmount } = renderHook(() => {
      const value = useFavicon('/a.svg', { document: doc })
      if (first == null) {
        first = { ...value }
      }
      return value
    })

    expect(first).toMatchObject({
      href: null,
      isSupported: false,
      error: null,
    })

    await waitFor(() =>
      expect(result.current.href).toBe('https://example.com/a.svg'),
    )
    expect(result.current.isSupported).toBe(true)
    expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
      'https://example.com/a.svg',
    )
    unmount()
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)
  })

  it('updates an existing matching link and restores exact href', async () => {
    const doc = makeDoc()
    const link = doc.createElement('link')
    link.setAttribute('rel', 'icon')
    link.setAttribute('href', '/original.ico')
    link.setAttribute('type', 'image/x-icon')
    doc.head!.appendChild(link)

    const { result, rerender, unmount } = renderHook(
      ({ icon }) => useFavicon(icon, { document: doc }),
      { initialProps: { icon: '/next.svg' as string | null } },
    )

    await waitFor(() =>
      expect(result.current.href).toBe('https://example.com/next.svg'),
    )
    expect(link.getAttribute('type')).toBe('image/x-icon')

    rerender({ icon: '/other.svg' })
    await waitFor(() =>
      expect(result.current.href).toBe('https://example.com/other.svg'),
    )

    unmount()
    expect(link.getAttribute('href')).toBe('/original.ico')
  })

  it('treats null, undefined, and empty string as release', async () => {
    const doc = makeDoc()
    const { result, rerender, unmount } = renderHook(
      ({ icon }) => useFavicon(icon, { document: doc }),
      {
        initialProps: {
          icon: '/a.svg' as string | null | undefined,
        },
      },
    )
    await waitFor(() => expect(result.current.href).not.toBeNull())

    rerender({ icon: null })
    await waitFor(() => expect(result.current.href).toBeNull())
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)

    rerender({ icon: '/b.svg' })
    await waitFor(() =>
      expect(result.current.href).toBe('https://example.com/b.svg'),
    )

    rerender({ icon: undefined })
    await waitFor(() => expect(result.current.href).toBeNull())

    rerender({ icon: '/c.svg' })
    await waitFor(() => expect(result.current.href).not.toBeNull())
    rerender({ icon: '' })
    await waitFor(() => expect(result.current.href).toBeNull())
    unmount()
  })

  it('supports enabled lifecycle and custom baseUrl', async () => {
    const doc = makeDoc()
    const { result, rerender, unmount } = renderHook(
      ({ enabled, baseUrl, icon }) =>
        useFavicon(icon, { document: doc, enabled, baseUrl }),
      {
        initialProps: {
          enabled: false,
          baseUrl: 'https://cdn.example/base/',
          icon: 'icon.svg',
        },
      },
    )

    await waitFor(() => expect(result.current.href).toBeNull())
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)

    rerender({
      enabled: true,
      baseUrl: 'https://cdn.example/base/',
      icon: 'icon.svg',
    })
    await waitFor(() =>
      expect(result.current.href).toBe('https://cdn.example/base/icon.svg'),
    )

    rerender({
      enabled: true,
      baseUrl: 'https://other.example/',
      icon: 'icon.svg',
    })
    await waitFor(() =>
      expect(result.current.href).toBe('https://other.example/icon.svg'),
    )

    rerender({
      enabled: false,
      baseUrl: 'https://other.example/',
      icon: 'icon.svg',
    })
    await waitFor(() => expect(result.current.href).toBeNull())
    unmount()
  })

  it('keeps relation channels independent and validates empty rel', async () => {
    const doc = makeDoc()
    const { result, unmount } = renderHook(() =>
      useFavicon('/a.svg', {
        document: doc,
        rel: 'apple-touch-icon',
      }),
    )
    await waitFor(() => expect(result.current.href).not.toBeNull())
    expect(doc.head!.querySelector('link')?.getAttribute('rel')).toBe(
      'apple-touch-icon',
    )

    const invalid = renderHook(() =>
      useFavicon('/a.svg', { document: doc, rel: '   ' }),
    )
    await waitFor(() =>
      expect(invalid.result.current.error).toBeInstanceOf(Error),
    )
    expect(invalid.result.current.href).toBeNull()
    invalid.unmount()
    unmount()
  })

  it('respects explicit document null and reports unsupported', async () => {
    const { result, unmount } = renderHook(() =>
      useFavicon('/a.svg', { document: null }),
    )
    await waitFor(() => expect(result.current.isSupported).toBe(false))
    expect(result.current.href).toBeNull()
    expect(result.current.error).toBeNull()
    unmount()
  })

  it('coordinates multiple owners with most-recently-updated wins', async () => {
    const doc = makeDoc()
    const a = renderHook(({ icon }) => useFavicon(icon, { document: doc }), {
      initialProps: { icon: '/a.svg' },
    })
    await waitFor(() =>
      expect(a.result.current.href).toBe('https://example.com/a.svg'),
    )

    const b = renderHook(() => useFavicon('/b.svg', { document: doc }))
    await waitFor(() =>
      expect(b.result.current.href).toBe('https://example.com/b.svg'),
    )
    expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
      'https://example.com/b.svg',
    )

    a.rerender({ icon: '/a2.svg' })
    await waitFor(() =>
      expect(a.result.current.href).toBe('https://example.com/a2.svg'),
    )
    expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
      'https://example.com/a2.svg',
    )

    b.unmount()
    expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
      'https://example.com/a2.svg',
    )

    a.unmount()
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)
  })

  it('does not reorder when the same icon is reapplied', async () => {
    const doc = makeDoc()
    const a = renderHook(() => useFavicon('/a.svg', { document: doc }))
    await waitFor(() => expect(a.result.current.href).not.toBeNull())
    const b = renderHook(() => useFavicon('/b.svg', { document: doc }))
    await waitFor(() =>
      expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
        'https://example.com/b.svg',
      ),
    )

    const link = doc.head!.querySelector('link')!
    const setAttribute = vi.spyOn(link, 'setAttribute')
    setAttribute.mockClear()
    a.rerender()
    await act(async () => {
      await Promise.resolve()
    })
    expect(setAttribute).not.toHaveBeenCalled()
    expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
      'https://example.com/b.svg',
    )
    a.unmount()
    b.unmount()
  })

  it('persists favicon when restoreOnUnmount is false', async () => {
    const doc = makeDoc()
    const { unmount } = renderHook(() =>
      useFavicon('/persist.svg', {
        document: doc,
        restoreOnUnmount: false,
      }),
    )
    await waitFor(() =>
      expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
        'https://example.com/persist.svg',
      ),
    )
    unmount()
    await act(async () => {
      await Promise.resolve()
    })
    expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
      'https://example.com/persist.svg',
    )
    clearFaviconDocumentRegistry(doc)
    doc.head!.querySelector('link')?.remove()
  })

  it('keeps under-owner visible when a persistent current owner unmounts', async () => {
    const doc = makeDoc()
    const under = renderHook(() =>
      useFavicon('/under.svg', { document: doc, restoreOnUnmount: true }),
    )
    await waitFor(() =>
      expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
        'https://example.com/under.svg',
      ),
    )
    const top = renderHook(() =>
      useFavicon('/top.svg', { document: doc, restoreOnUnmount: false }),
    )
    await waitFor(() =>
      expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
        'https://example.com/top.svg',
      ),
    )
    top.unmount()
    await act(async () => {
      await Promise.resolve()
    })
    expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
      'https://example.com/under.svg',
    )
    under.unmount()
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)
  })

  it('Strict Mode with restoreOnUnmount false does not leave duplicate links', async () => {
    const doc = makeDoc()
    const { unmount } = renderHook(
      () =>
        useFavicon('/strict-persist.svg', {
          document: doc,
          restoreOnUnmount: false,
        }),
      { wrapper: StrictMode },
    )
    await waitFor(() =>
      expect(doc.head!.querySelectorAll('link')).toHaveLength(1),
    )
    unmount()
    await act(async () => {
      await Promise.resolve()
    })
    expect(doc.head!.querySelectorAll('link')).toHaveLength(1)
    expect(doc.head!.querySelector('link')?.getAttribute('href')).toBe(
      'https://example.com/strict-persist.svg',
    )
    doc.head!.querySelector('link')?.remove()
    clearFaviconDocumentRegistry(doc)
  })

  it('still restores on explicit disable when restoreOnUnmount is false', async () => {
    const doc = makeDoc()
    const { rerender, unmount } = renderHook(
      ({ enabled }) =>
        useFavicon('/x.svg', {
          document: doc,
          enabled,
          restoreOnUnmount: false,
        }),
      { initialProps: { enabled: true } },
    )
    await waitFor(() =>
      expect(doc.head!.querySelectorAll('link').length).toBe(1),
    )
    rerender({ enabled: false })
    await waitFor(() =>
      expect(doc.head!.querySelectorAll('link').length).toBe(0),
    )
    unmount()
  })

  it('restores on null icon before a persistent unmount', async () => {
    const doc = makeDoc()
    const { rerender, unmount } = renderHook(
      ({ icon }) =>
        useFavicon(icon, {
          document: doc,
          restoreOnUnmount: false,
        }),
      { initialProps: { icon: '/x.svg' as string | null } },
    )
    await waitFor(() =>
      expect(doc.head!.querySelectorAll('link').length).toBe(1),
    )
    rerender({ icon: null })
    await waitFor(() =>
      expect(doc.head!.querySelectorAll('link').length).toBe(0),
    )
    unmount()
    await act(async () => {
      await Promise.resolve()
    })
    expect(doc.head!.querySelectorAll('link').length).toBe(0)
  })

  it('reconciles after external removal on the next icon update', async () => {
    const doc = makeDoc()
    const { result, rerender, unmount } = renderHook(
      ({ icon }) => useFavicon(icon, { document: doc }),
      { initialProps: { icon: '/a.svg' } },
    )
    await waitFor(() => expect(result.current.href).not.toBeNull())
    doc.head!.querySelector('link')?.remove()
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)

    rerender({ icon: '/b.svg' })
    await waitFor(() =>
      expect(result.current.href).toBe('https://example.com/b.svg'),
    )
    expect(doc.head!.querySelectorAll('link')).toHaveLength(1)
    unmount()
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)
  })

  it('does not resurrect an externally removed original link on cleanup', async () => {
    const doc = makeDoc()
    const original = doc.createElement('link')
    original.setAttribute('rel', 'icon')
    original.setAttribute('href', '/original.ico')
    doc.head!.appendChild(original)

    const { unmount } = renderHook(() =>
      useFavicon('/a.svg', { document: doc }),
    )
    await waitFor(() =>
      expect(original.getAttribute('href')).toBe('https://example.com/a.svg'),
    )
    original.remove()
    unmount()
    expect(doc.contains(original)).toBe(false)
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)
  })

  it('does not reacquire when only onError identity changes', async () => {
    const doc = makeDoc()
    const hrefSpy = vi.fn()
    const { result, rerender } = renderHook(
      ({ onError }) => useFavicon('/stable.svg', { document: doc, onError }),
      { initialProps: { onError: () => undefined } },
    )
    await waitFor(() => expect(result.current.href).not.toBeNull())
    const link = doc.head!.querySelector('link')!
    const setAttribute = vi.spyOn(link, 'setAttribute')
    setAttribute.mockClear()

    rerender({
      onError: () => {
        hrefSpy()
      },
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(setAttribute).not.toHaveBeenCalled()
  })

  it('does not reacquire when only restoreOnUnmount changes', async () => {
    const doc = makeDoc()
    const { result, rerender } = renderHook(
      ({ restoreOnUnmount }) =>
        useFavicon('/stable.svg', { document: doc, restoreOnUnmount }),
      { initialProps: { restoreOnUnmount: true } },
    )
    await waitFor(() => expect(result.current.href).not.toBeNull())
    const link = doc.head!.querySelector('link')!
    const setAttribute = vi.spyOn(link, 'setAttribute')
    setAttribute.mockClear()
    rerender({ restoreOnUnmount: false })
    await act(async () => {
      await Promise.resolve()
    })
    expect(setAttribute).not.toHaveBeenCalled()
  })

  it('contains throwing onError and reports invalid URLs', async () => {
    const doc = makeDoc()
    const { result, unmount } = renderHook(() =>
      useFavicon('https://exa mple.com/bad', {
        document: doc,
        onError: () => {
          throw new Error('consumer')
        },
      }),
    )
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
    expect(result.current.href).toBeNull()
    unmount()
  })

  it('survives Strict Mode without duplicate links', async () => {
    const doc = makeDoc()
    const { unmount } = renderHook(
      () => useFavicon('/strict.svg', { document: doc }),
      { wrapper: StrictMode },
    )
    await waitFor(() =>
      expect(doc.head!.querySelectorAll('link')).toHaveLength(1),
    )
    unmount()
    expect(doc.head!.querySelectorAll('link')).toHaveLength(0)
  })

  it('switches documents without leaking ownership', async () => {
    const docA = makeDoc()
    const docB = makeDoc()
    const { rerender, unmount } = renderHook(
      ({ document: current }) => useFavicon('/x.svg', { document: current }),
      { initialProps: { document: docA as Document | null } },
    )
    await waitFor(() =>
      expect(docA.head!.querySelectorAll('link')).toHaveLength(1),
    )
    rerender({ document: docB })
    await waitFor(() =>
      expect(docB.head!.querySelectorAll('link')).toHaveLength(1),
    )
    expect(docA.head!.querySelectorAll('link')).toHaveLength(0)
    rerender({ document: null })
    await waitFor(() =>
      expect(docB.head!.querySelectorAll('link')).toHaveLength(0),
    )
    unmount()
  })

  it('leaves unrelated link elements untouched', async () => {
    const doc = makeDoc()
    const stylesheet = doc.createElement('link')
    stylesheet.setAttribute('rel', 'stylesheet')
    stylesheet.setAttribute('href', '/app.css')
    doc.head!.appendChild(stylesheet)

    const { unmount } = renderHook(() =>
      useFavicon('/icon.svg', { document: doc }),
    )
    await waitFor(() =>
      expect(doc.head!.querySelectorAll('link[rel="icon"]').length).toBe(1),
    )
    expect(stylesheet.getAttribute('href')).toBe('/app.css')
    unmount()
    expect(stylesheet.getAttribute('href')).toBe('/app.css')
    expect(doc.head!.contains(stylesheet)).toBe(true)
  })
})
