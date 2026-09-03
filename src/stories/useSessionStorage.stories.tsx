import type { Meta, StoryObj } from '@storybook/react-vite'
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

const meta = {
  title: 'Hooks/useSessionStorage',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Persist state in \`sessionStorage\` with SSR-safe hydration, automatic serializers, same-document sync, and optional related-context \`storage\` events.

\`\`\`ts
import { useSessionStorage } from '@muradyanvano/react-hooks'

useSessionStorage<T>(key, defaultValue, options?): {
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

Session storage survives reloads in the same tab but clears when the tab closes. It is not shared across separate tabs.

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

export const CheckoutDraft: Story = {
  name: 'Checkout draft',
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
