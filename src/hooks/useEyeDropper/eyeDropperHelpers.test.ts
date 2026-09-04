import { describe, expect, it } from 'vitest'

import {
  bridgeExternalAbort,
  eyeDropperStatesEqual,
  isAbortError,
  isEyeDropperSupported,
  normalizeError,
  normalizeInitialValue,
  normalizeSrgbHex,
  resolveEffectiveWindow,
  resolveEyeDropperConstructor,
  validateEyeDropperResult,
} from './eyeDropperHelpers'

describe('eyeDropperHelpers', () => {
  it('normalizes six-digit sRGB and rejects shorthand', () => {
    expect(normalizeSrgbHex('#AABBCC')).toEqual({
      ok: true,
      value: '#aabbcc',
    })
    expect(normalizeSrgbHex('#fff').ok).toBe(false)
    expect(normalizeSrgbHex('aabbcc').ok).toBe(false)
    expect(normalizeSrgbHex(null).ok).toBe(false)
    expect(normalizeInitialValue('#FF00AA')).toBe('#ff00aa')
    expect(normalizeInitialValue('#fff')).toBe('')
    expect(normalizeInitialValue(undefined)).toBe('')
  })

  it('validates EyeDropper results structurally', () => {
    expect(validateEyeDropperResult({ sRGBHex: '#ABCDEF' })).toEqual({
      ok: true,
      value: '#abcdef',
    })
    expect(validateEyeDropperResult(null).ok).toBe(false)
    expect(validateEyeDropperResult({}).ok).toBe(false)
    expect(validateEyeDropperResult({ sRGBHex: 1 }).ok).toBe(false)
    expect(validateEyeDropperResult({ sRGBHex: '#fff' }).ok).toBe(false)
    expect(
      validateEyeDropperResult({ sRGBHex: '#abcdef', extra: true }).ok,
    ).toBe(true)

    const proto = { sRGBHex: '#abcdef' }
    const inherited = Object.create(proto) as { sRGBHex: string }
    expect(validateEyeDropperResult(inherited).ok).toBe(false)
  })

  it('detects AbortError across realms without instanceof', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true)
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true)
    expect(isAbortError(new Error('nope'))).toBe(false)
    expect(isAbortError('AbortError')).toBe(false)
  })

  it('resolves windows and constructors without constructing', () => {
    expect(resolveEffectiveWindow(null)).toBeNull()
    expect(resolveEffectiveWindow(window)).toBe(window)
    expect(isEyeDropperSupported(null)).toBe(false)

    class Good {
      open() {
        return Promise.resolve({ sRGBHex: '#000000' })
      }
    }
    const fakeWin = { EyeDropper: Good } as unknown as Window
    expect(isEyeDropperSupported(fakeWin)).toBe(true)
    expect(resolveEyeDropperConstructor(fakeWin)).toBeTypeOf('function')

    function Bad() {}
    Bad.prototype = { open: 1 }
    const badWin = { EyeDropper: Bad } as unknown as Window
    expect(isEyeDropperSupported(badWin)).toBe(false)
  })

  it('bridges external abort onto an internal controller', () => {
    const external = new AbortController()
    const internal = new AbortController()
    const remove = bridgeExternalAbort(external.signal, internal)
    expect(internal.signal.aborted).toBe(false)
    external.abort()
    expect(internal.signal.aborted).toBe(true)
    remove()
    remove()
  })

  it('normalizes errors and compares view state', () => {
    const err = new Error('x')
    expect(normalizeError(err)).toBe(err)
    expect(normalizeError('y').message).toBe('y')
    expect(
      eyeDropperStatesEqual(
        {
          sRGBHex: '',
          isPicking: false,
          error: null,
          isSupported: false,
        },
        {
          sRGBHex: '',
          isPicking: false,
          error: null,
          isSupported: false,
        },
      ),
    ).toBe(true)
  })
})
