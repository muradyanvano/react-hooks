export const jwtInspectorSnippet = `import { useState } from 'react'
import { useJwt } from '@muradyanvano/react-hooks'

// Synthetic demonstration token only — not a real credential.
const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRlbW8gVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.synthetic-signature-not-verified'

export function JwtInspector() {
  const [token, setToken] = useState(SAMPLE)
  const { header, payload, errors } = useJwt(token)

  return (
    <section>
      <textarea
        value={token}
        onChange={(event) => setToken(event.target.value)}
        aria-label="Synthetic JWT"
      />
      <strong>Decoded only — signature not verified</strong>
      <pre>{JSON.stringify(header, null, 2)}</pre>
      <pre>{JSON.stringify(payload, null, 2)}</pre>
      {errors.length > 0 ? (
        <p role="alert">Decode error: {errors[0]?.error.message}</p>
      ) : null}
    </section>
  )
}
`

export const headerAndPayloadSnippet = `import { useJwt } from '@muradyanvano/react-hooks'

const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.synthetic-signature-not-verified'

export function HeaderAndPayload() {
  const { header, payload } = useJwt(TOKEN)

  return (
    <section>
      <pre>{JSON.stringify(header, null, 2)}</pre>
      <pre>{JSON.stringify(payload, null, 2)}</pre>
      <p>Decoded only — signature not verified</p>
    </section>
  )
}
`

export const typedClaimsSnippet = `import {
  useJwt,
  type UseJwtHeader,
  type UseJwtPayload,
} from '@muradyanvano/react-hooks'

interface AccessTokenPayload extends UseJwtPayload {
  role: 'admin' | 'member'
  permissions: readonly string[]
}

interface AccessTokenHeader extends UseJwtHeader {
  kid: string
}

export function TypedClaims({ token }: { token: string }) {
  const { header, payload, errors } = useJwt<
    AccessTokenPayload,
    AccessTokenHeader
  >(token)

  if (errors.length > 0) {
    return <p role="alert">The token could not be decoded.</p>
  }

  return (
    <section>
      <p>Key id: {header?.kid ?? 'Unknown'}</p>
      <p>Role: {payload?.role ?? 'Unknown'}</p>
      <p>Permissions: {payload?.permissions?.join(', ') ?? 'None'}</p>
      <strong>Decoded only — signature not verified</strong>
    </section>
  )
}
`

export const unicodeClaimsSnippet = `import { useJwt } from '@muradyanvano/react-hooks'

export function UnicodeClaims({ token }: { token: string }) {
  const { payload, errors } = useJwt<{
    name?: string
    note?: string
  }>(token)

  if (errors.length > 0) {
    return <p role="alert">Decode error</p>
  }

  return (
    <section>
      <p>{payload?.name}</p>
      <p>{payload?.note}</p>
      <strong>Decoded only — signature not verified</strong>
    </section>
  )
}
`

export const tokenEditorSnippet = `import { useState } from 'react'
import { useJwt } from '@muradyanvano/react-hooks'

export function TokenEditor() {
  const [header, setHeader] = useState('eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0')
  const [payload, setPayload] = useState('eyJzdWIiOiJlZGl0b3IifQ')
  const [signature, setSignature] = useState('synthetic-signature-not-verified')
  const token = \`\${header}.\${payload}.\${signature}\`
  const decoded = useJwt(token)

  return (
    <section>
      <input aria-label="Header segment" value={header} onChange={(e) => setHeader(e.target.value)} />
      <input aria-label="Payload segment" value={payload} onChange={(e) => setPayload(e.target.value)} />
      <input aria-label="Signature segment" value={signature} onChange={(e) => setSignature(e.target.value)} />
      <pre>{JSON.stringify(decoded.payload, null, 2)}</pre>
      <p>Decoded only — signature not verified</p>
    </section>
  )
}
`

export const fallbackValueSnippet = `import { useJwt } from '@muradyanvano/react-hooks'

const FALLBACK = { status: 'unavailable' as const }

export function FallbackDemo({ token }: { token: string }) {
  const { header, payload, errors } = useJwt(token, {
    fallbackValue: FALLBACK,
  })

  return (
    <section>
      <pre>{JSON.stringify(header, null, 2)}</pre>
      <pre>{JSON.stringify(payload, null, 2)}</pre>
      <ul>
        {errors.map((entry) => (
          <li key={entry.part}>{entry.part}: {entry.error.message}</li>
        ))}
      </ul>
    </section>
  )
}
`

export const invalidStructureSnippet = `import { useJwt } from '@muradyanvano/react-hooks'

export function InvalidStructure({ token }: { token: string }) {
  const { errors } = useJwt(token)

  return (
    <ul role="list" aria-label="Decode errors">
      {errors.map((entry) => (
        <li key={entry.part}>{entry.part}: {entry.error.message}</li>
      ))}
    </ul>
  )
}
`

export const invalidBase64Snippet = `import { useJwt } from '@muradyanvano/react-hooks'

export function InvalidBase64({ token }: { token: string }) {
  const { errors } = useJwt(token)
  return <p role="alert">{errors[0]?.error.message ?? 'No error'}</p>
}
`

export const invalidJsonSnippet = `import { useJwt } from '@muradyanvano/react-hooks'

export function InvalidJson({ token }: { token: string }) {
  const { errors } = useJwt(token)
  return (
    <ul>
      {errors.map((entry) => (
        <li key={entry.part}>{entry.part}: {entry.error.message}</li>
      ))}
    </ul>
  )
}
`

export const expirationClaimSnippet = `import { useJwt } from '@muradyanvano/react-hooks'

export function ExpirationClaim({ token }: { token: string }) {
  const { payload } = useJwt(token)
  const exp = typeof payload?.exp === 'number' ? payload.exp : null
  const asDate = exp == null ? null : new Date(exp * 1000)

  return (
    <section>
      <p>exp (NumericDate seconds): {exp ?? 'n/a'}</p>
      <p>Display only: {asDate?.toISOString() ?? 'n/a'}</p>
      <p>This display is not expiration validation.</p>
      <strong>Decoded only — signature not verified</strong>
    </section>
  )
}
`

export const notBeforeIssuedAtSnippet = `import { useJwt } from '@muradyanvano/react-hooks'

export function TimelineClaims({ token }: { token: string }) {
  const { payload } = useJwt(token)
  const toMs = (value: unknown) =>
    typeof value === 'number' ? value * 1000 : null

  return (
    <section>
      <p>iat: {String(toMs(payload?.iat))}</p>
      <p>nbf: {String(toMs(payload?.nbf))}</p>
      <p>exp: {String(toMs(payload?.exp))}</p>
      <p>NumericDate seconds converted to ms for display only.</p>
    </section>
  )
}
`

export const audienceIssuerSnippet = `import { useJwt } from '@muradyanvano/react-hooks'

export function AudienceIssuer({ token }: { token: string }) {
  const { payload } = useJwt(token)
  const audience = Array.isArray(payload?.aud)
    ? payload.aud.join(', ')
    : String(payload?.aud ?? 'n/a')

  return (
    <section>
      <p>Issuer claim: {String(payload?.iss ?? 'n/a')}</p>
      <p>Audience claim: {audience}</p>
      <p>Claims are decoded only — not trusted authorization input.</p>
    </section>
  )
}
`

export const algorithmWarningSnippet = `import { useJwt } from '@muradyanvano/react-hooks'

export function AlgorithmWarning({ token }: { token: string }) {
  const { header } = useJwt(token)

  return (
    <section>
      <p>alg claim: {String(header?.alg ?? 'n/a')}</p>
      <p>
        The header alg claim does not control trusted verification here.
        Do not trust alg without an allowlist on a trusted verifier.
      </p>
      <strong>Decoded only — signature not verified</strong>
    </section>
  )
}
`

export const dynamicTokenSnippet = `import { useState } from 'react'
import { useJwt } from '@muradyanvano/react-hooks'

const SAMPLES = {
  alice: 'synthetic-alice-token',
  bob: 'synthetic-bob-token',
} as const

export function DynamicToken() {
  const [account, setAccount] = useState<keyof typeof SAMPLES>('alice')
  const { payload } = useJwt(SAMPLES[account])

  return (
    <section>
      <button type="button" onClick={() => setAccount('alice')}>Alice</button>
      <button type="button" onClick={() => setAccount('bob')}>Bob</button>
      <p>{String(payload?.name ?? 'n/a')}</p>
      <strong>Decoded only — signature not verified</strong>
    </section>
  )
}
`

export const errorCallbackSnippet = `import { useState } from 'react'
import { useJwt, type UseJwtErrorPart } from '@muradyanvano/react-hooks'

export function ErrorCallbackDemo({ token }: { token: string }) {
  const [events, setEvents] = useState<string[]>([])
  const { errors } = useJwt(token, {
    onError: (error, part: UseJwtErrorPart) => {
      // Fires for each newly supplied invalid token.
      // Unrelated rerenders and callback identity changes do not replay.
      setEvents((current) => [...current, \`\${part}: \${error.message}\`])
    },
  })

  return (
    <section>
      <p>errors.length: {errors.length}</p>
      <ol>
        {events.map((event) => (
          <li key={event}>{event}</li>
        ))}
      </ol>
    </section>
  )
}
`

export const ssrSafeDecodingSnippet = `import { useJwt } from '@muradyanvano/react-hooks'

export function SsrSafeDecoding({ token }: { token: string }) {
  // Pure decoding works during server render — no browser APIs required.
  const { header, payload, errors } = useJwt(token)

  return (
    <section>
      <p>Algorithm claim: {String(header?.alg ?? 'n/a')}</p>
      <p>Subject: {String(payload?.sub ?? 'n/a')}</p>
      <p>Decode errors: {errors.length}</p>
      <strong>Decoded only — signature not verified</strong>
    </section>
  )
}
`

export const playgroundSnippet = `import { useState } from 'react'
import { useJwt } from '@muradyanvano/react-hooks'

export function JwtPlayground() {
  const [token, setToken] = useState('synthetic-token')
  const [useFallback, setUseFallback] = useState(false)
  const decoded = useJwt(token, {
    fallbackValue: useFallback ? { empty: true } : null,
  })

  return (
    <section>
      <textarea
        aria-label="Playground token"
        value={token}
        onChange={(event) => setToken(event.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={useFallback}
          onChange={(event) => setUseFallback(event.target.checked)}
        />
        Custom fallback
      </label>
      <pre>{JSON.stringify(decoded, null, 2)}</pre>
      <strong>Decoded only — signature not verified</strong>
    </section>
  )
}
`
