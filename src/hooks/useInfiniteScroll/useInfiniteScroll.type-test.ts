import { expectTypeOf } from 'vitest'

import {
  useInfiniteScroll,
  type UseInfiniteScrollCanLoadMore,
  type UseInfiniteScrollDirection,
  type UseInfiniteScrollLoadMore,
  type UseInfiniteScrollOptions,
  type UseInfiniteScrollReturn,
  type UseInfiniteScrollState,
  type UseInfiniteScrollTarget,
} from '../../index'
import { useInfiniteScroll as useInfiniteScrollLocal } from './useInfiniteScroll'

export function __typeTests(): void {
  expectTypeOf(useInfiniteScroll).toBeFunction()
  expectTypeOf(useInfiniteScrollLocal).toEqualTypeOf(useInfiniteScroll)

  expectTypeOf<UseInfiniteScrollDirection>().toEqualTypeOf<
    'top' | 'right' | 'bottom' | 'left'
  >()
  expectTypeOf<UseInfiniteScrollTarget>().toEqualTypeOf<
    HTMLElement | Window | Document
  >()

  const divRef = { current: document.createElement('div') }
  const sectionRef = {
    current: document.createElement('section') as HTMLElement,
  }
  const windowRef = { current: window as Window | null }
  const documentRef = { current: document as Document | null }

  const syncLoader: UseInfiniteScrollLoadMore<HTMLDivElement> = (state) => {
    void state.distanceToEdge
  }
  const asyncLoader: UseInfiniteScrollLoadMore<HTMLElement> = async (state) => {
    void state.scrollTop
  }
  const predicate: UseInfiniteScrollCanLoadMore<HTMLDivElement> = (state) =>
    state.distanceToEdge >= 0

  const result = useInfiniteScroll(divRef, syncLoader, {
    enabled: true,
    distance: 12,
    direction: 'bottom',
    canLoadMore: predicate,
  })
  expectTypeOf(result).toEqualTypeOf<UseInfiniteScrollReturn>()
  expectTypeOf(result.check()).toEqualTypeOf<Promise<void>>()
  expectTypeOf(result.reset()).toEqualTypeOf<void>()

  useInfiniteScroll(sectionRef, asyncLoader, { direction: 'top' })
  useInfiniteScroll(windowRef, async (state) => {
    expectTypeOf(state.target).toEqualTypeOf<Window>()
  })
  useInfiniteScroll(documentRef, (state) => {
    expectTypeOf(state.target).toEqualTypeOf<Document>()
  })

  const options: UseInfiniteScrollOptions = { distance: 0 }
  void options
  const state: UseInfiniteScrollState = {
    target: document.createElement('div'),
    direction: 'left',
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 1,
    scrollWidth: 1,
    clientHeight: 1,
    clientWidth: 1,
    distanceToEdge: 0,
  }
  void state

  // @ts-expect-error invalid direction
  useInfiniteScroll(divRef, syncLoader, { direction: 'diagonal' })

  // @ts-expect-error distance must be a number
  useInfiniteScroll(divRef, syncLoader, { distance: 'far' })

  // @ts-expect-error unsupported target object
  useInfiniteScroll({ current: {} }, syncLoader)

  // @ts-expect-error loader must return void or Promise<void>
  useInfiniteScroll(divRef, () => 123)

  useInfiniteScroll(divRef, syncLoader, {
    // @ts-expect-error canLoadMore must return boolean
    canLoadMore: () => {
      return 'yes'
    },
  })

  // @ts-expect-error unknown option
  useInfiniteScroll(divRef, syncLoader, { once: true })
}
