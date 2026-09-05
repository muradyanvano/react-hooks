import { describe, expect, it, vi } from 'vitest'

import {
  bytesToBase64,
  createOptionsSignature,
  encodeBase64,
  stringToUtf8Bytes,
  validateOptions,
} from './base64Helpers'

describe('base64 helpers', () => {
  it('encodes UTF-8 text without btoa', () => {
    expect(bytesToBase64(stringToUtf8Bytes('Վանո 🙂'))).toBe(
      '1Y7VodW21bgg8J+Zgg==',
    )
  })

  it('encodes only the visible portion of a typed-array view', async () => {
    const source = new Uint8Array([1, 2, 3, 4])
    const output = await encodeBase64(source.subarray(1, 3), {
      dataUrl: false,
    })
    expect(output).toBe('AgM=')
  })

  it('uses the appropriate default MIME types', async () => {
    await expect(encodeBase64('hello', { dataUrl: true })).resolves.toBe(
      'data:text/plain;charset=utf-8;base64,aGVsbG8=',
    )
    await expect(
      encodeBase64(new Uint8Array([0, 255]), { dataUrl: true }),
    ).resolves.toBe('data:application/octet-stream;base64,AP8=')
  })

  it('uses Blob MIME type and reads Blob bytes', async () => {
    const blob = new Blob([new Uint8Array([65])], { type: 'text/custom' })
    await expect(encodeBase64(blob, { dataUrl: true })).resolves.toBe(
      'data:text/custom;base64,QQ==',
    )
  })

  it('validates MIME types and quality', () => {
    expect(
      validateOptions({ type: 'text/plain;charset=utf-8', quality: 0 }),
    ).toMatchObject({
      ok: true,
    })
    expect(validateOptions({ type: 'plain-text' })).toMatchObject({ ok: false })
    expect(validateOptions({ quality: Number.NaN })).toMatchObject({
      ok: false,
    })
    expect(validateOptions({ quality: 1.1 })).toMatchObject({ ok: false })
  })

  it('requires serializers to return strings', async () => {
    await expect(
      encodeBase64(
        { value: 1 },
        { dataUrl: false, serializer: () => 1 as never },
      ),
    ).rejects.toThrow('serializer must return a string')
  })

  it.each([
    ['ASCII', 'hello', 'aGVsbG8='],
    ['whitespace', ' \n\t ', 'IAoJIA=='],
    ['empty text', '', ''],
  ])('encodes %s without changing the source', (_, value, expected) => {
    expect(bytesToBase64(stringToUtf8Bytes(value))).toBe(expected)
  })

  it('encodes an ArrayBuffer, DataView, and non-zero-offset typed array', async () => {
    const source = new Uint8Array([0, 65, 66, 255])
    await expect(encodeBase64(source.buffer, { dataUrl: false })).resolves.toBe(
      'AEFC/w==',
    )
    await expect(
      encodeBase64(new DataView(source.buffer, 1, 2), { dataUrl: false }),
    ).resolves.toBe('QUI=')
    await expect(
      encodeBase64(source.subarray(1, 3), { dataUrl: false }),
    ).resolves.toBe('QUI=')
  })

  it('uses Blob fallback MIME and supports payload-only blobs', async () => {
    const blob = new Blob(['A'])
    await expect(encodeBase64(blob, { dataUrl: true })).resolves.toBe(
      'data:application/octet-stream;base64,QQ==',
    )
    await expect(encodeBase64(blob, { dataUrl: false })).resolves.toBe('QQ==')
  })

  it('uses canvas MIME, quality, and payload settings', async () => {
    const toDataURL = vi.fn(() => 'data:image/png;base64,cG5n')
    const canvas = {
      getContext: vi.fn(),
      toDataURL,
    } as unknown as HTMLCanvasElement
    await expect(
      encodeBase64(canvas, { dataUrl: false, type: 'image/webp', quality: 0 }),
    ).resolves.toBe('cG5n')
    expect(toDataURL).toHaveBeenCalledWith('image/webp', 0)
  })

  it('uses image natural dimensions before element dimensions', async () => {
    const drawImage = vi.fn()
    const canvas = {
      getContext: () => ({ drawImage }),
      toDataURL: () => 'data:image/png;base64,cG5n',
    } as unknown as HTMLCanvasElement
    const image = {
      naturalWidth: 10,
      naturalHeight: 20,
      width: 1,
      height: 2,
      ownerDocument: { createElement: () => canvas },
    } as unknown as HTMLImageElement
    await expect(encodeBase64(image, { dataUrl: false })).resolves.toBe('cG5n')
    expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 10, 20)
  })

  it('falls back to image element dimensions', async () => {
    const canvas = {
      getContext: () => ({ drawImage: vi.fn() }),
      toDataURL: () => 'data:image/png;base64,cG5n',
    } as unknown as HTMLCanvasElement
    const image = {
      naturalWidth: 0,
      naturalHeight: 0,
      width: 4,
      height: 5,
      ownerDocument: { createElement: () => canvas },
    } as unknown as HTMLImageElement
    await expect(encodeBase64(image, { dataUrl: false })).resolves.toBe('cG5n')
  })

  it.each([
    [
      'missing canvas context',
      (): CanvasRenderingContext2D | null => null,
      (): string => 'data:image/png;base64,cG5n',
    ],
    [
      'draw failure',
      (): CanvasRenderingContext2D | null =>
        ({
          drawImage: () => {
            throw new Error('tainted')
          },
        }) as unknown as CanvasRenderingContext2D,
      (): string => 'data:image/png;base64,cG5n',
    ],
    [
      'data URL failure',
      (): CanvasRenderingContext2D | null =>
        ({
          drawImage: () => undefined,
        }) as unknown as CanvasRenderingContext2D,
      (): string => {
        throw new Error('blocked')
      },
    ],
  ])('rejects %s', async (_, getContext, toDataURL) => {
    const canvas = { getContext, toDataURL } as unknown as HTMLCanvasElement
    const image = {
      naturalWidth: 1,
      naturalHeight: 1,
      width: 1,
      height: 1,
      ownerDocument: { createElement: () => canvas },
    } as unknown as HTMLImageElement
    await expect(encodeBase64(image, { dataUrl: true })).rejects.toThrow()
  })

  it('rejects malformed canvas output and unsupported values', async () => {
    const canvas = {
      getContext: vi.fn(),
      toDataURL: () => 'not a data URL',
    } as unknown as HTMLCanvasElement
    await expect(encodeBase64(canvas, { dataUrl: true })).rejects.toThrow(
      'Canvas did not produce',
    )
    await expect(
      encodeBase64({ value: true }, { dataUrl: true }),
    ).rejects.toThrow('Unsupported value')
  })

  it('validates serializer and option signatures without mutating options', () => {
    const options = { dataUrl: false, type: 'image/jpeg', quality: 1 }
    expect(validateOptions({ serializer: 1 as never })).toMatchObject({
      ok: false,
    })
    expect(createOptionsSignature(options)).toContain('"image/jpeg"')
    expect(options).toEqual({ dataUrl: false, type: 'image/jpeg', quality: 1 })
  })
})
