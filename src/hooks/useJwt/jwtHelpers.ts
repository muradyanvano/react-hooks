/**
 * JWT decode helpers and public types for `useJwt`.
 *
 * Decoding is not verification. These helpers never validate signatures,
 * authenticity, expiration, issuer, audience, or authorization.
 * Private decoder functions are not part of the package public API.
 */

export type UseJwtErrorPart = 'token' | 'header' | 'payload'

export interface UseJwtHeader {
  alg?: string
  typ?: string
  cty?: string
  kid?: string
  [claim: string]: unknown
}

export interface UseJwtPayload {
  iss?: string
  sub?: string
  aud?: string | readonly string[]
  exp?: number
  nbf?: number
  iat?: number
  jti?: string
  [claim: string]: unknown
}

export interface UseJwtDecodeError {
  part: UseJwtErrorPart
  error: Error
}

export interface UseJwtOptions<Fallback = null> {
  fallbackValue?: Fallback
  onError?: (error: Error, part: UseJwtErrorPart) => void
}

export interface UseJwtReturn<
  Payload extends object,
  Header extends object,
  Fallback,
> {
  header: Header | Fallback
  payload: Payload | Fallback
  errors: readonly UseJwtDecodeError[]
}

export interface JwtDecodeResult<
  Payload extends object = UseJwtPayload,
  Header extends object = UseJwtHeader,
  Fallback = null,
> {
  header: Header | Fallback
  payload: Payload | Fallback
  errors: readonly UseJwtDecodeError[]
  signature: string | undefined
  /** Semantic signature for onError deduplication (not a JWT signature). */
  errorSignature: string
}

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function normalizeError(value: unknown, fallbackMessage: string): Error {
  if (value instanceof Error) {
    return value
  }
  if (typeof value === 'string' && value.length > 0) {
    return new Error(value)
  }
  return new Error(fallbackMessage)
}

export function createJwtError(message: string, cause?: unknown): Error {
  const error = new Error(message)
  if (cause !== undefined) {
    try {
      Object.defineProperty(error, 'cause', {
        value: cause,
        configurable: true,
        writable: true,
      })
    } catch {
      // Older runtimes may reject `cause`; message alone is enough.
    }
  }
  return error
}

function decodeBase64Char(char: string): number {
  const index = BASE64_ALPHABET.indexOf(char)
  if (index < 0) {
    throw createJwtError('Base64URL segment contains invalid characters')
  }
  return index
}

/**
 * Strict Base64URL → bytes. Environment-independent; does not require `atob`
 * or Node `Buffer`. Rejects invalid alphabet, padding, and length.
 */
export function decodeBase64UrlToBytes(input: string): Uint8Array {
  if (input.length === 0) {
    throw createJwtError('Base64URL segment is empty')
  }

  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i)
    const isAlpha =
      (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)
    const isDigit = code >= 0x30 && code <= 0x39
    const isUrlSafe = code === 0x2d || code === 0x5f // - _
    const isPad = code === 0x3d // =
    if (!isAlpha && !isDigit && !isUrlSafe && !isPad) {
      throw createJwtError('Base64URL segment contains invalid characters')
    }
  }

  const firstPad = input.indexOf('=')
  let dataLength = input.length
  let explicitPadCount = 0

  if (firstPad !== -1) {
    const padding = input.slice(firstPad)
    if (/[^=]/.test(padding)) {
      throw createJwtError(
        'Base64URL segment has padding in an invalid position',
      )
    }
    explicitPadCount = padding.length
    if (explicitPadCount > 2) {
      throw createJwtError('Base64URL segment has excessive padding')
    }
    dataLength = firstPad
    if (input.length % 4 !== 0) {
      throw createJwtError('Base64URL segment has invalid padding')
    }
  }

  if (dataLength % 4 === 1) {
    throw createJwtError('Base64URL segment has an impossible length')
  }

  const remainder = dataLength % 4
  const neededPad = remainder === 0 ? 0 : 4 - remainder
  if (explicitPadCount > 0 && explicitPadCount !== neededPad) {
    throw createJwtError('Base64URL segment has invalid padding')
  }

  const standard = input
    .slice(0, dataLength)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padded = standard + '='.repeat(neededPad)
  const outputLength = (padded.length / 4) * 3 - neededPad
  const bytes = new Uint8Array(outputLength)
  let byteIndex = 0

  for (let i = 0; i < padded.length; i += 4) {
    const c0 = decodeBase64Char(padded[i]!)
    const c1 = decodeBase64Char(padded[i + 1]!)
    const c2 = padded[i + 2] === '=' ? 0 : decodeBase64Char(padded[i + 2]!)
    const c3 = padded[i + 3] === '=' ? 0 : decodeBase64Char(padded[i + 3]!)

    if (padded[i + 2] === '=' && padded[i + 3] !== '=') {
      throw createJwtError('Base64URL segment has invalid padding')
    }

    const triplet = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3

    bytes[byteIndex++] = (triplet >> 16) & 0xff
    if (byteIndex < outputLength) {
      bytes[byteIndex++] = (triplet >> 8) & 0xff
    }
    if (byteIndex < outputLength) {
      bytes[byteIndex++] = triplet & 0xff
    }
  }

  return bytes
}

/**
 * Strict UTF-8 decoder. Rejects overlong encodings, surrogates, truncated
 * sequences, and code points above U+10FFFF. Does not replace with U+FFFD.
 */
export function decodeUtf8Strict(bytes: Uint8Array): string {
  const codePoints: number[] = []
  let i = 0

  while (i < bytes.length) {
    const b0 = bytes[i]!

    if (b0 <= 0x7f) {
      codePoints.push(b0)
      i += 1
      continue
    }

    let length: number
    let codePoint: number
    let minCodePoint: number

    if (b0 >= 0xc2 && b0 <= 0xdf) {
      length = 2
      codePoint = b0 & 0x1f
      minCodePoint = 0x80
    } else if (b0 >= 0xe0 && b0 <= 0xef) {
      length = 3
      codePoint = b0 & 0x0f
      minCodePoint = 0x800
    } else if (b0 >= 0xf0 && b0 <= 0xf4) {
      length = 4
      codePoint = b0 & 0x07
      minCodePoint = 0x10000
    } else {
      throw createJwtError('Invalid UTF-8 leading byte')
    }

    if (i + length > bytes.length) {
      throw createJwtError('Truncated UTF-8 sequence')
    }

    for (let j = 1; j < length; j += 1) {
      const cont = bytes[i + j]!
      if ((cont & 0xc0) !== 0x80) {
        throw createJwtError('Invalid UTF-8 continuation byte')
      }
      codePoint = (codePoint << 6) | (cont & 0x3f)
    }

    // Extra overlong / surrogate / range guards by leading byte.
    if (b0 === 0xe0 && bytes[i + 1]! < 0xa0) {
      throw createJwtError('Overlong UTF-8 encoding')
    }
    if (b0 === 0xed && bytes[i + 1]! >= 0xa0) {
      throw createJwtError('UTF-8 encoded surrogate code point')
    }
    if (b0 === 0xf0 && bytes[i + 1]! < 0x90) {
      throw createJwtError('Overlong UTF-8 encoding')
    }
    if (b0 === 0xf4 && bytes[i + 1]! > 0x8f) {
      throw createJwtError('UTF-8 code point out of Unicode range')
    }

    if (codePoint < minCodePoint) {
      throw createJwtError('Overlong UTF-8 encoding')
    }
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
      throw createJwtError('UTF-8 encoded surrogate code point')
    }
    if (codePoint > 0x10ffff) {
      throw createJwtError('UTF-8 code point out of Unicode range')
    }

    codePoints.push(codePoint)
    i += length
  }

  return String.fromCodePoint(...codePoints)
}

export function parseJsonObject(
  text: string,
  part: 'header' | 'payload',
): object {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch (cause) {
    throw createJwtError(`Invalid JSON in JWT ${part}`, cause)
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw createJwtError(`JWT ${part} must be a JSON object`)
  }

  return parsed
}

export function decodeJwtSegment(
  segment: string,
  part: 'header' | 'payload',
): object {
  const bytes = decodeBase64UrlToBytes(segment)
  const text = decodeUtf8Strict(bytes)
  return parseJsonObject(text, part)
}

export interface JwtSegments {
  header: string
  payload: string
  signature: string
}

/**
 * Split a compact JWS-style JWT into three segments.
 * Trims only leading/trailing whitespace around the entire token.
 */
export function extractJwtSegments(encodedJwt: string): JwtSegments {
  const trimmed = encodedJwt.trim()
  if (trimmed.length === 0) {
    throw createJwtError('JWT token is empty')
  }

  const parts = trimmed.split('.')
  if (parts.length !== 3) {
    throw createJwtError(
      `JWT token must have exactly three segments (received ${String(parts.length)})`,
    )
  }

  const header = parts[0]
  const payload = parts[1]
  const signature = parts[2]
  if (header === undefined || header.length === 0) {
    throw createJwtError('JWT header segment is empty')
  }
  if (payload === undefined || payload.length === 0) {
    throw createJwtError('JWT payload segment is empty')
  }

  return {
    header,
    payload,
    signature: signature ?? '',
  }
}

function encodeErrorPart(part: UseJwtErrorPart, error: Error): string {
  return `${part}:${error.message}`
}

export function createErrorSignature(
  errors: readonly UseJwtDecodeError[],
): string {
  if (errors.length === 0) {
    return ''
  }
  return errors
    .map((entry) => encodeErrorPart(entry.part, entry.error))
    .join('|')
}

function freezeErrors(
  errors: readonly UseJwtDecodeError[],
): readonly UseJwtDecodeError[] {
  return Object.freeze(
    errors.map((entry) =>
      Object.freeze({
        part: entry.part,
        error: entry.error,
      }),
    ),
  )
}

export function decodeJwtIndependentSections(
  encodedJwt: string | null | undefined,
): {
  header: object | undefined
  payload: object | undefined
  signature: string | undefined
  errors: readonly UseJwtDecodeError[]
} {
  if (encodedJwt == null) {
    const error = createJwtError('JWT token is missing')
    return {
      header: undefined,
      payload: undefined,
      signature: undefined,
      errors: freezeErrors([{ part: 'token', error }]),
    }
  }

  if (typeof encodedJwt !== 'string') {
    const error = createJwtError('JWT token must be a string')
    return {
      header: undefined,
      payload: undefined,
      signature: undefined,
      errors: freezeErrors([{ part: 'token', error }]),
    }
  }

  let segments: JwtSegments
  try {
    segments = extractJwtSegments(encodedJwt)
  } catch (cause) {
    const error = normalizeError(cause, 'Invalid JWT token structure')
    return {
      header: undefined,
      payload: undefined,
      signature: undefined,
      errors: freezeErrors([{ part: 'token', error }]),
    }
  }

  const errors: UseJwtDecodeError[] = []
  let header: object | undefined
  let payload: object | undefined

  try {
    header = decodeJwtSegment(segments.header, 'header')
  } catch (cause) {
    errors.push({
      part: 'header',
      error: normalizeError(cause, 'Invalid JWT header'),
    })
  }

  try {
    payload = decodeJwtSegment(segments.payload, 'payload')
  } catch (cause) {
    errors.push({
      part: 'payload',
      error: normalizeError(cause, 'Invalid JWT payload'),
    })
  }

  return {
    header,
    payload,
    signature: segments.signature,
    errors: freezeErrors(errors),
  }
}

export function decodeJwtWithFallback<
  Payload extends object = UseJwtPayload,
  Header extends object = UseJwtHeader,
  Fallback = null,
>(
  encodedJwt: string | null | undefined,
  fallbackValue: Fallback,
): JwtDecodeResult<Payload, Header, Fallback> {
  const decoded = decodeJwtIndependentSections(encodedJwt)
  const header =
    decoded.header === undefined ? fallbackValue : (decoded.header as Header)
  const payload =
    decoded.payload === undefined ? fallbackValue : (decoded.payload as Payload)

  return {
    header,
    payload,
    errors: decoded.errors,
    signature: decoded.signature,
    errorSignature: createErrorSignature(decoded.errors),
  }
}

export function invokeJwtOnError(
  onError: ((error: Error, part: UseJwtErrorPart) => void) | undefined,
  error: Error,
  part: UseJwtErrorPart,
): void {
  if (onError == null) {
    return
  }
  try {
    onError(error, part)
  } catch {
    // Contain onError exceptions so hook lifecycle continues.
  }
}
