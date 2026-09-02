import { useEffect, useRef, useState, type RefObject } from 'react'

import {
  copyPosition,
  defaultEventFilter,
  getScrollOffsets,
  isBuiltInCoordinateType,
  isEventTargetLike,
  isMouseEventLike,
  isTargetRefObject,
  isTouchEventLike,
  isUseMouseTarget,
  positionsEqual,
  readBuiltInCoordinates,
  readClientCoordinates,
  resolveDefaultWindow,
  resolveOwningWindow,
  selectTouch,
  type UseMouseCoordinateType,
  type UseMouseEventExtractor,
  type UseMouseEventFilter,
  type UseMousePosition,
  type UseMouseSourceType,
  type UseMouseTarget,
} from './mouseHelpers'

export type {
  UseMouseCoordinateType,
  UseMouseEventExtractor,
  UseMouseEventFilter,
  UseMousePosition,
  UseMouseSourceType,
  UseMouseTarget,
} from './mouseHelpers'

export interface UseMouseOptions {
  enabled?: boolean
  type?: UseMouseCoordinateType | UseMouseEventExtractor
  target?: UseMouseTarget | RefObject<UseMouseTarget | null> | null
  touch?: boolean
  scroll?: boolean
  resetOnTouchEnd?: boolean
  initialValue?: UseMousePosition
  eventFilter?: UseMouseEventFilter
}

export interface UseMouseReturn {
  x: number
  y: number
  sourceType: UseMouseSourceType
}

const DEFAULT_ENABLED = true
const DEFAULT_TYPE: UseMouseCoordinateType = 'page'
const DEFAULT_TOUCH = true
const DEFAULT_SCROLL = true
const DEFAULT_RESET_ON_TOUCH_END = false

type MouseState = UseMouseReturn

type LastClientPosition = {
  x: number
  y: number
  recorded: boolean
}

/**
 * Tracks mouse and optional touch coordinates for a target.
 *
 * Omitted `target` resolves to `window` inside an effect. Explicit
 * `target: null` registers nothing. Imperative changes to a target ref’s
 * `current` require a later React commit before the hook synchronizes.
 */
export function useMouse(options?: UseMouseOptions): UseMouseReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const typeOption = options?.type ?? DEFAULT_TYPE
  const touch = options?.touch ?? DEFAULT_TOUCH
  const scroll = options?.scroll ?? DEFAULT_SCROLL
  const targetOption = options?.target
  const typeKey = typeof typeOption === 'function' ? 'custom' : typeOption
  const needsScroll = scroll && typeKey === 'page'

  const [state, setState] = useState<MouseState>(() => {
    const initial = copyPosition(options?.initialValue)
    return {
      x: initial.x,
      y: initial.y,
      sourceType: null,
    }
  })

  const mountedRef = useRef(true)
  const lifecycleGenerationRef = useRef(0)
  const lastClientRef = useRef<LastClientPosition>({
    x: 0,
    y: 0,
    recorded: false,
  })
  const stateRef = useRef(state)

  const latestRef = useRef({
    type: typeOption,
    resetOnTouchEnd: options?.resetOnTouchEnd ?? DEFAULT_RESET_ON_TOUCH_END,
    initialValue: copyPosition(options?.initialValue),
    eventFilter: options?.eventFilter ?? defaultEventFilter,
  })

  useEffect(() => {
    latestRef.current = {
      type: typeOption,
      resetOnTouchEnd: options?.resetOnTouchEnd ?? DEFAULT_RESET_ON_TOUCH_END,
      initialValue: copyPosition(options?.initialValue),
      eventFilter: options?.eventFilter ?? defaultEventFilter,
    }
  })

  useEffect(() => {
    stateRef.current = state
  })

  const targetRef =
    targetOption != null &&
    typeof targetOption === 'object' &&
    isTargetRefObject(targetOption)
      ? targetOption
      : null

  const [refTarget, setRefTarget] = useState<UseMouseTarget | null>(null)

  /* eslint-disable react-hooks/exhaustive-deps -- re-run after every commit; Object.is guards loops */
  useEffect(() => {
    if (targetRef == null) {
      return
    }

    const current = targetRef.current
    const next = isUseMouseTarget(current) ? current : null
    setRefTarget((previous) => (Object.is(previous, next) ? previous : next))
  })
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      lifecycleGenerationRef.current += 1
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      lifecycleGenerationRef.current += 1
      return
    }

    let resolved: UseMouseTarget | null = null

    if (targetOption === undefined) {
      resolved = resolveDefaultWindow()
    } else if (targetOption === null) {
      resolved = null
    } else if (isUseMouseTarget(targetOption)) {
      resolved = targetOption
    } else if (targetRef != null) {
      resolved = refTarget
    }

    if (!isEventTargetLike(resolved) || !isUseMouseTarget(resolved)) {
      lifecycleGenerationRef.current += 1
      return
    }

    const target = resolved
    const owningWindow = resolveOwningWindow(target)
    const listenerOptions: AddEventListenerOptions = { passive: true }
    const generation = lifecycleGenerationRef.current

    const commitState = (next: MouseState) => {
      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current
      ) {
        return
      }

      if (positionsEqual(stateRef.current, next)) {
        return
      }

      stateRef.current = next
      setState(next)
    }

    const extractCoordinates = (
      source: MouseEvent | Touch,
    ): readonly [number, number] | null | undefined => {
      const latestType = latestRef.current.type

      if (typeof latestType === 'function') {
        try {
          return latestType(source)
        } catch {
          return undefined
        }
      }

      if (!isBuiltInCoordinateType(latestType)) {
        return null
      }

      return readBuiltInCoordinates(latestType, source)
    }

    const applyPointerUpdate = (
      source: MouseEvent | Touch,
      sourceType: Exclude<UseMouseSourceType, null>,
    ) => {
      const coordinates = extractCoordinates(source)
      if (coordinates == null) {
        return
      }

      const [x, y] = coordinates
      const [clientX, clientY] = readClientCoordinates(source)
      lastClientRef.current = {
        x: clientX,
        y: clientY,
        recorded: true,
      }

      commitState({ x, y, sourceType })
    }

    const createFilteredInvoker = (
      event: MouseEvent | TouchEvent,
      apply: () => void,
    ) => {
      let applied = false
      const invoke = () => {
        if (applied) {
          return
        }

        if (
          !mountedRef.current ||
          generation !== lifecycleGenerationRef.current ||
          !latestRef.current
        ) {
          return
        }

        applied = true
        apply()
      }

      try {
        latestRef.current.eventFilter(invoke, event)
      } catch {
        // Preserve previous state; do not surface filter errors.
      }
    }

    const onMouseOrDrag = (event: Event) => {
      if (!isMouseEventLike(event)) {
        return
      }

      createFilteredInvoker(event, () => {
        applyPointerUpdate(event, 'mouse')
      })
    }

    const onTouchStartOrMove = (event: Event) => {
      if (!isTouchEventLike(event)) {
        return
      }

      const latestType = latestRef.current.type
      if (typeof latestType !== 'function' && latestType === 'movement') {
        return
      }

      createFilteredInvoker(event, () => {
        const touchPoint = selectTouch(event)
        if (touchPoint == null) {
          return
        }

        applyPointerUpdate(touchPoint, 'touch')
      })
    }

    const onTouchEndOrCancel = (event: Event) => {
      if (!isTouchEventLike(event)) {
        return
      }

      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current
      ) {
        return
      }

      if (event.touches.length > 0) {
        const remaining = selectTouch(event)
        if (remaining == null) {
          return
        }

        const latestType = latestRef.current.type
        if (typeof latestType !== 'function' && latestType === 'movement') {
          return
        }

        applyPointerUpdate(remaining, 'touch')
        return
      }

      if (!latestRef.current.resetOnTouchEnd) {
        return
      }

      const initial = latestRef.current.initialValue
      lastClientRef.current = {
        x: 0,
        y: 0,
        recorded: false,
      }
      commitState({
        x: initial.x,
        y: initial.y,
        sourceType: null,
      })
    }

    const onScroll = () => {
      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current ||
        !lastClientRef.current.recorded ||
        owningWindow == null
      ) {
        return
      }

      const latestType = latestRef.current.type
      if (typeof latestType === 'function' || latestType !== 'page') {
        return
      }

      const { scrollX, scrollY } = getScrollOffsets(owningWindow)
      const next: MouseState = {
        x: lastClientRef.current.x + scrollX,
        y: lastClientRef.current.y + scrollY,
        sourceType: stateRef.current.sourceType,
      }
      commitState(next)
    }

    target.addEventListener('mousemove', onMouseOrDrag, listenerOptions)
    target.addEventListener('dragover', onMouseOrDrag, listenerOptions)

    if (touch) {
      target.addEventListener('touchstart', onTouchStartOrMove, listenerOptions)
      target.addEventListener('touchmove', onTouchStartOrMove, listenerOptions)
      target.addEventListener('touchend', onTouchEndOrCancel, listenerOptions)
      target.addEventListener(
        'touchcancel',
        onTouchEndOrCancel,
        listenerOptions,
      )
    }

    if (needsScroll && owningWindow != null) {
      owningWindow.addEventListener('scroll', onScroll, listenerOptions)
    }

    return () => {
      lifecycleGenerationRef.current += 1
      target.removeEventListener('mousemove', onMouseOrDrag, listenerOptions)
      target.removeEventListener('dragover', onMouseOrDrag, listenerOptions)

      if (touch) {
        target.removeEventListener(
          'touchstart',
          onTouchStartOrMove,
          listenerOptions,
        )
        target.removeEventListener(
          'touchmove',
          onTouchStartOrMove,
          listenerOptions,
        )
        target.removeEventListener(
          'touchend',
          onTouchEndOrCancel,
          listenerOptions,
        )
        target.removeEventListener(
          'touchcancel',
          onTouchEndOrCancel,
          listenerOptions,
        )
      }

      if (needsScroll && owningWindow != null) {
        owningWindow.removeEventListener('scroll', onScroll, listenerOptions)
      }
    }
  }, [enabled, touch, needsScroll, targetOption, targetRef, refTarget, typeKey])

  return state
}
