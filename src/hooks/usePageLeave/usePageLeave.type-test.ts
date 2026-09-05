import { describe, expectTypeOf, it } from 'vitest'

import {
  usePageLeave,
  type UsePageLeaveOptions,
  type UsePageLeaveReturn,
} from './usePageLeave'
import {
  usePageLeave as rootUsePageLeave,
  type UsePageLeaveOptions as RootOptions,
  type UsePageLeaveReturn as RootReturn,
} from '../../index'

describe('usePageLeave types', () => {
  it('types empty options and boolean return', () => {
    const result = usePageLeave()
    expectTypeOf(result).toEqualTypeOf<UsePageLeaveReturn>()
    expectTypeOf(result).toEqualTypeOf<boolean>()
  })

  it('accepts enabled, initialValue, Window, and null window', () => {
    usePageLeave({
      enabled: true,
      initialValue: false,
      window: null,
    } satisfies UsePageLeaveOptions)

    usePageLeave({
      enabled: false,
      initialValue: true,
      window: window,
    })
  })

  it('exposes matching root-imported types', () => {
    expectTypeOf(rootUsePageLeave).toEqualTypeOf(usePageLeave)
    expectTypeOf<RootOptions>().toEqualTypeOf<UsePageLeaveOptions>()
    expectTypeOf<RootReturn>().toEqualTypeOf<UsePageLeaveReturn>()
  })

  it('rejects invalid call shapes', () => {
    // @ts-expect-error enabled must be boolean
    usePageLeave({ enabled: 'yes' })
    // @ts-expect-error initialValue must be boolean
    usePageLeave({ initialValue: 'left' })
    // @ts-expect-error window must be Window | null
    usePageLeave({ window: 'nope' })
    // @ts-expect-error unknown option
    usePageLeave({ unexpected: true })
  })

  it('has no default export', () => {
    // @ts-expect-error there is no default export
    void usePageLeave.default
  })
})
