import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import {
  isBrowserEnvironment,
  resolveLockElement,
  type StyleCapableElement,
  type UseScrollLockTarget,
} from './scrollLockHelpers'
import {
  acquireScrollLock,
  createScrollLockOwnerToken,
  releaseScrollLock,
} from './scrollLockRegistry'

export type { UseScrollLockTarget } from './scrollLockHelpers'

export interface UseScrollLockReturn {
  isLocked: boolean
  lock: () => void
  unlock: () => void
  toggle: () => void
}

/**
 * Locks scrolling on a target by applying inline `overflow: hidden`.
 *
 * `isLocked` is requested state for this hook instance. Multiple instances may
 * lock the same resolved element; the original inline overflow is restored only
 * when the final owner releases.
 *
 * After imperative `ref.current` assignment, a later React commit is required
 * before the lock can attach to the new target.
 */
export function useScrollLock<T extends UseScrollLockTarget = HTMLElement>(
  ref: RefObject<T | null>,
  initialLocked = false,
): UseScrollLockReturn {
  const [isLocked, setIsLocked] = useState(initialLocked)
  const [observedTarget, setObservedTarget] = useState<T | null>(null)

  const ownerTokenRef = useRef(createScrollLockOwnerToken())
  const heldElementRef = useRef<StyleCapableElement | null>(null)

  /* eslint-disable react-hooks/exhaustive-deps -- re-run after every commit; Object.is guards loops */
  useEffect(() => {
    const current = ref.current
    setObservedTarget((previous) =>
      Object.is(previous, current) ? previous : current,
    )
  })
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const owner = ownerTokenRef.current
    return () => {
      const held = heldElementRef.current
      if (held != null) {
        releaseScrollLock(held, owner)
        heldElementRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isBrowserEnvironment()) {
      return
    }

    const owner = ownerTokenRef.current
    const desiredElement = isLocked ? resolveLockElement(observedTarget) : null
    const heldElement = heldElementRef.current

    if (Object.is(heldElement, desiredElement)) {
      if (desiredElement != null) {
        acquireScrollLock(desiredElement, owner)
      }
      return
    }

    if (heldElement != null) {
      releaseScrollLock(heldElement, owner)
      heldElementRef.current = null
    }

    if (desiredElement != null) {
      const acquired = acquireScrollLock(desiredElement, owner)
      if (acquired) {
        heldElementRef.current = desiredElement
      }
    }
  }, [isLocked, observedTarget])

  const lock = useCallback(() => {
    setIsLocked((previous) => (previous ? previous : true))
  }, [])

  const unlock = useCallback(() => {
    setIsLocked((previous) => (previous ? false : previous))
  }, [])

  const toggle = useCallback(() => {
    setIsLocked((previous) => !previous)
  }, [])

  return {
    isLocked,
    lock,
    unlock,
    toggle,
  }
}
