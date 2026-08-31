import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  BrowserEndedSharingExample,
  EnabledStateExample,
  ErrorRecoveryExample,
  LiveScreenShareExample,
  OverviewExample,
  PermissionCancelledExample,
  PlaygroundExample,
  StreamReplacementExample,
  SystemAudioExample,
  UnsupportedBrowserExample,
  VideoPreviewExample,
} from './components/UseDisplayMediaExamples'
import {
  browserEndedSnippet,
  enabledStateSnippet,
  errorRecoverySnippet,
  liveScreenShareSnippet,
  overviewSnippet,
  permissionCancelledSnippet,
  playgroundSnippet,
  streamReplacementSnippet,
  systemAudioSnippet,
  unsupportedSnippet,
  videoPreviewSnippet,
} from './components/useDisplayMedia.snippets'

const meta = {
  title: 'Hooks/useDisplayMedia',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Captures screen, window, or tab video (and optionally audio) through \`navigator.mediaDevices.getDisplayMedia\`.

\`\`\`ts
import { useDisplayMedia } from '@muradyanvano/react-hooks'

useDisplayMedia(options?: UseDisplayMediaOptions): UseDisplayMediaReturn
\`\`\`

**Defaults:** \`{ enabled: false, video: true, audio: false }\`

**Live vs. mocked:** The **Live screen sharing** story uses the real API and opens your browser's native share picker — it is the only story where you should click Start. Every other story below uses a deterministic Storybook-only mock so behavior is reproducible in CI and never opens a real chooser.

Prefer imperative \`start()\` from a user gesture. \`enabled\` is an advanced declarative activation signal that real browsers may block without a preceding gesture.

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
  },
  argTypes: {
    enabled: {
      control: 'boolean',
      description: 'Declarative activation signal (advanced; prefer start()).',
      table: { defaultValue: { summary: 'false' } },
    },
    video: {
      control: 'boolean',
      description: 'Requested video constraint.',
      table: { defaultValue: { summary: 'true' } },
    },
    audio: {
      control: 'boolean',
      description: 'Requested audio constraint.',
      table: { defaultValue: { summary: 'false' } },
    },
    resultMode: {
      control: 'select',
      options: ['success', 'cancelled', 'denied', 'unavailable'],
      description: 'Simulated outcome of the mocked getDisplayMedia call.',
      table: { defaultValue: { summary: 'success' } },
    },
  },
  args: {
    enabled: false,
    video: true,
    audio: false,
    resultMode: 'success',
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

export const LiveScreenSharing: Story = {
  name: 'Live screen sharing',
  render: () => <LiveScreenShareExample />,
  parameters: { docs: { source: { code: liveScreenShareSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const startButton = canvas.getByTestId('live-start')

    // Never click start here — it would open a real native share picker.
    await expect(startButton).toBeVisible()
    await expect(startButton).toHaveTextContent('Start sharing my screen')
    await expect(canvas.getByTestId('live-stop')).toBeDisabled()

    const supported =
      canvas.getByTestId('live-supported').textContent === 'true'
    if (supported) {
      await expect(startButton).toBeEnabled()
      await expect(canvas.getByTestId('live-placeholder')).toHaveTextContent(
        'No screen shared yet.',
      )
    } else {
      await expect(startButton).toBeDisabled()
      await expect(canvas.getByTestId('live-unsupported-help')).toBeVisible()
    }

    await expectCodeDisclosure(canvas, liveScreenShareSnippet)
  },
}

export const Overview: Story = {
  name: 'Overview',
  render: () => <OverviewExample />,
  parameters: { docs: { source: { code: overviewSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('overview-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('overview-status')).toHaveTextContent('Sharing')
    })
    await expect(canvas.getByTestId('overview-video-tracks')).toHaveTextContent(
      '1',
    )
    await expect(canvas.getByTestId('overview-audio-tracks')).toHaveTextContent(
      '0',
    )
    await userEvent.click(canvas.getByTestId('overview-stop'))
    await waitFor(() => {
      expect(canvas.getByTestId('overview-status')).toHaveTextContent('Idle')
    })
    await expectCodeDisclosure(canvas, overviewSnippet)
  },
}

export const VideoPreview: Story = {
  name: 'Video preview',
  render: () => <VideoPreviewExample />,
  parameters: { docs: { source: { code: videoPreviewSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('preview-placeholder')).toBeVisible()

    await userEvent.click(canvas.getByTestId('preview-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('preview-frame')).toHaveAttribute(
        'data-active',
        'true',
      )
    })
    await expect(
      canvas.queryByTestId('preview-placeholder'),
    ).not.toBeInTheDocument()

    await userEvent.click(canvas.getByTestId('preview-stop'))
    await waitFor(() => {
      expect(canvas.getByTestId('preview-placeholder')).toBeVisible()
    })
  },
}

export const SystemAudio: Story = {
  name: 'System audio',
  render: () => <SystemAudioExample />,
  parameters: { docs: { source: { code: systemAudioSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('audio-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('audio-audio-tracks')).toHaveTextContent('1')
    })
    await expect(canvas.getByTestId('audio-sharing')).toHaveTextContent('true')
  },
}

export const BrowserEndedSharing: Story = {
  name: 'Browser-ended sharing',
  render: () => <BrowserEndedSharingExample />,
  parameters: { docs: { source: { code: browserEndedSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('ended-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('ended-status')).toHaveTextContent('Sharing')
    })

    await userEvent.click(canvas.getByTestId('ended-simulate'))
    await waitFor(() => {
      expect(canvas.getByTestId('ended-status')).toHaveTextContent(
        'Idle. No stop() call',
      )
    })
  },
}

export const PermissionCancelled: Story = {
  name: 'Permission cancelled',
  render: () => <PermissionCancelledExample />,
  parameters: { docs: { source: { code: permissionCancelledSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('cancel-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('cancel-error')).toHaveTextContent(
        'cancelled or blocked',
      )
    })
    await expect(canvas.getByTestId('cancel-status')).toHaveTextContent('Idle')

    await userEvent.click(canvas.getByTestId('cancel-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('cancel-error')).toHaveTextContent(
        'cancelled or blocked',
      )
    })
  },
}

export const ErrorRecovery: Story = {
  name: 'Error recovery',
  render: () => <ErrorRecoveryExample />,
  parameters: { docs: { source: { code: errorRecoverySnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('recovery-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('recovery-error')).toHaveTextContent(
        'cancelled or blocked',
      )
    })

    await userEvent.click(canvas.getByTestId('recovery-fix'))
    await userEvent.click(canvas.getByTestId('recovery-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('recovery-status')).toHaveTextContent('Sharing')
    })
    await expect(canvas.getByTestId('recovery-error')).toHaveTextContent('')
  },
}

export const StreamReplacement: Story = {
  name: 'Stream replacement',
  render: () => <StreamReplacementExample />,
  parameters: { docs: { source: { code: streamReplacementSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('replace-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('replace-sharing')).toHaveTextContent('true')
    })
    const firstId = canvas.getByTestId('replace-stream-id').textContent ?? ''

    await userEvent.click(canvas.getByTestId('replace-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('replace-stream-id')).not.toHaveTextContent(
        firstId,
      )
    })
    await waitFor(() => {
      expect(canvas.getByTestId('replace-stopped-count')).not.toHaveTextContent(
        '0',
      )
    })

    await userEvent.click(canvas.getByTestId('replace-dispatch-old-ended'))
    await expect(canvas.getByTestId('replace-sharing')).toHaveTextContent(
      'true',
    )
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample />,
  parameters: { docs: { source: { code: enabledStateSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('declarative-status')).toHaveTextContent(
      'Idle',
    )

    await userEvent.click(canvas.getByTestId('declarative-enabled-checkbox'))
    await waitFor(() => {
      expect(canvas.getByTestId('declarative-status')).toHaveTextContent(
        'Sharing',
      )
    })
    await expect(canvas.getByTestId('declarative-warning')).toBeVisible()

    await userEvent.click(canvas.getByTestId('declarative-enabled-checkbox'))
    await waitFor(() => {
      expect(canvas.getByTestId('declarative-status')).toHaveTextContent('Idle')
    })
  },
}

export const UnsupportedBrowser: Story = {
  name: 'Unsupported browser',
  render: () => <UnsupportedBrowserExample />,
  parameters: { docs: { source: { code: unsupportedSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('unsupported-supported')).toHaveTextContent(
      'false',
    )
    await expect(canvas.getByTestId('unsupported-start')).toBeDisabled()
    await expect(canvas.getByTestId('unsupported-guidance')).toBeVisible()
  },
}

export const Playground: Story = {
  name: 'Playground',
  render: (args) => <PlaygroundExample {...args} />,
  parameters: { docs: { source: { code: playgroundSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('playground-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('playground-video-tracks')).toHaveTextContent(
        '1',
      )
    })

    await userEvent.click(canvas.getByTestId('playground-simulate-end'))
    await waitFor(() => {
      expect(canvas.getByTestId('playground-video-tracks')).toHaveTextContent(
        '0',
      )
    })
  },
}
