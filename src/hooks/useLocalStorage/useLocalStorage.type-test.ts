import { describe, expectTypeOf, it } from 'vitest'

import {
  useLocalStorage,
  type UseLocalStorageMergeDefaults,
  type UseLocalStorageOptions,
  type UseLocalStorageReturn,
  type UseLocalStorageSerializer,
} from './useLocalStorage'
import {
  useLocalStorage as rootUseLocalStorage,
  type UseLocalStorageMergeDefaults as RootUseLocalStorageMergeDefaults,
  type UseLocalStorageOptions as RootUseLocalStorageOptions,
  type UseLocalStorageReturn as RootUseLocalStorageReturn,
  type UseLocalStorageSerializer as RootUseLocalStorageSerializer,
} from '../../index'

describe('useLocalStorage types', () => {
  it('infers primitive and collection generics', () => {
    expectTypeOf(useLocalStorage('k', 'x')).toMatchTypeOf<
      UseLocalStorageReturn<string>
    >()
    expectTypeOf(useLocalStorage('k', false)).toMatchTypeOf<
      UseLocalStorageReturn<boolean>
    >()
    expectTypeOf(useLocalStorage('k', 0)).toMatchTypeOf<
      UseLocalStorageReturn<number>
    >()
    expectTypeOf(useLocalStorage('k', { a: 1 })).toMatchTypeOf<
      UseLocalStorageReturn<{ a: number }>
    >()
    expectTypeOf(useLocalStorage('k', [1])).toMatchTypeOf<
      UseLocalStorageReturn<number[]>
    >()
    expectTypeOf(useLocalStorage('k', null)).toMatchTypeOf<
      UseLocalStorageReturn<null>
    >()
    expectTypeOf(useLocalStorage('k', new Date())).toMatchTypeOf<
      UseLocalStorageReturn<Date>
    >()
    expectTypeOf(useLocalStorage('k', new Map<string, number>())).toMatchTypeOf<
      UseLocalStorageReturn<Map<string, number>>
    >()
    expectTypeOf(useLocalStorage('k', new Set<string>())).toMatchTypeOf<
      UseLocalStorageReturn<Set<string>>
    >()
  })

  it('supports explicit generics and setter forms', () => {
    const api = useLocalStorage<'a' | 'b'>('k', 'a')
    expectTypeOf(api.value).toEqualTypeOf<'a' | 'b'>()
    api.setValue('b')
    api.setValue((current) => (current === 'a' ? 'b' : 'a'))
  })

  it('infers custom serializer and merge options', () => {
    const serializer: UseLocalStorageSerializer<number> = {
      read: (raw) => Number(raw),
      write: (value) => String(value),
    }
    const merge: UseLocalStorageMergeDefaults<{ a: number; b?: number }> = true
    const options: UseLocalStorageOptions<{ a: number; b?: number }> = {
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
    void useLocalStorage('k', { a: 1 }, options)
    void useLocalStorage(
      'k',
      { a: 1 },
      {
        mergeDefaults: (stored, fallback) => ({ ...fallback, ...stored }),
        window,
      },
    )
  })

  it('exposes the return shape', () => {
    const api = useLocalStorage('k', 0)
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
    expectTypeOf(rootUseLocalStorage).toEqualTypeOf(useLocalStorage)
    expectTypeOf<RootUseLocalStorageReturn<string>>().toEqualTypeOf<
      UseLocalStorageReturn<string>
    >()
    expectTypeOf<RootUseLocalStorageOptions<number>>().toEqualTypeOf<
      UseLocalStorageOptions<number>
    >()
    expectTypeOf<RootUseLocalStorageSerializer<boolean>>().toEqualTypeOf<
      UseLocalStorageSerializer<boolean>
    >()
    expectTypeOf<RootUseLocalStorageMergeDefaults<object>>().toEqualTypeOf<
      UseLocalStorageMergeDefaults<object>
    >()
  })

  it('rejects invalid arguments', () => {
    // @ts-expect-error key must be a string
    useLocalStorage(1, 'x')

    // @ts-expect-error serializer must provide read/write
    useLocalStorage('k', 0, { serializer: { read: () => 0 } })

    const api = useLocalStorage('k', 0)
    // @ts-expect-error setter value must match T
    api.setValue('nope')

    // @ts-expect-error merge callback must return T
    useLocalStorage('k', 0, { mergeDefaults: () => 'x' })

    // @ts-expect-error onError must accept Error
    useLocalStorage('k', 0, { onError: (value: string) => value })

    // @ts-expect-error window must be Window or null
    useLocalStorage('k', 0, { window: 'window' })

    // @ts-expect-error unknown options are invalid
    useLocalStorage('k', 0, { ttl: 1 })
  })

  it('has no default export on the root entry', async () => {
    const root = await import('../../index')
    expectTypeOf(root).not.toHaveProperty('default')
  })
})
