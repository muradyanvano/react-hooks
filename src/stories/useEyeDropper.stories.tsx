import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  CancelControlExample,
  ContrastPreviewExample,
  DashboardExample,
  EnabledStateExample,
  ExternalAbortExample,
  GradientDesignerExample,
  InitialColorExample,
  LiveNativeExample,
  OperationFailureExample,
  OverlappingRequestsExample,
  PaletteBuilderExample,
  PermissionRequiredExample,
  PlaygroundExample,
  ThemeTokensExample,
  UnsupportedBrowserExample,
  UserCancellationExample,
} from './components/UseEyeDropperExamples'
import {
  installEyeDropperMock,
  type EyeDropperMockHandle,
  type EyeDropperMockMode,
} from './components/eyeDropperMock'
import {
  cancelControlSnippet,
  contrastPreviewSnippet,
  dashboardSnippet,
  enabledStateSnippet,
  externalAbortSnippet,
  gradientDesignerSnippet,
  initialColorSnippet,
  liveNativeSnippet,
  operationFailureSnippet,
  overlappingRequestsSnippet,
  paletteBuilderSnippet,
  permissionRequiredSnippet,
  playgroundSnippet,
  themeTokensSnippet,
  unsupportedSnippet,
  userCancellationSnippet,
} from './components/useEyeDropper.snippets'

const meta = {
  title: 'Hooks/useEyeDropper',
  tags: ['autodocs'],
  ...createHookStoryMeta('useEyeDropper', PlaygroundExample),
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
  await expect(highlighted.textContent?.trim().length ?? 0).toBeGreaterThan(0)

  const writeText = fn(async () => undefined)
  const originalClipboard = navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  try {
    await userEvent.click(canvas.getByTestId('copy-code'))
    await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
  } finally {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
  }

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
}

/** Install a temporary mock for play tests so they never open the real picker. */
async function withPlayMock(
  options: { mode?: EyeDropperMockMode; successColor?: string },
  run: (mock: EyeDropperMockHandle) => Promise<void>,
) {
  const mock = installEyeDropperMock(window, options)
  try {
    await run(mock)
  } finally {
    mock.uninstall()
  }
}

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Sample screen colors into sRGB hex with history owned by the example. Open the mocked picker, copy a swatch, and Reset. Support is limited; the Live native picker story must never auto-open in tests.',
  ),
  render: () => <DashboardExample />,
  parameters: { docs: { source: { code: dashboardSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(
      { mode: 'success', successColor: '#22c55e' },
      async () => {
        const canvas = within(canvasElement)

        await expect(canvas.getByTestId('dash-hex-display')).toHaveTextContent(
          '#3b82f6',
        )

        await userEvent.click(canvas.getByTestId('dash-open'))
        await waitFor(() =>
          expect(canvas.getByTestId('dash-hex-display')).toHaveTextContent(
            '#22c55e',
          ),
        )
        await expect(canvas.getByTestId('dash-swatch')).toBeVisible()
        await expect(canvas.getByTestId('dash-r')).toHaveTextContent('34')

        const writeText = fn(async () => undefined)
        const originalClipboard = navigator.clipboard
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText },
        })
        try {
          await userEvent.click(canvas.getByTestId('dash-copy'))
          await waitFor(() => expect(writeText).toHaveBeenCalledWith('#22c55e'))
        } finally {
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: originalClipboard,
          })
        }

        await userEvent.click(canvas.getByTestId('dash-reset'))
        await expect(canvas.getByTestId('dash-hex-display')).toHaveTextContent(
          '#3b82f6',
        )
        await expect(canvas.getByTestId('dash-picking')).toHaveTextContent(
          'false',
        )

        await expectCodeDisclosure(canvas, dashboardSnippet)
      },
    )
  },
}

export const LiveNativePicker: Story = {
  name: 'Live native picker',
  ...storyDescription(
    'useEyeDropper Live native picker: automated tests inspect idle UI only and never trigger real camera, microphone, screen-share, EyeDropper, fullscreen, or network prompts.',
  ),
  render: () => <LiveNativeExample />,
  parameters: { docs: { source: { code: liveNativeSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const openButton = canvas.getByTestId('live-open')

    // Never click Open Eye Dropper — it would invoke the real screen picker.
    await expect(openButton).toHaveTextContent('Open Eye Dropper')
    await expect(canvas.getByTestId('live-hex-display')).toBeVisible()
    await expect(canvas.getByTestId('live-swatch')).toBeVisible()

    const supported =
      canvas.getByTestId('live-supported').textContent === 'true'
    if (supported) {
      await expect(openButton).toBeEnabled()
      await expect(canvas.getByTestId('live-supported-help')).toBeVisible()
    } else {
      await expect(openButton).toBeDisabled()
      await expect(canvas.getByTestId('live-unsupported-help')).toBeVisible()
    }

    await userEvent.click(canvas.getByTestId('live-reset'))
    await expect(canvas.getByTestId('live-hex-display')).toHaveTextContent(
      '#0f172a',
    )

    await expectCodeDisclosure(canvas, liveNativeSnippet)
  },
}

export const InitialColor: Story = {
  name: 'Initial color',
  ...storyDescription(
    'Initial color with useEyeDropper: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <InitialColorExample />,
  parameters: { docs: { source: { code: initialColorSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock({ successColor: '#ef4444' }, async () => {
      const canvas = within(canvasElement)
      await expect(canvas.getByTestId('init-hex')).toHaveTextContent('#22c55e')
      await userEvent.click(canvas.getByTestId('init-open'))
      await waitFor(() =>
        expect(canvas.getByTestId('init-hex')).toHaveTextContent('#ef4444'),
      )
      await userEvent.click(canvas.getByTestId('init-reset'))
      await expect(canvas.getByTestId('init-hex')).toHaveTextContent('#22c55e')
      await expectCodeDisclosure(canvas, initialColorSnippet)
    })
  },
}

export const ColorPaletteBuilder: Story = {
  name: 'Color palette builder',
  ...storyDescription(
    'Color palette builder with useEyeDropper: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <PaletteBuilderExample />,
  parameters: { docs: { source: { code: paletteBuilderSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock({ successColor: '#f97316' }, async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('palette-open'))
      await waitFor(() =>
        expect(canvas.getByTestId('palette-list').textContent).toContain(
          '#f97316',
        ),
      )
      await expectCodeDisclosure(canvas, paletteBuilderSnippet)
    })
  },
}

export const CssThemeTokens: Story = {
  name: 'CSS theme tokens',
  ...storyDescription(
    'CSS theme tokens with useEyeDropper: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ThemeTokensExample />,
  parameters: { docs: { source: { code: themeTokensSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock({ successColor: '#2563eb' }, async () => {
      const canvas = within(canvasElement)
      await expect(canvas.getByTestId('theme-brand-text')).toHaveTextContent(
        '#2563eb',
      )
      await userEvent.click(canvas.getByTestId('theme-brand'))
      await waitFor(() =>
        expect(canvas.getByTestId('theme-brand-text').textContent).toContain(
          '#2563eb',
        ),
      )
      await expectCodeDisclosure(canvas, themeTokensSnippet)
    })
  },
}

export const GradientDesigner: Story = {
  name: 'Gradient designer',
  ...storyDescription(
    'Gradient designer with useEyeDropper: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <GradientDesignerExample />,
  parameters: { docs: { source: { code: gradientDesignerSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock({ successColor: '#a855f7' }, async () => {
      const canvas = within(canvasElement)
      await expect(canvas.getByTestId('grad-preview')).toBeVisible()
      await expect(canvas.getByTestId('grad-labels')).toHaveTextContent(
        '#0ea5e9 → #a855f7',
      )
      await userEvent.click(canvas.getByTestId('grad-end'))
      await waitFor(() =>
        expect(canvas.getByTestId('grad-labels').textContent).toContain(
          '#a855f7',
        ),
      )
      await expectCodeDisclosure(canvas, gradientDesignerSnippet)
    })
  },
}

export const ContrastPreview: Story = {
  name: 'Contrast preview',
  ...storyDescription(
    'Contrast preview with useEyeDropper: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ContrastPreviewExample />,
  parameters: { docs: { source: { code: contrastPreviewSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('contrast-ratio').textContent).toMatch(
      /\d+\.\d+:1/,
    )
    await expect(canvas.getByTestId('contrast-preview')).toBeVisible()
    await expectCodeDisclosure(canvas, contrastPreviewSnippet)
  },
}

export const UserCancellation: Story = {
  name: 'User cancellation',
  ...storyDescription(
    'User cancellation: schedule work, then exercise cancel/flush/pending timing for useEyeDropper. Watch status settle to a deterministic idle state before leaving; Show code should match the timing policy under test.',
  ),
  render: () => <UserCancellationExample />,
  parameters: { docs: { source: { code: userCancellationSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('cancel-user-open'))
    await waitFor(() =>
      expect(canvas.getByTestId('cancel-user-msg')).toBeVisible(),
    )
    await expectCodeDisclosure(canvas, userCancellationSnippet)
  },
}

export const PermissionRequired: Story = {
  name: 'Permission required',
  ...storyDescription(
    'Permission required: reproduce the race or permission edge for useEyeDropper with the on-canvas controls. Confirm newer requests win or aborts clear state as documented, then inspect Show code for ownership rules.',
  ),
  render: () => <PermissionRequiredExample />,
  parameters: { docs: { source: { code: permissionRequiredSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('perm-open'))
    await waitFor(() =>
      expect(canvas.getByTestId('perm-error')).toHaveTextContent(
        'NotAllowedError',
      ),
    )
    await expectCodeDisclosure(canvas, permissionRequiredSnippet)
  },
}

export const OperationFailureAndRecovery: Story = {
  name: 'Operation failure and recovery',
  ...storyDescription(
    'Operation failure and recovery — trigger the failure path for useEyeDropper and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
  render: () => <OperationFailureExample />,
  parameters: { docs: { source: { code: operationFailureSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('op-open'))
    await waitFor(() => expect(canvas.getByTestId('op-error')).toBeVisible())
    await userEvent.click(canvas.getByTestId('op-reset'))
    await expect(canvas.getByTestId('op-ok')).toBeVisible()
    await userEvent.click(canvas.getByTestId('op-recover'))
    await userEvent.click(canvas.getByTestId('op-open'))
    await waitFor(() =>
      expect(canvas.getByTestId('op-hex')).toHaveTextContent('#10b981'),
    )
    await expectCodeDisclosure(canvas, operationFailureSnippet)
  },
}

export const ExternalAbortSignal: Story = {
  name: 'External AbortSignal',
  ...storyDescription(
    'External AbortSignal: reproduce the race or permission edge for useEyeDropper with the on-canvas controls. Confirm newer requests win or aborts clear state as documented, then inspect Show code for ownership rules.',
  ),
  render: () => <ExternalAbortExample />,
  parameters: { docs: { source: { code: externalAbortSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('ext-open'))
    await waitFor(() =>
      expect(canvas.getByTestId('ext-picking')).toHaveTextContent('Picking'),
    )
    await userEvent.click(canvas.getByTestId('ext-abort'))
    await waitFor(() =>
      expect(canvas.getByTestId('ext-picking')).toHaveTextContent('Idle'),
    )
    await expectCodeDisclosure(canvas, externalAbortSnippet)
  },
}

export const CancelControl: Story = {
  name: 'Cancel control',
  ...storyDescription(
    'Cancel control: schedule work, then exercise cancel/flush/pending timing for useEyeDropper. Watch status settle to a deterministic idle state before leaving; Show code should match the timing policy under test.',
  ),
  render: () => <CancelControlExample />,
  parameters: { docs: { source: { code: cancelControlSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('ctl-open'))
    await waitFor(() =>
      expect(canvas.getByTestId('ctl-status')).toHaveTextContent('Picking'),
    )
    await userEvent.click(canvas.getByTestId('ctl-cancel'))
    await waitFor(() =>
      expect(canvas.getByTestId('ctl-status')).toHaveTextContent('#334155'),
    )
    await expectCodeDisclosure(canvas, cancelControlSnippet)
  },
}

export const OverlappingRequests: Story = {
  name: 'Overlapping requests',
  ...storyDescription(
    'Overlapping requests: reproduce the race or permission edge for useEyeDropper with the on-canvas controls. Confirm newer requests win or aborts clear state as documented, then inspect Show code for ownership rules.',
  ),
  render: () => <OverlappingRequestsExample />,
  parameters: { docs: { source: { code: overlappingRequestsSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('overlap-open'))
    await waitFor(() =>
      expect(canvas.getByTestId('overlap-status')).toHaveTextContent('Latest'),
    )
    await userEvent.click(canvas.getByTestId('overlap-resolve'))
    await waitFor(() =>
      expect(canvas.getByTestId('overlap-hex')).toHaveTextContent('#7c3aed'),
    )
    await expectCodeDisclosure(canvas, overlappingRequestsSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  ...storyDescription(
    'Toggle enabled for useEyeDropper and confirm listeners or work stop without leaking when off, then resume cleanly when on. Use the canvas controls and status readouts to verify the lifecycle. Show code should match the gated subscription pattern.',
  ),
  render: () => <EnabledStateExample />,
  parameters: { docs: { source: { code: enabledStateSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock({ successColor: '#06b6d4' }, async () => {
      const canvas = within(canvasElement)
      await expect(canvas.getByTestId('enabled-hex')).toHaveTextContent(
        '#0f766e',
      )
      await userEvent.click(canvas.getByTestId('enabled-toggle'))
      await expect(canvas.getByTestId('enabled-open')).toBeDisabled()
      await userEvent.click(canvas.getByTestId('enabled-toggle'))
      await userEvent.click(canvas.getByTestId('enabled-open'))
      await waitFor(() =>
        expect(canvas.getByTestId('enabled-hex')).toHaveTextContent('#06b6d4'),
      )
      await expectCodeDisclosure(canvas, enabledStateSnippet)
    })
  },
}

export const UnsupportedBrowser: Story = {
  name: 'Unsupported browser',
  ...storyDescription(
    'Unsupported browser — trigger the failure path for useEyeDropper and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
  render: () => <UnsupportedBrowserExample />,
  parameters: { docs: { source: { code: unsupportedSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('unsup-supported')).toHaveTextContent(
      'false',
    )
    await expect(canvas.getByTestId('unsup-open')).toBeDisabled()
    await expect(canvas.getByTestId('unsup-help')).toBeVisible()
    await expectCodeDisclosure(canvas, unsupportedSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'useEyeDropper Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  render: (args) => (
    <PlaygroundExample
      treatAbortAsError={Boolean(args.treatAbortAsError)}
      mode={(args.mode as 'success' | 'abort' | 'not-allowed') ?? 'success'}
    />
  ),
  args: {
    treatAbortAsError: false,
    mode: 'success',
  },
  argTypes: {
    treatAbortAsError: { control: 'boolean' },
    mode: {
      control: 'select',
      options: ['success', 'abort', 'not-allowed', 'operation', 'deferred'],
    },
  },
  parameters: { docs: { source: { code: playgroundSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('play-open'))
    await waitFor(() =>
      expect(canvas.getByTestId('play-hex')).toHaveTextContent('#64748b'),
    )
    await userEvent.click(canvas.getByTestId('play-reset'))
    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
