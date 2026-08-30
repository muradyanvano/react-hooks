import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'

export interface UseOnElementRemovalOptions {
  enabled?: boolean
}

export type UseOnElementRemovalHandler<T extends Element = Element> = (
  element: T,
) => void

const DEFAULT_ENABLED = true

const ELEMENT_NODE = 1
const DOCUMENT_FRAGMENT_NODE = 11

function isRemovalOfTarget(removed: Node, target: Element): boolean {
  if (removed === target) {
    return true
  }

  if (
    removed.nodeType === ELEMENT_NODE ||
    removed.nodeType === DOCUMENT_FRAGMENT_NODE
  ) {
    return (removed as Element | DocumentFragment).contains(target)
  }

  return false
}

function recordsIncludeTargetRemoval(
  records: ReadonlyArray<MutationRecord>,
  target: Element,
): boolean {
  for (const record of records) {
    for (const removed of record.removedNodes) {
      if (isRemovalOfTarget(removed, target)) {
        return true
      }
    }
  }

  return false
}

/**
 * Calls `handler` when the referenced element is removed from its owning
 * document tree (directly or via an ancestor).
 *
 * Intended for removal performed outside React’s normal ownership flow, or
 * for observing an element from a component that remains mounted. It is not a
 * replacement for React effect cleanup: when the observing component unmounts,
 * React may disconnect the observer before an asynchronous mutation callback
 * runs.
 */
export function useOnElementRemoval<T extends Element>(
  ref: RefObject<T | null>,
  handler: UseOnElementRemovalHandler<T>,
  options?: UseOnElementRemovalOptions,
): void {
  const enabled = options?.enabled ?? DEFAULT_ENABLED

  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  })

  const [observedElement, setObservedElement] = useState<T | null>(null)

  // Sync the captured target after every commit. Mutable ref updates do not
  // appear in React deps; identity is compared before scheduling state.
  /* eslint-disable react-hooks/exhaustive-deps -- re-run after every commit; Object.is guards loops */
  useLayoutEffect(() => {
    const next = ref.current
    setObservedElement((previous) =>
      Object.is(previous, next) ? previous : next,
    )
  })
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!enabled) {
      return
    }

    const element = observedElement
    if (element == null || !element.isConnected) {
      return
    }

    const { ownerDocument } = element
    const view = ownerDocument.defaultView
    if (view == null || typeof view.MutationObserver !== 'function') {
      return
    }

    let completed = false
    const observer = new view.MutationObserver((records) => {
      if (completed || !recordsIncludeTargetRemoval(records, element)) {
        return
      }

      completed = true
      observer.disconnect()
      handlerRef.current(element)
    })

    observer.observe(ownerDocument, {
      childList: true,
      subtree: true,
    })

    return () => {
      completed = true
      observer.disconnect()
    }
  }, [enabled, observedElement])
}
