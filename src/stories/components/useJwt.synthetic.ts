/**
 * Storybook-only synthetic JWT helpers.
 * Not cryptographic signing. Not shipped in dist.
 * Tokens are clearly fake demonstration strings.
 */

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '')
}

export function encodeSyntheticJwtJson(value: unknown): string {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)))
}

export function createSyntheticJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  signature = 'synthetic-signature-not-verified',
): string {
  return `${encodeSyntheticJwtJson(header)}.${encodeSyntheticJwtJson(payload)}.${signature}`
}

export const SYNTHETIC_STANDARD_HEADER = {
  alg: 'HS256',
  typ: 'JWT',
} as const

export const SYNTHETIC_STANDARD_PAYLOAD = {
  sub: '1234567890',
  name: 'Demo User',
  iat: 1516239022,
} as const

export const SYNTHETIC_STANDARD_TOKEN = createSyntheticJwt(
  { ...SYNTHETIC_STANDARD_HEADER },
  { ...SYNTHETIC_STANDARD_PAYLOAD },
)

export const SYNTHETIC_UNICODE_TOKEN = createSyntheticJwt(
  { alg: 'none', typ: 'JWT' },
  {
    sub: 'unicode-demo',
    name: 'Վանո Մուրադյան',
    note: 'café 日本語 🙂',
  },
)

export const SYNTHETIC_TYPED_TOKEN = createSyntheticJwt(
  { alg: 'HS256', typ: 'JWT', kid: 'demo-key' },
  {
    sub: 'typed-user',
    role: 'admin',
    permissions: ['read', 'write'],
  },
)

export const SYNTHETIC_EXPIRATION_TOKEN = createSyntheticJwt(
  { alg: 'HS256', typ: 'JWT' },
  {
    sub: 'exp-demo',
    iat: 1700000000,
    nbf: 1700000600,
    exp: 1700004200,
  },
)

export const SYNTHETIC_AUDIENCE_TOKEN = createSyntheticJwt(
  { alg: 'HS256', typ: 'JWT' },
  {
    iss: 'https://issuer.example.synthetic',
    aud: ['api://demo', 'api://admin'],
    sub: 'aud-demo',
  },
)

export const SYNTHETIC_ALG_NONE_TOKEN = createSyntheticJwt(
  { alg: 'none', typ: 'JWT' },
  { sub: 'alg-none-demo', note: 'unsigned synthetic token' },
  '',
)

export const SYNTHETIC_ACCOUNT_TOKENS = {
  alice: createSyntheticJwt(
    { alg: 'HS256', typ: 'JWT' },
    { sub: 'alice', name: 'Alice Demo', role: 'member' },
  ),
  bob: createSyntheticJwt(
    { alg: 'HS256', typ: 'JWT' },
    { sub: 'bob', name: 'Bob Demo', role: 'admin' },
  ),
  cara: createSyntheticJwt(
    { alg: 'HS256', typ: 'JWT' },
    { sub: 'cara', name: 'Cara Demo', role: 'viewer' },
  ),
} as const

export const SYNTHETIC_INVALID_STRUCTURE = 'only.two.segments.extra'
export const SYNTHETIC_INVALID_BASE64 =
  '@@@.eyJzdWIiOiIxIn0.synthetic-signature-not-verified'
export const SYNTHETIC_INVALID_JSON = `${encodeBase64Url(new TextEncoder().encode('{'))}.${encodeSyntheticJwtJson({ sub: '1' })}.synthetic-signature-not-verified`

export const SYNTHETIC_BAD_HEADER_GOOD_PAYLOAD = `${encodeBase64Url(new TextEncoder().encode('null'))}.${encodeSyntheticJwtJson({ sub: 'payload-ok' })}.synthetic-signature-not-verified`
export const SYNTHETIC_GOOD_HEADER_BAD_PAYLOAD = `${encodeSyntheticJwtJson({ alg: 'none' })}.${encodeBase64Url(new TextEncoder().encode('[1]'))}.synthetic-signature-not-verified`
