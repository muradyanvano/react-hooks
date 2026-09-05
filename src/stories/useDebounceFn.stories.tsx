import type { Meta, StoryObj } from '@storybook/react-vite'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
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
import { expectCodeDisclosure } from './components/expectCodeDisclosure'
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
  title: 'Hooks/useDebounceFn',
  tags: ['autodocs'],
  ...createHookStoryMeta('useDebounceFn', PlaygroundExample),
} satisfies Meta<typeof PlaygroundExample>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Search boxes that should not fire work on every keystroke. Type quickly, watch pending flip, then Cancel or Flush to see different outcomes. Uses short deterministic delays in plays — no real network.',
  ),

  render: () => <DebouncedSearchExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Search the fictional catalog')
    const pending = canvas.getByTestId('debounce-pending')
    const result = canvas.getByTestId('debounce-result')

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
  ...storyDescription(
    'Rapid clicks queue one trailing invocation — pending rises during the burst, then the invocation counter increments once.',
  ),

  render: () => <BasicCounterExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const pending = canvas.getByTestId('debounce-pending')
    const count = canvas.getByTestId('debounce-count')
    const trigger = canvas.getByRole('button', { name: 'Click rapidly' })

    await userEvent.click(trigger)
    await userEvent.click(trigger)
    await userEvent.click(trigger)
    await expect(pending).toHaveTextContent('Yes')
    await waitFor(() => {
      expect(count).toHaveTextContent('1')
      expect(pending).toHaveTextContent('No')
    })

    await expectCodeDisclosure(canvas, basicCounterSnippet)
  },
}

export const LastArgumentsWin: Story = {
  name: 'Last arguments win',
  ...storyDescription(
    'Type quickly into the scheduled field — the debounced executed value settles on the final characters, not the first keystrokes.',
  ),

  render: () => <LastArgumentsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Scheduled (immediate)')

    await userEvent.type(input, 'abc')
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-result')).toHaveTextContent('abc')
      expect(canvas.getByTestId('debounce-pending')).toHaveTextContent('No')
    })

    await expectCodeDisclosure(canvas, lastArgumentsSnippet)
  },
}

export const PendingState: Story = {
  name: 'Pending state',
  ...storyDescription(
    'Schedule work and read isPending — the badge and status panel show Yes while queued, then No after the callback settles.',
  ),

  render: () => <PendingStateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const pending = canvas.getByTestId('debounce-pending')

    await userEvent.click(canvas.getByRole('button', { name: 'Schedule' }))
    await expect(pending).toHaveTextContent('Yes')
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-result')).toHaveTextContent('draft')
      expect(pending).toHaveTextContent('No')
    })

    await expectCodeDisclosure(canvas, pendingStateSnippet)
  },
}

export const Cancel: Story = {
  name: 'Cancel',
  ...storyDescription(
    'Users often need to abort in-flight debounced work — an autosave the user opted out of mid-typing, for example. Schedule a call, then hit Cancel before the delay elapses. The pending flag drops immediately and any caller awaiting the trailing invocation resolves with undefined instead of the callback ever running.',
  ),

  render: () => <CancelExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const pending = canvas.getByTestId('debounce-pending')

    await userEvent.click(canvas.getByRole('button', { name: 'Schedule' }))
    await expect(pending).toHaveTextContent('Yes')
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-result')).toHaveTextContent(
        'cancelled as undefined',
      )
      expect(pending).toHaveTextContent('No')
    })

    await expectCodeDisclosure(canvas, cancelSnippet)
  },
}

export const Flush: Story = {
  name: 'Flush',
  ...storyDescription(
    'A debounced save sometimes needs to run immediately — before navigating away with unsaved input, for instance. Schedule the callback, then click Flush now instead of waiting out the delay. The queued call executes right away and pending clears without the timer ever reaching its configured timeout.',
  ),

  render: () => <FlushExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const pending = canvas.getByTestId('debounce-pending')

    await userEvent.click(canvas.getByRole('button', { name: 'Schedule' }))
    await expect(pending).toHaveTextContent('Yes')
    await userEvent.click(canvas.getByRole('button', { name: 'Flush now' }))
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-result')).toHaveTextContent('queued')
      expect(pending).toHaveTextContent('No')
    })

    await expectCodeDisclosure(canvas, flushSnippet)
  },
}

export const MaximumWait: Story = {
  name: 'Maximum wait',
  ...storyDescription(
    'Pure trailing debounce can starve a callback indefinitely under continuous input, like a search box the user never stops typing into. Paste a long stream into the field and watch invocations fire on the timeline while typing is still going. maxWait forces the callback to run at that interval regardless of new activity, trading perfect debouncing for a guaranteed upper bound on latency.',
  ),

  render: () => <MaximumWaitExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Continuous typing stream')

    await userEvent.click(input)
    await userEvent.paste('stream')
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-count')).not.toHaveTextContent('0')
      expect(canvas.getByTestId('debounce-result')).toHaveTextContent('stream')
    })

    await expectCodeDisclosure(canvas, maximumWaitSnippet)
  },
}

export const AsyncCallback: Story = {
  name: 'Async callback',
  ...storyDescription(
    'An async callback resolves every caller in the window — save draft and wait for the saved: prefix in the result.',
  ),

  render: () => <AsyncCallbackExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-result')).toHaveTextContent(
        'saved:draft',
      )
      expect(canvas.getByTestId('debounce-pending')).toHaveTextContent('No')
    })

    await expectCodeDisclosure(canvas, asyncCallbackSnippet)
  },
}

export const Validation: Story = {
  name: 'Validation',
  ...storyDescription(
    'Validating on every keystroke produces flickering error messages before the user has finished typing. Type two characters into the codename field and the debounced validator reports invalid; add a third and let the delay settle. The result only updates once input pauses, so validation reflects the user’s finished intent rather than each intermediate keystroke.',
  ),

  render: () => <ValidationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Project codename')

    await userEvent.type(input, 'ab')
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-result')).toHaveTextContent('no')
    })
    await userEvent.type(input, 'c')
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-result')).toHaveTextContent('yes')
    })

    await expectCodeDisclosure(canvas, validationSnippet)
  },
}

export const AutosaveDraft: Story = {
  name: 'Autosave draft',
  ...storyDescription(
    'Autosave that persists on every keystroke wastes writes and can thrash a slow backend. Type into the document body and keep typing without pausing. The snapshot panel only updates once the debounce window elapses after the last change, so the hook coalesces a burst of edits into a single trailing save.',
  ),

  render: () => <AutosaveDraftExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const textarea = canvas.getByLabelText('Document body')

    await userEvent.type(textarea, 'Ship notes')
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-result')).toHaveTextContent(
        'Ship notes',
      )
      expect(canvas.getByTestId('debounce-pending')).toHaveTextContent('No')
    })

    await expectCodeDisclosure(canvas, autosaveDraftSnippet)
  },
}

export const DynamicDelay: Story = {
  name: 'Dynamic delay',
  ...storyDescription(
    'Change delay at runtime — scheduled work uses the delay active when run() was called; cancel clears pending before disclosure.',
  ),

  render: () => <DynamicDelayExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Draft value')

    await userEvent.type(input, 'alpha')
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-result')).toHaveTextContent('alpha')
    })
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-pending')).toHaveTextContent('No')
    })

    await expectCodeDisclosure(canvas, dynamicDelaySnippet)
  },
}

export const ErrorPropagation: Story = {
  name: 'Error propagation',
  ...storyDescription(
    'Callback errors reject every queued caller — schedule the error payload and read the surfaced message in status.',
  ),

  render: () => <ErrorPropagationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'Schedule error' }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-result')).toHaveTextContent(
        'Example failure',
      )
      expect(canvas.getByTestId('debounce-pending')).toHaveTextContent('No')
    })

    await expectCodeDisclosure(canvas, errorPropagationSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'Tune delay, maxWait, and rejectOnCancel — type a draft value, flush early, and compare the settled result.',
  ),

  render: () => <PlaygroundExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Draft value')

    await userEvent.type(input, 'demo')
    await userEvent.click(canvas.getByRole('button', { name: 'Flush' }))
    await waitFor(() => {
      expect(canvas.getByTestId('debounce-result')).toHaveTextContent('demo')
      expect(canvas.getByTestId('debounce-pending')).toHaveTextContent('No')
    })

    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
