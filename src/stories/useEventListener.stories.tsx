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
  AbortSignalExample,
  CustomEventExample,
  DynamicTargetExample,
  ElementTargetExample,
  MultipleEventsExample,
  OnceAndEnabledExample,
  OverviewExample,
  PlaygroundExample,
} from './components/UseEventListenerExamples'
import {
  abortSignalSnippet,
  customEventSnippet,
  dynamicTargetSnippet,
  elementTargetSnippet,
  multipleEventsSnippet,
  onceAndEnabledSnippet,
  overviewSnippet,
  playgroundSnippet,
} from './components/useEventListener.snippets'

const meta = {
  title: 'Hooks/useEventListener',
  tags: ['autodocs'],
  ...createHookStoryMeta('useEventListener', OverviewExample, {
    argTypes: {
      enabled: {
        control: 'boolean',
        description: 'When false, no listener is registered.',
        table: { defaultValue: { summary: 'true' } },
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
      once: {
        control: 'boolean',
        description: 'Remove the listener after the first matching event.',
        table: { defaultValue: { summary: 'false' } },
      },
    },
    args: {
      enabled: true,
      capture: false,
      passive: false,
      once: false,
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
    'Typed DOM listeners on window, elements, or refs without re-subscribing on every handler identity change. Trigger the demo events and watch the log update. Omit window on SSR-sensitive paths or pass an explicit target when the default is wrong.',
  ),
  render: () => <OverviewExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(
        Number(canvas.getByTestId('viewport-width').textContent),
      ).toBeGreaterThan(0)
      expect(canvas.getByTestId('resize-count')).toHaveTextContent('0')
      expect(canvas.getByTestId('viewport-category')).toBeInTheDocument()
    })

    const beforeWidth = canvas.getByTestId('viewport-width').textContent
    fireEvent(window, new Event('resize'))

    await waitFor(() => {
      expect(canvas.getByTestId('resize-count')).toHaveTextContent('1')
      expect(canvas.getByTestId('viewport-width').textContent).toBe(beforeWidth)
    })

    fireEvent(window, new Event('resize'))
    await waitFor(() => {
      expect(canvas.getByTestId('resize-count')).toHaveTextContent('2')
    })

    await userEvent.click(canvas.getByTestId('reset-resize'))
    await waitFor(() => {
      expect(canvas.getByTestId('resize-count')).toHaveTextContent('0')
    })

    await expectCodeDisclosure(canvas, overviewSnippet)
  },
}

export const ElementTarget: Story = {
  name: 'Element target',
  ...storyDescription(
    'Element target: bind useEventListener to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <ElementTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const target = canvas.getByRole('button', {
      name: 'Pointer tracking target',
    })

    await waitFor(() => {
      expect(canvas.getByTestId('click-count')).toHaveTextContent('0')
      expect(canvas.getByTestId('move-count')).toHaveTextContent('0')
    })

    fireEvent.pointerMove(target, { clientX: 42, clientY: 84 })
    await waitFor(() => {
      expect(canvas.getByTestId('pointer-x')).toHaveTextContent('42')
      expect(canvas.getByTestId('pointer-y')).toHaveTextContent('84')
      expect(canvas.getByTestId('move-count')).toHaveTextContent('1')
    })

    await userEvent.click(target)
    await waitFor(() => {
      expect(canvas.getByTestId('click-count')).toHaveTextContent('1')
    })

    await expectCodeDisclosure(canvas, elementTargetSnippet)
  },
}

export const MultipleEvents: Story = {
  name: 'Multiple events',
  ...storyDescription(
    'Multiple events with useEventListener: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <MultipleEventsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const zone = canvas.getByLabelText('Hover zone')

    await waitFor(() => {
      expect(canvas.getByTestId('hover-presence')).toHaveTextContent('Outside')
      expect(canvas.getByTestId('hover-last')).toHaveTextContent('None yet')
    })

    fireEvent.mouseEnter(zone)
    await waitFor(() => {
      expect(canvas.getByTestId('hover-presence')).toHaveTextContent('Inside')
      expect(canvas.getByTestId('hover-last')).toHaveTextContent('mouseenter')
      expect(canvas.getByTestId('hover-entry-0')).toHaveTextContent(
        'mouseenter',
      )
    })

    fireEvent.mouseLeave(zone)
    await waitFor(() => {
      expect(canvas.getByTestId('hover-presence')).toHaveTextContent('Outside')
      expect(canvas.getByTestId('hover-last')).toHaveTextContent('mouseleave')
      expect(canvas.getByTestId('hover-entry-0')).toHaveTextContent(
        'mouseleave',
      )
    })

    await expectCodeDisclosure(canvas, multipleEventsSnippet)
  },
}

export const DynamicTarget: Story = {
  name: 'Dynamic target',
  ...storyDescription(
    'Dynamic target: bind useEventListener to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <DynamicTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('active-target')).toHaveTextContent('alpha')
      expect(canvas.getByTestId('dynamic-count')).toHaveTextContent('0')
    })

    await userEvent.click(canvas.getByTestId('target-alpha'))
    await waitFor(() => {
      expect(canvas.getByTestId('last-target')).toHaveTextContent('alpha')
      expect(canvas.getByTestId('dynamic-count')).toHaveTextContent('1')
    })

    await userEvent.click(canvas.getByTestId('target-beta'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-count')).toHaveTextContent('1')
      expect(canvas.getByTestId('last-target')).toHaveTextContent('alpha')
    })

    await userEvent.selectOptions(canvas.getByTestId('target-select'), 'beta')
    await waitFor(() => {
      expect(canvas.getByTestId('active-target')).toHaveTextContent('beta')
    })

    await userEvent.click(canvas.getByTestId('target-beta'))
    await waitFor(() => {
      expect(canvas.getByTestId('last-target')).toHaveTextContent('beta')
      expect(canvas.getByTestId('dynamic-count')).toHaveTextContent('2')
    })

    await userEvent.click(canvas.getByTestId('target-alpha'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-count')).toHaveTextContent('2')
      expect(canvas.getByTestId('last-target')).toHaveTextContent('beta')
    })

    await expectCodeDisclosure(canvas, dynamicTargetSnippet)
  },
}

export const CustomEvent: Story = {
  name: 'Custom event',
  ...storyDescription(
    'Custom event: bind useEventListener to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <CustomEventExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('selected-id')).toHaveTextContent('None yet')
      expect(canvas.getByTestId('selected-label')).toHaveTextContent('None yet')
    })

    await userEvent.click(canvas.getByRole('button', { name: 'Select Alpha' }))
    await waitFor(() => {
      expect(canvas.getByTestId('selected-id')).toHaveTextContent('alpha')
      expect(canvas.getByTestId('selected-label')).toHaveTextContent('Alpha')
    })

    await userEvent.click(canvas.getByRole('button', { name: 'Select Beta' }))
    await waitFor(() => {
      expect(canvas.getByTestId('selected-id')).toHaveTextContent('beta')
      expect(canvas.getByTestId('selected-label')).toHaveTextContent('Beta')
    })

    await expectCodeDisclosure(canvas, customEventSnippet)
  },
}

export const OnceAndEnabled: Story = {
  name: 'Once and enabled',
  ...storyDescription(
    'Toggle enabled for useEventListener and confirm listeners or work stop without leaking when off, then resume cleanly when on. Use the canvas controls and status readouts to verify the lifecycle. Show code should match the gated subscription pattern.',
  ),
  render: () => <OnceAndEnabledExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fire = canvas.getByRole('button', { name: 'Fire once' })

    await waitFor(() => {
      expect(canvas.getByTestId('once-count')).toHaveTextContent('0')
    })

    await userEvent.click(fire)
    await waitFor(() => {
      expect(canvas.getByTestId('once-count')).toHaveTextContent('1')
    })

    await userEvent.click(fire)
    await waitFor(() => {
      expect(canvas.getByTestId('once-count')).toHaveTextContent('1')
    })

    await userEvent.click(canvas.getByTestId('once-enabled-checkbox'))
    await waitFor(() => {
      expect(canvas.getByTestId('once-mode')).toHaveTextContent('Paused')
    })

    await userEvent.click(fire)
    await expect(canvas.getByTestId('once-count')).toHaveTextContent('1')

    await userEvent.click(canvas.getByTestId('once-enabled-checkbox'))
    await waitFor(() => {
      expect(canvas.getByTestId('once-mode')).toHaveTextContent('Enabled')
    })

    await userEvent.click(fire)
    await waitFor(() => {
      expect(canvas.getByTestId('once-count')).toHaveTextContent('2')
    })

    await userEvent.click(fire)
    await expect(canvas.getByTestId('once-count')).toHaveTextContent('2')

    await expectCodeDisclosure(canvas, onceAndEnabledSnippet)
  },
}

export const AbortSignal: Story = {
  name: 'Abort signal',
  ...storyDescription(
    'Abort signal: reproduce the race or permission edge for useEventListener with the on-canvas controls. Confirm newer requests win or aborts clear state as documented, then inspect Show code for ownership rules.',
  ),
  render: () => <AbortSignalExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const target = canvas.getByRole('button', { name: 'Click target' })

    await waitFor(() => {
      expect(canvas.getByTestId('abort-count')).toHaveTextContent('0')
      expect(canvas.getByTestId('abort-phase')).toHaveTextContent('Listening')
    })

    await userEvent.click(target)
    await waitFor(() => {
      expect(canvas.getByTestId('abort-count')).toHaveTextContent('1')
    })

    await userEvent.click(canvas.getByRole('button', { name: 'Abort signal' }))
    await waitFor(() => {
      expect(canvas.getByTestId('abort-flag')).toHaveTextContent('true')
      expect(canvas.getByTestId('abort-phase')).toHaveTextContent(
        'Aborted — clicks ignored',
      )
    })

    await userEvent.click(target)
    await expect(canvas.getByTestId('abort-count')).toHaveTextContent('1')

    await userEvent.click(
      canvas.getByRole('button', { name: 'New controller' }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('abort-flag')).toHaveTextContent('false')
      expect(canvas.getByTestId('abort-phase')).toHaveTextContent('Listening')
    })

    await userEvent.click(target)
    await waitFor(() => {
      expect(canvas.getByTestId('abort-count')).toHaveTextContent('2')
    })

    await expectCodeDisclosure(canvas, abortSignalSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'useEventListener Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  render: (args) => (
    <PlaygroundExample
      enabled={args.enabled ?? true}
      capture={args.capture ?? false}
      passive={args.passive ?? false}
      once={args.once ?? false}
    />
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const target = canvas.getByRole('button', { name: 'Click me' })

    await waitFor(() => {
      expect(canvas.getByTestId('playground-count')).toHaveTextContent('0')
    })

    if (args.enabled ?? true) {
      await userEvent.click(target)
      await waitFor(() => {
        expect(canvas.getByTestId('playground-count')).toHaveTextContent('1')
      })

      if (!(args.once ?? false)) {
        await userEvent.click(target)
        await waitFor(() => {
          expect(canvas.getByTestId('playground-count')).toHaveTextContent('2')
        })
      }

      await userEvent.click(canvas.getByTestId('playground-reset'))
      await waitFor(() => {
        expect(canvas.getByTestId('playground-count')).toHaveTextContent('0')
      })
    } else {
      await userEvent.click(target)
      await expect(canvas.getByTestId('playground-count')).toHaveTextContent(
        '0',
      )
    }

    await expect(canvas.getByTestId('playground-options')).toBeInTheDocument()

    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}

export const PlaygroundPaused: Story = {
  name: 'Playground paused',
  ...storyDescription(
    'Docs-safe playground for useEventListener: mount when ready, tune controls, and observe live status without auto-starting privileged work. Copy the curated snippet from Show code when the behavior matches your app.',
  ),
  args: {
    enabled: false,
  },
  render: (args) => (
    <PlaygroundExample
      enabled={args.enabled ?? false}
      capture={args.capture ?? false}
      passive={args.passive ?? false}
      once={args.once ?? false}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('playground-count')).toHaveTextContent('0')
    })

    await userEvent.click(canvas.getByRole('button', { name: 'Click me' }))
    await expect(canvas.getByTestId('playground-count')).toHaveTextContent('0')
  },
}
