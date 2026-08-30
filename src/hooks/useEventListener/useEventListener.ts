import { useEffect, useRef, useState, type RefObject } from 'react'

import { normalizeEventNames } from './normalizeEventNames'

export type UseEventListenerTarget<T extends EventTarget = EventTarget> =
  T | RefObject<T | null> | null

export type UseEventListenerHandler<E extends Event = Event> = (
  event: E,
) => void

export interface UseEventListenerOptions extends AddEventListenerOptions {
  enabled?: boolean
}

const DEFAULT_ENABLED = true
const DEFAULT_CAPTURE = false
const DEFAULT_PASSIVE = false
const DEFAULT_ONCE = false

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

function isEventNameArg(value: unknown): value is string | readonly string[] {
  return (
    typeof value === 'string' ||
    (Array.isArray(value) && value.every((entry) => typeof entry === 'string'))
  )
}

function toNativeListenerOptions(
  capture: boolean,
  passive: boolean,
  once: boolean,
  signal: AbortSignal | undefined,
): AddEventListenerOptions {
  const listenerOptions: AddEventListenerOptions = {
    capture,
    passive,
    once,
  }

  if (signal !== undefined) {
    listenerOptions.signal = signal
  }

  return listenerOptions
}

type CustomWindowName<N extends string> = N extends keyof WindowEventMap
  ? never
  : N

/**
 * Registers an event listener on a target (default: `window` when omitted).
 *
 * Explicit `null` registers nothing. Imperative changes to a target ref’s
 * `current` require a later React commit before the hook synchronizes.
 * Returns `void` — cleanup is owned by the effect; use `enabled` for control.
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K | readonly K[],
  handler: UseEventListenerHandler<WindowEventMap[K]>,
  options?: UseEventListenerOptions,
): void
export function useEventListener<E extends Event, N extends string = string>(
  eventName: CustomWindowName<N> | readonly CustomWindowName<N>[],
  handler: UseEventListenerHandler<E>,
  options?: UseEventListenerOptions,
): void
export function useEventListener<K extends keyof WindowEventMap>(
  target: Window | RefObject<Window | null> | null,
  eventName: K | readonly K[],
  handler: UseEventListenerHandler<WindowEventMap[K]>,
  options?: UseEventListenerOptions,
): void
export function useEventListener<K extends keyof DocumentEventMap>(
  target: Document | RefObject<Document | null> | null,
  eventName: K | readonly K[],
  handler: UseEventListenerHandler<DocumentEventMap[K]>,
  options?: UseEventListenerOptions,
): void
export function useEventListener<
  T extends HTMLElement,
  K extends keyof HTMLElementEventMap,
>(
  target: T | RefObject<T | null> | null,
  eventName: K | readonly K[],
  handler: UseEventListenerHandler<HTMLElementEventMap[K]>,
  options?: UseEventListenerOptions,
): void
export function useEventListener<
  T extends SVGElement,
  K extends keyof SVGElementEventMap,
>(
  target: T | RefObject<T | null> | null,
  eventName: K | readonly K[],
  handler: UseEventListenerHandler<SVGElementEventMap[K]>,
  options?: UseEventListenerOptions,
): void
export function useEventListener<K extends keyof MediaQueryListEventMap>(
  target: MediaQueryList | RefObject<MediaQueryList | null> | null,
  eventName: K | readonly K[],
  handler: UseEventListenerHandler<MediaQueryListEventMap[K]>,
  options?: UseEventListenerOptions,
): void
export function useEventListener<
  E extends Event,
  N extends string,
  T extends EventTarget,
>(
  target: T | RefObject<T | null> | null,
  eventName: N | readonly N[],
  handler: UseEventListenerHandler<
    T extends Window
      ? N extends keyof WindowEventMap
        ? WindowEventMap[N]
        : E
      : T extends Document
        ? N extends keyof DocumentEventMap
          ? DocumentEventMap[N]
          : E
        : T extends HTMLElement
          ? N extends keyof HTMLElementEventMap
            ? HTMLElementEventMap[N]
            : E
          : T extends SVGElement
            ? N extends keyof SVGElementEventMap
              ? SVGElementEventMap[N]
              : E
            : T extends MediaQueryList
              ? N extends keyof MediaQueryListEventMap
                ? MediaQueryListEventMap[N]
                : E
              : E
  >,
  options?: UseEventListenerOptions,
): void
export function useEventListener(
  targetOrEventName:
    string | readonly string[] | UseEventListenerTarget | undefined,
  eventNameOrHandler: string | readonly string[] | UseEventListenerHandler,
  handlerOrOptions?: UseEventListenerHandler | UseEventListenerOptions,
  maybeOptions?: UseEventListenerOptions,
): void {
  const windowForm = isEventNameArg(targetOrEventName)

  const targetOption: UseEventListenerTarget | undefined = windowForm
    ? undefined
    : (targetOrEventName as UseEventListenerTarget | undefined)
  const eventNameArg = (windowForm ? targetOrEventName : eventNameOrHandler) as
    string | readonly string[]
  const handler = (
    windowForm ? eventNameOrHandler : handlerOrOptions
  ) as UseEventListenerHandler
  const options = (windowForm ? handlerOrOptions : maybeOptions) as
    UseEventListenerOptions | undefined

  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const capture = options?.capture ?? DEFAULT_CAPTURE
  const passive = options?.passive ?? DEFAULT_PASSIVE
  const once = options?.once ?? DEFAULT_ONCE
  const signal = options?.signal

  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  const eventNames = normalizeEventNames(eventNameArg)
  const namesSerialized = JSON.stringify(eventNames)

  const targetRef =
    targetOption != null &&
    typeof targetOption === 'object' &&
    isTargetRefObject(targetOption)
      ? targetOption
      : null

  const [refTarget, setRefTarget] = useState<EventTarget | null>(null)

  // Sync mutable target refs after every commit.
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
    const names = JSON.parse(namesSerialized) as string[]

    if (!enabled || names.length === 0) {
      return
    }

    if (signal?.aborted) {
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
    const listenerOptions = toNativeListenerOptions(
      capture,
      passive,
      once,
      signal,
    )

    const onEvent = (event: Event) => {
      handlerRef.current(event)
    }

    for (const name of names) {
      target.addEventListener(name, onEvent, listenerOptions)
    }

    return () => {
      for (const name of names) {
        target.removeEventListener(name, onEvent, listenerOptions)
      }
    }
  }, [
    enabled,
    targetOption,
    targetRef,
    refTarget,
    namesSerialized,
    capture,
    passive,
    once,
    signal,
  ])
}
