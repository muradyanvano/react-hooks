import { useEffect, useRef, useState } from 'react'

import {
  EMPTY_TEXT_SELECTION,
  readTextSelection,
  resolveTextSelectionWindow,
  textSelectionsAreEqual,
  type UseTextSelectionOptions,
  type UseTextSelectionReturn,
} from './textSelectionHelpers'

export type {
  UseTextSelectionOptions,
  UseTextSelectionReturn,
} from './textSelectionHelpers'

/**
 * Observes the native text selection in a window's document.
 *
 * The first render is empty so server rendering and hydration do not read
 * browser selection state. Omitted `window` resolves after mount; explicit
 * `window: null` observes nothing.
 */
export function useTextSelection(
  options?: UseTextSelectionOptions,
): UseTextSelectionReturn {
  const enabled = options?.enabled ?? true
  const windowOption = options?.window
  const [state, setState] =
    useState<UseTextSelectionReturn>(EMPTY_TEXT_SELECTION)
  const stateRef = useRef(state)
  const generationRef = useRef(0)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const generation = generationRef.current + 1
    generationRef.current = generation
    const win = resolveTextSelectionWindow(windowOption)
    const document = win?.document

    const setSelection = (next: UseTextSelectionReturn) => {
      if (textSelectionsAreEqual(stateRef.current, next)) {
        return
      }
      stateRef.current = next
      setState(next)
    }

    if (!enabled || win == null || document == null) {
      setSelection(EMPTY_TEXT_SELECTION)
      return
    }

    const onSelectionChange = () => {
      if (generationRef.current !== generation) {
        return
      }
      setSelection(readTextSelection(win))
    }

    document.addEventListener('selectionchange', onSelectionChange)
    // Clear any previous-window snapshot, then synchronize this document once.
    setSelection(EMPTY_TEXT_SELECTION)
    if (generationRef.current === generation) {
      onSelectionChange()
    }

    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      // Cleanup must not call getSelection().
    }
  }, [enabled, windowOption])

  return state
}
