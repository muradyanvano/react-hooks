import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  BasicUsageExample,
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
  basicUsageSnippet,
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
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Wraps the native EyeDropper API for imperative, user-gesture-driven color sampling.

\`\`\`ts
import { useEyeDropper } from '@muradyanvano/react-hooks'

useEyeDropper(options?: UseEyeDropperOptions): UseEyeDropperReturn
\`\`\`

**Defaults:** \`initialValue: ''\`, \`enabled: true\`, \`treatAbortAsError: false\`

Call \`open()\` directly from a click handler — never from an effect — so transient user activation is preserved. Browser support is limited and typically requires a secure context. Output is opaque six-digit sRGB (\`#rrggbb\`); there is no alpha channel, continuous tracking, polyfill, or element-only sampling.

**Live vs. mocked:** Interactive success demos (dashboard, basic, palette, theme, gradient, contrast, enabled) and the **Live native picker** story use the real browser API so Open Eye Dropper launches the system picker. Scenario stories (cancellation, permission, failures, abort, overlap, playground) use a Storybook-only mock so CI can drive outcomes without opening the real picker. Automated play tests for success demos also install that mock temporarily.

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
    a11y: {
      test: 'error',
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

export const EyeDropperDashboard: Story = {
  name: 'Eye Dropper dashboard',
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

export const BasicUsage: Story = {
  name: 'Basic usage',
  render: () => <BasicUsageExample />,
  parameters: { docs: { source: { code: basicUsageSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock({ successColor: '#0ea5e9' }, async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('ex-open'))
      await waitFor(() =>
        expect(canvas.getByTestId('ex-hex-display')).toHaveTextContent(
          '#0ea5e9',
        ),
      )
      await expectCodeDisclosure(canvas, basicUsageSnippet)
    })
  },
}

export const InitialColor: Story = {
  name: 'Initial color',
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
