import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  AutomaticReconnectExample,
  BackoffStrategyExample,
  BinaryMessagesExample,
  ConnectionCallbacksExample,
  ConnectionErrorExample,
  DashboardExample,
  ExplicitCloseExample,
  HeartbeatExample,
  HeartbeatTimeoutExample,
  LifecycleCleanupExample,
  LiveConnectionExample,
  ManualConnectionExample,
  PlaygroundExample,
  ProtocolsExample,
  RetriesExhaustedExample,
  SendBufferExample,
  UrlSwitchingExample,
} from './components/UseWebSocketExamples'
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
} from './components/useWebSocket.snippets'

const meta = {
  title: 'Hooks/useWebSocket',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
WebSocket helper with send buffering, optional auto-reconnect, and heartbeat.

\`\`\`ts
import { useWebSocket } from '@muradyanvano/react-hooks'

useWebSocket<T>(url, options?): UseWebSocketReturn<T>
\`\`\`

**Defaults:** \`{ immediate: true, autoConnect: true, autoClose: true, autoReconnect: false, heartbeat: false }\`

**Live vs. mocked:** The **Live connection** story uses the real \`WebSocket\` constructor with \`immediate: false\` — it is the only story that may reach an external server when you click Connect. Every other story uses a deterministic Storybook-only mock so CI never opens real network connections.

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
    a11y: {
      test: 'error',
    },
  },
  argTypes: {
    url: {
      control: 'text',
      description: 'Mock WebSocket endpoint for the playground.',
      table: { defaultValue: { summary: 'wss://storybook.example/chat' } },
    },
    immediate: {
      control: 'boolean',
      description: 'Connect on mount when a URL is present.',
      table: { defaultValue: { summary: 'true' } },
    },
    autoReconnect: {
      control: 'boolean',
      description: 'Enable automatic reconnect in the playground.',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  args: {
    url: 'wss://storybook.example/chat',
    immediate: false,
    autoReconnect: false,
  },
} satisfies Meta<typeof PlaygroundExample>

export default meta
type Story = StoryObj<typeof meta>

async function expectCodeDisclosure(
  canvas: ReturnType<typeof within>,
  expectedSnippet: string,
) {
  const toggle = canvas.getByTestId('toggle-code')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(await canvas.findByTestId('highlighted-code')).toBeVisible()

  const writeText = fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  await userEvent.click(canvas.getByTestId('copy-code'))
  await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
  await userEvent.click(toggle)
}

async function waitForStatus(
  canvas: ReturnType<typeof within>,
  testId: string,
  status: string,
) {
  await waitFor(
    () => {
      expect(canvas.getByTestId(testId)).toHaveTextContent(status)
    },
    { timeout: 3000 },
  )
}

export const WebSocketDashboard: Story = {
  name: 'WebSocket dashboard',
  render: () => <DashboardExample />,
  parameters: { docs: { source: { code: dashboardSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'dash-status', 'OPEN')
    await waitFor(() => {
      expect(canvas.getByTestId('dash-data')).toHaveTextContent(
        'welcome from server',
      )
    })

    await userEvent.clear(canvas.getByTestId('dash-input'))
    await userEvent.type(canvas.getByTestId('dash-input'), 'storybook')
    await userEvent.click(canvas.getByTestId('dash-send'))

    await expectCodeDisclosure(canvas, dashboardSnippet)
    await waitForStatus(canvas, 'dash-status', 'OPEN')
  },
}

export const LiveConnection: Story = {
  name: 'Live connection',
  render: () => <LiveConnectionExample />,
  parameters: { docs: { source: { code: liveConnectionSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Never click Connect — that would open a real network socket.
    await waitForStatus(canvas, 'live-status', 'CLOSED')
    await expect(canvas.getByTestId('live-connect')).toBeEnabled()
    await expect(canvas.getByTestId('live-disconnect')).toBeDisabled()
    await expect(canvas.getByTestId('live-send')).toBeDisabled()
    await expect(canvas.getByTestId('live-url-input')).toBeVisible()
    await expect(canvas.getByTestId('live-hint')).toHaveTextContent(/Idle/)

    await expectCodeDisclosure(canvas, liveConnectionSnippet)
  },
}

export const ManualConnection: Story = {
  name: 'Manual connection',
  render: () => <ManualConnectionExample />,
  parameters: { docs: { source: { code: manualConnectionSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'manual-status', 'CLOSED')

    await userEvent.click(canvas.getByTestId('manual-connect'))
    await waitForStatus(canvas, 'manual-status', 'OPEN')

    await userEvent.click(canvas.getByTestId('manual-push-message'))
    await waitFor(() => {
      expect(canvas.getByTestId('manual-data')).toHaveTextContent('manual push')
    })

    await userEvent.click(canvas.getByTestId('manual-disconnect'))
    await waitForStatus(canvas, 'manual-status', 'CLOSED')
    await expectCodeDisclosure(canvas, manualConnectionSnippet)
  },
}

export const SendBuffer: Story = {
  name: 'Send buffer',
  render: () => <SendBufferExample />,
  parameters: { docs: { source: { code: sendBufferSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'buffer-status', 'CLOSED')

    await userEvent.click(canvas.getByTestId('buffer-queue-1'))
    await userEvent.click(canvas.getByTestId('buffer-queue-2'))
    await expect(canvas.getByTestId('buffer-sent-count')).toHaveTextContent('0')

    await userEvent.click(canvas.getByTestId('buffer-connect'))
    await waitForStatus(canvas, 'buffer-status', 'OPEN')
    await waitFor(() => {
      expect(canvas.getByTestId('buffer-sent-count')).toHaveTextContent('2')
    })

    await expectCodeDisclosure(canvas, sendBufferSnippet)
  },
}

export const UrlSwitching: Story = {
  name: 'URL switching',
  render: () => <UrlSwitchingExample />,
  parameters: { docs: { source: { code: urlSwitchingSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'url-status', 'OPEN')
    await waitFor(() => {
      expect(canvas.getByTestId('url-data')).toHaveTextContent('primary hello')
    })

    await userEvent.click(canvas.getByTestId('url-backup'))
    await waitFor(() => {
      expect(canvas.getByTestId('url-active')).toHaveTextContent('backup')
    })
    await waitFor(() => {
      expect(canvas.getByTestId('url-data')).toHaveTextContent('backup hello')
    })

    await userEvent.click(canvas.getByTestId('url-primary'))
    await waitFor(() => {
      expect(canvas.getByTestId('url-active')).toHaveTextContent('primary')
    })
    await waitForStatus(canvas, 'url-status', 'OPEN')
    await expectCodeDisclosure(canvas, urlSwitchingSnippet)
  },
}

export const Protocols: Story = {
  name: 'Protocols',
  render: () => <ProtocolsExample />,
  parameters: { docs: { source: { code: protocolsSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'proto-status', 'CLOSED')

    await userEvent.click(canvas.getByTestId('proto-connect'))
    await waitForStatus(canvas, 'proto-status', 'OPEN')
    await expect(canvas.getByTestId('proto-value')).toHaveTextContent('chat-v2')

    await expectCodeDisclosure(canvas, protocolsSnippet)
  },
}

export const ConnectionCallbacks: Story = {
  name: 'Connection callbacks',
  render: () => <ConnectionCallbacksExample />,
  parameters: { docs: { source: { code: connectionCallbacksSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'cb-status', 'OPEN')
    await waitFor(() => {
      expect(canvas.getByTestId('cb-event-count')).not.toHaveTextContent('0')
    })

    await userEvent.click(canvas.getByTestId('cb-simulate-drop'))
    await waitForStatus(canvas, 'cb-status', 'CLOSED')
    await waitFor(() => {
      expect(canvas.getByTestId('cb-timeline-list')).toBeVisible()
    })

    await expectCodeDisclosure(canvas, connectionCallbacksSnippet)
  },
}

export const AutomaticReconnect: Story = {
  name: 'Automatic reconnect',
  render: () => <AutomaticReconnectExample />,
  parameters: { docs: { source: { code: automaticReconnectSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'reconnect-status', 'OPEN')
    const before = canvas.getByTestId('reconnect-generations').textContent

    await userEvent.click(canvas.getByTestId('reconnect-drop'))
    await waitForStatus(canvas, 'reconnect-status', 'CLOSED')
    await waitForStatus(canvas, 'reconnect-status', 'OPEN')
    await waitFor(() => {
      expect(canvas.getByTestId('reconnect-generations').textContent).not.toBe(
        before,
      )
    })

    await expectCodeDisclosure(canvas, automaticReconnectSnippet)
  },
}

export const BackoffStrategy: Story = {
  name: 'Backoff strategy',
  render: () => <BackoffStrategyExample />,
  parameters: { docs: { source: { code: backoffStrategySnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'backoff-status', 'OPEN')

    await userEvent.click(canvas.getByTestId('backoff-drop'))
    await waitFor(() => {
      expect(canvas.getByTestId('backoff-timeline-list')).toBeVisible()
    })

    await userEvent.click(canvas.getByTestId('backoff-stop'))
    await waitForStatus(canvas, 'backoff-status', 'CLOSED')
    await expectCodeDisclosure(canvas, backoffStrategySnippet)
  },
}

export const RetriesExhausted: Story = {
  name: 'Retries exhausted',
  render: () => <RetriesExhaustedExample />,
  parameters: { docs: { source: { code: retriesExhaustedSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'retry-status', 'OPEN')

    await userEvent.click(canvas.getByTestId('retry-drop'))
    await waitForStatus(canvas, 'retry-status', 'CONNECTING')
    await userEvent.click(canvas.getByTestId('retry-abort-reconnect'))
    await waitForStatus(canvas, 'retry-status', 'CONNECTING')
    await userEvent.click(canvas.getByTestId('retry-abort-reconnect'))

    await waitFor(
      () => {
        expect(canvas.getByTestId('retry-failed')).toHaveTextContent('called')
      },
      { timeout: 5000 },
    )
    await expect(canvas.getByTestId('retry-message')).toHaveTextContent(
      /exhausted/,
    )
    await expectCodeDisclosure(canvas, retriesExhaustedSnippet)
  },
}

export const Heartbeat: Story = {
  name: 'Heartbeat',
  render: () => <HeartbeatExample />,
  parameters: { docs: { source: { code: heartbeatSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'hb-status', 'OPEN')
    await waitFor(
      () => {
        expect(
          Number(canvas.getByTestId('hb-ping-count').textContent),
        ).toBeGreaterThan(0)
      },
      { timeout: 3000 },
    )
    await waitForStatus(canvas, 'hb-status', 'OPEN')
    await expectCodeDisclosure(canvas, heartbeatSnippet)
  },
}

export const HeartbeatTimeout: Story = {
  name: 'Heartbeat timeout',
  render: () => <HeartbeatTimeoutExample />,
  parameters: { docs: { source: { code: heartbeatTimeoutSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'hbt-status', 'OPEN')
    await waitForStatus(canvas, 'hbt-status', 'CLOSED')
    await waitFor(() => {
      expect(canvas.getByTestId('hbt-close-code')).toHaveTextContent('4000')
    })
    await expectCodeDisclosure(canvas, heartbeatTimeoutSnippet)
  },
}

export const ExplicitClose: Story = {
  name: 'Explicit close',
  render: () => <ExplicitCloseExample />,
  parameters: { docs: { source: { code: explicitCloseSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'close-status', 'OPEN')

    await userEvent.click(canvas.getByTestId('close-graceful'))
    await waitForStatus(canvas, 'close-status', 'CLOSED')
    await expect(canvas.getByTestId('close-code')).toHaveTextContent('1000')
    await expect(canvas.getByTestId('close-reason')).toHaveTextContent(
      'Client goodbye',
    )

    await expectCodeDisclosure(canvas, explicitCloseSnippet)
  },
}

export const BinaryMessages: Story = {
  name: 'Binary messages',
  render: () => <BinaryMessagesExample />,
  parameters: { docs: { source: { code: binaryMessagesSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'bin-status', 'OPEN')
    await waitFor(() => {
      expect(canvas.getByTestId('bin-data')).toHaveTextContent('2 bytes')
    })
    await expect(canvas.getByTestId('bin-summary')).toHaveTextContent(/2 bytes/)
    await expectCodeDisclosure(canvas, binaryMessagesSnippet)
  },
}

export const ConnectionError: Story = {
  name: 'Connection error',
  render: () => <ConnectionErrorExample />,
  parameters: { docs: { source: { code: connectionErrorSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForStatus(canvas, 'err-status', 'OPEN')
    await expect(canvas.getByTestId('err-count')).toHaveTextContent('0')

    await userEvent.click(canvas.getByTestId('err-simulate'))
    await waitFor(() => {
      expect(canvas.getByTestId('err-count')).toHaveTextContent('1')
    })

    await expectCodeDisclosure(canvas, connectionErrorSnippet)
    await waitForStatus(canvas, 'err-status', 'OPEN')
  },
}

export const LifecycleCleanup: Story = {
  name: 'Lifecycle cleanup',
  render: () => <LifecycleCleanupExample />,
  parameters: { docs: { source: { code: lifecycleCleanupSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('life-mounted')).toHaveTextContent('true')
    await waitFor(
      () => {
        expect(
          Number(canvas.getByTestId('life-instances').textContent),
        ).toBeGreaterThan(0)
      },
      { timeout: 3000 },
    )

    await userEvent.click(canvas.getByTestId('life-toggle'))
    await expect(canvas.getByTestId('life-mounted')).toHaveTextContent('false')
    await waitFor(
      () => {
        expect(canvas.getByTestId('life-instances')).toHaveTextContent('0')
      },
      { timeout: 3000 },
    )
    await expect(canvas.getByTestId('life-unmounted')).toBeVisible()

    await userEvent.click(canvas.getByTestId('life-toggle'))
    await expect(canvas.getByTestId('life-mounted')).toHaveTextContent('true')
    await expectCodeDisclosure(canvas, lifecycleCleanupSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  render: (args) => <PlaygroundExample {...args} />,
  parameters: { docs: { source: { code: playgroundSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('play-mounted')).toHaveTextContent('false')
    await expect(canvas.getByTestId('play-idle')).toBeVisible()

    await userEvent.click(canvas.getByTestId('play-mount'))
    await expect(canvas.getByTestId('play-mounted')).toHaveTextContent('true')

    await userEvent.click(canvas.getByTestId('play-connect'))
    await waitForStatus(canvas, 'play-status', 'OPEN')
    await userEvent.click(canvas.getByTestId('play-send'))

    await userEvent.click(canvas.getByTestId('play-disconnect'))
    await waitForStatus(canvas, 'play-status', 'CLOSED')

    await userEvent.click(canvas.getByTestId('play-mount'))
    await expect(canvas.getByTestId('play-mounted')).toHaveTextContent('false')
    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
