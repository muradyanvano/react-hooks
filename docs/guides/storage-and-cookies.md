# Storage and cookies

Related: [SSR](./ssr.md) · [Public API](../public-api.md) · [Browser APIs](./browser-apis.md)

## `useLocalStorage` and `useSessionStorage`

- Persist React state in `localStorage` or `sessionStorage` with SSR-safe hydration.
- Support serializers, `mergeDefaults`, same-document sync, and optional native `StorageEvent` listening.
- Session storage is tab-scoped; ordinary separate tabs do not share `sessionStorage`.
- When storage is unavailable (quota, private mode, policy), hooks report unsupported behavior and keep an in-memory fallback where documented.

**Security:** never store credentials, tokens, or secrets in examples or production keys without understanding browser storage exposure.

## `useCookies`

- Reactive `document.cookie` management with attributes (`path`, `domain`, `sameSite`, …).
- Supports SSR injection via initial cookie state and optional Cookie Store observation where available.
- Cookie names must be valid cookie-name tokens (no `:`).

**Security:** cookies are visible to script when not `HttpOnly`. Do not place secrets in client-readable cookies from these hooks.

## `useUrlSearchParams`

- Immutable snapshots for `history`, `hash`, and `hash-params` modes.
- Writes go through explicit controls; disabled or `write: false` modes keep edits local as documented in the API reference.
- Prefer isolating demos from the host document History when embedding (for example iframes in Storybook).

## `useJwt`

- Decodes compact JWT **header** and **payload** only.
- Does **not** verify signatures, validate `exp`/`nbf` for authorization, or prove authenticity.
- Treat decoded claims as untrusted input until your application verifies them with a proper cryptographic library on a trusted boundary.
