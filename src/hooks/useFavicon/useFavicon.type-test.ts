import { describe, expectTypeOf, it } from 'vitest'

import {
  useFavicon,
  type UseFaviconOptions,
  type UseFaviconReturn,
} from './useFavicon'
import {
  useFavicon as rootUseFavicon,
  type UseFaviconOptions as RootUseFaviconOptions,
  type UseFaviconReturn as RootUseFaviconReturn,
} from '../../index'

describe('useFavicon types', () => {
  it('types the default call and return shape', () => {
    const result = useFavicon('/icon.svg')
    expectTypeOf(result).toEqualTypeOf<UseFaviconReturn>()
    expectTypeOf(result.href).toEqualTypeOf<string | null>()
    expectTypeOf(result.isSupported).toEqualTypeOf<boolean>()
    expectTypeOf(result.error).toEqualTypeOf<Error | null>()
  })

  it('accepts null, undefined, and complete options', () => {
    useFavicon(null)
    useFavicon(undefined)
    useFavicon('icon.svg', {
      enabled: true,
      document: null,
      baseUrl: 'https://example.com/',
      rel: 'apple-touch-icon',
      restoreOnUnmount: false,
      onError: () => undefined,
    } satisfies UseFaviconOptions)
  })

  it('exposes matching root-imported types', () => {
    expectTypeOf(rootUseFavicon).toEqualTypeOf(useFavicon)
    expectTypeOf<RootUseFaviconOptions>().toEqualTypeOf<UseFaviconOptions>()
    expectTypeOf<RootUseFaviconReturn>().toEqualTypeOf<UseFaviconReturn>()
  })

  it('rejects invalid call shapes', () => {
    // @ts-expect-error icon must be string | null | undefined
    useFavicon(123)
    // @ts-expect-error document must be Document | null
    useFavicon('x', { document: 'nope' })
    // @ts-expect-error enabled must be boolean
    useFavicon('x', { enabled: 'yes' })
    // @ts-expect-error onError must accept Error
    useFavicon('x', { onError: (value: string) => value })
    // @ts-expect-error unknown option rejected
    useFavicon('x', { cacheBust: true })
  })

  it('has no default export', () => {
    // @ts-expect-error there is no default export
    void useFavicon.default
  })
})
