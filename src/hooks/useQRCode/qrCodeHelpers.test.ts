import { describe, expect, it, vi } from 'vitest'

import {
  createQRCodeOptionsError,
  createQRCodeOptionsSignature,
  encodeQrDataUrl,
  invokeOnErrorSafely,
  isAcceptedQrHexColor,
  isImageDataUrl,
  isSupportedErrorCorrectionLevel,
  isSupportedImageType,
  normalizeError,
  resolveQrToDataURL,
  toEncoderOptions,
  validateAndNormalizeOptions,
} from './qrCodeHelpers'

describe('qrCodeHelpers', () => {
  it('preserves exact text when encoding (whitespace, unicode, emoji)', async () => {
    const samples = [
      ' ',
      '  padded  ',
      '\tkeep-tabs\t',
      'line1\nline2',
      'a\r\nb',
      'հայերեն 🙂',
      'cafe\u0301',
      'https://example.test/path?q=1&x=2#frag',
      'WIFI:T:WPA;S:Demo-Net;P:example-only;;',
      'BEGIN:VCARD\nFN:Demo User\nEND:VCARD',
    ]

    const urls = new Set<string>()
    for (const text of samples) {
      const dataUrl = await encodeQrDataUrl(text, {
        errorCorrectionLevel: 'M',
        margin: 4,
      })
      expect(isImageDataUrl(dataUrl)).toBe(true)
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
      expect(dataUrl.length).toBeGreaterThan('data:image/png;base64,'.length)
      urls.add(dataUrl)
    }
    expect(urls.size).toBe(samples.length)
  })

  it('accepts margin/color/width options and rejects impossible capacity', async () => {
    const ok = await encodeQrDataUrl('capacity-ok', {
      errorCorrectionLevel: 'M',
      margin: 4.5,
      width: 180,
      color: { dark: '#000000', light: '#ffffff' },
    })
    expect(ok.startsWith('data:image/png;base64,')).toBe(true)

    await expect(
      encodeQrDataUrl('x'.repeat(3000), {
        errorCorrectionLevel: 'L',
        margin: 4,
        version: 1,
      }),
    ).rejects.toBeInstanceOf(Error)
  })

  it('resolves named and default-wrapped encoder module shapes', async () => {
    const named = vi.fn(async () => 'data:image/png;base64,named')
    expect(
      await resolveQrToDataURL({ toDataURL: named })('a', {} as never),
    ).toBe('data:image/png;base64,named')
    expect(named).toHaveBeenCalled()

    const wrapped = vi.fn(async () => 'data:image/png;base64,default')
    expect(
      await resolveQrToDataURL({ default: { toDataURL: wrapped } })(
        'b',
        {} as never,
      ),
    ).toBe('data:image/png;base64,default')

    expect(() => resolveQrToDataURL(null)).toThrow(/unavailable/i)
    expect(() => resolveQrToDataURL(42)).toThrow(/unavailable/i)
    expect(() => resolveQrToDataURL({})).toThrow(/toDataURL/i)
    expect(() => resolveQrToDataURL({ default: {} })).toThrow(/toDataURL/i)
    expect(() => resolveQrToDataURL({ toDataURL: 'nope' })).toThrow(
      /toDataURL/i,
    )
  })

  it('validates and normalizes default options', () => {
    const result = validateAndNormalizeOptions()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.options).toEqual({
      errorCorrectionLevel: 'M',
      margin: 4,
    })
  })

  it('maps public options to encoder options without mutating input', () => {
    const color = { dark: '#111111', light: '#eeeeee' }
    const options = {
      version: 5,
      errorCorrectionLevel: 'H' as const,
      maskPattern: 3 as const,
      margin: 2,
      scale: 6,
      width: 256,
      type: 'image/jpeg' as const,
      quality: 0.8,
      color,
    }
    const snapshot = structuredClone(options)
    const validation = validateAndNormalizeOptions(options)
    expect(validation.ok).toBe(true)
    if (!validation.ok) return

    const encoder = toEncoderOptions(validation.options)
    expect(encoder).toMatchObject({
      version: 5,
      errorCorrectionLevel: 'H',
      maskPattern: 3,
      margin: 2,
      scale: 6,
      width: 256,
      type: 'image/jpeg',
      color: { dark: '#111111', light: '#eeeeee' },
      rendererOpts: { quality: 0.8 },
    })
    expect(options).toEqual(snapshot)
    expect(encoder.color).not.toBe(color)
  })

  it('rejects invalid numeric and enum options', () => {
    expect(validateAndNormalizeOptions({ version: 0 }).ok).toBe(false)
    expect(validateAndNormalizeOptions({ version: 41 }).ok).toBe(false)
    expect(validateAndNormalizeOptions({ version: 1.5 }).ok).toBe(false)
    expect(validateAndNormalizeOptions({ version: Number.NaN }).ok).toBe(false)
    expect(
      validateAndNormalizeOptions({ version: Number.POSITIVE_INFINITY }).ok,
    ).toBe(false)
    expect(validateAndNormalizeOptions({ maskPattern: 8 as never }).ok).toBe(
      false,
    )
    expect(validateAndNormalizeOptions({ maskPattern: 1.2 as never }).ok).toBe(
      false,
    )
    expect(validateAndNormalizeOptions({ margin: -1 }).ok).toBe(false)
    expect(
      validateAndNormalizeOptions({ margin: Number.NEGATIVE_INFINITY }).ok,
    ).toBe(false)
    expect(validateAndNormalizeOptions({ scale: 0 }).ok).toBe(false)
    expect(validateAndNormalizeOptions({ width: -10 }).ok).toBe(false)
    expect(validateAndNormalizeOptions({ quality: 1.1 }).ok).toBe(false)
    expect(validateAndNormalizeOptions({ quality: -0.1 }).ok).toBe(false)
    expect(validateAndNormalizeOptions({ type: 'image/gif' as never }).ok).toBe(
      false,
    )
    expect(
      validateAndNormalizeOptions({
        errorCorrectionLevel: 'X' as never,
      }).ok,
    ).toBe(false)
  })

  it('accepts boundary numeric values and decimal margin/scale/width', () => {
    expect(validateAndNormalizeOptions({ version: 1 }).ok).toBe(true)
    expect(validateAndNormalizeOptions({ version: 40 }).ok).toBe(true)
    expect(validateAndNormalizeOptions({ maskPattern: 0 }).ok).toBe(true)
    expect(validateAndNormalizeOptions({ maskPattern: 7 }).ok).toBe(true)
    expect(validateAndNormalizeOptions({ margin: 0 }).ok).toBe(true)
    expect(validateAndNormalizeOptions({ margin: 4.25 }).ok).toBe(true)
    expect(validateAndNormalizeOptions({ scale: 0.5 }).ok).toBe(true)
    expect(validateAndNormalizeOptions({ width: 1.5 }).ok).toBe(true)
    expect(validateAndNormalizeOptions({ quality: 0 }).ok).toBe(true)
    expect(validateAndNormalizeOptions({ quality: 1 }).ok).toBe(true)
    expect(validateAndNormalizeOptions({ margin: -0 }).ok).toBe(true)
  })

  it('ignores inherited option and color properties', () => {
    const inheritedOptions = Object.create({ version: 99 }) as {
      version?: number
    }
    expect(validateAndNormalizeOptions(inheritedOptions).ok).toBe(true)

    const inheritedColor = Object.create({ dark: 'navy' }) as {
      dark?: string
      light?: string
    }
    const result = validateAndNormalizeOptions({ color: inheritedColor })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.options.color).toBeUndefined()
  })

  it('does not mutate frozen consumer option objects', () => {
    const color = Object.freeze({ dark: '#000000', light: '#ffffff' })
    const options = Object.freeze({
      margin: 4,
      width: 128,
      color,
      quality: 0.9,
      type: 'image/jpeg' as const,
    })
    const validation = validateAndNormalizeOptions(options)
    expect(validation.ok).toBe(true)
    if (!validation.ok) return
    const encoder = toEncoderOptions(validation.options)
    expect(encoder.rendererOpts).toEqual({ quality: 0.9 })
    expect(encoder.color).not.toBe(color)
    expect(options.color).toBe(color)
  })

  it('accepts only encoder hex color formats', () => {
    expect(isAcceptedQrHexColor('#000')).toBe(true)
    expect(isAcceptedQrHexColor('#0000')).toBe(true)
    expect(isAcceptedQrHexColor('#000000')).toBe(true)
    expect(isAcceptedQrHexColor('#000000ff')).toBe(true)
    expect(isAcceptedQrHexColor('ffffff')).toBe(true)
    expect(isAcceptedQrHexColor('#12')).toBe(false)
    expect(isAcceptedQrHexColor('#12345')).toBe(false)
    expect(isAcceptedQrHexColor('red')).toBe(false)
    expect(isAcceptedQrHexColor(1)).toBe(false)
    expect(validateAndNormalizeOptions({ color: { dark: 'navy' } }).ok).toBe(
      false,
    )
  })

  it('recognizes supported MIME and error-correction values', () => {
    for (const level of [
      'L',
      'M',
      'Q',
      'H',
      'low',
      'medium',
      'quartile',
      'high',
    ] as const) {
      expect(isSupportedErrorCorrectionLevel(level)).toBe(true)
    }
    expect(isSupportedErrorCorrectionLevel('x')).toBe(false)
    expect(isSupportedImageType('image/png')).toBe(true)
    expect(isSupportedImageType('image/jpeg')).toBe(true)
    expect(isSupportedImageType('image/webp')).toBe(true)
    expect(isSupportedImageType('image/svg+xml')).toBe(false)
  })

  it('builds equal signatures for equivalent option objects', () => {
    const a = createQRCodeOptionsSignature({
      color: { dark: '#000000', light: '#ffffff' },
      margin: 4,
      onError: () => undefined,
    })
    const b = createQRCodeOptionsSignature({
      color: { dark: '#000000', light: '#ffffff' },
      margin: 4,
      onError: () => {
        throw new Error('different identity')
      },
    })
    expect(a).toBe(b)
    expect(createQRCodeOptionsSignature()).toBe(
      createQRCodeOptionsSignature({
        errorCorrectionLevel: 'M',
        margin: 4,
      }),
    )
    expect(createQRCodeOptionsSignature({ width: 128 })).not.toBe(
      createQRCodeOptionsSignature({ width: 256 }),
    )
  })

  it('distinguishes invalid option signatures that share an error message', () => {
    const a = createQRCodeOptionsSignature({ version: 99 })
    const b = createQRCodeOptionsSignature({ version: 100 })
    expect(a).not.toBe(b)
    expect(a).toContain('version must be an integer between 1 and 40')
    expect(createQRCodeOptionsSignature({ version: 99 })).toBe(a)
  })

  it('normalizes errors and creates option errors', () => {
    const original = new Error('boom')
    expect(normalizeError(original)).toBe(original)
    expect(normalizeError('string-fail')).toEqual(new Error('string-fail'))
    expect(normalizeError(42).message).toBe('42')
    expect(createQRCodeOptionsError('bad').message).toBe('bad')
  })

  it('contains throwing onError callbacks and skips missing callbacks', () => {
    invokeOnErrorSafely(undefined, new Error('unused'))
    expect(() => {
      invokeOnErrorSafely(() => {
        throw new Error('consumer')
      }, new Error('owned'))
    }).not.toThrow()
  })

  it('recognizes image data URLs', () => {
    expect(isImageDataUrl('data:image/png;base64,abc')).toBe(true)
    expect(isImageDataUrl('data:image/jpeg;base64,abc')).toBe(true)
    expect(isImageDataUrl('data:image/webp;base64,abc')).toBe(true)
    expect(isImageDataUrl('data:text/plain;base64,abc')).toBe(false)
    expect(isImageDataUrl('https://example.test/qr.png')).toBe(false)
  })
})
