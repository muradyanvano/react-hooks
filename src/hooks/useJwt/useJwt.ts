import { useEffect, useMemo, useRef } from 'react'

import {
  decodeJwtWithFallback,
  invokeJwtOnError,
  type UseJwtDecodeError,
  type UseJwtHeader,
  type UseJwtOptions,
  type UseJwtPayload,
  type UseJwtReturn,
} from './jwtHelpers'

export type {
  UseJwtDecodeError,
  UseJwtErrorPart,
  UseJwtHeader,
  UseJwtOptions,
  UseJwtPayload,
  UseJwtReturn,
} from './jwtHelpers'

/**
 * Private notification ownership for effect-delivered decode errors.
 * Token is kept only for equality — never logged or exposed publicly.
 */
interface JwtErrorNotificationSnapshot {
  token: string | null | undefined
  errorSignature: string
}

/**
 * Effective token identity for notification deduplication.
 * Matches decoding's outer-trim policy for string inputs; null/undefined
 * remain distinct from each other and from empty strings.
 */
function getEffectiveJwtNotificationToken(
  encodedJwt: string | null | undefined,
): string | null | undefined {
  return typeof encodedJwt === 'string' ? encodedJwt.trim() : encodedJwt
}

/**
 * Decode a compact JWS-style JWT header and payload synchronously.
 *
 * Decoding does not verify the signature or prove that claims are
 * trustworthy. Never authorize users from client-side decoded claims alone.
 *
 * Leading and trailing whitespace around the entire token string is trimmed.
 * Whitespace inside segments is not removed and causes a decode error.
 *
 * `onError` runs in a client effect after a new error result — not during
 * render or SSR. Synchronous decode errors are always available via `errors`.
 * Notifications are deduplicated by effective token input and semantic error
 * shape together, so a newly supplied invalid token notifies even when its
 * error message matches a previous failure.
 */
export function useJwt<
  Payload extends object = UseJwtPayload,
  Header extends object = UseJwtHeader,
  Fallback = null,
>(
  encodedJwt: string | null | undefined,
  options?: UseJwtOptions<Fallback>,
): UseJwtReturn<Payload, Header, Fallback> {
  const fallbackValue = (
    options && Object.prototype.hasOwnProperty.call(options, 'fallbackValue')
      ? options.fallbackValue
      : null
  ) as Fallback

  const onErrorRef = useRef(options?.onError)

  useEffect(() => {
    onErrorRef.current = options?.onError
  })

  const decoded = useMemo(
    () =>
      decodeJwtWithFallback<Payload, Header, Fallback>(
        encodedJwt,
        fallbackValue,
      ),
    [encodedJwt, fallbackValue],
  )

  const effectiveToken = getEffectiveJwtNotificationToken(encodedJwt)
  const lastNotifiedRef = useRef<JwtErrorNotificationSnapshot | null>(null)

  useEffect(() => {
    const { errors, errorSignature } = decoded

    if (errors.length === 0) {
      lastNotifiedRef.current = null
      return
    }

    const previous = lastNotifiedRef.current
    if (
      previous != null &&
      Object.is(previous.token, effectiveToken) &&
      previous.errorSignature === errorSignature
    ) {
      return
    }

    lastNotifiedRef.current = {
      token: effectiveToken,
      errorSignature,
    }

    for (const entry of errors) {
      invokeJwtOnError(onErrorRef.current, entry.error, entry.part)
    }
  }, [decoded, effectiveToken])

  return useMemo(
    () => ({
      header: decoded.header,
      payload: decoded.payload,
      errors: decoded.errors as readonly UseJwtDecodeError[],
    }),
    [decoded.header, decoded.payload, decoded.errors],
  )
}
