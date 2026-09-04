/**
 * Storybook-only same-origin iframe window fixture for URL search demos.
 * Not shipped in dist or the npm tarball.
 */

export type UrlWindowFixture = {
  iframe: HTMLIFrameElement
  window: Window
  document: Document
  cleanup: () => void
  seed: (pathWithQueryAndHash: string) => void
  href: () => string
}

export function createUrlWindowFixture(
  initialPath = '/products?foo=bar&library=awesome&biz=biz',
): UrlWindowFixture {
  const iframe = document.createElement('iframe')
  iframe.title = 'URL search params demo frame'
  iframe.setAttribute('data-testid', 'usp-iframe')
  iframe.style.width = '100%'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.position = 'absolute'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = iframe.contentDocument
  if (win == null || doc == null) {
    iframe.remove()
    throw new Error('Failed to create same-origin iframe window')
  }

  doc.open()
  doc.write('<!doctype html><title>usp</title><body></body>')
  doc.close()

  const seed = (pathWithQueryAndHash: string) => {
    win.history.replaceState(win.history.state, '', pathWithQueryAndHash)
  }

  seed(initialPath)

  return {
    iframe,
    window: win,
    document: doc,
    seed,
    href: () =>
      `${win.location.pathname}${win.location.search}${win.location.hash}`,
    cleanup: () => {
      iframe.remove()
    },
  }
}
