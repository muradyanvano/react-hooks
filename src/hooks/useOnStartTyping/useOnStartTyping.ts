import { useEffect, useRef } from 'react'

import {
  isDefaultTypedCharacterValid,
  isFocusedElementEditable as defaultIsFocusedElementEditable,
} from './isFocusedElementEditable'

export type UseOnStartTypingHandler = (event: KeyboardEvent) => void

export type UseOnStartTypingCharacterValidator = (
  event: KeyboardEvent,
) => boolean

export type UseOnStartTypingEditableDetector = () => boolean

export interface UseOnStartTypingOptions {
  enabled?: boolean
  isTypedCharacterValid?: UseOnStartTypingCharacterValidator
  isFocusedElementEditable?: UseOnStartTypingEditableDetector
}

const DEFAULT_ENABLED = true

function isKeyboardEventLike(event: Event): event is KeyboardEvent {
  return typeof (event as KeyboardEvent).key === 'string'
}

/**
 * Calls `handler` when the user begins typing while focus is outside an
 * editable element. Default matching is ASCII letters and digits only.
 *
 * Does not call `preventDefault` — consumers may want the initial character to
 * continue into a newly focused input.
 */
export function useOnStartTyping(
  handler: UseOnStartTypingHandler,
  options?: UseOnStartTypingOptions,
): void {
  const enabled = options?.enabled ?? DEFAULT_ENABLED

  const latestRef = useRef({
    handler,
    isTypedCharacterValid:
      options?.isTypedCharacterValid ?? isDefaultTypedCharacterValid,
    isFocusedElementEditable:
      options?.isFocusedElementEditable ?? defaultIsFocusedElementEditable,
  })

  useEffect(() => {
    latestRef.current = {
      handler,
      isTypedCharacterValid:
        options?.isTypedCharacterValid ?? isDefaultTypedCharacterValid,
      isFocusedElementEditable:
        options?.isFocusedElementEditable ?? defaultIsFocusedElementEditable,
    }
  })

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (typeof document === 'undefined') {
      return
    }

    const onKeyDown = (event: Event) => {
      if (!isKeyboardEventLike(event)) {
        return
      }

      const latest = latestRef.current

      if (latest.isFocusedElementEditable()) {
        return
      }

      if (!latest.isTypedCharacterValid(event)) {
        return
      }

      latest.handler(event)
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [enabled])
}
