import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  AlreadyFocusedExample,
  BasicInputExample,
  CustomDocumentExample,
  DynamicTargetExample,
  EnabledStateExample,
  FocusControlsExample,
  FocusVisibleExample,
  InitialFocusExample,
  PlaygroundExample,
  PreventScrollExample,
  SvgTargetExample,
} from './components/UseFocusExamples'
import {
  alreadyFocusedSnippet,
  basicInputSnippet,
  customDocumentSnippet,
  dynamicTargetSnippet,
  enabledStateSnippet,
  focusControlsSnippet,
  focusVisibleSnippet,
  initialFocusSnippet,
  playgroundSnippet,
  preventScrollSnippet,
  svgTargetSnippet,
} from './components/useFocus.snippets'

const meta = {
  title: 'Hooks/useFocus',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Tracks whether a referenced element has direct native focus and exposes stable \`focus\` / \`blur\` methods.

\`\`\`ts
import { useFocus } from '@muradyanvano/react-hooks'

useFocus<T extends UseFocusTarget>(
  ref: RefObject<T | null>,
  options?: UseFocusOptions,
): UseFocusReturn
\`\`\`

**Defaults:** \`{ enabled: true, initialValue: false, focusVisible: false, preventScroll: false }\`

**Direct focus only:** Descendant focus does not count. Use \`useFocusWithin\` for container-level focus tracking.

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
    focusVisible: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    preventScroll: {
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

export const FocusControls: Story = {
  name: 'Focus controls',
  render: () => <FocusControlsExample />,
  parameters: { docs: { source: { code: focusControlsSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByTestId('fc-status')).toHaveTextContent(
      'No tracked target has focus',
    )

    await userEvent.click(canvas.getByTestId('fc-focus-text'))
    await waitFor(() => {
      expect(canvas.getByTestId('fc-status')).toHaveTextContent(
        'The paragraph has focus',
      )
      expect(canvas.getByTestId('fc-paragraph-value')).toHaveTextContent('true')
    })

    await userEvent.click(canvas.getByTestId('fc-focus-input'))
    await waitFor(() => {
      expect(canvas.getByTestId('fc-status')).toHaveTextContent(
        'The input control has focus',
      )
      expect(canvas.getByTestId('fc-input-value')).toHaveTextContent('true')
    })

    await userEvent.click(canvas.getByTestId('fc-focus-button'))
    await waitFor(() => {
      expect(canvas.getByTestId('fc-status')).toHaveTextContent(
        'The button has focus',
      )
      expect(canvas.getByTestId('fc-button-value')).toHaveTextContent('true')
    })

    await expectCodeDisclosure(canvas, focusControlsSnippet)
  },
}

export const BasicInput: Story = {
  name: 'Basic input',
  render: () => <BasicInputExample />,
  parameters: { docs: { source: { code: basicInputSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('basic-focus-btn'))
    await waitFor(() => {
      expect(canvas.getByTestId('basic-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await userEvent.click(canvas.getByTestId('basic-blur-btn'))
    await waitFor(() => {
      expect(canvas.getByTestId('basic-focused-value')).toHaveTextContent(
        'false',
      )
    })
    await expectCodeDisclosure(canvas, basicInputSnippet)
  },
}

export const InitialFocus: Story = {
  name: 'Initial focus',
  render: () => <InitialFocusExample />,
  parameters: { docs: { source: { code: initialFocusSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('initial-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('initial-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await expectCodeDisclosure(canvas, initialFocusSnippet)
  },
}

export const PreventScroll: Story = {
  name: 'Prevent scroll',
  render: () => <PreventScrollExample />,
  parameters: { docs: { source: { code: preventScrollSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const panel = canvas.getByTestId('prevent-scroll-panel')
    panel.scrollTop = 120
    const before = panel.scrollTop
    await userEvent.click(canvas.getByTestId('prevent-scroll-focus'))
    await waitFor(() => {
      expect(canvas.getByTestId('prevent-scroll-input')).toHaveFocus()
    })
    expect(panel.scrollTop).toBe(before)
    await expectCodeDisclosure(canvas, preventScrollSnippet)
  },
}

export const FocusVisible: Story = {
  name: 'Focus visible',
  render: () => <FocusVisibleExample />,
  parameters: { docs: { source: { code: focusVisibleSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.tab()
    await waitFor(() => {
      expect(canvas.getByTestId('visible-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await expectCodeDisclosure(canvas, focusVisibleSnippet)
  },
}

export const DynamicTarget: Story = {
  name: 'Dynamic target',
  render: () => <DynamicTargetExample />,
  parameters: { docs: { source: { code: dynamicTargetSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('dynamic-target-a'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await userEvent.click(canvas.getByTestId('dynamic-switch-b'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-focused-value')).toHaveTextContent(
        'false',
      )
    })
    await userEvent.click(canvas.getByTestId('dynamic-focus-btn'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-target-b')).toHaveFocus()
      expect(canvas.getByTestId('dynamic-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await expectCodeDisclosure(canvas, dynamicTargetSnippet)
  },
}

export const AlreadyFocused: Story = {
  name: 'Already focused',
  render: () => <AlreadyFocusedExample />,
  parameters: { docs: { source: { code: alreadyFocusedSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('already-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await expectCodeDisclosure(canvas, alreadyFocusedSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample />,
  parameters: { docs: { source: { code: enabledStateSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('enabled-input'))
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
    await userEvent.click(canvas.getByTestId('enabled-focus-btn'))
    expect(canvas.getByTestId('enabled-focused-value')).toHaveTextContent(
      'false',
    )
    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await userEvent.click(canvas.getByTestId('enabled-input'))
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-focused-value')).toHaveTextContent(
        'true',
      )
    })
    await expectCodeDisclosure(canvas, enabledStateSnippet)
  },
}

export const SvgTarget: Story = {
  name: 'SVG target',
  render: () => <SvgTargetExample />,
  parameters: { docs: { source: { code: svgTargetSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('svg-focus-btn'))
    await waitFor(() => {
      expect(canvas.getByTestId('svg-focused-value')).toHaveTextContent('true')
      expect(canvas.getByTestId('svg-label')).toHaveTextContent('Active')
    })
    await expectCodeDisclosure(canvas, svgTargetSnippet)
  },
}

export const CustomDocument: Story = {
  name: 'Custom document',
  render: () => <CustomDocumentExample />,
  parameters: { docs: { source: { code: customDocumentSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('iframe-focus-btn')).not.toBeDisabled()
    })
    expect(canvas.getByTestId('iframe-focused-value')).toHaveTextContent(
      'false',
    )
    await userEvent.click(canvas.getByTestId('iframe-focus-btn'))
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
  args: {
    enabled: true,
    initialValue: false,
    focusVisible: false,
    preventScroll: false,
  },
  render: (args) => <PlaygroundExample {...args} />,
  parameters: { docs: { source: { code: playgroundSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('pg-mount-toggle'))
    await userEvent.click(canvas.getByTestId('pg-focus-btn'))
    await waitFor(() => {
      expect(canvas.getByTestId('pg-focused-value')).toHaveTextContent('true')
    })
    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
