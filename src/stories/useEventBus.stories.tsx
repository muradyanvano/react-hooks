import type { Meta, StoryObj } from '@storybook/react-vite'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import {
  ActivityCenterExample,
  BasicExample,
  DynamicKeyExample,
  ErrorIsolationExample,
  IndependentChannelsExample,
  MultipleSubscribersExample,
  NestedEmitExample,
  OnceExample,
  PayloadExample,
  PlaygroundExample,
  ResetExample,
  TypedSymbolExample,
  UnmountCleanupExample,
  UnsubscribeExample,
} from './components/UseEventBusExamples'
import { expectCodeDisclosure } from './components/expectCodeDisclosure'
import {
  activityCenterSnippet,
  basicSnippet,
  dynamicKeySnippet,
  errorIsolationSnippet,
  independentChannelsSnippet,
  multipleSubscribersSnippet,
  nestedEmitSnippet,
  onceSnippet,
  payloadSnippet,
  playgroundSnippet,
  resetSnippet,
  typedSymbolSnippet,
  unmountCleanupSnippet,
  unsubscribeSnippet,
} from './components/useEventBus.snippets'

const meta = {
  title: 'Hooks/useEventBus',
  tags: ['autodocs'],
  ...createHookStoryMeta('useEventBus', PlaygroundExample, {
    a11y: { test: 'error' },
  }),
} satisfies Meta<typeof PlaygroundExample>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'In-memory publishers and subscribers on a channel — not storage, not cross-tab. Publish an invoice event, watch the timeline and once-listener, then Reset the channel. Ownership ends when listeners unsubscribe.',
  ),

  render: () => <ActivityCenterExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'Invoice sent' }))
    await waitFor(() => {
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        'Invoice sent',
      )
      expect(canvas.getByTestId('eventbus-deliveries')).not.toHaveTextContent(
        '0',
      )
    })

    await expectCodeDisclosure(canvas, activityCenterSnippet)
  },
}

export const BasicEmitAndListen: Story = {
  name: 'Basic emit and listen',
  ...storyDescription(
    'A component needs to react to an event fired elsewhere without any shared component tree connecting them. This example subscribes to a channel after mount, then emits a single typed event via the button. The timeline records the delivered event name and payload immediately, confirming subscribe-then-emit ordering works within one channel.',
  ),

  render: () => <BasicExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'Emit fictional event' }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        'fictional.event: example payload',
      )
      expect(canvas.getByTestId('eventbus-deliveries')).toHaveTextContent('1')
    })

    await expectCodeDisclosure(canvas, basicSnippet)
  },
}

export const TypedSymbolKey: Story = {
  name: 'Typed symbol key',
  ...storyDescription(
    'String channel keys can collide across unrelated features sharing one event bus. Using a Symbol instead guarantees the channel is only reachable by consumers holding a reference to that exact symbol. Emitting on the symbol-backed bus delivers normally and logs in the timeline, but no string key could ever address this channel by accident.',
  ),

  render: () => <TypedSymbolExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'Emit fictional event' }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        'fictional.event',
      )
      expect(canvas.getByTestId('eventbus-deliveries')).toHaveTextContent('1')
    })

    await expectCodeDisclosure(canvas, typedSymbolSnippet)
  },
}

export const EventPayload: Story = {
  name: 'Event payload',
  ...storyDescription(
    'Listeners often need structured data alongside the event name, not just a bare signal. This example emits a typed event carrying a payload object. The timeline shows the payload arriving with the event, confirming the hook passes arguments through to subscribers unchanged.',
  ),

  render: () => <PayloadExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'Emit fictional event' }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        'example payload',
      )
    })

    await expectCodeDisclosure(canvas, payloadSnippet)
  },
}

export const MultipleSubscribers: Story = {
  name: 'Multiple subscribers',
  ...storyDescription(
    'A single event often needs to fan out to several independent parts of a UI — analytics, a toast, a badge counter. Two separate listeners subscribe to the same channel here. One emit delivers to both, so the timeline logs First and Second entries and the delivery counter reads 2 rather than 1.',
  ),

  render: () => <MultipleSubscribersExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'Emit to both' }))
    await waitFor(() => {
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        'First:',
      )
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        'Second:',
      )
      expect(canvas.getByTestId('eventbus-deliveries')).toHaveTextContent('2')
    })

    await expectCodeDisclosure(canvas, multipleSubscribersSnippet)
  },
}

export const OnceListener: Story = {
  name: 'Once listener',
  ...storyDescription(
    'Some listeners should only react to the very first occurrence of an event — a one-time onboarding tip, for instance. This listener is registered with the once option. Emitting twice only produces a single [once] entry in the timeline, since the hook unsubscribes the listener automatically after its first delivery.',
  ),

  render: () => <OnceExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const emit = canvas.getByRole('button', { name: 'Emit fictional event' })

    await userEvent.click(emit)
    await userEvent.click(emit)
    await waitFor(() => {
      const timeline = canvas.getByTestId('eventbus-timeline').textContent ?? ''
      expect(timeline.match(/\[once\]/g)?.length ?? 0).toBe(1)
    })

    await expectCodeDisclosure(canvas, onceSnippet)
  },
}

export const Unsubscribe: Story = {
  name: 'Unsubscribe',
  ...storyDescription(
    'Listeners that outlive their component leak memory and can fire on stale state. This example relies on effect cleanup to remove its listener when the component unmounts. While mounted, emitting delivers normally and logs in the timeline; unmounting drops the subscription without any manual unsubscribe call from the consumer.',
  ),

  render: () => <UnsubscribeExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'Emit fictional event' }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        'fictional.event',
      )
      expect(canvas.getByTestId('eventbus-deliveries')).toHaveTextContent('1')
    })

    await expectCodeDisclosure(canvas, unsubscribeSnippet)
  },
}

export const ResetChannel: Story = {
  name: 'Reset channel',
  ...storyDescription(
    'Tearing down a whole feature — closing a modal, resetting a wizard — sometimes means clearing every listener on its channel at once rather than unsubscribing one by one. reset() removes every subscriber from this channel in a single call. Only listeners re-registered afterward receive a following emit, as reflected in the delivery counter.',
  ),

  render: () => <ResetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'Emit fictional event' }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        'fictional.event',
      )
      expect(canvas.getByTestId('eventbus-deliveries')).toHaveTextContent('1')
    })

    await expectCodeDisclosure(canvas, resetSnippet)
  },
}

export const IndependentChannels: Story = {
  name: 'Independent channels',
  ...storyDescription(
    'Two unrelated features sharing an event bus module must not leak events into each other’s channels. This example emits on a channel key distinct from every other story’s channel. The timeline only ever logs deliveries local to this key, confirming channels are isolated by key rather than sharing one global stream.',
  ),

  render: () => <IndependentChannelsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'Emit fictional event' }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        'fictional.event',
      )
    })

    await expectCodeDisclosure(canvas, independentChannelsSnippet)
  },
}

export const DynamicKey: Story = {
  name: 'Dynamic key',
  ...storyDescription(
    'Switching context — moving between projects in a dashboard, say — should drop the old subscription instead of leaving it listening in the background. Changing the active project repoints the hook at a new channel key and releases the previous one. Emitting on the new project’s channel logs an entry prefixed with that key, while the old channel receives nothing further.',
  ),

  render: () => <DynamicKeyExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: /Emit on project-a/ }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        '[project-a]',
      )
    })

    await expectCodeDisclosure(canvas, dynamicKeySnippet)
  },
}

export const NestedEmit: Story = {
  name: 'Nested emit',
  ...storyDescription(
    'Listeners sometimes need to trigger further events as a reaction — a notification that itself dispatches a follow-up event. This listener emits synchronously from inside its own callback while handling dispatch. The nested emit resolves before the outer one completes, and the timeline records the delivery without deadlocking or dropping the follow-up.',
  ),

  render: () => <NestedEmitExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'Emit fictional event' }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        'fictional.event',
      )
    })

    await expectCodeDisclosure(canvas, nestedEmitSnippet)
  },
}

export const ErrorIsolation: Story = {
  name: 'Error isolation',
  ...storyDescription(
    'One misbehaving listener throwing an error shouldn’t prevent other subscribers on the same channel from running. Emitting with failure triggers a listener that throws alongside a healthy one on the same channel. The healthy listener’s result still updates and the timeline logs “Healthy listener ran”, confirming the hook isolates each listener’s execution.',
  ),

  render: () => <ErrorIsolationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'Emit with failure' }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('eventbus-result')).toHaveTextContent(
        'error dispatched after healthy listener',
      )
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        'Healthy listener ran',
      )
    })

    await expectCodeDisclosure(canvas, errorIsolationSnippet)
  },
}

export const ComponentUnmountCleanup: Story = {
  name: 'Component unmount cleanup',
  ...storyDescription(
    'Toggling a subscriber component in and out of the tree — a collapsible panel, a conditional route — must not accumulate duplicate listeners on remount. Unmounting the subscriber flips its status text and removes its subscription; mounting it again re-subscribes fresh. Only that instance’s listener is affected, so other subscribers on the same channel stay intact.',
  ),

  render: () => <UnmountCleanupExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByTestId('eventbus-subscriber-status'),
    ).toHaveTextContent('Subscriber mounted')
    await userEvent.click(
      canvas.getByRole('button', { name: 'Unmount subscriber' }),
    )
    await waitFor(() => {
      expect(
        canvas.getByTestId('eventbus-subscriber-status'),
      ).toHaveTextContent('Subscriber unmounted')
    })
    await userEvent.click(
      canvas.getByRole('button', { name: 'Mount subscriber' }),
    )
    await waitFor(() => {
      expect(
        canvas.getByTestId('eventbus-subscriber-status'),
      ).toHaveTextContent('Subscriber mounted')
    })

    await expectCodeDisclosure(canvas, unmountCleanupSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'Local event bus sandbox — emit a previewed fictional payload and confirm the timeline delivery count increments.',
  ),

  render: () => <PlaygroundExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'Emit fictional event' }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('eventbus-timeline')).toHaveTextContent(
        'fictional.event',
      )
      expect(canvas.getByTestId('eventbus-deliveries')).toHaveTextContent('1')
    })

    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
