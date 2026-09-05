import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  AlreadyFocusedExample,
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
  tags: ['autodocs'],
  ...createHookStoryMeta('useFocus', PlaygroundExample),
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
    'Programmatic focus across text, input, and button targets with a live focused flag. Use Focus text / Focus input / Focus button and confirm status text. Does not auto-focus on Docs load — gate initialValue behind an explicit mount.',
  ),

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

export const InitialFocus: Story = {
  name: 'Initial focus',
  ...storyDescription(
    'Initial focus example for useFocus. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Prevent scroll example for useFocus. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Focus visible example for useFocus. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Dynamic target example for useFocus. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Already focused example for useFocus. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Enabled state example for useFocus. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'SVG target example for useFocus. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Custom document example for useFocus. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Configurable useFocus playground. Use Controls when wired to hook options, try edge interactions, and compare runtime behavior with the code panel.',
  ),

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
