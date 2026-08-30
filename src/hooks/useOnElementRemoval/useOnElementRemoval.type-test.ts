import { createRef, type RefObject } from 'react'
import { expectTypeOf } from 'vitest'

import {
  useOnElementRemoval,
  type UseOnElementRemovalHandler,
  type UseOnElementRemovalOptions,
} from '../../index'
import {
  useOnElementRemoval as useOnElementRemovalLocal,
  type UseOnElementRemovalHandler as LocalHandler,
} from './useOnElementRemoval'

export function __typeTests(): void {
  const divRef: RefObject<HTMLDivElement | null> = createRef<HTMLDivElement>()
  const buttonRef: RefObject<HTMLButtonElement | null> =
    createRef<HTMLButtonElement>()
  const svgRef: RefObject<SVGSVGElement | null> = createRef<SVGSVGElement>()
  const nullableRef: RefObject<HTMLDivElement | null> = { current: null }

  const divHandler: UseOnElementRemovalHandler<HTMLDivElement> = (element) => {
    expectTypeOf(element).toEqualTypeOf<HTMLDivElement>()
  }

  const buttonHandler: UseOnElementRemovalHandler<HTMLButtonElement> = (
    element,
  ) => {
    expectTypeOf(element).toEqualTypeOf<HTMLButtonElement>()
  }

  const svgHandler: UseOnElementRemovalHandler<SVGSVGElement> = (element) => {
    expectTypeOf(element).toEqualTypeOf<SVGSVGElement>()
  }

  expectTypeOf(useOnElementRemoval).toBeFunction()
  expectTypeOf(useOnElementRemovalLocal).toEqualTypeOf(useOnElementRemoval)
  expectTypeOf<LocalHandler<HTMLDivElement>>().toEqualTypeOf<
    UseOnElementRemovalHandler<HTMLDivElement>
  >()

  expectTypeOf<UseOnElementRemovalOptions>().toMatchTypeOf<{
    enabled?: boolean
  }>()

  expectTypeOf(useOnElementRemoval(divRef, divHandler)).toEqualTypeOf<void>()
  expectTypeOf(
    useOnElementRemoval(buttonRef, buttonHandler),
  ).toEqualTypeOf<void>()
  expectTypeOf(useOnElementRemoval(svgRef, svgHandler)).toEqualTypeOf<void>()
  expectTypeOf(
    useOnElementRemoval(nullableRef, divHandler),
  ).toEqualTypeOf<void>()
  expectTypeOf(
    useOnElementRemoval(divRef, divHandler, {}),
  ).toEqualTypeOf<void>()
  expectTypeOf(
    useOnElementRemoval(divRef, divHandler, { enabled: true }),
  ).toEqualTypeOf<void>()
  expectTypeOf(
    useOnElementRemoval(divRef, divHandler, { enabled: false }),
  ).toEqualTypeOf<void>()

  // Inference from the ref — no explicit generic required
  useOnElementRemoval(divRef, (element) => {
    expectTypeOf(element).toEqualTypeOf<HTMLDivElement>()
  })

  // @ts-expect-error non-element ref is rejected
  useOnElementRemoval(createRef<number>(), divHandler)

  // @ts-expect-error invalid enabled value
  useOnElementRemoval(divRef, divHandler, { enabled: 'yes' })

  // @ts-expect-error incorrect handler element type
  useOnElementRemoval(divRef, buttonHandler)

  // @ts-expect-error arbitrary options are rejected
  useOnElementRemoval(divRef, divHandler, { subtree: true })

  // @ts-expect-error missing handler argument
  useOnElementRemoval(divRef)
}
