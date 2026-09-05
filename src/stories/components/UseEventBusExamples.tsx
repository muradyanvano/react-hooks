import { useEffect, useState, type ReactElement } from 'react'

import {
  useEventBus,
  type EventBusIdentifier,
  type EventBusKey,
} from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
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

const buttonClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white outline-none hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'

function EventExample({
  title,
  description,
  code,
  channel = title,
  once = false,
}: {
  title: string
  description: string
  code: string
  channel?: EventBusIdentifier<string, string>
  once?: boolean
}): ReactElement {
  const { on, once: subscribeOnce, emit } = useEventBus<string, string>(channel)
  const [events, setEvents] = useState<string[]>([])
  useEffect(() => {
    const subscribe = once ? subscribeOnce : on
    return subscribe((event, payload) => {
      setEvents((previous) => [...previous, `${event}: ${payload}`])
    })
  }, [on, subscribeOnce, once])

  return (
    <ExampleShowcase
      hookName="useEventBus"
      title={title}
      description={description}
      instruction="Emit fictional activity and inspect the local delivery log."
      code={code}
      aside={
        <StatusPanel
          items={[{ label: 'Deliveries', value: String(events.length) }]}
        />
      }
    >
      <button
        className={buttonClass}
        type="button"
        onClick={() => emit('fictional.event', 'example payload')}
      >
        Emit fictional event
      </button>
      <output className="ml-3 text-sm text-slate-700" aria-live="polite">
        {events.join(' · ') || 'No deliveries yet'}
      </output>
    </ExampleShowcase>
  )
}

const activityKey = Symbol('storybook-activity')
export function ActivityCenterExample(): ReactElement {
  const { on, emit } = useEventBus<string, { message: string }>(activityKey)
  const [events, setEvents] = useState<string[]>([])
  useEffect(
    () =>
      on((event, payload) => {
        setEvents((previous) => [`${event}: ${payload.message}`, ...previous])
      }),
    [on],
  )
  return (
    <ExampleShowcase
      hookName="useEventBus"
      title="Event bus activity center"
      badge="Primary"
      description="A fictional operations dashboard emits local in-memory activity to its mounted subscribers."
      instruction="Send one of the fictional activities. This is neither persistence, networking, nor cross-tab synchronization."
      code={activityCenterSnippet}
      aside={
        <StatusPanel
          items={[{ label: 'Activity', value: String(events.length) }]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        {['Invoice sent', 'Report ready', 'Trial renewed'].map((message) => (
          <button
            className={buttonClass}
            key={message}
            type="button"
            onClick={() => emit('activity.received', { message })}
          >
            {message}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-sm text-slate-700" aria-live="polite">
        {events.length === 0 ? <li>No fictional activity yet.</li> : null}
        {events.map((event, index) => (
          <li key={`${event}-${index}`}>{event}</li>
        ))}
      </ul>
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
export const MultipleSubscribersExample = () => (
  <EventExample
    title="Multiple subscribers"
    description="Listeners run in registration order."
    code={multipleSubscribersSnippet}
  />
)
export const OnceExample = () => (
  <EventExample
    title="Once listener"
    description="A once listener removes itself before its callback runs."
    code={onceSnippet}
    once
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
  return (
    <div>
      <EventExample
        title="Dynamic key"
        description="Changing keys releases this owner’s old subscriptions; they do not migrate."
        code={dynamicKeySnippet}
        channel={key}
      />
      <button
        className={`${secondaryButtonClass} ml-4`}
        type="button"
        onClick={() =>
          setKey((value) => (value === 'project-a' ? 'project-b' : 'project-a'))
        }
      >
        Switch project
      </button>
    </div>
  )
}

export function ErrorIsolationExample(): ReactElement {
  const { on, emit } = useEventBus<string>('error-isolation')
  const [result, setResult] = useState('idle')
  useEffect(
    () =>
      on(() => {
        throw new Error('fictional listener failure')
      }),
    [on],
  )
  useEffect(() => on(() => setResult('healthy listener still ran')), [on])
  return (
    <ExampleShowcase
      hookName="useEventBus"
      title="Error isolation"
      description="Dispatch continues through its snapshot, then throws after all listeners run."
      instruction="Emit the fictional event; the example catches the final error."
      code={errorIsolationSnippet}
    >
      <button
        className={buttonClass}
        type="button"
        onClick={() => {
          try {
            emit('job.finished')
          } catch {
            setResult('error dispatched after healthy listener')
          }
        }}
      >
        Emit with failure
      </button>
      <p aria-live="polite">{result}</p>
    </ExampleShowcase>
  )
}

function MountedSubscriber(): ReactElement {
  const { on } = useEventBus<string>('unmount')
  useEffect(() => on(() => undefined), [on])
  return <p>Subscriber mounted</p>
}
export function UnmountCleanupExample(): ReactElement {
  const [mounted, setMounted] = useState(true)
  return (
    <ExampleShowcase
      hookName="useEventBus"
      title="Component unmount cleanup"
      description="Unmounting releases only this hook instance’s subscriptions."
      instruction="Unmount and remount the fictional subscriber."
      code={unmountCleanupSnippet}
    >
      <button
        className={buttonClass}
        type="button"
        onClick={() => setMounted((value) => !value)}
      >
        {mounted ? 'Unmount subscriber' : 'Mount subscriber'}
      </button>
      {mounted ? <MountedSubscriber /> : <p>Subscriber unmounted</p>}
    </ExampleShowcase>
  )
}
export const PlaygroundExample = () => (
  <EventExample
    title="Playground"
    description="An intentionally local, mount-safe event bus sandbox."
    code={playgroundSnippet}
    channel="playground"
  />
)
