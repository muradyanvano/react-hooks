import { createRef } from 'react'
import { describe, expectTypeOf, it } from 'vitest'

import {
  useScrollLock,
  type UseScrollLockReturn,
  type UseScrollLockTarget,
} from './useScrollLock'
import {
  useScrollLock as rootUseScrollLock,
  type UseScrollLockReturn as RootUseScrollLockReturn,
  type UseScrollLockTarget as RootUseScrollLockTarget,
} from '../../index'

describe('useScrollLock types', () => {
  it('accepts HTML, SVG, Window, and Document refs', () => {
    const htmlRef = createRef<HTMLDivElement>()
    const svgRef = createRef<SVGSVGElement>()
    const windowRef = createRef<Window>()
    const documentRef = createRef<Document>()

    expectTypeOf(useScrollLock(htmlRef)).toMatchTypeOf<UseScrollLockReturn>()
    expectTypeOf(useScrollLock(svgRef)).toMatchTypeOf<UseScrollLockReturn>()
    expectTypeOf(useScrollLock(windowRef)).toMatchTypeOf<UseScrollLockReturn>()
    expectTypeOf(
      useScrollLock(documentRef),
    ).toMatchTypeOf<UseScrollLockReturn>()
  })

  it('infers return controls as void functions', () => {
    const ref = createRef<HTMLDivElement>()
    const api = useScrollLock(ref, false)
    expectTypeOf(api.isLocked).toEqualTypeOf<boolean>()
    expectTypeOf(api.lock).toEqualTypeOf<() => void>()
    expectTypeOf(api.unlock).toEqualTypeOf<() => void>()
    expectTypeOf(api.toggle).toEqualTypeOf<() => void>()
  })

  it('accepts boolean initial state and defaults', () => {
    const ref = createRef<HTMLElement>()
    useScrollLock(ref)
    useScrollLock(ref, true)
    useScrollLock(ref, false)
  })

  it('re-exports matching root types', () => {
    expectTypeOf(rootUseScrollLock).toEqualTypeOf(useScrollLock)
    expectTypeOf<RootUseScrollLockReturn>().toEqualTypeOf<UseScrollLockReturn>()
    expectTypeOf<RootUseScrollLockTarget>().toEqualTypeOf<UseScrollLockTarget>()
  })

  it('rejects invalid targets and arguments', () => {
    const badRef = createRef<number>()
    // @ts-expect-error number refs are invalid
    useScrollLock(badRef)

    const ref = createRef<HTMLDivElement>()
    // @ts-expect-error initial state must be boolean when provided
    useScrollLock(ref, 'yes')

    // @ts-expect-error too many arguments
    useScrollLock(ref, false, {})

    // @ts-expect-error options object is not part of the API
    useScrollLock(ref, { enabled: true })
  })
})
