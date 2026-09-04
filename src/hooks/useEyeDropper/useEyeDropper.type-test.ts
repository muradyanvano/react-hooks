import { describe, expectTypeOf, it } from 'vitest'

import {
  useEyeDropper,
  type UseEyeDropperOpenOptions,
  type UseEyeDropperOptions,
  type UseEyeDropperReturn,
} from './useEyeDropper'
import {
  useEyeDropper as rootUseEyeDropper,
  type UseEyeDropperOpenOptions as RootOpenOptions,
  type UseEyeDropperOptions as RootOptions,
  type UseEyeDropperReturn as RootReturn,
} from '../../index'

describe('useEyeDropper types', () => {
  it('types the default call and return shape', () => {
    const result = useEyeDropper()
    expectTypeOf(result).toEqualTypeOf<UseEyeDropperReturn>()
    expectTypeOf(result.sRGBHex).toEqualTypeOf<string>()
    expectTypeOf(result.isSupported).toEqualTypeOf<boolean>()
    expectTypeOf(result.isPicking).toEqualTypeOf<boolean>()
    expectTypeOf(result.error).toEqualTypeOf<Error | null>()
    expectTypeOf(result.open).returns.toEqualTypeOf<Promise<string | null>>()
    expectTypeOf(result.cancel).returns.toEqualTypeOf<void>()
    expectTypeOf(result.reset).returns.toEqualTypeOf<void>()
  })

  it('accepts complete options and open options', () => {
    useEyeDropper({
      initialValue: '#abcdef',
      enabled: true,
      window: null,
      treatAbortAsError: false,
      onError: () => undefined,
    } satisfies UseEyeDropperOptions)

    const openOptions = {
      signal: new AbortController().signal,
    } satisfies UseEyeDropperOpenOptions
    void openOptions
  })

  it('exposes matching root-imported types', () => {
    expectTypeOf(rootUseEyeDropper).toEqualTypeOf(useEyeDropper)
    expectTypeOf<RootOptions>().toEqualTypeOf<UseEyeDropperOptions>()
    expectTypeOf<RootReturn>().toEqualTypeOf<UseEyeDropperReturn>()
    expectTypeOf<RootOpenOptions>().toEqualTypeOf<UseEyeDropperOpenOptions>()
  })

  it('rejects invalid call shapes', () => {
    // @ts-expect-error enabled must be boolean
    useEyeDropper({ enabled: 'yes' })
    // @ts-expect-error window must be Window | null
    useEyeDropper({ window: 'nope' })
    // @ts-expect-error onError must accept Error
    useEyeDropper({ onError: (value: string) => value })
    // @ts-expect-error unknown option
    useEyeDropper({ unexpected: true })
  })

  it('has no default export', () => {
    // @ts-expect-error there is no default export
    void useEyeDropper.default
  })
})
