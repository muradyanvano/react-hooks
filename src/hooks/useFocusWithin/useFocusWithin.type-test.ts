import { expectTypeOf } from 'vitest'

import {
  useFocusWithin,
  type UseFocusWithinOptions,
  type UseFocusWithinReturn,
} from '../../index'
import { useFocusWithin as useFocusWithinLocal } from './useFocusWithin'

export function __typeTests(): void {
  expectTypeOf(useFocusWithin).toBeFunction()
  expectTypeOf(useFocusWithinLocal).toEqualTypeOf(useFocusWithin)

  expectTypeOf<UseFocusWithinOptions>().toMatchTypeOf<{
    enabled?: boolean
  }>()

  expectTypeOf<UseFocusWithinReturn>().toMatchTypeOf<{
    focused: boolean
  }>()

  const formRef = { current: document.createElement('form') }
  const fieldsetRef = { current: document.createElement('fieldset') }
  const divRef = { current: document.createElement('div') }
  const sectionRef = { current: document.createElement('section') }
  const elementRef = { current: document.createElement('article') }
  const svgRef = {
    current: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
  }
  const nullRef = { current: null as HTMLFormElement | null }

  expectTypeOf(useFocusWithin(formRef).focused).toEqualTypeOf<boolean>()
  expectTypeOf(useFocusWithin(fieldsetRef).focused).toEqualTypeOf<boolean>()
  expectTypeOf(useFocusWithin(divRef).focused).toEqualTypeOf<boolean>()
  expectTypeOf(useFocusWithin(sectionRef).focused).toEqualTypeOf<boolean>()
  expectTypeOf(useFocusWithin(elementRef).focused).toEqualTypeOf<boolean>()
  expectTypeOf(useFocusWithin(svgRef).focused).toEqualTypeOf<boolean>()
  expectTypeOf(useFocusWithin(nullRef).focused).toEqualTypeOf<boolean>()

  const configured = useFocusWithin(formRef, { enabled: false })
  expectTypeOf(configured).toEqualTypeOf<UseFocusWithinReturn>()

  const readonlyReturn: Readonly<UseFocusWithinReturn> = configured
  void readonlyReturn

  // @ts-expect-error ref must be a RefObject
  useFocusWithin(document.createElement('form'))

  // @ts-expect-error invalid enabled type
  useFocusWithin(formRef, { enabled: 'yes' })

  // @ts-expect-error unknown option
  useFocusWithin(formRef, { once: true })

  // @ts-expect-error DocumentFragment is not a valid Element target
  useFocusWithin({ current: document.createDocumentFragment() })
}
