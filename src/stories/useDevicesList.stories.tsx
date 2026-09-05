import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  DeviceChangesExample,
  DeviceDashboardExample,
  EnabledStateExample,
  LiveHardwareExample,
  ManualRefreshExample,
  OverviewExample,
  PermissionDeniedExample,
  PermissionWorkflowExample,
  PlaygroundExample,
} from './components/UseDevicesListExamples'
import {
  dashboardSnippet,
  deviceChangesSnippet,
  enabledSnippet,
  liveHardwareSnippet,
  overviewSnippet,
  permissionDeniedSnippet,
  permissionWorkflowSnippet,
  playgroundSnippet,
  refreshSnippet,
} from './components/useDevicesList.snippets'

const meta = {
  title: 'Hooks/useDevicesList',
  tags: ['autodocs'],
  ...createHookStoryMeta('useDevicesList', PlaygroundExample),
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
    'Enumerate cameras, microphones, and speakers with permission-aware labels. Allow access in the mocked demo and confirm kinds populate without prompting real hardware. Live hardware stays on a separate manual story.',
  ),

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
  ...storyDescription(
    'Device dashboard example for useDevicesList. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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

export const DeviceChanges: Story = {
  name: 'Device changes',
  ...storyDescription(
    'Device changes example for useDevicesList. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Permission workflow example for useDevicesList. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Permission denied example for useDevicesList. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Enabled state example for useDevicesList. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Manual refresh example for useDevicesList. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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

export const LiveHardware: Story = {
  name: 'Live hardware',
  ...storyDescription(
    'Live useDevicesList surface (Live hardware): inspect idle UI only in automated tests — never click Allow (real camera/microphone). Manual Allow may enumerate real devices when the browser permits it.',
  ),

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

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'Playground for useDevicesList: experiment with Controls and edge interactions safely. Confirm Docs stay idle (no autoplay), then compare runtime feedback with the curated code panel.',
  ),

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
