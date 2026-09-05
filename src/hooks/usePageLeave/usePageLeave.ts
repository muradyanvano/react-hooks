import { useEffect, useRef, useState } from 'react'

import {
  DEFAULT_ENABLED,
  DEFAULT_INITIAL_VALUE,
  isEventTargetLike,
  isQualifyingPageLeave,
  resolveEffectiveWindow,
  type UsePageLeaveOptions,
  type UsePageLeaveReturn,
} from './pageLeaveHelpers'

export type {
  UsePageLeaveOptions,
  UsePageLeaveReturn,
} from './pageLeaveHelpers'

type AttachedListeners = {
  onOut: (event: Event) => void
  onOver: (event: Event) => void
}

/**
 * Tracks whether the mouse pointer has left the observed browsing context.
 *
 * Listens for `mouseout` on the selected window and marks left only when
 * `event.relatedTarget == null` **and** the pointer has entered that window at
 * least once via `mouseover` since observation started. Load-time /
 * attach-time `mouseout` events (common with iframe `contentWindow`s) are
 * ignored until that first enter. `mouseover` marks re-entry. Internal
 * movement between descendants (including onto an iframe element that remains
 * inside the document) does not count as leaving.
 *
 * This is mouse-boundary state only — not blur, visibility, pagehide, unload,
 * touch, or navigation intent. Touch-only devices may never produce meaningful
 * leave state. Omitted `window` resolves after mount; explicit `null` never
 * falls back to the global window.
 *
 * Defaults: `enabled: true`, `initialValue: false`.
 */
export function usePageLeave(
  options?: UsePageLeaveOptions,
): UsePageLeaveReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const windowOption = options?.window

  const [hasLeft, setHasLeft] = useState(
    () => options?.initialValue ?? DEFAULT_INITIAL_VALUE,
  )

  const mountedRef = useRef(true)
  const hasLeftRef = useRef(hasLeft)
  const seenEnterRef = useRef(false)
  const lifecycleGenerationRef = useRef(0)
  const attachedWindowRef = useRef<Window | null>(null)
  const listenersRef = useRef<AttachedListeners | null>(null)

  useEffect(() => {
    hasLeftRef.current = hasLeft
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      lifecycleGenerationRef.current += 1
    }
  }, [])

  useEffect(() => {
    const generation = lifecycleGenerationRef.current

    const detach = () => {
      const win = attachedWindowRef.current
      const listeners = listenersRef.current
      if (win != null && listeners != null && isEventTargetLike(win)) {
        win.removeEventListener('mouseout', listeners.onOut)
        win.removeEventListener('mouseover', listeners.onOver)
      }
      attachedWindowRef.current = null
      listenersRef.current = null
    }

    if (!enabled) {
      detach()
      return detach
    }

    const win = resolveEffectiveWindow(windowOption)
    if (win == null || !isEventTargetLike(win)) {
      detach()
      return detach
    }

    if (attachedWindowRef.current === win && listenersRef.current != null) {
      return detach
    }

    detach()
    // Each observed window must see its own enter before leave can fire.
    // Preserves boolean state across replacement, but ignores attach-time
    // spurious mouseouts on the new realm.
    seenEnterRef.current = false

    const onMouseOut = (event: Event) => {
      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current ||
        attachedWindowRef.current !== win
      ) {
        return
      }

      if (!seenEnterRef.current) {
        return
      }

      if (!isQualifyingPageLeave(event)) {
        return
      }

      if (Object.is(hasLeftRef.current, true)) {
        return
      }

      hasLeftRef.current = true
      setHasLeft(true)
    }

    const onMouseOver = () => {
      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current ||
        attachedWindowRef.current !== win
      ) {
        return
      }

      seenEnterRef.current = true

      if (Object.is(hasLeftRef.current, false)) {
        return
      }

      hasLeftRef.current = false
      setHasLeft(false)
    }

    win.addEventListener('mouseout', onMouseOut)
    win.addEventListener('mouseover', onMouseOver)
    attachedWindowRef.current = win
    listenersRef.current = { onOut: onMouseOut, onOver: onMouseOver }

    return detach
  }, [enabled, windowOption])

  return hasLeft
}
