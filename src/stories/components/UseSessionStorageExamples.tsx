import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react'
import { useLocalStorage, useSessionStorage } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
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
} from './useSessionStorage.snippets'

export const STORAGE_KEY_PREFIX = 'muradyanvano-react-hooks:useSessionStorage:'

export function storageKey(name: string): string {
  return `${STORAGE_KEY_PREFIX}${name}`
}

export const KEYS = {
  checkoutDraft: storageKey('checkout-draft'),
  registrationWizard: storageKey('registration-wizard'),
  tabWorkspace: storageKey('tab-workspace'),
  temporaryForm: storageKey('temporary-form'),
  counter: storageKey('counter'),
  booleanFlag: storageKey('boolean-flag'),
  objectArray: storageKey('object-array'),
  dateMapSet: storageKey('date-map-set'),
  customSerializer: storageKey('custom-serializer'),
  mergeDisabled: storageKey('merge-disabled'),
  mergeEnabled: storageKey('merge-enabled'),
  twoComponents: storageKey('two-components'),
  storageIsolation: storageKey('storage-isolation'),
  relatedContext: storageKey('related-context'),
  profileA: storageKey('profile-a'),
  profileB: storageKey('profile-b'),
  writeDefaultsOn: storageKey('write-defaults-on'),
  writeDefaultsOff: storageKey('write-defaults-off'),
  malformed: storageKey('malformed'),
  removeReset: storageKey('remove-reset'),
  customWindow: storageKey('custom-window'),
  playground: storageKey('playground'),
  storageUnavailable: storageKey('storage-unavailable'),
} as const

export const ALL_STORY_KEYS = [
  ...Object.values(KEYS),
  `${KEYS.dateMapSet}:date`,
  `${KEYS.dateMapSet}:map`,
  `${KEYS.dateMapSet}:set`,
  storageKey('unrelated'),
] as const

export function clearAllStoryKeys(): void {
  for (const key of ALL_STORY_KEYS) {
    try {
      sessionStorage.removeItem(key)
    } catch {
      // Storage may be unavailable in restricted contexts.
    }
    try {
      localStorage.removeItem(key)
    } catch {
      // Isolation story also writes to localStorage.
    }
  }
}

const buttonClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white outline-none hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
const dangerButtonClass =
  'rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 outline-none hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2'
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const panelClass = 'rounded-xl border border-slate-200 bg-slate-50 p-4'
const codePreviewClass =
  'min-w-0 max-w-full break-all whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-xs text-emerald-300'

type CheckoutDraft = {
  email: string
  delivery: 'standard' | 'express'
  step: 1 | 2 | 3
}

const defaultCheckoutDraft: CheckoutDraft = {
  email: '',
  delivery: 'standard',
  step: 1,
}

function SavedTabBadge({ visible }: { visible: boolean }): ReactElement | null {
  if (!visible) {
    return null
  }

  return (
    <span
      data-testid="saved-badge"
      className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200"
    >
      Saved for this tab
    </span>
  )
}

function KeyBadge({
  storageKeyName,
}: {
  storageKeyName: string
}): ReactElement {
  return (
    <span
      data-testid="key-badge"
      className="inline-flex max-w-full truncate rounded-full bg-indigo-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-indigo-800 ring-1 ring-indigo-200"
      title={storageKeyName}
    >
      {storageKeyName}
    </span>
  )
}

function useStoredRaw(key: string, refreshToken: unknown): string {
  const [raw, setRaw] = useState('(empty)')

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) {
        return
      }
      try {
        const value = sessionStorage.getItem(key)
        setRaw(value ?? '(missing)')
      } catch {
        setRaw('(unavailable)')
      }
    })
    return () => {
      cancelled = true
    }
  }, [key, refreshToken])

  return raw
}

function useLocalStoredRaw(key: string, refreshToken: unknown): string {
  const [raw, setRaw] = useState('(empty)')

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) {
        return
      }
      try {
        const value = localStorage.getItem(key)
        setRaw(value ?? '(missing)')
      } catch {
        setRaw('(unavailable)')
      }
    })
    return () => {
      cancelled = true
    }
  }, [key, refreshToken])

  return raw
}

function useIsolatedIframeBind(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  onReady: (frame: HTMLIFrameElement) => void,
): void {
  useEffect(() => {
    const frame = iframeRef.current
    if (frame == null) {
      return
    }

    const bind = () => {
      if (frame.contentDocument == null) {
        return
      }
      onReady(frame)
    }

    frame.addEventListener('load', bind)
    if (frame.contentDocument?.readyState === 'complete') {
      bind()
    }

    return () => {
      frame.removeEventListener('load', bind)
    }
  }, [iframeRef, onReady])
}

export function CheckoutDraftExample(): ReactElement {
  const [mounted, setMounted] = useState(true)
  const [remountKey, setRemountKey] = useState(0)

  const remount = () => {
    setMounted(false)
    queueMicrotask(() => {
      setRemountKey((value) => value + 1)
      setMounted(true)
    })
  }

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Checkout draft"
      description="Multi-step checkout progress survives reloads in this tab. Session storage clears when the tab closes — ideal for in-progress carts, not durable accounts."
      instruction="Fill email and delivery, advance steps, remount, then Reset or Discard the draft."
      code={checkoutDraftSnippet}
      badge="Primary"
      aside={
        <StatusPanel
          items={[
            {
              label: 'Remount key',
              value: String(remountKey),
              testId: 'checkout-remount-key',
            },
          ]}
        />
      }
    >
      {mounted ? <CheckoutDraftInner key={remountKey} /> : null}
      <button
        type="button"
        className={`${secondaryButtonClass} mt-4`}
        data-testid="checkout-remount"
        onClick={remount}
      >
        Remount checkout
      </button>
    </ExampleShowcase>
  )
}

function CheckoutDraftInner(): ReactElement {
  const { value, setValue, reset, remove, isReady, isSupported, error } =
    useSessionStorage<CheckoutDraft>(KEYS.checkoutDraft, defaultCheckoutDraft)
  const raw = useStoredRaw(KEYS.checkoutDraft, value)

  const goNext = () => {
    setValue((current) => ({
      ...current,
      step: Math.min(3, current.step + 1) as CheckoutDraft['step'],
    }))
  }

  const goBack = () => {
    setValue((current) => ({
      ...current,
      step: Math.max(1, current.step - 1) as CheckoutDraft['step'],
    }))
  }

  return (
    <>
      <div className="space-y-3">
        <StatusPanel
          items={[
            { label: 'isReady', value: String(isReady), testId: 'ss-ready' },
            {
              label: 'isSupported',
              value: String(isSupported),
              testId: 'ss-supported',
            },
            {
              label: 'error',
              value: error?.message ?? 'none',
              testId: 'ss-error',
            },
            {
              label: 'step',
              value: String(value.step),
              testId: 'checkout-step',
            },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <SavedTabBadge visible={isReady && isSupported && error == null} />
          <KeyBadge storageKeyName={KEYS.checkoutDraft} />
        </div>
      </div>

      <ol
        className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600"
        aria-label="Checkout steps"
      >
        {[1, 2, 3].map((step) => (
          <li
            key={step}
            data-testid={`checkout-step-label-${step}`}
            className={`rounded-full px-3 py-1 ${
              value.step === step
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            Step {step}
          </li>
        ))}
      </ol>

      {value.step === 1 ? (
        <label className="mt-4 block space-y-1 text-sm font-medium text-slate-700">
          Email
          <input
            className={inputClass}
            data-testid="checkout-email"
            type="email"
            autoComplete="email"
            value={value.email}
            onChange={(event) => {
              setValue({ ...value, email: event.target.value })
            }}
          />
        </label>
      ) : null}

      {value.step === 2 ? (
        <label className="mt-4 block space-y-1 text-sm font-medium text-slate-700">
          Delivery method
          <select
            className={selectClass}
            data-testid="checkout-delivery"
            value={value.delivery}
            onChange={(event) => {
              setValue({
                ...value,
                delivery: event.target.value as CheckoutDraft['delivery'],
              })
            }}
          >
            <option value="standard">Standard</option>
            <option value="express">Express</option>
          </select>
        </label>
      ) : null}

      {value.step === 3 ? (
        <p
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          data-testid="checkout-review"
        >
          Review: {value.email || '(no email)'} · {value.delivery} delivery
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="checkout-back"
          disabled={value.step <= 1}
          onClick={goBack}
        >
          Back
        </button>
        <button
          type="button"
          className={buttonClass}
          data-testid="checkout-next"
          disabled={value.step >= 3}
          onClick={goNext}
        >
          Next
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Serialized preview
        </p>
        <pre className={codePreviewClass} data-testid="checkout-serialized">
          {raw}
        </pre>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="checkout-reset"
          onClick={() => {
            reset()
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className={dangerButtonClass}
          data-testid="checkout-discard"
          onClick={() => {
            remove()
          }}
        >
          Discard
        </button>
      </div>
    </>
  )
}

type WizardState = {
  step: number
  name: string
  plan: 'free' | 'pro'
}

const defaultWizard: WizardState = { step: 1, name: '', plan: 'free' }

export function RegistrationWizardExample(): ReactElement {
  const { value, setValue, isReady } = useSessionStorage(
    KEYS.registrationWizard,
    defaultWizard,
  )

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Registration wizard"
      description="Wizard step, name, and plan persist for the tab session. Back and Next mutate the stored object without losing earlier fields."
      instruction="Move through steps with Back/Next and confirm progress and field values restore after reload in this tab."
      code={registrationWizardSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'wizard-ready',
            },
            { label: 'step', value: String(value.step), testId: 'wizard-step' },
            {
              label: 'name',
              value: value.name || '(empty)',
              testId: 'wizard-name',
            },
            { label: 'plan', value: value.plan, testId: 'wizard-plan' },
          ]}
        />
      }
    >
      <div className="space-y-4">
        <progress
          className="h-2 w-full"
          data-testid="wizard-progress"
          value={value.step}
          max={3}
          aria-label="Registration progress"
        />
        <p className="text-sm text-slate-700" data-testid="wizard-step-label">
          Step {value.step} of 3
        </p>

        {value.step === 1 ? (
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            Full name
            <input
              className={inputClass}
              data-testid="wizard-name-input"
              value={value.name}
              onChange={(event) => {
                setValue({ ...value, name: event.target.value })
              }}
            />
          </label>
        ) : null}

        {value.step === 2 ? (
          <fieldset className={`${panelClass} space-y-2`}>
            <legend className="text-sm font-semibold text-slate-900">
              Plan
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="plan"
                data-testid="wizard-plan-free"
                checked={value.plan === 'free'}
                onChange={() => {
                  setValue({ ...value, plan: 'free' })
                }}
              />
              Free
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="plan"
                data-testid="wizard-plan-pro"
                checked={value.plan === 'pro'}
                onChange={() => {
                  setValue({ ...value, plan: 'pro' })
                }}
              />
              Pro
            </label>
          </fieldset>
        ) : null}

        {value.step === 3 ? (
          <p className={panelClass} data-testid="wizard-summary">
            {value.name || 'Guest'} · {value.plan} plan
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={secondaryButtonClass}
            data-testid="wizard-back"
            disabled={value.step <= 1}
            onClick={() => {
              setValue({ ...value, step: value.step - 1 })
            }}
          >
            Back
          </button>
          <button
            type="button"
            className={buttonClass}
            data-testid="wizard-next"
            disabled={value.step >= 3}
            onClick={() => {
              setValue({ ...value, step: value.step + 1 })
            }}
          >
            Next
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}

type Workspace = {
  panel: 'overview' | 'details'
  filters: string[]
  viewMode: 'grid' | 'list'
}

const defaultWorkspace: Workspace = {
  panel: 'overview',
  filters: [],
  viewMode: 'grid',
}

function WorkspacePanel({ remountKey }: { remountKey: number }): ReactElement {
  const { value, setValue, isReady } = useSessionStorage(
    KEYS.tabWorkspace,
    defaultWorkspace,
  )

  return (
    <div className={panelClass} key={remountKey} data-testid="workspace-panel">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={
            value.panel === 'overview' ? buttonClass : secondaryButtonClass
          }
          data-testid="workspace-overview"
          onClick={() => {
            setValue({ ...value, panel: 'overview' })
          }}
        >
          Overview
        </button>
        <button
          type="button"
          className={
            value.panel === 'details' ? buttonClass : secondaryButtonClass
          }
          data-testid="workspace-details"
          onClick={() => {
            setValue({ ...value, panel: 'details' })
          }}
        >
          Details
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="workspace-toggle-view"
          onClick={() => {
            setValue((current) => ({
              ...current,
              viewMode: current.viewMode === 'grid' ? 'list' : 'grid',
            }))
          }}
        >
          View: {value.viewMode}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="workspace-add-filter"
          onClick={() => {
            setValue((current) => ({
              ...current,
              filters: [
                ...current.filters,
                `filter-${current.filters.length + 1}`,
              ],
            }))
          }}
        >
          Add filter
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-700" data-testid="workspace-status">
        Panel: {value.panel} · Filters: {value.filters.join(', ') || 'none'} ·
        View: {value.viewMode}
      </p>
      <span className="sr-only" data-testid="workspace-ready">
        {String(isReady)}
      </span>
    </div>
  )
}

export function TabWorkspaceExample(): ReactElement {
  const [mounted, setMounted] = useState(true)
  const [remountKey, setRemountKey] = useState(0)

  const remount = () => {
    setMounted(false)
    queueMicrotask(() => {
      setRemountKey((value) => value + 1)
      setMounted(true)
    })
  }

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Tab workspace"
      description="Panel, filters, and view mode restore after remount within the same tab session."
      instruction="Change workspace settings, remount the panel, and confirm state returns from sessionStorage."
      code={tabWorkspaceSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'workspace-mounted',
            },
            {
              label: 'Remount key',
              value: String(remountKey),
              testId: 'workspace-remount-key',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={secondaryButtonClass}
        data-testid="workspace-remount"
        onClick={remount}
      >
        Remount workspace
      </button>
      {mounted ? <WorkspacePanel remountKey={remountKey} /> : null}
    </ExampleShowcase>
  )
}

type ContactDraft = {
  name: string
  message: string
}

const defaultContact: ContactDraft = { name: '', message: '' }

export function TemporaryFormExample(): ReactElement {
  const { value, setValue, isReady } = useSessionStorage(
    KEYS.temporaryForm,
    defaultContact,
  )
  const raw = useStoredRaw(KEYS.temporaryForm, value)

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Temporary form"
      description="Contact drafts survive reloads in this tab but disappear when the tab closes — unlike localStorage, which persists across browser restarts."
      instruction="Type a contact draft and compare session scope to durable localStorage in the isolation story."
      code={temporaryFormSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'isReady', value: String(isReady), testId: 'form-ready' },
            { label: 'stored', value: raw, testId: 'form-raw' },
          ]}
        />
      }
    >
      <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        Session storage is tab-scoped and temporary. Use localStorage when data
        must survive closing the browser.
      </p>
      <label className="mt-3 block space-y-1 text-sm font-medium text-slate-700">
        Name
        <input
          className={inputClass}
          data-testid="form-name"
          value={value.name}
          onChange={(event) => {
            setValue({ ...value, name: event.target.value })
          }}
        />
      </label>
      <label className="mt-3 block space-y-1 text-sm font-medium text-slate-700">
        Message
        <textarea
          className={`${inputClass} min-h-24`}
          data-testid="form-message"
          value={value.message}
          onChange={(event) => {
            setValue({ ...value, message: event.target.value })
          }}
        />
      </label>
    </ExampleShowcase>
  )
}

function CounterPanel({ remountKey }: { remountKey: number }): ReactElement {
  const { value, setValue, isReady } = useSessionStorage(KEYS.counter, 0)

  return (
    <div className={panelClass} data-testid="counter-panel" key={remountKey}>
      <p className="text-sm text-slate-700" aria-live="polite">
        Count:{' '}
        <span
          className="font-mono text-lg font-semibold text-indigo-700"
          data-testid="counter-value"
        >
          {isReady ? value : '…'}
        </span>
      </p>
      <button
        type="button"
        className={`${buttonClass} mt-3`}
        data-testid="counter-increment"
        disabled={!isReady}
        onClick={() => {
          setValue((count) => count + 1)
        }}
      >
        Increment
      </button>
      <span className="sr-only" data-testid="counter-ready">
        {String(isReady)}
      </span>
    </div>
  )
}

export function PersistentCounterExample(): ReactElement {
  const [mounted, setMounted] = useState(true)
  const [remountKey, setRemountKey] = useState(0)

  const remount = () => {
    setMounted(false)
    queueMicrotask(() => {
      setRemountKey((value) => value + 1)
      setMounted(true)
    })
  }

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Persistent counter"
      description="Numbers round-trip through sessionStorage. Remount the panel to prove hydration reads the stored count."
      instruction="Increment a few times, remount, and confirm the count restores for this tab session."
      code={persistentCounterSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'counter-mounted',
            },
            {
              label: 'Remount key',
              value: String(remountKey),
              testId: 'counter-remount-key',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={secondaryButtonClass}
        data-testid="counter-remount"
        onClick={remount}
      >
        Remount panel
      </button>
      {mounted ? <CounterPanel remountKey={remountKey} /> : null}
    </ExampleShowcase>
  )
}

export function BooleanFlagExample(): ReactElement {
  const {
    value: dismissed,
    setValue: setDismissed,
    isReady,
  } = useSessionStorage(KEYS.booleanFlag, false)
  const raw = useStoredRaw(KEYS.booleanFlag, dismissed)

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Boolean flag"
      description="false is a valid persisted value — the boolean serializer stores literal true and false strings."
      instruction="Dismiss the banner and confirm false remains stored, not a missing key."
      code={booleanFlagSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'isReady', value: String(isReady), testId: 'bool-ready' },
            {
              label: 'dismissed',
              value: String(dismissed),
              testId: 'bool-value',
            },
            { label: 'stored', value: raw, testId: 'bool-raw' },
          ]}
        />
      }
    >
      {dismissed ? (
        <p
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          data-testid="banner-dismissed-message"
        >
          Banner dismissed for this tab session.
        </p>
      ) : (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
          role="status"
          data-testid="promo-banner"
        >
          <p className="text-sm font-semibold text-amber-900">
            Limited-time offer
          </p>
          <button
            type="button"
            className={`${secondaryButtonClass} mt-2`}
            data-testid="bool-dismiss"
            onClick={() => {
              setDismissed(true)
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </ExampleShowcase>
  )
}

type TaskState = {
  title: string
  items: string[]
}

const defaultTasks: TaskState = { title: 'My tasks', items: ['Review PR'] }

export function ObjectAndArrayExample(): ReactElement {
  const { value, setValue, isReady } = useSessionStorage(
    KEYS.objectArray,
    defaultTasks,
  )

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Object and array"
      description="Functional setValue updates nested objects and arrays immutably for tab-scoped task lists."
      instruction="Rename the list and add tasks. Each update writes a fresh immutable snapshot."
      code={objectAndArraySnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'isReady', value: String(isReady), testId: 'task-ready' },
            { label: 'title', value: value.title, testId: 'task-title' },
            {
              label: 'items',
              value: value.items.join(', '),
              testId: 'task-items',
            },
          ]}
        />
      }
    >
      <div className="space-y-3">
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          List title
          <input
            className={inputClass}
            data-testid="task-title-input"
            value={value.title}
            onChange={(event) => {
              setValue((current) => ({ ...current, title: event.target.value }))
            }}
          />
        </label>
        <button
          type="button"
          className={buttonClass}
          data-testid="task-add"
          onClick={() => {
            setValue((current) => ({
              ...current,
              items: [...current.items, `task-${current.items.length + 1}`],
            }))
          }}
        >
          Add task
        </button>
        <ul
          className="list-inside list-disc text-sm text-slate-700"
          data-testid="task-list"
        >
          {value.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </ExampleShowcase>
  )
}

export function DateMapSetExample(): ReactElement {
  const defaultDate = useMemo(() => new Date('2026-01-01T00:00:00.000Z'), [])
  const defaultMap = useMemo(() => new Map<string, number>([['alpha', 1]]), [])
  const defaultSet = useMemo(() => new Set(['react', 'hooks']), [])

  const dateState = useSessionStorage(KEYS.dateMapSet + ':date', defaultDate)
  const mapState = useSessionStorage(KEYS.dateMapSet + ':map', defaultMap)
  const setState = useSessionStorage(KEYS.dateMapSet + ':set', defaultSet)

  const dateRaw = useStoredRaw(KEYS.dateMapSet + ':date', dateState.value)
  const mapRaw = useStoredRaw(KEYS.dateMapSet + ':map', mapState.value)
  const setRaw = useStoredRaw(KEYS.dateMapSet + ':set', setState.value)

  const ready = dateState.isReady && mapState.isReady && setState.isReady

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Date, Map, and Set"
      description="Automatic serializers handle Date, Map, and Set in sessionStorage."
      instruction="Inspect live values and the raw sessionStorage representation for each structured type."
      code={dateMapSetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(ready),
              testId: 'structured-ready',
            },
            {
              label: 'Date',
              value: dateState.value.toISOString(),
              testId: 'structured-date',
            },
            {
              label: 'Map size',
              value: String(mapState.value.size),
              testId: 'structured-map-size',
            },
            {
              label: 'Set size',
              value: String(setState.value.size),
              testId: 'structured-set-size',
            },
          ]}
        />
      }
    >
      <div className="grid gap-3 lg:grid-cols-3">
        <div className={panelClass}>
          <p className="text-xs font-semibold text-slate-500 uppercase">Date</p>
          <p className="mt-2 text-sm text-slate-800">
            {dateState.value.toISOString()}
          </p>
          <pre
            className={`${codePreviewClass} mt-2`}
            data-allow-h-scroll
            data-testid="structured-date-raw"
            tabIndex={0}
            aria-label="Serialized Date value"
          >
            {dateRaw}
          </pre>
        </div>
        <div className={panelClass}>
          <p className="text-xs font-semibold text-slate-500 uppercase">Map</p>
          <p className="mt-2 text-sm text-slate-800">
            {[...mapState.value.entries()]
              .map(([key, score]) => `${key}:${score}`)
              .join(', ')}
          </p>
          <pre
            className={`${codePreviewClass} mt-2`}
            data-allow-h-scroll
            data-testid="structured-map-raw"
            tabIndex={0}
            aria-label="Serialized Map value"
          >
            {mapRaw}
          </pre>
        </div>
        <div className={panelClass}>
          <p className="text-xs font-semibold text-slate-500 uppercase">Set</p>
          <p className="mt-2 text-sm text-slate-800">
            {[...setState.value.values()].join(', ')}
          </p>
          <pre
            className={`${codePreviewClass} mt-2`}
            data-allow-h-scroll
            data-testid="structured-set-raw"
            tabIndex={0}
            aria-label="Serialized Set value"
          >
            {setRaw}
          </pre>
        </div>
      </div>
    </ExampleShowcase>
  )
}

type VersionedPoint = { x: number; y: number; version: number }

const versionedSerializer = {
  read(raw: string): VersionedPoint {
    const [version, x, y] = raw.split('|')
    if (version !== 'v1') {
      throw new Error('Unsupported version')
    }
    return { version: 1, x: Number(x), y: Number(y) }
  },
  write(value: VersionedPoint): string {
    return `v1|${value.x}|${value.y}`
  },
}

export function CustomSerializerExample(): ReactElement {
  const { value, setValue, isReady } = useSessionStorage(
    KEYS.customSerializer,
    { x: 0, y: 0, version: 1 },
    { serializer: versionedSerializer },
  )
  const raw = useStoredRaw(KEYS.customSerializer, value)

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Custom serializer"
      description="Pass a serializer object with read and write when JSON is not the right on-disk format."
      instruction="Move the point and inspect the delimited v1 payload written to sessionStorage."
      code={customSerializerSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'custom-ready',
            },
            { label: 'x', value: String(value.x), testId: 'custom-x' },
            { label: 'y', value: String(value.y), testId: 'custom-y' },
            { label: 'stored', value: raw, testId: 'custom-raw' },
          ]}
        />
      }
    >
      <div className={`${panelClass} flex flex-wrap items-center gap-4`}>
        <p className="font-mono text-sm text-slate-800">
          ({value.x}, {value.y})
        </p>
        <button
          type="button"
          className={buttonClass}
          data-testid="custom-move"
          onClick={() => {
            setValue((current) => ({ ...current, x: current.x + 1 }))
          }}
        >
          Move right
        </button>
      </div>
    </ExampleShowcase>
  )
}

type MergeSettings = {
  theme: string
  fontSize: number
  beta: boolean
}

const mergeDefaultsValue: MergeSettings = {
  theme: 'light',
  fontSize: 16,
  beta: false,
}

function MergePanel({
  label,
  storageKeyName,
  mergeDefaults,
  testPrefix,
}: {
  label: string
  storageKeyName: string
  mergeDefaults: boolean
  testPrefix: string
}): ReactElement {
  const { value, isReady } = useSessionStorage(
    storageKeyName,
    mergeDefaultsValue,
    { mergeDefaults },
  )

  return (
    <div className={panelClass} data-testid={`${testPrefix}-panel`}>
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <span className="sr-only" data-testid={`${testPrefix}-ready`}>
        {String(isReady)}
      </span>
      <pre
        className={`${codePreviewClass} mt-2 text-[11px]`}
        data-testid={`${testPrefix}-value`}
      >
        {JSON.stringify(value)}
      </pre>
    </div>
  )
}

export function MergeDefaultsExample(): ReactElement {
  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Merge defaults"
      description="When stored JSON is missing newly added default fields, mergeDefaults shallow-merges defaults underneath stored values."
      instruction="Compare panels after seeding legacy storage that only contains theme."
      code={mergeDefaultsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Seeded shape',
              value: '{"theme":"dark"}',
              testId: 'merge-seed-label',
            },
          ]}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <MergePanel
          label="mergeDefaults: false"
          storageKeyName={KEYS.mergeDisabled}
          mergeDefaults={false}
          testPrefix="merge-off"
        />
        <MergePanel
          label="mergeDefaults: true"
          storageKeyName={KEYS.mergeEnabled}
          mergeDefaults={true}
          testPrefix="merge-on"
        />
      </div>
    </ExampleShowcase>
  )
}

function SharedEditor({
  testId,
  readOnly = false,
}: {
  testId: string
  readOnly?: boolean
}): ReactElement {
  const { value, setValue, isReady } = useSessionStorage(KEYS.twoComponents, '')

  if (readOnly) {
    return (
      <output
        className="block min-h-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
        data-testid={testId}
        aria-label="Shared note mirror"
      >
        {isReady ? value : 'Loading…'}
      </output>
    )
  }

  return (
    <textarea
      className={`${inputClass} min-h-24`}
      data-testid={testId}
      aria-label="Shared note editor"
      value={value}
      onChange={(event) => {
        setValue(event.target.value)
      }}
    />
  )
}

export function TwoComponentsExample(): ReactElement {
  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Two components"
      description="Same-document updates fan out through the internal registry so multiple hook instances stay in sync instantly."
      instruction="Type in editor A and watch editor B mirror the value without a reload."
      code={twoComponentsSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Key', value: KEYS.twoComponents, testId: 'sync-key' },
          ]}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
            Editor A
          </p>
          <SharedEditor testId="sync-editor-a" />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
            Editor B
          </p>
          <SharedEditor testId="sync-editor-b" readOnly />
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function StorageAreaIsolationExample(): ReactElement {
  const local = useLocalStorage(KEYS.storageIsolation, 'local default')
  const session = useSessionStorage(KEYS.storageIsolation, 'session default')
  const localRaw = useLocalStoredRaw(KEYS.storageIsolation, local.value)
  const sessionRaw = useStoredRaw(KEYS.storageIsolation, session.value)

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Storage-area isolation"
      description="The same key string in localStorage and sessionStorage refers to independent storage areas — writes in one never overwrite the other."
      instruction="Write to each area and confirm both values coexist with separate raw previews."
      code={storageIsolationSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Shared key',
              value: KEYS.storageIsolation,
              testId: 'isolation-key',
            },
            {
              label: 'local isReady',
              value: String(local.isReady),
              testId: 'isolation-local-ready',
            },
            {
              label: 'session isReady',
              value: String(session.isReady),
              testId: 'isolation-session-ready',
            },
          ]}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={panelClass}>
          <p className="text-sm font-semibold text-slate-900">localStorage</p>
          <p
            className="mt-2 text-sm text-slate-800"
            data-testid="isolation-local-value"
          >
            {local.value}
          </p>
          <pre
            className={`${codePreviewClass} mt-2 text-[11px]`}
            data-testid="isolation-local-raw"
          >
            {localRaw}
          </pre>
          <button
            type="button"
            className={`${buttonClass} mt-3`}
            data-testid="isolation-write-local"
            onClick={() => {
              local.setValue('local value')
            }}
          >
            Write local
          </button>
        </div>
        <div className={panelClass}>
          <p className="text-sm font-semibold text-slate-900">sessionStorage</p>
          <p
            className="mt-2 text-sm text-slate-800"
            data-testid="isolation-session-value"
          >
            {session.value}
          </p>
          <pre
            className={`${codePreviewClass} mt-2 text-[11px]`}
            data-testid="isolation-session-raw"
          >
            {sessionRaw}
          </pre>
          <button
            type="button"
            className={`${buttonClass} mt-3`}
            data-testid="isolation-write-session"
            onClick={() => {
              session.setValue('session value')
            }}
          >
            Write session
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function RelatedContextEventExample(): ReactElement {
  const { value, isReady } = useSessionStorage(KEYS.relatedContext, 0)
  const [ignored, setIgnored] = useState('none')

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Related-context event"
      description="Storage events can update the hook when another document in a related browsing context writes sessionStorage. Separate tabs do not share session storage."
      instruction="Simulate a related-context write, then dispatch an unrelated event and confirm the value stays put."
      code={relatedContextEventSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'context-ready',
            },
            { label: 'value', value: String(value), testId: 'context-value' },
            {
              label: 'ignored event',
              value: ignored,
              testId: 'context-ignored',
            },
          ]}
        />
      }
    >
      <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        Session storage is scoped to one tab. Unlike localStorage, other tabs
        never read or write the same session entries.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="context-simulate"
          onClick={() => {
            window.dispatchEvent(
              new StorageEvent('storage', {
                key: KEYS.relatedContext,
                newValue: '42',
                storageArea: sessionStorage,
              }),
            )
          }}
        >
          Simulate related-context write (42)
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="context-unrelated"
          onClick={() => {
            window.dispatchEvent(
              new StorageEvent('storage', {
                key: storageKey('unrelated'),
                newValue: '999',
                storageArea: sessionStorage,
              }),
            )
            setIgnored('999')
          }}
        >
          Dispatch unrelated event
        </button>
      </div>
    </ExampleShowcase>
  )
}

type Profile = { name: string }

export function DynamicKeyExample(): ReactElement {
  const [profile, setProfile] = useState<'a' | 'b'>('a')
  const key = profile === 'a' ? KEYS.profileA : KEYS.profileB
  const { value, setValue, isReady } = useSessionStorage<Profile>(key, {
    name: 'Guest',
  })

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Dynamic key"
      description="Changing the key rehydrates from a different sessionStorage entry while preserving independent profile drafts."
      instruction="Switch profiles, edit each name, and switch back to confirm both values persisted separately."
      code={dynamicKeySnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Active profile',
              value: profile,
              testId: 'dynamic-profile',
            },
            { label: 'key', value: key, testId: 'dynamic-key' },
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'dynamic-ready',
            },
            { label: 'name', value: value.name, testId: 'dynamic-name' },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={profile === 'a' ? buttonClass : secondaryButtonClass}
          data-testid="dynamic-profile-a"
          onClick={() => {
            setProfile('a')
          }}
        >
          Profile A
        </button>
        <button
          type="button"
          className={profile === 'b' ? buttonClass : secondaryButtonClass}
          data-testid="dynamic-profile-b"
          onClick={() => {
            setProfile('b')
          }}
        >
          Profile B
        </button>
      </div>
      <label className="mt-3 block space-y-1 text-sm font-medium text-slate-700">
        Display name
        <input
          className={inputClass}
          data-testid="dynamic-name-input"
          value={value.name}
          onChange={(event) => {
            setValue({ name: event.target.value })
          }}
        />
      </label>
    </ExampleShowcase>
  )
}

function WriteDefaultsPanel({
  label,
  storageKeyName,
  writeDefaults,
  testPrefix,
}: {
  label: string
  storageKeyName: string
  writeDefaults: boolean
  testPrefix: string
}): ReactElement {
  const { isReady } = useSessionStorage(storageKeyName, 'hello', {
    writeDefaults,
  })
  const raw = useStoredRaw(storageKeyName, isReady)

  return (
    <div className={panelClass} data-testid={`${testPrefix}-panel`}>
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <span className="sr-only" data-testid={`${testPrefix}-ready`}>
        {String(isReady)}
      </span>
      <p
        className="mt-2 font-mono text-sm text-slate-800"
        data-testid={`${testPrefix}-raw`}
      >
        raw: {raw}
      </p>
    </div>
  )
}

export function WriteDefaultsExample(): ReactElement {
  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Write defaults"
      description="writeDefaults controls whether missing keys are seeded on first hydration. Disable it to keep sessionStorage empty until the user edits."
      instruction="Compare panels when no key exists: enabled writes hello immediately, disabled leaves the key missing."
      code={writeDefaultsSnippet}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <WriteDefaultsPanel
          label="writeDefaults: true"
          storageKeyName={KEYS.writeDefaultsOn}
          writeDefaults={true}
          testPrefix="write-on"
        />
        <WriteDefaultsPanel
          label="writeDefaults: false"
          storageKeyName={KEYS.writeDefaultsOff}
          writeDefaults={false}
          testPrefix="write-off"
        />
      </div>
    </ExampleShowcase>
  )
}

export function MalformedValueExample(): ReactElement {
  const { value, error, remove, reset, isReady } = useSessionStorage(
    KEYS.malformed,
    { mode: 'safe' },
  )

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Malformed value"
      description="Invalid stored payloads fall back to defaults and surface a readable error. Remove clears the bad entry; reset rewrites a valid default."
      instruction="Seed corrupt JSON, observe the error, then Remove or Repair."
      code={malformedValueSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'malformed-ready',
            },
            {
              label: 'value',
              value: JSON.stringify(value),
              testId: 'malformed-value',
            },
            {
              label: 'error',
              value: error?.message ?? 'none',
              testId: 'malformed-error',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={dangerButtonClass}
          data-testid="malformed-remove"
          onClick={() => {
            remove()
          }}
        >
          Remove
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="malformed-repair"
          onClick={() => {
            reset()
          }}
        >
          Repair
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function StorageUnavailableExample(): ReactElement {
  const { value, setValue, isSupported, isReady } = useSessionStorage(
    KEYS.storageUnavailable,
    'fallback',
    { window: null },
  )

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Storage unavailable"
      description="When storage throws or is unavailable, isSupported is false, errors are reported, and React state still updates locally."
      instruction="Edit the draft even though persistence is blocked. The warning is exposed to assistive tech."
      code={storageUnavailableSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'denied-ready',
            },
            {
              label: 'isSupported',
              value: String(isSupported),
              testId: 'denied-supported',
            },
            { label: 'value', value, testId: 'denied-value' },
          ]}
        />
      }
    >
      <div
        role="alert"
        className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        data-testid="denied-warning"
      >
        Storage is unavailable in this restricted context. Changes stay in
        memory only.
      </div>
      <label className="mt-3 block space-y-1 text-sm font-medium text-slate-700">
        Draft
        <textarea
          className={`${inputClass} min-h-24`}
          data-testid="denied-input"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
          }}
        />
      </label>
    </ExampleShowcase>
  )
}

export function RemoveVsResetExample(): ReactElement {
  const { value, remove, reset, isReady } = useSessionStorage(
    KEYS.removeReset,
    10,
  )
  const raw = useStoredRaw(KEYS.removeReset, value)

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Remove versus reset"
      description="reset writes the default value back to sessionStorage. remove deletes the key so the next hydration behaves like a missing entry."
      instruction="Try reset and remove in turn while watching the raw storage value."
      code={removeVsResetSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'isReady', value: String(isReady), testId: 'rr-ready' },
            { label: 'value', value: String(value), testId: 'rr-value' },
            { label: 'raw', value: raw, testId: 'rr-raw' },
          ]}
        />
      }
    >
      <p className="font-mono text-2xl font-semibold text-indigo-700">
        {value}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="rr-reset"
          onClick={() => {
            reset()
          }}
        >
          Reset (writes default)
        </button>
        <button
          type="button"
          className={dangerButtonClass}
          data-testid="rr-remove"
          onClick={() => {
            remove()
          }}
        >
          Remove (deletes key)
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function CustomWindowExample(): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [targetWindow, setTargetWindow] = useState<Window | null>(null)
  const [ready, setReady] = useState(false)
  const { value, setValue, isReady, isSupported } = useSessionStorage(
    KEYS.customWindow,
    'hello',
    { window: targetWindow },
  )

  const bindIframe = useCallback((frame: HTMLIFrameElement) => {
    setTargetWindow(frame.contentWindow ?? null)
    setReady(true)
  }, [])

  useIsolatedIframeBind(iframeRef, bindIframe)

  const iframeRaw =
    targetWindow == null
      ? '(iframe not ready)'
      : (targetWindow.sessionStorage.getItem(KEYS.customWindow) ?? '(missing)')

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Custom window"
      description="Pass options.window to isolate sessionStorage inside a same-origin iframe without touching the Storybook page sessionStorage."
      instruction="Wait for the iframe, edit the note, and inspect storage scoped to the frame."
      code={customWindowSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'iframe ready',
              value: String(ready),
              testId: 'iframe-ready',
            },
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'iframe-ss-ready',
            },
            {
              label: 'isSupported',
              value: String(isSupported),
              testId: 'iframe-supported',
            },
            { label: 'iframe raw', value: iframeRaw, testId: 'iframe-raw' },
          ]}
        />
      }
    >
      <iframe
        ref={iframeRef}
        title="Isolated sessionStorage frame"
        data-testid="custom-window-iframe"
        className="h-40 w-full rounded-xl border border-slate-200 bg-white"
        srcDoc="<!doctype html><html><head><style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:linear-gradient(#eef2ff,#fff);min-height:120px;}</style></head><body><p>Isolated frame session storage</p></body></html>"
      />
      <label className="mt-3 block space-y-1 text-sm font-medium text-slate-700">
        Frame note
        <input
          className={inputClass}
          data-testid="iframe-note-input"
          disabled={!ready || !isReady}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
          }}
        />
      </label>
    </ExampleShowcase>
  )
}

type PlaygroundDefault = string | number | boolean | Record<string, unknown>

function PlaygroundBody({
  storageKeyName,
  defaultValue,
  mergeDefaults,
  writeDefaults,
  listenToStorageChanges,
}: {
  storageKeyName: string
  defaultValue: PlaygroundDefault
  mergeDefaults: boolean
  writeDefaults: boolean
  listenToStorageChanges: boolean
}): ReactElement {
  const state = useSessionStorage(storageKeyName, defaultValue, {
    mergeDefaults,
    writeDefaults,
    listenToStorageChanges,
  })

  return (
    <div className="space-y-3" data-testid="playground-body">
      <pre
        className={`${codePreviewClass} text-[11px] whitespace-pre-wrap`}
        data-testid="playground-state"
      >
        {JSON.stringify(
          {
            value: state.value,
            isReady: state.isReady,
            isSupported: state.isSupported,
            error: state.error?.message ?? null,
          },
          null,
          2,
        )}
      </pre>
      <button
        type="button"
        className={buttonClass}
        data-testid="playground-bump"
        disabled={typeof state.value !== 'number'}
        onClick={() => {
          if (typeof state.value === 'number') {
            state.setValue(state.value + 1)
          }
        }}
      >
        Bump number
      </button>
    </div>
  )
}

export function PlaygroundExample({
  playgroundKey = 'playground',
  defaultType = 'number',
  mergeDefaults = false,
  writeDefaults = true,
  listenToStorageChanges = true,
}: {
  playgroundKey?: string
  defaultType?: 'string' | 'number' | 'boolean' | 'object'
  mergeDefaults?: boolean
  writeDefaults?: boolean
  listenToStorageChanges?: boolean
}): ReactElement {
  const [mounted, setMounted] = useState(false)
  const storageKeyName = storageKey(playgroundKey)

  const defaultValue = useMemo<PlaygroundDefault>(() => {
    switch (defaultType) {
      case 'string':
        return 'hello'
      case 'boolean':
        return true
      case 'object':
        return { alpha: 1 }
      default:
        return 0
    }
  }, [defaultType])

  return (
    <ExampleShowcase
      hookName="useSessionStorage"
      title="Playground"
      description="Mount explicitly so Docs does not write sessionStorage on load. Tune key, default type, mergeDefaults, writeDefaults, and sync via Controls."
      instruction="Mount the playground, tweak Controls, and inspect the live hook state JSON."
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'playground-mounted',
            },
            { label: 'key', value: storageKeyName, testId: 'playground-key' },
            {
              label: 'defaultType',
              value: defaultType,
              testId: 'playground-default-type',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="playground-mount"
        onClick={() => {
          setMounted(true)
        }}
      >
        Mount playground
      </button>
      {mounted ? (
        <PlaygroundBody
          key={`${storageKeyName}-${defaultType}-${mergeDefaults}-${writeDefaults}-${listenToStorageChanges}`}
          storageKeyName={storageKeyName}
          defaultValue={defaultValue}
          mergeDefaults={mergeDefaults}
          writeDefaults={writeDefaults}
          listenToStorageChanges={listenToStorageChanges}
        />
      ) : null}
    </ExampleShowcase>
  )
}

export function WithSeed({
  seed,
  children,
}: {
  seed: () => void
  children: ReactNode
}): ReactElement {
  const [ready, setReady] = useState(false)
  const seededRef = useRef(false)

  useEffect(() => {
    if (seededRef.current) {
      return
    }
    seed()
    seededRef.current = true
    setReady(true)
  }, [seed])

  if (!ready) {
    return <p data-testid="seed-loading">Seeding…</p>
  }

  return <>{children}</>
}
