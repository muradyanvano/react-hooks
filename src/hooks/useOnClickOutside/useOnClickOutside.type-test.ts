import { createRef, type RefObject } from 'react'
import { expectTypeOf } from 'vitest'

import {
  useOnClickOutside,
  type UseOnClickOutsideEventType,
  type UseOnClickOutsideHandler,
  type UseOnClickOutsideOptions,
} from '../../index'
import {
  useOnClickOutside as useOnClickOutsideLocal,
  type UseOnClickOutsideHandler as LocalHandler,
} from './useOnClickOutside'

export function __typeTests(): void {
  const divRef: RefObject<HTMLDivElement | null> = createRef<HTMLDivElement>()
  const buttonRef: RefObject<HTMLButtonElement | null> =
    createRef<HTMLButtonElement>()
  const nullableRef: RefObject<HTMLDivElement | null> = { current: null }

  const handler: UseOnClickOutsideHandler = (event) => {
    expectTypeOf(event).toEqualTypeOf<PointerEvent | MouseEvent>()
  }

  expectTypeOf(useOnClickOutside).toBeFunction()
  expectTypeOf(useOnClickOutsideLocal).toEqualTypeOf(useOnClickOutside)

  expectTypeOf<UseOnClickOutsideEventType>().toEqualTypeOf<
    'pointerdown' | 'click'
  >()
  expectTypeOf<UseOnClickOutsideOptions>().toMatchTypeOf<{
    enabled?: boolean
    eventType?: UseOnClickOutsideEventType
    capture?: boolean
  }>()
  expectTypeOf<LocalHandler>().toEqualTypeOf<UseOnClickOutsideHandler>()

  expectTypeOf(useOnClickOutside(divRef, handler)).toEqualTypeOf<void>()
  expectTypeOf(useOnClickOutside(buttonRef, handler)).toEqualTypeOf<void>()
  expectTypeOf(useOnClickOutside(nullableRef, handler)).toEqualTypeOf<void>()
  expectTypeOf(useOnClickOutside(divRef, handler, {})).toEqualTypeOf<void>()
  expectTypeOf(
    useOnClickOutside(divRef, handler, {
      enabled: true,
      eventType: 'pointerdown',
      capture: true,
    }),
  ).toEqualTypeOf<void>()
  expectTypeOf(
    useOnClickOutside(divRef, handler, { eventType: 'click' }),
  ).toEqualTypeOf<void>()

  // @ts-expect-error invalid event type
  useOnClickOutside(divRef, handler, { eventType: 'mousedown' })

  // @ts-expect-error invalid option type
  useOnClickOutside(divRef, handler, { enabled: 'yes' })

  // @ts-expect-error non-HTMLElement ref is rejected
  useOnClickOutside(createRef<SVGSVGElement>(), handler)

  // @ts-expect-error missing handler argument
  useOnClickOutside(divRef)
}
