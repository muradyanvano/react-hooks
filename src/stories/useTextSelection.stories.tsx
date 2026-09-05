import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import {
  BasicSelectionExample,
  ClearingSelectionExample,
  CollapsedSelectionExample,
  CustomIframeExample,
  DynamicWindowExample,
  EnabledStateExample,
  MultipleParagraphsExample,
  MultipleRangesExample,
  PlaygroundExample,
  SelectionRectanglesExample,
  TextSelectionInspectorExample,
  UnicodeWhitespaceExample,
} from './components/UseTextSelectionExamples'
import { expectCodeDisclosure } from './components/expectCodeDisclosure'
import * as snippets from './components/useTextSelection.snippets'

const meta = {
  title: 'Hooks / useTextSelection',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
    docs: {
      canvas: { sourceState: 'none' },
      description: {
        component:
          'Observes `selectionchange` on a selected window’s document. The first render is empty; explicit `window: null` observes nothing.',
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

function selectionFixture(text: string) {
  const range = { getClientRects: () => [] } as unknown as Range
  return {
    toString: () => text,
    rangeCount: 1,
    getRangeAt: () => range,
  } as unknown as Selection
}

async function patchAndDispatch(
  win: Window,
  text: string,
  assertion: () => void | Promise<void>,
) {
  const ownDescriptor = Object.getOwnPropertyDescriptor(win, 'getSelection')
  Object.defineProperty(win, 'getSelection', {
    configurable: true,
    value: () => selectionFixture(text),
  })
  try {
    win.document.dispatchEvent(new Event('selectionchange'))
    await assertion()
  } finally {
    if (ownDescriptor === undefined) {
      delete (win as { getSelection?: unknown }).getSelection
    } else {
      Object.defineProperty(win, 'getSelection', ownDescriptor)
    }
  }
}

function standardPlay(expectedSnippet: string) {
  return async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement)
    await patchAndDispatch(window, 'fixture selection', async () => {
      await waitFor(() =>
        expect(
          canvas.getAllByTestId('text-selection-snapshot')[0],
        ).toHaveTextContent('fixture selection'),
      )
    })
    await expectCodeDisclosure(canvas, expectedSnippet)
  }
}

export const TextSelectionInspector: Story = {
  name: 'Text selection inspector',
  render: () => <TextSelectionInspectorExample />,
  play: standardPlay(snippets.inspectorSnippet),
}
export const BasicSelection: Story = {
  name: 'Basic selection',
  render: () => <BasicSelectionExample />,
  play: standardPlay(snippets.basicSnippet),
}
export const MultipleParagraphs: Story = {
  name: 'Multiple paragraphs',
  render: () => <MultipleParagraphsExample />,
  play: standardPlay(snippets.paragraphsSnippet),
}
export const MultipleRanges: Story = {
  name: 'Multiple ranges',
  render: () => <MultipleRangesExample />,
  play: standardPlay(snippets.rangesSnippet),
}
export const SelectionRectangles: Story = {
  name: 'Selection rectangles',
  render: () => <SelectionRectanglesExample />,
  play: standardPlay(snippets.rectanglesSnippet),
}
export const CollapsedSelection: Story = {
  name: 'Collapsed selection',
  render: () => <CollapsedSelectionExample />,
  play: standardPlay(snippets.collapsedSnippet),
}
export const UnicodeAndWhitespace: Story = {
  name: 'Unicode and whitespace',
  render: () => <UnicodeWhitespaceExample />,
  play: standardPlay(snippets.unicodeSnippet),
}
export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('text-selection-toggle'))
    await expect(
      canvas.getByTestId('text-selection-enabled'),
    ).toHaveTextContent('enabled: false; text: empty')
    await userEvent.click(canvas.getByTestId('text-selection-toggle'))
    await expectCodeDisclosure(canvas, snippets.enabledSnippet)
  },
}
export const CustomIframeWindow: Story = {
  name: 'Custom iframe window',
  render: () => <CustomIframeExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const frame = await canvas.findByTestId('text-selection-iframe-a')
    await waitFor(() =>
      expect(
        canvas.getByTestId('text-selection-window-state'),
      ).toHaveTextContent('observing'),
    )
    const win = (frame as HTMLIFrameElement).contentWindow
    if (win == null) throw new Error('iframe window unavailable')
    const body = win.document.body
    const range = win.document.createRange()
    range.selectNodeContents(body)
    const selection = win.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    await waitFor(() =>
      expect(
        canvas.getByTestId('text-selection-iframe-text').textContent?.length ??
          0,
      ).toBeGreaterThan(0),
    )
    await expectCodeDisclosure(canvas, snippets.iframeSnippet)
  },
}
export const DynamicWindow: Story = {
  name: 'Dynamic window',
  render: () => <DynamicWindowExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() =>
      expect(
        canvas.getByTestId('text-selection-window-state'),
      ).toHaveTextContent('observing'),
    )
    await userEvent.click(canvas.getByTestId('text-selection-switch'))
    const frame = await canvas.findByTestId('text-selection-iframe-b')
    await waitFor(() =>
      expect(
        canvas.getByTestId('text-selection-window-state'),
      ).toHaveTextContent('observing'),
    )
    const win = (frame as HTMLIFrameElement).contentWindow
    if (win == null) throw new Error('iframe window unavailable')
    const range = win.document.createRange()
    range.selectNodeContents(win.document.body)
    win.getSelection()?.removeAllRanges()
    win.getSelection()?.addRange(range)
    await waitFor(() =>
      expect(
        canvas.getByTestId('text-selection-iframe-text').textContent?.length ??
          0,
      ).toBeGreaterThan(0),
    )
    await expectCodeDisclosure(canvas, snippets.dynamicSnippet)
  },
}
export const ClearingSelection: Story = {
  name: 'Clearing selection',
  render: () => <ClearingSelectionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByTestId('text-selection-cleared-text'),
    ).toHaveTextContent('Selection cleared')
    await expectCodeDisclosure(canvas, snippets.clearingSnippet)
  },
}
export const Playground: Story = {
  name: 'Playground',
  args: { enabled: true },
  render: (args) => <PlaygroundExample {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('text-selection-playground-mount'))
    await expectCodeDisclosure(canvas, snippets.playgroundSnippet)
  },
}
