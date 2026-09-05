import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  AncestorRemovalExample,
  ElementReplacementExample,
  EnabledStateExample,
  OverviewExample,
  PlaygroundExample,
  SvgRemovalExample,
} from './components/UseOnElementRemovalExamples'
import {
  ancestorSnippet,
  enabledSnippet,
  overviewSnippet,
  playgroundSnippet,
  replacementSnippet,
  svgSnippet,
} from './components/useOnElementRemoval.snippets'

const meta = {
  title: 'Hooks/useOnElementRemoval',
  tags: ['autodocs'],
  ...createHookStoryMeta('useOnElementRemoval', OverviewExample, {
    argTypes: {
      enabled: {
        control: 'boolean',
        description: 'When false, no MutationObserver is created.',
        table: { defaultValue: { summary: 'true' } },
      },
    },
    args: {
      enabled: true,
    },
  }),
} satisfies Meta<typeof OverviewExample>

export default meta

type Story = StoryObj<typeof PlaygroundExample>

async function expectCodeDisclosure(
  canvas: ReturnType<typeof within>,
  expectedSnippet: string,
) {
  const toggle = canvas.getByTestId('toggle-code')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(canvas.getByTestId('code-panel')).not.toBeVisible()

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(canvas.getByTestId('code-panel')).toBeVisible()
  await expect(await waitForDisclosedCode(canvas)).toBeVisible()

  const writeText = fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  await userEvent.click(canvas.getByTestId('copy-code'))
  await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
  await expect(canvas.getByTestId('copy-code')).toHaveTextContent('Copied')

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(canvas.getByTestId('code-panel')).not.toBeVisible()
}

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Detect when a watched DOM node is removed by imperative code while the observer stays mounted. Remove the target and confirm the handler fires once with the removed instance. Prefer React effect cleanup when the observing component itself unmounts.',
  ),
  render: () => <OverviewExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('external-widget')).toBeInTheDocument()
    })
    await expect(canvas.getByTestId('widget-state')).toHaveTextContent(
      'Mounted #1',
    )

    await userEvent.click(canvas.getByTestId('simulate-removal'))

    await waitFor(() => {
      expect(canvas.getByTestId('removal-count')).toHaveTextContent('1')
      expect(canvas.getByTestId('last-removed')).toHaveTextContent('1')
      expect(canvas.getByTestId('widget-state')).toHaveTextContent('Removed')
    })

    await userEvent.click(canvas.getByTestId('restore-widget'))

    await waitFor(() => {
      expect(canvas.getByTestId('external-widget')).toBeInTheDocument()
      expect(canvas.getByTestId('widget-state')).toHaveTextContent('Mounted #2')
    })

    await expectCodeDisclosure(canvas, overviewSnippet)
  },
}

export const AncestorRemoval: Story = {
  name: 'Ancestor removal',
  ...storyDescription(
    'Ancestor removal with useOnElementRemoval: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <AncestorRemovalExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('observed-target')).toBeInTheDocument()
    })

    await userEvent.click(canvas.getByTestId('remove-sibling'))
    await waitFor(() => {
      expect(canvas.queryByTestId('unrelated-sibling')).not.toBeInTheDocument()
    })
    await expect(canvas.getByTestId('ancestor-removals')).toHaveTextContent('0')
    await expect(canvas.getByTestId('observed-target')).toBeInTheDocument()

    await userEvent.click(canvas.getByTestId('remove-ancestor'))
    await waitFor(() => {
      expect(canvas.getByTestId('ancestor-removals')).toHaveTextContent('1')
      expect(canvas.getByTestId('ancestor-status')).toHaveTextContent(
        'Detected removal of target #1',
      )
    })

    await userEvent.click(canvas.getByTestId('restore-hierarchy'))
    await waitFor(() => {
      expect(canvas.getByTestId('observed-target')).toBeInTheDocument()
    })

    await expectCodeDisclosure(canvas, ancestorSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  ...storyDescription(
    'Toggle enabled for useOnElementRemoval and confirm listeners or work stop without leaking when off, then resume cleanly when on. Use the canvas controls and status readouts to verify the lifecycle. Show code should match the gated subscription pattern.',
  ),
  render: () => <EnabledStateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('monitored-target')).toBeInTheDocument()
    })

    await userEvent.click(canvas.getByTestId('enabled-checkbox'))
    await expect(canvas.getByTestId('enabled-state')).toHaveTextContent(
      'Paused',
    )

    await userEvent.click(canvas.getByTestId('enabled-remove'))
    await waitFor(() => {
      expect(canvas.queryByTestId('monitored-target')).not.toBeInTheDocument()
    })
    await expect(canvas.getByTestId('enabled-removals')).toHaveTextContent('0')

    await userEvent.click(canvas.getByTestId('enabled-restore'))
    await waitFor(() => {
      expect(canvas.getByTestId('monitored-target')).toBeInTheDocument()
    })

    await userEvent.click(canvas.getByTestId('enabled-checkbox'))
    await expect(canvas.getByTestId('enabled-state')).toHaveTextContent(
      'Enabled',
    )

    await userEvent.click(canvas.getByTestId('enabled-remove'))
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-removals')).toHaveTextContent('1')
    })

    await expectCodeDisclosure(canvas, enabledSnippet)
  },
}

export const ElementReplacement: Story = {
  name: 'Element replacement',
  ...storyDescription(
    'Element replacement with useOnElementRemoval: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ElementReplacementExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('replacement-target')).toHaveTextContent(
        'Instance #1',
      )
    })

    await userEvent.click(canvas.getByTestId('replacement-remove'))
    await waitFor(() => {
      expect(canvas.getByTestId('replacement-last-removed')).toHaveTextContent(
        '1',
      )
      expect(canvas.getByTestId('replacement-observed')).toHaveTextContent(
        'Awaiting replacement',
      )
    })

    await userEvent.click(canvas.getByTestId('replacement-next'))
    await waitFor(() => {
      expect(canvas.getByTestId('replacement-target')).toHaveTextContent(
        'Instance #2',
      )
      expect(canvas.getByTestId('replacement-observed')).toHaveTextContent(
        'Observing #2',
      )
    })

    await expectCodeDisclosure(canvas, replacementSnippet)
  },
}

export const SvgRemoval: Story = {
  name: 'SVG removal',
  ...storyDescription(
    'SVG removal with useOnElementRemoval: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <SvgRemovalExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('svg-shape')).toBeInTheDocument()
    })

    await userEvent.click(canvas.getByTestId('svg-remove'))
    await waitFor(() => {
      expect(canvas.getByTestId('svg-status')).toHaveTextContent(
        'Detected SVG removal #1',
      )
      expect(canvas.queryByTestId('svg-shape')).not.toBeInTheDocument()
    })

    await userEvent.click(canvas.getByTestId('svg-restore'))
    await waitFor(() => {
      expect(canvas.getByTestId('svg-shape')).toBeInTheDocument()
      expect(canvas.getByTestId('svg-status')).toHaveTextContent(
        'Observing SVG shape',
      )
    })

    await expectCodeDisclosure(canvas, svgSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'useOnElementRemoval Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  render: (args) => <PlaygroundExample enabled={args.enabled ?? true} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('playground-target')).toBeInTheDocument()
    })

    if (args.enabled ?? true) {
      await expect(canvas.getByTestId('playground-mode')).toHaveTextContent(
        'Active',
      )
      await userEvent.click(canvas.getByTestId('playground-remove'))
      await waitFor(() => {
        expect(canvas.getByTestId('playground-removals')).toHaveTextContent('1')
      })
    } else {
      await expect(canvas.getByTestId('playground-mode')).toHaveTextContent(
        'Paused',
      )
      await userEvent.click(canvas.getByTestId('playground-remove'))
      await waitFor(() => {
        expect(
          canvas.queryByTestId('playground-target'),
        ).not.toBeInTheDocument()
      })
      await expect(canvas.getByTestId('playground-removals')).toHaveTextContent(
        '0',
      )
    }

    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}

export const PlaygroundPaused: Story = {
  name: 'Playground paused',
  ...storyDescription(
    'Docs-safe playground for useOnElementRemoval: mount when ready, tune controls, and observe live status without auto-starting privileged work. Copy the curated snippet from Show code when the behavior matches your app.',
  ),
  args: {
    enabled: false,
  },
  render: (args) => <PlaygroundExample enabled={args.enabled ?? false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('playground-target')).toBeInTheDocument()
    })
    await expect(canvas.getByTestId('playground-mode')).toHaveTextContent(
      'Paused',
    )

    await userEvent.click(canvas.getByTestId('playground-remove'))
    await waitFor(() => {
      expect(canvas.queryByTestId('playground-target')).not.toBeInTheDocument()
    })
    await expect(canvas.getByTestId('playground-removals')).toHaveTextContent(
      '0',
    )
  },
}
