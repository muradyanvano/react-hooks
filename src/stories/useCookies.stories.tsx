import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  AllCookiesExample,
  AutomaticDependenciesExample,
  BasicCookieExample,
  ChangeListenersExample,
  clearAllStoryCookies,
  ConsentPreferenceExample,
  CookieAttributesExample,
  CookieStoreEventsExample,
  CookieUnavailableExample,
  COOKIE_PATH,
  CustomDocumentExample,
  DependenciesExample,
  DoNotParseExample,
  ExternalChangeExample,
  JsonParseErrorRecoveryExample,
  JsonPreferencesExample,
  KEYS,
  LocalePreferencesExample,
  PLAYGROUND_DEFAULT_DEPS,
  PlaygroundExample,
  PollingFallbackExample,
  RemovalPathExample,
  setRawCookie,
  SsrInitialCookiesExample,
  ThemePreferenceExample,
  TwoComponentsExample,
  WithSeed,
} from './components/UseCookiesExamples'
import {
  allCookiesSnippet,
  automaticDependenciesSnippet,
  basicCookieSnippet,
  changeListenersSnippet,
  consentPreferenceSnippet,
  cookieAttributesSnippet,
  cookieStoreEventsSnippet,
  cookieUnavailableSnippet,
  customDocumentSnippet,
  dependenciesSnippet,
  doNotParseSnippet,
  externalChangeSnippet,
  jsonParseErrorSnippet,
  jsonPreferencesSnippet,
  localePreferencesSnippet,
  playgroundSnippet,
  pollingFallbackSnippet,
  removalPathSnippet,
  ssrInitialCookiesSnippet,
  themePreferenceSnippet,
  twoComponentsSnippet,
} from './components/useCookies.snippets'

const meta = {
  title: 'Hooks/useCookies',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Read and write browser cookies reactively with SSR injection, same-document sync, Cookie Store observation, and shared polling fallback.

\`\`\`ts
import { useCookies } from '@muradyanvano/react-hooks'

useCookies(dependencies?: readonly string[] | null, options?: UseCookiesOptions): {
  get,
  getAll,
  set,
  remove,
  refresh,
  addChangeListener,
  removeChangeListener,
  isSupported,
  isReady,
  error,
}
\`\`\`

**Defaults:** \`{ doNotParse: false, autoUpdateDependencies: false, watch: true, pollingInterval: 1000 }\`

**Hydration:** Without \`initialCookies\`, the first client render uses an empty snapshot (\`isReady: false\`) until \`document.cookie\` is read in an effect.

Cookies are not Web Storage. JavaScript cannot read or create HttpOnly cookies. Use valid cookie-name tokens (no \`:\`, spaces, or \`;\`).

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
    a11y: {
      test: 'error',
    },
  },
  argTypes: {
    playgroundDeps: {
      control: 'object',
      description:
        'Dependency list passed to useCookies in the playground story.',
    },
    doNotParse: { control: 'boolean' },
    autoUpdateDependencies: { control: 'boolean' },
    watch: { control: 'boolean' },
    pollingInterval: { control: 'number' },
  },
  args: {
    playgroundDeps: PLAYGROUND_DEFAULT_DEPS,
    doNotParse: false,
    autoUpdateDependencies: false,
    watch: true,
    pollingInterval: 1000,
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
}

async function waitForReady(
  canvas: ReturnType<typeof within>,
  testId: string,
): Promise<void> {
  await waitFor(() => {
    expect(canvas.getByTestId(testId)).toHaveTextContent('true')
  })
}

function cookiePresent(name: string): boolean {
  const prefix = `${encodeURIComponent(name)}=`
  return document.cookie.split(';').some((part) => {
    const trimmed = part.trim()
    return trimmed.startsWith(prefix)
  })
}

export const LocalePreferences: Story = {
  name: 'Locale preferences',
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryCookies()
        setRawCookie(KEYS.locale, 'hy-AM', COOKIE_PATH)
        setRawCookie(KEYS.currency, 'AMD', COOKIE_PATH)
        setRawCookie(KEYS.region, 'AM', COOKIE_PATH)
      }}
    >
      <LocalePreferencesExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'uc-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('locale-value')).toHaveTextContent('hy-AM')
      expect(canvas.getByTestId('currency-value')).toHaveTextContent('AMD')
    })

    await userEvent.selectOptions(canvas.getByTestId('locale-select'), 'fr-FR')
    await waitFor(() => {
      expect(canvas.getByTestId('locale-value')).toHaveTextContent('fr-FR')
      expect(canvas.getByTestId('region-summary').textContent).toContain('FR')
      expect(cookiePresent(KEYS.locale)).toBe(true)
    })

    await userEvent.selectOptions(canvas.getByTestId('currency-select'), 'EUR')
    await waitFor(() => {
      expect(canvas.getByTestId('currency-value')).toHaveTextContent('EUR')
    })

    await userEvent.click(canvas.getByTestId('locale-remove'))
    await waitFor(() => {
      expect(cookiePresent(KEYS.locale)).toBe(false)
    })

    await expectCodeDisclosure(canvas, localePreferencesSnippet)
    clearAllStoryCookies()
  },
}

export const BasicCookie: Story = {
  name: 'Basic cookie',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <BasicCookieExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'basic-ready')
    await userEvent.type(canvas.getByTestId('basic-input'), 'Ada')
    await waitFor(() => {
      expect(canvas.getByTestId('basic-value')).toHaveTextContent('Ada')
      expect(cookiePresent(KEYS.basic)).toBe(true)
    })

    await userEvent.click(canvas.getByTestId('basic-remove'))
    await waitFor(() => {
      expect(cookiePresent(KEYS.basic)).toBe(false)
    })

    await expectCodeDisclosure(canvas, basicCookieSnippet)
    clearAllStoryCookies()
  },
}

export const AllCookies: Story = {
  name: 'All cookies',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <AllCookiesExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'all-ready')
    await userEvent.click(canvas.getByTestId('all-seed-a'))
    await userEvent.click(canvas.getByTestId('all-seed-b'))
    await waitFor(() => {
      expect(canvas.getByTestId('all-count')).toHaveTextContent('2')
    })

    await expectCodeDisclosure(canvas, allCookiesSnippet)
    clearAllStoryCookies()
  },
}

export const JsonPreferences: Story = {
  name: 'JSON preferences',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <JsonPreferencesExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'json-ready')
    await userEvent.click(canvas.getByTestId('json-checkbox'))
    await waitFor(() => {
      expect(canvas.getByTestId('json-notifications')).toHaveTextContent(
        'false',
      )
      expect(canvas.getByTestId('json-raw').textContent).toContain(
        'notifications',
      )
    })

    await expectCodeDisclosure(canvas, jsonPreferencesSnippet)
    clearAllStoryCookies()
  },
}

export const DoNotParse: Story = {
  name: 'doNotParse',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <DoNotParseExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'raw-ready')
    await userEvent.click(canvas.getByTestId('raw-write'))
    await waitFor(() => {
      expect(canvas.getByTestId('parse-default-value').textContent).toContain(
        'true (boolean)',
      )
      expect(canvas.getByTestId('parse-raw-value').textContent).toContain(
        'true (string)',
      )
    })

    await expectCodeDisclosure(canvas, doNotParseSnippet)
    clearAllStoryCookies()
  },
}

export const CookieAttributes: Story = {
  name: 'Cookie attributes',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <CookieAttributesExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'attr-ready')
    await userEvent.click(canvas.getByTestId('attr-set-session'))
    await waitFor(() => {
      expect(canvas.getByTestId('attr-value')).toHaveTextContent(
        'session-token',
      )
      expect(canvas.getByTestId('attr-raw').textContent).toContain(
        KEYS.attributes,
      )
    })

    await expectCodeDisclosure(canvas, cookieAttributesSnippet)
    clearAllStoryCookies()
  },
}

export const ThemePreference: Story = {
  name: 'Theme preference',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <ThemePreferenceExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'theme-ready')
    await userEvent.click(canvas.getByTestId('theme-dark'))
    await waitFor(() => {
      expect(canvas.getByTestId('theme-value')).toHaveTextContent('dark')
      expect(canvas.getByTestId('theme-preview-card')).toHaveTextContent(
        'Demo surface (dark)',
      )
    })

    await expectCodeDisclosure(canvas, themePreferenceSnippet)
    clearAllStoryCookies()
  },
}

export const ConsentPreference: Story = {
  name: 'Consent preference',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <ConsentPreferenceExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'consent-ready')
    expect(canvas.getByTestId('consent-disclaimer')).toBeVisible()
    await userEvent.click(canvas.getByTestId('consent-analytics'))
    await waitFor(() => {
      expect(cookiePresent(KEYS.consent)).toBe(true)
    })

    await expectCodeDisclosure(canvas, consentPreferenceSnippet)
    clearAllStoryCookies()
  },
}

export const Dependencies: Story = {
  name: 'Dependencies',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <DependenciesExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('dep-a-value')).toHaveTextContent('none')
    })

    const renderBefore = Number(
      canvas.getByTestId('dep-render-count').textContent,
    )
    await userEvent.click(canvas.getByTestId('dep-set-b'))
    await waitFor(() => {
      expect(Number(canvas.getByTestId('dep-render-count').textContent)).toBe(
        renderBefore,
      )
    })

    await userEvent.click(canvas.getByTestId('dep-set-a'))
    await waitFor(() => {
      expect(canvas.getByTestId('dep-a-value')).toHaveTextContent(
        'watched-update',
      )
      expect(
        Number(canvas.getByTestId('dep-render-count').textContent),
      ).toBeGreaterThan(renderBefore)
    })

    await expectCodeDisclosure(canvas, dependenciesSnippet)
    clearAllStoryCookies()
  },
}

export const AutomaticDependencies: Story = {
  name: 'Automatic dependencies',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <AutomaticDependenciesExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('auto-value')).toHaveTextContent('(unset)')
    })

    const renderBefore = Number(
      canvas.getByTestId('auto-render-count').textContent,
    )
    await userEvent.click(canvas.getByTestId('auto-set-unrelated'))
    await waitFor(() => {
      expect(Number(canvas.getByTestId('auto-render-count').textContent)).toBe(
        renderBefore,
      )
    })

    await userEvent.click(canvas.getByTestId('auto-set'))
    await waitFor(() => {
      expect(canvas.getByTestId('auto-value')).toHaveTextContent('tracked')
      expect(
        Number(canvas.getByTestId('auto-render-count').textContent),
      ).toBeGreaterThan(renderBefore)
    })

    await expectCodeDisclosure(canvas, automaticDependenciesSnippet)
    clearAllStoryCookies()
  },
}

export const TwoComponents: Story = {
  name: 'Two components',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <TwoComponentsExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(canvas.getByTestId('sync-editor-a'), 'hello sync')
    await waitFor(() => {
      expect(canvas.getByTestId('sync-editor-b')).toHaveTextContent(
        'hello sync',
      )
      expect(cookiePresent(KEYS.twoComponents)).toBe(true)
    })

    await expectCodeDisclosure(canvas, twoComponentsSnippet)
    clearAllStoryCookies()
  },
}

export const ExternalChange: Story = {
  name: 'External change',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <ExternalChangeExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'external-ready')
    await userEvent.click(canvas.getByTestId('external-simulate'))
    await waitFor(() => {
      expect(canvas.getByTestId('external-value')).toHaveTextContent('none')
    })

    await userEvent.click(canvas.getByTestId('external-refresh'))
    await waitFor(() => {
      expect(canvas.getByTestId('external-value')).toHaveTextContent(
        'from-script',
      )
    })

    await expectCodeDisclosure(canvas, externalChangeSnippet)
    clearAllStoryCookies()
  },
}

export const PollingFallback: Story = {
  name: 'Polling fallback',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <PollingFallbackExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('polling-observer')).toHaveTextContent(
        'polling fallback active',
      )
    })

    await userEvent.click(canvas.getByTestId('polling-external-write'))
    await waitFor(
      () => {
        expect(canvas.getByTestId('polling-value')).toHaveTextContent(
          'polled-value',
        )
      },
      { timeout: 3000 },
    )

    await expectCodeDisclosure(canvas, pollingFallbackSnippet)
    clearAllStoryCookies()
  },
}

export const CookieStoreEvents: Story = {
  name: 'Cookie Store events',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <CookieStoreEventsExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'store-ready')
    await userEvent.click(canvas.getByTestId('store-set'))
    await waitFor(() => {
      expect(canvas.getByTestId('store-value')).toHaveTextContent('via-hook')
    })

    await userEvent.click(canvas.getByTestId('store-external'))
    await waitFor(() => {
      expect(canvas.getByTestId('store-value')).toHaveTextContent(
        'via-external',
      )
    })

    await expectCodeDisclosure(canvas, cookieStoreEventsSnippet)
    clearAllStoryCookies()
  },
}

export const RemovalPath: Story = {
  name: 'Removal path',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <RemovalPathExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'path-ready')
    await userEvent.click(canvas.getByTestId('path-set'))
    await waitFor(() => {
      expect(canvas.getByTestId('path-present')).toHaveTextContent('true')
    })

    await userEvent.click(canvas.getByTestId('path-remove-wrong'))
    await waitFor(() => {
      expect(canvas.getByTestId('path-present')).toHaveTextContent('true')
    })

    await userEvent.click(canvas.getByTestId('path-remove-match'))
    await waitFor(() => {
      expect(canvas.getByTestId('path-present')).toHaveTextContent('false')
    })

    await expectCodeDisclosure(canvas, removalPathSnippet)
    clearAllStoryCookies()
  },
}

export const JsonParseErrorRecovery: Story = {
  name: 'JSON parse error recovery',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <JsonParseErrorRecoveryExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'malformed-ready')
    await userEvent.click(canvas.getByTestId('malformed-save-invalid'))
    await waitFor(() => {
      expect(canvas.getByTestId('malformed-error').textContent).not.toBe('none')
      expect(canvas.getByTestId('malformed-alert')).toBeVisible()
    })

    await userEvent.click(canvas.getByTestId('malformed-repair'))
    await waitFor(() => {
      expect(canvas.getByTestId('malformed-error')).toHaveTextContent('none')
      expect(cookiePresent(KEYS.malformed)).toBe(true)
    })

    await expectCodeDisclosure(canvas, jsonParseErrorSnippet)
    clearAllStoryCookies()
  },
}

export const CookieUnavailable: Story = {
  name: 'Cookie unavailable',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <CookieUnavailableExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'blocked-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('blocked-supported')).toHaveTextContent('false')
      expect(canvas.getByTestId('blocked-warning')).toBeVisible()
    })

    await userEvent.clear(canvas.getByTestId('blocked-input'))
    await userEvent.type(canvas.getByTestId('blocked-input'), 'local only')
    await waitFor(() => {
      expect(canvas.getByTestId('blocked-error').textContent).not.toBe('none')
    })

    await expectCodeDisclosure(canvas, cookieUnavailableSnippet)
    clearAllStoryCookies()
  },
}

export const SsrInitialCookies: Story = {
  name: 'SSR initial cookies',
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryCookies()
        setRawCookie(KEYS.locale, 'hy-AM', COOKIE_PATH)
        setRawCookie(KEYS.currency, 'AMD', COOKIE_PATH)
      }}
    >
      <SsrInitialCookiesExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'ssr-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('ssr-locale')).toHaveTextContent('hy-AM')
      expect(canvas.getByTestId('ssr-currency')).toHaveTextContent('AMD')
      expect(canvas.getByTestId('ssr-summary')).toHaveTextContent('hy-AM · AMD')
    })

    await expectCodeDisclosure(canvas, ssrInitialCookiesSnippet)
    clearAllStoryCookies()
  },
}

export const CustomDocument: Story = {
  name: 'Custom document',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <CustomDocumentExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    let iframe: HTMLIFrameElement | null = null

    try {
      await waitFor(
        () => {
          expect(canvas.getByTestId('iframe-ready')).toHaveTextContent('true')
        },
        { timeout: 5000 },
      )
      await waitForReady(canvas, 'iframe-uc-ready')

      await userEvent.clear(canvas.getByTestId('iframe-note-input'))
      await userEvent.type(
        canvas.getByTestId('iframe-note-input'),
        'frame note',
      )
      await waitFor(() => {
        expect(canvas.getByTestId('iframe-value')).toHaveTextContent(
          'frame note',
        )
      })

      iframe = canvas.getByTestId('custom-document-iframe') as HTMLIFrameElement
      await expectCodeDisclosure(canvas, customDocumentSnippet)
    } finally {
      try {
        if (iframe?.contentDocument != null) {
          iframe.contentDocument.cookie = `${encodeURIComponent(KEYS.iframe)}=; Max-Age=0; path=${COOKIE_PATH}`
        }
      } catch {
        // Ignore cross-context cleanup failures.
      }
      clearAllStoryCookies()
    }
  },
}

export const ChangeListeners: Story = {
  name: 'Change listeners',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <ChangeListenersExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'listener-ready')
    await userEvent.click(canvas.getByTestId('listener-set'))
    await waitFor(() => {
      expect(canvas.getByTestId('listener-event-0').textContent).toContain(
        'set',
      )
    })

    await userEvent.click(canvas.getByTestId('listener-remove'))
    await waitFor(() => {
      expect(canvas.getByTestId('listener-event-0').textContent).toContain(
        'remove',
      )
    })

    await userEvent.click(canvas.getByTestId('listener-external'))
    await waitFor(() => {
      expect(canvas.getByTestId('listener-event-0').textContent).toContain(
        'external',
      )
    })

    await expectCodeDisclosure(canvas, changeListenersSnippet)
    clearAllStoryCookies()
  },
}

export const Playground: Story = {
  name: 'Playground',
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <PlaygroundExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('playground-mount'))
    await waitFor(() => {
      expect(canvas.getByTestId('playground-body')).toBeVisible()
    })

    await waitFor(() => {
      expect(canvas.getByTestId('playground-state').textContent).toContain(
        '"isReady": true',
      )
    })

    await userEvent.click(canvas.getByTestId('playground-set'))
    await waitFor(() => {
      expect(canvas.getByTestId('playground-state').textContent).toContain(
        '"value": "playground-value"',
      )
    })

    await expectCodeDisclosure(canvas, playgroundSnippet)
    clearAllStoryCookies()
  },
}
