export const dashboardSnippet = `import { useState } from 'react'
import { useWebSocket } from '@muradyanvano/react-hooks'

export function WebSocketDashboard() {
  const [draft, setDraft] = useState('hello')
  const { data, status, send } = useWebSocket<string>('wss://echo.example/chat')

  return (
    <section>
      <p>Status: {status}</p>
      <p>Last message: {data ?? '—'}</p>

      <label htmlFor="message">Message</label>
      <input
        id="message"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button type="button" onClick={() => send(draft)}>
        Send
      </button>
    </section>
  )
}`

export const liveConnectionSnippet = `import { useState } from 'react'
import { useWebSocket } from '@muradyanvano/react-hooks'

export function LiveWebSocketPanel() {
  const [url, setUrl] = useState('wss://echo.websocket.org')
  const { data, status, open, close, send } = useWebSocket<string>(url, {
    immediate: false,
  })

  return (
    <section>
      <label htmlFor="ws-url">WebSocket URL</label>
      <input
        id="ws-url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />

      <p>Status: {status}</p>
      <p>Last message: {data ?? '—'}</p>

      <button type="button" onClick={open} disabled={status !== 'CLOSED'}>
        Connect
      </button>
      <button type="button" onClick={() => close()} disabled={status === 'CLOSED'}>
        Disconnect
      </button>
      <button type="button" onClick={() => send('ping')} disabled={status !== 'OPEN'}>
        Send ping
      </button>
    </section>
  )
}`

export const manualConnectionSnippet = `import { useWebSocket } from '@muradyanvano/react-hooks'

export function ManualWebSocket() {
  const { status, data, open, close } = useWebSocket<string>(
    'wss://api.example/ws',
    { immediate: false },
  )

  return (
    <section>
      <p>Status: {status}</p>
      <p>Last message: {data ?? '—'}</p>
      <button type="button" onClick={open} disabled={status !== 'CLOSED'}>
        Connect
      </button>
      <button type="button" onClick={() => close()} disabled={status === 'CLOSED'}>
        Disconnect
      </button>
    </section>
  )
}`

export const sendBufferSnippet = `import { useWebSocket } from '@muradyanvano/react-hooks'

export function BufferedSend() {
  const { status, open, send } = useWebSocket('wss://queue.example/ws', {
    immediate: false,
  })

  return (
    <section>
      <p>Status: {status}</p>
      <button type="button" onClick={() => send('queued-1')}>
        Queue message
      </button>
      <button type="button" onClick={() => send('queued-2')}>
        Queue another
      </button>
      <button type="button" onClick={open} disabled={status !== 'CLOSED'}>
        Connect and flush
      </button>
    </section>
  )
}`

export const urlSwitchingSnippet = `import { useState } from 'react'
import { useWebSocket } from '@muradyanvano/react-hooks'

const ENDPOINTS = {
  primary: 'wss://primary.example/ws',
  backup: 'wss://backup.example/ws',
} as const

export function EndpointSwitcher() {
  const [endpoint, setEndpoint] =
    useState<(typeof ENDPOINTS)[keyof typeof ENDPOINTS]>(ENDPOINTS.primary)
  const { status, data } = useWebSocket<string>(endpoint)

  return (
    <section>
      <p>Active URL: {endpoint}</p>
      <p>Status: {status}</p>
      <p>Last message: {data ?? '—'}</p>
      <button type="button" onClick={() => setEndpoint(ENDPOINTS.primary)}>
        Use primary
      </button>
      <button type="button" onClick={() => setEndpoint(ENDPOINTS.backup)}>
        Use backup
      </button>
    </section>
  )
}`

export const protocolsSnippet = `import { useWebSocket } from '@muradyanvano/react-hooks'

export function ProtocolNegotiation() {
  const { status, ws } = useWebSocket('wss://chat.example/ws', {
    protocols: ['chat-v2', 'chat-v1'],
  })

  return (
    <section>
      <p>Status: {status}</p>
      <p>Negotiated protocol: {ws?.protocol ?? '—'}</p>
    </section>
  )
}`

export const connectionCallbacksSnippet = `import { useCallback, useState } from 'react'
import { useWebSocket } from '@muradyanvano/react-hooks'

type TimelineEntry = { id: number; label: string; detail?: string }

export function ConnectionCallbacks() {
  const [events, setEvents] = useState<TimelineEntry[]>([])
  const push = useCallback((label: string, detail?: string) => {
    setEvents((previous) => [
      { id: previous.length + 1, label, detail },
      ...previous,
    ])
  }, [])

  const { status, data } = useWebSocket<string>('wss://events.example/ws', {
    onConnected: () => push('connected'),
    onMessage: (_socket, event) => push('message', String(event.data)),
    onError: () => push('error'),
    onDisconnected: (_socket, event) =>
      push('disconnected', \`code \${event.code}\`),
  })

  return (
    <section>
      <p>Status: {status}</p>
      <p>Last message: {data ?? '—'}</p>
      <ol aria-label="Connection events">
        {events.map((entry) => (
          <li key={entry.id}>
            {entry.label}
            {entry.detail ? \`: \${entry.detail}\` : ''}
          </li>
        ))}
      </ol>
    </section>
  )
}`

export const automaticReconnectSnippet = `import { useWebSocket } from '@muradyanvano/react-hooks'

export function AutoReconnectSocket() {
  const { status, data } = useWebSocket<string>('wss://live.example/ws', {
    autoReconnect: true,
  })

  return (
    <section>
      <p>Status: {status}</p>
      <p>Last message: {data ?? '—'}</p>
      <p>Unexpected closes schedule a reconnect after the default 1s delay.</p>
    </section>
  )
}`

export const backoffStrategySnippet = `import { useWebSocket } from '@muradyanvano/react-hooks'

export function BackoffReconnect() {
  const { status } = useWebSocket('wss://retry.example/ws', {
    autoReconnect: {
      retries: -1,
      delay: (attempt) => Math.min(attempt * 200, 1000),
    },
  })

  return (
    <section>
      <p>Status: {status}</p>
      <p>Delay grows linearly: 200ms, 400ms, 600ms, … capped at 1s.</p>
    </section>
  )
}`

export const retriesExhaustedSnippet = `import { useState } from 'react'
import { useWebSocket } from '@muradyanvano/react-hooks'

export function LimitedRetries() {
  const [failed, setFailed] = useState(false)
  const { status } = useWebSocket('wss://fragile.example/ws', {
    autoReconnect: {
      retries: 2,
      delay: 250,
      onFailed: () => setFailed(true),
    },
  })

  return (
    <section>
      <p>Status: {status}</p>
      <p role="status">{failed ? 'Reconnect retries exhausted' : 'Retrying…'}</p>
    </section>
  )
}`

export const heartbeatSnippet = `import { useWebSocket } from '@muradyanvano/react-hooks'

export function HeartbeatSocket() {
  const { status } = useWebSocket('wss://keepalive.example/ws', {
    heartbeat: {
      message: 'ping',
      responseMessage: 'pong',
      interval: 1000,
      pongTimeout: 500,
    },
  })

  return (
    <section>
      <p>Status: {status}</p>
      <p>Periodic ping frames keep the connection alive.</p>
    </section>
  )
}`

export const heartbeatTimeoutSnippet = `import { useWebSocket } from '@muradyanvano/react-hooks'

export function HeartbeatTimeout() {
  const { status } = useWebSocket('wss://silent.example/ws', {
    autoReconnect: false,
    heartbeat: {
      message: 'ping',
      responseMessage: 'pong',
      interval: 200,
      pongTimeout: 100,
    },
  })

  return (
    <section>
      <p>Status: {status}</p>
      <p>Missing pong responses close the socket with code 4000.</p>
    </section>
  )
}`

export const explicitCloseSnippet = `import { useWebSocket } from '@muradyanvano/react-hooks'

export function ExplicitClose() {
  const { status, close } = useWebSocket('wss://session.example/ws')

  return (
    <section>
      <p>Status: {status}</p>
      <button
        type="button"
        onClick={() => close(1000, 'Client goodbye')}
        disabled={status === 'CLOSED'}
      >
        Close gracefully
      </button>
    </section>
  )
}`

export const binaryMessagesSnippet = `import { useWebSocket } from '@muradyanvano/react-hooks'

function describeBinary(data: ArrayBuffer | null) {
  if (data == null) return '—'
  return \`\${data.byteLength} bytes\`
}

export function BinarySocket() {
  const { status, data } = useWebSocket<ArrayBuffer>(
    'wss://binary.example/ws',
    { binaryType: 'arraybuffer' },
  )

  return (
    <section>
      <p>Status: {status}</p>
      <p>Last payload: {describeBinary(data)}</p>
    </section>
  )
}`

export const connectionErrorSnippet = `import { useState } from 'react'
import { useWebSocket } from '@muradyanvano/react-hooks'

export function ErrorAwareSocket() {
  const [errors, setErrors] = useState(0)
  const { status } = useWebSocket('wss://unstable.example/ws', {
    onError: () => setErrors((count) => count + 1),
  })

  return (
    <section>
      <p>Status: {status}</p>
      <p role="status">Transport errors: {errors}</p>
    </section>
  )
}`

export const lifecycleCleanupSnippet = `import { useState } from 'react'
import { useWebSocket } from '@muradyanvano/react-hooks'

function SocketOwner() {
  const { status } = useWebSocket('wss://session.example/ws')
  return <p>Hook mounted · status: {status}</p>
}

export function LifecycleCleanup() {
  const [mounted, setMounted] = useState(true)

  return (
    <section>
      <button type="button" onClick={() => setMounted((value) => !value)}>
        {mounted ? 'Unmount hook' : 'Remount hook'}
      </button>
      {mounted ? <SocketOwner key="socket-owner" /> : null}
    </section>
  )
}`

export const playgroundSnippet = `import { useState } from 'react'
import { useWebSocket } from '@muradyanvano/react-hooks'

export function WebSocketPlayground(props: {
  url: string
  immediate: boolean
  autoReconnect: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const { status, data, open, close, send } = useWebSocket<string>(
    mounted ? props.url : null,
    {
      immediate: props.immediate,
      autoReconnect: props.autoReconnect,
    },
  )

  return (
    <section>
      <label>
        <input
          type="checkbox"
          checked={mounted}
          onChange={(event) => setMounted(event.target.checked)}
        />
        Mount hook
      </label>
      <p>Status: {status}</p>
      <p>Last message: {data ?? '—'}</p>
      <button type="button" onClick={open} disabled={!mounted || status !== 'CLOSED'}>
        Connect
      </button>
      <button type="button" onClick={() => close()} disabled={status === 'CLOSED'}>
        Disconnect
      </button>
      <button type="button" onClick={() => send('hello')} disabled={status !== 'OPEN'}>
        Send hello
      </button>
    </section>
  )
}`
