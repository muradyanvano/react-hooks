import { expectTypeOf } from 'vitest'

import {
  useScroll,
  type UseScrollArrivedState,
  type UseScrollDirections,
  type UseScrollErrorHandler,
  type UseScrollHandler,
  type UseScrollObserveOptions,
  type UseScrollOffset,
  type UseScrollOptions,
  type UseScrollPosition,
  type UseScrollReturn,
  type UseScrollTarget,
} from '../../index'
import { useScroll as useScrollLocal } from './useScroll'

export function __typeTests(): void {
  expectTypeOf(useScroll).toBeFunction()
  expectTypeOf(useScrollLocal).toEqualTypeOf(useScroll)

  expectTypeOf<UseScrollTarget>().toEqualTypeOf<
    HTMLElement | SVGElement | Window | Document
  >()

  expectTypeOf<UseScrollOffset>().toMatchTypeOf<{
    left?: number
    right?: number
    top?: number
    bottom?: number
  }>()

  expectTypeOf<UseScrollObserveOptions>().toMatchTypeOf<{
    mutation?: boolean
  }>()

  expectTypeOf<UseScrollHandler>().toEqualTypeOf<(event: Event) => void>()
  expectTypeOf<UseScrollErrorHandler>().toEqualTypeOf<
    (error: unknown) => void
  >()

  expectTypeOf<UseScrollPosition>().toEqualTypeOf<{
    x: number
    y: number
  }>()

  expectTypeOf<UseScrollArrivedState>().toEqualTypeOf<{
    left: boolean
    right: boolean
    top: boolean
    bottom: boolean
  }>()

  expectTypeOf<UseScrollDirections>().toEqualTypeOf<{
    left: boolean
    right: boolean
    top: boolean
    bottom: boolean
  }>()

  expectTypeOf<UseScrollOptions>().toMatchTypeOf<{
    enabled?: boolean
    throttle?: number
    idle?: number
    offset?: UseScrollOffset
    observe?: boolean | UseScrollObserveOptions
    onScroll?: UseScrollHandler
    onStop?: UseScrollHandler
    onError?: UseScrollErrorHandler
    eventListenerOptions?: boolean | AddEventListenerOptions
    behavior?: ScrollBehavior
  }>()

  expectTypeOf<UseScrollReturn>().toMatchTypeOf<{
    x: number
    y: number
    isScrolling: boolean
    arrivedState: UseScrollArrivedState
    directions: UseScrollDirections
    measure: () => void
    scrollTo: (position: UseScrollPosition, behavior?: ScrollBehavior) => void
    setX: (x: number, behavior?: ScrollBehavior) => void
    setY: (y: number, behavior?: ScrollBehavior) => void
  }>()

  const divRef = { current: document.createElement('div') }
  const svgRef = {
    current: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
  }
  const windowRef = { current: window as Window | null }
  const documentRef = { current: document as Document | null }

  const empty = useScroll(divRef)
  expectTypeOf(empty).toEqualTypeOf<UseScrollReturn>()
  expectTypeOf(empty.x).toEqualTypeOf<number>()
  expectTypeOf(empty.y).toEqualTypeOf<number>()
  expectTypeOf(empty.isScrolling).toEqualTypeOf<boolean>()
  expectTypeOf(empty.arrivedState).toEqualTypeOf<UseScrollArrivedState>()
  expectTypeOf(empty.directions).toEqualTypeOf<UseScrollDirections>()
  expectTypeOf(empty.measure).toEqualTypeOf<() => void>()
  expectTypeOf(empty.scrollTo).toEqualTypeOf<
    (position: UseScrollPosition, behavior?: ScrollBehavior) => void
  >()
  expectTypeOf(empty.setX).toEqualTypeOf<
    (x: number, behavior?: ScrollBehavior) => void
  >()
  expectTypeOf(empty.setY).toEqualTypeOf<
    (y: number, behavior?: ScrollBehavior) => void
  >()

  empty.scrollTo({ x: 0, y: 0 })
  empty.scrollTo({ x: 0, y: 0 }, 'smooth')
  empty.setX(0)
  empty.setX(0, 'auto')
  empty.setY(0)
  empty.setY(0, 'instant')

  const configured = useScroll(divRef, {
    enabled: true,
    throttle: 16,
    idle: 200,
    offset: { left: 8, right: 8, top: 4, bottom: 4 },
    observe: { mutation: true },
    onScroll: (event) => {
      void event.type
    },
    onStop: (event) => {
      void event.type
    },
    onError: (error) => {
      void error
    },
    eventListenerOptions: { capture: true, passive: false },
    behavior: 'smooth',
  })
  expectTypeOf(configured).toEqualTypeOf<UseScrollReturn>()
  void configured

  useScroll(svgRef)
  useScroll(windowRef)
  useScroll(documentRef)

  useScroll(divRef, { observe: true })

  // @ts-expect-error ref must be a RefObject
  useScroll(document.createElement('div'))

  // @ts-expect-error unsupported target object
  useScroll({ current: {} })

  // @ts-expect-error invalid enabled type
  useScroll(divRef, { enabled: 'yes' })

  // @ts-expect-error throttle must be a number
  useScroll(divRef, { throttle: 'fast' })

  // @ts-expect-error idle must be a number
  useScroll(divRef, { idle: 'slow' })

  useScroll(divRef, {
    // @ts-expect-error offset edges must be numbers
    offset: { left: 'wide' },
  })

  useScroll(divRef, {
    // @ts-expect-error observe mutation must be boolean
    observe: { mutation: 'yes' },
  })

  useScroll(divRef, {
    // @ts-expect-error onScroll must accept Event
    onScroll: (event: string) => {
      void event
    },
  })

  useScroll(divRef, {
    // @ts-expect-error onError must accept unknown
    onError: (error: Error) => {
      void error.message
    },
  })

  // @ts-expect-error unknown option
  useScroll(divRef, { once: true })

  expectTypeOf(useScrollLocal).not.toHaveProperty('default')
}
