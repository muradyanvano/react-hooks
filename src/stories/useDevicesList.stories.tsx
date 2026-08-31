import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  CamerasExample,
  DeviceChangesExample,
  DeviceDashboardExample,
  EnabledStateExample,
  LiveHardwareExample,
  ManualRefreshExample,
  MicrophonesExample,
  OverviewExample,
  PermissionDeniedExample,
  PermissionWorkflowExample,
  PlaygroundExample,
  SpeakersExample,
} from './components/UseDevicesListExamples'
import {
  camerasSnippet,
  dashboardSnippet,
  deviceChangesSnippet,
  enabledSnippet,
  liveHardwareSnippet,
  microphonesSnippet,
  overviewSnippet,
  permissionDeniedSnippet,
  permissionWorkflowSnippet,
  playgroundSnippet,
  refreshSnippet,
  speakersSnippet,
} from './components/useDevicesList.snippets'

const meta = {
  title: 'Hooks/useDevicesList',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Provides a reactive list of media devices via \`navigator.mediaDevices\`.

\`\`\`ts
import { useDevicesList } from '@muradyanvano/react-hooks'

useDevicesList(options?: UseDevicesListOptions): UseDevicesListReturn
\`\`\`

**Defaults:** \`{ enabled: true, requestPermissions: false, constraints: { audio: true, video: true } }\`

**Privacy:** Prefer explicit \`ensurePermissions()\` after a user gesture. Temporary tracks from permission checks are stopped immediately. Most Storybook examples use deterministic mocks. The **Live hardware** story uses real devices for local testing and never auto-prompts.

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
  },
  argTypes: {
    enabled: {
      control: 'boolean',
      description: 'When false, no enumeration or devicechange listener runs.',
      table: { defaultValue: { summary: 'true' } },
    },
  },
  args: {
    enabled: true,
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

export const Overview: Story = {
  name: 'Overview',
  render: () => <OverviewExample />,
  parameters: { docs: { source: { code: overviewSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('overview-total')).toHaveTextContent('7')
    })
    await expect(canvas.getByTestId('overview-cameras')).toHaveTextContent('3')
    await expect(canvas.getByTestId('overview-mics')).toHaveTextContent('2')
    await expect(canvas.getByTestId('overview-speakers')).toHaveTextContent('2')
    await expect(canvas.getByTestId('overview-permission')).toHaveTextContent(
      'Needed',
    )
    await userEvent.click(canvas.getByTestId('overview-allow'))
    await waitFor(() => {
      expect(canvas.getByTestId('overview-permission')).toHaveTextContent(
        'Granted',
      )
    })
    await userEvent.click(canvas.getByTestId('overview-refresh'))
    await waitFor(() => {
      expect(canvas.getByTestId('overview-loading')).toHaveTextContent('false')
    })
    await expectCodeDisclosure(canvas, overviewSnippet)
  },
}

export const DeviceDashboard: Story = {
  name: 'Device dashboard',
  render: () => <DeviceDashboardExample />,
  parameters: { docs: { source: { code: dashboardSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('dashboard-camera-select')).toBeVisible()
    })
    await userEvent.click(canvas.getByTestId('dashboard-allow'))
    await waitFor(() => {
      expect(canvas.getByTestId('dashboard-permission')).toHaveTextContent(
        'Granted',
      )
    })
  },
}

export const Cameras: Story = {
  name: 'Cameras',
  render: () => <CamerasExample />,
  parameters: { docs: { source: { code: camerasSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('camera-list').children.length).toBe(3)
    })
  },
}

export const Microphones: Story = {
  name: 'Microphones',
  render: () => <MicrophonesExample />,
  parameters: { docs: { source: { code: microphonesSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('mic-list').children.length).toBe(2)
    })
  },
}

export const Speakers: Story = {
  name: 'Speakers',
  render: () => <SpeakersExample />,
  parameters: { docs: { source: { code: speakersSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('speaker-list').children.length).toBe(2)
    })
  },
}

export const DeviceChanges: Story = {
  name: 'Device changes',
  render: () => <DeviceChangesExample />,
  parameters: { docs: { source: { code: deviceChangesSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('changes-total')).toHaveTextContent('7')
    })
    await userEvent.click(canvas.getByTestId('connect-camera'))
    await waitFor(() => {
      expect(canvas.getByTestId('changes-cameras')).toHaveTextContent('4')
    })
    await userEvent.click(canvas.getByTestId('remove-mic'))
    await waitFor(() => {
      expect(canvas.getByTestId('changes-mics')).toHaveTextContent('1')
    })
    await userEvent.click(canvas.getByTestId('connect-speaker'))
    await waitFor(() => {
      expect(canvas.getByTestId('changes-speakers')).toHaveTextContent('3')
    })
  },
}

export const PermissionWorkflow: Story = {
  name: 'Permission workflow',
  render: () => <PermissionWorkflowExample />,
  parameters: { docs: { source: { code: permissionWorkflowSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('allow-access')).toBeVisible()
    })
    await expect(canvas.getByTestId('permission-labels')).toHaveTextContent(
      'Label unavailable until permission',
    )
    await userEvent.click(canvas.getByTestId('allow-access'))
    await waitFor(() => {
      expect(canvas.getByTestId('privacy-confirmation')).toBeVisible()
    })
    await expect(canvas.getByTestId('tracks-stopped')).not.toHaveTextContent(
      '0',
    )
    await expect(canvas.getByTestId('permission-labels')).toHaveTextContent(
      'Integrated Camera',
    )
  },
}

export const PermissionDenied: Story = {
  name: 'Permission denied',
  render: () => <PermissionDeniedExample />,
  parameters: { docs: { source: { code: permissionDeniedSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('denied-devices')).toHaveTextContent('7')
    })
    await userEvent.click(canvas.getByTestId('retry-permission'))
    await waitFor(() => {
      expect(canvas.getByTestId('denied-error')).toHaveTextContent(
        'Permission denied',
      )
    })
    await expect(canvas.getByTestId('denied-devices')).toHaveTextContent('7')
    await expect(canvas.getByTestId('denied-permission')).toHaveTextContent(
      'Not granted',
    )
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample />,
  parameters: { docs: { source: { code: enabledSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-count')).toHaveTextContent('7')
    })
    await userEvent.click(canvas.getByTestId('devices-enabled-checkbox'))
    await expect(canvas.getByTestId('devices-enabled')).toHaveTextContent(
      'false',
    )
    await userEvent.click(canvas.getByTestId('enabled-connect'))
    await expect(canvas.getByTestId('enabled-count')).toHaveTextContent('7')
    await userEvent.click(canvas.getByTestId('devices-enabled-checkbox'))
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-count')).toHaveTextContent('8')
    })
  },
}

export const ManualRefresh: Story = {
  name: 'Manual refresh',
  render: () => <ManualRefreshExample />,
  parameters: { docs: { source: { code: refreshSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('refresh-count')).toHaveTextContent('7')
    })
    await userEvent.click(canvas.getByTestId('force-enum-error'))
    await userEvent.click(canvas.getByTestId('manual-refresh'))
    await waitFor(() => {
      expect(canvas.getByTestId('refresh-status')).toHaveTextContent(
        'Failed to enumerate media devices.',
      )
    })
    await expect(canvas.getByTestId('refresh-count')).toHaveTextContent('7')
    await userEvent.click(canvas.getByTestId('clear-enum-error'))
    await userEvent.click(canvas.getByTestId('manual-refresh'))
    await waitFor(() => {
      expect(canvas.getByTestId('refresh-status')).toHaveTextContent(
        '7 devices',
      )
    })
  },
}

export const Playground: Story = {
  name: 'Playground',
  render: (args) => <PlaygroundExample {...args} />,
  parameters: { docs: { source: { code: playgroundSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('playground-total')).toHaveTextContent('7')
    })
    await userEvent.click(canvas.getByTestId('playground-refresh'))
    await userEvent.click(canvas.getByTestId('playground-request'))
    await waitFor(() => {
      expect(canvas.getByTestId('playground-permission')).toHaveTextContent(
        'granted',
      )
    })
  },
}

export const LiveHardware: Story = {
  name: 'Live hardware',
  render: () => <LiveHardwareExample />,
  parameters: { docs: { source: { code: liveHardwareSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Do not click Allow — that would request real camera/microphone.
    await expect(canvas.getByTestId('live-allow')).toBeVisible()
    await expect(canvas.getByTestId('live-revoke')).toBeVisible()
    await expect(canvas.getByTestId('live-remount')).toBeVisible()
    await expect(canvas.getByTestId('live-reset-help')).toBeVisible()
    await expect(canvas.getByTestId('live-supported')).toBeVisible()
    await userEvent.click(canvas.getByTestId('live-revoke'))
    await waitFor(() => {
      expect(canvas.getByTestId('live-revoke-note')).toBeVisible()
    })
    await expectCodeDisclosure(canvas, liveHardwareSnippet)
  },
}
