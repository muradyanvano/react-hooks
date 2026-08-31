import { createRef, type RefObject } from 'react'
import { expectTypeOf } from 'vitest'

import {
  useOnLongPress,
  type UseOnLongPressDelay,
  type UseOnLongPressHandler,
  type UseOnLongPressOptions,
  type UseOnLongPressReleaseDetails,
  type UseOnLongPressReleaseHandler,
} from '../../index'
import {
  useOnLongPress as useOnLongPressLocal,
  type UseOnLongPressHandler as LocalHandler,
} from './useOnLongPress'

export function __typeTests(): void {
  const divRef: RefObject<HTMLDivElement | null> = createRef<HTMLDivElement>()
  const buttonRef: RefObject<HTMLButtonElement | null> =
    createRef<HTMLButtonElement>()
  const svgRef: RefObject<SVGSVGElement | null> = createRef<SVGSVGElement>()
  const nullableRef: RefObject<HTMLDivElement | null> = { current: null }

  const handler: UseOnLongPressHandler = (event) => {
    expectTypeOf(event).toEqualTypeOf<PointerEvent>()
  }

  const onRelease: UseOnLongPressReleaseHandler<HTMLDivElement> = (details) => {
    expectTypeOf(details.element).toEqualTypeOf<HTMLDivElement>()
    expectTypeOf(details.event).toEqualTypeOf<PointerEvent>()
    expectTypeOf(details.duration).toEqualTypeOf<number>()
    expectTypeOf(details.distance).toEqualTypeOf<number>()
    expectTypeOf(details.isLongPress).toEqualTypeOf<boolean>()
  }

  expectTypeOf(useOnLongPress).toBeFunction()
  expectTypeOf(useOnLongPressLocal).toEqualTypeOf(useOnLongPress)
  expectTypeOf<LocalHandler>().toEqualTypeOf<UseOnLongPressHandler>()

  expectTypeOf<UseOnLongPressDelay>().toEqualTypeOf<
    number | ((event: PointerEvent) => number)
  >()
  expectTypeOf<UseOnLongPressOptions<HTMLDivElement>>().toMatchTypeOf<{
    enabled?: boolean
    delay?: UseOnLongPressDelay
    distanceThreshold?: number | false
    button?: number
    self?: boolean
    preventDefault?: boolean
    stopPropagation?: boolean
    capture?: boolean
    onRelease?: UseOnLongPressReleaseHandler<HTMLDivElement>
  }>()
  expectTypeOf<UseOnLongPressReleaseDetails<HTMLDivElement>>().toMatchTypeOf<{
    element: HTMLDivElement
    event: PointerEvent
    duration: number
    distance: number
    isLongPress: boolean
  }>()

  expectTypeOf(useOnLongPress(divRef, handler)).toEqualTypeOf<void>()
  expectTypeOf(useOnLongPress(buttonRef, handler)).toEqualTypeOf<void>()
  expectTypeOf(useOnLongPress(svgRef, handler)).toEqualTypeOf<void>()
  expectTypeOf(useOnLongPress(nullableRef, handler)).toEqualTypeOf<void>()
  expectTypeOf(useOnLongPress(divRef, handler, {})).toEqualTypeOf<void>()
  expectTypeOf(
    useOnLongPress(divRef, handler, {
      enabled: true,
      delay: 300,
      distanceThreshold: 5,
      button: 0,
      self: true,
      preventDefault: true,
      stopPropagation: true,
      capture: true,
      onRelease,
    }),
  ).toEqualTypeOf<void>()
  expectTypeOf(
    useOnLongPress(divRef, handler, { delay: (event) => event.pointerId }),
  ).toEqualTypeOf<void>()
  expectTypeOf(
    useOnLongPress(divRef, handler, { distanceThreshold: false }),
  ).toEqualTypeOf<void>()

  useOnLongPress(divRef, handler, {
    onRelease: (details) => {
      expectTypeOf(details.element).toEqualTypeOf<HTMLDivElement>()
    },
  })

  // @ts-expect-error invalid delay type
  useOnLongPress(divRef, handler, { delay: 'slow' })

  // @ts-expect-error invalid capture value
  useOnLongPress(divRef, handler, { capture: 'yes' })

  // @ts-expect-error arbitrary options are rejected
  useOnLongPress(divRef, handler, { once: true })

  // @ts-expect-error invalid handler event type
  useOnLongPress(divRef, (event: KeyboardEvent) => {
    void event
  })

  // @ts-expect-error invalid onRelease handler
  useOnLongPress(divRef, handler, {
    onRelease: (details: { element: HTMLButtonElement }) => {
      void details
    },
  })

  // @ts-expect-error invalid enabled value
  useOnLongPress(divRef, handler, { enabled: 'yes' })

  // @ts-expect-error non-element ref is rejected
  useOnLongPress(createRef<number>(), handler)

  // @ts-expect-error missing handler argument
  useOnLongPress(divRef)
}
