import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import {
  expect,
  fireEvent,
  fn,
  userEvent,
  waitFor,
  within,
} from 'storybook/test'

import {
  CommandShortcutExample,
  CustomTargetExample,
  EnabledStateExample,
  KeyupExample,
  MultipleKeysExample,
  OverviewExample,
  PlaygroundExample,
  RepeatedEventsExample,
} from './components/UseOnKeyStrokeExamples'
import {
  commandSnippet,
  customTargetSnippet,
  enabledSnippet,
  keyupSnippet,
  multipleKeysSnippet,
  overviewSnippet,
  playgroundSnippet,
  repeatedSnippet,
} from './components/useOnKeyStroke.snippets'

const meta = {
  title: 'Hooks/useOnKeyStroke',
  tags: ['autodocs'],
  ...createHookStoryMeta('useOnKeyStroke', OverviewExample, {
    argTypes: {
      enabled: {
        control: 'boolean',
        description: 'When false, no listener is registered.',
        table: { defaultValue: { summary: 'true' } },
      },
      eventType: {
        control: 'inline-radio',
        options: ['keydown', 'keyup'],
        description: 'Keyboard event to listen for.',
        table: { defaultValue: { summary: 'keydown' } },
      },
      dedupe: {
        control: 'boolean',
        description: 'When true, ignore events where event.repeat is true.',
        table: { defaultValue: { summary: 'false' } },
      },
      capture: {
        control: 'boolean',
        description: 'Use capture-phase listener registration.',
        table: { defaultValue: { summary: 'false' } },
      },
      passive: {
        control: 'boolean',
        description: 'Register a passive listener.',
        table: { defaultValue: { summary: 'false' } },
      },
    },
    args: {
      enabled: true,
      eventType: 'keydown',
      dedupe: false,
      capture: false,
      passive: false,
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
    'Global or scoped keyboard shortcuts with exact event.key matching. Focus the demo and press the documented keys to see strokes logged without combination-string parsing. Use predicates to skip editable fields; the hook does not preventDefault for you.',
  ),
  render: () => <OverviewExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('nav-grid')).toBeInTheDocument()
    })
    await expect(canvas.getByTestId('nav-cell-1-1')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(canvas.getByTestId('event-count')).toHaveTextContent('0')

    await userEvent.keyboard('{ArrowRight}')
    await waitFor(() => {
      expect(canvas.getByTestId('nav-cell-1-2')).toHaveAttribute(
        'aria-selected',
        'true',
      )
      expect(canvas.getByTestId('last-key')).toHaveTextContent('ArrowRight')
      expect(canvas.getByTestId('event-count')).toHaveTextContent('1')
    })

    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => {
      expect(canvas.getByTestId('nav-cell-2-2')).toHaveAttribute(
        'aria-selected',
        'true',
      )
      expect(canvas.getByTestId('last-key')).toHaveTextContent('ArrowDown')
      expect(canvas.getByTestId('event-count')).toHaveTextContent('2')
    })

    await userEvent.keyboard('{ArrowLeft}{ArrowUp}')
    await waitFor(() => {
      expect(canvas.getByTestId('nav-cell-1-1')).toHaveAttribute(
        'aria-selected',
        'true',
      )
      expect(canvas.getByTestId('event-count')).toHaveTextContent('4')
    })

    await userEvent.click(canvas.getByTestId('reset-nav'))
    await waitFor(() => {
      expect(canvas.getByTestId('nav-cell-1-1')).toHaveAttribute(
        'aria-selected',
        'true',
      )
      expect(canvas.getByTestId('last-key')).toHaveTextContent('None yet')
      expect(canvas.getByTestId('event-count')).toHaveTextContent('0')
    })

    await expectCodeDisclosure(canvas, overviewSnippet)
  },
}

export const CommandShortcut: Story = {
  name: 'Command shortcut',
  ...storyDescription(
    'Command shortcut with useOnKeyStroke: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <CommandShortcutExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('open-status')).toHaveTextContent('Closed')
    })

    const ignoreInput = canvas.getByPlaceholderText(
      'Focus, then try Ctrl/Cmd+K',
    )
    await userEvent.click(ignoreInput)
    await userEvent.keyboard('{Control>}k{/Control}')
    await expect(canvas.getByTestId('open-status')).toHaveTextContent('Closed')
    await expect(canvas.getByTestId('shortcut-count')).toHaveTextContent('0')

    await userEvent.tab()
    await userEvent.keyboard('{Control>}k{/Control}')
    await waitFor(() => {
      expect(canvas.getByTestId('open-status')).toHaveTextContent('Open')
      expect(canvas.getByTestId('command-panel')).toBeInTheDocument()
      expect(canvas.getByTestId('shortcut-count')).toHaveTextContent('1')
    })

    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(canvas.getByTestId('open-status')).toHaveTextContent('Closed')
    })

    await userEvent.keyboard('{Meta>}k{/Meta}')
    await waitFor(() => {
      expect(canvas.getByTestId('open-status')).toHaveTextContent('Open')
      expect(canvas.getByTestId('shortcut-count')).toHaveTextContent('2')
      expect(canvas.getByTestId('command-input')).toBeInTheDocument()
    })

    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(canvas.getByTestId('open-status')).toHaveTextContent('Closed')
    })

    await expectCodeDisclosure(canvas, commandSnippet)
  },
}

export const MultipleKeys: Story = {
  name: 'Multiple keys',
  ...storyDescription(
    'Multiple keys with useOnKeyStroke: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <MultipleKeysExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('multi-count')).toHaveTextContent('0')
    })

    await userEvent.keyboard(' ')
    await waitFor(() => {
      expect(canvas.getByTestId('multi-last')).toHaveTextContent(
        'Matched: Space',
      )
      expect(canvas.getByTestId('multi-count')).toHaveTextContent('1')
    })

    await userEvent.keyboard('{Enter}')
    await waitFor(() => {
      expect(canvas.getByTestId('multi-last')).toHaveTextContent(
        'Matched: Enter',
      )
      expect(canvas.getByTestId('multi-count')).toHaveTextContent('2')
    })

    await userEvent.keyboard('x')
    await waitFor(() => {
      expect(canvas.getByTestId('multi-last')).toHaveTextContent('Ignored: x')
      expect(canvas.getByTestId('multi-count')).toHaveTextContent('2')
    })

    await expectCodeDisclosure(canvas, multipleKeysSnippet)
  },
}

export const RepeatedEvents: Story = {
  name: 'Repeated events',
  ...storyDescription(
    'Repeated events with useOnKeyStroke: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <RepeatedEventsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('dedupe-off-count')).toHaveTextContent('0')
      expect(canvas.getByTestId('dedupe-on-count')).toHaveTextContent('0')
    })

    await userEvent.click(canvas.getByTestId('fire-normal'))
    await waitFor(() => {
      expect(canvas.getByTestId('dedupe-off-count')).toHaveTextContent('1')
      expect(canvas.getByTestId('dedupe-on-count')).toHaveTextContent('1')
    })

    await userEvent.click(canvas.getByTestId('fire-repeat'))
    await waitFor(() => {
      expect(canvas.getByTestId('dedupe-off-count')).toHaveTextContent('2')
      expect(canvas.getByTestId('dedupe-on-count')).toHaveTextContent('1')
    })

    fireEvent.keyDown(window, { key: 'ArrowRight', repeat: false })
    await waitFor(() => {
      expect(canvas.getByTestId('dedupe-off-count')).toHaveTextContent('3')
      expect(canvas.getByTestId('dedupe-on-count')).toHaveTextContent('2')
    })

    fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true })
    await waitFor(() => {
      expect(canvas.getByTestId('dedupe-off-count')).toHaveTextContent('4')
      expect(canvas.getByTestId('dedupe-on-count')).toHaveTextContent('2')
    })

    await expectCodeDisclosure(canvas, repeatedSnippet)
  },
}

export const CustomTarget: Story = {
  name: 'Custom target',
  ...storyDescription(
    'Custom target: bind useOnKeyStroke to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <CustomTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('key-region')).toBeInTheDocument()
      expect(canvas.getByTestId('region-count')).toHaveTextContent('0')
    })

    const region = canvas.getByTestId('key-region')
    region.focus()
    await expect(region).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    await waitFor(() => {
      expect(canvas.getByTestId('region-count')).toHaveTextContent('1')
    })

    const outsideButton = within(
      canvas.getByTestId('outside-key-area'),
    ).getByRole('button')
    await userEvent.click(outsideButton)
    await expect(outsideButton).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    await waitFor(() => {
      expect(canvas.getByTestId('region-count')).toHaveTextContent('1')
    })

    await expectCodeDisclosure(canvas, customTargetSnippet)
  },
}

export const KeyupOnly: Story = {
  name: 'Keyup',
  ...storyDescription(
    'Keyup with useOnKeyStroke: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <KeyupExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('keyup-count')).toHaveTextContent('0')
      expect(canvas.getByTestId('keyup-last')).toHaveTextContent('None yet')
    })

    fireEvent.keyDown(window, { key: 'a' })
    await expect(canvas.getByTestId('keyup-count')).toHaveTextContent('0')

    fireEvent.keyUp(window, { key: 'a' })
    await waitFor(() => {
      expect(canvas.getByTestId('keyup-count')).toHaveTextContent('1')
      expect(canvas.getByTestId('keyup-last')).toHaveTextContent('a')
    })

    await userEvent.keyboard('b')
    await waitFor(() => {
      expect(canvas.getByTestId('keyup-count')).toHaveTextContent('2')
      expect(canvas.getByTestId('keyup-last')).toHaveTextContent('b')
    })

    await expectCodeDisclosure(canvas, keyupSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled',
  ...storyDescription(
    'Toggle enabled for useOnKeyStroke and confirm listeners or work stop without leaking when off, then resume cleanly when on. Use the canvas controls and status readouts to verify the lifecycle. Show code should match the gated subscription pattern.',
  ),
  render: () => <EnabledStateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('key-enabled-count')).toHaveTextContent('0')
    })

    await userEvent.keyboard('a')
    await waitFor(() => {
      expect(canvas.getByTestId('key-enabled-count')).toHaveTextContent('1')
    })

    await userEvent.click(canvas.getByTestId('key-enabled-checkbox'))
    await userEvent.keyboard('b')
    await waitFor(() => {
      expect(canvas.getByTestId('key-enabled-count')).toHaveTextContent('1')
    })

    await userEvent.click(canvas.getByTestId('key-enabled-checkbox'))
    await userEvent.keyboard('c')
    await waitFor(() => {
      expect(canvas.getByTestId('key-enabled-count')).toHaveTextContent('2')
    })

    await expectCodeDisclosure(canvas, enabledSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'useOnKeyStroke Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  render: (args) => (
    <PlaygroundExample
      enabled={args.enabled ?? true}
      eventType={args.eventType ?? 'keydown'}
      dedupe={args.dedupe ?? false}
      capture={args.capture ?? false}
      passive={args.passive ?? false}
    />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('playground-key-count')).toHaveTextContent('0')
      expect(canvas.getByTestId('playground-last-key')).toHaveTextContent(
        'None yet',
      )
    })

    if (args.enabled ?? true) {
      await userEvent.keyboard('z')
      await waitFor(() => {
        expect(canvas.getByTestId('playground-last-key')).toHaveTextContent('z')
        expect(canvas.getByTestId('playground-key-count')).toHaveTextContent(
          '1',
        )
      })

      await userEvent.click(canvas.getByTestId('playground-reset'))
      await waitFor(() => {
        expect(canvas.getByTestId('playground-last-key')).toHaveTextContent(
          'None yet',
        )
        expect(canvas.getByTestId('playground-key-count')).toHaveTextContent(
          '0',
        )
      })
    } else {
      await userEvent.keyboard('z')
      await expect(
        canvas.getByTestId('playground-key-count'),
      ).toHaveTextContent('0')
    }

    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}

export const PlaygroundPaused: Story = {
  name: 'Playground paused',
  ...storyDescription(
    'Docs-safe playground for useOnKeyStroke: mount when ready, tune controls, and observe live status without auto-starting privileged work. Copy the curated snippet from Show code when the behavior matches your app.',
  ),
  args: {
    enabled: false,
  },
  render: (args) => (
    <PlaygroundExample
      enabled={args.enabled ?? false}
      eventType={args.eventType ?? 'keydown'}
      dedupe={args.dedupe ?? false}
      capture={args.capture ?? false}
      passive={args.passive ?? false}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('playground-key-count')).toHaveTextContent('0')
    })

    await userEvent.keyboard('z')
    await expect(canvas.getByTestId('playground-key-count')).toHaveTextContent(
      '0',
    )
    await expect(canvas.getByTestId('playground-last-key')).toHaveTextContent(
      'None yet',
    )
  },
}
