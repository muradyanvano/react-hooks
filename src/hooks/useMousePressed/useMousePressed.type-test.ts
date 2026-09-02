import { expectTypeOf } from 'vitest'
import type { RefObject } from 'react'

import {
  useMousePressed,
  type UseMousePressedEvent,
  type UseMousePressedHandler,
  type UseMousePressedOptions,
  type UseMousePressedReturn,
  type UseMousePressedTarget,
  type UseMouseSourceType,
} from '../../index'
import { useMousePressed as useMousePressedLocal } from './useMousePressed'

export function __typeTests(): void {
  expectTypeOf(useMousePressed).toBeFunction()
  expectTypeOf(useMousePressedLocal).toEqualTypeOf(useMousePressed)

  const empty = useMousePressed()
  expectTypeOf(empty).toEqualTypeOf<UseMousePressedReturn>()
  expectTypeOf(empty.pressed).toEqualTypeOf<boolean>()
  expectTypeOf(empty.sourceType).toEqualTypeOf<UseMouseSourceType>()

  const configured = useMousePressed({
    enabled: true,
    touch: true,
    drag: true,
    capture: true,
    initialValue: false,
    target: window,
  })
  expectTypeOf(configured).toEqualTypeOf<UseMousePressedReturn>()

  const htmlRef = { current: document.createElement('div') }
  expectTypeOf(
    useMousePressed({ target: htmlRef }),
  ).toEqualTypeOf<UseMousePressedReturn>()

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  expectTypeOf(
    useMousePressed({ target: svg }),
  ).toEqualTypeOf<UseMousePressedReturn>()

  expectTypeOf(
    useMousePressed({ target: null }),
  ).toEqualTypeOf<UseMousePressedReturn>()

  const mouseHandler: UseMousePressedHandler = (event) => {
    void (event as MouseEvent).button
  }
  const touchHandler: UseMousePressedHandler = (event) => {
    void (event as TouchEvent).touches
  }
  const dragHandler: UseMousePressedHandler = (event) => {
    void (event as DragEvent).dataTransfer
  }

  expectTypeOf(
    useMousePressed({ onPressed: mouseHandler, onReleased: touchHandler }),
  ).toEqualTypeOf<UseMousePressedReturn>()

  void dragHandler

  expectTypeOf<UseMousePressedOptions>().toMatchTypeOf<{
    enabled?: boolean
    touch?: boolean
    drag?: boolean
    capture?: boolean
    initialValue?: boolean
    target?:
      UseMousePressedTarget | RefObject<UseMousePressedTarget | null> | null
    onPressed?: UseMousePressedHandler
    onReleased?: UseMousePressedHandler
  }>()

  expectTypeOf<UseMousePressedEvent>().toEqualTypeOf<
    MouseEvent | TouchEvent | DragEvent
  >()

  // @ts-expect-error invalid target
  useMousePressed({ target: { x: 1 } })

  // @ts-expect-error invalid enabled type
  useMousePressed({ enabled: 'yes' })

  // @ts-expect-error invalid touch type
  useMousePressed({ touch: 'yes' })

  // @ts-expect-error invalid drag type
  useMousePressed({ drag: 'yes' })

  // @ts-expect-error invalid capture type
  useMousePressed({ capture: 'yes' })

  // @ts-expect-error invalid initial value
  useMousePressed({ initialValue: 'yes' })

  useMousePressed({
    // @ts-expect-error invalid callback parameter
    onPressed: (value: string) => {
      void value
    },
  })

  // @ts-expect-error unknown option
  useMousePressed({ once: true })

  expectTypeOf(useMousePressedLocal).not.toHaveProperty('default')
}
