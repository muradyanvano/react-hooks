import {
  applyOverflowHidden,
  readOverflowSnapshot,
  restoreOverflowSnapshot,
  type OverflowSnapshot,
  type StyleCapableElement,
} from './scrollLockHelpers'

export type ScrollLockOwnerToken = symbol

interface ScrollLockRecord {
  owners: Set<ScrollLockOwnerToken>
  snapshot: OverflowSnapshot
  applied: boolean
}

const registry = new WeakMap<StyleCapableElement, ScrollLockRecord>()

export function createScrollLockOwnerToken(): ScrollLockOwnerToken {
  return Symbol('scroll-lock-owner')
}

/**
 * Acquires ownership of a lock on `element` for `owner`.
 * Returns true when this owner is now registered (applied or already owned).
 * Returns false when style application failed and ownership was not recorded.
 */
export function acquireScrollLock(
  element: StyleCapableElement,
  owner: ScrollLockOwnerToken,
): boolean {
  const existing = registry.get(element)
  if (existing != null) {
    if (existing.owners.has(owner)) {
      return true
    }

    existing.owners.add(owner)
    return true
  }

  const snapshot = readOverflowSnapshot(element)
  if (snapshot == null) {
    return false
  }

  const applied = applyOverflowHidden(element)
  if (!applied) {
    return false
  }

  registry.set(element, {
    owners: new Set([owner]),
    snapshot,
    applied: true,
  })

  return true
}

/**
 * Releases ownership for `owner`. Restores original overflow only when this
 * was the final owner. Unknown owners are ignored.
 */
export function releaseScrollLock(
  element: StyleCapableElement,
  owner: ScrollLockOwnerToken,
): void {
  const record = registry.get(element)
  if (record == null) {
    return
  }

  if (!record.owners.has(owner)) {
    return
  }

  record.owners.delete(owner)

  if (record.owners.size > 0) {
    return
  }

  registry.delete(element)
  restoreOverflowSnapshot(element, record.snapshot)
}

/** Test helper: whether the element currently has registry ownership. */
export function hasScrollLockOwners(element: StyleCapableElement): boolean {
  const record = registry.get(element)
  return record != null && record.owners.size > 0
}

/** Test helper: number of active owners for an element. */
export function getScrollLockOwnerCount(element: StyleCapableElement): number {
  return registry.get(element)?.owners.size ?? 0
}

/** Test helper: whether a specific owner currently holds the lock. */
export function ownerHoldsScrollLock(
  element: StyleCapableElement,
  owner: ScrollLockOwnerToken,
): boolean {
  return registry.get(element)?.owners.has(owner) ?? false
}
