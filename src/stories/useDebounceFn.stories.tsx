import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import {
  AsyncCallbackExample,
  AutosaveDraftExample,
  BasicCounterExample,
  CancelExample,
  DebouncedSearchExample,
  DynamicDelayExample,
  ErrorPropagationExample,
  FlushExample,
  LastArgumentsExample,
  MaximumWaitExample,
  PendingStateExample,
  PlaygroundExample,
  ValidationExample,
} from './components/UseDebounceFnExamples'
import {
  disclosurePlay,
  expectCodeDisclosure,
} from './components/expectCodeDisclosure'
import {
  asyncCallbackSnippet,
  autosaveDraftSnippet,
  basicCounterSnippet,
  cancelSnippet,
  debouncedSearchSnippet,
  dynamicDelaySnippet,
  errorPropagationSnippet,
  flushSnippet,
  lastArgumentsSnippet,
  maximumWaitSnippet,
  pendingStateSnippet,
  playgroundSnippet,
  validationSnippet,
} from './components/useDebounceFn.snippets'

const meta = {
  title: 'Hooks / useDebounceFn',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: { canvas: { sourceState: 'none' } },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PlaygroundExample>

export default meta
type Story = StoryObj<typeof meta>

export const DebouncedSearch: Story = {
  name: 'Debounced search',
  render: () => <DebouncedSearchExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Search the fictional catalog')
    const pending = canvas.getByTestId('debounce-pending')
    const result = canvas.getByTestId('debounce-result')

    // Paste a full query in one update so the trailing window is still pending
    // when we assert, then wait for the settled fictional result.
    await userEvent.click(input)
    await userEvent.paste('atlas')
    await expect(pending).toHaveTextContent('Yes')
    await waitFor(() => {
      expect(result).toHaveTextContent('Atlas')
      expect(pending).toHaveTextContent('No')
    })

    await expectCodeDisclosure(canvas, debouncedSearchSnippet)
    await expect(pending).toHaveTextContent('No')
  },
}

export const BasicCounter: Story = {
  name: 'Basic counter',
  render: () => <BasicCounterExample />,
  play: disclosurePlay(basicCounterSnippet),
}
export const LastArgumentsWin: Story = {
  name: 'Last arguments win',
  render: () => <LastArgumentsExample />,
  play: disclosurePlay(lastArgumentsSnippet),
}
export const PendingState: Story = {
  name: 'Pending state',
  render: () => <PendingStateExample />,
  play: disclosurePlay(pendingStateSnippet),
}
export const Cancel: Story = {
  name: 'Cancel',
  render: () => <CancelExample />,
  play: disclosurePlay(cancelSnippet),
}
export const Flush: Story = {
  name: 'Flush',
  render: () => <FlushExample />,
  play: disclosurePlay(flushSnippet),
}
export const MaximumWait: Story = {
  name: 'Maximum wait',
  render: () => <MaximumWaitExample />,
  play: disclosurePlay(maximumWaitSnippet),
}
export const AsyncCallback: Story = {
  name: 'Async callback',
  render: () => <AsyncCallbackExample />,
  play: disclosurePlay(asyncCallbackSnippet),
}
export const Validation: Story = {
  name: 'Validation',
  render: () => <ValidationExample />,
  play: disclosurePlay(validationSnippet),
}
export const AutosaveDraft: Story = {
  name: 'Autosave draft',
  render: () => <AutosaveDraftExample />,
  play: disclosurePlay(autosaveDraftSnippet),
}
export const DynamicDelay: Story = {
  name: 'Dynamic delay',
  render: () => <DynamicDelayExample />,
  play: disclosurePlay(dynamicDelaySnippet),
}
export const ErrorPropagation: Story = {
  name: 'Error propagation',
  render: () => <ErrorPropagationExample />,
  play: disclosurePlay(errorPropagationSnippet),
}
export const Playground: Story = {
  name: 'Playground',
  render: () => <PlaygroundExample />,
  play: disclosurePlay(playgroundSnippet),
}
