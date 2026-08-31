import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  expect,
  fireEvent,
  fn,
  userEvent,
  waitFor,
  within,
} from 'storybook/test'

import {
  DelayComparisonExample,
  EnabledStateExample,
  MovementCancellationExample,
  OverviewExample,
  PlaygroundExample,
  PointerTypesExample,
  ReleaseMetricsExample,
  SelfAndDescendantsExample,
} from './components/UseOnLongPressExamples'
import {
  delayComparisonSnippet,
  enabledSnippet,
  movementSnippet,
  overviewSnippet,
  playgroundSnippet,
  pointerTypesSnippet,
  releaseMetricsSnippet,
  selfSnippet,
} from './components/useOnLongPress.snippets'

const meta = {
  title: 'Hooks/useOnLongPress',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Invokes a handler after a sustained pointer press on a referenced element. Uses Pointer Events only (\`pointerdown\` / \`pointermove\` / \`pointerup\` / \`pointercancel\`).

\`\`\`ts
import { useOnLongPress } from '@muradyanvano/react-hooks'

useOnLongPress<T extends Element>(
  ref: RefObject<T | null>,
  handler: UseOnLongPressHandler,
  options?: UseOnLongPressOptions<T>,
): void
\`\`\`

**Defaults:** \`{ enabled: true, delay: 500, distanceThreshold: 10, button: 0, self: false, preventDefault: false, stopPropagation: false, capture: false }\`

**Accessibility:** Long press must never be the only way to perform an essential action. Provide an equivalent standard control for keyboard users and people who cannot hold a timed press.

**Click behavior:** This hook does not suppress the click that may follow pointerup. Coordinate click and long-press actions in your own UI.

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
  },
  argTypes: {
    enabled: {
      control: 'boolean',
      description: 'When false, no target listener is registered.',
      table: { defaultValue: { summary: 'true' } },
    },
    delay: {
      control: { type: 'number', min: 0, max: 2000, step: 50 },
      description: 'Hold duration in milliseconds (playground uses a number).',
      table: { defaultValue: { summary: '500' } },
    },
    distanceThreshold: {
      control: { type: 'number', min: 0, max: 100, step: 1 },
      description: 'Cancel pending press after this movement (px).',
      table: { defaultValue: { summary: '10' } },
    },
    button: {
      control: { type: 'number', min: 0, max: 2, step: 1 },
      description: 'Required pointer button.',
      table: { defaultValue: { summary: '0' } },
    },
    self: {
      control: 'boolean',
      description: 'When true, only presses on the exact target are accepted.',
      table: { defaultValue: { summary: 'false' } },
    },
    preventDefault: {
      control: 'boolean',
      description: 'Call preventDefault on accepted pointerdown.',
      table: { defaultValue: { summary: 'false' } },
    },
    stopPropagation: {
      control: 'boolean',
      description: 'Call stopPropagation on accepted pointerdown.',
      table: { defaultValue: { summary: 'false' } },
    },
    capture: {
      control: 'boolean',
      description: 'Capture-phase pointerdown registration.',
      table: { defaultValue: { summary: 'false' } },
    },
    onLongPress: {
      action: 'longPress',
      description: 'Fires when the long-press handler runs.',
    },
  },
  args: {
    enabled: true,
    delay: 500,
    distanceThreshold: 10,
    button: 0,
    self: false,
    preventDefault: false,
    stopPropagation: false,
    capture: false,
    onLongPress: fn(),
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PlaygroundExample>

export default meta

type Story = StoryObj<typeof meta>

async function expectCodeDisclosure(canvas: ReturnType<typeof within>) {
  const toggle = canvas.getByTestId('toggle-code')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(canvas.getByTestId('code-panel')).not.toBeVisible()

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(canvas.getByTestId('code-panel')).toBeVisible()
  await expect(await canvas.findByTestId('highlighted-code')).toBeVisible()

  await userEvent.keyboard('{Tab}')
  await expect(canvas.getByTestId('copy-code')).toHaveFocus()

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(canvas.getByTestId('code-panel')).not.toBeVisible()
}

async function expectCopySuccess(
  canvas: ReturnType<typeof within>,
  expected: string,
) {
  const writeText = fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  await userEvent.click(canvas.getByTestId('toggle-code'))
  await userEvent.click(canvas.getByTestId('copy-code'))
  await expect(writeText).toHaveBeenCalledWith(expected)
  await expect(canvas.getByTestId('copy-code')).toHaveTextContent('Copied')
  await expect(canvas.getByText('Code copied to clipboard')).toBeInTheDocument()
}

function dispatchPointer(
  target: Element | Document | Window,
  type: string,
  init: PointerEventInit = {},
) {
  fireEvent(
    target,
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
      clientX: 0,
      clientY: 0,
      ...init,
    }),
  )
}

async function holdUntil(
  target: Element | Document | Window,
  delayMs: number,
  coords: { clientX?: number; clientY?: number; pointerId?: number } = {},
) {
  dispatchPointer(target, 'pointerdown', {
    pointerId: coords.pointerId ?? 1,
    clientX: coords.clientX ?? 40,
    clientY: coords.clientY ?? 40,
  })
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs + 40)
  })
}

export const Overview: Story = {
  name: 'Overview',
  render: (args) => (
    <OverviewExample delay={150} onLongPress={args.onLongPress} />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const hold = canvas.getByTestId('overview-hold')

    dispatchPointer(hold, 'pointerdown', { clientX: 20, clientY: 20 })
    dispatchPointer(hold, 'pointerup', { clientX: 20, clientY: 20 })
    await expect(canvas.getByTestId('overview-count')).toHaveTextContent('0')
    await expect(canvas.getByTestId('overview-release')).toHaveTextContent(
      /Short press/,
    )

    await holdUntil(hold, 150)
    dispatchPointer(hold, 'pointerup', { clientX: 20, clientY: 20 })
    await waitFor(() => {
      expect(canvas.getByTestId('overview-count')).toHaveTextContent('1')
    })
    await expect(canvas.getByTestId('overview-release')).toHaveTextContent(
      /Long press/,
    )
    await expect(args.onLongPress).toHaveBeenCalled()

    await userEvent.click(canvas.getByTestId('overview-click-alt'))
    await expect(canvas.getByTestId('overview-count')).toHaveTextContent('2')

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, overviewSnippet)
  },
}

export const DelayComparison: Story = {
  name: 'Delay comparison',
  render: () => <DelayComparisonExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const hold = canvas.getByTestId('delay-300-hold')

    await holdUntil(hold, 300)
    dispatchPointer(hold, 'pointerup', { clientX: 10, clientY: 10 })
    await waitFor(() => {
      expect(canvas.getByTestId('delay-300-count')).toHaveTextContent('1')
    })

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, delayComparisonSnippet)
  },
}

export const MovementCancellation: Story = {
  name: 'Movement cancellation',
  render: () => (
    <MovementCancellationExample delay={200} distanceThreshold={10} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const hold = canvas.getByTestId('movement-hold')

    dispatchPointer(hold, 'pointerdown', { clientX: 50, clientY: 50 })
    dispatchPointer(document, 'pointermove', {
      pointerId: 1,
      clientX: 55,
      clientY: 50,
    })
    await new Promise((resolve) => {
      setTimeout(resolve, 230)
    })
    dispatchPointer(document, 'pointerup', {
      pointerId: 1,
      clientX: 55,
      clientY: 50,
    })
    await waitFor(() => {
      expect(canvas.getByTestId('movement-count')).toHaveTextContent('1')
    })

    dispatchPointer(hold, 'pointerdown', { clientX: 50, clientY: 50 })
    dispatchPointer(document, 'pointermove', {
      pointerId: 1,
      clientX: 80,
      clientY: 50,
    })
    await new Promise((resolve) => {
      setTimeout(resolve, 230)
    })
    dispatchPointer(document, 'pointerup', {
      pointerId: 1,
      clientX: 80,
      clientY: 50,
    })
    await waitFor(() => {
      expect(canvas.getByTestId('movement-status')).toHaveTextContent(
        /Cancelled by movement/,
      )
    })
    await expect(canvas.getByTestId('movement-count')).toHaveTextContent('1')

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, movementSnippet)
  },
}

export const ReleaseMetrics: Story = {
  name: 'Release metrics',
  render: () => <ReleaseMetricsExample delay={150} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const hold = canvas.getByTestId('release-hold')

    dispatchPointer(hold, 'pointerdown', { clientX: 12, clientY: 12 })
    dispatchPointer(hold, 'pointerup', { clientX: 12, clientY: 12 })
    await waitFor(() => {
      expect(canvas.getByTestId('release-result')).toHaveTextContent(
        'Short press',
      )
    })

    await holdUntil(hold, 150)
    dispatchPointer(hold, 'pointerup', { clientX: 12, clientY: 12 })
    await waitFor(() => {
      expect(canvas.getByTestId('release-result')).toHaveTextContent(
        'Long press',
      )
    })
    await expect(canvas.getByTestId('release-duration')).not.toHaveTextContent(
      '—',
    )
    await expect(canvas.getByTestId('release-distance')).not.toHaveTextContent(
      '—',
    )

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, releaseMetricsSnippet)
  },
}

export const SelfAndDescendants: Story = {
  name: 'Self and descendants',
  render: () => <SelfAndDescendantsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const falseDescendant = canvas.getByTestId('self-false-descendant')
    await holdUntil(falseDescendant, 200)
    dispatchPointer(falseDescendant, 'pointerup', {
      clientX: 8,
      clientY: 8,
    })
    await waitFor(() => {
      expect(canvas.getByTestId('self-false-status')).toHaveTextContent(
        'Accepted',
      )
    })

    const trueDescendant = canvas.getByTestId('self-true-descendant')
    await holdUntil(trueDescendant, 200)
    dispatchPointer(trueDescendant, 'pointerup', {
      clientX: 8,
      clientY: 8,
    })
    await expect(canvas.getByTestId('self-true-status')).not.toHaveTextContent(
      'Accepted',
    )

    const trueTarget = canvas.getByTestId('self-true-target')
    await holdUntil(trueTarget, 200)
    dispatchPointer(trueTarget, 'pointerup', { clientX: 8, clientY: 8 })
    await waitFor(() => {
      expect(canvas.getByTestId('self-true-status')).toHaveTextContent(
        'Accepted',
      )
    })

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, selfSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample delay={200} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const hold = canvas.getByTestId('enabled-hold')
    const toggle = canvas.getByTestId('enabled-toggle')

    await holdUntil(hold, 200)
    dispatchPointer(hold, 'pointerup', { clientX: 10, clientY: 10 })
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-count')).toHaveTextContent('1')
    })

    await userEvent.click(toggle)
    await expect(canvas.getByTestId('enabled-mode')).toHaveTextContent('Paused')
    dispatchPointer(hold, 'pointerdown', { clientX: 10, clientY: 10 })
    await new Promise((resolve) => {
      setTimeout(resolve, 230)
    })
    dispatchPointer(hold, 'pointerup', { clientX: 10, clientY: 10 })
    await expect(canvas.getByTestId('enabled-count')).toHaveTextContent('1')

    await userEvent.click(toggle)
    await holdUntil(hold, 200)
    dispatchPointer(hold, 'pointerup', { clientX: 10, clientY: 10 })
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-count')).toHaveTextContent('2')
    })

    dispatchPointer(hold, 'pointerdown', { clientX: 10, clientY: 10 })
    await userEvent.click(toggle)
    await new Promise((resolve) => {
      setTimeout(resolve, 230)
    })
    dispatchPointer(hold, 'pointerup', { clientX: 10, clientY: 10 })
    await expect(canvas.getByTestId('enabled-count')).toHaveTextContent('2')

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, enabledSnippet)
  },
}

export const PointerTypes: Story = {
  name: 'Pointer types and dynamic delay',
  render: () => <PointerTypesExample delayMs={120} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const hold = canvas.getByTestId('pointer-hold')

    dispatchPointer(hold, 'pointerdown', {
      pointerType: 'mouse',
      clientX: 15,
      clientY: 15,
    })
    await new Promise((resolve) => {
      setTimeout(resolve, 150)
    })
    dispatchPointer(hold, 'pointerup', {
      pointerType: 'mouse',
      clientX: 15,
      clientY: 15,
    })
    await waitFor(() => {
      expect(canvas.getByTestId('pointer-count')).toHaveTextContent('1')
    })
    await expect(canvas.getByTestId('pointer-type')).toHaveTextContent('mouse')
    await expect(canvas.getByTestId('pointer-delay')).toHaveTextContent(
      '120 ms',
    )

    dispatchPointer(hold, 'pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 15,
      clientY: 15,
    })
    await new Promise((resolve) => {
      setTimeout(resolve, 150)
    })
    dispatchPointer(hold, 'pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 15,
      clientY: 15,
    })
    await expect(canvas.getByTestId('pointer-count')).toHaveTextContent('1')

    dispatchPointer(hold, 'pointerdown', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 15,
      clientY: 15,
    })
    await new Promise((resolve) => {
      setTimeout(resolve, 280)
    })
    dispatchPointer(hold, 'pointerup', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 15,
      clientY: 15,
    })
    await waitFor(() => {
      expect(canvas.getByTestId('pointer-count')).toHaveTextContent('2')
    })
    await expect(canvas.getByTestId('pointer-type')).toHaveTextContent('touch')
    await expect(canvas.getByTestId('pointer-delay')).toHaveTextContent(
      '240 ms',
    )

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, pointerTypesSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  render: (args) => <PlaygroundExample {...args} delay={150} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const hold = canvas.getByTestId('playground-hold')

    await expect(canvas.getByTestId('playground-enabled')).toHaveTextContent(
      'Yes',
    )
    await expect(canvas.getByTestId('playground-delay')).toHaveTextContent(
      '150 ms',
    )

    await holdUntil(hold, 150)
    dispatchPointer(hold, 'pointerup', { clientX: 18, clientY: 18 })
    await waitFor(() => {
      expect(canvas.getByTestId('playground-count')).toHaveTextContent('1')
    })
    await expect(args.onLongPress).toHaveBeenCalled()

    await userEvent.click(canvas.getByTestId('playground-click-alt'))
    await expect(canvas.getByTestId('playground-count')).toHaveTextContent('2')

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, playgroundSnippet)
  },
}
