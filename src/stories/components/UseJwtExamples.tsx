import { useMemo, useState } from 'react'
import {
  useJwt,
  type UseJwtErrorPart,
  type UseJwtHeader,
  type UseJwtPayload,
} from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  algorithmWarningSnippet,
  audienceIssuerSnippet,
  dynamicTokenSnippet,
  errorCallbackSnippet,
  expirationClaimSnippet,
  fallbackValueSnippet,
  headerAndPayloadSnippet,
  invalidBase64Snippet,
  invalidJsonSnippet,
  invalidStructureSnippet,
  jwtInspectorSnippet,
  notBeforeIssuedAtSnippet,
  playgroundSnippet,
  ssrSafeDecodingSnippet,
  tokenEditorSnippet,
  typedClaimsSnippet,
  unicodeClaimsSnippet,
} from './useJwt.snippets'
import {
  SYNTHETIC_ACCOUNT_TOKENS,
  SYNTHETIC_ALG_NONE_TOKEN,
  SYNTHETIC_AUDIENCE_TOKEN,
  SYNTHETIC_BAD_HEADER_GOOD_PAYLOAD,
  SYNTHETIC_EXPIRATION_TOKEN,
  SYNTHETIC_GOOD_HEADER_BAD_PAYLOAD,
  SYNTHETIC_INVALID_BASE64,
  SYNTHETIC_INVALID_JSON,
  SYNTHETIC_INVALID_STRUCTURE,
  SYNTHETIC_STANDARD_HEADER,
  SYNTHETIC_STANDARD_PAYLOAD,
  SYNTHETIC_STANDARD_TOKEN,
  SYNTHETIC_TYPED_TOKEN,
  SYNTHETIC_UNICODE_TOKEN,
  createSyntheticJwt,
  encodeSyntheticJwtJson,
} from './useJwt.synthetic'

function SecurityBanner() {
  return (
    <div
      className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      role="status"
      data-testid="security-banner"
    >
      <p className="font-semibold">Decoded only — signature not verified</p>
      <p className="mt-1 leading-5">
        Decoding a JWT does not verify its signature or prove that its claims
        are trustworthy. Never authorize users from client-side decoded claims
        alone.
      </p>
    </div>
  )
}

function JsonPanel({
  title,
  value,
  testId,
  tone,
}: {
  title: string
  value: unknown
  testId: string
  tone: 'header' | 'payload' | 'signature'
}) {
  const tones = {
    header: 'border-sky-200 bg-sky-50 text-sky-950',
    payload: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    signature: 'border-violet-200 bg-violet-50 text-violet-950',
  } as const

  return (
    <section
      className={`min-w-0 rounded-xl border p-3 ${tones[tone]}`}
      data-testid={testId}
    >
      <h3 className="text-xs font-semibold tracking-wide uppercase">{title}</h3>
      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-5">
        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
      </pre>
    </section>
  )
}

function ClaimsTable({ payload }: { payload: Record<string, unknown> | null }) {
  if (payload == null) {
    return (
      <p data-testid="claims-empty" className="text-sm text-slate-600">
        No payload claims decoded.
      </p>
    )
  }

  const entries = Object.entries(payload)
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table
        className="min-w-full text-left text-sm"
        data-testid="claims-table"
      >
        <caption className="sr-only">Decoded payload claims</caption>
        <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">
              Claim
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-t border-slate-100">
              <th scope="row" className="px-3 py-2 font-medium text-slate-800">
                {key}
              </th>
              <td className="px-3 py-2 font-mono text-xs break-all text-slate-700">
                {JSON.stringify(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatNumericDate(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'n/a'
  }
  return new Date(value * 1000).toISOString()
}

export function JwtInspectorExample() {
  const [token, setToken] = useState(SYNTHETIC_STANDARD_TOKEN)
  const { header, payload, errors } = useJwt(token)
  const segments = token.trim().split('.')
  const signaturePreview = segments[2] ?? ''

  return (
    <ExampleShowcase
      hookName="useJwt"
      badge="Primary"
      title="JWT inspector"
      description="Inspect a synthetic compact JWT. Decoding does not verify signatures or trust claims."
      instruction="Edit the synthetic token, review header/payload panels, then reset the sample."
      code={jwtInspectorSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Decode status',
              value:
                errors.length === 0 ? 'Structurally decodable' : 'Decode error',
              testId: 'inspector-status',
            },
            {
              label: 'Claim count',
              value: String(
                payload && typeof payload === 'object'
                  ? Object.keys(payload).length
                  : 0,
              ),
              testId: 'inspector-claim-count',
            },
            {
              label: 'Token chars',
              value: String(token.length),
              testId: 'inspector-token-chars',
            },
          ]}
        />
      }
    >
      <SecurityBanner />
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-800">
          Synthetic JWT
        </span>
        <textarea
          className="min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-800 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label="Synthetic JWT"
          data-testid="inspector-token-input"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          spellCheck={false}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="inspector-reset"
          onClick={() => setToken(SYNTHETIC_STANDARD_TOKEN)}
        >
          Reset sample
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
          <p className="font-semibold uppercase">Header segment</p>
          <p
            className="mt-1 break-all font-mono"
            data-testid="inspector-header-segment"
          >
            {segments[0] ?? ''}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
          <p className="font-semibold uppercase">Payload segment</p>
          <p
            className="mt-1 break-all font-mono"
            data-testid="inspector-payload-segment"
          >
            {segments[1] ?? ''}
          </p>
        </div>
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-950">
          <p className="font-semibold uppercase">Signature segment</p>
          <p
            className="mt-1 break-all font-mono"
            data-testid="inspector-signature-segment"
          >
            {signaturePreview || '(empty)'}
          </p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <JsonPanel
          title="Header JSON"
          value={header}
          testId="inspector-header-json"
          tone="header"
        />
        <JsonPanel
          title="Payload JSON"
          value={payload}
          testId="inspector-payload-json"
          tone="payload"
        />
      </div>
      <ClaimsTable
        payload={
          payload && typeof payload === 'object'
            ? (payload as Record<string, unknown>)
            : null
        }
      />
      {(typeof payload?.iat === 'number' ||
        typeof payload?.exp === 'number') && (
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
          data-testid="inspector-timeline"
        >
          <p>Issued display: {formatNumericDate(payload?.iat)}</p>
          <p>Expiration display: {formatNumericDate(payload?.exp)}</p>
          <p className="mt-1 text-xs">
            Display converts NumericDate seconds to milliseconds. This is not
            validation.
          </p>
        </div>
      )}
      {errors.length > 0 ? (
        <ul
          className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
          role="alert"
          data-testid="inspector-errors"
        >
          {errors.map((entry) => (
            <li key={`${entry.part}:${entry.error.message}`}>
              {entry.part}: {entry.error.message}
            </li>
          ))}
        </ul>
      ) : null}
    </ExampleShowcase>
  )
}

export function HeaderAndPayloadExample() {
  const token = createSyntheticJwt(
    { alg: 'HS256', typ: 'JWT' },
    { sub: '1234567890', iat: 1516239022 },
  )
  const { header, payload } = useJwt(token)

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Header and payload"
      description="A compact example of the common HS256-shaped header and a minimal payload."
      instruction="Review the decoded JSON panels. Signature is not verified."
      code={headerAndPayloadSnippet}
    >
      <SecurityBanner />
      <JsonPanel
        title='Header {"alg":"HS256","typ":"JWT"}'
        value={header}
        testId="hp-header"
        tone="header"
      />
      <JsonPanel
        title='Payload {"sub":"1234567890","iat":1516239022}'
        value={payload}
        testId="hp-payload"
        tone="payload"
      />
    </ExampleShowcase>
  )
}

interface AccessTokenPayload extends UseJwtPayload {
  role: 'admin' | 'member'
  permissions: readonly string[]
}

interface AccessTokenHeader extends UseJwtHeader {
  kid: string
}

export function TypedClaimsExample() {
  const { header, payload, errors } = useJwt<
    AccessTokenPayload,
    AccessTokenHeader
  >(SYNTHETIC_TYPED_TOKEN)

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Typed claims"
      description="Generics document expected claim shapes. They do not validate runtime data."
      instruction="Inspect the typed role and permissions claims from the synthetic token."
      code={typedClaimsSnippet}
    >
      <SecurityBanner />
      <StatusPanel
        items={[
          {
            label: 'kid',
            value: header?.kid ?? 'n/a',
            testId: 'typed-kid',
          },
          {
            label: 'role',
            value: payload?.role ?? 'n/a',
            testId: 'typed-role',
          },
          {
            label: 'permissions',
            value: payload?.permissions?.join(', ') ?? 'n/a',
            testId: 'typed-permissions',
          },
          {
            label: 'errors',
            value: String(errors.length),
            testId: 'typed-errors',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

export function UnicodeClaimsExample() {
  const { payload, errors } = useJwt<{
    name?: string
    note?: string
  }>(SYNTHETIC_UNICODE_TOKEN)

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Unicode claims"
      description="Strict UTF-8 decoding preserves Armenian text, accented Latin, CJK, and emoji."
      instruction="Confirm the decoded Unicode claim values."
      code={unicodeClaimsSnippet}
    >
      <SecurityBanner />
      <p
        data-testid="unicode-name"
        className="text-lg font-semibold text-slate-900"
      >
        {payload?.name ?? 'n/a'}
      </p>
      <p data-testid="unicode-note" className="text-sm text-slate-700">
        {payload?.note ?? 'n/a'}
      </p>
      <p className="text-xs text-slate-500">errors: {errors.length}</p>
    </ExampleShowcase>
  )
}

export function TokenEditorExample() {
  const [header, setHeader] = useState(
    encodeSyntheticJwtJson(SYNTHETIC_STANDARD_HEADER),
  )
  const [payload, setPayload] = useState(
    encodeSyntheticJwtJson(SYNTHETIC_STANDARD_PAYLOAD),
  )
  const [signature, setSignature] = useState('synthetic-signature-not-verified')
  const token = `${header}.${payload}.${signature}`
  const decoded = useJwt(token)

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Token editor"
      description="Edit the three compact segments independently and decode live."
      instruction="Change any segment and watch header/payload update."
      code={tokenEditorSnippet}
    >
      <SecurityBanner />
      <div className="grid gap-3">
        <label className="space-y-1">
          <span className="text-xs font-semibold tracking-wide text-sky-700 uppercase">
            Header
          </span>
          <input
            className="w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Header segment"
            data-testid="editor-header"
            value={header}
            onChange={(event) => setHeader(event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
            Payload
          </span>
          <input
            className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Payload segment"
            data-testid="editor-payload"
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold tracking-wide text-violet-700 uppercase">
            Signature
          </span>
          <input
            className="w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label="Signature segment"
            data-testid="editor-signature"
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
          />
        </label>
      </div>
      <pre
        className="overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs"
        data-testid="editor-result"
      >
        {JSON.stringify(
          {
            header: decoded.header,
            payload: decoded.payload,
            errors: decoded.errors.map((e) => e.part),
          },
          null,
          2,
        )}
      </pre>
    </ExampleShowcase>
  )
}

export function FallbackValueExample() {
  const [token, setToken] = useState(SYNTHETIC_BAD_HEADER_GOOD_PAYLOAD)
  const fallback = useMemo(() => ({ status: 'unavailable' as const }), [])
  const { header, payload, errors } = useJwt(token, {
    fallbackValue: fallback,
  })

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Fallback value"
      description="Header and payload decode independently. Failed sections use the same fallback object identity."
      instruction="Switch samples to see independent section fallback."
      code={fallbackValueSnippet}
    >
      <SecurityBanner />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="fallback-bad-header"
          onClick={() => setToken(SYNTHETIC_BAD_HEADER_GOOD_PAYLOAD)}
        >
          Bad header / good payload
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="fallback-bad-payload"
          onClick={() => setToken(SYNTHETIC_GOOD_HEADER_BAD_PAYLOAD)}
        >
          Good header / bad payload
        </button>
      </div>
      <StatusPanel
        items={[
          {
            label: 'header',
            value: JSON.stringify(header),
            testId: 'fallback-header',
          },
          {
            label: 'payload',
            value: JSON.stringify(payload),
            testId: 'fallback-payload',
          },
          {
            label: 'error parts',
            value: errors.map((entry) => entry.part).join(', ') || 'none',
            testId: 'fallback-errors',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

export function InvalidStructureExample() {
  const [token, setToken] = useState('one.two')
  const { errors } = useJwt(token)

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Invalid structure"
      description="Only three-segment compact JWS-style tokens are supported. Encrypted five-part tokens are unsupported."
      instruction="Choose an invalid structure sample and review the accessible error list."
      code={invalidStructureSnippet}
    >
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['Too few', 'one.two'],
            ['Too many', SYNTHETIC_INVALID_STRUCTURE],
            ['Five parts', 'a.b.c.d.e'],
          ] as const
        ).map(([label, value]) => (
          <button
            key={label}
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            data-testid={`structure-${label.toLowerCase().replace(/\s+/gu, '-')}`}
            onClick={() => setToken(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <ul
        role="list"
        aria-label="Decode errors"
        className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
        data-testid="structure-errors"
      >
        {errors.map((entry) => (
          <li key={`${entry.part}:${entry.error.message}`}>
            {entry.part}: {entry.error.message}
          </li>
        ))}
      </ul>
    </ExampleShowcase>
  )
}

export function InvalidBase64Example() {
  const { errors } = useJwt(SYNTHETIC_INVALID_BASE64)

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Invalid Base64URL"
      description="Strict Base64URL decoding rejects invalid characters and padding."
      instruction="Review the decode error produced by the synthetic invalid segment."
      code={invalidBase64Snippet}
    >
      <p
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
        data-testid="base64-error"
      >
        {errors[0]?.error.message ?? 'No error'}
      </p>
    </ExampleShowcase>
  )
}

export function InvalidJsonExample() {
  const { errors } = useJwt(SYNTHETIC_INVALID_JSON)

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Invalid JSON"
      description="Valid Base64URL can still contain malformed JSON after UTF-8 decoding."
      instruction="Inspect the structured decode errors."
      code={invalidJsonSnippet}
    >
      <ul
        className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
        data-testid="json-errors"
      >
        {errors.map((entry) => (
          <li key={`${entry.part}:${entry.error.message}`}>
            {entry.part}: {entry.error.message}
          </li>
        ))}
      </ul>
    </ExampleShowcase>
  )
}

export function ExpirationClaimExample() {
  const { payload } = useJwt(SYNTHETIC_EXPIRATION_TOKEN)
  const exp = typeof payload?.exp === 'number' ? payload.exp : null
  const nowSeconds = 1700005000

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Expiration claim"
      description="exp is a NumericDate in seconds. Display conversion is not validation."
      instruction="Review the displayed expiration date. The hook does not reject expired tokens."
      code={expirationClaimSnippet}
    >
      <SecurityBanner />
      <StatusPanel
        items={[
          {
            label: 'exp seconds',
            value: String(exp ?? 'n/a'),
            testId: 'exp-seconds',
          },
          {
            label: 'exp display',
            value: formatNumericDate(exp),
            testId: 'exp-display',
          },
          {
            label: 'demo clock vs exp',
            value:
              exp == null
                ? 'n/a'
                : exp < nowSeconds
                  ? 'Past demo clock (display only)'
                  : 'Future demo clock (display only)',
            testId: 'exp-relative',
          },
        ]}
      />
      <p className="text-sm text-slate-600">
        This display is not expiration validation. Client clocks can be wrong.
      </p>
    </ExampleShowcase>
  )
}

export function NotBeforeIssuedAtExample() {
  const { payload } = useJwt(SYNTHETIC_EXPIRATION_TOKEN)

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Not-before and issued-at"
      description="iat, nbf, and exp are NumericDate seconds. Multiply by 1000 only for display."
      instruction="Inspect the timeline display of iat, nbf, and exp."
      code={notBeforeIssuedAtSnippet}
    >
      <SecurityBanner />
      <ol
        className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
        data-testid="timeline-list"
      >
        <li data-testid="timeline-iat">
          iat display: {formatNumericDate(payload?.iat)}
        </li>
        <li data-testid="timeline-nbf">
          nbf display: {formatNumericDate(payload?.nbf)}
        </li>
        <li data-testid="timeline-exp">
          exp display: {formatNumericDate(payload?.exp)}
        </li>
      </ol>
      <p className="text-xs text-slate-500">
        NumericDate seconds converted to milliseconds for display only — not
        trust decisions.
      </p>
    </ExampleShowcase>
  )
}

export function AudienceIssuerExample() {
  const { payload } = useJwt(SYNTHETIC_AUDIENCE_TOKEN)
  const audience = Array.isArray(payload?.aud)
    ? payload.aud.join(', ')
    : String(payload?.aud ?? 'n/a')

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Audience and issuer"
      description="iss and aud are decoded claims only. They are not authorization proofs."
      instruction="Review issuer and audience claim display."
      code={audienceIssuerSnippet}
    >
      <SecurityBanner />
      <StatusPanel
        items={[
          {
            label: 'iss',
            value: String(payload?.iss ?? 'n/a'),
            testId: 'aud-iss',
          },
          {
            label: 'aud',
            value: audience,
            testId: 'aud-aud',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

export function AlgorithmWarningExample() {
  const [token, setToken] = useState(SYNTHETIC_ALG_NONE_TOKEN)
  const { header } = useJwt(token)

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Algorithm warning"
      description="alg: none is not proof of validity. Do not trust alg without an allowlist on a trusted verifier."
      instruction="Switch between alg none and HS256 samples."
      code={algorithmWarningSnippet}
    >
      <SecurityBanner />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="alg-none"
          onClick={() => setToken(SYNTHETIC_ALG_NONE_TOKEN)}
        >
          alg none
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="alg-hs256"
          onClick={() => setToken(SYNTHETIC_STANDARD_TOKEN)}
        >
          alg HS256
        </button>
      </div>
      <p data-testid="alg-value" className="text-sm font-medium text-slate-900">
        alg claim: {String(header?.alg ?? 'n/a')}
      </p>
      <p className="text-sm text-slate-600">
        The header controls no trusted verification behavior here.
      </p>
    </ExampleShowcase>
  )
}

export function DynamicTokenExample() {
  const [account, setAccount] =
    useState<keyof typeof SYNTHETIC_ACCOUNT_TOKENS>('alice')
  const { payload } = useJwt(SYNTHETIC_ACCOUNT_TOKENS[account])

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Dynamic token"
      description="Switch among synthetic account tokens and observe stable decoding updates."
      instruction="Select Alice, Bob, or Cara."
      code={dynamicTokenSnippet}
    >
      <SecurityBanner />
      <div className="flex flex-wrap gap-2">
        {(
          Object.keys(SYNTHETIC_ACCOUNT_TOKENS) as Array<
            keyof typeof SYNTHETIC_ACCOUNT_TOKENS
          >
        ).map((key) => (
          <button
            key={key}
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            data-testid={`account-${key}`}
            onClick={() => setAccount(key)}
          >
            {key}
          </button>
        ))}
      </div>
      <StatusPanel
        items={[
          {
            label: 'name',
            value: String(
              payload && typeof payload === 'object' && 'name' in payload
                ? payload.name
                : 'n/a',
            ),
            testId: 'dynamic-name',
          },
          {
            label: 'sub',
            value: String(payload?.sub ?? 'n/a'),
            testId: 'dynamic-sub',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

export function ErrorCallbackExample() {
  const [token, setToken] = useState('bad-token-a')
  const [tick, setTick] = useState(0)
  const [events, setEvents] = useState<string[]>([])
  const { errors } = useJwt(token, {
    onError: (error, part: UseJwtErrorPart) => {
      setEvents((current) => [...current, `${part}: ${error.message}`])
    },
  })

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Error callback"
      description="onError runs in a client effect for each newly supplied invalid token. Unrelated rerenders and callback identity changes do not replay the same decoding errors. Strict Mode replay is deduplicated. Synchronous errors remain available through errors, including during SSR."
      instruction="Switch between different invalid tokens, then a valid sample, and confirm the timeline grows only for new failure episodes."
      code={errorCallbackSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="callback-invalid"
          onClick={() => setToken('bad-token-b')}
        >
          Different invalid token
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="callback-valid"
          onClick={() => setToken(SYNTHETIC_STANDARD_TOKEN)}
        >
          Valid sample
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="callback-invalid-again"
          onClick={() => setToken('bad-token-c')}
        >
          Invalid again
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="callback-rerender"
          onClick={() => setTick((value) => value + 1)}
        >
          Unrelated rerender
        </button>
      </div>
      <p data-testid="callback-errors-length" className="text-sm">
        errors.length: {errors.length} (tick {tick})
      </p>
      <ol
        className="list-decimal space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 pl-6 text-sm"
        data-testid="callback-timeline"
      >
        {events.map((event, index) => (
          <li key={`${index}:${event}`}>{event}</li>
        ))}
      </ol>
    </ExampleShowcase>
  )
}

export function SsrSafeDecodingExample() {
  const { header, payload, errors } = useJwt(SYNTHETIC_STANDARD_TOKEN)

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="SSR-safe decoding"
      description="Pure decoding works during server render. No browser APIs, listeners, timers, or storage are required."
      instruction="Review values that are available during SSR. onError does not run on the server."
      code={ssrSafeDecodingSnippet}
    >
      <SecurityBanner />
      <StatusPanel
        items={[
          {
            label: 'alg',
            value: String(header?.alg ?? 'n/a'),
            testId: 'ssr-alg',
          },
          {
            label: 'sub',
            value: String(payload?.sub ?? 'n/a'),
            testId: 'ssr-sub',
          },
          {
            label: 'errors',
            value: String(errors.length),
            testId: 'ssr-errors',
          },
        ]}
      />
      <p className="text-sm text-slate-600">
        Synchronous decode errors are available through <code>errors</code>{' '}
        during SSR. <code>onError</code> is client-effect-only.
      </p>
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  playgroundToken = SYNTHETIC_STANDARD_TOKEN,
  useCustomFallback = false,
}: {
  playgroundToken?: string
  useCustomFallback?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const [token, setToken] = useState(playgroundToken)
  const [fallbackEnabled, setFallbackEnabled] = useState(useCustomFallback)
  const decoded = useJwt(token, {
    fallbackValue: fallbackEnabled ? { empty: true } : null,
  })

  if (!mounted) {
    return (
      <ExampleShowcase
        hookName="useJwt"
        title="Playground"
        description="Docs-safe playground. Mount explicitly before decoding interactive samples."
        instruction="Click Mount playground, then edit the synthetic token."
        code={playgroundSnippet}
      >
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="playground-mount"
          onClick={() => setMounted(true)}
        >
          Mount playground
        </button>
      </ExampleShowcase>
    )
  }

  return (
    <ExampleShowcase
      hookName="useJwt"
      title="Playground"
      description="Select samples, edit the token, and toggle a custom fallback."
      instruction="Try valid and invalid samples without pasting real credentials."
      code={playgroundSnippet}
    >
      <SecurityBanner />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="playground-valid"
          onClick={() => setToken(SYNTHETIC_STANDARD_TOKEN)}
        >
          Valid sample
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="playground-invalid"
          onClick={() => setToken('invalid')}
        >
          Invalid sample
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-testid="playground-unicode"
          onClick={() => setToken(SYNTHETIC_UNICODE_TOKEN)}
        >
          Unicode sample
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={fallbackEnabled}
          data-testid="playground-fallback"
          onChange={(event) => setFallbackEnabled(event.target.checked)}
        />
        Custom fallback
      </label>
      <textarea
        className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-label="Playground token"
        data-testid="playground-token"
        value={token}
        onChange={(event) => setToken(event.target.value)}
      />
      <pre
        className="overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs"
        data-testid="playground-result"
      >
        {JSON.stringify(
          {
            header: decoded.header,
            payload: decoded.payload,
            errorParts: decoded.errors.map((entry) => entry.part),
          },
          null,
          2,
        )}
      </pre>
    </ExampleShowcase>
  )
}
