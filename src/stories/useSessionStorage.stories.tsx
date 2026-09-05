import type { Meta, StoryObj } from '@storybook/react-vite'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  BooleanFlagExample,
  CheckoutDraftExample,
  clearAllStoryKeys,
  CustomSerializerExample,
  CustomWindowExample,
  DateMapSetExample,
  DynamicKeyExample,
  KEYS,
  MalformedValueExample,
  MergeDefaultsExample,
  ObjectAndArrayExample,
  PersistentCounterExample,
  PlaygroundExample,
  RegistrationWizardExample,
  RelatedContextEventExample,
  RemoveVsResetExample,
  StorageAreaIsolationExample,
  StorageUnavailableExample,
  TabWorkspaceExample,
  TemporaryFormExample,
  TwoComponentsExample,
  WithSeed,
  WriteDefaultsExample,
} from './components/UseSessionStorageExamples'
import {
  booleanFlagSnippet,
  checkoutDraftSnippet,
  customSerializerSnippet,
  customWindowSnippet,
  dateMapSetSnippet,
  dynamicKeySnippet,
  malformedValueSnippet,
  mergeDefaultsSnippet,
  objectAndArraySnippet,
  persistentCounterSnippet,
  playgroundSnippet,
  registrationWizardSnippet,
  relatedContextEventSnippet,
  removeVsResetSnippet,
  storageIsolationSnippet,
  storageUnavailableSnippet,
  tabWorkspaceSnippet,
  temporaryFormSnippet,
  twoComponentsSnippet,
  writeDefaultsSnippet,
} from './components/useSessionStorage.snippets'
import { waitForDisclosedCode } from './components/expectCodeDisclosure'

const meta = {
  title: 'Hooks/useSessionStorage',
  tags: ['autodocs'],
  ...createHookStoryMeta('useSessionStorage', PlaygroundExample, {
    argTypes: {
      playgroundKey: {
        control: 'text',
        description: 'Storage key suffix (namespaced in the playground story).',
      },
      defaultType: {
        control: 'select',
        options: ['string', 'number', 'boolean', 'object'],
      },
      mergeDefaults: { control: 'boolean' },
      writeDefaults: { control: 'boolean' },
      listenToStorageChanges: { control: 'boolean' },
    },
    args: {
      playgroundKey: 'playground',
      defaultType: 'number',
      mergeDefaults: false,
      writeDefaults: true,
      listenToStorageChanges: true,
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

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Tab-scoped checkout drafts that must not pretend to sync across ordinary tabs. Advance the wizard, remount, and discard — status should say Saved for this tab. Clean session keys after plays.',
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        sessionStorage.setItem(
          KEYS.checkoutDraft,
          JSON.stringify({
            email: 'shopper@example.com',
            delivery: 'standard',
            step: 1,
          }),
        )
      }}
    >
      <CheckoutDraftExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'ss-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('checkout-email')).toHaveValue(
        'shopper@example.com',
      )
      expect(canvas.getByTestId('saved-badge')).toBeVisible()
    })

    await userEvent.clear(canvas.getByTestId('checkout-email'))
    await userEvent.type(
      canvas.getByTestId('checkout-email'),
      'buyer@example.com',
    )
    await userEvent.click(canvas.getByTestId('checkout-next'))
    await waitFor(() => {
      expect(canvas.getByTestId('checkout-delivery')).toBeVisible()
    })
    await userEvent.selectOptions(
      canvas.getByTestId('checkout-delivery'),
      'express',
    )
    await userEvent.click(canvas.getByTestId('checkout-next'))
    await waitFor(() => {
      expect(canvas.getByTestId('checkout-step')).toHaveTextContent('3')
      expect(sessionStorage.getItem(KEYS.checkoutDraft)).toContain(
        'buyer@example.com',
      )
    })

    await userEvent.click(canvas.getByTestId('checkout-remount'))
    await waitForReady(canvas, 'ss-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('checkout-step')).toHaveTextContent('3')
      expect(sessionStorage.getItem(KEYS.checkoutDraft)).toContain(
        'buyer@example.com',
      )
    })

    await userEvent.click(canvas.getByTestId('checkout-reset'))
    await waitFor(() => {
      expect(canvas.getByTestId('checkout-step')).toHaveTextContent('1')
      expect(sessionStorage.getItem(KEYS.checkoutDraft)).toContain('"step":1')
    })

    await userEvent.click(canvas.getByTestId('checkout-discard'))
    await waitFor(() => {
      expect(sessionStorage.getItem(KEYS.checkoutDraft)).toBeNull()
    })

    await expectCodeDisclosure(canvas, checkoutDraftSnippet)
    clearAllStoryKeys()
  },
}

export const RegistrationWizard: Story = {
  name: 'Registration wizard',
  ...storyDescription(
    "A multi-step signup form needs each step's choices to survive moving forward and backward through the wizard within the same tab. Selecting the Pro plan and advancing persists both the plan and the new step to session storage. Navigating back to step 2 keeps the Pro selection intact, since state was written on each change rather than only on final submission.",
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        sessionStorage.setItem(
          KEYS.registrationWizard,
          JSON.stringify({ step: 2, name: 'Ada', plan: 'free' }),
        )
      }}
    >
      <RegistrationWizardExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'wizard-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('wizard-step')).toHaveTextContent('2')
      expect(canvas.getByTestId('wizard-plan-free')).toBeChecked()
    })

    await userEvent.click(canvas.getByTestId('wizard-plan-pro'))
    await userEvent.click(canvas.getByTestId('wizard-next'))
    await waitFor(() => {
      expect(canvas.getByTestId('wizard-step')).toHaveTextContent('3')
      expect(sessionStorage.getItem(KEYS.registrationWizard)).toContain('pro')
    })

    await userEvent.click(canvas.getByTestId('wizard-back'))
    await waitFor(() => {
      expect(canvas.getByTestId('wizard-step')).toHaveTextContent('2')
    })

    await expectCodeDisclosure(canvas, registrationWizardSnippet)
    clearAllStoryKeys()
  },
}

export const TabWorkspace: Story = {
  name: 'Tab workspace',
  ...storyDescription(
    "A dashboard's per-tab layout, such as the active panel, filters, and view mode, should survive a remount within that tab but has no reason to follow the user to a new tab. Toggling the view mode and remounting the workspace here reads the updated 'grid' value back immediately. The state persists across the remount because it lives in session storage scoped to this tab, not component memory.",
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        sessionStorage.setItem(
          KEYS.tabWorkspace,
          JSON.stringify({
            panel: 'details',
            filters: ['filter-1'],
            viewMode: 'list',
          }),
        )
      }}
    >
      <TabWorkspaceExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'workspace-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('workspace-status')).toHaveTextContent(
        'details',
      )
      expect(canvas.getByTestId('workspace-status')).toHaveTextContent('list')
    })

    await userEvent.click(canvas.getByTestId('workspace-toggle-view'))
    await userEvent.click(canvas.getByTestId('workspace-remount'))
    await waitForReady(canvas, 'workspace-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('workspace-status')).toHaveTextContent('grid')
      expect(sessionStorage.getItem(KEYS.tabWorkspace)).toContain('grid')
    })

    await expectCodeDisclosure(canvas, tabWorkspaceSnippet)
    clearAllStoryKeys()
  },
}

export const TemporaryForm: Story = {
  name: 'Temporary form',
  ...storyDescription(
    'A contact form or comment draft that shouldn\'t survive after the tab closes still benefits from surviving an accidental navigation within the session. Typing into the name and message fields writes each change to session storage. The draft persists for the lifetime of the tab, but — unlike localStorage — disappears once the tab or browser closes, matching the "temporary" intent.',
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryKeys()}>
      <TemporaryFormExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'form-ready')
    await userEvent.type(canvas.getByTestId('form-name'), 'Jordan')
    await userEvent.type(canvas.getByTestId('form-message'), 'Quick question')
    await waitFor(() => {
      expect(sessionStorage.getItem(KEYS.temporaryForm)).toContain('Jordan')
    })

    await expectCodeDisclosure(canvas, temporaryFormSnippet)
    clearAllStoryKeys()
  },
}

export const PersistentCounter: Story = {
  name: 'Persistent counter',
  ...storyDescription(
    "A step counter or in-progress score needs to survive a component remount without leaking into other tabs or persisting after the tab closes. Incrementing the counter twice and remounting the component reads the same total back immediately. The value survives the remount because it's stored per-tab in session storage, not held only in component state.",
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryKeys()}>
      <PersistentCounterExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'counter-ready')
    await userEvent.click(canvas.getByTestId('counter-increment'))
    await userEvent.click(canvas.getByTestId('counter-increment'))
    await waitFor(() => {
      expect(canvas.getByTestId('counter-value')).toHaveTextContent('2')
      expect(sessionStorage.getItem(KEYS.counter)).toBe('2')
    })

    await userEvent.click(canvas.getByTestId('counter-remount'))
    await waitForReady(canvas, 'counter-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('counter-value')).toHaveTextContent('2')
    })

    await expectCodeDisclosure(canvas, persistentCounterSnippet)
    clearAllStoryKeys()
  },
}

export const BooleanFlag: Story = {
  name: 'Boolean flag',
  ...storyDescription(
    "A promotional banner the user dismisses shouldn't reappear on every navigation within the same tab, but there's no need for that dismissal to follow them into a new tab. The banner starts visible with the flag false. Dismissing it writes true to session storage and swaps in the dismissed message, staying hidden for the rest of this tab's session.",
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        sessionStorage.setItem(KEYS.booleanFlag, 'false')
      }}
    >
      <BooleanFlagExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'bool-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('promo-banner')).toBeVisible()
      expect(canvas.getByTestId('bool-raw')).toHaveTextContent('false')
    })

    await userEvent.click(canvas.getByTestId('bool-dismiss'))
    await waitFor(() => {
      expect(sessionStorage.getItem(KEYS.booleanFlag)).toBe('true')
      expect(canvas.getByTestId('banner-dismissed-message')).toBeVisible()
    })

    await expectCodeDisclosure(canvas, booleanFlagSnippet)
    clearAllStoryKeys()
  },
}

export const ObjectAndArray: Story = {
  name: 'Object and array',
  ...storyDescription(
    "A checklist scoped to the current tab's workflow needs to persist as one structured object, not flattened across separate keys. Editing the title and adding a task here mutates fields of a single stored object. The updated JSON reflects both changes together, confirming the hook serializes the whole structure rather than one key per field.",
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryKeys()}>
      <ObjectAndArrayExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'task-ready')
    await userEvent.clear(canvas.getByTestId('task-title-input'))
    await userEvent.type(canvas.getByTestId('task-title-input'), 'Ship it')
    await userEvent.click(canvas.getByTestId('task-add'))
    await waitFor(() => {
      expect(canvas.getByTestId('task-title')).toHaveTextContent('Ship it')
      expect(sessionStorage.getItem(KEYS.objectArray)).toContain('task-2')
    })

    await expectCodeDisclosure(canvas, objectAndArraySnippet)
    clearAllStoryKeys()
  },
}

export const DateMapAndSet: Story = {
  name: 'Date, Map, and Set',
  ...storyDescription(
    "Date, Map, and Set values lose their shape under plain JSON.stringify, and that problem doesn't go away just because the data only needs to last for the current tab. This story stores all three types in session storage. The hook's serialization round-trips each type correctly, so the raw values read back as the original date, map entries, and set members.",
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryKeys()}>
      <DateMapSetExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'structured-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('structured-date-raw').textContent).toMatch(
        /2026-01-01/,
      )
      expect(canvas.getByTestId('structured-map-raw').textContent).toContain(
        'alpha',
      )
      expect(canvas.getByTestId('structured-set-raw').textContent).toContain(
        'react',
      )
    })

    await expectCodeDisclosure(canvas, dateMapSetSnippet)
    clearAllStoryKeys()
  },
}

export const CustomSerializer: Story = {
  name: 'Custom serializer',
  ...storyDescription(
    "A value shared with a same-tab legacy script in a compact pipe-delimited format shouldn't be forced into JSON just because the hook defaults to it. This instance supplies a custom serializer/deserializer matching that format. Moving the value updates the x field and rewrites the full pipe-delimited string, confirming session storage supports the same custom-format override as localStorage.",
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        sessionStorage.setItem(KEYS.customSerializer, 'v1|4|2')
      }}
    >
      <CustomSerializerExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'custom-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('custom-x')).toHaveTextContent('4')
      expect(canvas.getByTestId('custom-raw')).toHaveTextContent('v1|4|2')
    })

    await userEvent.click(canvas.getByTestId('custom-move'))
    await waitFor(() => {
      expect(sessionStorage.getItem(KEYS.customSerializer)).toBe('v1|5|2')
    })

    await expectCodeDisclosure(canvas, customSerializerSnippet)
    clearAllStoryKeys()
  },
}

export const MergeDefaults: Story = {
  name: 'Merge defaults',
  ...storyDescription(
    'A settings shape that gained a new field after some tabs already wrote older session data needs a way to backfill the missing field rather than erroring. Without merging, the stored value here shows only the original theme field. With mergeDefaults enabled, the hook fills in the missing fontSize from defaults while preserving the existing theme, so new fields appear without wiping prior session state.',
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        sessionStorage.setItem(
          KEYS.mergeDisabled,
          JSON.stringify({ theme: 'dark' }),
        )
        sessionStorage.setItem(
          KEYS.mergeEnabled,
          JSON.stringify({ theme: 'dark' }),
        )
      }}
    >
      <MergeDefaultsExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'merge-off-ready')
    await waitForReady(canvas, 'merge-on-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('merge-off-value')).toHaveTextContent(
        '{"theme":"dark"}',
      )
      expect(canvas.getByTestId('merge-on-value').textContent).toContain(
        '"fontSize":16',
      )
      expect(canvas.getByTestId('merge-on-value').textContent).toContain(
        '"theme":"dark"',
      )
    })

    await expectCodeDisclosure(canvas, mergeDefaultsSnippet)
    clearAllStoryKeys()
  },
}

export const TwoComponents: Story = {
  name: 'Two components',
  ...storyDescription(
    "Two independent widgets in the same tab, like a header field and a sidebar mirror, sometimes need to share one session-scoped value without prop drilling. Typing in one editor's input here writes to the shared session storage key. The second editor, backed by the same key, updates to match immediately, since both hook instances read the same entry.",
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryKeys()}>
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
      expect(sessionStorage.getItem(KEYS.twoComponents)).toBe('hello sync')
    })

    await expectCodeDisclosure(canvas, twoComponentsSnippet)
    clearAllStoryKeys()
  },
}

export const StorageAreaIsolation: Story = {
  name: 'Storage-area isolation',
  ...storyDescription(
    "useLocalStorage and useSessionStorage look similar but must never leak into each other's storage area, even when given an identical key. Writing through the local-storage button and the session-storage button here targets the same key name in two different storage areas. Each area ends up holding its own independent value, confirming the hook writes strictly to the storage area it was built for.",
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryKeys()}>
      <StorageAreaIsolationExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'isolation-local-ready')
    await waitForReady(canvas, 'isolation-session-ready')

    await userEvent.click(canvas.getByTestId('isolation-write-local'))
    await userEvent.click(canvas.getByTestId('isolation-write-session'))
    await waitFor(() => {
      expect(canvas.getByTestId('isolation-local-value')).toHaveTextContent(
        'local value',
      )
      expect(canvas.getByTestId('isolation-session-value')).toHaveTextContent(
        'session value',
      )
      expect(localStorage.getItem(KEYS.storageIsolation)).toBe('local value')
      expect(sessionStorage.getItem(KEYS.storageIsolation)).toBe(
        'session value',
      )
    })

    await expectCodeDisclosure(canvas, storageIsolationSnippet)
    clearAllStoryKeys()
  },
}

export const RelatedContextEvent: Story = {
  name: 'Related-context event',
  ...storyDescription(
    "A value changed by another same-tab context, such as a popup window opened from this tab, should propagate through session storage's change events the same way cross-tab events do for localStorage. Simulating that related-context write here fires a storage event for the watched key. The hook adopts the new value immediately, while a write to an unrelated key is correctly ignored.",
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        sessionStorage.setItem(KEYS.relatedContext, '7')
      }}
    >
      <RelatedContextEventExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'context-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('context-value')).toHaveTextContent('7')
    })

    await userEvent.click(canvas.getByTestId('context-simulate'))
    await waitFor(() => {
      expect(canvas.getByTestId('context-value')).toHaveTextContent('42')
    })

    await userEvent.click(canvas.getByTestId('context-unrelated'))
    await waitFor(() => {
      expect(canvas.getByTestId('context-value')).toHaveTextContent('42')
      expect(canvas.getByTestId('context-ignored')).toHaveTextContent('999')
    })

    await expectCodeDisclosure(canvas, relatedContextEventSnippet)
    clearAllStoryKeys()
  },
}

export const DynamicKey: Story = {
  name: 'Dynamic key',
  ...storyDescription(
    "Switching between profiles or steps within one tab's session means retargeting the storage key at runtime rather than only ever reading a static one. Editing the name and switching to profile B repoints the hook at a different session storage key. Each profile's value persists independently under its own key, so switching back to profile A restores its own name instead of showing profile B's edits.",
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryKeys()}>
      <DynamicKeyExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'dynamic-ready')
    await userEvent.clear(canvas.getByTestId('dynamic-name-input'))
    await userEvent.type(canvas.getByTestId('dynamic-name-input'), 'Alice')
    await userEvent.click(canvas.getByTestId('dynamic-profile-b'))
    await waitForReady(canvas, 'dynamic-ready')
    await userEvent.clear(canvas.getByTestId('dynamic-name-input'))
    await userEvent.type(canvas.getByTestId('dynamic-name-input'), 'Bob')
    await userEvent.click(canvas.getByTestId('dynamic-profile-a'))
    await waitForReady(canvas, 'dynamic-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-name-input')).toHaveValue('Alice')
      expect(sessionStorage.getItem(KEYS.profileB)).toContain('Bob')
    })

    await expectCodeDisclosure(canvas, dynamicKeySnippet)
    clearAllStoryKeys()
  },
}

export const WriteDefaults: Story = {
  name: 'Write defaults',
  ...storyDescription(
    'An unconfigured session value should sometimes seed storage immediately and sometimes stay absent until the user acts, mirroring the same choice available for localStorage. With writeDefaults enabled, the default value is written to session storage right away, so the raw entry shows it present. With writeDefaults disabled, the default only exists in memory and the raw entry stays missing until an explicit write happens.',
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryKeys()}>
      <WriteDefaultsExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'write-on-ready')
    await waitForReady(canvas, 'write-off-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('write-on-raw')).toHaveTextContent('raw: hello')
      expect(canvas.getByTestId('write-off-raw')).toHaveTextContent(
        'raw: (missing)',
      )
    })

    await expectCodeDisclosure(canvas, writeDefaultsSnippet)
    clearAllStoryKeys()
  },
}

export const MalformedValue: Story = {
  name: 'Malformed value',
  ...storyDescription(
    'A session value corrupted by manual editing or a stray script write can break JSON.parse on read, and the hook still needs a safe fallback rather than crashing the tab. Starting with invalid JSON surfaces a parse error while the hook falls back to a safe default. Repairing or removing the entry clears the error, and a later externally injected malformed write reproduces the same recoverable error state.',
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        sessionStorage.setItem(KEYS.malformed, '{not-json')
      }}
    >
      <MalformedValueExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'malformed-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('malformed-value')).toHaveTextContent(
        '{"mode":"safe"}',
      )
      expect(canvas.getByTestId('malformed-error').textContent).not.toBe('none')
    })

    await userEvent.click(canvas.getByTestId('malformed-repair'))
    await waitFor(() => {
      expect(canvas.getByTestId('malformed-error')).toHaveTextContent('none')
      expect(sessionStorage.getItem(KEYS.malformed)).toContain('safe')
    })

    sessionStorage.setItem(KEYS.malformed, '{not-json')
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: KEYS.malformed,
        newValue: '{not-json',
        storageArea: sessionStorage,
      }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('malformed-error').textContent).not.toBe('none')
    })

    await userEvent.click(canvas.getByTestId('malformed-remove'))
    await waitFor(() => {
      expect(sessionStorage.getItem(KEYS.malformed)).toBeNull()
      expect(canvas.getByTestId('malformed-error')).toHaveTextContent('none')
    })

    await expectCodeDisclosure(canvas, malformedValueSnippet)
    clearAllStoryKeys()
  },
}

export const StorageUnavailable: Story = {
  name: 'Storage unavailable',
  ...storyDescription(
    "Session storage can be unavailable too — a locked-down iframe, a browser privacy mode — and the hook needs to degrade the same way useLocalStorage does rather than throwing. This story simulates that unavailable environment, so the hook reports supported: false and shows a warning. Typing still updates the value through an in-memory fallback, but nothing is actually persisted since there's no session storage to write to.",
  ),
  render: () => <StorageUnavailableExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'denied-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('denied-supported')).toHaveTextContent('false')
      expect(canvas.getByTestId('denied-warning')).toBeVisible()
    })

    await userEvent.clear(canvas.getByTestId('denied-input'))
    await userEvent.type(canvas.getByTestId('denied-input'), 'session only')
    await waitFor(() => {
      expect(canvas.getByTestId('denied-value')).toHaveTextContent(
        'session only',
      )
    })

    await expectCodeDisclosure(canvas, storageUnavailableSnippet)
    clearAllStoryKeys()
  },
}

export const RemoveVersusReset: Story = {
  name: 'Remove versus reset',
  ...storyDescription(
    '"Reset to default" and "clear the stored value" have different persistence effects even for session-scoped data — one still writes, the other doesn\'t. Reset here explicitly writes the default value back to session storage. Remove deletes the key entirely, yet the hook still reports the same default value in memory afterward, since removal falls back to the default instead of becoming undefined.',
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        sessionStorage.setItem(KEYS.removeReset, '25')
      }}
    >
      <RemoveVsResetExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'rr-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('rr-value')).toHaveTextContent('25')
    })

    await userEvent.click(canvas.getByTestId('rr-reset'))
    await waitFor(() => {
      expect(canvas.getByTestId('rr-value')).toHaveTextContent('10')
      expect(sessionStorage.getItem(KEYS.removeReset)).toBe('10')
    })

    await userEvent.click(canvas.getByTestId('rr-remove'))
    await waitFor(() => {
      expect(sessionStorage.getItem(KEYS.removeReset)).toBeNull()
      expect(canvas.getByTestId('rr-value')).toHaveTextContent('10')
    })

    await expectCodeDisclosure(canvas, removeVsResetSnippet)
    clearAllStoryKeys()
  },
}

export const CustomWindow: Story = {
  name: 'Custom window',
  ...storyDescription(
    "An iframe-embedded widget has its own session storage separate from the host tab's, and the hook needs to be pointed at the right window explicitly to read or write it. This instance is configured against the iframe's own window rather than the top-level one. Typing into the iframe's input persists to that frame's isolated session storage, leaving the host page's session storage untouched.",
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryKeys()}>
      <CustomWindowExample />
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
      await waitForReady(canvas, 'iframe-ss-ready')

      await userEvent.clear(canvas.getByTestId('iframe-note-input'))
      await userEvent.type(
        canvas.getByTestId('iframe-note-input'),
        'frame note',
      )
      await waitFor(() => {
        expect(canvas.getByTestId('iframe-raw')).toHaveTextContent('frame note')
      })

      iframe = canvas.getByTestId('custom-window-iframe') as HTMLIFrameElement

      await expectCodeDisclosure(canvas, customWindowSnippet)
    } finally {
      try {
        iframe?.contentWindow?.sessionStorage.removeItem(KEYS.customWindow)
      } catch {
        // Ignore cross-context cleanup failures.
      }
      clearAllStoryKeys()
    }
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'useSessionStorage Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryKeys()}>
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

    await userEvent.click(canvas.getByTestId('playground-bump'))
    await waitFor(() => {
      expect(canvas.getByTestId('playground-state').textContent).toContain(
        '"value": 1',
      )
    })

    await expectCodeDisclosure(canvas, playgroundSnippet)
    clearAllStoryKeys()
  },
}
