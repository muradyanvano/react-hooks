import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
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
  tags: ['autodocs'],
  ...createHookStoryMeta('useUserMedia', PlaygroundExample, {
    argTypes: {
      enabled: {
        control: 'boolean',
        description:
          'Declarative activation signal (advanced; prefer start()).',
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
  await expect(await waitForDisclosedCode(canvas)).toBeVisible()

  const writeText = fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  await userEvent.click(canvas.getByTestId('copy-code'))
  await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
  await userEvent.click(toggle)
}

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Camera/microphone preview ownership with mocked getUserMedia. Start the mock stream, inspect the video element, then stop tracks. Only the Live camera story calls the real API, and its play test never clicks Start.',
  ),
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

export const LiveCamera: Story = {
  name: 'Live camera',
  ...storyDescription(
    'useUserMedia Live camera: automated tests inspect idle UI only and never trigger real camera, microphone, screen-share, EyeDropper, fullscreen, or network prompts.',
  ),
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

export const VideoPreview: Story = {
  name: 'Video preview',
  ...storyDescription(
    'Video preview with useUserMedia: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Microphone only with useUserMedia: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Camera and microphone with useUserMedia: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Device selection with useUserMedia: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Facing mode with useUserMedia: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Resolution constraints with useUserMedia: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Auto-switch with useUserMedia: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Manual restart with useUserMedia: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Toggle enabled for useUserMedia and confirm listeners or work stop without leaking when off, then resume cleanly when on. Use the canvas controls and status readouts to verify the lifecycle. Show code should match the gated subscription pattern.',
  ),
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
  ...storyDescription(
    'Permission denied — trigger the failure path for useUserMedia and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
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
  ...storyDescription(
    'No device found with useUserMedia: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Device busy with useUserMedia: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Constraint error — trigger the failure path for useUserMedia and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
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
  ...storyDescription(
    'Overlapping requests: reproduce the race or permission edge for useUserMedia with the on-canvas controls. Confirm newer requests win or aborts clear state as documented, then inspect Show code for ownership rules.',
  ),
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
  ...storyDescription(
    'Track ended with useUserMedia: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Unsupported browser — trigger the failure path for useUserMedia and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
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
  ...storyDescription(
    'useUserMedia Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
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
