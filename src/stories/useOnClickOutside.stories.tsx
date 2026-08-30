import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fireEvent, fn, userEvent, within } from 'storybook/test'

import {
  DropdownMenuExample,
  EnabledStateExample,
  EventTypeComparisonExample,
  FilterPopoverExample,
  NestedContentExample,
  OverviewExample,
  PlaygroundExample,
} from './components/UseOnClickOutsideExamples'
import {
  dropdownSnippet,
  enabledSnippet,
  eventTypeSnippet,
  filterSnippet,
  nestedSnippet,
  overviewSnippet,
  playgroundSnippet,
} from './components/useOnClickOutside.snippets'

const meta = {
  title: 'Hooks/useOnClickOutside',
  component: OverviewExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Invokes a handler when a document-level pointer or click event happens outside a referenced element.

\`\`\`ts
import { useOnClickOutside } from '@muradyanvano/react-hooks'

useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: UseOnClickOutsideHandler,
  options?: UseOnClickOutsideOptions,
): void
\`\`\`

**Defaults:** \`{ enabled: true, eventType: 'pointerdown', capture: true }\`

**Limitations:** one ref only; no ignore lists; no iframe helpers; not a full Shadow DOM or portal API.

Each example below includes its own Show code / Hide code control and Copy code button. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
  },
  argTypes: {
    enabled: {
      control: 'boolean',
      description: 'When false, no document listener is registered.',
      table: { defaultValue: { summary: 'true' } },
    },
    eventType: {
      control: 'inline-radio',
      options: ['pointerdown', 'click'],
      description: 'Document event to listen for.',
      table: { defaultValue: { summary: 'pointerdown' } },
    },
    capture: {
      control: 'boolean',
      description: 'Use capture-phase listener registration.',
      table: { defaultValue: { summary: 'true' } },
    },
    onOutside: {
      action: 'outside',
      description: 'Fires when an outside event is handled.',
    },
  },
  args: {
    enabled: true,
    eventType: 'pointerdown',
    capture: true,
    onOutside: fn(),
  },
  tags: ['autodocs'],
} satisfies Meta<typeof OverviewExample>

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

export const Overview: Story = {
  name: 'Overview',
  render: (args) => <OverviewExample {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('overview-panel')).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: 'Mark all read' }))
    await expect(canvas.getByTestId('overview-panel')).toBeVisible()

    await userEvent.click(canvas.getByTestId('outside-button'))
    await expect(canvas.queryByTestId('overview-panel')).not.toBeInTheDocument()
    await expect(canvas.getByTestId('outside-count')).toHaveTextContent('1')
    await expect(args.onOutside).toHaveBeenCalled()

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, overviewSnippet)
  },
}

export const DropdownMenu: Story = {
  name: 'Dropdown menu',
  render: (args) => <DropdownMenuExample onOutside={args.onOutside} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByTestId('menu-trigger')

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByTestId('menu-surface')).toBeVisible()

    await userEvent.click(canvas.getByRole('menuitem', { name: 'Profile' }))
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(canvas.getByTestId('last-action')).toHaveTextContent('Profile')

    await userEvent.click(trigger)
    await userEvent.click(canvas.getByTestId('outside-button'))
    await expect(canvas.queryByTestId('menu-surface')).not.toBeInTheDocument()

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, dropdownSnippet)
  },
}

export const FilterPopover: Story = {
  name: 'Filter popover',
  render: (args) => <FilterPopoverExample onOutside={args.onOutside} />,
  parameters: {
    viewport: { value: 'mobile' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('filter-panel')).toBeVisible()
    await userEvent.type(canvas.getByLabelText('Query'), ' demo')
    await expect(canvas.getByTestId('filter-panel')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Apply' }))
    await expect(canvas.getByTestId('filter-summary')).toHaveTextContent(
      'hooks demo',
    )
    await userEvent.click(canvas.getByTestId('outside-button'))
    await expect(canvas.queryByTestId('filter-panel')).not.toBeInTheDocument()

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, filterSnippet)
  },
}

export const EventTypeComparison: Story = {
  name: 'Event type comparison',
  render: (args) => <EventTypeComparisonExample onOutside={args.onOutside} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    fireEvent.pointerDown(canvas.getByTestId('pointerdown-outside'))
    await expect(canvas.getByTestId('pointerdown-status')).toHaveTextContent(
      'Closed',
    )
    await expect(canvas.getByTestId('click-status')).toHaveTextContent('Open')

    await userEvent.click(canvas.getByTestId('click-outside'))
    await expect(canvas.getByTestId('click-status')).toHaveTextContent('Closed')

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, eventTypeSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  render: (args) => <EnabledStateExample onOutside={args.onOutside} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('outside-button'))
    await expect(canvas.queryByTestId('enabled-panel')).not.toBeInTheDocument()
    await expect(canvas.getByTestId('outside-count')).toHaveTextContent('1')

    await userEvent.click(canvas.getByTestId('enabled-trigger'))
    await expect(canvas.getByTestId('enabled-panel')).toBeVisible()

    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await userEvent.click(canvas.getByTestId('outside-button'))
    await expect(canvas.getByTestId('enabled-panel')).toBeVisible()
    await expect(canvas.getByTestId('outside-count')).toHaveTextContent('1')

    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await userEvent.click(canvas.getByTestId('outside-button'))
    await expect(canvas.queryByTestId('enabled-panel')).not.toBeInTheDocument()
    await expect(canvas.getByTestId('outside-count')).toHaveTextContent('2')

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, enabledSnippet)
  },
}

export const NestedContent: Story = {
  name: 'Nested content',
  render: (args) => <NestedContentExample onOutside={args.onOutside} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('deep-nested-button'))
    await expect(canvas.getByTestId('nested-panel')).toBeVisible()
    await expect(canvas.getByTestId('nested-log')).toHaveTextContent(
      'Clicked deep nested button',
    )
    await userEvent.click(canvas.getByTestId('outside-button'))
    await expect(canvas.queryByTestId('nested-panel')).not.toBeInTheDocument()

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, nestedSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  render: (args) => <PlaygroundExample {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByTestId('playground-options')).toHaveTextContent(
      'enabled',
    )
    await expect(canvas.getByTestId('playground-options')).toHaveTextContent(
      'pointerdown',
    )

    await userEvent.click(canvas.getByTestId('outside-button'))
    await expect(canvas.queryByTestId('overview-panel')).not.toBeInTheDocument()
    await expect(canvas.getByTestId('outside-count')).toHaveTextContent('1')
    await expect(args.onOutside).toHaveBeenCalled()

    await userEvent.click(canvas.getByTestId('overview-trigger'))
    await expect(canvas.getByTestId('overview-panel')).toBeVisible()

    await expectCodeDisclosure(canvas)
    await expectCopySuccess(canvas, playgroundSnippet)
  },
  parameters: {
    docs: {
      description: {
        story:
          'Storybook Controls change the running example. The code panel shows the general configurable implementation.',
      },
    },
  },
}

export const ClipboardFailure: Story = {
  name: 'Clipboard failure',
  tags: ['!autodocs', '!dev'],
  render: (args) => <OverviewExample {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: fn(async () => {
          throw new Error('denied')
        }),
      },
    })

    await userEvent.click(canvas.getByTestId('toggle-code'))
    await userEvent.click(canvas.getByTestId('copy-code'))
    await expect(canvas.getByTestId('copy-code')).toHaveTextContent(
      'Copy failed',
    )
    await expect(canvas.getByText('Unable to copy code')).toBeInTheDocument()
  },
}
