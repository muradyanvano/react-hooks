export const infiniteListSnippet = `import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

async function loadMoreItems(offset: number) {
  await new Promise((resolve) => setTimeout(resolve, 120))
  return Array.from({ length: 4 }, (_, index) => offset + index + 1)
}

export function InfiniteList() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState(() =>
    Array.from({ length: 6 }, (_, index) => index + 1),
  )
  const maxItems = 18

  const { isLoading, reset } = useInfiniteScroll(
    containerRef,
    async () => {
      const nextItems = await loadMoreItems(items.length)
      setItems((current) => [...current, ...nextItems])
    },
    {
      distance: 10,
      canLoadMore: () => items.length < maxItems,
    },
  )

  const handleReset = () => {
    setItems([1, 2, 3, 4, 5, 6])
    reset()
  }

  return (
    <>
      <div
        ref={containerRef}
        tabIndex={0}
        role="feed"
        aria-busy={isLoading}
        aria-label="Infinite list"
        style={{ maxHeight: 320, overflowY: 'auto' }}
      >
        {items.map((item) => (
          <article key={item}>Item {item}</article>
        ))}
      </div>

      <p>
        {isLoading
          ? 'Loading…'
          : items.length >= maxItems
            ? 'All items loaded'
            : \`\${items.length} items\`}
      </p>
      <button type="button" onClick={handleReset}>
        Reset
      </button>
    </>
  )
}`

export const bottomDirectionSnippet = `import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

export function BottomFeed() {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(8)
  const { isLoading } = useInfiniteScroll(
    ref,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
      setCount((value) => value + 4)
    },
    { direction: 'bottom', distance: 24, canLoadMore: () => count < 40 },
  )

  return (
    <div ref={ref} style={{ maxHeight: 280, overflowY: 'auto' }}>
      {Array.from({ length: count }, (_, index) => (
        <p key={index}>Feed row {index + 1}</p>
      ))}
      {isLoading ? <p>Loading…</p> : null}
    </div>
  )
}`

export const topDirectionSnippet = `import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

export function ChatHistory() {
  const ref = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState(['Hello', 'How are you?'])
  // Consumer owns reversed layout / scroll anchoring when prepending.
  useInfiniteScroll(
    ref,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
      setMessages((current) => [\`Earlier \${current.length + 1}\`, ...current])
    },
    { direction: 'top', distance: 16, canLoadMore: () => messages.length < 20 },
  )

  return (
    <div
      ref={ref}
      style={{
        maxHeight: 280,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column-reverse',
      }}
    >
      {messages.map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
  )
}`

export const horizontalDirectionsSnippet = `import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

export function HorizontalCards() {
  const rightRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const [rightCount, setRightCount] = useState(6)
  const [leftCount, setLeftCount] = useState(6)

  useInfiniteScroll(
    rightRef,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
      setRightCount((value) => value + 3)
    },
    { direction: 'right', distance: 20, canLoadMore: () => rightCount < 24 },
  )

  useInfiniteScroll(
    leftRef,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
      setLeftCount((value) => value + 3)
    },
    { direction: 'left', distance: 20, canLoadMore: () => leftCount < 24 },
  )

  return (
    <>
      <div ref={rightRef} style={{ overflowX: 'auto', display: 'flex', gap: 8 }}>
        {Array.from({ length: rightCount }, (_, index) => (
          <article key={index} style={{ minWidth: 140 }}>Card {index + 1}</article>
        ))}
      </div>
      <div
        ref={leftRef}
        style={{
          overflowX: 'auto',
          display: 'flex',
          flexDirection: 'row-reverse',
          gap: 8,
        }}
      >
        {Array.from({ length: leftCount }, (_, index) => (
          <article key={index} style={{ minWidth: 140 }}>
            Reverse {index + 1}
          </article>
        ))}
      </div>
    </>
  )
}`

export const asyncLoadingSnippet = `import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

export function AsyncLoadingDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState([1, 2, 3, 4])
  const { isLoading } = useInfiniteScroll(
    ref,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
      setItems((current) => [...current, current.length + 1])
    },
    { distance: 8, canLoadMore: () => items.length < 20 },
  )

  return (
    <div ref={ref} style={{ maxHeight: 240, overflowY: 'auto' }} aria-busy={isLoading}>
      {items.map((item) => (
        <p key={item}>Item {item}</p>
      ))}
      {isLoading ? <p>Loading…</p> : null}
    </div>
  )
}`

export const endOfDataSnippet = `import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

export function EndOfData() {
  const ref = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState([1, 2, 3, 4, 5, 6])
  const max = 12
  const { isLoading } = useInfiniteScroll(
    ref,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      setItems((current) => [...current, current.length + 1, current.length + 2])
    },
    { distance: 10, canLoadMore: () => items.length < max },
  )

  return (
    <div ref={ref} style={{ maxHeight: 240, overflowY: 'auto' }}>
      {items.map((item) => (
        <p key={item}>Item {item}</p>
      ))}
      <p>{items.length >= max ? 'All items loaded' : isLoading ? 'Loading…' : 'More available'}</p>
    </div>
  )
}`

export const shortContainerSnippet = `import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

export function ShortContainer() {
  const ref = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState([1, 2])
  useInfiniteScroll(
    ref,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 40))
      setItems((current) => [...current, current.length + 1, current.length + 2])
    },
    { distance: 0, canLoadMore: () => items.length < 16 },
  )

  return (
    <div ref={ref} style={{ maxHeight: 220, overflowY: 'auto' }}>
      {items.map((item) => (
        <p key={item} style={{ minHeight: 48 }}>
          Row {item}
        </p>
      ))}
    </div>
  )
}`

export const errorRetrySnippet = `import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

export function ErrorRetry() {
  const ref = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState([1, 2, 3, 4])
  const [shouldFail, setShouldFail] = useState(true)
  const { isLoading, error, reset } = useInfiniteScroll(
    ref,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
      if (shouldFail) {
        setShouldFail(false)
        throw new Error('Network unavailable')
      }
      setItems((current) => [...current, current.length + 1])
    },
    { distance: 12, canLoadMore: () => items.length < 20 },
  )

  return (
    <>
      <div ref={ref} style={{ maxHeight: 220, overflowY: 'auto' }}>
        {items.map((item) => (
          <p key={item}>Item {item}</p>
        ))}
      </div>
      {error ? <p role="alert">{error.message}</p> : null}
      {isLoading ? <p>Loading…</p> : null}
      <button
        type="button"
        onClick={() => {
          reset()
        }}
      >
        Retry
      </button>
    </>
  )
}`

export const enabledStateSnippet = `import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

export function EnabledToggle() {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(true)
  const [items, setItems] = useState([1, 2, 3, 4, 5, 6])
  useInfiniteScroll(
    ref,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      setItems((current) => [...current, current.length + 1])
    },
    { enabled, distance: 10, canLoadMore: () => items.length < 30 },
  )

  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled
      </label>
      <div ref={ref} style={{ maxHeight: 220, overflowY: 'auto' }}>
        {items.map((item) => (
          <p key={item}>Item {item}</p>
        ))}
      </div>
    </>
  )
}`

export const dynamicTargetSnippet = `import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

export function DynamicTarget() {
  const firstRef = useRef<HTMLDivElement>(null)
  const secondRef = useRef<HTMLDivElement>(null)
  const [which, setWhich] = useState<'first' | 'second'>('first')
  const [first, setFirst] = useState([1, 2, 3, 4])
  const [second, setSecond] = useState([1, 2, 3, 4])
  useInfiniteScroll(
    which === 'first' ? firstRef : secondRef,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      if (which === 'first') {
        setFirst((current) => [...current, current.length + 1])
      } else {
        setSecond((current) => [...current, current.length + 1])
      }
    },
    { distance: 8 },
  )

  return (
    <>
      <button type="button" onClick={() => setWhich('first')}>
        Track first
      </button>
      <button type="button" onClick={() => setWhich('second')}>
        Track second
      </button>
      <div ref={firstRef} style={{ maxHeight: 160, overflowY: 'auto' }}>
        {first.map((item) => (
          <p key={item}>First {item}</p>
        ))}
      </div>
      <div ref={secondRef} style={{ maxHeight: 160, overflowY: 'auto' }}>
        {second.map((item) => (
          <p key={item}>Second {item}</p>
        ))}
      </div>
    </>
  )
}`

export const windowScrollingSnippet = `import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

// Prefer an isolated iframe/document in Storybook Docs so the manager page
// does not unexpectedly scroll or auto-load.
export function WindowScrollingNote() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<Document | null>(null)
  const [, setReady] = useState(false)
  const [count, setCount] = useState(8)

  useInfiniteScroll(
    targetRef,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      setCount((value) => value + 4)
    },
    { distance: 40, canLoadMore: () => count < 40 },
  )

  return (
    <iframe
      ref={iframeRef}
      title="Isolated scroll document"
      srcDoc="<div style='height:200vh'>Scroll the iframe document</div>"
      onLoad={() => {
        targetRef.current = iframeRef.current?.contentDocument ?? null
        setReady(true)
      }}
    />
  )
}`

export const playgroundSnippet = `import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

export function Playground(props: {
  enabled?: boolean
  direction?: 'top' | 'right' | 'bottom' | 'left'
  distance?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState([1, 2, 3, 4, 5, 6])
  const { isLoading, reset } = useInfiniteScroll(
    ref,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
      setItems((current) => [...current, current.length + 1])
    },
    {
      enabled: props.enabled ?? true,
      direction: props.direction ?? 'bottom',
      distance: props.distance ?? 10,
      canLoadMore: () => items.length < 40,
    },
  )

  return (
    <>
      <div ref={ref} style={{ maxHeight: 240, overflow: 'auto' }}>
        {items.map((item) => (
          <p key={item}>Item {item}</p>
        ))}
      </div>
      <p>{isLoading ? 'Loading…' : \`\${items.length} items\`}</p>
      <button
        type="button"
        onClick={() => {
          setItems([1, 2, 3, 4, 5, 6])
          reset()
        }}
      >
        Reset
      </button>
    </>
  )
}`
