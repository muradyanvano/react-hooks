import {
  useCallback,
  useEffect,
  useId,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import { useWebSocket } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  automaticReconnectSnippet,
  backoffStrategySnippet,
  binaryMessagesSnippet,
  connectionCallbacksSnippet,
  connectionErrorSnippet,
  dashboardSnippet,
  explicitCloseSnippet,
  heartbeatSnippet,
  heartbeatTimeoutSnippet,
  lifecycleCleanupSnippet,
  liveConnectionSnippet,
  manualConnectionSnippet,
  playgroundSnippet,
  protocolsSnippet,
  retriesExhaustedSnippet,
  sendBufferSnippet,
  urlSwitchingSnippet,
} from './useWebSocket.snippets'
import {
  createWebSocketMock,
  WS_CONNECTING,
  WS_OPEN,
  type WebSocketMockController,
  type WebSocketMockInstance,
} from './webSocketMock'

const primaryButtonClass =
  'rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'
const dangerButtonClass =
  'rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800 outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'

const MOCK_PRIMARY_URL = 'wss://storybook.example/chat'
const MOCK_BACKUP_URL = 'wss://storybook.example/backup'
const MOCK_PROTOCOL_URL = 'wss://storybook.example/protocols'

type TimelineEntry = {
  id: number
  label: string
  detail?: string | undefined
}

function statusBadge(status: string): string {
  if (status === 'OPEN') {
    return 'Connected'
  }
  if (status === 'CONNECTING') {
    return 'Connecting…'
  }
  return 'Closed'
}

function statusBadgeClass(status: string): string {
  if (status === 'OPEN') {
    return 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
  }
  if (status === 'CONNECTING') {
    return 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 motion-reduce:animate-none animate-pulse'
  }
  return 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600'
}

function formatPayload(data: unknown): string {
  if (data == null) {
    return '—'
  }
  if (typeof data === 'string') {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return `${data.byteLength} bytes`
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return `Blob(${data.size} bytes)`
  }
  return String(data)
}

function EventTimeline({
  events,
  testId = 'event-timeline',
  emptyLabel = 'No events yet.',
}: {
  events: TimelineEntry[]
  testId?: string | undefined
  emptyLabel?: string | undefined
}) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-3"
      data-testid={testId}
    >
      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Event timeline
      </h3>
      {events.length === 0 ? (
        <p
          className="mt-3 text-sm text-slate-500"
          data-testid={`${testId}-empty`}
        >
          {emptyLabel}
        </p>
      ) : (
        <ol
          aria-label="Connection events"
          className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm"
          data-testid={`${testId}-list`}
        >
          {events.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              data-testid={`${testId}-item-${entry.id}`}
            >
              <span className="font-semibold text-indigo-700">
                {entry.label}
              </span>
              {entry.detail ? (
                <span className="text-slate-600"> · {entry.detail}</span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function WithWebSocketMock({
  children,
  autoOpen = true,
  openDelay = 30,
  autoPong = false,
  pingMessage = 'ping',
  pongMessage = 'pong',
  supported = true,
  onReady,
}: {
  children: (controller: WebSocketMockController) => ReactNode
  autoOpen?: boolean | undefined
  openDelay?: number | undefined
  autoPong?: boolean | undefined
  pingMessage?: string | ArrayBuffer | Blob | undefined
  pongMessage?: string | ArrayBuffer | Blob | undefined
  supported?: boolean | undefined
  onReady?: ((controller: WebSocketMockController) => void) | undefined
}) {
  const [controller] = useState(() =>
    createWebSocketMock({
      autoOpen,
      openDelay,
      autoPong,
      pingMessage,
      pongMessage,
      supported,
    }),
  )

  if (!controller.isInstalled()) {
    controller.install()
  }

  useEffect(() => {
    controller.install()
    controller.setAutoOpen(autoOpen)
    controller.setOpenDelay(openDelay)
    controller.setAutoPong(autoPong)
    controller.setPingMessage(pingMessage)
    controller.setPongMessage(pongMessage)
    controller.setSupported(supported)
    onReady?.(controller)
    return () => {
      controller.cancelAllScheduledMessages()
      controller.uninstall()
    }
  }, [
    controller,
    autoOpen,
    openDelay,
    autoPong,
    pingMessage,
    pongMessage,
    supported,
    onReady,
  ])

  return <>{children(controller)}</>
}

function useTimelineReducer() {
  const [events, dispatch] = useReducer(
    (
      state: TimelineEntry[],
      action: { type: 'push'; label: string; detail?: string | undefined },
    ) => [
      { id: state.length + 1, label: action.label, detail: action.detail },
      ...state,
    ],
    [],
  )
  const push = useCallback((label: string, detail?: string) => {
    dispatch({ type: 'push', label, detail })
  }, [])
  return { events, push }
}

export function DashboardExample() {
  return (
    <WithWebSocketMock
      onReady={(controller) => {
        controller.scheduleServerMessage('welcome from server', 80)
      }}
    >
      {() => <DashboardBody />}
    </WithWebSocketMock>
  )
}

function DashboardBody() {
  const [draft, setDraft] = useState('hello')
  const messageId = useId()
  const { data, status, send } = useWebSocket<string>(MOCK_PRIMARY_URL)

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="WebSocket dashboard"
      description="Primary overview of connection status, incoming messages, and outbound send. This story uses a deterministic Storybook mock — no real network."
      instruction='Wait for the mock server to connect, edit the message, then click "Send".'
      badge={statusBadge(status)}
      code={dashboardSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'dash-status' },
            {
              label: 'Last message',
              value: formatPayload(data),
              testId: 'dash-data',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={statusBadgeClass(status)} data-testid="dash-badge">
          {statusBadge(status)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label htmlFor={messageId} className="sr-only">
          Outbound message
        </label>
        <input
          id={messageId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          data-testid="dash-input"
        />
        <button
          type="button"
          className={primaryButtonClass}
          disabled={status !== 'OPEN'}
          data-testid="dash-send"
          onClick={() => send(draft)}
        >
          Send
        </button>
      </div>

      <p
        aria-live="polite"
        className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900"
        data-testid="dash-live"
      >
        Last inbound: {formatPayload(data)}
      </p>
    </ExampleShowcase>
  )
}

export function LiveConnectionExample() {
  const [url, setUrl] = useState('wss://echo.websocket.org')
  const urlId = useId()
  const { data, status, open, close, send } = useWebSocket<string>(url, {
    immediate: false,
  })

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Live connection"
      description="Uses the real WebSocket constructor with immediate: false so nothing connects until you click Connect. Edit the URL for your own server — this is the only story that may reach the public internet."
      instruction='Edit the URL if needed, then click "Connect" when you are ready. Automated tests never connect here.'
      badge={statusBadge(status)}
      code={liveConnectionSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'live-status' },
            {
              label: 'URL',
              value: url.length > 28 ? `${url.slice(0, 28)}…` : url,
              testId: 'live-url-summary',
            },
            {
              label: 'Last message',
              value: formatPayload(data),
              testId: 'live-data',
            },
          ]}
        />
      }
    >
      <label
        htmlFor={urlId}
        className="block text-sm font-medium text-slate-700"
      >
        WebSocket URL
      </label>
      <input
        id={urlId}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        data-testid="live-url-input"
        spellCheck={false}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          disabled={status !== 'CLOSED'}
          data-testid="live-connect"
          onClick={open}
        >
          Connect
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={status === 'CLOSED'}
          data-testid="live-disconnect"
          onClick={() => close()}
        >
          Disconnect
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={status !== 'OPEN'}
          data-testid="live-send"
          onClick={() => send('ping')}
        >
          Send ping
        </button>
      </div>

      <p
        aria-live="polite"
        className="mt-3 text-sm text-slate-600"
        data-testid="live-hint"
      >
        {status === 'CLOSED'
          ? 'Idle — connection opens only after Connect.'
          : `Live socket is ${status.toLowerCase()}.`}
      </p>
    </ExampleShowcase>
  )
}

export function ManualConnectionExample() {
  return (
    <WithWebSocketMock>
      {(controller) => <ManualConnectionBody controller={controller} />}
    </WithWebSocketMock>
  )
}

function ManualConnectionBody({
  controller,
}: {
  controller: WebSocketMockController
}) {
  const { status, data, open, close } = useWebSocket<string>(MOCK_PRIMARY_URL, {
    immediate: false,
  })

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Manual connection"
      description="immediate: false keeps the hook closed on mount. Call open() from a button when you are ready."
      instruction='Click "Connect" to open the mocked socket, then "Disconnect" to close it.'
      badge={statusBadge(status)}
      code={manualConnectionSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'manual-status' },
            {
              label: 'Instances',
              value: String(controller.getInstanceCount()),
              testId: 'manual-instances',
            },
            {
              label: 'Last message',
              value: formatPayload(data),
              testId: 'manual-data',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          disabled={status !== 'CLOSED'}
          data-testid="manual-connect"
          onClick={open}
        >
          Connect
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={status === 'CLOSED'}
          data-testid="manual-disconnect"
          onClick={() => close()}
        >
          Disconnect
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="manual-push-message"
          disabled={status !== 'OPEN'}
          onClick={() => controller.sendServerMessage('manual push')}
        >
          Push server message
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function SendBufferExample() {
  return (
    <WithWebSocketMock>
      {(controller) => <SendBufferBody controller={controller} />}
    </WithWebSocketMock>
  )
}

function SendBufferBody({
  controller,
}: {
  controller: WebSocketMockController
}) {
  const { status, open, send } = useWebSocket<string>(MOCK_PRIMARY_URL, {
    immediate: false,
  })
  const sentCount = controller.getLastInstance()?.sent.length ?? 0

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Send buffer"
      description="send() queues payloads while the socket is closed or connecting. The buffer flushes automatically after the connection opens."
      instruction='Queue messages while closed, then click "Connect and flush".'
      badge={statusBadge(status)}
      code={sendBufferSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'buffer-status' },
            {
              label: 'Sent on wire',
              value: String(sentCount),
              testId: 'buffer-sent-count',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="buffer-queue-1"
          onClick={() => send('queued-1')}
        >
          Queue message
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="buffer-queue-2"
          onClick={() => send('queued-2')}
        >
          Queue another
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={status !== 'CLOSED'}
          data-testid="buffer-connect"
          onClick={open}
        >
          Connect and flush
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function UrlSwitchingExample() {
  return (
    <WithWebSocketMock
      onReady={(controller) => {
        controller.scheduleServerMessage('primary hello', 60)
      }}
    >
      {(controller) => <UrlSwitchingBody controller={controller} />}
    </WithWebSocketMock>
  )
}

function UrlSwitchingBody({
  controller,
}: {
  controller: WebSocketMockController
}) {
  const [endpoint, setEndpoint] = useState(MOCK_PRIMARY_URL)
  const { status, data } = useWebSocket<string>(endpoint)

  useEffect(() => {
    if (endpoint === MOCK_BACKUP_URL) {
      controller.scheduleServerMessage('backup hello', 40)
    }
  }, [controller, endpoint])

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="URL switching"
      description="Changing the URL closes the previous socket and opens a new endpoint when autoConnect is true (default)."
      instruction="Switch between primary and backup endpoints and watch status plus the last message update."
      badge={statusBadge(status)}
      code={urlSwitchingSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'url-status' },
            {
              label: 'Active URL',
              value: endpoint.includes('backup') ? 'backup' : 'primary',
              testId: 'url-active',
            },
            {
              label: 'Generations',
              value: String(controller.getConnectionAttemptCount()),
              testId: 'url-generations',
            },
            {
              label: 'Last message',
              value: formatPayload(data),
              testId: 'url-data',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="url-primary"
          onClick={() => setEndpoint(MOCK_PRIMARY_URL)}
        >
          Use primary
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="url-backup"
          onClick={() => setEndpoint(MOCK_BACKUP_URL)}
        >
          Use backup
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function ProtocolsExample() {
  return <WithWebSocketMock>{() => <ProtocolsBody />}</WithWebSocketMock>
}

function ProtocolsBody() {
  const { status, ws, open } = useWebSocket(MOCK_PROTOCOL_URL, {
    immediate: false,
    protocols: ['chat-v2', 'chat-v1'],
  })

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Protocols"
      description="Pass a subprotocol string or array. The mock negotiates the first listed protocol, matching typical browser behavior."
      instruction='Click "Connect" to open with protocols ["chat-v2", "chat-v1"].'
      badge={statusBadge(status)}
      code={protocolsSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'proto-status' },
            {
              label: 'Negotiated',
              value: ws?.protocol ?? '—',
              testId: 'proto-value',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={primaryButtonClass}
        disabled={status !== 'CLOSED'}
        data-testid="proto-connect"
        onClick={open}
      >
        Connect
      </button>
    </ExampleShowcase>
  )
}

export function ConnectionCallbacksExample() {
  return (
    <WithWebSocketMock
      onReady={(controller) => {
        controller.scheduleServerMessage('timeline payload', 70)
      }}
    >
      {(controller) => <ConnectionCallbacksBody controller={controller} />}
    </WithWebSocketMock>
  )
}

function ConnectionCallbacksBody({
  controller,
}: {
  controller: WebSocketMockController
}) {
  const { events, push } = useTimelineReducer()
  const { status, data } = useWebSocket<string>(MOCK_PRIMARY_URL, {
    onConnected: () => push('connected'),
    onMessage: (_socket, event) => push('message', String(event.data)),
    onError: () => push('error'),
    onDisconnected: (_socket, event) =>
      push('disconnected', `code ${event.code}`),
  })

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Connection callbacks"
      description="Optional onConnected, onMessage, onError, and onDisconnected handlers always receive the latest closure."
      instruction='Watch the timeline fill as the mock connects, delivers a message, then click "Simulate drop" to close.'
      badge={statusBadge(status)}
      code={connectionCallbacksSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'cb-status' },
            {
              label: 'Last message',
              value: formatPayload(data),
              testId: 'cb-data',
            },
            {
              label: 'Events',
              value: String(events.length),
              testId: 'cb-event-count',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={dangerButtonClass}
          disabled={status !== 'OPEN'}
          data-testid="cb-simulate-drop"
          onClick={() => controller.closeLast(1006, 'drop', false)}
        >
          Simulate drop
        </button>
      </div>
      <div className="mt-4">
        <EventTimeline events={events} testId="cb-timeline" />
      </div>
    </ExampleShowcase>
  )
}

export function AutomaticReconnectExample() {
  return (
    <WithWebSocketMock openDelay={20}>
      {(controller) => <AutomaticReconnectBody controller={controller} />}
    </WithWebSocketMock>
  )
}

function AutomaticReconnectBody({
  controller,
}: {
  controller: WebSocketMockController
}) {
  const { status, data } = useWebSocket<string>(MOCK_PRIMARY_URL, {
    autoReconnect: { delay: 80 },
  })

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Automatic reconnect"
      description="autoReconnect: true schedules a new connection after unexpected closes. Explicit close() cancels pending retries."
      instruction='Click "Simulate drop" and wait for the hook to reconnect automatically.'
      badge={statusBadge(status)}
      code={automaticReconnectSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'reconnect-status' },
            {
              label: 'Generations',
              value: String(controller.getConnectionAttemptCount()),
              testId: 'reconnect-generations',
            },
            {
              label: 'Last message',
              value: formatPayload(data),
              testId: 'reconnect-data',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={dangerButtonClass}
        disabled={status !== 'OPEN'}
        data-testid="reconnect-drop"
        onClick={() => controller.closeLast(1006, 'drop', false)}
      >
        Simulate drop
      </button>
    </ExampleShowcase>
  )
}

export function BackoffStrategyExample() {
  return (
    <WithWebSocketMock openDelay={15}>
      {(controller) => <BackoffStrategyBody controller={controller} />}
    </WithWebSocketMock>
  )
}

function BackoffStrategyBody({
  controller,
}: {
  controller: WebSocketMockController
}) {
  const { events, push } = useTimelineReducer()
  const { status, close } = useWebSocket(MOCK_PRIMARY_URL, {
    autoReconnect: {
      retries: -1,
      delay: (attempt) => {
        push('retry scheduled', `${attempt * 80} ms`)
        return attempt * 80
      },
    },
  })

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Backoff strategy"
      description="delay can be a function of the one-based attempt counter. Here it grows linearly and caps visually in the timeline."
      instruction='Trigger a drop, observe increasing retry delays in the timeline, then click "Stop retries" via explicit close.'
      badge={statusBadge(status)}
      code={backoffStrategySnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'backoff-status' },
            {
              label: 'Attempts',
              value: String(controller.getConnectionAttemptCount()),
              testId: 'backoff-attempts',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={dangerButtonClass}
          disabled={status !== 'OPEN'}
          data-testid="backoff-drop"
          onClick={() => controller.closeLast(1006, 'backoff', false)}
        >
          Simulate drop
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={status === 'CLOSED'}
          data-testid="backoff-stop"
          onClick={() => close()}
        >
          Stop retries
        </button>
      </div>
      <div className="mt-4">
        <EventTimeline events={events} testId="backoff-timeline" />
      </div>
    </ExampleShowcase>
  )
}

export function RetriesExhaustedExample() {
  return (
    <WithWebSocketMock openDelay={15}>
      {(controller) => <RetriesExhaustedBody controller={controller} />}
    </WithWebSocketMock>
  )
}

function RetriesExhaustedBody({
  controller,
}: {
  controller: WebSocketMockController
}) {
  const [failed, setFailed] = useState(false)
  const { status, close } = useWebSocket(MOCK_PRIMARY_URL, {
    autoReconnect: {
      retries: 2,
      delay: 80,
      onFailed: () => setFailed(true),
    },
  })

  useEffect(() => {
    if (status === 'OPEN') {
      // Keep reconnect attempts in CONNECTING so Abort reconnect can exhaust
      // the budget before the mock auto-opens a healthy socket.
      controller.setAutoOpen(false)
    }
  }, [controller, status])

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Retries exhausted"
      description="Finite retries call onFailed once when the budget is spent. Explicit close clears pending timers."
      instruction='Drop the open socket, then use "Abort reconnect" while status is CONNECTING — successful reconnects reset the attempt counter.'
      badge={failed ? 'Failed' : statusBadge(status)}
      code={retriesExhaustedSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'retry-status' },
            {
              label: 'onFailed',
              value: failed ? 'called' : 'pending',
              testId: 'retry-failed',
            },
            {
              label: 'Generations',
              value: String(controller.getConnectionAttemptCount()),
              testId: 'retry-generations',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={dangerButtonClass}
          disabled={status !== 'OPEN' || failed}
          data-testid="retry-drop"
          onClick={() => controller.closeLast(1006, 'retry', false)}
        >
          Simulate drop
        </button>
        <button
          type="button"
          className={dangerButtonClass}
          disabled={status !== 'CONNECTING' || failed}
          data-testid="retry-abort-reconnect"
          onClick={() => controller.closeLast(1006, 'abort reconnect', false)}
        >
          Abort reconnect
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={status === 'CLOSED'}
          data-testid="retry-stop"
          onClick={() => close()}
        >
          Stop retries
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="mt-3 text-sm font-medium text-slate-700"
        data-testid="retry-message"
      >
        {failed ? 'Reconnect retries exhausted' : 'Retry budget active'}
      </p>
    </ExampleShowcase>
  )
}

export function HeartbeatExample() {
  return (
    <WithWebSocketMock autoPong pingMessage="ping" pongMessage="pong">
      {(controller) => <HeartbeatBody controller={controller} />}
    </WithWebSocketMock>
  )
}

function HeartbeatBody({
  controller,
}: {
  controller: WebSocketMockController
}) {
  const [pingCount, setPingCount] = useState(0)
  const { status } = useWebSocket(MOCK_PRIMARY_URL, {
    heartbeat: {
      message: 'ping',
      responseMessage: 'pong',
      interval: 120,
      pongTimeout: 80,
    },
  })

  useEffect(() => {
    const timer = window.setInterval(() => {
      const count =
        controller.getLastInstance()?.sent.filter((entry) => entry === 'ping')
          .length ?? 0
      setPingCount(count)
    }, 40)
    return () => {
      window.clearInterval(timer)
    }
  }, [controller])

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Heartbeat"
      description="heartbeat sends periodic ping frames. Matching pong responses reset the timeout without surfacing as hook data."
      instruction="Watch ping counts rise while the mock auto-replies with pong."
      badge={statusBadge(status)}
      code={heartbeatSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'hb-status' },
            {
              label: 'Ping sends',
              value: String(pingCount),
              testId: 'hb-ping-count',
            },
            {
              label: 'Auto pong',
              value: 'enabled',
              testId: 'hb-auto-pong',
            },
          ]}
        />
      }
    >
      <p className="text-sm text-slate-600" data-testid="hb-note">
        Ping frames are filtered from hook data when pong matches.
      </p>
    </ExampleShowcase>
  )
}

export function HeartbeatTimeoutExample() {
  return (
    <WithWebSocketMock autoPong={false} pingMessage="ping" pongMessage="pong">
      {(controller) => <HeartbeatTimeoutBody controller={controller} />}
    </WithWebSocketMock>
  )
}

function HeartbeatTimeoutBody({
  controller,
}: {
  controller: WebSocketMockController
}) {
  const { status } = useWebSocket(MOCK_PRIMARY_URL, {
    autoReconnect: false,
    heartbeat: {
      message: 'ping',
      responseMessage: 'pong',
      interval: 80,
      pongTimeout: 60,
    },
  })
  const lastClose = controller.getLastInstance()?.closeCalls.at(-1)

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Heartbeat timeout"
      description="When pong does not arrive within pongTimeout, the hook closes the socket with code 4000 (Heartbeat timeout)."
      instruction="Wait for the missing pong to close the connection."
      badge={statusBadge(status)}
      code={heartbeatTimeoutSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'hbt-status' },
            {
              label: 'Close code',
              value: lastClose?.code != null ? String(lastClose.code) : '—',
              testId: 'hbt-close-code',
            },
          ]}
        />
      }
    >
      <p className="text-sm text-slate-600" data-testid="hbt-note">
        Mock server ignores ping frames — expect status CLOSED with code 4000.
      </p>
    </ExampleShowcase>
  )
}

export function ExplicitCloseExample() {
  return (
    <WithWebSocketMock>
      {(controller) => <ExplicitCloseBody controller={controller} />}
    </WithWebSocketMock>
  )
}

function ExplicitCloseBody({
  controller,
}: {
  controller: WebSocketMockController
}) {
  const { status, close } = useWebSocket(MOCK_PRIMARY_URL)
  const lastClose = controller.getLastInstance()?.closeCalls.at(-1)

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Explicit close"
      description="close(code?, reason?) marks the shutdown as intentional, clears buffers, and suppresses auto-reconnect."
      instruction='Click "Close gracefully" to send code 1000 with a custom reason.'
      badge={statusBadge(status)}
      code={explicitCloseSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'close-status' },
            {
              label: 'Last code',
              value: lastClose?.code != null ? String(lastClose.code) : '—',
              testId: 'close-code',
            },
            {
              label: 'Last reason',
              value: lastClose?.reason ?? '—',
              testId: 'close-reason',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={primaryButtonClass}
        disabled={status === 'CLOSED'}
        data-testid="close-graceful"
        onClick={() => close(1000, 'Client goodbye')}
      >
        Close gracefully
      </button>
    </ExampleShowcase>
  )
}

export function BinaryMessagesExample() {
  return (
    <WithWebSocketMock
      onReady={(controller) => {
        const payload = new Uint8Array([0x48, 0x69]).buffer
        controller.scheduleServerMessage(payload, 60)
      }}
    >
      {() => <BinaryMessagesBody />}
    </WithWebSocketMock>
  )
}

function BinaryMessagesBody() {
  const { status, data } = useWebSocket<ArrayBuffer>(MOCK_PRIMARY_URL, {
    binaryType: 'arraybuffer',
  })

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Binary messages"
      description="Set binaryType to arraybuffer (or blob) before messages arrive. Incoming ArrayBuffer payloads are stored verbatim in data."
      instruction="Wait for the mock server to push a 2-byte ArrayBuffer payload."
      badge={statusBadge(status)}
      code={binaryMessagesSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'bin-status' },
            {
              label: 'Payload',
              value: formatPayload(data),
              testId: 'bin-data',
            },
          ]}
        />
      }
    >
      <p
        aria-live="polite"
        className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800"
        data-testid="bin-summary"
      >
        {data instanceof ArrayBuffer
          ? `Received ${data.byteLength} bytes`
          : 'Waiting for binary frame…'}
      </p>
    </ExampleShowcase>
  )
}

export function ConnectionErrorExample() {
  return (
    <WithWebSocketMock>
      {(controller) => <ConnectionErrorBody controller={controller} />}
    </WithWebSocketMock>
  )
}

function ConnectionErrorBody({
  controller,
}: {
  controller: WebSocketMockController
}) {
  const [errors, setErrors] = useState(0)
  const { status } = useWebSocket(MOCK_PRIMARY_URL, {
    onError: () => setErrors((count) => count + 1),
  })

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Connection error"
      description="Transport-level error events invoke onError without automatically changing status — the socket may still close afterward."
      instruction='Click "Simulate transport error" while connected.'
      badge={statusBadge(status)}
      code={connectionErrorSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'err-status' },
            {
              label: 'Errors',
              value: String(errors),
              testId: 'err-count',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={dangerButtonClass}
        disabled={status !== 'OPEN'}
        data-testid="err-simulate"
        onClick={() => controller.simulateError()}
      >
        Simulate transport error
      </button>
      <p
        role="status"
        className="mt-3 text-sm text-slate-600"
        data-testid="err-live"
      >
        Transport errors: {errors}
      </p>
    </ExampleShowcase>
  )
}

export function LifecycleCleanupExample() {
  return (
    <WithWebSocketMock>
      {(controller) => <LifecycleCleanupBody controller={controller} />}
    </WithWebSocketMock>
  )
}

function SocketOwner({ testIdPrefix }: { testIdPrefix: string }) {
  const { status } = useWebSocket(MOCK_PRIMARY_URL)
  return (
    <p
      className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900"
      data-testid={`${testIdPrefix}-owner-status`}
    >
      Hook mounted · status: {status}
    </p>
  )
}

function LifecycleCleanupBody({
  controller,
}: {
  controller: WebSocketMockController
}) {
  const [mounted, setMounted] = useState(true)
  const [remountKey, setRemountKey] = useState(0)
  const [activeSockets, setActiveSockets] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSockets(
        controller
          .getInstances()
          .filter(
            (entry) =>
              entry.readyState === WS_OPEN ||
              entry.readyState === WS_CONNECTING,
          ).length,
      )
    }, 40)
    return () => {
      window.clearInterval(timer)
    }
  }, [controller])

  const toggle = () => {
    setMounted((value) => {
      if (value) {
        setRemountKey((key) => key + 1)
      }
      return !value
    })
  }

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Lifecycle cleanup"
      description="Unmounting always releases the owned socket and clears timers, even when autoClose is false."
      instruction='Toggle "Unmount hook" and confirm instances drop to zero in the status panel.'
      badge={mounted ? 'Mounted' : 'Unmounted'}
      code={lifecycleCleanupSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'life-mounted',
            },
            {
              label: 'Active sockets',
              value: String(activeSockets),
              testId: 'life-instances',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={mounted ? secondaryButtonClass : primaryButtonClass}
        data-testid="life-toggle"
        onClick={toggle}
      >
        {mounted ? 'Unmount hook' : 'Remount hook'}
      </button>
      {mounted ? (
        <SocketOwner key={`socket-owner-${remountKey}`} testIdPrefix="life" />
      ) : (
        <p className="mt-3 text-sm text-slate-600" data-testid="life-unmounted">
          Hook unmounted — socket should be closed.
        </p>
      )}
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  url = MOCK_PRIMARY_URL,
  immediate = false,
  autoReconnect = false,
}: {
  url?: string | undefined
  immediate?: boolean | undefined
  autoReconnect?: boolean | undefined
}) {
  return (
    <WithWebSocketMock autoOpen openDelay={20}>
      {(controller) => (
        <PlaygroundBody
          controller={controller}
          url={url}
          immediate={immediate}
          autoReconnect={autoReconnect}
        />
      )}
    </WithWebSocketMock>
  )
}

function PlaygroundBody({
  controller,
  url,
  immediate,
  autoReconnect,
}: {
  controller: WebSocketMockController
  url: string
  immediate: boolean
  autoReconnect: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const mountId = useId()

  return (
    <ExampleShowcase
      hookName="useWebSocket"
      title="Playground"
      description="Mount-gated sandbox for trying url, immediate, and autoReconnect with the Storybook mock. Docs never auto-connects on load."
      instruction='Check "Mount hook", then connect, send, or simulate a drop.'
      badge={mounted ? 'Mounted' : 'Idle'}
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'play-mounted',
            },
            {
              label: 'Immediate',
              value: String(immediate),
              testId: 'play-immediate',
            },
            {
              label: 'Auto reconnect',
              value: String(autoReconnect),
              testId: 'play-auto-reconnect',
            },
          ]}
        />
      }
    >
      <label
        htmlFor={mountId}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"
      >
        <input
          id={mountId}
          type="checkbox"
          checked={mounted}
          onChange={(event) => setMounted(event.target.checked)}
          data-testid="play-mount"
          className="size-4 rounded border-slate-300 text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        Mount hook
      </label>

      {mounted ? (
        <PlaygroundActive
          controller={controller}
          url={url}
          immediate={immediate}
          autoReconnect={autoReconnect}
        />
      ) : (
        <p className="mt-3 text-sm text-slate-600" data-testid="play-idle">
          Hook not mounted — enable the checkbox to begin.
        </p>
      )}
    </ExampleShowcase>
  )
}

function PlaygroundActive({
  controller,
  url,
  immediate,
  autoReconnect,
}: {
  controller: WebSocketMockController
  url: string
  immediate: boolean
  autoReconnect: boolean
}) {
  const { status, data, open, close, send } = useWebSocket<string>(url, {
    immediate,
    autoReconnect: autoReconnect ? { delay: 80 } : false,
  })

  return (
    <div className="mt-4 space-y-3">
      <StatusPanel
        items={[
          { label: 'Status', value: status, testId: 'play-status' },
          {
            label: 'Last message',
            value: formatPayload(data),
            testId: 'play-data',
          },
          {
            label: 'Generations',
            value: String(controller.getConnectionAttemptCount()),
            testId: 'play-generations',
          },
        ]}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          disabled={status !== 'CLOSED'}
          data-testid="play-connect"
          onClick={open}
        >
          Connect
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={status === 'CLOSED'}
          data-testid="play-disconnect"
          onClick={() => close()}
        >
          Disconnect
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={status !== 'OPEN'}
          data-testid="play-send"
          onClick={() => send('hello')}
        >
          Send hello
        </button>
        <button
          type="button"
          className={dangerButtonClass}
          disabled={status !== 'OPEN'}
          data-testid="play-drop"
          onClick={() => controller.closeLast(1006, 'playground', false)}
        >
          Simulate drop
        </button>
      </div>
    </div>
  )
}

export type { WebSocketMockController, WebSocketMockInstance }
