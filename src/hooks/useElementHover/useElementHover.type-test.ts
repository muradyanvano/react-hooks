import { expectTypeOf } from 'vitest'

import { useElementHover, type UseElementHoverOptions } from '../../index'
import { useElementHover as useElementHoverLocal } from './useElementHover'

export function __typeTests(): void {
  expectTypeOf(useElementHover).toBeFunction()
  expectTypeOf(useElementHoverLocal).toEqualTypeOf(useElementHover)

  expectTypeOf<UseElementHoverOptions>().toMatchTypeOf<{
    enabled?: boolean
    delayEnter?: number
    delayLeave?: number
    triggerOnRemoval?: boolean
  }>()

  const htmlRef = { current: document.createElement('button') }
  const htmlHover = useElementHover(htmlRef)
  expectTypeOf(htmlHover).toEqualTypeOf<boolean>()

  const svgRef = {
    current: document.createElementNS('http://www.w3.org/2000/svg', 'circle'),
  }
  expectTypeOf(useElementHover(svgRef)).toEqualTypeOf<boolean>()

  const nullRef = { current: null as HTMLDivElement | null }
  expectTypeOf(useElementHover(nullRef)).toEqualTypeOf<boolean>()

  const genericRef = {
    current: document.createElement('article') as Element | null,
  }
  expectTypeOf(useElementHover(genericRef)).toEqualTypeOf<boolean>()

  const empty = useElementHover(htmlRef)
  expectTypeOf(empty).toEqualTypeOf<boolean>()

  const configured = useElementHover(htmlRef, {
    enabled: false,
    delayEnter: 150,
    delayLeave: 100,
    triggerOnRemoval: true,
  })
  expectTypeOf(configured).toEqualTypeOf<boolean>()

  void configured

  // @ts-expect-error ref must be a RefObject
  useElementHover(document.createElement('div'))

  // @ts-expect-error invalid delayEnter type
  useElementHover(htmlRef, { delayEnter: 'slow' })

  // @ts-expect-error invalid delayLeave type
  useElementHover(htmlRef, { delayLeave: 'slow' })

  // @ts-expect-error invalid enabled type
  useElementHover(htmlRef, { enabled: 'yes' })

  // @ts-expect-error invalid triggerOnRemoval type
  useElementHover(htmlRef, { triggerOnRemoval: 'yes' })

  // @ts-expect-error unknown option
  useElementHover(htmlRef, { once: true })
}
