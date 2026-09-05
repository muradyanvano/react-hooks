import type { Meta, StoryObj } from '@storybook/react-vite'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
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
  title: 'Hooks/useTextSelection',
  tags: ['autodocs'],
  ...createHookStoryMeta('useTextSelection', PlaygroundExample, {
    argTypes: {
      enabled: {
        control: 'boolean',
        table: { defaultValue: { summary: 'true' } },
      },
    },
  }),
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

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Reading surfaces that expose selected text and geometry. Select a sentence, inspect counts/rects, then collapse selection to the empty state. Example highlighting must not block selecting.',
  ),
  render: () => <TextSelectionInspectorExample />,
  play: standardPlay(snippets.inspectorSnippet),
}
export const BasicSelection: Story = {
  name: 'Basic selection',
  ...storyDescription(
    'A toolbar needs to know when the user has selected text to enable actions like copy or highlight. Select any text within the fixture paragraph. The hook reports the selected string and updates live as the selectionchange event fires, without the consumer registering its own listener.',
  ),
  render: () => <BasicSelectionExample />,
  play: standardPlay(snippets.basicSnippet),
}
export const MultipleParagraphs: Story = {
  name: 'Multiple paragraphs',
  ...storyDescription(
    'Selections that span multiple block-level elements, like dragging across paragraph boundaries, need to read as one continuous string rather than per-element fragments. Select text that crosses from one paragraph into the next. The reported text concatenates the full cross-paragraph selection instead of stopping at the first paragraph.',
  ),
  render: () => <MultipleParagraphsExample />,
  play: standardPlay(snippets.paragraphsSnippet),
}
export const MultipleRanges: Story = {
  name: 'Multiple ranges',
  ...storyDescription(
    'Some browsers let users hold Ctrl or Cmd while dragging to select several disjoint text ranges at once. This story simulates a multi-range selection rather than a single contiguous one. The hook surfaces every selected range and their combined text, not just the first range in the underlying Selection object.',
  ),
  render: () => <MultipleRangesExample />,
  play: standardPlay(snippets.rangesSnippet),
}
export const SelectionRectangles: Story = {
  name: 'Selection rectangles',
  ...storyDescription(
    "Positioning a floating toolbar or highlight overlay above selected text requires its on-screen coordinates, not just the string content. Selecting text here also exposes the client rectangles for each range via getClientRects(). The hook returns those rects alongside the text, letting a consumer position UI directly against the selection's bounding boxes.",
  ),
  render: () => <SelectionRectanglesExample />,
  play: standardPlay(snippets.rectanglesSnippet),
}
export const CollapsedSelection: Story = {
  name: 'Collapsed selection',
  ...storyDescription(
    'A cursor placed in text without dragging, a collapsed selection, should read as empty rather than throw or return stale text. Clicking without dragging leaves the selection collapsed to a single point. The hook reports empty selected text and zero-length ranges, distinguishing a mere caret position from an actual text selection.',
  ),
  render: () => <CollapsedSelectionExample />,
  play: standardPlay(snippets.collapsedSnippet),
}
export const UnicodeAndWhitespace: Story = {
  name: 'Unicode and whitespace',
  ...storyDescription(
    "Selections containing emoji, combining characters, or runs of whitespace are easy to truncate or mis-count if a hook doesn't handle them carefully. The fixture text mixes Unicode characters with leading and trailing whitespace. The reported selection preserves the exact characters and whitespace as selected, without normalizing or trimming them.",
  ),
  render: () => <UnicodeWhitespaceExample />,
  play: standardPlay(snippets.unicodeSnippet),
}
export const EnabledState: Story = {
  name: 'Enabled state',
  ...storyDescription(
    'Selection tracking has a per-keystroke cost, so consumers may want to disable it entirely — for a print view, for instance — without unmounting the hook. Toggling enabled to false stops the hook from listening for selectionchange and resets its reported text to empty. Toggling it back on resumes tracking from the current live selection.',
  ),
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
  ...storyDescription(
    "Text selected inside an iframe lives in a different document than the host page, so the default window.getSelection() call misses it entirely. This example points the hook at an iframe's own window instead of the top-level one. Selecting text inside that iframe is picked up correctly, since the hook listens for selectionchange on the window it was given.",
  ),
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
  ...storyDescription(
    "An embed picker or multi-frame editor may need to redirect selection tracking to a different iframe at runtime, not just at mount. Switching the active frame repoints the hook at a second iframe's window. Selecting text in the newly active frame is observed immediately, while the previous frame's window is no longer watched.",
  ),
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
  ...storyDescription(
    'Programmatic actions like closing a panel or clicking a Deselect button should visibly clear the tracked selection state, not just the browser\'s native selection. Clearing the selection via removeAllRanges() here updates the hook\'s reported text to the empty "Selection cleared" state. The hook reflects the cleared selection immediately without waiting for further user interaction.',
  ),
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
  ...storyDescription(
    'useTextSelection Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  args: { enabled: true },
  render: (args) => <PlaygroundExample {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('text-selection-playground-mount'))
    await expectCodeDisclosure(canvas, snippets.playgroundSnippet)
  },
}
