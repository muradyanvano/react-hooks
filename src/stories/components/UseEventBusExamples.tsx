import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react'

import {
  useEventBus,
  type EventBusIdentifier,
  type EventBusKey,
} from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import { Callout, ControlBar, MetricGrid, MetricTile } from './ui'
import {
  activityCenterSnippet,
  basicSnippet,
  dynamicKeySnippet,
  errorIsolationSnippet,
  independentChannelsSnippet,
  multipleSubscribersSnippet,
  nestedEmitSnippet,
  onceSnippet,
  payloadSnippet,
  playgroundSnippet,
  resetSnippet,
  typedSymbolSnippet,
  unmountCleanupSnippet,
  unsubscribeSnippet,
} from './useEventBus.snippets'

const primaryButtonClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white outline-none hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const panelClass = 'rounded-xl border border-slate-200 bg-slate-50 p-3'

type TimelineEntry = { id: number; at: string; line: string }

function Timeline({
  entries,
  emptyLabel,
}: {
  entries: TimelineEntry[]
  emptyLabel: string
}) {
  return (
    <div className={panelClass}>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Timeline
      </p>
      <ol
        className="mt-3 max-h-48 space-y-2 overflow-y-auto"
        aria-live="polite"
        data-testid="eventbus-timeline"
      >
        {entries.length === 0 ? (
          <li className="text-sm text-slate-500">{emptyLabel}</li>
        ) : (
          entries.map((entry) => (
            <li
              key={entry.id}
              className="flex gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <time className="shrink-0 font-mono text-[11px] text-slate-600">
                {entry.at}
              </time>
              <span className="min-w-0 [overflow-wrap:anywhere] text-slate-800">
                {entry.line}
              </span>
            </li>
          ))
        )}
      </ol>
    </div>
  )
}

function useTimelineLogger() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const idRef = useRef(0)

  const log = useCallback((line: string) => {
    const stamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    setEntries((previous) => [
      { id: ++idRef.current, at: stamp, line },
      ...previous.slice(0, 11),
    ])
  }, [])

  return { entries, log }
}

function EventExample({
  title,
  description,
  code,
  channel = title,
  once = false,
  layout = 'form' as const,
}: {
  title: string
  description: string
  code: string
  channel?: EventBusIdentifier<string, string>
  once?: boolean
  layout?: 'single' | 'dashboard' | 'form'
}): ReactElement {
  const { on, once: subscribeOnce, emit } = useEventBus<string, string>(channel)
  const { entries, log } = useTimelineLogger()

  useEffect(() => {
    const subscribe = once ? subscribeOnce : on
    return subscribe((event, payload) => {
      log(`${once ? '[once] ' : ''}${event}: ${payload}`)
    })
  }, [on, subscribeOnce, once, log])

  return (
    <ExampleShowcase
      hookName="useEventBus"
      layout={layout}
      title={title}
      description={description}
      instruction="Emit fictional activity and inspect the local delivery log."
      code={code}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Deliveries',
              value: String(entries.length),
              testId: 'eventbus-deliveries',
            },
          ]}
        />
      }
    >
      <ControlBar label="Publisher">
        <button
          className={primaryButtonClass}
          type="button"
          onClick={() => emit('fictional.event', 'example payload')}
        >
          Emit fictional event
        </button>
      </ControlBar>
      <Timeline entries={entries} emptyLabel="No deliveries yet" />
    </ExampleShowcase>
  )
}

const activityKey = Symbol('storybook-activity')

function ActivitySubscriber({
  label,
  onDelivery,
}: {
  label: string
  onDelivery: (line: string) => void
}) {
  const { on } = useEventBus<string, { message: string }>(activityKey)

  useEffect(
    () =>
      on((event, payload) => {
        onDelivery(`${label} heard ${event}: ${payload.message}`)
      }),
    [on, label, onDelivery],
  )

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-medium text-slate-500">Subscriber</p>
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-xs text-emerald-700">Listening in this mount</p>
    </div>
  )
}

function OnceActivityListener({
  onDelivery,
}: {
  onDelivery: (line: string) => void
}) {
  const { once } = useEventBus<string, { message: string }>(activityKey)

  useEffect(
    () =>
      once((event, payload) => {
        onDelivery(`Once listener fired for ${event}: ${payload.message}`)
      }),
    [once, onDelivery],
  )

  return (
    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2">
      <p className="text-xs font-medium text-amber-800">Once listener</p>
      <p className="text-sm text-amber-950">
        Auto-unsubscribes after first delivery
      </p>
    </div>
  )
}

export function ActivityCenterExample(): ReactElement {
  const { emit } = useEventBus<string, { message: string }>(activityKey)
  const { entries, log } = useTimelineLogger()

  const publish = (message: string) => {
    emit('activity.received', { message })
    log(`Published activity.received → ${message}`)
  }

  return (
    <ExampleShowcase
      hookName="useEventBus"
      layout="dashboard"
      title="Event bus activity center"
      badge="Primary"
      description="A fictional operations dashboard emits local in-memory activity to its mounted subscribers."
      instruction="Send one of the fictional activities. This is neither persistence, networking, nor cross-tab synchronization."
      code={activityCenterSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Timeline entries',
              value: String(entries.length),
              testId: 'eventbus-deliveries',
            },
            { label: 'Scope', value: 'In-memory only' },
            { label: 'Subscribers', value: '3 mounted' },
          ]}
        />
      }
      notes="Events stay inside this page — no network, storage, or cross-tab delivery."
    >
      <Callout tone="info" title="Local-only bus">
        Publishers and subscribers share one in-memory channel while components
        are mounted.
      </Callout>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-900">Publishers</p>
          <ControlBar label="Activity publishers">
            {['Invoice sent', 'Report ready', 'Trial renewed'].map(
              (message) => (
                <button
                  className={primaryButtonClass}
                  key={message}
                  type="button"
                  onClick={() => publish(message)}
                >
                  {message}
                </button>
              ),
            )}
          </ControlBar>

          <MetricGrid columns={3}>
            <MetricTile label="Channel" value="activityKey" />
            <MetricTile label="Subscribers" value="3" />
            <MetricTile label="Deliveries" value={entries.length} />
          </MetricGrid>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-900">Subscribers</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ActivitySubscriber label="Dashboard panel" onDelivery={log} />
            <ActivitySubscriber label="Toast queue" onDelivery={log} />
            <OnceActivityListener onDelivery={log} />
          </div>
        </div>
      </div>

      <Timeline entries={entries} emptyLabel="No fictional activity yet." />
    </ExampleShowcase>
  )
}

export const BasicExample = () => (
  <EventExample
    title="Basic emit and listen"
    description="Subscribe after mount and synchronously emit a typed event."
    code={basicSnippet}
  />
)

export function TypedSymbolExample(): ReactElement {
  const [key] = useState(
    () => Symbol('typed-symbol') as EventBusKey<string, string>,
  )
  return (
    <EventExample
      title="Typed symbol key"
      description="A symbol keeps this channel distinct from string and number keys."
      code={typedSymbolSnippet}
      channel={key}
    />
  )
}

export const PayloadExample = () => (
  <EventExample
    title="Event payload"
    description="Events and payloads can each be fully typed."
    code={payloadSnippet}
  />
)

export function MultipleSubscribersExample(): ReactElement {
  const channel = 'multiple-subscribers'
  const { on, emit } = useEventBus<string, string>(channel)
  const { entries, log } = useTimelineLogger()

  useEffect(() => on((event) => log(`First: ${event}`)), [on, log])
  useEffect(() => on((event) => log(`Second: ${event}`)), [on, log])

  return (
    <ExampleShowcase
      hookName="useEventBus"
      layout="dashboard"
      title="Multiple subscribers"
      description="Listeners run in registration order."
      instruction="Emit once and watch both subscribers receive the event."
      code={multipleSubscribersSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Subscribers', value: '2' },
            {
              label: 'Deliveries',
              value: String(entries.length),
              testId: 'eventbus-deliveries',
            },
          ]}
        />
      }
    >
      <MetricGrid columns={2}>
        <MetricTile label="Subscriber A" value="First" />
        <MetricTile label="Subscriber B" value="Second" />
      </MetricGrid>
      <ControlBar label="Multiple subscribers">
        <button
          className={primaryButtonClass}
          type="button"
          onClick={() => emit('fictional.event', 'shared payload')}
        >
          Emit to both
        </button>
      </ControlBar>
      <Timeline entries={entries} emptyLabel="Waiting for an emit…" />
    </ExampleShowcase>
  )
}

export const OnceExample = () => (
  <EventExample
    title="Once listener"
    description="A once listener removes itself before its callback runs."
    code={onceSnippet}
    once
    layout="form"
  />
)

export const UnsubscribeExample = () => (
  <EventExample
    title="Unsubscribe"
    description="A returned stop function or off removes this owner’s listener."
    code={unsubscribeSnippet}
  />
)

export const ResetExample = () => (
  <EventExample
    title="Reset channel"
    description="Reset intentionally clears every owner’s listener on this channel."
    code={resetSnippet}
  />
)

export const IndependentChannelsExample = () => (
  <EventExample
    title="Independent channels"
    description="Separate key values never share listeners."
    code={independentChannelsSnippet}
  />
)

export const NestedEmitExample = () => (
  <EventExample
    title="Nested emit"
    description="A listener may synchronously emit another event."
    code={nestedEmitSnippet}
  />
)

export function DynamicKeyExample(): ReactElement {
  const [key, setKey] = useState('project-a')
  const { on, emit } = useEventBus<string, string>(key)
  const { entries, log } = useTimelineLogger()

  useEffect(() => {
    return on((event, payload) => {
      log(`[${key}] ${event}: ${payload}`)
    })
  }, [on, key, log])

  return (
    <ExampleShowcase
      hookName="useEventBus"
      layout="form"
      title="Dynamic key"
      description="Changing keys releases this owner’s old subscriptions; they do not migrate."
      instruction="Switch projects, then emit. Only the active channel receives events."
      code={dynamicKeySnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Active key', value: key },
            {
              label: 'Deliveries',
              value: String(entries.length),
              testId: 'eventbus-deliveries',
            },
          ]}
        />
      }
    >
      <ControlBar label="Dynamic key">
        <button
          className={secondaryButtonClass}
          type="button"
          onClick={() =>
            setKey((value) =>
              value === 'project-a' ? 'project-b' : 'project-a',
            )
          }
        >
          Switch to {key === 'project-a' ? 'project-b' : 'project-a'}
        </button>
        <button
          className={primaryButtonClass}
          type="button"
          onClick={() => emit('fictional.event', 'example payload')}
        >
          Emit on {key}
        </button>
      </ControlBar>
      <Timeline entries={entries} emptyLabel="Switch keys or emit an event." />
    </ExampleShowcase>
  )
}

export function ErrorIsolationExample(): ReactElement {
  const { on, emit } = useEventBus<string>('error-isolation')
  const [result, setResult] = useState('idle')
  const { entries, log } = useTimelineLogger()

  useEffect(
    () =>
      on(() => {
        throw new Error('fictional listener failure')
      }),
    [on],
  )
  useEffect(
    () =>
      on(() => {
        log('Healthy listener ran')
        setResult('healthy listener still ran')
      }),
    [on, log],
  )

  return (
    <ExampleShowcase
      hookName="useEventBus"
      layout="form"
      title="Error isolation"
      description="Dispatch continues through its snapshot, then throws after all listeners run."
      instruction="Emit the fictional event; the example catches the final error."
      code={errorIsolationSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Result', value: result, testId: 'eventbus-result' },
          ]}
        />
      }
    >
      <ControlBar label="Error isolation">
        <button
          className={primaryButtonClass}
          type="button"
          onClick={() => {
            try {
              emit('job.finished')
            } catch {
              setResult('error dispatched after healthy listener')
              log('Dispatch threw after listeners finished')
            }
          }}
        >
          Emit with failure
        </button>
      </ControlBar>
      <Timeline
        entries={entries}
        emptyLabel="Emit to inspect listener order."
      />
    </ExampleShowcase>
  )
}

function MountedSubscriber(): ReactElement {
  const { on } = useEventBus<string>('unmount')
  useEffect(() => on(() => undefined), [on])
  return <p data-testid="eventbus-subscriber-status">Subscriber mounted</p>
}

export function UnmountCleanupExample(): ReactElement {
  const [mounted, setMounted] = useState(true)
  return (
    <ExampleShowcase
      hookName="useEventBus"
      layout="single"
      title="Component unmount cleanup"
      description="Unmounting releases only this hook instance’s subscriptions."
      instruction="Unmount and remount the fictional subscriber."
      code={unmountCleanupSnippet}
    >
      <ControlBar label="Mount controls">
        <button
          className={primaryButtonClass}
          type="button"
          onClick={() => setMounted((value) => !value)}
        >
          {mounted ? 'Unmount subscriber' : 'Mount subscriber'}
        </button>
      </ControlBar>
      {mounted ? (
        <MountedSubscriber />
      ) : (
        <p data-testid="eventbus-subscriber-status">Subscriber unmounted</p>
      )}
    </ExampleShowcase>
  )
}

export const PlaygroundExample = () => (
  <EventExample
    title="Playground"
    description="An intentionally local, mount-safe event bus sandbox."
    code={playgroundSnippet}
    channel="playground"
    layout="dashboard"
  />
)
