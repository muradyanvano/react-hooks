import type { Meta, StoryObj } from '@storybook/react-vite'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, userEvent, waitFor, within } from 'storybook/test'

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
import { expectCodeDisclosure } from './components/expectCodeDisclosure'
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
  rapidChangesSnippet,
  unicodeSnippet,
} from './components/useBase64.snippets'

const meta = {
  title: 'Hooks/useBase64',
  tags: ['autodocs'],
  ...createHookStoryMeta('useBase64', Base64StudioExample, {
    a11y: { test: 'error' },
  }),
} satisfies Meta<typeof Base64StudioExample>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Encode text and local binary sources into Base64/data URLs with byte counts. Edit the studio input, toggle data-URL mode, and copy output — no remote assets or credentials.',
  ),

  render: () => <Base64StudioExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Source text')

    await userEvent.clear(input)
    await userEvent.type(input, 'Hook test')
    await waitFor(() => {
      expect(canvas.getByTestId('base64-status')).toHaveTextContent('Ready')
      expect(canvas.getByTestId('base64-output')).toHaveTextContent(
        'SG9vayB0ZXN0',
      )
    })

    await userEvent.click(canvas.getByRole('checkbox'))
    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).not.toHaveTextContent('data:')
    })

    await expectCodeDisclosure(canvas, base64StudioSnippet)
  },
}

export const PlainText: Story = {
  name: 'Plain text',
  ...storyDescription(
    'Embedding small text payloads inline — email templates, config snippets — as data URLs avoids an extra network round trip. This source is plain UTF-8 text with no options set. The hook produces a data: URL wrapping the Base64-encoded bytes, matching the exact known payload shown in the output panel.',
  ),

  render: () => <PlainTextExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent(
        'RmljdGlvbmFsIHByb2plY3QgYnJpZWYu',
      )
      expect(canvas.getByTestId('base64-loading')).toHaveTextContent('false')
    })

    await expectCodeDisclosure(canvas, plainTextSnippet)
  },
}

export const UnicodeAndEmoji: Story = {
  name: 'Unicode and emoji',
  ...storyDescription(
    'Multi-byte characters and emoji are easy to mis-encode if a hook treats strings as single-byte ASCII. This source mixes accented letters and an emoji, with dataUrl disabled to inspect the raw payload. The hook encodes the full UTF-8 byte sequence correctly, so decoding the output reproduces every character without corruption.',
  ),

  render: () => <UnicodeExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent(
        'RmljdGlvbmFsIGNhZsOpIG5vdGU6INWO1aHVttW4IPCfmYI=',
      )
      expect(canvas.getByTestId('base64-output')).not.toHaveTextContent('data:')
    })

    await expectCodeDisclosure(canvas, unicodeSnippet)
  },
}

export const DataUrlVersusPayload: Story = {
  name: 'Data URL versus payload',
  ...storyDescription(
    'Some consumers need a data: URL for an <img src>, others just need the raw Base64 string for JSON or a header. This story sets dataUrl: false on the same source text used elsewhere. The output is the bare Base64 payload with no MIME prefix, letting you compare it directly against the data URL variant.',
  ),

  render: () => <DataUrlExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent(
        'Q29tcGFyZSBib3RoIHJlcHJlc2VudGF0aW9ucy4=',
      )
      expect(canvas.getByTestId('base64-output')).not.toHaveTextContent('data:')
    })

    await expectCodeDisclosure(canvas, dataUrlSnippet)
  },
}

export const BinaryBytes: Story = {
  name: 'Binary bytes',
  ...storyDescription(
    'Encoding binary data — file headers, protocol buffers — needs byte-accurate handling, not text coercion. The source here is a fixed ArrayBufferView with six known bytes, including values outside the printable ASCII range. The hook reads the buffer directly and produces the matching raw Base64 string, confirming byte-level fidelity.',
  ),

  render: () => <BinaryBytesExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent('AAEC/f7/')
      expect(canvas.getByTestId('base64-input-bytes')).toHaveTextContent('6')
    })

    await expectCodeDisclosure(canvas, binaryBytesSnippet)
  },
}

export const FileAndBlob: Story = {
  name: 'File and Blob',
  ...storyDescription(
    'File uploads and in-memory Blobs are common encoding targets — previewing a selected file before sending it, for example. This story hands the hook an in-memory Blob with a text/plain MIME type. Because Blobs carry their own type, the resulting data URL is labeled data:text/plain and wraps the Base64-encoded file content.',
  ),

  render: () => <FileBlobExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent(
        'data:text/plain',
      )
      expect(canvas.getByTestId('base64-output')).toHaveTextContent(
        'RmljdGlvbmFsIGZpbGUgY29udGVudA==',
      )
    })

    await expectCodeDisclosure(canvas, fileBlobSnippet)
  },
}

export const ImagePreview: Story = {
  name: 'Image preview',
  ...storyDescription(
    'Turning an already-loaded <img> into a data URL is useful for caching or export flows that avoid re-fetching the source. The source is a local SVG image element rather than a raw byte source. Encoding an image element is asynchronous, so the output only resolves to a data:image URL once the hook finishes reading the image data.',
  ),

  render: () => <ImagePreviewExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent(
        'data:image',
      )
    })

    await expectCodeDisclosure(canvas, imagePreviewSnippet)
  },
}

export const CanvasArtwork: Story = {
  name: 'Canvas artwork',
  ...storyDescription(
    'Exporting canvas drawings — charts, generated thumbnails — usually means turning pixels into a shareable string. This source is a <canvas> with locally drawn artwork and no explicit output type set. Canvas sources default to PNG, so the hook returns a data:image/png Base64 string representing the current canvas contents.',
  ),

  render: () => <CanvasArtworkExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent(
        'data:image/png',
      )
    })

    await expectCodeDisclosure(canvas, canvasArtworkSnippet)
  },
}

export const CustomSerializer: Story = {
  name: 'Custom serializer',
  ...storyDescription(
    'Arbitrary objects and class instances aren’t encodable on their own — the hook needs a string first. Encoding is attempted on a plain object, so a custom serializer converts it via JSON.stringify before encoding runs. The hook calls that serializer automatically, and the output reflects the exact stringified representation of the object.',
  ),

  render: () => <CustomSerializerExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent(
        'eyJsYWJlbCI6ImZpY3Rpb25hbCIsImNvdW50IjoyfQ==',
      )
    })

    await expectCodeDisclosure(canvas, customSerializerSnippet)
  },
}

export const ManualExecution: Story = {
  name: 'Manual execution',
  ...storyDescription(
    'Encoding on every dependency change wastes work when the caller wants to decide exactly when it runs, like an explicit "Export" button. With enabled: false, the hook stays idle and the output panel reads "Not encoded yet". Clicking Encode now calls execute() directly, triggering encoding on demand instead of automatically.',
  ),

  render: () => <ManualExecutionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByTestId('base64-output')).toHaveTextContent(
      'Not encoded yet',
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Encode now' }))
    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent(
        'RmljdGlvbmFs',
      )
    })

    await expectCodeDisclosure(canvas, manualExecutionSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  ...storyDescription(
    'Toggling encoding off should stop producing stale output rather than freezing on the last computed value. The story starts with automatic encoding on, then toggles it off and back on repeatedly. Disabling clears the result to Idle immediately, and re-enabling resumes encoding from the current source.',
  ),

  render: () => <EnabledStateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const checkbox = canvas.getByRole('checkbox', {
      name: 'Automatic encoding',
    })

    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).not.toHaveTextContent('Idle')
    })

    await userEvent.click(checkbox)
    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent('Idle')
    })

    await userEvent.click(checkbox)
    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).not.toHaveTextContent('Idle')
    })

    await userEvent.click(checkbox)
    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent('Idle')
    })

    await expectCodeDisclosure(canvas, enabledStateSnippet)
  },
}

export const RapidChanges: Story = {
  name: 'Rapid changes',
  ...storyDescription(
    'Fast-changing input — live typing, streaming values — risks an async encode from an old value overwriting a newer result if requests race. Clearing and typing into the rapid value field fires several encodes in quick succession. The hook discards stale in-flight results, so output always reflects the latest committed value rather than whichever async call finishes last.',
  ),

  render: () => <RapidChangesExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Rapid value')

    await userEvent.clear(input)
    await userEvent.type(input, 'beta')
    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent('YmV0YQ==')
    })

    await expectCodeDisclosure(canvas, rapidChangesSnippet)
  },
}

export const ErrorHandling: Story = {
  name: 'Error handling',
  ...storyDescription(
    'A misconfigured option — like an out-of-range JPEG quality — should fail loudly instead of silently producing bad output. This story passes a quality value outside the valid 0–1 range. The hook surfaces a validation error message instead of returning any encoded output, so misconfiguration is caught immediately.',
  ),

  render: () => <ErrorHandlingExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(
        canvas.getByTestId('base64-error').textContent?.length ?? 0,
      ).toBeGreaterThan(10)
    })

    await expectCodeDisclosure(canvas, errorHandlingSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'Mount-gated Base64 studio for Docs — start the playground, edit source text, and confirm encoding updates.',
  ),

  render: () => <PlaygroundExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('base64-playground-mount'))
    const input = await canvas.findByLabelText('Source text')
    await userEvent.clear(input)
    await userEvent.type(input, 'Playground')
    await waitFor(() => {
      expect(canvas.getByTestId('base64-output')).toHaveTextContent(
        'UGxheWdyb3VuZA==',
      )
    })

    // After mount the studio example owns the disclosure snippet.
    await expectCodeDisclosure(canvas, base64StudioSnippet)
  },
}
