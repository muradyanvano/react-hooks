import { describe, expect, it } from 'vitest'

import {
  createErrorSignature,
  createJwtError,
  decodeBase64UrlToBytes,
  decodeJwtIndependentSections,
  decodeJwtSegment,
  decodeJwtWithFallback,
  decodeUtf8Strict,
  extractJwtSegments,
  invokeJwtOnError,
  parseJsonObject,
} from './jwtHelpers'

function encodeBase64UrlFromBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '')
}

function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function encodeJsonSegment(value: unknown): string {
  return encodeBase64UrlFromBytes(encodeUtf8(JSON.stringify(value)))
}

function makeToken(
  header: unknown,
  payload: unknown,
  signature = 'sig',
): string {
  return `${encodeJsonSegment(header)}.${encodeJsonSegment(payload)}.${signature}`
}

describe('decodeBase64UrlToBytes', () => {
  it('decodes standard alphabet including - and _', () => {
    // "suj" in base64url with - _
    const bytes = decodeBase64UrlToBytes('c3Vq')
    expect(Array.from(bytes)).toEqual([0x73, 0x75, 0x6a])
  })

  it('accepts missing padding', () => {
    expect(Array.from(decodeBase64UrlToBytes('YQ'))).toEqual([0x61])
    expect(Array.from(decodeBase64UrlToBytes('YWI'))).toEqual([0x61, 0x62])
  })

  it('accepts valid explicit padding', () => {
    expect(Array.from(decodeBase64UrlToBytes('YQ=='))).toEqual([0x61])
    expect(Array.from(decodeBase64UrlToBytes('YWI='))).toEqual([0x61, 0x62])
  })

  it('rejects invalid characters', () => {
    expect(() => decodeBase64UrlToBytes('YQ*A')).toThrow(/invalid characters/i)
    expect(() => decodeBase64UrlToBytes('YQ A')).toThrow(/invalid characters/i)
  })

  it('rejects padding in invalid positions', () => {
    expect(() => decodeBase64UrlToBytes('Y=Q=')).toThrow(/padding/i)
    expect(() => decodeBase64UrlToBytes('=YQ=')).toThrow(/padding/i)
  })

  it('rejects excessive padding', () => {
    expect(() => decodeBase64UrlToBytes('YQ===')).toThrow(/padding/i)
  })

  it('rejects impossible length', () => {
    expect(() => decodeBase64UrlToBytes('Y')).toThrow(/impossible length/i)
    expect(() => decodeBase64UrlToBytes('YWJhY')).toThrow(/impossible length/i)
  })

  it('rejects truncated / empty input', () => {
    expect(() => decodeBase64UrlToBytes('')).toThrow(/empty/i)
  })

  it('produces identical results without atob or Buffer', () => {
    const encoded = encodeBase64UrlFromBytes(encodeUtf8('hello-world'))
    const expected = Array.from(encodeUtf8('hello-world'))
    const globalRecord = globalThis as typeof globalThis & {
      atob?: typeof atob
      Buffer?: unknown
    }
    const originalAtob = globalRecord.atob
    const originalBuffer = globalRecord.Buffer

    delete globalRecord.atob
    delete globalRecord.Buffer

    try {
      expect(typeof globalRecord.atob).toBe('undefined')
      expect(typeof globalRecord.Buffer).toBe('undefined')
      expect(Array.from(decodeBase64UrlToBytes(encoded))).toEqual(expected)
    } finally {
      if (originalAtob !== undefined) {
        globalRecord.atob = originalAtob
      }
      if (originalBuffer !== undefined) {
        globalRecord.Buffer = originalBuffer
      }
    }
  })

  it('round-trips URL-safe characters', () => {
    // Bytes that encode to +/ in standard base64 → -_ in base64url
    const bytes = new Uint8Array([0xfb, 0xff, 0xbf])
    const encoded = encodeBase64UrlFromBytes(bytes)
    expect(encoded.includes('-') || encoded.includes('_')).toBe(true)
    expect(Array.from(decodeBase64UrlToBytes(encoded))).toEqual(
      Array.from(bytes),
    )
  })
})

describe('decodeUtf8Strict', () => {
  it('decodes ASCII', () => {
    expect(decodeUtf8Strict(encodeUtf8('hello'))).toBe('hello')
  })

  it('decodes Armenian text', () => {
    expect(decodeUtf8Strict(encodeUtf8('Վանո'))).toBe('Վանո')
  })

  it('decodes accented Latin, Cyrillic, CJK, and emoji', () => {
    expect(decodeUtf8Strict(encodeUtf8('café'))).toBe('café')
    expect(decodeUtf8Strict(encodeUtf8('Привет'))).toBe('Привет')
    expect(decodeUtf8Strict(encodeUtf8('日本語'))).toBe('日本語')
    expect(decodeUtf8Strict(encodeUtf8('🙂🚀'))).toBe('🙂🚀')
  })

  it('decodes multi-code-point surrogate pairs', () => {
    expect(decodeUtf8Strict(encodeUtf8('𠮷'))).toBe('𠮷')
  })

  it('rejects invalid continuation bytes', () => {
    expect(() => decodeUtf8Strict(new Uint8Array([0xc2, 0x00]))).toThrow(
      /continuation/i,
    )
  })

  it('rejects truncated sequences', () => {
    expect(() => decodeUtf8Strict(new Uint8Array([0xe2, 0x82]))).toThrow(
      /truncated/i,
    )
  })

  it('rejects overlong encodings', () => {
    expect(() => decodeUtf8Strict(new Uint8Array([0xc0, 0xaf]))).toThrow(
      /leading|overlong/i,
    )
    expect(() => decodeUtf8Strict(new Uint8Array([0xe0, 0x80, 0xaf]))).toThrow(
      /overlong/i,
    )
  })

  it('rejects UTF-8 encoded surrogates', () => {
    expect(() => decodeUtf8Strict(new Uint8Array([0xed, 0xa0, 0x80]))).toThrow(
      /surrogate/i,
    )
  })

  it('rejects out-of-range code points', () => {
    expect(() =>
      decodeUtf8Strict(new Uint8Array([0xf4, 0x90, 0x80, 0x80])),
    ).toThrow(/out of Unicode range|leading/i)
  })
})

describe('parseJsonObject', () => {
  it('parses objects and rejects non-objects', () => {
    expect(parseJsonObject('{"a":1}', 'header')).toEqual({ a: 1 })
    expect(() => parseJsonObject('null', 'header')).toThrow(/object/i)
    expect(() => parseJsonObject('[1]', 'payload')).toThrow(/object/i)
    expect(() => parseJsonObject('"x"', 'header')).toThrow(/object/i)
    expect(() => parseJsonObject('1', 'payload')).toThrow(/object/i)
    expect(() => parseJsonObject('{', 'header')).toThrow(/Invalid JSON/i)
  })
})

describe('extractJwtSegments', () => {
  it('extracts three segments and trims outer whitespace', () => {
    const token = makeToken({ alg: 'none' }, { sub: '1' }, '')
    expect(extractJwtSegments(`  ${token}  `)).toEqual({
      header: encodeJsonSegment({ alg: 'none' }),
      payload: encodeJsonSegment({ sub: '1' }),
      signature: '',
    })
  })

  it('rejects empty, wrong segment counts, and empty header/payload', () => {
    expect(() => extractJwtSegments('')).toThrow(/empty/i)
    expect(() => extractJwtSegments('   ')).toThrow(/empty/i)
    expect(() => extractJwtSegments('a')).toThrow(/three segments/i)
    expect(() => extractJwtSegments('a.b')).toThrow(/three segments/i)
    expect(() => extractJwtSegments('a.b.c.d')).toThrow(/three segments/i)
    expect(() => extractJwtSegments('a.b.c.d.e')).toThrow(/three segments/i)
    expect(() => extractJwtSegments('.payload.sig')).toThrow(/header segment/i)
    expect(() => extractJwtSegments('header..sig')).toThrow(/payload segment/i)
  })

  it('does not strip internal whitespace', () => {
    expect(() => extractJwtSegments('abc.d ef.ghi')).not.toThrow()
    const segments = extractJwtSegments('abc.d ef.ghi')
    expect(segments.payload).toBe('d ef')
  })
})

describe('decodeJwtSegment / independent sections', () => {
  it('decodes valid segments', () => {
    const header = { alg: 'HS256', typ: 'JWT' }
    const payload = { sub: '123', nested: { ok: true }, flags: [1, 2] }
    expect(decodeJwtSegment(encodeJsonSegment(header), 'header')).toEqual(
      header,
    )
    expect(decodeJwtSegment(encodeJsonSegment(payload), 'payload')).toEqual(
      payload,
    )
  })

  it('keeps header and payload failures independent', () => {
    const validHeader = encodeJsonSegment({ alg: 'none' })
    const validPayload = encodeJsonSegment({ sub: 'ok' })
    const invalidJson = encodeBase64UrlFromBytes(encodeUtf8('{'))
    const invalidObject = encodeBase64UrlFromBytes(encodeUtf8('null'))

    const headerFail = decodeJwtIndependentSections(
      `${invalidJson}.${validPayload}.sig`,
    )
    expect(headerFail.header).toBeUndefined()
    expect(headerFail.payload).toEqual({ sub: 'ok' })
    expect(headerFail.errors.map((e) => e.part)).toEqual(['header'])

    const payloadFail = decodeJwtIndependentSections(
      `${validHeader}.${invalidObject}.sig`,
    )
    expect(payloadFail.header).toEqual({ alg: 'none' })
    expect(payloadFail.payload).toBeUndefined()
    expect(payloadFail.errors.map((e) => e.part)).toEqual(['payload'])

    const bothFail = decodeJwtIndependentSections(
      `${invalidJson}.${invalidObject}.sig`,
    )
    expect(bothFail.header).toBeUndefined()
    expect(bothFail.payload).toBeUndefined()
    expect(bothFail.errors.map((e) => e.part)).toEqual(['header', 'payload'])
  })

  it('returns token-level errors for missing structure', () => {
    expect(decodeJwtIndependentSections(null).errors[0]?.part).toBe('token')
    expect(decodeJwtIndependentSections(undefined).errors[0]?.part).toBe(
      'token',
    )
    expect(decodeJwtIndependentSections('').errors[0]?.part).toBe('token')
    expect(decodeJwtIndependentSections('a.b').errors[0]?.part).toBe('token')
  })

  it('does not put the full token in error messages', () => {
    const secretLooking = 'aaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbb.cccccccccccccccc'
    const result = decodeJwtIndependentSections(secretLooking)
    for (const entry of result.errors) {
      expect(entry.error.message).not.toContain(secretLooking)
    }
  })
})

describe('decodeJwtWithFallback', () => {
  it('uses fallback for failures and preserves identity', () => {
    const fallback = { role: 'guest' }
    const result = decodeJwtWithFallback('bad', fallback)
    expect(result.header).toBe(fallback)
    expect(result.payload).toBe(fallback)
    expect(result.errors).toHaveLength(1)

    const token = makeToken({ alg: 'HS256' }, { sub: '1' })
    const ok = decodeJwtWithFallback(token, fallback)
    expect(ok.header).toEqual({ alg: 'HS256' })
    expect(ok.payload).toEqual({ sub: '1' })
    expect(ok.header).not.toBe(fallback)
  })

  it('builds a semantic error signature', () => {
    const a = decodeJwtWithFallback(null, null)
    const b = decodeJwtWithFallback(undefined, null)
    expect(a.errorSignature).toContain('token:')
    expect(createErrorSignature(a.errors)).toBe(a.errorSignature)
    expect(b.errorSignature).toContain('token:')
  })
})

describe('createJwtError / invokeJwtOnError', () => {
  it('normalizes messages and contains throwing callbacks', () => {
    const error = createJwtError('boom', new Error('cause'))
    expect(error.message).toBe('boom')

    expect(() =>
      invokeJwtOnError(
        () => {
          throw new Error('callback failed')
        },
        error,
        'token',
      ),
    ).not.toThrow()

    const parts: string[] = []
    invokeJwtOnError(
      (_error, part) => {
        parts.push(part)
      },
      error,
      'header',
    )
    expect(parts).toEqual(['header'])
    invokeJwtOnError(undefined, error, 'payload')
  })
})
