import type { Meta, StoryObj } from '@storybook/react-vite'
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

const meta = {
  title: 'Hooks/usePageLeave',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Tracks whether the mouse has left the observed browsing context using window \`mouseout\` (\`relatedTarget == null\` after a prior \`mouseover\`) and \`mouseover\` re-entry.

\`\`\`ts
import { usePageLeave } from '@muradyanvano/react-hooks'

const hasLeft = usePageLeave({
  enabled?: boolean
  window?: Window | null
  initialValue?: boolean
})
\`\`\`

**Defaults:** \`{ enabled: true, initialValue: false }\` with omitted window resolved after mount.

**Mouse only:** Touch, blur, visibility, pagehide, and unload are not page-leave signals. Prefer a dedicated visibility hook for tab state, and \`useElementHover\` for element-level hover.

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
    initialValue: {
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
  const highlighted = await canvas.findByTestId('highlighted-code')
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

export const PageLeaveDetector: Story = {
  name: 'Page leave detector',
  render: () => <PageLeaveDetectorExample />,
  parameters: { docs: { source: { code: pageLeaveDetectorSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const win = await waitForIframeWindow(canvas, 'page-leave-primary-iframe')

    await expect(canvas.getByTestId('page-leave-status')).toHaveTextContent(
      'Inside page',
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
  render: () => <InternalMovementExample />,
  parameters: { docs: { source: { code: internalMovementSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const win = await waitForIframeWindow(canvas, 'page-leave-internal-iframe')
    dispatchInternal(win)
    await expect(
      canvas.getByTestId('page-leave-internal-status'),
    ).toHaveTextContent('Inside page')
    await userEvent.click(canvas.getByTestId('page-leave-internal-move'))
    await expect(
      canvas.getByTestId('page-leave-internal-status'),
    ).toHaveTextContent('Inside page')
    dispatchEnter(win)
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
        'Inside page',
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
  render: () => <TabVisibilityExample />,
  parameters: { docs: { source: { code: tabVisibilitySnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeWindow(canvas, 'page-leave-visibility-iframe')
    await userEvent.click(canvas.getByTestId('page-leave-sim-blur'))
    await expect(
      canvas.getByTestId('page-leave-visibility-status'),
    ).toHaveTextContent('Inside page')
    await userEvent.click(canvas.getByTestId('page-leave-sim-visible'))
    await expect(
      canvas.getByTestId('page-leave-visibility-status'),
    ).toHaveTextContent('Inside page')
    await expectCodeDisclosure(canvas, tabVisibilitySnippet)
  },
}

export const TouchDeviceLimitation: Story = {
  name: 'Touch-device limitation',
  render: () => <TouchLimitationExample />,
  parameters: { docs: { source: { code: touchLimitationSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeWindow(canvas, 'page-leave-touch-iframe')
    await userEvent.click(canvas.getByTestId('page-leave-sim-touch'))
    await expect(
      canvas.getByTestId('page-leave-touch-status'),
    ).toHaveTextContent('Inside page')
    await expectCodeDisclosure(canvas, touchLimitationSnippet)
  },
}

export const UnsupportedOrNullWindow: Story = {
  name: 'Unsupported or null window',
  render: () => <NullWindowExample />,
  parameters: { docs: { source: { code: nullWindowSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByTestId('page-leave-null-status'),
    ).toHaveTextContent('Inside page')
    await expect(
      canvas.getByTestId('page-leave-null-snapshot'),
    ).toHaveTextContent('"hasLeft": false')
    window.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, relatedTarget: null }),
    )
    await expect(
      canvas.getByTestId('page-leave-null-status'),
    ).toHaveTextContent('Inside page')
    await expectCodeDisclosure(canvas, nullWindowSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
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
