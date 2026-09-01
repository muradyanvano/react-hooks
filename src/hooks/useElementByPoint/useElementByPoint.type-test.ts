import { expectTypeOf } from 'vitest'

import {
  useElementByPoint,
  type UseElementByPointOptions,
  type UseElementByPointReturn,
  type UseElementByPointScheduler,
} from '../../index'
import {
  useElementByPoint as useElementByPointLocal,
  type UseElementByPointReturn as LocalReturn,
} from './useElementByPoint'

export function __typeTests(): void {
  expectTypeOf(useElementByPoint).toBeFunction()
  expectTypeOf(useElementByPointLocal).toEqualTypeOf(useElementByPoint)
  expectTypeOf<LocalReturn>().toEqualTypeOf<UseElementByPointReturn>()

  expectTypeOf<UseElementByPointOptions>().toMatchTypeOf<{
    x: number
    y: number
    multiple?: boolean
    enabled?: boolean
    document?: Document | null
    scheduler?: UseElementByPointScheduler
  }>()

  const single = useElementByPoint({ x: 0, y: 0 })
  expectTypeOf(single).toEqualTypeOf<UseElementByPointReturn<false>>()
  expectTypeOf(single.element).toEqualTypeOf<Element | null>()
  expectTypeOf(single.isSupported).toEqualTypeOf<boolean>()
  expectTypeOf(single.isPaused).toEqualTypeOf<boolean>()
  expectTypeOf(single.update).returns.toEqualTypeOf<void>()
  expectTypeOf(single.pause).returns.toEqualTypeOf<void>()
  expectTypeOf(single.resume).returns.toEqualTypeOf<void>()

  const multiple = useElementByPoint({ x: 10, y: 20, multiple: true })
  expectTypeOf(multiple).toEqualTypeOf<UseElementByPointReturn<true>>()
  expectTypeOf(multiple.element).toEqualTypeOf<readonly Element[]>()

  const explicitSingle = useElementByPoint({ x: 0, y: 0, multiple: false })
  expectTypeOf(explicitSingle.element).toEqualTypeOf<Element | null>()

  const dynamicMode = (multipleFlag: boolean) =>
    useElementByPoint({ x: 0, y: 0, multiple: multipleFlag })
  expectTypeOf(dynamicMode).returns.toEqualTypeOf<
    UseElementByPointReturn<boolean>
  >()
  expectTypeOf(dynamicMode(true).element).toEqualTypeOf<
    Element | null | readonly Element[]
  >()

  const multipleOptions: UseElementByPointOptions<true> = {
    x: 0,
    y: 0,
    multiple: true,
  }
  const typedMultiple = useElementByPoint(multipleOptions)
  expectTypeOf(typedMultiple.element).toEqualTypeOf<readonly Element[]>()

  const configured = useElementByPoint({
    x: 1,
    y: 2,
    enabled: false,
    scheduler: 'sync',
    document: null,
  })
  expectTypeOf(configured).toEqualTypeOf<UseElementByPointReturn<false>>()

  void configured

  // @ts-expect-error x is required
  useElementByPoint({ y: 0 })

  // @ts-expect-error y is required
  useElementByPoint({ x: 0 })

  // @ts-expect-error invalid multiple value
  useElementByPoint({ x: 0, y: 0, multiple: 'yes' })

  // @ts-expect-error invalid enabled value
  useElementByPoint({ x: 0, y: 0, enabled: 'yes' })

  // @ts-expect-error invalid scheduler value
  useElementByPoint({ x: 0, y: 0, scheduler: 'immediate' })

  // @ts-expect-error arbitrary options are rejected
  useElementByPoint({ x: 0, y: 0, once: true })
}
