import type { Meta, StoryObj } from '@storybook/react-vite'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  BasicUsageExample,
  CustomIframeExample,
  DraftReminderExample,
  DynamicWindowExample,
  EnabledStateExample,
  ExitIntentExample,
  InitialValueExample,
  InternalMovementExample,
  MultipleInstancesExample,
  NullWindowExample,
  PageLeaveDetectorExample,
  PausingEffectExample,
  PlaygroundExample,
  ReEnteringExample,
  TabVisibilityExample,
  TouchLimitationExample,
} from './components/UsePageLeaveExamples'
import {
  basicUsageSnippet,
  customIframeSnippet,
  draftReminderSnippet,
  dynamicWindowSnippet,
  enabledStateSnippet,
  exitIntentSnippet,
  initialValueSnippet,
  internalMovementSnippet,
  multipleInstancesSnippet,
  nullWindowSnippet,
  pageLeaveDetectorSnippet,
  pausingEffectSnippet,
  playgroundSnippet,
  reEnteringSnippet,
  tabVisibilitySnippet,
  touchLimitationSnippet,
} from './components/usePageLeave.snippets'
import { waitForDisclosedCode } from './components/expectCodeDisclosure'

const meta = {
  title: 'Hooks/usePageLeave',
  tags: ['autodocs'],
  ...createHookStoryMeta('usePageLeave', PlaygroundExample, {
    argTypes: {
      enabled: {
        control: 'boolean',
        table: { defaultValue: { summary: 'true' } },
      },
      initialValue: {
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
  const highlighted = await waitForDisclosedCode(canvas)
  await expect(highlighted).toBeVisible()
  await expect(highlighted.textContent?.length ?? 0).toBeGreaterThan(0)

  const writeText = fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  await userEvent.click(canvas.getByTestId('copy-code'))
  await expect(writeText).toHaveBeenCalledWith(expectedSnippet)

  await userEvent.click(toggle)
}

async function waitForIframeWindow(
  canvas: ReturnType<typeof within>,
  testId: string,
): Promise<Window> {
  const iframe = await canvas.findByTestId(testId)
  await waitFor(() => {
    expect((iframe as HTMLIFrameElement).contentWindow).toBeTruthy()
  })
  const win = (iframe as HTMLIFrameElement).contentWindow
  if (win == null) {
    throw new Error(`Missing contentWindow for ${testId}`)
  }
  return win
}

function dispatchLeave(win: Window) {
  win.dispatchEvent(
    new MouseEvent('mouseout', {
      bubbles: true,
      relatedTarget: null,
    }),
  )
}

function dispatchEnter(win: Window) {
  win.dispatchEvent(
    new MouseEvent('mouseover', {
      bubbles: true,
    }),
  )
}

/** Leave is ignored until the observed window has seen a mouseover. */
function dispatchEnterThenLeave(win: Window) {
  dispatchEnter(win)
  dispatchLeave(win)
}

function dispatchInternal(win: Window) {
  const related = win.document.body
  win.dispatchEvent(
    new MouseEvent('mouseout', {
      bubbles: true,
      relatedTarget: related,
    }),
  )
}

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Detect pointer leaving an isolated mini-browser frame. Move outside the iframe viewport and watch Inside/Left status; re-enter to clear. Never attach to the Storybook manager document.',
  ),
  render: () => <PageLeaveDetectorExample />,
  parameters: { docs: { source: { code: pageLeaveDetectorSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const win = await waitForIframeWindow(canvas, 'page-leave-primary-iframe')

    await expect(canvas.getByTestId('page-leave-status')).toHaveTextContent(
      'Idle — pointer not in page',
    )
    await expect(canvas.getByTestId('page-leave-snapshot')).toHaveTextContent(
      '"hasLeft": false',
    )

    dispatchEnterThenLeave(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-status')).toHaveTextContent(
        'Mouse left page',
      )
      expect(canvas.getByTestId('page-leave-snapshot')).toHaveTextContent(
        '"hasLeft": true',
      )
    })

    dispatchEnter(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-status')).toHaveTextContent(
        'Inside page',
      )
    })

    await expectCodeDisclosure(canvas, pageLeaveDetectorSnippet)
  },
}

export const BasicUsage: Story = {
  name: 'Basic usage',
  ...storyDescription(
    'Basic usage with usePageLeave: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <BasicUsageExample />,
  parameters: { docs: { source: { code: basicUsageSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const win = await waitForIframeWindow(canvas, 'page-leave-basic-iframe')
    dispatchEnterThenLeave(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-basic-status')).toHaveTextContent(
        'Mouse left page',
      )
    })
    dispatchEnter(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-basic-status')).toHaveTextContent(
        'Inside page',
      )
    })
    await expectCodeDisclosure(canvas, basicUsageSnippet)
  },
}

export const ReEntering: Story = {
  name: 'Re-entering the page',
  ...storyDescription(
    'Re-entering the page with usePageLeave: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ReEnteringExample />,
  parameters: { docs: { source: { code: reEnteringSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const win = await waitForIframeWindow(canvas, 'page-leave-reenter-iframe')
    dispatchEnterThenLeave(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-reenter-status')).toHaveTextContent(
        'Mouse left page',
      )
    })
    dispatchEnter(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-reenter-status')).toHaveTextContent(
        'Inside page',
      )
    })
    await expectCodeDisclosure(canvas, reEnteringSnippet)
  },
}

export const InternalMovement: Story = {
  name: 'Internal element movement',
  ...storyDescription(
    'Internal element movement with usePageLeave: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <InternalMovementExample />,
  parameters: { docs: { source: { code: internalMovementSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const win = await waitForIframeWindow(canvas, 'page-leave-internal-iframe')
    dispatchInternal(win)
    await expect(
      canvas.getByTestId('page-leave-internal-status'),
    ).toHaveTextContent('Idle — pointer not in page')
    await userEvent.click(canvas.getByTestId('page-leave-internal-move'))
    await expect(
      canvas.getByTestId('page-leave-internal-status'),
    ).toHaveTextContent('Idle — pointer not in page')
    dispatchEnter(win)
    await waitFor(() => {
      expect(
        canvas.getByTestId('page-leave-internal-status'),
      ).toHaveTextContent('Inside page')
    })
    await userEvent.click(canvas.getByTestId('page-leave-internal-leave'))
    await waitFor(() => {
      expect(
        canvas.getByTestId('page-leave-internal-status'),
      ).toHaveTextContent('Mouse left page')
    })
    dispatchEnter(win)
    await waitFor(() => {
      expect(
        canvas.getByTestId('page-leave-internal-status'),
      ).toHaveTextContent('Inside page')
    })
    await expectCodeDisclosure(canvas, internalMovementSnippet)
  },
}

export const ExitIntentMessage: Story = {
  name: 'Exit-intent message',
  ...storyDescription(
    'Exit-intent message with usePageLeave: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ExitIntentExample />,
  parameters: { docs: { source: { code: exitIntentSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const win = await waitForIframeWindow(canvas, 'page-leave-exit-iframe')
    dispatchEnterThenLeave(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-exit-dialog')).toBeVisible()
    })
    await userEvent.click(canvas.getByTestId('page-leave-exit-dismiss'))
    await expect(canvas.queryByTestId('page-leave-exit-dialog')).toBeNull()
    dispatchEnter(win)
    await expectCodeDisclosure(canvas, exitIntentSnippet)
  },
}

export const PausingVisualEffect: Story = {
  name: 'Pausing a visual effect',
  ...storyDescription(
    'Pausing a visual effect with usePageLeave: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <PausingEffectExample />,
  parameters: { docs: { source: { code: pausingEffectSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const win = await waitForIframeWindow(canvas, 'page-leave-pause-iframe')
    await expect(canvas.getByTestId('page-leave-pause-panel')).toHaveAttribute(
      'data-paused',
      'false',
    )
    dispatchEnterThenLeave(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-pause-panel')).toHaveAttribute(
        'data-paused',
        'true',
      )
    })
    dispatchEnter(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-pause-panel')).toHaveAttribute(
        'data-paused',
        'false',
      )
    })
    await expectCodeDisclosure(canvas, pausingEffectSnippet)
  },
}

export const DraftReminder: Story = {
  name: 'Draft reminder',
  ...storyDescription(
    'Draft reminder with usePageLeave: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <DraftReminderExample />,
  parameters: { docs: { source: { code: draftReminderSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const win = await waitForIframeWindow(canvas, 'page-leave-draft-iframe')
    dispatchEnterThenLeave(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-draft-reminder')).toBeVisible()
    })
    dispatchEnter(win)
    await waitFor(() => {
      expect(canvas.queryByTestId('page-leave-draft-reminder')).toBeNull()
    })
    await expectCodeDisclosure(canvas, draftReminderSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  ...storyDescription(
    'Toggle enabled for usePageLeave and confirm listeners or work stop without leaking when off, then resume cleanly when on. Use the canvas controls and status readouts to verify the lifecycle. Show code should match the gated subscription pattern.',
  ),
  render: () => <EnabledStateExample />,
  parameters: { docs: { source: { code: enabledStateSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const win = await waitForIframeWindow(canvas, 'page-leave-enabled-iframe')
    dispatchEnterThenLeave(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-enabled-status')).toHaveTextContent(
        'Mouse left page',
      )
    })
    await userEvent.click(canvas.getByTestId('page-leave-enabled-toggle'))
    await expect(
      canvas.getByTestId('page-leave-enabled-flag'),
    ).toHaveTextContent('enabled: false')
    dispatchEnter(win)
    await expect(
      canvas.getByTestId('page-leave-enabled-status'),
    ).toHaveTextContent('Mouse left page')
    await userEvent.click(canvas.getByTestId('page-leave-enabled-toggle'))
    await expect(
      canvas.getByTestId('page-leave-enabled-status'),
    ).toHaveTextContent('Mouse left page')
    dispatchEnter(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-enabled-status')).toHaveTextContent(
        'Inside page',
      )
    })
    await expectCodeDisclosure(canvas, enabledStateSnippet)
  },
}

export const InitialValue: Story = {
  name: 'Initial value',
  ...storyDescription(
    'Initial value with usePageLeave: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <InitialValueExample />,
  parameters: { docs: { source: { code: initialValueSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeWindow(canvas, 'page-leave-initial-iframe')
    await expect(
      canvas.getByTestId('page-leave-initial-status'),
    ).toHaveTextContent('Mouse left page')
    await expect(
      canvas.getByTestId('page-leave-initial-snapshot'),
    ).toHaveTextContent('"hasLeft": true')
    const win = await waitForIframeWindow(canvas, 'page-leave-initial-iframe')
    dispatchEnter(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-initial-status')).toHaveTextContent(
        'Inside page',
      )
    })
    await expectCodeDisclosure(canvas, initialValueSnippet)
  },
}

export const CustomIframeWindow: Story = {
  name: 'Custom iframe window',
  ...storyDescription(
    'Custom iframe window: bind usePageLeave to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <CustomIframeExample />,
  parameters: { docs: { source: { code: customIframeSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const win = await waitForIframeWindow(canvas, 'page-leave-custom-iframe')
    dispatchEnterThenLeave(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-custom-status')).toHaveTextContent(
        'Mouse left page',
      )
    })
    window.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    await expect(
      canvas.getByTestId('page-leave-custom-status'),
    ).toHaveTextContent('Mouse left page')
    dispatchEnter(win)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-custom-status')).toHaveTextContent(
        'Inside page',
      )
    })
    await expectCodeDisclosure(canvas, customIframeSnippet)
  },
}

export const DynamicWindow: Story = {
  name: 'Dynamic window',
  ...storyDescription(
    'Dynamic window: bind usePageLeave to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <DynamicWindowExample />,
  parameters: { docs: { source: { code: dynamicWindowSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const winA = await waitForIframeWindow(canvas, 'page-leave-dynamic-a')
    const winB = await waitForIframeWindow(canvas, 'page-leave-dynamic-b')
    dispatchEnterThenLeave(winA)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-dynamic-status')).toHaveTextContent(
        'Mouse left page',
      )
    })
    await userEvent.click(canvas.getByTestId('page-leave-observe-b'))
    await expect(
      canvas.getByTestId('page-leave-dynamic-target'),
    ).toHaveTextContent('Observing: b')
    await expect(
      canvas.getByTestId('page-leave-dynamic-status'),
    ).toHaveTextContent('Mouse left page')
    dispatchEnter(winA)
    await expect(
      canvas.getByTestId('page-leave-dynamic-status'),
    ).toHaveTextContent('Mouse left page')
    dispatchEnter(winB)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-dynamic-status')).toHaveTextContent(
        'Inside page',
      )
    })
    await expectCodeDisclosure(canvas, dynamicWindowSnippet)
  },
}

export const MultipleInstances: Story = {
  name: 'Multiple instances',
  ...storyDescription(
    'Multiple instances with usePageLeave: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <MultipleInstancesExample />,
  parameters: { docs: { source: { code: multipleInstancesSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const winA = await waitForIframeWindow(canvas, 'page-leave-multi-a')
    const winB = await waitForIframeWindow(canvas, 'page-leave-multi-b')
    dispatchEnterThenLeave(winA)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-multi-a-status')).toHaveTextContent(
        'Mouse left page',
      )
      expect(canvas.getByTestId('page-leave-multi-b-status')).toHaveTextContent(
        'Idle — pointer not in page',
      )
    })
    dispatchEnterThenLeave(winB)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-multi-b-status')).toHaveTextContent(
        'Mouse left page',
      )
    })
    dispatchEnter(winA)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-multi-a-status')).toHaveTextContent(
        'Inside page',
      )
      expect(canvas.getByTestId('page-leave-multi-b-status')).toHaveTextContent(
        'Mouse left page',
      )
    })
    dispatchEnter(winB)
    await waitFor(() => {
      expect(canvas.getByTestId('page-leave-multi-b-status')).toHaveTextContent(
        'Inside page',
      )
    })
    await expectCodeDisclosure(canvas, multipleInstancesSnippet)
  },
}

export const TabVisibilityIsDifferent: Story = {
  name: 'Tab visibility is different',
  ...storyDescription(
    'Tab visibility is different with usePageLeave: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <TabVisibilityExample />,
  parameters: { docs: { source: { code: tabVisibilitySnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeWindow(canvas, 'page-leave-visibility-iframe')
    await userEvent.click(canvas.getByTestId('page-leave-sim-blur'))
    await expect(
      canvas.getByTestId('page-leave-visibility-status'),
    ).toHaveTextContent('Idle — pointer not in page')
    await userEvent.click(canvas.getByTestId('page-leave-sim-visible'))
    await expect(
      canvas.getByTestId('page-leave-visibility-status'),
    ).toHaveTextContent('Idle — pointer not in page')
    await expectCodeDisclosure(canvas, tabVisibilitySnippet)
  },
}

export const TouchDeviceLimitation: Story = {
  name: 'Touch-device limitation',
  ...storyDescription(
    'Touch-device limitation with usePageLeave: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <TouchLimitationExample />,
  parameters: { docs: { source: { code: touchLimitationSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeWindow(canvas, 'page-leave-touch-iframe')
    await userEvent.click(canvas.getByTestId('page-leave-sim-touch'))
    await expect(
      canvas.getByTestId('page-leave-touch-status'),
    ).toHaveTextContent('Idle — pointer not in page')
    await expectCodeDisclosure(canvas, touchLimitationSnippet)
  },
}

export const UnsupportedOrNullWindow: Story = {
  name: 'Unsupported or null window',
  ...storyDescription(
    'Unsupported or null window — trigger the failure path for usePageLeave and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
  render: () => <NullWindowExample />,
  parameters: { docs: { source: { code: nullWindowSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByTestId('page-leave-null-status'),
    ).toHaveTextContent('Idle — pointer not in page')
    await expect(
      canvas.getByTestId('page-leave-null-snapshot'),
    ).toHaveTextContent('"hasLeft": false')
    window.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, relatedTarget: null }),
    )
    await expect(
      canvas.getByTestId('page-leave-null-status'),
    ).toHaveTextContent('Idle — pointer not in page')
    await expectCodeDisclosure(canvas, nullWindowSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'usePageLeave Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  args: {
    enabled: true,
    initialValue: false,
  },
  parameters: { docs: { source: { code: playgroundSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('page-leave-playground-mount'))
    const win = await waitForIframeWindow(
      canvas,
      'page-leave-playground-iframe',
    )
    dispatchEnterThenLeave(win)
    await waitFor(() => {
      expect(
        canvas.getByTestId('page-leave-playground-status'),
      ).toHaveTextContent('Mouse left page')
    })
    dispatchEnter(win)
    await waitFor(() => {
      expect(
        canvas.getByTestId('page-leave-playground-status'),
      ).toHaveTextContent('Inside page')
    })
    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
