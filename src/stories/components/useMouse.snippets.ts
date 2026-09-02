export const basicUsageSnippet = `import { useMouse } from '@muradyanvano/react-hooks'

export function PointerCoordinates() {
  const { x, y, sourceType } = useMouse()

  return (
    <p>
      x: {x}, y: {y}, source: {sourceType ?? 'idle'}
    </p>
  )
}`

export const customExtractorSnippet = `import { useRef } from 'react'
import {
  useMouse,
  type UseMouseEventExtractor,
} from '@muradyanvano/react-hooks'

export function ElementRelativeTracker() {
  const surfaceRef = useRef<HTMLDivElement>(null)

  const extractor: UseMouseEventExtractor = (event) => {
    const view =
      'view' in event && event.view != null
        ? event.view
        : typeof window !== 'undefined'
          ? window
          : null
    const MouseEventCtor =
      view != null && 'MouseEvent' in view
        ? view.MouseEvent
        : typeof MouseEvent !== 'undefined'
          ? MouseEvent
          : null

    if (MouseEventCtor == null || !(event instanceof MouseEventCtor)) {
      return null
    }

    const target = surfaceRef.current
    if (target == null) {
      return null
    }

    const rect = target.getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }

  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    type: extractor,
    touch: false,
  })

  return (
    <div
      ref={surfaceRef}
      style={{
        position: 'relative',
        height: 240,
        border: '1px solid #cbd5e1',
      }}
    >
      <p>
        offset x: {x}, y: {y}, source: {sourceType ?? 'idle'}
      </p>
    </div>
  )
}`

export const coordinateSystemsSnippet = `import { useMouse } from '@muradyanvano/react-hooks'

export function CoordinateSystems() {
  const page = useMouse({ type: 'page' })
  const client = useMouse({ type: 'client' })
  const screen = useMouse({ type: 'screen' })
  const movement = useMouse({ type: 'movement' })

  return (
    <ul>
      <li>page: {page.x}, {page.y}</li>
      <li>client: {client.x}, {client.y}</li>
      <li>screen: {screen.x}, {screen.y}</li>
      <li>movement (latest delta): {movement.x}, {movement.y}</li>
    </ul>
  )
}`

export const touchTrackingSnippet = `import { useRef } from 'react'
import { useMouse } from '@muradyanvano/react-hooks'

export function TouchTracking() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    touch: true,
    resetOnTouchEnd: true,
    initialValue: { x: 0, y: 0 },
  })

  return (
    <div
      ref={surfaceRef}
      style={{ height: 220, touchAction: 'none', border: '1px solid #cbd5e1' }}
    >
      <p>
        {x}, {y} — {sourceType ?? 'idle'}
      </p>
    </div>
  )
}`

export const mouseOnlySnippet = `import { useRef } from 'react'
import { useMouse } from '@muradyanvano/react-hooks'

export function MouseOnly() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    touch: false,
  })

  return (
    <div ref={surfaceRef} style={{ height: 200, border: '1px solid #cbd5e1' }}>
      <p>
        {x}, {y} — {sourceType ?? 'idle'}
      </p>
    </div>
  )
}`

export const dragTrackingSnippet = `import { useRef } from 'react'
import { useMouse } from '@muradyanvano/react-hooks'

export function DragTracking() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const { x, y, sourceType } = useMouse({
    target: zoneRef,
    type: 'client',
  })

  return (
    <div
      ref={zoneRef}
      onDragOver={(event) => {
        event.preventDefault()
      }}
      style={{ minHeight: 200, border: '1px dashed #64748b' }}
    >
      <div draggable style={{ padding: 12, background: '#e2e8f0' }}>
        Drag me across the zone
      </div>
      <p>
        {x}, {y} — {sourceType ?? 'idle'}
      </p>
    </div>
  )
}`

export const pageScrollingSnippet = `import { useEffect, useRef, useState } from 'react'
import { useMouse } from '@muradyanvano/react-hooks'

export function PageScrollingDemo() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)

  useEffect(() => {
    const frame = iframeRef.current
    if (frame == null) {
      return
    }

    const onLoad = () => {
      setDoc(frame.contentDocument)
    }

    frame.addEventListener('load', onLoad)
    if (frame.contentDocument?.readyState === 'complete') {
      onLoad()
    }

    return () => {
      frame.removeEventListener('load', onLoad)
    }
  }, [])

  const { x, y, sourceType } = useMouse({
    target: doc,
    type: 'page',
    scroll: true,
  })

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Isolated scroll document"
        srcDoc="<body style='height:2000px;margin:0;font-family:sans-serif'><p style='padding:16px'>Move, then scroll inside this frame.</p></body>"
        style={{ width: '100%', height: 220, border: '1px solid #cbd5e1' }}
      />
      <p>
        page: {x}, {y} — {sourceType ?? 'idle'}
      </p>
    </>
  )
}`

export const customTargetSnippet = `import { useRef } from 'react'
import { useMouse } from '@muradyanvano/react-hooks'

export function CustomTarget() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { x, y, sourceType } = useMouse({ target: surfaceRef })

  return (
    <div ref={surfaceRef} style={{ height: 200, border: '1px solid #cbd5e1' }}>
      Events outside this box do not update {x}, {y} ({sourceType ?? 'idle'}).
    </div>
  )
}`

export const dynamicTargetSnippet = `import { useRef, useState } from 'react'
import { useMouse } from '@muradyanvano/react-hooks'

export function DynamicTarget() {
  const aRef = useRef<HTMLDivElement>(null)
  const bRef = useRef<HTMLDivElement>(null)
  const [useA, setUseA] = useState(true)
  const { x, y, sourceType } = useMouse({
    target: useA ? aRef : bRef,
  })

  return (
    <>
      <button type="button" onClick={() => setUseA((value) => !value)}>
        Switch target
      </button>
      <div ref={aRef} style={{ height: 120, border: '1px solid #94a3b8' }}>
        Surface A
      </div>
      <div ref={bRef} style={{ height: 120, border: '1px solid #94a3b8' }}>
        Surface B
      </div>
      <p>
        {x}, {y} — {sourceType ?? 'idle'}
      </p>
    </>
  )
}`

export const filteredUpdatesSnippet = `import { useEffect, useRef } from 'react'
import {
  useMouse,
  type UseMouseEventFilter,
} from '@muradyanvano/react-hooks'

export function FilteredUpdates() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const eventFilter: UseMouseEventFilter = (invoke) => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current)
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      invoke()
    })
  }

  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    eventFilter,
  })

  return (
    <div ref={surfaceRef} style={{ height: 200, border: '1px solid #cbd5e1' }}>
      <p>
        rAF-filtered: {x}, {y} — {sourceType ?? 'idle'}
      </p>
    </div>
  )
}`

export const enabledStateSnippet = `import { useState } from 'react'
import { useMouse } from '@muradyanvano/react-hooks'

export function EnabledState() {
  const [enabled, setEnabled] = useState(true)
  const { x, y, sourceType } = useMouse({ enabled })

  return (
    <>
      <button type="button" onClick={() => setEnabled((value) => !value)}>
        {enabled ? 'Disable' : 'Enable'}
      </button>
      <p>
        {x}, {y} — {sourceType ?? 'idle'}
      </p>
    </>
  )
}`

export const initialValueSnippet = `import { useRef } from 'react'
import { useMouse } from '@muradyanvano/react-hooks'

export function InitialValueDemo() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    touch: true,
    resetOnTouchEnd: true,
    initialValue: { x: 24, y: 48 },
  })

  return (
    <div
      ref={surfaceRef}
      style={{ height: 200, touchAction: 'none', border: '1px solid #cbd5e1' }}
    >
      <p>
        Starts at 24, 48. Final touch-end resets there. Now: {x}, {y} (
        {sourceType ?? 'idle'})
      </p>
    </div>
  )
}`

export const playgroundSnippet = `import { useMouse } from '@muradyanvano/react-hooks'

export function Playground(props: {
  enabled: boolean
  type: 'page' | 'client' | 'screen' | 'movement'
  touch: boolean
  scroll: boolean
  resetOnTouchEnd: boolean
  initialX: number
  initialY: number
}) {
  const { x, y, sourceType } = useMouse({
    enabled: props.enabled,
    type: props.type,
    touch: props.touch,
    scroll: props.scroll,
    resetOnTouchEnd: props.resetOnTouchEnd,
    initialValue: { x: props.initialX, y: props.initialY },
  })

  return (
    <p>
      {x}, {y} — {sourceType ?? 'idle'}
    </p>
  )
}`
