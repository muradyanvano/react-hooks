import { expectTypeOf } from 'vitest'
import type { RefObject } from 'react'

import {
  useMouse,
  type UseMouseCoordinateType,
  type UseMouseEventExtractor,
  type UseMouseEventFilter,
  type UseMouseOptions,
  type UseMousePosition,
  type UseMouseReturn,
  type UseMouseSourceType,
  type UseMouseTarget,
} from '../../index'
import { useMouse as useMouseLocal } from './useMouse'

export function __typeTests(): void {
  expectTypeOf(useMouse).toBeFunction()
  expectTypeOf(useMouseLocal).toEqualTypeOf(useMouse)

  const empty = useMouse()
  expectTypeOf(empty).toEqualTypeOf<UseMouseReturn>()
  expectTypeOf(empty.x).toEqualTypeOf<number>()
  expectTypeOf(empty.y).toEqualTypeOf<number>()
  expectTypeOf(empty.sourceType).toEqualTypeOf<UseMouseSourceType>()

  const withInitial = useMouse({
    initialValue: { x: 1, y: 2 },
  })
  expectTypeOf(withInitial).toEqualTypeOf<UseMouseReturn>()

  for (const type of [
    'page',
    'client',
    'screen',
    'movement',
  ] as const satisfies readonly UseMouseCoordinateType[]) {
    expectTypeOf(useMouse({ type })).toEqualTypeOf<UseMouseReturn>()
  }

  expectTypeOf(useMouse({ target: window })).toEqualTypeOf<UseMouseReturn>()
  expectTypeOf(useMouse({ target: document })).toEqualTypeOf<UseMouseReturn>()

  const htmlRef = {
    current: document.createElement('div'),
  } satisfies RefObject<HTMLDivElement>
  expectTypeOf(useMouse({ target: htmlRef })).toEqualTypeOf<UseMouseReturn>()
  expectTypeOf(
    useMouse({ target: document.createElement('div') }),
  ).toEqualTypeOf<UseMouseReturn>()

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  expectTypeOf(useMouse({ target: svg })).toEqualTypeOf<UseMouseReturn>()

  const svgRef = { current: svg } satisfies RefObject<SVGSVGElement>
  expectTypeOf(useMouse({ target: svgRef })).toEqualTypeOf<UseMouseReturn>()

  expectTypeOf(useMouse({ target: null })).toEqualTypeOf<UseMouseReturn>()

  const extractor: UseMouseEventExtractor = (event) => {
    void event
    return [1, 2] as const
  }
  expectTypeOf(useMouse({ type: extractor })).toEqualTypeOf<UseMouseReturn>()

  const nullExtractor: UseMouseEventExtractor = () => null
  const undefinedExtractor: UseMouseEventExtractor = () => undefined
  expectTypeOf(
    useMouse({ type: nullExtractor }),
  ).toEqualTypeOf<UseMouseReturn>()
  expectTypeOf(
    useMouse({ type: undefinedExtractor }),
  ).toEqualTypeOf<UseMouseReturn>()

  const filter: UseMouseEventFilter = (invoke, event) => {
    void event
    invoke()
  }
  expectTypeOf(
    useMouse({ eventFilter: filter }),
  ).toEqualTypeOf<UseMouseReturn>()

  expectTypeOf<UseMouseOptions>().toMatchTypeOf<{
    enabled?: boolean
    type?: UseMouseCoordinateType | UseMouseEventExtractor
    target?: UseMouseTarget | RefObject<UseMouseTarget | null> | null
    touch?: boolean
    scroll?: boolean
    resetOnTouchEnd?: boolean
    initialValue?: UseMousePosition
    eventFilter?: UseMouseEventFilter
  }>()

  expectTypeOf<UseMousePosition>().toEqualTypeOf<{
    x: number
    y: number
  }>()

  // @ts-expect-error invalid coordinate string
  useMouse({ type: 'offset' })

  // @ts-expect-error invalid target object
  useMouse({ target: { x: 1 } })

  // @ts-expect-error invalid initial value shape
  useMouse({ initialValue: { x: '1', y: 2 } })

  // @ts-expect-error missing y
  useMouse({ initialValue: { x: 1 } })

  // @ts-expect-error missing x
  useMouse({ initialValue: { y: 1 } })

  useMouse({
    // @ts-expect-error invalid extractor return
    type: () => [1],
  })

  useMouse({
    // @ts-expect-error invalid extractor parameter usage still must match signature
    type: (value: string) => {
      void value
      return [0, 0]
    },
  })

  useMouse({
    // @ts-expect-error invalid event filter signature
    eventFilter: (invoke: number) => {
      void invoke
    },
  })

  // @ts-expect-error invalid enabled type
  useMouse({ enabled: 'yes' })

  // @ts-expect-error invalid touch type
  useMouse({ touch: 'yes' })

  // @ts-expect-error unknown option
  useMouse({ once: true })

  // Ensure the local module has no default export surface for consumers.
  expectTypeOf(useMouseLocal).not.toHaveProperty('default')
}
