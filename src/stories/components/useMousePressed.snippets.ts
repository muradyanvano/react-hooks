export const pressAndHoldSnippet = `import { useRef } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function PressPad() {
  const targetRef = useRef<HTMLDivElement>(null)

  const { pressed, sourceType } = useMousePressed({
    target: targetRef,
  })

  return (
    <div ref={targetRef}>
      <p>{pressed ? 'Pressed' : 'Released'}</p>
      <p>Source: {sourceType ?? 'none'}</p>
    </div>
  )
}`

export const entirePageSnippet = `import { useMousePressed } from '@muradyanvano/react-hooks'

export function PagePressTracker() {
  const { pressed, sourceType } = useMousePressed()

  return (
    <p>
      {pressed ? 'Pressed' : 'Released'} — source: {sourceType ?? 'none'}
    </p>
  )
}`

export const elementTargetSnippet = `import { useRef } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function CardPress() {
  const cardRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({ target: cardRef })

  return (
    <div ref={cardRef}>
      {pressed ? 'Card pressed' : 'Card idle'} ({sourceType ?? 'none'})
    </div>
  )
}`

export const mouseOnlySnippet = `import { useRef } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function MouseOnlyPad() {
  const targetRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({
    target: targetRef,
    touch: false,
  })

  return (
    <div ref={targetRef}>
      {pressed ? 'Mouse down' : 'Idle'} — {sourceType ?? 'none'}
    </div>
  )
}`

export const touchInputSnippet = `import { useRef } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function TouchPad() {
  const targetRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({
    target: targetRef,
    touch: true,
  })

  return (
    <div ref={targetRef} style={{ touchAction: 'none' }}>
      {pressed ? 'Touch active' : 'Idle'} — {sourceType ?? 'none'}
    </div>
  )
}`

export const dragLifecycleSnippet = `import { useRef } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function DragPress() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({ target: zoneRef })

  return (
    <div
      ref={zoneRef}
      onDragOver={(event) => {
        event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
      }}
    >
      <div draggable>Drag me</div>
      <p>{pressed ? 'Dragging' : 'Idle'} — {sourceType ?? 'none'}</p>
    </div>
  )
}`

export const callbacksSnippet = `import { useRef, useState } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function PressCallbacks() {
  const targetRef = useRef<HTMLDivElement>(null)
  const [pressCount, setPressCount] = useState(0)
  const [releaseCount, setReleaseCount] = useState(0)
  const [lastType, setLastType] = useState('none')

  const { pressed, sourceType } = useMousePressed({
    target: targetRef,
    onPressed: (event) => {
      setPressCount((value) => value + 1)
      setLastType(event.type)
    },
    onReleased: (event) => {
      setReleaseCount((value) => value + 1)
      setLastType(event.type)
    },
  })

  return (
    <div ref={targetRef}>
      <p>{pressed ? 'Pressed' : 'Released'}</p>
      <p>Source: {sourceType ?? 'none'}</p>
      <p>Press count: {pressCount}</p>
      <p>Release count: {releaseCount}</p>
      <p>Last event: {lastType}</p>
    </div>
  )
}`

export const captureModeSnippet = `import { useRef } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function CapturePress() {
  const outerRef = useRef<HTMLDivElement>(null)
  const { pressed } = useMousePressed({
    target: outerRef,
    capture: true,
  })

  return (
    <div ref={outerRef}>
      <button
        type="button"
        onMouseDown={(event) => {
          event.stopPropagation()
        }}
      >
        Nested control (stops bubbling)
      </button>
      <p>{pressed ? 'Outer pressed' : 'Outer idle'}</p>
    </div>
  )
}`

export const enabledStateSnippet = `import { useRef, useState } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function EnabledPress() {
  const [enabled, setEnabled] = useState(true)
  const targetRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({
    target: targetRef,
    enabled,
  })

  return (
    <>
      <button type="button" onClick={() => setEnabled((value) => !value)}>
        {enabled ? 'Disable' : 'Enable'}
      </button>
      <div ref={targetRef}>
        {pressed ? 'Pressed' : 'Idle'} — {sourceType ?? 'none'}
      </div>
    </>
  )
}`

export const dynamicTargetSnippet = `import { useRef, useState } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function DynamicPressTarget() {
  const aRef = useRef<HTMLDivElement>(null)
  const bRef = useRef<HTMLDivElement>(null)
  const [useA, setUseA] = useState(true)
  const { pressed, sourceType } = useMousePressed({
    target: useA ? aRef : bRef,
  })

  return (
    <>
      <button type="button" onClick={() => setUseA((value) => !value)}>
        Switch card
      </button>
      <div ref={aRef}>Card A</div>
      <div ref={bRef}>Card B</div>
      <p>{pressed ? 'Pressed' : 'Idle'} — {sourceType ?? 'none'}</p>
    </>
  )
}`

export const initialValueSnippet = `import { useRef } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function InitialPressed() {
  const targetRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({
    target: targetRef,
    initialValue: true,
  })

  return (
    <div ref={targetRef}>
      <p>{pressed ? 'Pressed' : 'Released'}</p>
      <p>Source: {sourceType ?? 'unknown until input'}</p>
    </div>
  )
}`

export const nestedContentSnippet = `import { useRef } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function NestedPress() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({ target: containerRef })

  return (
    <div ref={containerRef}>
      <p>Press anywhere inside, including this text.</p>
      <p>{pressed ? 'Pressed' : 'Idle'} — {sourceType ?? 'none'}</p>
    </div>
  )
}`

export const playgroundSnippet = `import { useRef } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function Playground(props: {
  enabled: boolean
  touch: boolean
  drag: boolean
  capture: boolean
  initialValue: boolean
}) {
  const targetRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({
    target: targetRef,
    enabled: props.enabled,
    touch: props.touch,
    drag: props.drag,
    capture: props.capture,
    initialValue: props.initialValue,
  })

  return (
    <div ref={targetRef}>
      {pressed ? 'Pressed' : 'Idle'} — {sourceType ?? 'none'}
    </div>
  )
}`
