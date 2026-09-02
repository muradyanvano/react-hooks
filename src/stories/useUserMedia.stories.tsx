import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  AutoSwitchExample,
  CameraAndMicrophoneExample,
  ConstraintErrorExample,
  DeviceBusyExample,
  DeviceSelectionExample,
  EnabledStateExample,
  FacingModeExample,
  LiveCameraExample,
  ManualRestartExample,
  MicrophoneOnlyExample,
  NoDeviceExample,
  OverlappingRequestsExample,
  OverviewExample,
  PermissionDeniedExample,
  PlaygroundExample,
  ResolutionConstraintsExample,
  TrackEndedExample,
  UnsupportedBrowserExample,
  VideoPreviewExample,
} from './components/UseUserMediaExamples'
import {
  autoSwitchSnippet,
  cameraAndMicrophoneSnippet,
  constraintErrorSnippet,
  deviceBusySnippet,
  deviceSelectionSnippet,
  enabledStateSnippet,
  facingModeSnippet,
  liveCameraSnippet,
  manualRestartSnippet,
  microphoneOnlySnippet,
  noDeviceSnippet,
  overlappingRequestsSnippet,
  overviewSnippet,
  permissionDeniedSnippet,
  playgroundSnippet,
  resolutionConstraintsSnippet,
  trackEndedSnippet,
  unsupportedSnippet,
  videoPreviewSnippet,
} from './components/useUserMedia.snippets'

const meta = {
  title: 'Hooks/useUserMedia',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Captures camera and/or microphone streams through \`navigator.mediaDevices.getUserMedia\`.

\`\`\`ts
import { useUserMedia } from '@muradyanvano/react-hooks'

useUserMedia(options?: UseUserMediaOptions): UseUserMediaReturn
\`\`\`

**Defaults:** \`{ enabled: false, autoSwitch: true, constraints: { video: true, audio: false } }\`

**Live vs. mocked:** The **Live camera** story uses the real API and opens your browser's native permission prompt — it is the only story where you should click Start. Every other story below uses a deterministic Storybook-only mock so behavior is reproducible in CI and never opens a real prompt.

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
    autoSwitch: {
      control: 'boolean',
      description:
        'When true, constraint changes restart capture automatically.',
      table: { defaultValue: { summary: 'true' } },
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
      options: [
        'success',
        'denied',
        'notfound',
        'notreadable',
        'overconstrained',
        'unsupported',
      ],
      description: 'Simulated outcome of the mocked getUserMedia call.',
      table: { defaultValue: { summary: 'success' } },
    },
  },
  args: {
    enabled: false,
    autoSwitch: true,
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

export const LiveCamera: Story = {
  name: 'Live camera',
  render: () => <LiveCameraExample />,
  parameters: { docs: { source: { code: liveCameraSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const startButton = canvas.getByTestId('live-start')

    // Never click start here — it would open a real native permission prompt.
    await expect(startButton).toBeVisible()
    await expect(startButton).toHaveTextContent('Start camera')
    await expect(canvas.getByTestId('live-stop')).toBeDisabled()

    const supported =
      canvas.getByTestId('live-supported').textContent === 'true'
    if (supported) {
      await expect(startButton).toBeEnabled()
      await expect(canvas.getByTestId('live-placeholder')).toHaveTextContent(
        'No camera active yet.',
      )
    } else {
      await expect(startButton).toBeDisabled()
      await expect(canvas.getByTestId('live-unsupported-help')).toBeVisible()
    }

    await expectCodeDisclosure(canvas, liveCameraSnippet)
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
      expect(canvas.getByTestId('overview-status')).toHaveTextContent('Active')
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

export const MicrophoneOnly: Story = {
  name: 'Microphone only',
  render: () => <MicrophoneOnlyExample />,
  parameters: { docs: { source: { code: microphoneOnlySnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('mic-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('mic-audio-tracks')).toHaveTextContent('1')
    })
    await expect(canvas.getByTestId('mic-video-tracks')).toHaveTextContent('0')
    await expect(canvas.getByTestId('mic-active')).toHaveTextContent('true')
  },
}

export const CameraAndMicrophone: Story = {
  name: 'Camera and microphone',
  render: () => <CameraAndMicrophoneExample />,
  parameters: { docs: { source: { code: cameraAndMicrophoneSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('both-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('both-video-tracks')).toHaveTextContent('1')
    })
    await expect(canvas.getByTestId('both-audio-tracks')).toHaveTextContent('1')
    await expect(canvas.getByTestId('both-active')).toHaveTextContent('true')
  },
}

export const DeviceSelection: Story = {
  name: 'Device selection',
  render: () => <DeviceSelectionExample />,
  parameters: { docs: { source: { code: deviceSelectionSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('device-cameras')).not.toHaveTextContent('0')
    })

    await userEvent.selectOptions(
      canvas.getByTestId('device-camera-select'),
      'cam-usb',
    )
    await userEvent.click(canvas.getByTestId('device-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('device-active')).toHaveTextContent('true')
    })
    await userEvent.click(canvas.getByTestId('device-stop'))
    await waitFor(() => {
      expect(canvas.getByTestId('device-active')).toHaveTextContent('false')
    })
  },
}

export const FacingMode: Story = {
  name: 'Facing mode',
  render: () => <FacingModeExample />,
  parameters: { docs: { source: { code: facingModeSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('facing-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('facing-active')).toHaveTextContent('true')
    })

    await userEvent.click(canvas.getByTestId('facing-environment'))
    await waitFor(() => {
      expect(canvas.getByTestId('facing-mode')).toHaveTextContent('environment')
    })
  },
}

export const ResolutionConstraints: Story = {
  name: 'Resolution constraints',
  render: () => <ResolutionConstraintsExample />,
  parameters: { docs: { source: { code: resolutionConstraintsSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('resolution-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('resolution-actual')).not.toHaveTextContent('—')
    })

    await userEvent.clear(canvas.getByTestId('resolution-width'))
    await userEvent.type(canvas.getByTestId('resolution-width'), '1280')
    await waitFor(() => {
      expect(canvas.getByTestId('resolution-ideal')).toHaveTextContent('1280')
    })
  },
}

export const AutoSwitch: Story = {
  name: 'Auto-switch',
  render: () => <AutoSwitchExample />,
  parameters: { docs: { source: { code: autoSwitchSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('autoswitch-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('autoswitch-calls')).toHaveTextContent('1')
    })

    await userEvent.click(canvas.getByTestId('autoswitch-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('autoswitch-calls')).toHaveTextContent('2')
    })
    await expect(canvas.getByTestId('autoswitch-facing')).toHaveTextContent(
      'environment',
    )
  },
}

export const ManualRestart: Story = {
  name: 'Manual restart',
  render: () => <ManualRestartExample />,
  parameters: { docs: { source: { code: manualRestartSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('manual-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('manual-calls')).toHaveTextContent('1')
    })

    await userEvent.click(canvas.getByTestId('manual-toggle-facing'))
    await expect(canvas.getByTestId('manual-calls')).toHaveTextContent('1')

    await userEvent.click(canvas.getByTestId('manual-restart'))
    await waitFor(() => {
      expect(canvas.getByTestId('manual-calls')).toHaveTextContent('2')
    })
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
        'Active',
      )
    })
    await expect(canvas.getByTestId('declarative-warning')).toBeVisible()

    await userEvent.click(canvas.getByTestId('declarative-enabled-checkbox'))
    await waitFor(() => {
      expect(canvas.getByTestId('declarative-status')).toHaveTextContent('Idle')
    })
  },
}

export const PermissionDenied: Story = {
  name: 'Permission denied',
  render: () => <PermissionDeniedExample />,
  parameters: { docs: { source: { code: permissionDeniedSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('denied-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('denied-error')).toHaveTextContent(
        'denied or blocked',
      )
    })
    await expect(canvas.getByTestId('denied-status')).toHaveTextContent('Idle')

    await userEvent.click(canvas.getByTestId('denied-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('denied-error')).toHaveTextContent(
        'denied or blocked',
      )
    })
  },
}

export const NoDevice: Story = {
  name: 'No device found',
  render: () => <NoDeviceExample />,
  parameters: { docs: { source: { code: noDeviceSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('notfound-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('notfound-error')).toHaveTextContent(
        'No camera or microphone',
      )
    })
    await expect(canvas.getByTestId('notfound-status')).toHaveTextContent(
      'Idle',
    )
  },
}

export const DeviceBusy: Story = {
  name: 'Device busy',
  render: () => <DeviceBusyExample />,
  parameters: { docs: { source: { code: deviceBusySnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('busy-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('busy-error')).toHaveTextContent(
        'already in use',
      )
    })
    await expect(canvas.getByTestId('busy-status')).toHaveTextContent('Idle')
  },
}

export const ConstraintError: Story = {
  name: 'Constraint error',
  render: () => <ConstraintErrorExample />,
  parameters: { docs: { source: { code: constraintErrorSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('constraint-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('constraint-error')).toHaveTextContent(
        'cannot be satisfied',
      )
    })
    await expect(canvas.getByTestId('constraint-status')).toHaveTextContent(
      'Idle',
    )
  },
}

export const OverlappingRequests: Story = {
  name: 'Overlapping requests',
  render: () => <OverlappingRequestsExample />,
  parameters: { docs: { source: { code: overlappingRequestsSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('overlap-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('overlap-pending')).toHaveTextContent('true')
    })

    await userEvent.click(canvas.getByTestId('overlap-start-again'))
    await userEvent.click(canvas.getByTestId('overlap-resolve'))
    await waitFor(() => {
      expect(canvas.getByTestId('overlap-active')).toHaveTextContent('true')
    })
    await expect(canvas.getByTestId('overlap-pending')).toHaveTextContent(
      'false',
    )
  },
}

export const TrackEnded: Story = {
  name: 'Track ended',
  render: () => <TrackEndedExample />,
  parameters: { docs: { source: { code: trackEndedSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('ended-start'))
    await waitFor(() => {
      expect(canvas.getByTestId('ended-status')).toHaveTextContent('Active')
    })

    await userEvent.click(canvas.getByTestId('ended-simulate'))
    await waitFor(() => {
      expect(canvas.getByTestId('ended-status')).toHaveTextContent(
        'Idle. No stop() call',
      )
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
