import { expectTypeOf } from 'vitest'

import {
  useParallax,
  type UseParallaxAdjuster,
  type UseParallaxOptions,
  type UseParallaxReturn,
  type UseParallaxSource,
  type UseParallaxTarget,
} from '../../index'
import { useParallax as useParallaxLocal } from './useParallax'

export function __typeTests(): void {
  expectTypeOf(useParallax).toBeFunction()
  expectTypeOf(useParallaxLocal).toEqualTypeOf(useParallax)

  expectTypeOf<UseParallaxTarget>().toEqualTypeOf<HTMLElement | SVGElement>()
  expectTypeOf<UseParallaxSource>().toEqualTypeOf<
    'mouse' | 'deviceOrientation'
  >()
  expectTypeOf<UseParallaxAdjuster>().toEqualTypeOf<(value: number) => number>()

  expectTypeOf<UseParallaxOptions>().toMatchTypeOf<{
    enabled?: boolean
    deviceOrientation?: boolean
    mouse?: boolean
    clamp?: boolean
    deviceOrientationTiltAdjust?: UseParallaxAdjuster
    deviceOrientationRollAdjust?: UseParallaxAdjuster
    mouseTiltAdjust?: UseParallaxAdjuster
    mouseRollAdjust?: UseParallaxAdjuster
  }>()

  expectTypeOf<UseParallaxReturn>().toMatchTypeOf<{
    roll: number
    tilt: number
    source: UseParallaxSource
  }>()

  const divRef = { current: document.createElement('div') }
  const empty = useParallax(divRef)
  expectTypeOf(empty).toEqualTypeOf<UseParallaxReturn>()
  expectTypeOf(empty.roll).toEqualTypeOf<number>()
  expectTypeOf(empty.tilt).toEqualTypeOf<number>()
  expectTypeOf(empty.source).toEqualTypeOf<UseParallaxSource>()

  const svgRef = {
    current: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
  }
  expectTypeOf(useParallax(svgRef).source).toEqualTypeOf<UseParallaxSource>()

  const configured = useParallax(divRef, {
    enabled: true,
    mouse: true,
    deviceOrientation: false,
    clamp: false,
    mouseTiltAdjust: (value) => {
      void value
      return -value
    },
    mouseRollAdjust: (value) => value * 2,
    deviceOrientationTiltAdjust: (value) => value,
    deviceOrientationRollAdjust: (value) => value,
  })
  expectTypeOf(configured).toEqualTypeOf<UseParallaxReturn>()
  void configured

  // @ts-expect-error ref must be a RefObject
  useParallax(document.createElement('div'))

  // @ts-expect-error Window refs are not valid parallax targets
  useParallax({ current: window })

  // @ts-expect-error Document refs are not valid parallax targets
  useParallax({ current: document })

  // @ts-expect-error invalid enabled type
  useParallax(divRef, { enabled: 'yes' })

  // @ts-expect-error invalid clamp type
  useParallax(divRef, { clamp: 'yes' })

  useParallax(divRef, {
    // @ts-expect-error invalid adjuster argument
    mouseTiltAdjust: (value: string) => Number(value),
  })

  useParallax(divRef, {
    // @ts-expect-error unknown option
    throttle: 16,
  })

  expectTypeOf(useParallaxLocal).not.toHaveProperty('default')
}
