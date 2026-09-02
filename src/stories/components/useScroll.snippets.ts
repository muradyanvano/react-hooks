export const scrollDashboardSnippet = `import { useRef, useState } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function ScrollDashboard() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [smooth, setSmooth] = useState(false)

  const { x, y, isScrolling, arrivedState, directions, measure, setX, setY } =
    useScroll(scrollRef, {
      offset: { left: 30, top: 30, right: 30, bottom: 30 },
      behavior: smooth ? 'smooth' : 'auto',
    })

  return (
    <div>
      <label>
        X
        <input
          type="number"
          onChange={(event) => setX(Number(event.target.value))}
        />
      </label>
      <label>
        Y
        <input
          type="number"
          onChange={(event) => setY(Number(event.target.value))}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={smooth}
          onChange={(event) => setSmooth(event.target.checked)}
        />
        Smooth
      </label>
      <button type="button" onClick={() => measure()}>
        Measure
      </button>
      <div ref={scrollRef} style={{ overflow: 'auto', height: 240 }}>
        <div style={{ width: '200%', height: '200%' }}>Scroll Me</div>
      </div>
      <p>
        {x}, {y} · scrolling: {String(isScrolling)}
      </p>
      <p>
        arrived: {JSON.stringify(arrivedState)} · directions:{' '}
        {JSON.stringify(directions)}
      </p>
    </div>
  )
}`

export const verticalArticleSnippet = `import { useRef } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function VerticalArticle() {
  const articleRef = useRef<HTMLElement>(null)
  const { y, arrivedState, directions } = useScroll(articleRef)

  return (
    <article ref={articleRef} style={{ overflowY: 'auto', maxHeight: 320 }}>
      <h1>Long-form article</h1>
      {Array.from({ length: 12 }, (_, index) => (
        <p key={index}>Paragraph {index + 1}</p>
      ))}
      <p>
        y: {y} · top: {String(arrivedState.top)} · bottom:{' '}
        {String(arrivedState.bottom)}
      </p>
      <p>directions: {JSON.stringify(directions)}</p>
    </article>
  )
}`

export const horizontalGallerySnippet = `import { useRef } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function HorizontalGallery() {
  const galleryRef = useRef<HTMLDivElement>(null)
  const { x, arrivedState, directions } = useScroll(galleryRef)

  return (
    <div ref={galleryRef} style={{ display: 'flex', overflowX: 'auto' }}>
      {Array.from({ length: 8 }, (_, index) => (
        <figure key={index} style={{ minWidth: 240 }}>
          Slide {index + 1}
        </figure>
      ))}
      <p>
        x: {x} · left: {String(arrivedState.left)} · right:{' '}
        {String(arrivedState.right)} · {JSON.stringify(directions)}
      </p>
    </div>
  )
}`

export const offsetsSnippet = `import { useRef } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function OffsetThresholds() {
  const ref = useRef<HTMLDivElement>(null)
  const { arrivedState } = useScroll(ref, {
    offset: { left: 30, top: 30, right: 30, bottom: 30 },
  })

  return (
    <div ref={ref} style={{ overflow: 'auto', height: 200 }}>
      <div style={{ width: '180%', height: '180%', padding: 48 }}>
        Content with 30px arrival margins
      </div>
      <p>{JSON.stringify(arrivedState)}</p>
    </div>
  )
}`

export const programmaticPositionSnippet = `import { useRef } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function ProgrammaticPosition() {
  const ref = useRef<HTMLDivElement>(null)
  const { x, y, scrollTo, setX, setY } = useScroll(ref)

  return (
    <>
      <button type="button" onClick={() => scrollTo({ x: 40, y: 40 })}>
        Jump to 40, 40
      </button>
      <button type="button" onClick={() => setX(0)}>
        Reset X
      </button>
      <button type="button" onClick={() => setY(0)}>
        Reset Y
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 200 }}>
        <div style={{ width: '160%', height: '160%' }} />
      </div>
      <p>
        {x}, {y}
      </p>
    </>
  )
}`

export const smoothScrollingSnippet = `import { useRef } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function SmoothScrolling() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollTo } = useScroll(ref, { behavior: 'smooth' })

  return (
    <>
      <button
        type="button"
        onClick={() => scrollTo({ x: 200, y: 120 }, 'smooth')}
      >
        Smooth jump
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 200 }}>
        <div style={{ width: '200%', height: '200%' }}>Smooth demo</div>
      </div>
    </>
  )
}`

export const scrollingStateSnippet = `import { useRef, useState } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function ScrollingState() {
  const ref = useRef<HTMLDivElement>(null)
  const [stopCount, setStopCount] = useState(0)
  const { isScrolling } = useScroll(ref, {
    idle: 150,
    onStop: () => {
      setStopCount((count) => count + 1)
    },
  })

  return (
    <>
      <div ref={ref} style={{ overflow: 'auto', height: 180 }}>
        <div style={{ height: '220%' }}>Scroll to idle</div>
      </div>
      <p>isScrolling: {String(isScrolling)}</p>
      <p>onStop count: {stopCount}</p>
    </>
  )
}`

export const throttleComparisonSnippet = `import { useRef, useState } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function ThrottleComparison() {
  const ref = useRef<HTMLDivElement>(null)
  const [throttle, setThrottle] = useState(0)
  const [updates, setUpdates] = useState(0)

  const { x, y } = useScroll(ref, {
    throttle,
    onScroll: () => {
      setUpdates((count) => count + 1)
    },
  })

  return (
    <>
      <button type="button" onClick={() => setThrottle((value) => (value === 0 ? 100 : 0))}>
        throttle: {throttle}ms
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 160 }}>
        <div style={{ height: '240%' }} />
      </div>
      <p>
        {x}, {y} · onScroll updates: {updates}
      </p>
    </>
  )
}`

export const directionsSnippet = `import { useRef } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function ScrollDirections() {
  const ref = useRef<HTMLDivElement>(null)
  const { directions } = useScroll(ref)

  return (
    <>
      <div ref={ref} style={{ overflow: 'auto', height: 200, width: '100%' }}>
        <div style={{ width: '180%', height: '180%' }} />
      </div>
      <p>{JSON.stringify(directions)}</p>
    </>
  )
}`

export const dynamicContentSnippet = `import { useRef, useState } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function DynamicContent() {
  const ref = useRef<HTMLDivElement>(null)
  const [blocks, setBlocks] = useState(6)
  const { y, arrivedState, measure } = useScroll(ref)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setBlocks((count) => count + 3)
          queueMicrotask(() => measure())
        }}
      >
        Add content
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 200 }}>
        {Array.from({ length: blocks }, (_, index) => (
          <p key={index}>Block {index + 1}</p>
        ))}
      </div>
      <p>
        y: {y} · bottom: {String(arrivedState.bottom)}
      </p>
    </>
  )
}`

export const mutationObservationSnippet = `import { useRef, useState } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function MutationObservation() {
  const ref = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState(4)
  const { arrivedState } = useScroll(ref, { observe: { mutation: true } })

  return (
    <>
      <button type="button" onClick={() => setItems((count) => count + 2)}>
        Append rows (mutation observer)
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 180 }}>
        {Array.from({ length: items }, (_, index) => (
          <p key={index}>Row {index + 1}</p>
        ))}
      </div>
      <p>{JSON.stringify(arrivedState)}</p>
    </>
  )
}`

export const windowTargetSnippet = `import { useRef, useState } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function WindowTarget() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<Window | null>(null)
  const [ready, setReady] = useState(false)
  const { y, arrivedState } = useScroll(targetRef, { enabled: ready })

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Isolated window scroll"
        srcDoc="<html><body style='margin:0;padding:16px;height:220vh;background:linear-gradient(#eef2ff,#fff)'></body></html>"
        onLoad={() => {
          targetRef.current = iframeRef.current?.contentWindow ?? null
          setReady(true)
        }}
      />
      <p>
        y: {y} · bottom: {String(arrivedState.bottom)}
      </p>
    </>
  )
}`

export const documentTargetSnippet = `import { useRef, useState } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function DocumentTarget() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<Document | null>(null)
  const [ready, setReady] = useState(false)
  const { y, arrivedState } = useScroll(targetRef, { enabled: ready })

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Isolated document scroll"
        srcDoc="<html><body style='margin:0;padding:16px;height:220vh;background:linear-gradient(#ecfdf5,#fff)'></body></html>"
        onLoad={() => {
          targetRef.current = iframeRef.current?.contentDocument ?? null
          setReady(true)
        }}
      />
      <p>
        y: {y} · bottom: {String(arrivedState.bottom)}
      </p>
    </>
  )
}`

export const dynamicTargetSnippet = `import { useRef, useState } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function DynamicScrollTarget() {
  const firstRef = useRef<HTMLDivElement>(null)
  const secondRef = useRef<HTMLDivElement>(null)
  const [trackFirst, setTrackFirst] = useState(true)
  const { x, y } = useScroll(trackFirst ? firstRef : secondRef)

  return (
    <>
      <button type="button" onClick={() => setTrackFirst((value) => !value)}>
        Switch target
      </button>
      <div ref={firstRef} style={{ overflow: 'auto', height: 120 }}>
        <div style={{ width: '160%' }}>First</div>
      </div>
      <div ref={secondRef} style={{ overflow: 'auto', height: 120 }}>
        <div style={{ width: '160%' }}>Second</div>
      </div>
      <p>
        {x}, {y}
      </p>
    </>
  )
}`

export const enabledStateSnippet = `import { useRef, useState } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function EnabledScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(true)
  const { x, y, directions } = useScroll(ref, { enabled })

  return (
    <>
      <button type="button" onClick={() => setEnabled((value) => !value)}>
        {enabled ? 'Disable' : 'Enable'}
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 160 }}>
        <div style={{ height: '220%' }} />
      </div>
      <p>
        {x}, {y} · {JSON.stringify(directions)}
      </p>
    </>
  )
}`

export const rtlHorizontalSnippet = `import { useRef } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function RtlHorizontal() {
  const ref = useRef<HTMLDivElement>(null)
  const { x, arrivedState } = useScroll(ref)

  return (
    <div ref={ref} dir="rtl" style={{ display: 'flex', overflowX: 'auto' }}>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} style={{ minWidth: 200 }}>
          Card {index + 1}
        </div>
      ))}
      <p>
        x: {x} · left: {String(arrivedState.left)} · right:{' '}
        {String(arrivedState.right)}
      </p>
    </div>
  )
}`

export const errorHandlingSnippet = `import { useRef, useState } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function ScrollErrorHandling() {
  const ref = useRef<HTMLDivElement>(null)
  const [errors, setErrors] = useState<string[]>([])
  const { setX } = useScroll(ref, {
    onError: (error) => {
      setErrors((current) => [...current, String(error)])
    },
  })

  const forceScrollError = () => {
    const element = ref.current
    if (element == null) {
      return
    }
    const native = element.scrollTo.bind(element)
    element.scrollTo = () => {
      throw new Error('Scroll blocked')
    }
    setX(40)
    element.scrollTo = native
  }

  return (
    <>
      <button type="button" onClick={forceScrollError}>
        Force scroll error
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 140 }}>
        <div style={{ width: '160%' }} />
      </div>
      <ul>
        {errors.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </>
  )
}`

export const playgroundSnippet = `import { useRef, useState } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function ScrollPlayground(props: {
  enabled: boolean
  throttle: number
  idle: number
  offset: number
  behavior: ScrollBehavior
  observeMutation: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const edge = props.offset

  const { x, y, isScrolling, arrivedState, measure } = useScroll(ref, {
    enabled: mounted && props.enabled,
    throttle: props.throttle,
    idle: props.idle,
    behavior: props.behavior,
    observe: props.observeMutation ? { mutation: true } : false,
    offset: { left: edge, top: edge, right: edge, bottom: edge },
  })

  return (
    <>
      <button type="button" onClick={() => setMounted(true)}>
        Mount playground
      </button>
      <button type="button" onClick={() => measure()}>
        Measure
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 200 }}>
        <div style={{ width: '180%', height: '180%' }} />
      </div>
      <p>
        {x}, {y} · scrolling: {String(isScrolling)} ·{' '}
        {JSON.stringify(arrivedState)}
      </p>
    </>
  )
}`
