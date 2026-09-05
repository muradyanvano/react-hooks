import { describe, expectTypeOf, it } from 'vitest'

import {
  useBase64,
  type UseBase64Options,
  type UseBase64Return,
  type UseBase64Target,
} from './useBase64'

describe('useBase64 types', () => {
  it('supports all built-in targets and the documented return shape', () => {
    const targets: UseBase64Target[] = [
      'text',
      new ArrayBuffer(1),
      new Uint8Array([1]),
      new Blob(),
      document.createElement('canvas'),
      document.createElement('img'),
      null,
      undefined,
    ]
    expectTypeOf(targets[0]).toEqualTypeOf<UseBase64Target | undefined>()
    expectTypeOf(useBase64('text')).toEqualTypeOf<UseBase64Return>()
    expectTypeOf(useBase64(new Uint8Array())).toEqualTypeOf<UseBase64Return>()
    expectTypeOf(useBase64(null).execute()).resolves.toEqualTypeOf<
      string | null
    >()
  })

  it('requires a serializer for unsupported object values', () => {
    const options: UseBase64Options<{ id: number }> = {
      serializer: (value) => String(value.id),
      dataUrl: false,
    }
    useBase64(
      { id: 1 },
      options as UseBase64Options<{ id: number }> & {
        serializer: (value: { id: number }) => string
      },
    )

    // @ts-expect-error unsupported objects require a serializer
    useBase64({ id: 1 })
    // @ts-expect-error serializer must return a string
    useBase64({ id: 1 }, { serializer: () => 1 })
    // @ts-expect-error quality must be numeric
    useBase64('text', { quality: '1' })
  })
})
