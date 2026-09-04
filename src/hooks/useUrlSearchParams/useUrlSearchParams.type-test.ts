import { describe, expectTypeOf, it } from 'vitest'

import {
  useUrlSearchParams,
  type UseUrlSearchParamsMode,
  type UseUrlSearchParamsOptions,
  type UseUrlSearchParamsReturn,
  type UseUrlSearchParamsWriteMode,
} from './useUrlSearchParams'
import {
  useUrlSearchParams as rootHook,
  type UseUrlSearchParamsOptions as RootOptions,
} from '../../index'

describe('useUrlSearchParams types', () => {
  it('accepts modes, options, and returns controls', () => {
    const value = useUrlSearchParams('history', {
      enabled: true,
      write: true,
      writeMode: 'replace',
      removeNullishValues: true,
      removeFalsyValues: false,
      initialValue: { q: 'a', tags: ['x', 'y'], n: 1, b: true, z: null },
      window: null,
      stringify: (params) => params.toString(),
      onError: () => undefined,
    } satisfies UseUrlSearchParamsOptions)

    expectTypeOf(value).toEqualTypeOf<UseUrlSearchParamsReturn>()
    expectTypeOf(value.params.q).toEqualTypeOf<
      string | readonly string[] | undefined
    >()
    expectTypeOf(value.get('q')).toEqualTypeOf<string | null>()
    expectTypeOf(value.getAll('q')).toEqualTypeOf<readonly string[]>()
    expectTypeOf<UseUrlSearchParamsMode>().toEqualTypeOf<
      'history' | 'hash' | 'hash-params'
    >()
    expectTypeOf<UseUrlSearchParamsWriteMode>().toEqualTypeOf<
      'replace' | 'push'
    >()
  })

  it('re-exports from the package root', () => {
    expectTypeOf(rootHook).toEqualTypeOf(useUrlSearchParams)
    expectTypeOf<RootOptions>().toEqualTypeOf<UseUrlSearchParamsOptions>()
  })

  it('rejects invalid option shapes', () => {
    // @ts-expect-error invalid mode
    useUrlSearchParams('memory')

    // @ts-expect-error invalid writeMode
    useUrlSearchParams('history', { writeMode: 'merge' })

    // @ts-expect-error invalid stringify
    useUrlSearchParams('history', { stringify: 'nope' })

    // @ts-expect-error invalid callback
    useUrlSearchParams('history', { onError: 'nope' })

    // @ts-expect-error unknown option
    useUrlSearchParams('history', { unknown: true })
  })
})
