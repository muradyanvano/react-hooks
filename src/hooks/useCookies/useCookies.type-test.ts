import { describe, expectTypeOf, it } from 'vitest'

import {
  useCookies,
  type UseCookiesChange,
  type UseCookiesChangeListener,
  type UseCookiesGetOptions,
  type UseCookiesOptions,
  type UseCookiesReturn,
  type UseCookiesSameSite,
  type UseCookiesSetOptions,
} from './useCookies'
import {
  useCookies as rootUseCookies,
  type UseCookiesChange as RootUseCookiesChange,
  type UseCookiesOptions as RootUseCookiesOptions,
  type UseCookiesReturn as RootUseCookiesReturn,
} from '../../index'

describe('useCookies types', () => {
  it('accepts dependency forms and returns the public surface', () => {
    expectTypeOf(useCookies()).toEqualTypeOf<UseCookiesReturn>()
    expectTypeOf(useCookies(null)).toEqualTypeOf<UseCookiesReturn>()
    expectTypeOf(
      useCookies(['locale'] as const),
    ).toEqualTypeOf<UseCookiesReturn>()
    expectTypeOf(rootUseCookies).toEqualTypeOf<typeof useCookies>()
    expectTypeOf<RootUseCookiesReturn>().toEqualTypeOf<UseCookiesReturn>()
    expectTypeOf<RootUseCookiesChange>().toEqualTypeOf<UseCookiesChange>()
    expectTypeOf<RootUseCookiesOptions>().toEqualTypeOf<UseCookiesOptions>()
  })

  it('types get/getAll/set/remove/listeners', () => {
    const cookies = useCookies(['locale'])
    expectTypeOf(cookies.get<string>('locale')).toEqualTypeOf<
      string | undefined
    >()
    expectTypeOf(cookies.getAll<{ locale?: string }>()).toEqualTypeOf<{
      locale?: string
    }>()
    expectTypeOf(
      cookies.set('locale', 'en-US', { path: '/' }),
    ).toEqualTypeOf<boolean>()
    expectTypeOf(
      cookies.remove('locale', { path: '/' }),
    ).toEqualTypeOf<boolean>()
    expectTypeOf(cookies.refresh()).toEqualTypeOf<void>()

    const listener: UseCookiesChangeListener = (change) => {
      expectTypeOf(change.cause).toEqualTypeOf<'set' | 'remove' | 'external'>()
    }
    expectTypeOf(cookies.addChangeListener(listener)).toEqualTypeOf<
      () => void
    >()
    cookies.removeChangeListener(listener)
  })

  it('types options and SameSite values', () => {
    const getOptions = { doNotParse: true } satisfies UseCookiesGetOptions
    const setOptions = {
      path: '/',
      domain: 'example.com',
      expires: new Date(),
      maxAge: 10,
      secure: true,
      sameSite: 'lax' as UseCookiesSameSite,
      partitioned: true,
    } satisfies UseCookiesSetOptions
    const options = {
      doNotParse: false,
      autoUpdateDependencies: true,
      document: null,
      initialCookies: 'a=1',
      watch: true,
      pollingInterval: 500,
      onError: (_error: Error) => {
        void _error
      },
    } satisfies UseCookiesOptions

    useCookies(['x'], options)
    useCookies(['x']).get('x', getOptions)
    useCookies(['x']).set('x', 1, setOptions)

    expectTypeOf<UseCookiesSameSite>().toEqualTypeOf<
      true | 'strict' | 'lax' | 'none'
    >()
  })

  it('rejects invalid call shapes', () => {
    // @ts-expect-error dependencies must be string names
    useCookies([1])

    // @ts-expect-error invalid SameSite
    useCookies().set('x', 'y', { sameSite: 'invalid' })

    // @ts-expect-error expires must be Date
    useCookies().set('x', 'y', { expires: 'tomorrow' })

    // @ts-expect-error maxAge must be number
    useCookies().set('x', 'y', { maxAge: '10' })

    // @ts-expect-error document must be Document or null
    useCookies(undefined, { document: window })

    // @ts-expect-error httpOnly is not supported
    useCookies(undefined, { httpOnly: true })

    // @ts-expect-error unknown option
    useCookies(undefined, { encrypt: true })

    // @ts-expect-error onError must accept Error
    useCookies(undefined, { onError: (value: string) => value })
  })
})
