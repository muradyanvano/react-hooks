import { describe, expectTypeOf, it } from 'vitest'

import {
  useDebounceFn,
  type UseDebounceFnFunction,
  type UseDebounceFnOptions,
  type UseDebounceFnReturn,
} from './useDebounceFn'

describe('useDebounceFn types', () => {
  it('preserves callback parameters and awaited return types', () => {
    const result = useDebounceFn(async (id: number, label: string) => ({
      id,
      label,
    }))
    expectTypeOf(result).toEqualTypeOf<
      UseDebounceFnReturn<
        (id: number, label: string) => Promise<{ id: number; label: string }>
      >
    >()
    expectTypeOf(result.run).toEqualTypeOf<
      (
        id: number,
        label: string,
      ) => Promise<{ id: number; label: string } | undefined>
    >()
    expectTypeOf(result.flush).toEqualTypeOf<
      () => Promise<{ id: number; label: string } | undefined>
    >()
  })

  it('accepts all options and default delay', () => {
    const options: UseDebounceFnOptions = { maxWait: 100, rejectOnCancel: true }
    const result = useDebounceFn(
      (value: string) => value.length,
      undefined,
      options,
    )
    expectTypeOf(result.isPending).toEqualTypeOf<boolean>()
    expectTypeOf(result.cancel).toEqualTypeOf<() => void>()
  })

  it('supports the base function type', () => {
    expectTypeOf<UseDebounceFnFunction>().toEqualTypeOf<
      (...args: never[]) => unknown
    >()
  })

  it('rejects invalid arguments and options', () => {
    // @ts-expect-error — callback must be a function
    void useDebounceFn('not a callback')
    // @ts-expect-error — delay must be a number
    void useDebounceFn(() => undefined, '100')
    // @ts-expect-error — maxWait must be a number
    void useDebounceFn(() => undefined, 100, { maxWait: '100' })
    // @ts-expect-error — rejectOnCancel must be boolean
    void useDebounceFn(() => undefined, 100, { rejectOnCancel: 'yes' })
    // @ts-expect-error — run argument is inferred from callback
    void useDebounceFn((id: number) => id).run('id')
  })
})
