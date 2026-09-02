import { expectTypeOf } from 'vitest'

import {
  useFocus,
  type UseFocusOptions,
  type UseFocusReturn,
  type UseFocusTarget,
} from '../../index'
import { useFocus as useFocusLocal } from './useFocus'

export function __typeTests(): void {
  expectTypeOf(useFocus).toBeFunction()
  expectTypeOf(useFocusLocal).toEqualTypeOf(useFocus)

  expectTypeOf<UseFocusTarget>().toEqualTypeOf<HTMLElement | SVGElement>()

  expectTypeOf<UseFocusOptions>().toMatchTypeOf<{
    enabled?: boolean
    initialValue?: boolean
    focusVisible?: boolean
    preventScroll?: boolean
  }>()

  expectTypeOf<UseFocusReturn>().toMatchTypeOf<{
    focused: boolean
    focus: () => void
    blur: () => void
  }>()

  const inputRef = { current: document.createElement('input') }
  const result = useFocus(inputRef)
  expectTypeOf(result.focused).toEqualTypeOf<boolean>()
  expectTypeOf(result.focus).toEqualTypeOf<() => void>()
  expectTypeOf(result.blur).toEqualTypeOf<() => void>()

  const textareaRef = { current: document.createElement('textarea') }
  expectTypeOf(useFocus(textareaRef).focused).toEqualTypeOf<boolean>()

  const selectRef = { current: document.createElement('select') }
  expectTypeOf(useFocus(selectRef).focused).toEqualTypeOf<boolean>()

  const buttonRef = { current: document.createElement('button') }
  expectTypeOf(useFocus(buttonRef).focused).toEqualTypeOf<boolean>()

  const anchorRef = { current: document.createElement('a') }
  expectTypeOf(useFocus(anchorRef).focused).toEqualTypeOf<boolean>()

  const divRef = { current: document.createElement('div') }
  expectTypeOf(useFocus(divRef).focused).toEqualTypeOf<boolean>()

  const svgRef = {
    current: document.createElementNS('http://www.w3.org/2000/svg', 'circle'),
  }
  expectTypeOf(useFocus(svgRef).focused).toEqualTypeOf<boolean>()

  const nullRef = { current: null as HTMLInputElement | null }
  expectTypeOf(useFocus(nullRef).focused).toEqualTypeOf<boolean>()

  const genericRef = {
    current: document.createElement('button') as UseFocusTarget | null,
  }
  expectTypeOf(useFocus(genericRef).focused).toEqualTypeOf<boolean>()

  const configured = useFocus(inputRef, {
    enabled: false,
    initialValue: true,
    focusVisible: true,
    preventScroll: true,
  })
  expectTypeOf(configured).toEqualTypeOf<UseFocusReturn>()
  void configured

  // @ts-expect-error ref must be a RefObject
  useFocus(document.createElement('input'))

  // @ts-expect-error invalid enabled type
  useFocus(inputRef, { enabled: 'yes' })

  // @ts-expect-error invalid initialValue type
  useFocus(inputRef, { initialValue: 'yes' })

  // @ts-expect-error invalid focusVisible type
  useFocus(inputRef, { focusVisible: 'yes' })

  // @ts-expect-error invalid preventScroll type
  useFocus(inputRef, { preventScroll: 'yes' })

  // @ts-expect-error unknown option
  useFocus(inputRef, { once: true })
}
