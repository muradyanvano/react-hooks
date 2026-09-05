const common = `import { useEffect, useState } from 'react'
import { useEventBus } from '@muradyanvano/react-hooks'

// Subscribe in an effect, never during render.
`

export const activityCenterSnippet = `${common}
const activityKey = Symbol('activity')

export function ActivityCenter() {
  const bus = useEventBus<string, { message: string }>(activityKey)
  const [items, setItems] = useState<string[]>([])

  useEffect(() => bus.on((event, payload) => {
    setItems((previous) => [\`\${event}: \${payload.message}\`, ...previous])
  }), [bus])

  return <button onClick={() => bus.emit('invoice.sent', { message: 'Invoice #104 sent' })}>Send event</button>
}`

export const basicSnippet = `${common}
export function BasicEmitAndListen() {
  const bus = useEventBus<string>('notifications')
  useEffect(() => bus.on((event) => console.log(event)), [bus])
  return <button type="button" onClick={() => bus.emit('opened')}>Emit opened</button>
}`

export const typedSymbolSnippet = `import { useEffect } from 'react'
import { useEventBus, type EventBusKey } from '@muradyanvano/react-hooks'

// Subscribe in an effect, never during render.
const key = Symbol('cart') as EventBusKey<'added', { sku: string }>

export function TypedSymbolKey() {
  const bus = useEventBus(key)
  useEffect(() => bus.on((event, payload) => console.log(event, payload.sku)), [bus])
  return <button type="button" onClick={() => bus.emit('added', { sku: 'SKU-104' })}>Add item</button>
}`

export const payloadSnippet = `${common}
export function EventPayload() {
  const bus = useEventBus<'task.updated', { id: number; done: boolean }>('tasks')
  useEffect(() => bus.on((event, payload) => console.log(event, payload)), [bus])
  return (
    <button
      type="button"
      onClick={() => bus.emit('task.updated', { id: 7, done: true })}
    >
      Update task
    </button>
  )
}`

export const multipleSubscribersSnippet = `${common}
const bus = useEventBus<string>('feed')
useEffect(() => bus.on((event) => console.log('first', event)), [bus])
useEffect(() => bus.on((event) => console.log('second', event)), [bus])`

export const onceSnippet = `${common}
const bus = useEventBus<string>('onboarding')
useEffect(() => bus.once((event) => console.log('only once:', event)), [bus])`

export const unsubscribeSnippet = `${common}
const bus = useEventBus<string>('editor')
useEffect(() => {
  const stop = bus.on((event) => console.log(event))
  return stop
}, [bus])
// stop() and bus.off(listener) remove this hook instance's registration.`

export const resetSnippet = `${common}
const bus = useEventBus<string>('session')
// Clears every listener on this channel, including other mounted owners.
bus.reset()`

export const independentChannelsSnippet = `${common}
export function IndependentChannels() {
  const notices = useEventBus<string>('notices')
  // Separate key — this channel never receives notices.emit calls.
  useEventBus<string>('audit')
  return (
    <button type="button" onClick={() => notices.emit('visible')}>
      Emit to notices
    </button>
  )
}`

export const dynamicKeySnippet = `${common}
const bus = useEventBus<string>(projectId)
useEffect(() => bus.on((event) => console.log(projectId, event)), [bus, projectId])
// Changing projectId removes this owner from the old channel; subscriptions do not migrate.`

export const nestedEmitSnippet = `${common}
const bus = useEventBus<string>('workflow')
useEffect(() => bus.on((event) => {
  if (event === 'saved') bus.emit('synced')
}), [bus])`

export const errorIsolationSnippet = `${common}
const bus = useEventBus<string>('jobs')
useEffect(() => bus.on(() => { throw new Error('example failure') }), [bus])
useEffect(() => bus.on((event) => console.log('still receives', event)), [bus])
// emit throws after all listeners in its snapshot have run.`

export const unmountCleanupSnippet = `${common}
function Subscriber() {
  const bus = useEventBus<string>('panel')
  useEffect(() => bus.on((event) => console.log(event)), [bus])
  return null
}
// Unmounting Subscriber removes only its subscriptions.`

export const playgroundSnippet = `${common}
export function Playground() {
  const bus = useEventBus<string, string>('playground')
  const [log, setLog] = useState<string[]>([])
  useEffect(() => bus.on((event, payload) => {
    setLog((items) => [...items, \`\${event}: \${payload}\`])
  }), [bus])
  return <button onClick={() => bus.emit('previewed', 'fictional payload')}>Emit</button>
}`
