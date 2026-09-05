import { describe, expectTypeOf, it } from 'vitest'

import {
  useTextSelection,
  type UseTextSelectionOptions,
  type UseTextSelectionReturn,
} from './useTextSelection'

describe('useTextSelection types', () => {
  it('returns the supported selection snapshot', () => {
    const result = useTextSelection()
    expectTypeOf(result).toEqualTypeOf<UseTextSelectionReturn>()
    expectTypeOf(result.text).toEqualTypeOf<string>()
    expectTypeOf(result.rects).toEqualTypeOf<readonly DOMRect[]>()
    expectTypeOf(result.ranges).toEqualTypeOf<readonly Range[]>()
    expectTypeOf(result.selection).toEqualTypeOf<Selection | null>()
  })

  it('accepts supported options', () => {
    expectTypeOf<UseTextSelectionOptions['enabled']>().toEqualTypeOf<
      boolean | undefined
    >()
    useTextSelection({
      enabled: true,
      window: null,
    } satisfies UseTextSelectionOptions)
    useTextSelection({ enabled: false, window })
  })

  it('rejects invalid call shapes', () => {
    // @ts-expect-error enabled must be boolean
    useTextSelection({ enabled: 'yes' })
    // @ts-expect-error window must be Window | null
    useTextSelection({ window: document })
    // @ts-expect-error unknown option
    useTextSelection({ selection: null })
    // @ts-expect-error there is no default export
    void useTextSelection.default
  })
})
