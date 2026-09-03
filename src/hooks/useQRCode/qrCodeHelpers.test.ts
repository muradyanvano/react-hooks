import { describe, expect, it } from 'vitest'

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
  toEncoderOptions,
  validateAndNormalizeOptions,
} from './qrCodeHelpers'

describe('qrCodeHelpers', () => {
  it('preserves exact text when encoding (whitespace, unicode, emoji)', async () => {
    const samples = [
      '  padded  ',
      'line1\nline2',
      'հայերեն 🙂',
      'https://example.test/path?q=1&x=2#frag',
    ]

    for (const text of samples) {
      const dataUrl = await encodeQrDataUrl(text, {
        errorCorrectionLevel: 'M',
        margin: 4,
      })
      expect(isImageDataUrl(dataUrl)).toBe(true)
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    }
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
    expect(validateAndNormalizeOptions({ maskPattern: 8 as never }).ok).toBe(
      false,
    )
    expect(validateAndNormalizeOptions({ margin: -1 }).ok).toBe(false)
    expect(validateAndNormalizeOptions({ scale: 0 }).ok).toBe(false)
    expect(validateAndNormalizeOptions({ width: -10 }).ok).toBe(false)
    expect(validateAndNormalizeOptions({ quality: 1.1 }).ok).toBe(false)
    expect(validateAndNormalizeOptions({ type: 'image/gif' as never }).ok).toBe(
      false,
    )
    expect(
      validateAndNormalizeOptions({
        errorCorrectionLevel: 'X' as never,
      }).ok,
    ).toBe(false)
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
    expect(createQRCodeOptionsSignature({ width: 128 })).not.toBe(
      createQRCodeOptionsSignature({ width: 256 }),
    )
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
