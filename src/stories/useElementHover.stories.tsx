import type { Meta, StoryObj } from '@storybook/react-vite'
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
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Tracks whether the mouse pointer is hovering over a referenced DOM element using native \`mouseenter\` / \`mouseleave\` listeners.

\`\`\`ts
import { useElementHover } from '@muradyanvano/react-hooks'

useElementHover<T extends Element>(
  ref: RefObject<T | null>,
  options?: UseElementHoverOptions,
): boolean
\`\`\`

**Defaults:** \`{ enabled: true, delayEnter: 0, delayLeave: 0, triggerOnRemoval: false }\`

**Mouse only:** Keyboard focus and touch presses do not change the returned boolean. Provide accessible alternatives for hover-only information.

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
  },
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

export const HoverMe: Story = {
  name: 'Hover me',
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
