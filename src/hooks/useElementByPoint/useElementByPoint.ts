import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import {
  areCoordinatesValid,
  cancelAnimationFrameSafe,
  elementsListEqual,
  EMPTY_ELEMENT_LIST,
  isElementByPointSupported,
  lookupElementAtPoint,
  resolveDocumentOption,
  scheduleAnimationFrame,
} from './elementByPointHelpers'

export type UseElementByPointScheduler = 'animationFrame' | 'sync'

export interface UseElementByPointOptions<Multiple extends boolean = false> {
  x: number
  y: number
  multiple?: Multiple
  enabled?: boolean
  document?: Document | null
  scheduler?: UseElementByPointScheduler
}

export interface UseElementByPointReturn<Multiple extends boolean = false> {
  element: Multiple extends true ? readonly Element[] : Element | null
  isSupported: boolean
  isPaused: boolean
  update: () => void
  pause: () => void
  resume: () => void
}

const DEFAULT_MULTIPLE = false
const DEFAULT_ENABLED = true
const DEFAULT_SCHEDULER: UseElementByPointScheduler = 'animationFrame'

type LookupResult = Element | null | readonly Element[]

function toMultipleResult(result: LookupResult): readonly Element[] {
  return Array.isArray(result) ? result : EMPTY_ELEMENT_LIST
}

function toSingleResult(result: LookupResult): Element | null {
  if (result == null || Array.isArray(result)) {
    return null
  }

  return result as Element
}

/**
 * Reactively resolves the DOM element or elements at viewport coordinates via
 * `elementFromPoint` / `elementsFromPoint`. Coordinates are client/viewport
 * space relative to the selected document.
 */
export function useElementByPoint(
  options: UseElementByPointOptions<false>,
): UseElementByPointReturn<false>
export function useElementByPoint(
  options: UseElementByPointOptions<true>,
): UseElementByPointReturn<true>
export function useElementByPoint(
  options: UseElementByPointOptions<boolean>,
): UseElementByPointReturn<boolean>
export function useElementByPoint(
  options: UseElementByPointOptions<boolean>,
): UseElementByPointReturn<boolean> {
  const multiple = options.multiple ?? DEFAULT_MULTIPLE
  const enabled = options.enabled ?? DEFAULT_ENABLED
  const scheduler = options.scheduler ?? DEFAULT_SCHEDULER
  const hasDocumentOption = 'document' in options

  const resolvedDocument = hasDocumentOption
    ? (options.document ?? null)
    : typeof document === 'undefined'
      ? null
      : document

  const isSupported = useSyncExternalStore(
    () => () => {},
    () => isElementByPointSupported(resolvedDocument, multiple),
    () => false,
  )

  const [singleElement, setSingleElement] = useState<Element | null>(null)
  const [multipleElements, setMultipleElements] =
    useState<readonly Element[]>(EMPTY_ELEMENT_LIST)
  const [isPaused, setIsPaused] = useState(false)

  const mountedRef = useRef(true)
  const isPausedRef = useRef(false)
  const frameIdRef = useRef<number | null>(null)
  const lookupGenerationRef = useRef(0)
  const frameWindowRef = useRef<Window | null>(null)

  const latestRef = useRef({
    x: options.x,
    y: options.y,
    multiple,
    enabled,
    scheduler,
    hasDocumentOption: 'document' in options,
    documentOption: options.document,
  })

  useEffect(() => {
    latestRef.current = {
      x: options.x,
      y: options.y,
      multiple,
      enabled,
      scheduler,
      hasDocumentOption: 'document' in options,
      documentOption: options.document,
    }
  })

  const resolveDocument = useCallback((): Document | null => {
    const latest = latestRef.current
    if (latest.hasDocumentOption) {
      return latest.documentOption ?? null
    }

    return resolveDocumentOption({})
  }, [])

  const applyEmptyResult = useCallback(() => {
    if (!mountedRef.current) {
      return
    }

    if (latestRef.current.multiple) {
      setMultipleElements((current) =>
        current.length === 0 ? current : EMPTY_ELEMENT_LIST,
      )
      return
    }

    setSingleElement((current) => (current == null ? current : null))
  }, [])

  const applyLookupResult = useCallback((result: LookupResult) => {
    if (!mountedRef.current) {
      return
    }

    if (latestRef.current.multiple) {
      const next = toMultipleResult(result)
      setMultipleElements((current) =>
        elementsListEqual(current, next) ? current : next,
      )
      return
    }

    const next = toSingleResult(result)
    setSingleElement((current) => (current === next ? current : next))
  }, [])

  const cancelScheduledLookup = useCallback(() => {
    cancelAnimationFrameSafe(frameWindowRef.current, frameIdRef.current)
    frameIdRef.current = null
    frameWindowRef.current = null
    lookupGenerationRef.current += 1
  }, [])

  const performLookup = useCallback((): void => {
    const latest = latestRef.current
    const doc = resolveDocument()

    if (!latest.enabled) {
      applyEmptyResult()
      return
    }

    if (!areCoordinatesValid(latest.x, latest.y)) {
      applyEmptyResult()
      return
    }

    if (!isElementByPointSupported(doc, latest.multiple)) {
      applyEmptyResult()
      return
    }

    const result = lookupElementAtPoint(
      doc as Document,
      latest.x,
      latest.y,
      latest.multiple,
    )
    applyLookupResult(result)
  }, [applyEmptyResult, applyLookupResult, resolveDocument])

  const runLookupImmediate = useCallback((): void => {
    cancelScheduledLookup()
    performLookup()
  }, [cancelScheduledLookup, performLookup])

  const scheduleLookup = useCallback((): void => {
    const latest = latestRef.current

    if (!latest.enabled || isPausedRef.current) {
      return
    }

    if (latest.scheduler === 'sync') {
      runLookupImmediate()
      return
    }

    const doc = resolveDocument()
    const targetWindow = doc?.defaultView ?? null
    const generation = ++lookupGenerationRef.current

    cancelAnimationFrameSafe(frameWindowRef.current, frameIdRef.current)
    frameIdRef.current = null

    const frameId = scheduleAnimationFrame(targetWindow, () => {
      if (
        !mountedRef.current ||
        generation !== lookupGenerationRef.current ||
        isPausedRef.current ||
        !latestRef.current.enabled
      ) {
        return
      }

      frameIdRef.current = null
      frameWindowRef.current = null
      performLookup()
    })

    if (frameId == null) {
      performLookup()
      return
    }

    frameIdRef.current = frameId
    frameWindowRef.current = targetWindow
  }, [performLookup, resolveDocument, runLookupImmediate])

  const update = useCallback((): void => {
    if (!latestRef.current.enabled || isPausedRef.current) {
      return
    }

    runLookupImmediate()
  }, [runLookupImmediate])

  const pause = useCallback((): void => {
    cancelScheduledLookup()
    isPausedRef.current = true
    if (mountedRef.current) {
      setIsPaused(true)
    }
  }, [cancelScheduledLookup])

  const resume = useCallback((): void => {
    isPausedRef.current = false
    if (mountedRef.current) {
      setIsPaused(false)
    }

    if (latestRef.current.enabled) {
      scheduleLookup()
    }
  }, [scheduleLookup])

  useEffect(() => {
    mountedRef.current = true

    if (!enabled) {
      applyEmptyResult()
      return () => {
        mountedRef.current = false
        cancelScheduledLookup()
      }
    }

    if (!isPausedRef.current) {
      scheduleLookup()
    }

    return () => {
      mountedRef.current = false
      cancelScheduledLookup()
    }
  }, [
    options.x,
    options.y,
    multiple,
    enabled,
    scheduler,
    hasDocumentOption,
    options.document,
    applyEmptyResult,
    cancelScheduledLookup,
    scheduleLookup,
  ])

  const element = multiple ? multipleElements : singleElement

  return useMemo(
    () => ({
      element,
      isSupported,
      isPaused,
      update,
      pause,
      resume,
    }),
    [element, isSupported, isPaused, update, pause, resume],
  ) as UseElementByPointReturn<boolean>
}
