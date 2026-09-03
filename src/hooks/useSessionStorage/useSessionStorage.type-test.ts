import { describe, expectTypeOf, it } from 'vitest'

import {
  useSessionStorage,
  type UseSessionStorageMergeDefaults,
  type UseSessionStorageOptions,
  type UseSessionStorageReturn,
  type UseSessionStorageSerializer,
} from './useSessionStorage'
import {
  useSessionStorage as rootUseSessionStorage,
  type UseSessionStorageMergeDefaults as RootUseSessionStorageMergeDefaults,
  type UseSessionStorageOptions as RootUseSessionStorageOptions,
  type UseSessionStorageReturn as RootUseSessionStorageReturn,
  type UseSessionStorageSerializer as RootUseSessionStorageSerializer,
} from '../../index'

describe('useSessionStorage types', () => {
  it('infers primitive and collection generics', () => {
    expectTypeOf(useSessionStorage('k', 'x')).toMatchTypeOf<
      UseSessionStorageReturn<string>
    >()
    expectTypeOf(useSessionStorage('k', false)).toMatchTypeOf<
      UseSessionStorageReturn<boolean>
    >()
    expectTypeOf(useSessionStorage('k', 0)).toMatchTypeOf<
      UseSessionStorageReturn<number>
    >()
    expectTypeOf(useSessionStorage('k', { a: 1 })).toMatchTypeOf<
      UseSessionStorageReturn<{ a: number }>
    >()
    expectTypeOf(useSessionStorage('k', [1])).toMatchTypeOf<
      UseSessionStorageReturn<number[]>
    >()
    expectTypeOf(useSessionStorage('k', null)).toMatchTypeOf<
      UseSessionStorageReturn<null>
    >()
    expectTypeOf(useSessionStorage('k', new Date())).toMatchTypeOf<
      UseSessionStorageReturn<Date>
    >()
    expectTypeOf(
      useSessionStorage('k', new Map<string, number>()),
    ).toMatchTypeOf<UseSessionStorageReturn<Map<string, number>>>()
    expectTypeOf(useSessionStorage('k', new Set<string>())).toMatchTypeOf<
      UseSessionStorageReturn<Set<string>>
    >()
  })

  it('supports explicit generics and setter forms', () => {
    const api = useSessionStorage<'a' | 'b'>('k', 'a')
    expectTypeOf(api.value).toEqualTypeOf<'a' | 'b'>()
    api.setValue('b')
    api.setValue((current) => (current === 'a' ? 'b' : 'a'))
  })

  it('infers custom serializer and merge options', () => {
    const serializer: UseSessionStorageSerializer<number> = {
      read: (raw) => Number(raw),
      write: (value) => String(value),
    }
    const merge: UseSessionStorageMergeDefaults<{ a: number; b?: number }> =
      true
    const options: UseSessionStorageOptions<{ a: number; b?: number }> = {
      serializer: {
        read: (raw) => JSON.parse(raw) as { a: number; b?: number },
        write: (value) => JSON.stringify(value),
      },
      mergeDefaults: merge,
      writeDefaults: false,
      listenToStorageChanges: false,
      window: null,
      onError: () => undefined,
    }
    void serializer
    void useSessionStorage('k', { a: 1 }, options)
    void useSessionStorage(
      'k',
      { a: 1 },
      {
        mergeDefaults: (stored, fallback) => ({ ...fallback, ...stored }),
        window,
      },
    )
  })

  it('exposes the return shape', () => {
    const api = useSessionStorage('k', 0)
    expectTypeOf(api).toMatchTypeOf<{
      value: number
      setValue: (value: number | ((current: number) => number)) => void
      remove: () => void
      reset: () => void
      isSupported: boolean
      isReady: boolean
      error: Error | null
    }>()
  })

  it('re-exports matching root types', () => {
    expectTypeOf(rootUseSessionStorage).toEqualTypeOf(useSessionStorage)
    expectTypeOf<RootUseSessionStorageReturn<string>>().toEqualTypeOf<
      UseSessionStorageReturn<string>
    >()
    expectTypeOf<RootUseSessionStorageOptions<number>>().toEqualTypeOf<
      UseSessionStorageOptions<number>
    >()
    expectTypeOf<RootUseSessionStorageSerializer<boolean>>().toEqualTypeOf<
      UseSessionStorageSerializer<boolean>
    >()
    expectTypeOf<RootUseSessionStorageMergeDefaults<object>>().toEqualTypeOf<
      UseSessionStorageMergeDefaults<object>
    >()
  })

  it('rejects invalid arguments', () => {
    // @ts-expect-error key must be a string
    useSessionStorage(1, 'x')

    // @ts-expect-error serializer must provide read/write
    useSessionStorage('k', 0, { serializer: { read: () => 0 } })

    const api = useSessionStorage('k', 0)
    // @ts-expect-error setter value must match T
    api.setValue('nope')

    // @ts-expect-error merge callback must return T
    useSessionStorage('k', 0, { mergeDefaults: () => 'x' })

    // @ts-expect-error onError must accept Error
    useSessionStorage('k', 0, { onError: (value: string) => value })

    // @ts-expect-error window must be Window or null
    useSessionStorage('k', 0, { window: 'window' })

    // @ts-expect-error unknown options are invalid
    useSessionStorage('k', 0, { ttl: 1 })
  })

  it('has no default export on the root entry', async () => {
    const root = await import('../../index')
    expectTypeOf(root).not.toHaveProperty('default')
  })
})
