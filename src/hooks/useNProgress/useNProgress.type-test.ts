import { describe, expectTypeOf, it } from 'vitest'

import {
  useNProgress,
  type UseNProgressOptions,
  type UseNProgressReturn,
} from './useNProgress'
import {
  useNProgress as rootUseNProgress,
  type UseNProgressOptions as RootUseNProgressOptions,
  type UseNProgressReturn as RootUseNProgressReturn,
} from '../../index'

describe('useNProgress types', () => {
  it('no arguments returns UseNProgressReturn', () => {
    const result = useNProgress()
    expectTypeOf(result).toEqualTypeOf<UseNProgressReturn>()
  })

  it('null progress is accepted', () => {
    const result = useNProgress(null)
    expectTypeOf(result).toEqualTypeOf<UseNProgressReturn>()
  })

  it('number progress is accepted', () => {
    const result = useNProgress(0.5)
    expectTypeOf(result).toEqualTypeOf<UseNProgressReturn>()
  })

  it('undefined progress is accepted explicitly', () => {
    const result = useNProgress(undefined)
    expectTypeOf(result).toEqualTypeOf<UseNProgressReturn>()
  })

  it('return isLoading is boolean', () => {
    const result = useNProgress()
    expectTypeOf(result.isLoading).toEqualTypeOf<boolean>()
  })

  it('return progress is number | null', () => {
    const result = useNProgress()
    expectTypeOf(result.progress).toEqualTypeOf<number | null>()
  })

  it('start returns void', () => {
    const result = useNProgress()
    expectTypeOf(result.start).toEqualTypeOf<() => void>()
  })

  it('set returns void and accepts number', () => {
    const result = useNProgress()
    expectTypeOf(result.set).toEqualTypeOf<(value: number) => void>()
  })

  it('increment returns void and accepts optional number', () => {
    const result = useNProgress()
    expectTypeOf(result.increment).toEqualTypeOf<(amount?: number) => void>()
  })

  it('done returns void and accepts optional boolean', () => {
    const result = useNProgress()
    expectTypeOf(result.done).toEqualTypeOf<(force?: boolean) => void>()
  })

  it('remove returns void', () => {
    const result = useNProgress()
    expectTypeOf(result.remove).toEqualTypeOf<() => void>()
  })

  it('full options are accepted', () => {
    const opts: UseNProgressOptions = {
      minimum: 0.08,
      easing: 'ease',
      speed: 200,
      trickle: true,
      trickleSpeed: 200,
      showSpinner: true,
      color: '#4f46e5',
      height: 3,
      zIndex: 1031,
      removeDelay: 200,
      ariaLabel: 'Loading',
      document: document,
      parent: document.body,
    }
    const result = useNProgress(0.5, opts)
    expectTypeOf(result).toEqualTypeOf<UseNProgressReturn>()
  })

  it('null document is accepted', () => {
    useNProgress(undefined, { document: null })
  })

  it('null parent is accepted', () => {
    useNProgress(undefined, { parent: null })
  })

  it('custom document type is accepted', () => {
    const doc: Document | null = null
    useNProgress(undefined, { document: doc })
  })

  it('custom parent type is accepted', () => {
    const el: HTMLElement | null = null
    useNProgress(undefined, { parent: el })
  })

  it('root export re-exports correctly', () => {
    const result = rootUseNProgress()
    expectTypeOf(result).toEqualTypeOf<RootUseNProgressReturn>()
  })

  it('root types are the same as direct types', () => {
    expectTypeOf<UseNProgressOptions>().toEqualTypeOf<RootUseNProgressOptions>()
    expectTypeOf<UseNProgressReturn>().toEqualTypeOf<RootUseNProgressReturn>()
  })

  it('no default export', () => {
    // @ts-expect-error — there is no default export
    void useNProgress.default
  })

  it('invalid progress type is rejected', () => {
    // @ts-expect-error — string is not a valid progress type
    void useNProgress('0.5')
  })

  it('invalid option values are rejected', () => {
    // @ts-expect-error — string is not valid for minimum
    void useNProgress(undefined, { minimum: 'high' })
  })

  it('invalid parent type is rejected', () => {
    // @ts-expect-error — number is not HTMLElement
    void useNProgress(undefined, { parent: 42 })
  })

  it('unknown option is rejected', () => {
    // @ts-expect-error — unknown option
    void useNProgress(undefined, { unknownProp: true })
  })
})
