import type { Meta, StoryObj } from '@storybook/react-vite'
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

const meta = {
  title: 'Hooks/useLocalStorage',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Persist state in \`localStorage\` with SSR-safe hydration, automatic serializers, same-document sync, and optional cross-tab \`storage\` events.

\`\`\`ts
import { useLocalStorage } from '@muradyanvano/react-hooks'

useLocalStorage<T>(key, defaultValue, options?): {
  value,
  setValue,
  remove,
  reset,
  isSupported,
  isReady,
  error,
}
\`\`\`

**Defaults:** \`{ mergeDefaults: false, writeDefaults: true, listenToStorageChanges: true }\`

**Hydration:** The first client render matches SSR (\`value: defaultValue\`, \`isReady: false\`). Storage is read in an effect; wait for \`isReady\` before treating persisted values as authoritative.

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
    a11y: {
      test: 'error',
    },
  },
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

export const PersistentFruitEditor: Story = {
  name: 'Persistent fruit editor',
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
