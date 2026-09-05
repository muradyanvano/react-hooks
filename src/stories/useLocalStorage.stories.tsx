import type { Meta, StoryObj } from '@storybook/react-vite'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  BooleanSettingExample,
  clearAllStoryKeys,
  CrossTabEventExample,
  CustomSerializerExample,
  CustomWindowExample,
  DateMapSetExample,
  DynamicKeyExample,
  FruitEditorExample,
  KEYS,
  MalformedValueExample,
  MergeDefaultsExample,
  ObjectAndArrayExample,
  PersistentCounterExample,
  PlaygroundExample,
  PreferencesPanelExample,
  RemoveVsResetExample,
  StorageUnavailableExample,
  StringValueExample,
  TwoComponentsExample,
  WithSeed,
  WriteDefaultsExample,
} from './components/UseLocalStorageExamples'
import {
  booleanSettingSnippet,
  crossTabEventSnippet,
  customSerializerSnippet,
  customWindowSnippet,
  dateMapSetSnippet,
  dynamicKeySnippet,
  fruitEditorSnippet,
  malformedValueSnippet,
  mergeDefaultsSnippet,
  objectAndArraySnippet,
  persistentCounterSnippet,
  playgroundSnippet,
  preferencesPanelSnippet,
  removeVsResetSnippet,
  storageUnavailableSnippet,
  stringValueSnippet,
  twoComponentsSnippet,
  writeDefaultsSnippet,
} from './components/useLocalStorage.snippets'
import { waitForDisclosedCode } from './components/expectCodeDisclosure'

const meta = {
  title: 'Hooks/useLocalStorage',
  tags: ['autodocs'],
  ...createHookStoryMeta('useLocalStorage', PlaygroundExample, {
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
    'Persistent preferences that survive remounts in the same origin. Edit the fruit form, remount/reset, and confirm namespaced keys update. Never store secrets; plays clean demo keys afterward.',
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        localStorage.setItem(
          KEYS.fruitEditor,
          JSON.stringify({
            name: 'Grape',
            color: 'Purple',
            size: 'Small',
            count: 3,
          }),
        )
      }}
    >
      <FruitEditorExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'ls-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('fruit-name')).toHaveValue('Grape')
      expect(canvas.getByTestId('fruit-count')).toHaveTextContent('3')
    })

    await userEvent.clear(canvas.getByTestId('fruit-name'))
    await userEvent.type(canvas.getByTestId('fruit-name'), 'Apple')
    await waitFor(() => {
      expect(localStorage.getItem(KEYS.fruitEditor)).toContain('Apple')
      expect(canvas.getByTestId('saved-badge')).toBeVisible()
    })

    await userEvent.click(canvas.getByTestId('fruit-reset'))
    await waitFor(() => {
      expect(canvas.getByTestId('fruit-name')).toHaveValue('Banana')
      expect(localStorage.getItem(KEYS.fruitEditor)).toContain('Banana')
    })

    await userEvent.click(canvas.getByTestId('fruit-remove'))
    await waitFor(() => {
      expect(localStorage.getItem(KEYS.fruitEditor)).toBeNull()
    })

    await expectCodeDisclosure(canvas, fruitEditorSnippet)
    clearAllStoryKeys()
  },
}

export const PreferencesPanel: Story = {
  name: 'Preferences panel',
  ...storyDescription(
    'A settings panel with several independent preferences, such as theme, motion, and density, needs each field to persist without one write clobbering the others. Toggling reduced motion here updates only that field inside the stored preferences object. Switching the theme selector updates the theme field the same way, confirming each control writes its own key without overwriting siblings.',
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        localStorage.setItem(
          KEYS.preferences,
          JSON.stringify({ theme: 'dark', density: 'compact' }),
        )
      }}
    >
      <PreferencesPanelExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'pref-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('pref-theme')).toHaveTextContent('dark')
      expect(canvas.getByTestId('pref-motion')).toHaveTextContent('false')
    })

    await userEvent.click(canvas.getByTestId('pref-motion-checkbox'))
    await waitFor(() => {
      expect(canvas.getByTestId('pref-motion')).toHaveTextContent('true')
      expect(localStorage.getItem(KEYS.preferences)).toContain('reducedMotion')
    })

    await userEvent.selectOptions(
      canvas.getByTestId('pref-theme-select'),
      'light',
    )
    await waitFor(() => {
      expect(canvas.getByTestId('pref-theme')).toHaveTextContent('light')
    })

    await expectCodeDisclosure(canvas, preferencesPanelSnippet)
    clearAllStoryKeys()
  },
}

export const PersistentCounter: Story = {
  name: 'Persistent counter',
  ...storyDescription(
    'State that should survive a remount, like a step counter in a multi-page wizard, needs to read its last value back rather than resetting to a default. Incrementing the counter twice writes the running total to localStorage on each click. Remounting the component reads that same value back immediately, confirming the count survives instead of resetting to zero.',
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
      expect(localStorage.getItem(KEYS.counter)).toBe('2')
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

export const BooleanSetting: Story = {
  name: 'Boolean setting',
  ...storyDescription(
    "Boolean flags, like a dark-mode switch or a dismissed-banner flag, need round-trip-safe persistence even though localStorage only ever stores strings. Checking the box writes 'true' to storage; unchecking writes 'false' back. The hook converts the checkbox's boolean state to and from that string representation transparently, so the consumer only ever handles a real boolean.",
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        localStorage.setItem(KEYS.booleanSetting, 'false')
      }}
    >
      <BooleanSettingExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'bool-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('bool-checkbox')).not.toBeChecked()
      expect(canvas.getByTestId('bool-raw')).toHaveTextContent('false')
    })

    await userEvent.click(canvas.getByTestId('bool-checkbox'))
    await waitFor(() => {
      expect(localStorage.getItem(KEYS.booleanSetting)).toBe('true')
    })

    await userEvent.click(canvas.getByTestId('bool-checkbox'))
    await waitFor(() => {
      expect(localStorage.getItem(KEYS.booleanSetting)).toBe('false')
    })

    await expectCodeDisclosure(canvas, booleanSettingSnippet)
    clearAllStoryKeys()
  },
}

export const StringValue: Story = {
  name: 'String value',
  ...storyDescription(
    'A draft text field should be able to persist an intentionally empty value, not just non-empty strings. Clearing the input writes an empty string to storage rather than removing the key entirely. Typing new characters afterward overwrites that empty string, confirming string values round-trip exactly as typed, including the empty case.',
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryKeys()}>
      <StringValueExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'string-ready')
    await userEvent.clear(canvas.getByTestId('string-input'))
    await waitFor(() => {
      expect(canvas.getByTestId('string-length')).toHaveTextContent('0')
      expect(localStorage.getItem(KEYS.stringValue)).toBe('')
    })

    await userEvent.type(canvas.getByTestId('string-input'), 'Ada')
    await waitFor(() => {
      expect(localStorage.getItem(KEYS.stringValue)).toBe('Ada')
    })

    await expectCodeDisclosure(canvas, stringValueSnippet)
    clearAllStoryKeys()
  },
}

export const ObjectAndArray: Story = {
  name: 'Object and array',
  ...storyDescription(
    'To-do lists and form drafts need to persist as a whole structured object, not flattened into separate keys. Editing the title and adding a tag here mutates one field of a larger object at a time. The stored JSON reflects both changes together, confirming the hook serializes the full object rather than requiring one storage key per field.',
  ),
  render: () => (
    <WithSeed seed={() => clearAllStoryKeys()}>
      <ObjectAndArrayExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'todo-ready')
    await userEvent.clear(canvas.getByTestId('todo-title-input'))
    await userEvent.type(canvas.getByTestId('todo-title-input'), 'Ship it')
    await userEvent.click(canvas.getByTestId('todo-add-tag'))
    await waitFor(() => {
      expect(canvas.getByTestId('todo-title')).toHaveTextContent('Ship it')
      expect(localStorage.getItem(KEYS.objectArray)).toContain('tag-2')
    })

    await expectCodeDisclosure(canvas, objectAndArraySnippet)
    clearAllStoryKeys()
  },
}

export const DateMapAndSet: Story = {
  name: 'Date, Map, and Set',
  ...storyDescription(
    "JSON.stringify silently mangles Date, Map, and Set into plain objects or arrays, breaking round-trips for structured data. This story stores values of exactly those three types. The hook's serialization preserves each type's shape through storage and back, so reading it returns the original date, map entries, and set members rather than corrupted plain objects.",
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
    'Some values need a compact or legacy-compatible storage format instead of JSON, such as a pipe-delimited string shared with an older system. This instance supplies a custom serializer/deserializer pair matching that format. Moving the value updates just the x field and rewrites the full pipe-delimited string, confirming the hook defers entirely to the custom format rather than assuming JSON.',
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        localStorage.setItem(KEYS.customSerializer, 'v1|4|2')
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
      expect(localStorage.getItem(KEYS.customSerializer)).toBe('v1|5|2')
    })

    await expectCodeDisclosure(canvas, customSerializerSnippet)
    clearAllStoryKeys()
  },
}

export const MergeDefaults: Story = {
  name: 'Merge defaults',
  ...storyDescription(
    'Adding a new option to a settings shape after users already have older stored data leaves existing records missing that field. Without merging, this story shows the stored value alone, missing fontSize. With mergeDefaults enabled, the hook fills in the missing field from the default object while keeping the stored theme value, so new fields appear without erasing existing data.',
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        localStorage.setItem(
          KEYS.mergeDisabled,
          JSON.stringify({ theme: 'dark' }),
        )
        localStorage.setItem(
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
    "Two independent components rendered separately, perhaps in different routes, sometimes need to read and write the exact same stored value without any shared parent state. Typing in one editor's input writes to the shared storage key. The second editor, backed by the same key, updates to match immediately, since both hook instances read the same localStorage entry.",
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
      expect(localStorage.getItem(KEYS.twoComponents)).toBe('hello sync')
    })

    await expectCodeDisclosure(canvas, twoComponentsSnippet)
    clearAllStoryKeys()
  },
}

export const CrossTabEvent: Story = {
  name: 'Cross-tab event',
  ...storyDescription(
    'A value changed in another browser tab, like a shopping cart or a logged-in user, should reflect in every open tab without a manual refresh. Simulating a cross-tab write here fires a native storage event for the watched key. The hook picks up that change and updates immediately, while a write to an unrelated key is correctly ignored and leaves the tracked value untouched.',
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        localStorage.setItem(KEYS.crossTab, '7')
      }}
    >
      <CrossTabEventExample />
    </WithSeed>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitForReady(canvas, 'cross-ready')
    await waitFor(() => {
      expect(canvas.getByTestId('cross-value')).toHaveTextContent('7')
    })

    await userEvent.click(canvas.getByTestId('cross-simulate'))
    await waitFor(() => {
      expect(canvas.getByTestId('cross-value')).toHaveTextContent('42')
    })

    await userEvent.click(canvas.getByTestId('cross-unrelated'))
    await waitFor(() => {
      expect(canvas.getByTestId('cross-value')).toHaveTextContent('42')
      expect(canvas.getByTestId('cross-ignored')).toHaveTextContent('999')
    })

    await expectCodeDisclosure(canvas, crossTabEventSnippet)
    clearAllStoryKeys()
  },
}

export const DynamicKey: Story = {
  name: 'Dynamic key',
  ...storyDescription(
    "Switching between user profiles or workspaces on the same page means the storage key itself needs to change at runtime, not just the value. Editing the name and switching to profile B repoints the hook at a different storage key. Values for each profile persist independently under their own keys, so switching back to profile A restores its own name rather than showing profile B's edits.",
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
      expect(localStorage.getItem(KEYS.profileB)).toContain('Bob')
    })

    await expectCodeDisclosure(canvas, dynamicKeySnippet)
    clearAllStoryKeys()
  },
}

export const WriteDefaults: Story = {
  name: 'Write defaults',
  ...storyDescription(
    'An uninitialized preference should sometimes seed storage immediately and sometimes stay absent until the user acts, to distinguish "never configured" from "set to the default." With writeDefaults enabled, the default value is written to storage right away, so raw storage shows it present. With writeDefaults disabled, the default is only used in memory and the raw entry stays missing until an explicit write occurs.',
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
    'A value corrupted by manual editing or an old app version can break JSON.parse on load, and the hook still needs to render something usable. Starting with invalid JSON in storage surfaces a parse error while the hook falls back to a safe default value. Repairing or removing the entry clears the error state, showing recovery paths for both fixing the value and discarding it entirely.',
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        localStorage.setItem(KEYS.malformed, '{not-json')
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
      expect(localStorage.getItem(KEYS.malformed)).toContain('safe')
    })

    localStorage.setItem(KEYS.malformed, '{not-json')
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: KEYS.malformed,
        newValue: '{not-json',
        storageArea: localStorage,
      }),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('malformed-error').textContent).not.toBe('none')
    })

    await userEvent.click(canvas.getByTestId('malformed-remove'))
    await waitFor(() => {
      expect(localStorage.getItem(KEYS.malformed)).toBeNull()
      expect(canvas.getByTestId('malformed-error')).toHaveTextContent('none')
    })

    await expectCodeDisclosure(canvas, malformedValueSnippet)
    clearAllStoryKeys()
  },
}

export const StorageUnavailable: Story = {
  name: 'Storage unavailable',
  ...storyDescription(
    "localStorage can be unavailable entirely — private-browsing restrictions, quota exhaustion, a locked-down environment — and the hook still needs to avoid throwing. This story simulates that unavailable environment, so the hook reports supported: false and displays a warning. Typing still updates the value as an in-memory fallback, but nothing is actually persisted since there's no storage to write to.",
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
    await userEvent.type(canvas.getByTestId('denied-input'), 'local only')
    await waitFor(() => {
      expect(canvas.getByTestId('denied-value')).toHaveTextContent('local only')
    })

    await expectCodeDisclosure(canvas, storageUnavailableSnippet)
    clearAllStoryKeys()
  },
}

export const RemoveVersusReset: Story = {
  name: 'Remove versus reset',
  ...storyDescription(
    '"Reset to default" and "clear the stored value" sound similar but have different persistence implications — one still writes, the other doesn\'t. Reset here writes the default value back to storage explicitly. Remove deletes the key from storage entirely, yet the hook still reports the same default value in memory, since removal falls back to the default rather than becoming undefined.',
  ),
  render: () => (
    <WithSeed
      seed={() => {
        clearAllStoryKeys()
        localStorage.setItem(KEYS.removeReset, '25')
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
      expect(localStorage.getItem(KEYS.removeReset)).toBe('10')
    })

    await userEvent.click(canvas.getByTestId('rr-remove'))
    await waitFor(() => {
      expect(localStorage.getItem(KEYS.removeReset)).toBeNull()
      expect(canvas.getByTestId('rr-value')).toHaveTextContent('10')
    })

    await expectCodeDisclosure(canvas, removeVsResetSnippet)
    clearAllStoryKeys()
  },
}

export const CustomWindow: Story = {
  name: 'Custom window',
  ...storyDescription(
    "An embedded widget running in its own iframe has a separate localStorage instance from the host page, and the hook needs to be pointed at the right one explicitly. This instance is configured to read and write against the iframe's own window rather than the top-level one. Typing into the iframe's input persists to that frame's isolated storage, leaving the host page's localStorage untouched.",
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
      await waitForReady(canvas, 'iframe-ls-ready')

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
        iframe?.contentWindow?.localStorage.removeItem(KEYS.customWindow)
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
    'useLocalStorage Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
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
