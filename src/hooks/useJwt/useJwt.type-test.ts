import { describe, expectTypeOf, it } from 'vitest'

import {
  useJwt,
  type UseJwtDecodeError,
  type UseJwtErrorPart,
  type UseJwtHeader,
  type UseJwtOptions,
  type UseJwtPayload,
  type UseJwtReturn,
} from './useJwt'
import {
  useJwt as rootUseJwt,
  type UseJwtDecodeError as RootUseJwtDecodeError,
  type UseJwtErrorPart as RootUseJwtErrorPart,
  type UseJwtHeader as RootUseJwtHeader,
  type UseJwtOptions as RootUseJwtOptions,
  type UseJwtPayload as RootUseJwtPayload,
  type UseJwtReturn as RootUseJwtReturn,
} from '../../index'

interface AppPayload extends UseJwtPayload {
  role: 'admin' | 'member'
  permissions: readonly string[]
}

interface AppHeader extends UseJwtHeader {
  kid: string
}

describe('useJwt types', () => {
  it('types default header and payload results', () => {
    const result = useJwt('token')
    expectTypeOf(result).toEqualTypeOf<
      UseJwtReturn<UseJwtPayload, UseJwtHeader, null>
    >()
    expectTypeOf(result.header).toEqualTypeOf<UseJwtHeader | null>()
    expectTypeOf(result.payload).toEqualTypeOf<UseJwtPayload | null>()
    expectTypeOf(result.errors).toEqualTypeOf<readonly UseJwtDecodeError[]>()
  })

  it('types custom payload, header, and fallback generics', () => {
    const token = 'token'
    const result = useJwt<AppPayload, AppHeader>(token)
    expectTypeOf(result.payload).toEqualTypeOf<AppPayload | null>()
    expectTypeOf(result.header).toEqualTypeOf<AppHeader | null>()

    const withFallback = useJwt<AppPayload, AppHeader, { guest: true }>(token, {
      fallbackValue: { guest: true },
    })
    expectTypeOf(withFallback.payload).toEqualTypeOf<
      AppPayload | { guest: true }
    >()
    expectTypeOf(withFallback.header).toEqualTypeOf<
      AppHeader | { guest: true }
    >()

    const nullFallback = useJwt(token, { fallbackValue: null })
    expectTypeOf(nullFallback.header).toEqualTypeOf<UseJwtHeader | null>()

    const undefinedFallback = useJwt(token, { fallbackValue: undefined })
    expectTypeOf(undefinedFallback.payload).toEqualTypeOf<
      UseJwtPayload | undefined
    >()

    const objectFallback = { empty: true as const }
    const objectResult = useJwt(token, { fallbackValue: objectFallback })
    expectTypeOf(objectResult.header).toEqualTypeOf<
      UseJwtHeader | { empty: true }
    >()
  })

  it('accepts nullable tokens and readonly errors', () => {
    useJwt(null)
    useJwt(undefined)
    useJwt('x' as string | null | undefined)

    const result = useJwt('x')
    expectTypeOf(result.errors).toEqualTypeOf<readonly UseJwtDecodeError[]>()
    expectTypeOf<UseJwtErrorPart>().toEqualTypeOf<
      'token' | 'header' | 'payload'
    >()
  })

  it('types claim index signatures and audience forms', () => {
    const payload = {} as UseJwtPayload
    expectTypeOf(payload.aud).toEqualTypeOf<
      string | readonly string[] | undefined
    >()
    expectTypeOf(payload.customClaim).toEqualTypeOf<unknown>()

    const header = {} as UseJwtHeader
    expectTypeOf(header.alg).toEqualTypeOf<string | undefined>()
    expectTypeOf(header.extra).toEqualTypeOf<unknown>()
  })

  it('re-exports match root entry types', () => {
    expectTypeOf(rootUseJwt).toEqualTypeOf<typeof useJwt>()
    expectTypeOf<RootUseJwtHeader>().toEqualTypeOf<UseJwtHeader>()
    expectTypeOf<RootUseJwtPayload>().toEqualTypeOf<UseJwtPayload>()
    expectTypeOf<RootUseJwtErrorPart>().toEqualTypeOf<UseJwtErrorPart>()
    expectTypeOf<RootUseJwtDecodeError>().toEqualTypeOf<UseJwtDecodeError>()
    expectTypeOf<RootUseJwtOptions>().toEqualTypeOf<UseJwtOptions>()
    expectTypeOf<
      RootUseJwtReturn<UseJwtPayload, UseJwtHeader, null>
    >().toEqualTypeOf<UseJwtReturn<UseJwtPayload, UseJwtHeader, null>>()
  })

  it('rejects invalid generics, callbacks, tokens, and options', () => {
    // @ts-expect-error payload generic must extend object
    useJwt<string>('token')

    // @ts-expect-error header generic must extend object
    useJwt<object, string>('token')

    // @ts-expect-error token must be string | null | undefined
    useJwt(123)

    // @ts-expect-error unknown option
    useJwt('token', { verify: true })

    // @ts-expect-error onError must accept Error and part
    useJwt('token', { onError: (value: string) => value })

    const options = {
      fallbackValue: null,
      onError: (_error: Error, part: UseJwtErrorPart) => {
        void _error
        void part
      },
    } satisfies UseJwtOptions
    useJwt('token', options)
  })

  it('has no default export on the local module shape', async () => {
    const mod = await import('./useJwt')
    expectTypeOf(mod).not.toHaveProperty('default')
  })
})
