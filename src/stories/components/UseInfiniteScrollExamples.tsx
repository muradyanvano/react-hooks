import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  asyncLoadingSnippet,
  bottomDirectionSnippet,
  dynamicTargetSnippet,
  enabledStateSnippet,
  endOfDataSnippet,
  errorRetrySnippet,
  horizontalDirectionsSnippet,
  infiniteListSnippet,
  playgroundSnippet,
  shortContainerSnippet,
  topDirectionSnippet,
  windowScrollingSnippet,
} from './useInfiniteScroll.snippets'

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'

const scrollerClass =
  'max-h-80 w-full overflow-y-auto rounded-xl border border-slate-300 bg-white p-3 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const itemClass =
  'rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-800 min-h-24'
const labelClass = 'flex items-center gap-2 text-sm text-slate-700'

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function InfiniteListExample(): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState(() =>
    Array.from({ length: 6 }, (_, index) => index + 1),
  )
  const itemsLengthRef = useRef(items.length)
  const maxItems = 18

  useEffect(() => {
    itemsLengthRef.current = items.length
  }, [items.length])

  const { isLoading, reset } = useInfiniteScroll(
    containerRef,
    async () => {
      await delay(80)
      setItems((current) => {
        const nextItems = Array.from(
          { length: 4 },
          (_, index) => current.length + index + 1,
        )
        return [...current, ...nextItems]
      })
    },
    {
      distance: 10,
      canLoadMore: () => itemsLengthRef.current < maxItems,
    },
  )

  const status =
    items.length >= maxItems
      ? 'All items loaded'
      : isLoading
        ? 'Loading…'
        : `${items.length} items`

  return (
    <ExampleShowcase
      hookName="useInfiniteScroll"
      title="Infinite list"
      description="Scroll near the bottom to load more batches. Reset restores the initial six items and re-arms the hook."
      instruction="Scroll the list near the bottom, wait for new items, then click Reset."
      code={infiniteListSnippet}
      badge={status}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Items',
              value: String(items.length),
              testId: 'list-count',
            },
            {
              label: 'Loading',
              value: String(isLoading),
              testId: 'list-loading',
            },
            {
              label: 'Status',
              value: status,
              testId: 'list-status',
            },
          ]}
        />
      }
    >
      <div
        ref={containerRef}
        tabIndex={0}
        aria-busy={isLoading}
        aria-label="Infinite list"
        data-testid="infinite-list"
        className={scrollerClass}
      >
        <div className="space-y-2">
          {items.map((item) => (
            <article
              key={item}
              className={itemClass}
              data-testid={`list-item-${item}`}
            >
              Item {item}
            </article>
          ))}
        </div>
      </div>
      <p
        className="text-sm text-slate-600"
        aria-live="polite"
        data-testid="list-live"
      >
        {status}
      </p>
      <button
        type="button"
        data-testid="list-reset"
        className={primaryButtonClass}
        onClick={() => {
          setItems([1, 2, 3, 4, 5, 6])
          reset()
        }}
      >
        Reset
      </button>
    </ExampleShowcase>
  )
}

export function BottomDirectionExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(8)
  const { isLoading } = useInfiniteScroll(
    ref,
    async () => {
      await delay(60)
      setCount((value) => value + 4)
    },
    {
      direction: 'bottom',
      distance: 24,
      canLoadMore: () => count < 40,
    },
  )

  return (
    <ExampleShowcase
      hookName="useInfiniteScroll"
      title="Bottom direction"
      description="Standard vertical feed loading when distance to the bottom edge is within the threshold."
      instruction="Scroll to the bottom of the feed."
      code={bottomDirectionSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Rows', value: String(count), testId: 'bottom-count' },
            {
              label: 'Loading',
              value: String(isLoading),
              testId: 'bottom-loading',
            },
          ]}
        />
      }
    >
      <div
        ref={ref}
        tabIndex={0}
        aria-label="Bottom feed"
        data-testid="bottom-feed"
        className={scrollerClass}
      >
        {Array.from({ length: count }, (_, index) => (
          <p key={index} className={`${itemClass} mb-2`}>
            Feed row {index + 1}
          </p>
        ))}
      </div>
    </ExampleShowcase>
  )
}

export function TopDirectionExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState(['Hello', 'How are you?'])
  useInfiniteScroll(
    ref,
    async () => {
      await delay(60)
      setMessages((current) => [`Earlier ${current.length + 1}`, ...current])
    },
    {
      direction: 'top',
      distance: 16,
      canLoadMore: () => messages.length < 20,
    },
  )

  return (
    <ExampleShowcase
      hookName="useInfiniteScroll"
      title="Top direction"
      description="Chat-style loading near the top. The consumer owns reversed layout and scroll anchoring after prepending."
      instruction="Scroll toward the top of the reversed column."
      code={topDirectionSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Messages',
              value: String(messages.length),
              testId: 'top-count',
            },
          ]}
        />
      }
    >
      <div
        ref={ref}
        tabIndex={0}
        aria-label="Chat history"
        data-testid="top-feed"
        className={`${scrollerClass} flex flex-col-reverse`}
      >
        {messages.map((message) => (
          <p key={message} className={`${itemClass} mb-2`}>
            {message}
          </p>
        ))}
      </div>
    </ExampleShowcase>
  )
}

export function HorizontalDirectionsExample(): ReactElement {
  const rightRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const [rightCount, setRightCount] = useState(6)
  const [leftCount, setLeftCount] = useState(6)

  useInfiniteScroll(
    rightRef,
    async () => {
      await delay(50)
      setRightCount((value) => value + 3)
    },
    {
      direction: 'right',
      distance: 20,
      canLoadMore: () => rightCount < 24,
    },
  )
  useInfiniteScroll(
    leftRef,
    async () => {
      await delay(50)
      setLeftCount((value) => value + 3)
    },
    {
      direction: 'left',
      distance: 20,
      canLoadMore: () => leftCount < 24,
    },
  )

  return (
    <ExampleShowcase
      hookName="useInfiniteScroll"
      title="Horizontal directions"
      description="Right loads with normal horizontal overflow. Left typically uses a reversed row. RTL scrollLeft is not normalized by the hook."
      instruction="Scroll each strip toward its configured edge."
      code={horizontalDirectionsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Right cards',
              value: String(rightCount),
              testId: 'right-count',
            },
            {
              label: 'Left cards',
              value: String(leftCount),
              testId: 'left-count',
            },
          ]}
        />
      }
    >
      <div
        ref={rightRef}
        tabIndex={0}
        aria-label="Rightward cards"
        data-testid="right-strip"
        className="flex gap-2 overflow-x-auto rounded-xl border border-slate-300 p-3"
      >
        {Array.from({ length: rightCount }, (_, index) => (
          <article key={index} className={`${itemClass} min-w-36 shrink-0`}>
            Card {index + 1}
          </article>
        ))}
      </div>
      <div
        ref={leftRef}
        tabIndex={0}
        aria-label="Leftward cards"
        data-testid="left-strip"
        className="flex flex-row-reverse gap-2 overflow-x-auto rounded-xl border border-slate-300 p-3"
      >
        {Array.from({ length: leftCount }, (_, index) => (
          <article key={index} className={`${itemClass} min-w-36 shrink-0`}>
            Reverse {index + 1}
          </article>
        ))}
      </div>
    </ExampleShowcase>
  )
}

export function AsyncLoadingExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState([1, 2, 3, 4])
  const { isLoading } = useInfiniteScroll(
    ref,
    async () => {
      await delay(150)
      setItems((current) => [...current, current.length + 1])
    },
    { distance: 8, canLoadMore: () => items.length < 20 },
  )

  return (
    <ExampleShowcase
      hookName="useInfiniteScroll"
      title="Async loading"
      description="Pending state stays visible while a slow loader runs. Duplicate scroll bursts join the active request."
      instruction="Scroll to the bottom while a load is pending."
      code={asyncLoadingSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Loading',
              value: String(isLoading),
              testId: 'async-loading',
            },
            {
              label: 'Items',
              value: String(items.length),
              testId: 'async-count',
            },
          ]}
        />
      }
    >
      <div
        ref={ref}
        tabIndex={0}
        aria-busy={isLoading}
        aria-label="Async list"
        data-testid="async-list"
        className={scrollerClass}
      >
        {items.map((item) => (
          <p key={item} className={`${itemClass} mb-2`}>
            Item {item}
          </p>
        ))}
        {isLoading ? <p className="text-sm text-slate-600">Loading…</p> : null}
      </div>
    </ExampleShowcase>
  )
}

export function EndOfDataExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState([1, 2, 3, 4, 5, 6])
  const max = 12
  const { isLoading } = useInfiniteScroll(
    ref,
    async () => {
      await delay(40)
      setItems((current) => [
        ...current,
        current.length + 1,
        current.length + 2,
      ])
    },
    { distance: 10, canLoadMore: () => items.length < max },
  )

  return (
    <ExampleShowcase
      hookName="useInfiniteScroll"
      title="End of data"
      description="Return false from canLoadMore when the dataset is complete so the loader stops."
      instruction="Scroll until the list reports all items loaded."
      code={endOfDataSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Items',
              value: String(items.length),
              testId: 'end-count',
            },
            {
              label: 'Complete',
              value: String(items.length >= max),
              testId: 'end-complete',
            },
          ]}
        />
      }
    >
      <div
        ref={ref}
        tabIndex={0}
        aria-label="Finite list"
        data-testid="end-list"
        className={scrollerClass}
      >
        {items.map((item) => (
          <p key={item} className={`${itemClass} mb-2`}>
            Item {item}
          </p>
        ))}
        <p className="text-sm text-slate-600" data-testid="end-status">
          {items.length >= max
            ? 'All items loaded'
            : isLoading
              ? 'Loading…'
              : 'More available'}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function ShortContainerExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState([1, 2])
  useInfiniteScroll(
    ref,
    async () => {
      await delay(30)
      setItems((current) => [
        ...current,
        current.length + 1,
        current.length + 2,
      ])
    },
    { distance: 0, canLoadMore: () => items.length < 16 },
  )

  return (
    <ExampleShowcase
      hookName="useInfiniteScroll"
      title="Short container"
      description="When initial content cannot fill the viewport, serialized batches keep loading until the edge moves or data ends."
      instruction="Watch the short list fill without scrolling."
      code={shortContainerSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Items',
              value: String(items.length),
              testId: 'short-count',
            },
          ]}
        />
      }
    >
      <div
        ref={ref}
        tabIndex={0}
        aria-label="Short container"
        data-testid="short-list"
        className={scrollerClass}
      >
        {items.map((item) => (
          <p key={item} className={`${itemClass} mb-2 min-h-12`}>
            Row {item}
          </p>
        ))}
      </div>
    </ExampleShowcase>
  )
}

export function ErrorRetryExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState([1, 2, 3, 4])
  const [shouldFail, setShouldFail] = useState(true)
  const { isLoading, error, reset } = useInfiniteScroll(
    ref,
    async () => {
      await delay(50)
      if (shouldFail) {
        setShouldFail(false)
        throw new Error('Network unavailable')
      }
      setItems((current) => [...current, current.length + 1])
    },
    { distance: 12, canLoadMore: () => items.length < 20 },
  )

  return (
    <ExampleShowcase
      hookName="useInfiniteScroll"
      title="Error and retry"
      description="Failures are stored in error. reset() clears the error and re-arms measurement without mutating your items."
      instruction="Scroll to trigger the first failure, then click Retry."
      code={errorRetrySnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Error',
              value: error?.message ?? 'none',
              testId: 'error-message',
            },
            {
              label: 'Loading',
              value: String(isLoading),
              testId: 'error-loading',
            },
          ]}
        />
      }
    >
      <div
        ref={ref}
        tabIndex={0}
        aria-label="Retry list"
        data-testid="error-list"
        className={scrollerClass}
      >
        {items.map((item) => (
          <p key={item} className={`${itemClass} mb-2`}>
            Item {item}
          </p>
        ))}
      </div>
      {error ? (
        <p
          role="alert"
          className="text-sm text-rose-700"
          data-testid="error-alert"
        >
          {error.message}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="error-retry"
        className={primaryButtonClass}
        onClick={() => {
          reset()
        }}
      >
        Retry
      </button>
    </ExampleShowcase>
  )
}

export function EnabledStateExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(true)
  const [items, setItems] = useState([1, 2, 3, 4, 5, 6])
  useInfiniteScroll(
    ref,
    async () => {
      await delay(40)
      setItems((current) => [...current, current.length + 1])
    },
    {
      enabled,
      distance: 10,
      canLoadMore: () => items.length < 30,
    },
  )

  return (
    <ExampleShowcase
      hookName="useInfiniteScroll"
      title="Enabled state"
      description="Disabling removes listeners and observers without changing scroll position or calling the loader."
      instruction="Uncheck Enabled, scroll, then re-enable."
      code={enabledStateSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: String(enabled),
              testId: 'enabled-value',
            },
            {
              label: 'Items',
              value: String(items.length),
              testId: 'enabled-count',
            },
          ]}
        />
      }
    >
      <label className={labelClass}>
        <input
          type="checkbox"
          checked={enabled}
          data-testid="enabled-toggle"
          onChange={(event) => {
            setEnabled(event.target.checked)
          }}
        />
        Enabled
      </label>
      <div
        ref={ref}
        tabIndex={0}
        aria-label="Enabled list"
        data-testid="enabled-list"
        className={scrollerClass}
      >
        {items.map((item) => (
          <p key={item} className={`${itemClass} mb-2`}>
            Item {item}
          </p>
        ))}
      </div>
    </ExampleShowcase>
  )
}

export function DynamicTargetExample(): ReactElement {
  const firstRef = useRef<HTMLDivElement>(null)
  const secondRef = useRef<HTMLDivElement>(null)
  const [which, setWhich] = useState<'first' | 'second'>('first')
  const [first, setFirst] = useState([1, 2, 3, 4])
  const [second, setSecond] = useState([1, 2, 3, 4])

  useInfiniteScroll(
    which === 'first' ? firstRef : secondRef,
    async () => {
      await delay(40)
      if (which === 'first') {
        setFirst((current) => [...current, current.length + 1])
      } else {
        setSecond((current) => [...current, current.length + 1])
      }
    },
    { distance: 8 },
  )

  return (
    <ExampleShowcase
      hookName="useInfiniteScroll"
      title="Dynamic target"
      description="Switch tracking between containers. The previous target stops triggering loads."
      instruction="Load from the first list, switch to the second, then scroll the first again."
      code={dynamicTargetSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Tracking', value: which, testId: 'dynamic-which' },
            {
              label: 'First',
              value: String(first.length),
              testId: 'dynamic-first',
            },
            {
              label: 'Second',
              value: String(second.length),
              testId: 'dynamic-second',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="track-first"
          className={primaryButtonClass}
          onClick={() => {
            setWhich('first')
          }}
        >
          Track first
        </button>
        <button
          type="button"
          data-testid="track-second"
          className={primaryButtonClass}
          onClick={() => {
            setWhich('second')
          }}
        >
          Track second
        </button>
      </div>
      <div
        ref={firstRef}
        tabIndex={0}
        aria-label="First list"
        data-testid="dynamic-first-list"
        className={scrollerClass}
      >
        {first.map((item) => (
          <p key={item} className={`${itemClass} mb-2`}>
            First {item}
          </p>
        ))}
      </div>
      <div
        ref={secondRef}
        tabIndex={0}
        aria-label="Second list"
        data-testid="dynamic-second-list"
        className={scrollerClass}
      >
        {second.map((item) => (
          <p key={item} className={`${itemClass} mb-2`}>
            Second {item}
          </p>
        ))}
      </div>
    </ExampleShowcase>
  )
}

export function WindowScrollingExample(): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<Document | null>(null)
  const [ready, setReady] = useState(false)
  const [count, setCount] = useState(8)

  useInfiniteScroll(
    targetRef,
    async () => {
      await delay(40)
      setCount((value) => value + 4)
    },
    {
      distance: 40,
      canLoadMore: () => count < 40,
      enabled: ready,
    },
  )

  return (
    <ExampleShowcase
      hookName="useInfiniteScroll"
      title="Window scrolling"
      description="Document/window targets are supported. This Storybook demo uses an isolated iframe document so Docs does not auto-scroll."
      instruction="Scroll inside the iframe document near the bottom."
      code={windowScrollingSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Ready',
              value: String(ready),
              testId: 'window-ready',
            },
            {
              label: 'Batches',
              value: String(count),
              testId: 'window-count',
            },
          ]}
        />
      }
    >
      <iframe
        ref={iframeRef}
        title="Isolated scroll document"
        data-testid="window-iframe"
        className="h-64 w-full rounded-xl border border-slate-300"
        srcDoc={`<!doctype html><html><body style="font-family:sans-serif;margin:0;padding:16px;">
          <p>Scroll this isolated document.</p>
          <div style="height:160vh;background:linear-gradient(#eef2ff,#fff);"></div>
          <p id="end">Bottom</p>
        </body></html>`}
        onLoad={() => {
          targetRef.current = iframeRef.current?.contentDocument ?? null
          setReady(true)
        }}
      />
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  enabled = true,
  direction = 'bottom',
  distance = 10,
}: {
  enabled?: boolean
  direction?: 'top' | 'right' | 'bottom' | 'left'
  distance?: number
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState([1, 2, 3, 4, 5, 6])

  const { isLoading, reset } = useInfiniteScroll(
    ref,
    async () => {
      await delay(50)
      setItems((current) => [...current, current.length + 1])
    },
    {
      enabled: mounted && enabled,
      direction,
      distance,
      canLoadMore: () => items.length < 40,
    },
  )

  return (
    <ExampleShowcase
      hookName="useInfiniteScroll"
      title="Playground"
      description="Tune enabled, direction, and distance. Mounting is gated so Docs does not auto-load on open."
      instruction="Enable the playground mount toggle, then scroll."
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'pg-mounted',
            },
            {
              label: 'Loading',
              value: String(isLoading),
              testId: 'pg-loading',
            },
            {
              label: 'Items',
              value: String(items.length),
              testId: 'pg-count',
            },
          ]}
        />
      }
    >
      <label className={labelClass}>
        <input
          type="checkbox"
          checked={mounted}
          data-testid="pg-mount-toggle"
          onChange={(event) => {
            setMounted(event.target.checked)
          }}
        />
        Mount tracking
      </label>
      <div
        ref={ref}
        tabIndex={0}
        aria-label="Playground list"
        data-testid="pg-list"
        className={scrollerClass}
      >
        {items.map((item) => (
          <p key={item} className={`${itemClass} mb-2`}>
            Item {item}
          </p>
        ))}
      </div>
      <button
        type="button"
        data-testid="pg-reset"
        className={primaryButtonClass}
        onClick={() => {
          setItems([1, 2, 3, 4, 5, 6])
          reset()
        }}
      >
        Reset
      </button>
    </ExampleShowcase>
  )
}
