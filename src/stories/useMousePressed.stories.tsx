import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  CallbacksExample,
  CaptureModeExample,
  DragLifecycleExample,
  DynamicTargetExample,
  ElementTargetExample,
  EnabledStateExample,
  EntirePageExample,
  InitialValueExample,
  MouseOnlyExample,
  NestedContentExample,
  PlaygroundExample,
  PressAndHoldExample,
  TouchInputExample,
} from './components/UseMousePressedExamples'
import {
  callbacksSnippet,
  captureModeSnippet,
  dragLifecycleSnippet,
  dynamicTargetSnippet,
  elementTargetSnippet,
  enabledStateSnippet,
  entirePageSnippet,
  initialValueSnippet,
  mouseOnlySnippet,
  nestedContentSnippet,
  playgroundSnippet,
  pressAndHoldSnippet,
  touchInputSnippet,
} from './components/useMousePressed.snippets'

const meta = {
  title: 'Hooks/useMousePressed',
  tags: ['autodocs'],
  ...createHookStoryMeta('useMousePressed', PlaygroundExample, {
    argTypes: {
      enabled: {
        control: 'boolean',
        table: { defaultValue: { summary: 'true' } },
      },
      touch: {
        control: 'boolean',
        table: { defaultValue: { summary: 'true' } },
      },
      drag: {
        control: 'boolean',
        table: { defaultValue: { summary: 'true' } },
      },
      capture: {
        control: 'boolean',
        table: { defaultValue: { summary: 'false' } },
      },
      initialValue: {
        control: 'boolean',
        table: { defaultValue: { summary: 'false' } },
      },
    },
    args: {
      enabled: true,
      touch: true,
      drag: true,
      capture: false,
      initialValue: false,
    },
  }),
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
  const highlighted = await waitForDisclosedCode(canvas)
  await expect(highlighted).toBeVisible()
  await expect(highlighted.textContent?.trim().length ?? 0).toBeGreaterThan(0)

  const writeText = fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  await userEvent.click(canvas.getByTestId('copy-code'))
  await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
}

function dispatchMouse(target: EventTarget, type: 'mousedown' | 'mouseup') {
  target.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true }),
  )
}

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Press-and-hold surfaces that track press globally until release — including outside the pad. Press inside, release outside, and confirm pressed returns to false. Not a keyboard button substitute.',
  ),
  render: () => <PressAndHoldExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, pressAndHoldSnippet)

    const pad = canvas.getByTestId('press-pad')
    dispatchMouse(pad, 'mousedown')
    await waitFor(() => {
      expect(canvas.getByTestId('pad-pressed')).toHaveTextContent('Pressed')
      expect(canvas.getByTestId('pad-source')).toHaveTextContent('mouse')
    })

    dispatchMouse(document.body, 'mouseup')
    await waitFor(() => {
      expect(canvas.getByTestId('pad-pressed')).toHaveTextContent('Released')
      expect(canvas.getByTestId('pad-source')).toHaveTextContent('idle')
    })

    dispatchMouse(document.body, 'mouseup')
    await expect(canvas.getByTestId('pad-pressed')).toHaveTextContent(
      'Released',
    )
  },
}

export const EntirePage: Story = {
  name: 'Tracking on entire page',
  ...storyDescription(
    'Tracking on entire page with useMousePressed: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <EntirePageExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, entirePageSnippet)
    await userEvent.click(canvas.getByTestId('page-mount'))
    await expect(canvas.getByTestId('page-mounted')).toHaveTextContent('true')
  },
}

export const ElementTarget: Story = {
  name: 'Element target',
  ...storyDescription(
    'Element target: bind useMousePressed to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <ElementTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, elementTargetSnippet)
    const card = canvas.getByTestId('card-target')
    dispatchMouse(card, 'mousedown')
    await waitFor(() => {
      expect(canvas.getByTestId('card-pressed')).toHaveTextContent('true')
    })
    dispatchMouse(document.body, 'mouseup')
    await waitFor(() => {
      expect(canvas.getByTestId('card-pressed')).toHaveTextContent('false')
    })
  },
}

export const MouseOnly: Story = {
  name: 'Mouse only',
  ...storyDescription(
    'Mouse only with useMousePressed: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <MouseOnlyExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, mouseOnlySnippet)
    const pad = canvas.getByTestId('mouse-only-pad')
    dispatchMouse(pad, 'mousedown')
    await waitFor(() => {
      expect(canvas.getByTestId('mouse-only-source')).toHaveTextContent('mouse')
    })
    dispatchMouse(window, 'mouseup')
    await waitFor(() => {
      expect(canvas.getByTestId('mouse-only-pressed')).toHaveTextContent(
        'false',
      )
    })
  },
}

export const TouchInput: Story = {
  name: 'Touch input',
  ...storyDescription(
    'Touch input with useMousePressed: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <TouchInputExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, touchInputSnippet)
    const pad = canvas.getByTestId('touch-pad')
    const touch = new Event('touchstart', { bubbles: true })
    const touchPoint = {
      identifier: 1,
      target: pad,
      clientX: 0,
      clientY: 0,
      pageX: 0,
      pageY: 0,
      screenX: 0,
      screenY: 0,
      radiusX: 0,
      radiusY: 0,
      rotationAngle: 0,
      force: 0,
    }
    Object.defineProperty(touch, 'touches', {
      value: {
        length: 1,
        0: touchPoint,
        item: () => touchPoint,
      },
    })
    Object.defineProperty(touch, 'changedTouches', {
      value: {
        length: 1,
        0: touchPoint,
        item: () => touchPoint,
      },
    })
    pad.dispatchEvent(touch)
    await waitFor(() => {
      expect(canvas.getByTestId('touch-source')).toHaveTextContent('touch')
    })

    const endTouch = new Event('touchend', { bubbles: true })
    Object.defineProperty(endTouch, 'touches', {
      value: { length: 0, item: () => null },
    })
    Object.defineProperty(endTouch, 'changedTouches', {
      value: {
        length: 1,
        0: touchPoint,
        item: () => touchPoint,
      },
    })
    window.dispatchEvent(endTouch)
    await waitFor(() => {
      expect(canvas.getByTestId('touch-pressed')).toHaveTextContent('false')
    })
  },
}

export const DragLifecycle: Story = {
  name: 'Drag lifecycle',
  ...storyDescription(
    'Drag lifecycle with useMousePressed: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <DragLifecycleExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, dragLifecycleSnippet)
    const zone = canvas.getByTestId('drag-zone')
    const event = new Event('dragstart', { bubbles: true })
    Object.defineProperty(event, 'dataTransfer', {
      value: { dropEffect: 'none', effectAllowed: 'all' },
    })
    zone.dispatchEvent(event)
    await waitFor(() => {
      expect(canvas.getByTestId('drag-pressed')).toHaveTextContent('true')
    })

    const dropEvent = new Event('drop', { bubbles: true })
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { dropEffect: 'none', effectAllowed: 'all' },
    })
    window.dispatchEvent(dropEvent)
    await waitFor(() => {
      expect(canvas.getByTestId('drag-pressed')).toHaveTextContent('false')
    })
  },
}

export const Callbacks: Story = {
  name: 'Callbacks',
  ...storyDescription(
    'Callbacks with useMousePressed: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <CallbacksExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, callbacksSnippet)
    const pad = canvas.getByTestId('callback-pad')
    dispatchMouse(pad, 'mousedown')
    await waitFor(() => {
      expect(canvas.getByTestId('press-count')).toHaveTextContent('1')
    })
    dispatchMouse(window, 'mouseup')
    await waitFor(() => {
      expect(canvas.getByTestId('release-count')).toHaveTextContent('1')
    })
  },
}

export const CaptureMode: Story = {
  name: 'Capture mode',
  ...storyDescription(
    'Capture mode with useMousePressed: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <CaptureModeExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, captureModeSnippet)
    const inner = canvas.getByTestId('capture-inner')

    dispatchMouse(inner, 'mousedown')
    await expect(canvas.getByTestId('capture-pressed')).toHaveTextContent(
      'false',
    )

    await userEvent.click(canvas.getByTestId('capture-toggle'))
    dispatchMouse(inner, 'mousedown')
    await waitFor(() => {
      expect(canvas.getByTestId('capture-pressed')).toHaveTextContent('true')
    })

    dispatchMouse(window, 'mouseup')
    await waitFor(() => {
      expect(canvas.getByTestId('capture-pressed')).toHaveTextContent('false')
    })
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  ...storyDescription(
    'Toggle enabled for useMousePressed and confirm listeners or work stop without leaking when off, then resume cleanly when on. Use the canvas controls and status readouts to verify the lifecycle. Show code should match the gated subscription pattern.',
  ),
  render: () => <EnabledStateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, enabledStateSnippet)
    const pad = canvas.getByTestId('enabled-pad')
    dispatchMouse(pad, 'mousedown')
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-pressed')).toHaveTextContent('true')
    })
    await userEvent.click(canvas.getByTestId('toggle-enabled'))
    await expect(canvas.getByTestId('enabled-pressed')).toHaveTextContent(
      'false',
    )
  },
}

export const DynamicTarget: Story = {
  name: 'Dynamic target',
  ...storyDescription(
    'Dynamic target: bind useMousePressed to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <DynamicTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, dynamicTargetSnippet)
    dispatchMouse(canvas.getByTestId('card-a'), 'mousedown')
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-pressed')).toHaveTextContent('true')
    })
    await userEvent.click(canvas.getByTestId('switch-target'))
    await expect(canvas.getByTestId('dynamic-pressed')).toHaveTextContent(
      'false',
    )
  },
}

export const InitialValue: Story = {
  name: 'Initial value',
  ...storyDescription(
    'Initial value with useMousePressed: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <InitialValueExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, initialValueSnippet)
    await userEvent.click(canvas.getByTestId('initial-mount'))
    await expect(canvas.getByTestId('initial-pressed')).toHaveTextContent(
      'true',
    )
    await expect(canvas.getByTestId('initial-source')).toHaveTextContent('idle')
  },
}

export const NestedContent: Story = {
  name: 'Nested content',
  ...storyDescription(
    'Nested content with useMousePressed: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <NestedContentExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, nestedContentSnippet)
    const container = canvas.getByTestId('nested-container')
    dispatchMouse(container, 'mousedown')
    await waitFor(() => {
      expect(canvas.getByTestId('nested-pressed')).toHaveTextContent('true')
    })
    dispatchMouse(window, 'mouseup')
    await waitFor(() => {
      expect(canvas.getByTestId('nested-pressed')).toHaveTextContent('false')
    })
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'useMousePressed Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, playgroundSnippet)
    await userEvent.click(canvas.getByTestId('play-mount'))
    const pad = canvas.getByTestId('playground-pad')
    dispatchMouse(pad, 'mousedown')
    await waitFor(() => {
      expect(canvas.getByTestId('play-pressed')).toHaveTextContent('true')
    })
    dispatchMouse(window, 'mouseup')
    await waitFor(() => {
      expect(canvas.getByTestId('play-pressed')).toHaveTextContent('false')
    })
  },
}
