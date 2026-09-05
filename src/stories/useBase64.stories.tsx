import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  Base64StudioExample,
  BinaryBytesExample,
  CanvasArtworkExample,
  CustomSerializerExample,
  DataUrlExample,
  EnabledStateExample,
  ErrorHandlingExample,
  FileBlobExample,
  ImagePreviewExample,
  ManualExecutionExample,
  PlainTextExample,
  PlaygroundExample,
  RapidChangesExample,
  UnicodeExample,
} from './components/UseBase64Examples'
import { disclosurePlay } from './components/expectCodeDisclosure'
import {
  base64StudioSnippet,
  binaryBytesSnippet,
  canvasArtworkSnippet,
  customSerializerSnippet,
  dataUrlSnippet,
  enabledStateSnippet,
  errorHandlingSnippet,
  fileBlobSnippet,
  imagePreviewSnippet,
  manualExecutionSnippet,
  plainTextSnippet,
  playgroundSnippet,
  rapidChangesSnippet,
  unicodeSnippet,
} from './components/useBase64.snippets'

const meta = {
  title: 'Hooks / useBase64',
  component: Base64StudioExample,
  parameters: {
    layout: 'fullscreen',
    docs: { canvas: { sourceState: 'none' } },
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof Base64StudioExample>

export default meta
type Story = StoryObj<typeof meta>

export const Base64Studio: Story = {
  name: 'Base64 studio',
  render: () => <Base64StudioExample />,
  play: disclosurePlay(base64StudioSnippet),
}
export const PlainText: Story = {
  name: 'Plain text',
  render: () => <PlainTextExample />,
  play: disclosurePlay(plainTextSnippet),
}
export const UnicodeAndEmoji: Story = {
  name: 'Unicode and emoji',
  render: () => <UnicodeExample />,
  play: disclosurePlay(unicodeSnippet),
}
export const DataUrlVersusPayload: Story = {
  name: 'Data URL versus payload',
  render: () => <DataUrlExample />,
  play: disclosurePlay(dataUrlSnippet),
}
export const BinaryBytes: Story = {
  name: 'Binary bytes',
  render: () => <BinaryBytesExample />,
  play: disclosurePlay(binaryBytesSnippet),
}
export const FileAndBlob: Story = {
  name: 'File and Blob',
  render: () => <FileBlobExample />,
  play: disclosurePlay(fileBlobSnippet),
}
export const ImagePreview: Story = {
  name: 'Image preview',
  render: () => <ImagePreviewExample />,
  play: disclosurePlay(imagePreviewSnippet),
}
export const CanvasArtwork: Story = {
  name: 'Canvas artwork',
  render: () => <CanvasArtworkExample />,
  play: disclosurePlay(canvasArtworkSnippet),
}
export const CustomSerializer: Story = {
  name: 'Custom serializer',
  render: () => <CustomSerializerExample />,
  play: disclosurePlay(customSerializerSnippet),
}
export const ManualExecution: Story = {
  name: 'Manual execution',
  render: () => <ManualExecutionExample />,
  play: disclosurePlay(manualExecutionSnippet),
}
export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample />,
  play: disclosurePlay(enabledStateSnippet),
}
export const RapidChanges: Story = {
  name: 'Rapid changes',
  render: () => <RapidChangesExample />,
  play: disclosurePlay(rapidChangesSnippet),
}
export const ErrorHandling: Story = {
  name: 'Error handling',
  render: () => <ErrorHandlingExample />,
  play: disclosurePlay(errorHandlingSnippet),
}
export const Playground: Story = {
  name: 'Playground',
  render: () => <PlaygroundExample />,
  play: disclosurePlay(playgroundSnippet),
}
