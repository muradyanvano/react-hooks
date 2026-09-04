import { describe, expect, it } from 'vitest'

import {
  createMismatchError,
  createStandardAdapter,
  createWebkitAdapter,
  deriveFullscreenState,
  fullscreenStatesEqual,
  isFullscreenSupported,
  isMismatchError,
  isStandardFamilyComplete,
  isWebkitFamilyComplete,
  normalizeError,
  normalizeNavigationUI,
  normalizeThenables,
  resolveFullscreenAdapter,
  resolveFullscreenContext,
  resolveOptionDocument,
  resolveTargetElement,
} from './fullscreenHelpers'

describe('fullscreenHelpers', () => {
  it('normalizes navigationUI and rejects invalid values', () => {
    expect(normalizeNavigationUI('auto')).toBe('auto')
    expect(normalizeNavigationUI('show')).toBe('show')
    expect(normalizeNavigationUI('hide')).toBe('hide')
    expect(normalizeNavigationUI('other')).toBeNull()
    expect(normalizeNavigationUI(1)).toBeNull()
  })

  it('detects standard and webkit adapter families without mixing', () => {
    const doc = document
    const el = document.createElement('div')
    document.body.appendChild(el)

    Object.defineProperty(el, 'requestFullscreen', {
      configurable: true,
      value: function requestFullscreen() {
        return Promise.resolve()
      },
    })
    Object.defineProperty(doc, 'exitFullscreen', {
      configurable: true,
      value: function exitFullscreen() {
        return Promise.resolve()
      },
    })
    Object.defineProperty(doc, 'fullscreenElement', {
      configurable: true,
      get() {
        return null
      },
    })

    const standard = resolveFullscreenAdapter(doc, el)
    expect(standard?.family).toBe('standard')
    expect(isFullscreenSupported(doc, el)).toBe(true)

    delete (el as { requestFullscreen?: unknown }).requestFullscreen
    delete (doc as { exitFullscreen?: unknown }).exitFullscreen
    Reflect.deleteProperty(doc, 'fullscreenElement')

    Object.defineProperty(el, 'webkitRequestFullscreen', {
      configurable: true,
      value: function webkitRequestFullscreen() {
        return undefined
      },
    })
    Object.defineProperty(doc, 'webkitExitFullscreen', {
      configurable: true,
      value: function webkitExitFullscreen() {
        return undefined
      },
    })
    Object.defineProperty(doc, 'webkitFullscreenElement', {
      configurable: true,
      get() {
        return null
      },
    })

    const webkit = resolveFullscreenAdapter(doc, el)
    expect(webkit?.family).toBe('webkit')

    Reflect.deleteProperty(doc, 'webkitFullscreenElement')
    delete (el as { webkitRequestFullscreen?: unknown }).webkitRequestFullscreen
    delete (doc as { webkitExitFullscreen?: unknown }).webkitExitFullscreen
    el.remove()
  })

  it('selects adapter families from the completeness matrix', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const originalStandardElement = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'fullscreenElement',
    )
    const originalStandardExit = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'exitFullscreen',
    )
    const originalRequest = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'requestFullscreen',
    )

    const cleanup = () => {
      Reflect.deleteProperty(el, 'requestFullscreen')
      Reflect.deleteProperty(el, 'webkitRequestFullscreen')
      Reflect.deleteProperty(document, 'exitFullscreen')
      Reflect.deleteProperty(document, 'webkitExitFullscreen')
      Reflect.deleteProperty(document, 'fullscreenElement')
      Reflect.deleteProperty(document, 'webkitFullscreenElement')
      if (originalStandardElement) {
        Object.defineProperty(
          Document.prototype,
          'fullscreenElement',
          originalStandardElement,
        )
      } else {
        Reflect.deleteProperty(Document.prototype, 'fullscreenElement')
      }
      if (originalStandardExit) {
        Object.defineProperty(
          Document.prototype,
          'exitFullscreen',
          originalStandardExit,
        )
      } else {
        Reflect.deleteProperty(Document.prototype, 'exitFullscreen')
      }
      if (originalRequest) {
        Object.defineProperty(
          Element.prototype,
          'requestFullscreen',
          originalRequest,
        )
      } else {
        Reflect.deleteProperty(Element.prototype, 'requestFullscreen')
      }
      el.remove()
    }

    try {
      // Hide prototype standard members so incompleteness is observable.
      Reflect.deleteProperty(Document.prototype, 'fullscreenElement')
      Object.defineProperty(Element.prototype, 'requestFullscreen', {
        configurable: true,
        value: undefined,
      })
      Object.defineProperty(Document.prototype, 'exitFullscreen', {
        configurable: true,
        value: undefined,
      })

      // Incomplete / incomplete → unsupported
      expect(resolveFullscreenAdapter(document, el)).toBeNull()

      // Request-only standard + complete WebKit → WebKit
      Object.defineProperty(el, 'requestFullscreen', {
        configurable: true,
        value: () => Promise.resolve(),
      })
      Object.defineProperty(el, 'webkitRequestFullscreen', {
        configurable: true,
        value: () => undefined,
      })
      Object.defineProperty(document, 'webkitExitFullscreen', {
        configurable: true,
        value: () => undefined,
      })
      Object.defineProperty(document, 'webkitFullscreenElement', {
        configurable: true,
        get() {
          return null
        },
      })
      expect(resolveFullscreenAdapter(document, el)?.family).toBe('webkit')

      // Complete request/exit missing state + complete WebKit → WebKit
      Object.defineProperty(document, 'exitFullscreen', {
        configurable: true,
        value: () => Promise.resolve(),
      })
      expect(isStandardFamilyComplete(document, el)).toBe(false)
      expect(isWebkitFamilyComplete(document, el)).toBe(true)
      expect(resolveFullscreenAdapter(document, el)?.family).toBe('webkit')

      // Complete standard + complete WebKit → standard
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get() {
          return null
        },
      })
      expect(resolveFullscreenAdapter(document, el)?.family).toBe('standard')

      // Complete standard only
      Reflect.deleteProperty(el, 'webkitRequestFullscreen')
      Reflect.deleteProperty(document, 'webkitExitFullscreen')
      Reflect.deleteProperty(document, 'webkitFullscreenElement')
      expect(resolveFullscreenAdapter(document, el)?.family).toBe('standard')
    } finally {
      cleanup()
    }
  })

  it('resolves omitted vs null documents and targets', () => {
    expect(resolveOptionDocument(undefined)).toBe(document)
    expect(resolveOptionDocument(null)).toBeNull()
    expect(resolveOptionDocument(document)).toBe(document)

    const ref = { current: null as HTMLElement | null }
    expect(resolveTargetElement(ref, document)).toBeNull()
    expect(resolveTargetElement(undefined, document)).toBe(
      document.documentElement,
    )
    expect(resolveTargetElement(undefined, null)).toBeNull()
  })

  it('flags target/document mismatches', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const foreign = document.implementation.createHTMLDocument('foreign')
    const context = resolveFullscreenContext({ current: el }, foreign)
    expect(context.mismatch).toBe(true)
    expect(context.document).toBe(document)
    el.remove()
  })

  it('creates stable mismatch errors', () => {
    const error = createMismatchError()
    expect(isMismatchError(error)).toBe(true)
    expect(isMismatchError(new Error('other'))).toBe(false)
  })

  it('normalizes errors and thenables', async () => {
    expect(normalizeError(new Error('x')).message).toBe('x')
    expect(normalizeError('boom').message).toBe('boom')
    expect(
      normalizeError({ name: 'NotAllowedError', message: 'no' }).name,
    ).toBe('NotAllowedError')
    expect(normalizeError(null).message.length).toBeGreaterThan(0)
    expect(normalizeError(undefined).message.length).toBeGreaterThan(0)
    await expect(normalizeThenables(undefined)).resolves.toBeUndefined()
    await expect(
      normalizeThenables(Promise.resolve(1)),
    ).resolves.toBeUndefined()
  })

  it('derives view state and compares equality', () => {
    const adapter = createStandardAdapter()
    const el = document.createElement('div')
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get() {
        return el
      },
    })
    const owned = deriveFullscreenState(adapter, document, el, null)
    expect(owned.isFullscreen).toBe(true)
    expect(owned.fullscreenElement).toBe(el)

    const other = deriveFullscreenState(
      adapter,
      document,
      document.createElement('span'),
      null,
    )
    expect(other.isFullscreen).toBe(false)
    expect(fullscreenStatesEqual(owned, owned)).toBe(true)
    expect(fullscreenStatesEqual(owned, other)).toBe(false)

    Reflect.deleteProperty(document, 'fullscreenElement')
  })

  it('binds request and exit with correct this', async () => {
    const el = document.createElement('div')
    const doc = document
    let requestThis: unknown
    let exitThis: unknown
    Object.defineProperty(el, 'requestFullscreen', {
      configurable: true,
      value: function requestFullscreen() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- assert call receiver
        requestThis = this
        return Promise.resolve()
      },
    })
    Object.defineProperty(doc, 'exitFullscreen', {
      configurable: true,
      value: function exitFullscreen() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- assert call receiver
        exitThis = this
        return Promise.resolve()
      },
    })
    const adapter = createStandardAdapter()
    await normalizeThenables(adapter.request(el, { navigationUI: 'hide' }))
    await normalizeThenables(adapter.exit(doc))
    expect(requestThis).toBe(el)
    expect(exitThis).toBe(doc)

    const webkit = createWebkitAdapter()
    Object.defineProperty(el, 'webkitRequestFullscreen', {
      configurable: true,
      value: function webkitRequestFullscreen() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- assert call receiver
        requestThis = this
      },
    })
    Object.defineProperty(doc, 'webkitExitFullscreen', {
      configurable: true,
      value: function webkitExitFullscreen() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- assert call receiver
        exitThis = this
      },
    })
    await normalizeThenables(webkit.request(el))
    await normalizeThenables(webkit.exit(doc))
    expect(requestThis).toBe(el)
    expect(exitThis).toBe(doc)
  })
})
