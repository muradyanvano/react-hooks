import { expectTypeOf } from 'vitest'

import {
  useOnStartTyping,
  type UseOnStartTypingCharacterValidator,
  type UseOnStartTypingEditableDetector,
  type UseOnStartTypingHandler,
  type UseOnStartTypingOptions,
} from '../../index'
import {
  useOnStartTyping as useOnStartTypingLocal,
  type UseOnStartTypingHandler as LocalHandler,
} from './useOnStartTyping'

export function __typeTests(): void {
  const handler: UseOnStartTypingHandler = (event) => {
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>()
  }

  const validator: UseOnStartTypingCharacterValidator = (event) => {
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>()
    return true
  }

  const detector: UseOnStartTypingEditableDetector = () => true

  expectTypeOf(useOnStartTyping).toBeFunction()
  expectTypeOf(useOnStartTypingLocal).toEqualTypeOf(useOnStartTyping)
  expectTypeOf<LocalHandler>().toEqualTypeOf<UseOnStartTypingHandler>()

  expectTypeOf<UseOnStartTypingOptions>().toMatchTypeOf<{
    enabled?: boolean
    isTypedCharacterValid?: UseOnStartTypingCharacterValidator
    isFocusedElementEditable?: UseOnStartTypingEditableDetector
  }>()

  expectTypeOf(useOnStartTyping(handler)).toEqualTypeOf<void>()
  expectTypeOf(useOnStartTyping(handler, {})).toEqualTypeOf<void>()
  expectTypeOf(
    useOnStartTyping(handler, {
      enabled: true,
      isTypedCharacterValid: validator,
      isFocusedElementEditable: detector,
    }),
  ).toEqualTypeOf<void>()

  void validator
  void detector

  // @ts-expect-error non-function handler is rejected
  useOnStartTyping('handler')

  useOnStartTyping(handler, {
    // @ts-expect-error incompatible validator event type
    isTypedCharacterValid: (event: MouseEvent) => {
      void event
      return true
    },
  })

  useOnStartTyping(handler, {
    // @ts-expect-error validator must return boolean
    isTypedCharacterValid: () => 'yes',
  })

  useOnStartTyping(handler, {
    // @ts-expect-error editable detector must not require parameters
    isFocusedElementEditable: (element: Element) => {
      void element
      return true
    },
  })

  useOnStartTyping(handler, {
    // @ts-expect-error editable detector must return boolean
    isFocusedElementEditable: () => 'yes',
  })

  // @ts-expect-error arbitrary options are rejected
  useOnStartTyping(handler, { once: true })

  // @ts-expect-error invalid enabled value
  useOnStartTyping(handler, { enabled: 'yes' })
}
