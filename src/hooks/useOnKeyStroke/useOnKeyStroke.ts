import { useEffect, useRef, useState, type RefObject } from 'react'

export type KeyStrokeEventType = 'keydown' | 'keyup'

export type KeyStrokePredicate = (event: KeyboardEvent) => boolean

export type KeyStrokeFilter =
  true | string | readonly string[] | KeyStrokePredicate

export type KeyStrokeTarget = EventTarget | RefObject<EventTarget | null> | null

export type UseOnKeyStrokeHandler = (event: KeyboardEvent) => void

export interface UseOnKeyStrokeOptions {
  enabled?: boolean
  eventType?: KeyStrokeEventType
  target?: KeyStrokeTarget
  dedupe?: boolean
  capture?: boolean
  passive?: boolean
}

const DEFAULT_ENABLED = true
const DEFAULT_EVENT_TYPE: KeyStrokeEventType = 'keydown'
const DEFAULT_DEDUPE = false
const DEFAULT_CAPTURE = false
const DEFAULT_PASSIVE = false

function isEventTargetLike(value: unknown): value is EventTarget {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as EventTarget).addEventListener === 'function' &&
    typeof (value as EventTarget).removeEventListener === 'function'
  )
}

function isTargetRefObject(
  value: object,
): value is RefObject<EventTarget | null> {
  return 'current' in value && !isEventTargetLike(value)
}

function isKeyboardEventLike(event: Event): event is KeyboardEvent {
  return typeof (event as KeyboardEvent).key === 'string'
}

function matchesFilter(filter: KeyStrokeFilter, event: KeyboardEvent): boolean {
  if (filter === true) {
    return true
  }

  if (typeof filter === 'string') {
    return event.key === filter
  }

  if (typeof filter === 'function') {
    return filter(event)
  }

  for (const key of filter) {
    if (event.key === key) {
      return true
    }
  }

  return false
}

/**
 * Registers a keyboard listener for matching key strokes.
 *
 * Default target is `window` when `target` is omitted. Explicit `target: null`
 * registers nothing. Imperative changes to a target ref’s `current` require a
 * later React commit before the hook synchronizes the new target.
 */
export function useOnKeyStroke(
  key: KeyStrokeFilter,
  handler: UseOnKeyStrokeHandler,
  options?: UseOnKeyStrokeOptions,
): void {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const eventType = options?.eventType ?? DEFAULT_EVENT_TYPE
  const capture = options?.capture ?? DEFAULT_CAPTURE
  const passive = options?.passive ?? DEFAULT_PASSIVE
  const targetOption = options?.target
  const dedupe = options?.dedupe ?? DEFAULT_DEDUPE

  const latestRef = useRef({
    key,
    handler,
    dedupe,
  })

  useEffect(() => {
    latestRef.current = {
      key,
      handler,
      dedupe,
    }
  })

  const targetRef =
    targetOption != null &&
    typeof targetOption === 'object' &&
    isTargetRefObject(targetOption)
      ? targetOption
      : null

  const [refTarget, setRefTarget] = useState<EventTarget | null>(null)

  // Sync mutable target refs after every commit. setState from ref.current is
  // allowed by react-hooks/set-state-in-effect; identity is compared before update.
  /* eslint-disable react-hooks/exhaustive-deps -- re-run after every commit; Object.is guards loops */
  useEffect(() => {
    if (targetRef == null) {
      return
    }

    const current = targetRef.current
    const next = isEventTargetLike(current) ? current : null
    setRefTarget((previous) => (Object.is(previous, next) ? previous : next))
  })
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!enabled) {
      return
    }

    let resolved: EventTarget | null = null

    if (targetOption === undefined) {
      resolved =
        typeof window !== 'undefined' && isEventTargetLike(window)
          ? window
          : null
    } else if (targetOption === null) {
      resolved = null
    } else if (isEventTargetLike(targetOption)) {
      resolved = targetOption
    } else if (targetRef != null) {
      resolved = refTarget
    }

    if (!isEventTargetLike(resolved)) {
      return
    }

    const target = resolved
    const listenerOptions: AddEventListenerOptions = {
      capture,
      passive,
    }

    const onEvent = (event: Event) => {
      if (!isKeyboardEventLike(event)) {
        return
      }

      const latest = latestRef.current
      if (latest.dedupe && event.repeat) {
        return
      }

      if (!matchesFilter(latest.key, event)) {
        return
      }

      latest.handler(event)
    }

    target.addEventListener(eventType, onEvent, listenerOptions)

    return () => {
      target.removeEventListener(eventType, onEvent, listenerOptions)
    }
  }, [enabled, targetOption, targetRef, refTarget, eventType, capture, passive])
}
