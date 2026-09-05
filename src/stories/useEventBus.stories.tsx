import type { Meta, StoryObj } from '@storybook/react-vite'

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
import { disclosurePlay } from './components/expectCodeDisclosure'
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
  title: 'Hooks / useEventBus',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: { sourceState: 'none' },
      description: {
        component: `
Shares synchronous, in-memory events between mounted \`useEventBus\` owners with the same string, number, or symbol key.

\`\`\`ts
const bus = useEventBus<Event, Payload>(key)
const stop = bus.on(listener)
bus.emit(event, payload)
\`\`\`

Subscriptions belong to a hook instance and are removed on unmount. \`reset()\` is broader: it clears all listeners on the channel across owners. Channels are scoped to this JavaScript realm and package copy; they do not persist, synchronize across tabs, or perform network work. Subscribe from effects or event handlers, never during render.
        `,
      },
    },
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof PlaygroundExample>

export default meta
type Story = StoryObj<typeof meta>

export const ActivityCenter: Story = {
  name: 'Event bus activity center',
  render: () => <ActivityCenterExample />,
  play: disclosurePlay(activityCenterSnippet),
}
export const BasicEmitAndListen: Story = {
  name: 'Basic emit and listen',
  render: () => <BasicExample />,
  play: disclosurePlay(basicSnippet),
}
export const TypedSymbolKey: Story = {
  name: 'Typed symbol key',
  render: () => <TypedSymbolExample />,
  play: disclosurePlay(typedSymbolSnippet),
}
export const EventPayload: Story = {
  name: 'Event payload',
  render: () => <PayloadExample />,
  play: disclosurePlay(payloadSnippet),
}
export const MultipleSubscribers: Story = {
  name: 'Multiple subscribers',
  render: () => <MultipleSubscribersExample />,
  play: disclosurePlay(multipleSubscribersSnippet),
}
export const OnceListener: Story = {
  name: 'Once listener',
  render: () => <OnceExample />,
  play: disclosurePlay(onceSnippet),
}
export const Unsubscribe: Story = {
  name: 'Unsubscribe',
  render: () => <UnsubscribeExample />,
  play: disclosurePlay(unsubscribeSnippet),
}
export const ResetChannel: Story = {
  name: 'Reset channel',
  render: () => <ResetExample />,
  play: disclosurePlay(resetSnippet),
}
export const IndependentChannels: Story = {
  name: 'Independent channels',
  render: () => <IndependentChannelsExample />,
  play: disclosurePlay(independentChannelsSnippet),
}
export const DynamicKey: Story = {
  name: 'Dynamic key',
  render: () => <DynamicKeyExample />,
  play: disclosurePlay(dynamicKeySnippet),
}
export const NestedEmit: Story = {
  name: 'Nested emit',
  render: () => <NestedEmitExample />,
  play: disclosurePlay(nestedEmitSnippet),
}
export const ErrorIsolation: Story = {
  name: 'Error isolation',
  render: () => <ErrorIsolationExample />,
  play: disclosurePlay(errorIsolationSnippet),
}
export const ComponentUnmountCleanup: Story = {
  name: 'Component unmount cleanup',
  render: () => <UnmountCleanupExample />,
  play: disclosurePlay(unmountCleanupSnippet),
}
export const Playground: Story = {
  name: 'Playground',
  render: () => <PlaygroundExample />,
  play: disclosurePlay(playgroundSnippet),
}
