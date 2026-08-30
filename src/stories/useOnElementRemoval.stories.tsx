import type { Meta, StoryObj } from '@storybook/react-vite'
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
  component: OverviewExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Calls a handler when a referenced element is removed from its owning document tree (directly or via an ancestor).

\`\`\`ts
import { useOnElementRemoval } from '@muradyanvano/react-hooks'

useOnElementRemoval<T extends Element>(
  ref: RefObject<T | null>,
  handler: UseOnElementRemovalHandler<T>,
  options?: UseOnElementRemovalOptions,
): void
\`\`\`

**Defaults:** \`{ enabled: true }\`

**Limitation:** intended for external/imperative DOM removal, or observation from a component that remains mounted. It is not a replacement for React effect cleanup when the observing component itself unmounts.

Each example below includes its own Show code / Hide code control and Copy code button. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
  },
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
  tags: ['autodocs'],
} satisfies Meta

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
  await expect(await canvas.findByTestId('highlighted-code')).toBeVisible()

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
