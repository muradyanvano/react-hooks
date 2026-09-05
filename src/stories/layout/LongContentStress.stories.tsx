import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'

import {
  assertNoPageOverflow,
  assertPanelContained,
} from '../components/assertNoPageOverflow'
import { ExampleShowcase, StatusPanel } from '../components/ExampleShowcase'

const STRESS_SNIPPET = `import { StatusPanel } from './ExampleShowcase'

export function LongValueExample() {
  return (
    <StatusPanel
      items={[{ label: 'Payload', value: longValue, mode: 'block' }]}
    />
  )
}`

const UNBROKEN_300 = 'catalog-metadata-'.padEnd(300, 'x')
const LONG_URL =
  'https://example.com/docs/react-hooks/storybook/layout-overflow-audit?ref=stress&token=abc123&filter=internal&viewport=320'
const LONG_BASE64 = `data:image/png;base64,${'A'.repeat(240)}`
const LONG_JWT =
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJzdHJlc3MtdXNlciIsInJvbGUiOiJhZG1pbiIsIm5hbWUiOiJsb25nLXRva2VuLXN0b3J5In0.synthetic-signature-padding-'.padEnd(
    120,
    'x',
  )
const LONG_WEBSOCKET_JSON = JSON.stringify({
  type: 'message',
  channel: 'stress/overflow',
  payload: {
    text: UNBROKEN_300,
    nested: {
      values: Array.from(
        { length: 12 },
        (_, index) => `row-${index}-${'z'.repeat(24)}`,
      ),
    },
  },
})
const LONG_DEVICE_LABEL =
  'FaceTime HD Camera (Built-in) — serial ABCD-EFGH-IJKL-MNOP-QRST-UVWX-'.padEnd(
    80,
    '0',
  )
const LONG_ERROR =
  'TypeError: Cannot read properties of undefined (reading "clientWidth") while rendering StatusPanel overflow guard in Storybook stress fixture — '.padEnd(
    160,
    '!',
  )
const DEEP_JSON = JSON.stringify(
  {
    level1: {
      level2: {
        level3: {
          level4: {
            level5: {
              message: UNBROKEN_300.slice(0, 64),
              tags: ['overflow', 'layout', 'status-panel'],
            },
          },
        },
      },
    },
  },
  null,
  2,
)
const LONG_EVENT_BUS = JSON.stringify({
  topic: 'inventory.updated',
  id: 'evt-'.padEnd(96, '9'),
  payload: { sku: 'ATL-01', note: UNBROKEN_300 },
})
const LARGE_NUMERIC = `${'9'.repeat(48)}.${'8'.repeat(32)}`
const DEBOUNCE_RESULT = `Results for “atlas”: Atlas, Cedar, Nova · ${UNBROKEN_300}`

type StressStoryProps = {
  label: string
  value: string
  mode?: 'inline' | 'block' | 'code' | 'truncate'
}

function StressFixture({ label, value, mode }: StressStoryProps) {
  return (
    <ExampleShowcase
      hookName="Internal"
      layout="dashboard"
      title="Long content stress"
      description="Layout regression fixture for StatusPanel value wrapping and horizontal overflow."
      instruction="Inspect the live status panel; long values must wrap or scroll inside the card."
      code={STRESS_SNIPPET}
      aside={
        <div data-testid="stress-status-panel">
          <StatusPanel
            items={[
              {
                label,
                value,
                testId: 'stress-status-value',
                ...(mode !== undefined ? { mode } : {}),
              },
            ]}
          />
        </div>
      }
    >
      <p className="text-sm leading-6 text-slate-600">
        This internal fixture mirrors production Storybook examples. Values
        should never expand the page horizontally.
      </p>
    </ExampleShowcase>
  )
}

function stressPlay({ canvasElement }: { canvasElement: HTMLElement }) {
  const canvas = within(canvasElement)
  expect(canvas.getByTestId('stress-status-value')).toBeVisible()
  assertNoPageOverflow(canvasElement)
  assertPanelContained(canvasElement)
}

const meta = {
  title: 'Internal/Layout',
  component: StressFixture,
  tags: ['!autodocs', '!dev'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof StressFixture>

export default meta
type Story = StoryObj<typeof meta>

export const UnbrokenText300: Story = {
  name: '300-char unbroken text',
  args: { label: 'Unbroken text', value: UNBROKEN_300 },
  play: stressPlay,
}

export const LongUrl: Story = {
  name: 'Long URL',
  args: { label: 'URL', value: LONG_URL },
  play: stressPlay,
}

export const LongBase64: Story = {
  name: 'Long Base64',
  args: { label: 'Base64', value: LONG_BASE64 },
  play: stressPlay,
}

export const LongJwtToken: Story = {
  name: 'Long JWT-like token',
  args: { label: 'JWT', value: LONG_JWT },
  play: stressPlay,
}

export const LongWebSocketPayload: Story = {
  name: 'Long WebSocket payload JSON',
  args: {
    label: 'WebSocket payload',
    value: LONG_WEBSOCKET_JSON,
    mode: 'code',
  },
  play: stressPlay,
}

export const LongDeviceLabel: Story = {
  name: 'Long device label',
  args: { label: 'Device', value: LONG_DEVICE_LABEL, mode: 'block' },
  play: stressPlay,
}

export const LongErrorMessage: Story = {
  name: 'Long error message',
  args: { label: 'Error', value: LONG_ERROR, mode: 'block' },
  play: stressPlay,
}

export const DeepFormattedJson: Story = {
  name: 'Deep formatted JSON',
  args: { label: 'JSON', value: DEEP_JSON, mode: 'code' },
  play: stressPlay,
}

export const LongEventBusPayload: Story = {
  name: 'Long event-bus payload',
  args: { label: 'Event payload', value: LONG_EVENT_BUS, mode: 'code' },
  play: stressPlay,
}

export const LargeNumericValues: Story = {
  name: 'Large numeric values',
  args: { label: 'Metric', value: LARGE_NUMERIC, mode: 'block' },
  play: stressPlay,
}

export const DebouncedSearchOverflow: Story = {
  name: 'Debounced search overflow',
  args: {
    label: 'Debounced result',
    value: DEBOUNCE_RESULT,
    mode: 'block',
  },
  play: stressPlay,
}
