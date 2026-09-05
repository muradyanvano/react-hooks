import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  CancelledTransitionsExample,
  DelayedEnterExample,
  DelayedLeaveExample,
  DynamicTargetExample,
  ElementRemovalExample,
  EnabledStateExample,
  HoverMeExample,
  ImmediateHoverExample,
  NestedContentExample,
  PlaygroundExample,
  SvgTargetExample,
} from './components/UseElementHoverExamples'
import {
  cancelledTransitionsSnippet,
  delayedEnterSnippet,
  delayedLeaveSnippet,
  dynamicTargetSnippet,
  elementRemovalSnippet,
  enabledStateSnippet,
  hoverMeSnippet,
  immediateHoverSnippet,
  nestedContentSnippet,
  playgroundSnippet,
  svgTargetSnippet,
} from './components/useElementHover.snippets'

const meta = {
  title: 'Hooks/useElementHover',
  tags: ['autodocs'],
  ...createHookStoryMeta('useElementHover', PlaygroundExample, {
    argTypes: {
      enabled: {
        control: 'boolean',
        table: { defaultValue: { summary: 'true' } },
      },
      delayEnter: {
        control: { type: 'number', min: 0, max: 2000, step: 50 },
        table: { defaultValue: { summary: '0' } },
      },
      delayLeave: {
        control: { type: 'number', min: 0, max: 2000, step: 50 },
        table: { defaultValue: { summary: '0' } },
      },
      triggerOnRemoval: {
        control: 'boolean',
        table: { defaultValue: { summary: 'false' } },
      },
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
  await expect(await waitForDisclosedCode(canvas)).toBeVisible()

  const writeText = fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  await userEvent.click(canvas.getByTestId('copy-code'))
  await expect(writeText).toHaveBeenCalledWith(expectedSnippet)

  await userEvent.click(toggle)
}

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Immediate vs delayed hover flags on adjacent controls. Hover each button and compare status timing; keyboard focus does not flip the boolean. Delayed-leave demos keep trigger and panel under one observed ref.',
  ),
  render: () => <HoverMeExample delayedEnterMs={1000} />,
  parameters: { docs: { source: { code: hoverMeSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByTestId('hover-me-immediate')).toHaveTextContent(
      'Hover me',
    )
    await expect(canvas.getByTestId('hover-me-delayed')).toHaveTextContent(
      'Hover me',
    )
    await expect(
      canvas.getByTestId('hover-me-immediate-value'),
    ).toHaveTextContent('false')
    await expect(
      canvas.getByTestId('hover-me-delayed-value'),
    ).toHaveTextContent('false')

    await userEvent.hover(canvas.getByTestId('hover-me-immediate'))
    await waitFor(() => {
      expect(canvas.getByTestId('hover-me-immediate')).toHaveTextContent(
        'Thank you!',
      )
      expect(canvas.getByTestId('hover-me-immediate-value')).toHaveTextContent(
        'true',
      )
    })

    await userEvent.unhover(canvas.getByTestId('hover-me-immediate'))
    await waitFor(() => {
      expect(canvas.getByTestId('hover-me-immediate')).toHaveTextContent(
        'Hover me',
      )
    })

    await userEvent.hover(canvas.getByTestId('hover-me-delayed'))
    await expect(canvas.getByTestId('hover-me-delayed')).toHaveTextContent(
      'Hover me',
    )
    await expect(
      canvas.getByTestId('hover-me-delayed-value'),
    ).toHaveTextContent('false')

    await waitFor(
      () => {
        expect(canvas.getByTestId('hover-me-delayed')).toHaveTextContent(
          'Thank you!',
        )
        expect(canvas.getByTestId('hover-me-delayed-value')).toHaveTextContent(
          'true',
        )
      },
      { timeout: 1500 },
    )

    await userEvent.unhover(canvas.getByTestId('hover-me-delayed'))
    await waitFor(() => {
      expect(canvas.getByTestId('hover-me-delayed')).toHaveTextContent(
        'Hover me',
      )
      expect(canvas.getByTestId('hover-me-delayed-value')).toHaveTextContent(
        'false',
      )
    })

    await expectCodeDisclosure(canvas, hoverMeSnippet)
  },
}

export const ImmediateHover: Story = {
  name: 'Immediate hover',
  ...storyDescription(
    'Immediate hover with useElementHover: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ImmediateHoverExample />,
  parameters: { docs: { source: { code: immediateHoverSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.hover(canvas.getByTestId('immediate-card'))
    await waitFor(() => {
      expect(canvas.getByTestId('immediate-message')).toHaveTextContent(
        'Thanks for stopping by!',
      )
    })
    await expectCodeDisclosure(canvas, immediateHoverSnippet)
  },
}

export const DelayedEnter: Story = {
  name: 'Delayed enter',
  ...storyDescription(
    'Delayed enter: schedule work, then exercise cancel/flush/pending timing for useElementHover. Watch status settle to a deterministic idle state before leaving; Show code should match the timing policy under test.',
  ),
  render: () => <DelayedEnterExample delayEnter={200} />,
  parameters: { docs: { source: { code: delayedEnterSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.hover(canvas.getByTestId('delayed-enter-trigger'))
    await waitFor(
      () => {
        expect(canvas.getByTestId('delayed-enter-value')).toHaveTextContent(
          'true',
        )
      },
      { timeout: 800 },
    )
    await expectCodeDisclosure(canvas, delayedEnterSnippet)
  },
}

export const DelayedLeave: Story = {
  name: 'Delayed leave',
  ...storyDescription(
    'Delayed leave: schedule work, then exercise cancel/flush/pending timing for useElementHover. Watch status settle to a deterministic idle state before leaving; Show code should match the timing policy under test.',
  ),
  render: () => <DelayedLeaveExample delayLeave={200} />,
  parameters: { docs: { source: { code: delayedLeaveSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.hover(canvas.getByTestId('delayed-leave-menu'))
    await waitFor(() => {
      expect(canvas.getByTestId('delayed-leave-value')).toHaveTextContent(
        'true',
      )
    })
    await userEvent.unhover(canvas.getByTestId('delayed-leave-menu'))
    await waitFor(
      () => {
        expect(canvas.getByTestId('delayed-leave-value')).toHaveTextContent(
          'false',
        )
      },
      { timeout: 800 },
    )
    await expectCodeDisclosure(canvas, delayedLeaveSnippet)
  },
}

export const CancelledTransitions: Story = {
  name: 'Cancelled transitions',
  ...storyDescription(
    'Cancelled transitions: schedule work, then exercise cancel/flush/pending timing for useElementHover. Watch status settle to a deterministic idle state before leaving; Show code should match the timing policy under test.',
  ),
  render: () => (
    <CancelledTransitionsExample delayEnter={200} delayLeave={200} />
  ),
  parameters: { docs: { source: { code: cancelledTransitionsSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const target = canvas.getByTestId('cancelled-target')

    await userEvent.hover(target)
    await userEvent.unhover(target)
    await expect(canvas.getByTestId('cancelled-hover-value')).toHaveTextContent(
      'false',
    )

    await userEvent.hover(target)
    await waitFor(() => {
      expect(canvas.getByTestId('cancelled-hover-value')).toHaveTextContent(
        'true',
      )
    })
    await userEvent.unhover(target)
    await userEvent.hover(target)
    await waitFor(() => {
      expect(canvas.getByTestId('cancelled-hover-value')).toHaveTextContent(
        'true',
      )
    })

    await expectCodeDisclosure(canvas, cancelledTransitionsSnippet)
  },
}

export const NestedContent: Story = {
  name: 'Nested content',
  ...storyDescription(
    'Nested content with useElementHover: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <NestedContentExample />,
  parameters: { docs: { source: { code: nestedContentSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.hover(canvas.getByTestId('nested-tile'))
    await waitFor(() => {
      expect(canvas.getByTestId('nested-hover-value')).toHaveTextContent('true')
    })
    await userEvent.hover(canvas.getByTestId('nested-body'))
    await expect(canvas.getByTestId('nested-hover-value')).toHaveTextContent(
      'true',
    )
    await userEvent.unhover(canvas.getByTestId('nested-tile'))
    await waitFor(() => {
      expect(canvas.getByTestId('nested-hover-value')).toHaveTextContent(
        'false',
      )
    })
    await expectCodeDisclosure(canvas, nestedContentSnippet)
  },
}

export const ElementRemoval: Story = {
  name: 'Element removal',
  ...storyDescription(
    'Element removal with useElementHover: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ElementRemovalExample delayLeave={150} />,
  parameters: { docs: { source: { code: elementRemovalSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.hover(canvas.getByTestId('removal-target'))
    await waitFor(() => {
      expect(canvas.getByTestId('removal-hover-value')).toHaveTextContent(
        'true',
      )
    })
    await userEvent.click(canvas.getByTestId('removal-remove'))
    await waitFor(
      () => {
        expect(canvas.getByTestId('removal-hover-value')).toHaveTextContent(
          'false',
        )
      },
      { timeout: 1000 },
    )
    await expectCodeDisclosure(canvas, elementRemovalSnippet)
  },
}

export const DynamicTarget: Story = {
  name: 'Dynamic target',
  ...storyDescription(
    'Dynamic target: bind useElementHover to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <DynamicTargetExample />,
  parameters: { docs: { source: { code: dynamicTargetSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.hover(canvas.getByTestId('dynamic-target-a'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-hover-value')).toHaveTextContent(
        'true',
      )
    })
    await userEvent.click(canvas.getByTestId('dynamic-target-b'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-hover-value')).toHaveTextContent(
        'false',
      )
    })
    await userEvent.hover(canvas.getByTestId('dynamic-target-b'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-hover-value')).toHaveTextContent(
        'true',
      )
    })
    await expectCodeDisclosure(canvas, dynamicTargetSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  ...storyDescription(
    'Toggle enabled for useElementHover and confirm listeners or work stop without leaking when off, then resume cleanly when on. Use the canvas controls and status readouts to verify the lifecycle. Show code should match the gated subscription pattern.',
  ),
  render: () => <EnabledStateExample />,
  parameters: { docs: { source: { code: enabledStateSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.hover(canvas.getByTestId('enabled-target'))
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-hover-value')).toHaveTextContent(
        'true',
      )
    })
    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-hover-value')).toHaveTextContent(
        'false',
      )
    })
    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await userEvent.hover(canvas.getByTestId('enabled-target'))
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-hover-value')).toHaveTextContent(
        'true',
      )
    })
    await expectCodeDisclosure(canvas, enabledStateSnippet)
  },
}

export const SvgTarget: Story = {
  name: 'SVG target',
  ...storyDescription(
    'SVG target: bind useElementHover to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <SvgTargetExample />,
  parameters: { docs: { source: { code: svgTargetSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.hover(canvas.getByTestId('svg-target'))
    await waitFor(() => {
      expect(canvas.getByTestId('svg-hover-value')).toHaveTextContent('true')
      expect(canvas.getByTestId('svg-label')).toHaveTextContent('Active')
    })
    await expectCodeDisclosure(canvas, svgTargetSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'useElementHover Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  args: {
    enabled: true,
    delayEnter: 0,
    delayLeave: 0,
    triggerOnRemoval: false,
  },
  render: (args) => <PlaygroundExample {...args} />,
  parameters: { docs: { source: { code: playgroundSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.hover(canvas.getByTestId('pg-target'))
    await waitFor(() => {
      expect(canvas.getByTestId('pg-hover-value')).toHaveTextContent('true')
    })
    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
