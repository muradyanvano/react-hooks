import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  BasicControlledExample,
  CurrentPreviewDocumentExample,
  CustomRelationExample,
  DynamicDocumentExample,
  EnabledStateExample,
  ExistingRestoreExample,
  FaviconSwitcherExample,
  IsolatedIframeExample,
  MultipleOwnersExample,
  NotificationBadgeExample,
  NullIconExample,
  PersistentFaviconExample,
  PlaygroundExample,
  RelativeBaseUrlExample,
  StatusIconsExample,
  SvgDataUrlExample,
  ThemeAwareExample,
} from './components/UseFaviconExamples'
import {
  basicControlledSnippet,
  currentPreviewDocumentSnippet,
  customRelationSnippet,
  dynamicDocumentSnippet,
  enabledStateSnippet,
  existingRestoreSnippet,
  faviconSwitcherSnippet,
  isolatedIframeSnippet,
  multipleOwnersSnippet,
  notificationBadgeSnippet,
  nullIconSnippet,
  persistentFaviconSnippet,
  playgroundSnippet,
  relativeBaseUrlSnippet,
  statusIconsSnippet,
  svgDataUrlSnippet,
  themeAwareSnippet,
} from './components/useFavicon.snippets'
import {
  ICON_AMBER,
  ICON_BLUE,
  ICON_GREEN,
  SAMPLE_BASE_URL,
  SAMPLE_RELATIVE_ICON,
} from './components/useFavicon.fictional'

const meta = {
  title: 'Hooks/useFavicon',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Control a document favicon \`<link>\` through shared private ownership.

\`\`\`ts
import { useFavicon } from '@muradyanvano/react-hooks'

useFavicon(icon, options?): { href, isSupported, error }
\`\`\`

**Defaults:** \`enabled: true\`, \`rel: 'icon'\`, \`restoreOnUnmount: true\`

Most demos use an isolated same-origin iframe document so Storybook manager/preview favicons stay untouched. Browser tab icons may still cache or delay refresh.

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
    a11y: {
      test: 'error',
    },
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

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const highlighted = await canvas.findByTestId('highlighted-code')
  await expect(highlighted).toBeVisible()
  await expect(highlighted.textContent?.trim().length ?? 0).toBeGreaterThan(0)

  const writeText = fn(async () => undefined)
  const originalClipboard = navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  try {
    await userEvent.click(canvas.getByTestId('copy-code'))
    await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
  } finally {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
  }

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
}

function iframeDocument(
  canvas: ReturnType<typeof within>,
  testId: string,
): Document {
  const frame = canvas.getByTestId(testId) as HTMLIFrameElement
  const doc = frame.contentDocument
  if (!doc) {
    throw new Error(`Missing contentDocument for ${testId}`)
  }
  return doc
}

function lastIconHref(doc: Document, rel = 'icon'): string | null {
  const links = Array.from(doc.head.querySelectorAll('link'))
  const wanted = rel
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.toLowerCase())
  const matches = links.filter((link) => {
    const tokens = (link.getAttribute('rel') ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token.toLowerCase())
    return (
      wanted.length > 0 &&
      wanted.every((token) => tokens.includes(token)) &&
      tokens.length === wanted.length
    )
  })
  return matches.at(-1)?.getAttribute('href') ?? null
}

async function waitForIframeReady(
  canvas: ReturnType<typeof within>,
  testId: string,
) {
  await waitFor(() => {
    const frame = canvas.getByTestId(testId) as HTMLIFrameElement
    expect(frame.contentDocument?.readyState).toBe('complete')
  })
}

async function waitForHref(
  canvas: ReturnType<typeof within>,
  iframeTestId: string,
  expected: string | null,
  rel = 'icon',
) {
  await waitFor(() => {
    const doc = iframeDocument(canvas, iframeTestId)
    expect(lastIconHref(doc, rel)).toBe(expected)
  })
}

export const FaviconSwitcher: Story = {
  name: 'Favicon switcher',
  render: () => <FaviconSwitcherExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'switcher-iframe')

    await waitFor(() => {
      expect(canvas.getByTestId('switcher-supported')).toHaveTextContent('true')
    })

    await waitForHref(canvas, 'switcher-iframe', ICON_BLUE)

    await userEvent.click(canvas.getByTestId('switcher-icon-green'))
    await waitForHref(canvas, 'switcher-iframe', ICON_GREEN)
    await expect(canvas.getByTestId('switcher-selected')).toHaveTextContent(
      'Green',
    )

    await userEvent.click(canvas.getByTestId('switcher-icon-blue'))
    await waitForHref(canvas, 'switcher-iframe', ICON_BLUE)

    await userEvent.click(canvas.getByTestId('switcher-reset'))
    await waitForHref(canvas, 'switcher-iframe', null)

    await expectCodeDisclosure(canvas, faviconSwitcherSnippet)
  },
}

export const BasicControlled: Story = {
  name: 'Basic controlled favicon',
  render: () => <BasicControlledExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'basic-iframe')
    await waitForHref(canvas, 'basic-iframe', ICON_BLUE)
    await userEvent.click(canvas.getByTestId('basic-green'))
    await waitForHref(canvas, 'basic-iframe', ICON_GREEN)
    await expectCodeDisclosure(canvas, basicControlledSnippet)
  },
}

export const RelativeBaseUrl: Story = {
  name: 'Relative URL with base URL',
  render: () => <RelativeBaseUrlExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'relative-iframe')
    const expected = new URL(SAMPLE_RELATIVE_ICON, SAMPLE_BASE_URL).href
    await waitFor(() => {
      expect(canvas.getByTestId('relative-href')).toHaveTextContent(expected)
    })
    await waitForHref(canvas, 'relative-iframe', expected)
    await expectCodeDisclosure(canvas, relativeBaseUrlSnippet)
  },
}

export const SvgDataUrl: Story = {
  name: 'SVG data URL',
  render: () => <SvgDataUrlExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'svg-iframe')
    await waitForHref(canvas, 'svg-iframe', ICON_BLUE)
    await userEvent.click(canvas.getByTestId('svg-apply'))
    await waitForHref(canvas, 'svg-iframe', ICON_GREEN)
    await expectCodeDisclosure(canvas, svgDataUrlSnippet)
  },
}

export const NotificationBadge: Story = {
  name: 'Notification badge favicon',
  render: () => <NotificationBadgeExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'badge-iframe')
    await waitFor(() => {
      expect(canvas.getByTestId('badge-count')).toHaveTextContent('3')
    })
    const before = lastIconHref(iframeDocument(canvas, 'badge-iframe'))
    await userEvent.click(canvas.getByTestId('badge-increase'))
    await waitFor(() => {
      expect(canvas.getByTestId('badge-count')).toHaveTextContent('4')
      expect(lastIconHref(iframeDocument(canvas, 'badge-iframe'))).not.toBe(
        before,
      )
    })
    await expectCodeDisclosure(canvas, notificationBadgeSnippet)
  },
}

export const ThemeAware: Story = {
  name: 'Theme-aware light/dark favicon',
  render: () => <ThemeAwareExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'theme-iframe')
    const before = lastIconHref(iframeDocument(canvas, 'theme-iframe'))
    await userEvent.click(canvas.getByTestId('theme-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('theme-value')).toHaveTextContent('dark')
      expect(lastIconHref(iframeDocument(canvas, 'theme-iframe'))).not.toBe(
        before,
      )
    })
    await expectCodeDisclosure(canvas, themeAwareSnippet)
  },
}

export const StatusIcons: Story = {
  name: 'Loading/success/error status icons',
  render: () => <StatusIconsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'status-iframe')
    await userEvent.click(canvas.getByTestId('status-success'))
    await waitFor(() => {
      expect(canvas.getByTestId('status-value')).toHaveTextContent('success')
    })
    await userEvent.click(canvas.getByTestId('status-error'))
    await waitFor(() => {
      expect(canvas.getByTestId('status-value')).toHaveTextContent('error')
    })
    await expectCodeDisclosure(canvas, statusIconsSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'enabled-iframe')
    await waitForHref(canvas, 'enabled-iframe', ICON_BLUE)
    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await waitForHref(canvas, 'enabled-iframe', null)
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-href')).toHaveTextContent('none')
    })
    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await waitForHref(canvas, 'enabled-iframe', ICON_BLUE)
    await expectCodeDisclosure(canvas, enabledStateSnippet)
  },
}

export const NullIcon: Story = {
  name: 'Null icon and restoration',
  render: () => <NullIconExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'null-iframe')
    await waitForHref(canvas, 'null-iframe', ICON_BLUE)
    await userEvent.click(canvas.getByTestId('null-clear'))
    await waitForHref(canvas, 'null-iframe', null)
    await userEvent.click(canvas.getByTestId('null-restore'))
    await waitForHref(canvas, 'null-iframe', ICON_BLUE)
    await expectCodeDisclosure(canvas, nullIconSnippet)
  },
}

export const ExistingRestore: Story = {
  name: 'Existing favicon restoration',
  render: () => <ExistingRestoreExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'existing-iframe')
    await waitForHref(canvas, 'existing-iframe', ICON_GREEN)
    await userEvent.click(canvas.getByTestId('existing-unmount'))
    await waitForHref(canvas, 'existing-iframe', ICON_AMBER)
    await expectCodeDisclosure(canvas, existingRestoreSnippet)
  },
}

export const MultipleOwners: Story = {
  name: 'Multiple hook owners',
  render: () => <MultipleOwnersExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'owners-iframe')
    await waitFor(() => {
      const href = lastIconHref(iframeDocument(canvas, 'owners-iframe'))
      expect(href === ICON_BLUE || href === ICON_GREEN).toBe(true)
    })
    await userEvent.click(canvas.getByTestId('owners-toggle-b'))
    await waitFor(() => {
      expect(canvas.getByTestId('owners-b')).toHaveTextContent('false')
    })
    await userEvent.click(canvas.getByTestId('owners-toggle-a'))
    await waitFor(() => {
      expect(canvas.getByTestId('owners-a')).toHaveTextContent('false')
    })
    await expectCodeDisclosure(canvas, multipleOwnersSnippet)
  },
}

export const CustomRelation: Story = {
  name: 'Custom relation',
  render: () => <CustomRelationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'rel-iframe')
    await waitForHref(canvas, 'rel-iframe', ICON_BLUE, 'apple-touch-icon')
    await userEvent.click(canvas.getByTestId('rel-mask'))
    await waitForHref(canvas, 'rel-iframe', ICON_BLUE, 'mask-icon')
    await expect(canvas.getByTestId('rel-value')).toHaveTextContent('mask-icon')
    await expectCodeDisclosure(canvas, customRelationSnippet)
  },
}

export const DynamicDocument: Story = {
  name: 'Dynamic document',
  render: () => <DynamicDocumentExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'dynamic-iframe-a')
    await waitForIframeReady(canvas, 'dynamic-iframe-b')
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-href').textContent).not.toBe('none')
    })
    await userEvent.click(canvas.getByTestId('dynamic-b'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-target')).toHaveTextContent('b')
    })
    await userEvent.click(canvas.getByTestId('dynamic-none'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-href')).toHaveTextContent('none')
      expect(canvas.getByTestId('dynamic-supported')).toHaveTextContent('false')
    })
    await expectCodeDisclosure(canvas, dynamicDocumentSnippet)
  },
}

export const IsolatedIframe: Story = {
  name: 'Isolated iframe document',
  render: () => <IsolatedIframeExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'isolated-iframe')
    await waitFor(() => {
      expect(canvas.getByTestId('iframe-href')).toHaveTextContent(ICON_GREEN)
    })
    await expectCodeDisclosure(canvas, isolatedIframeSnippet)
  },
}

export const PersistentFavicon: Story = {
  name: 'Persistent favicon with restoreOnUnmount false',
  render: () => <PersistentFaviconExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const previewBefore = lastIconHref(document)
    await waitForIframeReady(canvas, 'persist-iframe')
    await waitForHref(canvas, 'persist-iframe', ICON_AMBER)
    await userEvent.click(canvas.getByTestId('persist-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('persist-mounted')).toHaveTextContent('false')
    })
    await waitForHref(canvas, 'persist-iframe', ICON_AMBER)
    await expect(lastIconHref(document)).toBe(previewBefore)
    await expectCodeDisclosure(canvas, persistentFaviconSnippet)
    // Remove the isolated iframe fixture so persistence cannot outlive the story.
    canvas.getByTestId('persist-iframe').remove()
    await expect(lastIconHref(document)).toBe(previewBefore)
  },
}

export const Playground: Story = {
  name: 'Playground',
  render: () => <PlaygroundExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForIframeReady(canvas, 'playground-iframe')
    await expect(canvas.getByTestId('playground-mounted')).toHaveTextContent(
      'false',
    )
    await userEvent.click(canvas.getByTestId('playground-mount'))
    await waitForHref(canvas, 'playground-iframe', ICON_BLUE)
    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}

export const CurrentPreviewDocument: Story = {
  name: 'Current preview document',
  render: () => <CurrentPreviewDocumentExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const original = lastIconHref(document)

    try {
      await userEvent.click(canvas.getByTestId('preview-mount'))
      await waitFor(() => {
        expect(canvas.getByTestId('preview-href')).toHaveTextContent(ICON_BLUE)
      })

      await userEvent.click(canvas.getByTestId('preview-unmount'))
      await waitFor(() => {
        expect(canvas.getByTestId('preview-href')).toHaveTextContent('none')
        expect(lastIconHref(document)).toBe(original)
      })

      await expectCodeDisclosure(canvas, currentPreviewDocumentSnippet)
    } finally {
      const unmount = canvas.queryByTestId('preview-unmount')
      if (unmount) {
        await userEvent.click(unmount)
      }
      await waitFor(() => {
        expect(lastIconHref(document)).toBe(original)
      })
    }
  },
}
