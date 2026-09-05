import type { Meta, StoryObj } from '@storybook/react-vite'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
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
import { waitForDisclosedCode } from './components/expectCodeDisclosure'

const meta = {
  title: 'Hooks/useCookies',
  tags: ['autodocs'],
  ...createHookStoryMeta('useCookies', PlaygroundExample, {
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
  }),
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
  const highlighted = await waitForDisclosedCode(canvas)
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

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Locale and preference cookies with readable table + raw document.cookie. Change language/currency, inspect attributes, then reset/remove with matching path. Use valid cookie-name tokens; never store secrets.',
  ),
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
  ...storyDescription(
    'A form field that should remember its value across a page reload, like a name field on a multi-step signup, needs somewhere to persist outside component state. Typing into the input writes a cookie on every change. Removing the cookie clears both the stored value and the underlying document.cookie entry, so no stale value survives the removal.',
  ),
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
  ...storyDescription(
    "A cookie consent banner or debug panel often needs to enumerate every cookie present, not just one the app manages itself. Clicking the two seed buttons writes two independent cookies outside the hook's own key. The hook's returned collection reflects both entries, so its count updates to match whatever cookies exist in the document — including ones it didn't set.",
  ),
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
  ...storyDescription(
    'Storing structured preferences, such as notification settings, in a cookie still means the raw string has to become a usable value on every read. Toggling the checkbox writes an updated object to the cookie. The hook parses the raw JSON automatically, so the notifications field reflects the new boolean without a manual JSON.parse call in the consumer.',
  ),
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
  ...storyDescription(
    'Some cookies are written by external code as raw strings and should stay untouched rather than being coerced to booleans or numbers. Writing "true" externally here is read two ways: the default hook parses it into the boolean true, while a doNotParse: true instance keeps it as the literal string "true". The distinction matters whenever a cookie\'s raw format needs to survive round-trips unmodified.',
  ),
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
  ...storyDescription(
    "Session-only cookies, secure cookies, and cookies scoped to a subpath all rely on attributes that never appear in the parsed value itself. Setting the session cookie here writes it with explicit attributes rather than relying on defaults. The raw document.cookie view confirms the attributes were applied, even though the hook's returned value only ever exposes the cookie's content.",
  ),
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
  ...storyDescription(
    "A theme toggle needs to persist across reloads while updating the UI immediately on click, with no separate save step. Clicking Dark writes the new theme to the cookie in the same action that updates local state. The preview card re-renders to match instantly, and the choice survives a reload because it's already stored, not just held in memory.",
  ),
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
  ...storyDescription(
    'A consent banner must not write any cookies before the user has explicitly agreed. The disclaimer stays visible until the user acts. Clicking to accept analytics only then writes the corresponding cookie, so no tracking-adjacent cookie exists prior to consent.',
  ),
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
  ...storyDescription(
    "A component watching one cookie shouldn't re-render every time an unrelated cookie in the same document changes. Setting cookie B here leaves the render count untouched, because this hook instance only watches cookie A. Setting cookie A updates the watched value and increments the render count, confirming updates are scoped to the declared dependencies.",
  ),
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
  ...storyDescription(
    'Manually listing every cookie key a component depends on is easy to get wrong as an app grows. With automatic dependency tracking, the hook infers what to watch from how the value is read rather than requiring an explicit list. Writing an unrelated cookie leaves the render count unchanged, while writing the tracked cookie updates the value and triggers a re-render.',
  ),
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
  ...storyDescription(
    "Two independent widgets on the same page, such as a header search box and a sidebar filter, sometimes need to stay in sync through a shared cookie rather than prop drilling. Typing in one editor's input writes to the shared cookie key. The second editor, backed by the same key, reflects the update immediately, since both hook instances read the same document.cookie value.",
  ),
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
  ...storyDescription(
    "Cookies written by a third-party script or a server redirect aren't visible to a hook instance unless it's told to look. With watch disabled, simulating an external write to the cookie leaves the hook's reported value unchanged. Only calling refresh() explicitly re-reads document.cookie and picks up the externally written value.",
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryCookies()}>
      <ExternalChangeExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'external-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('external-value')).toHaveTextContent('none')
    })

    await userEvent.click(canvas.getByTestId('external-simulate'))
    // watch: false — external document.cookie writes stay invisible until refresh().
    await expect(canvas.getByTestId('external-value')).toHaveTextContent('none')

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
  ...storyDescription(
    'Browsers without native cookie change events still need some way to detect edits made outside the current tab or by non-hook code. This instance falls back to interval polling instead of an event-based watcher. An externally written cookie value is picked up within the polling interval rather than instantly, trading a small delay for compatibility.',
  ),
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
  ...storyDescription(
    'The Cookie Store API can push a change notification the moment any cookie is written, including from other same-origin scripts, without polling. Setting the cookie via the hook updates the value immediately through this event-based path. Writing to the same cookie externally also surfaces through the Cookie Store change event, so both hook-driven and third-party writes are picked up without a refresh call.',
  ),
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
  ...storyDescription(
    "Cookies scoped to a specific path can only be removed by a matching path, an easy mistake when removal code doesn't mirror how the cookie was set. Removing with a mismatched path here leaves the cookie present. Removing with the path that matches the original scope actually deletes it, showing why removal options must mirror the cookie's original attributes.",
  ),
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
  ...storyDescription(
    'A cookie corrupted by a browser extension or manual editing can break JSON.parse on every subsequent read until something intervenes. Saving malformed JSON here surfaces a parse error and an alert instead of throwing uncaught. Repairing the value clears the error state and rewrites a valid cookie, showing how a consumer can recover from bad stored data rather than crashing.',
  ),
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
  ...storyDescription(
    'Cookies can be entirely unavailable — disabled by browser settings or a restrictive iframe sandbox — and the hook still needs to behave predictably rather than throwing. This story simulates that unsupported environment, so the hook reports supported: false and shows a warning. Typing still updates local state as an in-memory fallback, but an error is surfaced since nothing was actually persisted to a cookie.',
  ),
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
  ...storyDescription(
    "Server-rendered pages that read cookies for personalization need the first client render to match the server's markup, not flash from empty to populated. This story seeds cookies before render to simulate that server-provided initial state. The hook reflects the locale and currency values immediately, without a visible flash while effects run after hydration.",
  ),
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
  ...storyDescription(
    "An editor embedded in an iframe, like a sandboxed rich-text widget, has its own document.cookie separate from the host page's. This instance is configured to read and write cookies against that iframe's document explicitly. Typing into the iframe's input writes to its isolated cookie store, leaving the host page's cookies untouched.",
  ),
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
  ...storyDescription(
    'A cookie consent widget or session tracker sometimes needs to react to every write, removal, or external change as it happens, not just read the current value. Registering a change listener here logs each mutation to a running event list. Setting, removing, and externally writing the cookie each produce their own logged event, confirming the listener fires for hook-driven and outside changes alike.',
  ),
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
  ...storyDescription(
    'useCookies Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
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
