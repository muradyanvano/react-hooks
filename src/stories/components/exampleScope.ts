import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

/**
 * Storybook-only coordination for examples that listen on the whole document
 * or window (typing intent, global shortcuts). A Docs page renders every story
 * of a hook into one document, so such examples would all react to the same
 * keystroke — the first registered one stealing focus or swallowing keys meant
 * for the rest of the page. On a page with several scoped examples, only the
 * example the reader last pressed or focused inside is active. A lone example
 * (story canvas, Vitest) is always active.
 */
type ScopeRegistry = {
  scopes: Set<HTMLElement>
  active: HTMLElement | null
  version: number
  subscribers: Set<() => void>
  detach: () => void
}

const registries = new WeakMap<Document, ScopeRegistry>()

function notify(registry: ScopeRegistry): void {
  registry.version += 1
  for (const subscriber of registry.subscribers) {
    subscriber()
  }
}

function getRegistry(ownerDocument: Document): ScopeRegistry {
  const existing = registries.get(ownerDocument)
  if (existing != null) {
    return existing
  }

  const registry: ScopeRegistry = {
    scopes: new Set(),
    active: null,
    version: 0,
    subscribers: new Set(),
    detach: () => undefined,
  }

  const onInteraction = (event: Event) => {
    const target = event.target
    let next: HTMLElement | null = null
    if (target != null && typeof (target as Node).nodeType === 'number') {
      for (const scope of registry.scopes) {
        if (scope.contains(target as Node)) {
          next = scope
          break
        }
      }
    }
    if (next !== registry.active) {
      registry.active = next
      notify(registry)
    }
  }

  ownerDocument.addEventListener('pointerdown', onInteraction, true)
  ownerDocument.addEventListener('focusin', onInteraction, true)
  registry.detach = () => {
    ownerDocument.removeEventListener('pointerdown', onInteraction, true)
    ownerDocument.removeEventListener('focusin', onInteraction, true)
  }
  registries.set(ownerDocument, registry)
  return registry
}

function register(element: HTMLElement): () => void {
  const ownerDocument = element.ownerDocument
  const registry = getRegistry(ownerDocument)
  registry.scopes.add(element)
  notify(registry)

  return () => {
    registry.scopes.delete(element)
    if (registry.active === element) {
      registry.active = null
    }
    if (registry.scopes.size === 0) {
      registry.detach()
      registries.delete(ownerDocument)
    }
    notify(registry)
  }
}

export type ExampleScope = {
  /** Attach to the example root (`ExampleShowcase` does this via `scope`). */
  ref: (element: HTMLElement | null) => void
  /** Whether document/window-level listeners of this example should run. */
  active: boolean
  /** True when other scoped examples share this document (Docs pages). */
  shared: boolean
}

const noopSubscribe = () => () => undefined

export function useExampleScope(): ExampleScope {
  const [element, setElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (element == null) {
      return undefined
    }
    return register(element)
  }, [element])

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (element == null) {
        return noopSubscribe()
      }
      const registry = getRegistry(element.ownerDocument)
      registry.subscribers.add(onChange)
      return () => {
        registry.subscribers.delete(onChange)
      }
    },
    [element],
  )

  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      if (element == null) {
        return 'detached'
      }
      const registry = registries.get(element.ownerDocument)
      if (registry == null || !registry.scopes.has(element)) {
        return 'detached'
      }
      if (registry.scopes.size === 1) {
        return 'solo'
      }
      return registry.active === element ? 'shared-active' : 'shared-idle'
    },
    () => 'detached',
  )

  return {
    ref: setElement,
    active: snapshot === 'solo' || snapshot === 'shared-active',
    shared: snapshot === 'shared-active' || snapshot === 'shared-idle',
  }
}

/**
 * Keys such as Enter, Space, and arrows have native meaning on buttons, links,
 * and form fields. Global shortcut handlers should leave those targets alone
 * instead of calling `preventDefault()` on them.
 */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  // Structural check: targets may come from another realm (iframe documents).
  const element = target as Partial<Element> | null
  if (element == null || typeof element.closest !== 'function') {
    return false
  }
  return (
    element.closest(
      'a[href], button, input, select, textarea, summary, [contenteditable=""], [contenteditable="true"], [role="button"], [role="link"], [role="textbox"], [role="combobox"], [role="slider"], [role="tab"], [role="menuitem"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"]',
    ) != null
  )
}
