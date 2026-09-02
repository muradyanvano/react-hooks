import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  CustomDocumentExample,
  DynamicTargetExample,
  EnabledStateExample,
  FieldGroupExample,
  FocusInFormExample,
  MovingWithinExample,
  NestedControlsExample,
  PlaygroundExample,
  PortalBoundaryExample,
  SvgGroupExample,
  TargetFocusExample,
} from './components/UseFocusWithinExamples'
import {
  customDocumentSnippet,
  dynamicTargetSnippet,
  enabledStateSnippet,
  fieldGroupSnippet,
  focusInFormSnippet,
  movingWithinSnippet,
  nestedControlsSnippet,
  playgroundSnippet,
  portalBoundarySnippet,
  svgGroupSnippet,
  targetFocusSnippet,
} from './components/useFocusWithin.snippets'

const meta = {
  title: 'Hooks/useFocusWithin',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Tracks whether a referenced element or any DOM descendant currently contains focus, aligned with CSS \`:focus-within\`.

\`\`\`ts
import { useFocusWithin } from '@muradyanvano/react-hooks'

useFocusWithin<T extends Element>(
  ref: RefObject<T | null>,
  options?: UseFocusWithinOptions,
): UseFocusWithinReturn
\`\`\`

**Defaults:** \`{ enabled: true }\`

**Read-only:** This hook does not move focus. Use \`useFocus\` when you need direct-focus tracking or imperative focus methods.

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

export const FocusInForm: Story = {
  name: 'Focus in form',
  render: () => <FocusInFormExample />,
  parameters: { docs: { source: { code: focusInFormSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByTestId('form-status')).toHaveTextContent(
      'Focus in form: false',
    )

    await userEvent.click(canvas.getByTestId('field-first-name'))
    await waitFor(() => {
      expect(canvas.getByTestId('form-status')).toHaveTextContent(
        'Focus in form: true',
      )
    })

    await userEvent.click(canvas.getByTestId('field-last-name'))
    await expect(canvas.getByTestId('form-status')).toHaveTextContent(
      'Focus in form: true',
    )

    await userEvent.click(canvas.getByTestId('field-email'))
    await expect(canvas.getByTestId('form-status')).toHaveTextContent(
      'Focus in form: true',
    )

    await userEvent.click(canvas.getByTestId('field-password'))
    await expect(canvas.getByTestId('form-status')).toHaveTextContent(
      'Focus in form: true',
    )

    await userEvent.click(canvas.getByTestId('outside-button'))
    await waitFor(() => {
      expect(canvas.getByTestId('form-status')).toHaveTextContent(
        'Focus in form: false',
      )
    })

    await expectCodeDisclosure(canvas, focusInFormSnippet)
  },
}

export const FieldGroup: Story = {
  name: 'Field group',
  render: () => <FieldGroupExample />,
  parameters: { docs: { source: { code: fieldGroupSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('group-street'))
    await waitFor(() => {
      expect(canvas.getByTestId('group-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await expectCodeDisclosure(canvas, fieldGroupSnippet)
  },
}

export const MovingWithin: Story = {
  name: 'Moving within',
  render: () => <MovingWithinExample />,
  parameters: { docs: { source: { code: movingWithinSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('moving-field-a'))
    await userEvent.tab()
    await userEvent.tab()
    await waitFor(() => {
      expect(canvas.getByTestId('moving-focused-value')).toHaveTextContent(
        'true',
      )
      expect(canvas.getByTestId('moving-history').textContent).not.toMatch(
        /true → false → true/,
      )
    })
    await expectCodeDisclosure(canvas, movingWithinSnippet)
  },
}

export const TargetFocus: Story = {
  name: 'Target focus',
  render: () => <TargetFocusExample />,
  parameters: { docs: { source: { code: targetFocusSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('target-panel'))
    await waitFor(() => {
      expect(canvas.getByTestId('target-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await expectCodeDisclosure(canvas, targetFocusSnippet)
  },
}

export const NestedControls: Story = {
  name: 'Nested controls',
  render: () => <NestedControlsExample />,
  parameters: { docs: { source: { code: nestedControlsSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('nested-name'))
    await userEvent.click(canvas.getByTestId('nested-note'))
    await waitFor(() => {
      expect(canvas.getByTestId('nested-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await expectCodeDisclosure(canvas, nestedControlsSnippet)
  },
}

export const DynamicTarget: Story = {
  name: 'Dynamic target',
  render: () => <DynamicTargetExample />,
  parameters: { docs: { source: { code: dynamicTargetSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('dynamic-field-a'))
    await userEvent.click(canvas.getByTestId('dynamic-switch-b'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-focused-value')).toHaveTextContent(
        'false',
      )
    })
    await userEvent.click(canvas.getByTestId('dynamic-field-b'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await expectCodeDisclosure(canvas, dynamicTargetSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample />,
  parameters: { docs: { source: { code: enabledStateSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('enabled-email'))
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-focused-value')).toHaveTextContent(
        'false',
      )
    })
    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await expectCodeDisclosure(canvas, enabledStateSnippet)
  },
}

export const PortalBoundary: Story = {
  name: 'Portal boundary',
  render: () => <PortalBoundaryExample />,
  parameters: { docs: { source: { code: portalBoundarySnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('portal-inside-input'))
    await waitFor(() => {
      expect(canvas.getByTestId('portal-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await userEvent.click(canvas.getByTestId('portal-outside-input'))
    await waitFor(() => {
      expect(canvas.getByTestId('portal-focused-value')).toHaveTextContent(
        'false',
      )
    })
    await expectCodeDisclosure(canvas, portalBoundarySnippet)
  },
}

export const SvgGroup: Story = {
  name: 'SVG group',
  render: () => <SvgGroupExample />,
  parameters: { docs: { source: { code: svgGroupSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const circle = canvas.getByTestId('svg-circle')
    circle.focus()
    await waitFor(() => {
      expect(canvas.getByTestId('svg-focused-value')).toHaveTextContent('true')
    })
    await expectCodeDisclosure(canvas, svgGroupSnippet)
  },
}

export const CustomDocument: Story = {
  name: 'Custom document',
  render: () => <CustomDocumentExample />,
  parameters: { docs: { source: { code: customDocumentSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('iframe-ready-value')).toHaveTextContent('true')
    })
    const iframe = canvas.getByTestId('iframe-panel') as HTMLIFrameElement
    const innerInput = iframe.contentDocument?.getElementById(
      'inner',
    ) as HTMLInputElement | null
    expect(innerInput).not.toBeNull()
    innerInput?.focus()
    await waitFor(
      () => {
        expect(canvas.getByTestId('iframe-focused-value')).toHaveTextContent(
          'true',
        )
      },
      { timeout: 3000 },
    )
    await expectCodeDisclosure(canvas, customDocumentSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  args: { enabled: true },
  render: (args) => <PlaygroundExample {...args} />,
  parameters: { docs: { source: { code: playgroundSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('pg-mount-toggle'))
    await userEvent.click(canvas.getByTestId('pg-name'))
    await waitFor(() => {
      expect(canvas.getByTestId('pg-focused-value')).toHaveTextContent('true')
    })
    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
