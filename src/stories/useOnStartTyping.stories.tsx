import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  CharacterValidationExample,
  CommandPaletteExample,
  ContenteditableExample,
  EditableProtectionExample,
  EnabledStateExample,
  ModifierKeysExample,
  OverviewExample,
  PlaygroundExample,
  SearchFocusExample,
  type ValidationMode,
} from './components/UseOnStartTypingExamples'
import {
  characterValidationSnippet,
  commandPaletteSnippet,
  contentEditableSnippet,
  editableProtectionSnippet,
  enabledSnippet,
  modifierKeysSnippet,
  overviewSnippet,
  playgroundSnippet,
  searchFocusSnippet,
} from './components/useOnStartTyping.snippets'

const meta = {
  title: 'Hooks/useOnStartTyping',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Detects when a user begins typing while focus is outside an editable element. Commonly used to focus a search field.

\`\`\`ts
import { useOnStartTyping } from '@muradyanvano/react-hooks'

useOnStartTyping(
  handler: UseOnStartTypingHandler,
  options?: UseOnStartTypingOptions,
): void
\`\`\`

**Defaults:** \`{ enabled: true }\` with an ASCII alphanumeric character validator and a DOM editable-element detector.

**Default keys:** Latin letters and digits only. Shift is allowed. Ctrl / Alt / Meta, \`repeat\`, and \`isComposing\` are rejected.

**Editable protection:** \`<input>\`, \`<textarea>\`, \`<select>\`, contenteditable regions (including open shadow roots when detectable). Nested \`contenteditable="false"\` islands are non-editable.

**Important:** The hook does not call \`preventDefault\`, so the initial character may continue into a newly focused input.

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
  },
  argTypes: {
    enabled: {
      control: 'boolean',
      description: 'When false, no document listener is registered.',
      table: { defaultValue: { summary: 'true' } },
    },
    mode: {
      control: 'select',
      options: ['alphanumeric', 'digits', 'letters'] satisfies ValidationMode[],
      description:
        'Serializable character-validation mode mapped to a predicate.',
      table: { defaultValue: { summary: 'alphanumeric' } },
    },
    onAccepted: { action: 'accepted' },
  },
  args: {
    enabled: true,
    mode: 'alphanumeric' as ValidationMode,
    onAccepted: fn(),
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
  await expect(canvas.getByTestId('code-panel')).not.toBeVisible()

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(canvas.getByTestId('code-panel')).toBeVisible()
  await expect(await canvas.findByTestId('highlighted-code')).toBeVisible()

  const writeText = fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  await userEvent.click(canvas.getByTestId('copy-code'))
  await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
  await expect(canvas.getByTestId('copy-code')).toHaveTextContent('Copied')

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(canvas.getByTestId('code-panel')).not.toBeVisible()
}

function dispatchKey(key: string, init: KeyboardEventInit = {}): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  )
}

export const Overview: Story = {
  name: 'Overview',
  render: () => <OverviewExample />,
  parameters: {
    docs: {
      source: { code: overviewSnippet },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('overview-reset'))
    await userEvent.keyboard('q')
    await waitFor(() => {
      expect(canvas.getByTestId('overview-search')).toHaveFocus()
    })
    await expect(canvas.getByTestId('overview-last-key')).toHaveTextContent('q')
    await expect(canvas.getByTestId('overview-count')).toHaveTextContent('1')
    await expectCodeDisclosure(canvas, overviewSnippet)
  },
}

export const SearchFocus: Story = {
  name: 'Search focus',
  render: () => <SearchFocusExample />,
  parameters: {
    docs: {
      source: { code: searchFocusSnippet },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('recent-heading'))
    await userEvent.keyboard('a')
    await waitFor(() => {
      expect(canvas.getByTestId('kb-search')).toHaveFocus()
    })
    await expect(canvas.getByTestId('search-focus-state')).toHaveTextContent(
      'Focused',
    )
  },
}

export const CommandPalette: Story = {
  name: 'Command palette',
  render: () => <CommandPaletteExample />,
  parameters: {
    docs: {
      source: { code: commandPaletteSnippet },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('palette-live'))
    await userEvent.keyboard('k')
    await waitFor(() => {
      expect(canvas.getByTestId('command-palette')).toBeVisible()
    })
    await waitFor(() => {
      expect(canvas.getByTestId('palette-input')).toHaveFocus()
    })
    await expect(canvas.getByTestId('palette-state')).toHaveTextContent('Open')
  },
}

export const EditableProtection: Story = {
  name: 'Editable protection',
  render: () => <EditableProtectionExample />,
  parameters: {
    docs: {
      source: { code: editableProtectionSnippet },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('editable-text'))
    await userEvent.keyboard('a')
    await expect(canvas.getByTestId('editable-count')).toHaveTextContent('0')

    await userEvent.click(canvas.getByTestId('editable-textarea'))
    await userEvent.keyboard('b')
    await expect(canvas.getByTestId('editable-count')).toHaveTextContent('0')

    await userEvent.click(canvas.getByTestId('editable-select'))
    dispatchKey('c')
    await expect(canvas.getByTestId('editable-count')).toHaveTextContent('0')

    await userEvent.click(canvas.getByTestId('editable-ce'))
    await userEvent.keyboard('d')
    await expect(canvas.getByTestId('editable-count')).toHaveTextContent('0')

    await userEvent.click(canvas.getByTestId('non-editable-target'))
    await userEvent.keyboard('e')
    await expect(canvas.getByTestId('editable-count')).toHaveTextContent('1')
    await expect(canvas.getByTestId('editable-status')).toHaveTextContent(
      'Accepted “e”',
    )
  },
}

export const CharacterValidation: Story = {
  name: 'Character validation',
  render: () => <CharacterValidationExample />,
  parameters: {
    docs: {
      source: { code: characterValidationSnippet },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('digits-focus'))
    await userEvent.keyboard('a')
    await expect(canvas.getByTestId('digits-count')).toHaveTextContent('0')
    await userEvent.keyboard('7')
    await expect(canvas.getByTestId('digits-last')).toHaveTextContent('7')
    await expect(canvas.getByTestId('digits-count')).toHaveTextContent('1')
  },
}

export const ModifierKeys: Story = {
  name: 'Modifier keys',
  render: () => <ModifierKeysExample />,
  parameters: {
    docs: {
      source: { code: modifierKeysSnippet },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('modifier-focus'))
    await userEvent.keyboard('{Shift>}A{/Shift}')
    await expect(canvas.getByTestId('modifier-count')).toHaveTextContent('1')

    dispatchKey('a', { ctrlKey: true })
    dispatchKey('a', { altKey: true })
    dispatchKey('a', { metaKey: true })
    dispatchKey('a', { repeat: true })
    await expect(canvas.getByTestId('modifier-count')).toHaveTextContent('1')
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample />,
  parameters: {
    docs: {
      source: { code: enabledSnippet },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('enabled-focus'))
    await userEvent.keyboard('x')
    await expect(canvas.getByTestId('enabled-count')).toHaveTextContent('1')

    await userEvent.click(canvas.getByTestId('typing-enabled-checkbox'))
    await userEvent.click(canvas.getByTestId('enabled-focus'))
    await userEvent.keyboard('y')
    await expect(canvas.getByTestId('enabled-count')).toHaveTextContent('1')

    await userEvent.click(canvas.getByTestId('typing-enabled-checkbox'))
    await userEvent.click(canvas.getByTestId('enabled-focus'))
    await userEvent.keyboard('z')
    await expect(canvas.getByTestId('enabled-count')).toHaveTextContent('2')
    await expect(canvas.getByTestId('enabled-last-key')).toHaveTextContent('z')
  },
}

export const Contenteditable: Story = {
  name: 'Contenteditable',
  render: () => <ContenteditableExample />,
  parameters: {
    docs: {
      source: { code: contentEditableSnippet },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('composer'))
    await userEvent.keyboard('n')
    await expect(canvas.getByTestId('ce-status')).toHaveTextContent(
      'Type from the non-editable area',
    )

    await userEvent.click(canvas.getByTestId('composer-outside'))
    await userEvent.keyboard('m')
    await expect(canvas.getByTestId('ce-status')).toHaveTextContent(
      'Accepted “m” from non-editable focus',
    )
  },
}

export const Playground: Story = {
  name: 'Playground',
  render: (args) => <PlaygroundExample {...args} />,
  parameters: {
    docs: {
      source: { code: playgroundSnippet },
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('playground-reset'))
    await userEvent.keyboard('p')
    await expect(canvas.getByTestId('playground-count')).toHaveTextContent('1')
    await expect(args.onAccepted).toHaveBeenCalled()

    await userEvent.click(canvas.getByTestId('playground-reset'))
    await expect(canvas.getByTestId('playground-count')).toHaveTextContent('0')
    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
