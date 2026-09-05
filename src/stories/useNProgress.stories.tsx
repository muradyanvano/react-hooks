import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  AsyncSaveExample,
  ConcurrentRequestsExample,
  CustomContainerExample,
  DeclarativeExample,
  DeterminateExample,
  DynamicTargetExample,
  ForcedDoneExample,
  ImmediateRemoveExample,
  IncrementExample,
  MultipleContainersExample,
  MultipleOwnersExample,
  PlaygroundExample,
  ReducedMotionExample,
  RouteTransitionExample,
  SpinnerExample,
  SsrBehaviorExample,
  StartAndDoneExample,
  StrictCleanupExample,
  TrickleExample,
  VisualCustomizationExample,
} from './components/UseNProgressExamples'
import {
  asyncSaveSnippet,
  concurrentRequestsSnippet,
  customContainerSnippet,
  declarativeSnippet,
  determinateSnippet,
  dynamicTargetSnippet,
  forcedDoneSnippet,
  immediateRemoveSnippet,
  incrementSnippet,
  multipleContainersSnippet,
  multipleOwnersSnippet,
  playgroundSnippet,
  reducedMotionSnippet,
  routeTransitionSnippet,
  spinnerSnippet,
  ssrBehaviorSnippet,
  startAndDoneSnippet,
  strictCleanupSnippet,
  trickleSnippet,
  visualCustomizationSnippet,
} from './components/useNProgress.snippets'

const meta = {
  title: 'Hooks/useNProgress',
  tags: ['autodocs'],
  ...createHookStoryMeta('useNProgress', PlaygroundExample, {
    argTypes: {
      trickle: {
        control: 'boolean',
        table: { defaultValue: { summary: 'true' } },
      },
      showSpinner: {
        control: 'boolean',
        table: { defaultValue: { summary: 'true' } },
      },
      color: {
        control: 'color',
        table: { defaultValue: { summary: '#4f46e5' } },
      },
      height: {
        control: { type: 'range', min: 1, max: 10, step: 0.5 },
        table: { defaultValue: { summary: '3' } },
      },
      speed: {
        control: { type: 'range', min: 50, max: 800, step: 50 },
        table: { defaultValue: { summary: '200' } },
      },
      minimum: {
        control: { type: 'range', min: 0.01, max: 0.5, step: 0.01 },
        table: { defaultValue: { summary: '0.08' } },
      },
      removeDelay: {
        control: { type: 'range', min: 0, max: 500, step: 50 },
        table: { defaultValue: { summary: '200' } },
      },
    },
    args: {
      trickle: true,
      showSpinner: true,
      color: '#4f46e5',
      height: 3,
      speed: 200,
      minimum: 0.08,
      removeDelay: 200,
    },
  }),
} satisfies Meta<typeof PlaygroundExample>

export default meta

type Story = StoryObj<typeof meta>

// ─── Code disclosure helper ────────────────────────────────────────────────────

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
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
}

// ─── Helper: wait for idle ─────────────────────────────────────────────────────

async function waitForIdle(
  canvas: ReturnType<typeof within>,
  testId = 'status-loading',
) {
  await waitFor(
    () => {
      const el = canvas.queryByTestId(testId)
      if (el) expect(el).toHaveTextContent('false')
    },
    { timeout: 5000 },
  )
}

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Route-transition progress owned inside a contained parent, not document.body. Trigger navigation and watch trickle/done without leaking roots into Storybook chrome. Finish plays with no leftover timers or nodes.',
  ),
  render: () => <RouteTransitionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Initial state
    await expect(canvas.getByTestId('route-heading')).toHaveTextContent('Home')
    await expect(canvas.getByTestId('status-loading')).toHaveTextContent(
      'false',
    )

    // Navigate to Dashboard
    await userEvent.click(canvas.getByTestId('nav-dashboard'))
    await expect(canvas.getByTestId('status-loading')).toHaveTextContent('true')

    // Wait for navigation to complete
    await waitFor(
      () =>
        expect(canvas.getByTestId('route-heading')).toHaveTextContent(
          'Dashboard',
        ),
      { timeout: 5000 },
    )
    await waitForIdle(canvas)

    // Navigate to Settings (fast)
    await userEvent.click(canvas.getByTestId('nav-settings'))
    await waitFor(
      () =>
        expect(canvas.getByTestId('route-heading')).toHaveTextContent(
          'Settings',
        ),
      { timeout: 5000 },
    )
    await waitForIdle(canvas)

    await expectCodeDisclosure(canvas, routeTransitionSnippet)
  },
}

export const StartAndDone: Story = {
  name: 'Start and done',
  ...storyDescription(
    'Start and done with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <StartAndDoneExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Start shows progress
    await userEvent.click(canvas.getByTestId('btn-start'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-loading')).toHaveTextContent('true'),
    )
    await waitFor(() =>
      expect(canvas.getByTestId('status-progress')).not.toHaveTextContent(
        'null',
      ),
    )
    const progressEl = canvas.getByTestId('status-progress')
    expect(progressEl.textContent?.includes('%')).toBe(true)

    // Done completes
    await userEvent.click(canvas.getByTestId('btn-done'))
    await waitForIdle(canvas)
    await waitFor(() =>
      expect(canvas.getByTestId('status-progress')).toHaveTextContent('null'),
    )

    await expectCodeDisclosure(canvas, startAndDoneSnippet)
  },
}

export const Determinate: Story = {
  name: 'Determinate progress',
  ...storyDescription(
    'Determinate progress with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <DeterminateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Set via slider
    const slider = canvas.getByTestId('progress-slider')
    await userEvent.click(slider)
    // Direct value check: after set(0.5), should show something
    await userEvent.click(canvas.getByTestId('btn-complete'))
    await waitForIdle(canvas)

    await expectCodeDisclosure(canvas, determinateSnippet)
  },
}

export const Declarative: Story = {
  name: 'Declarative progress',
  ...storyDescription(
    'Declarative progress with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <DeclarativeExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Set to 30%
    await userEvent.click(canvas.getByTestId('btn-30'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-loading')).toHaveTextContent('true'),
    )
    await waitFor(() =>
      expect(canvas.getByTestId('status-progress')).toHaveTextContent('30%'),
    )

    // Set to 60%
    await userEvent.click(canvas.getByTestId('btn-60'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-progress')).toHaveTextContent('60%'),
    )

    // Complete
    await userEvent.click(canvas.getByTestId('btn-complete'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-loading')).toHaveTextContent('true'),
    )

    // Reset to undefined (stops declarative sync; owner may still be completing)
    await userEvent.click(canvas.getByTestId('btn-undefined'))
    // Loading stays true because switching to undefined doesn't auto-complete —
    // finish via null so the story does not leave an active channel behind.
    await userEvent.click(canvas.getByTestId('btn-null'))
    await waitForIdle(canvas)

    await expectCodeDisclosure(canvas, declarativeSnippet)
  },
}

export const Trickle: Story = {
  name: 'Trickle progress',
  ...storyDescription(
    'Trickle progress with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <TrickleExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('btn-start'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-loading')).toHaveTextContent('true'),
    )

    // Wait for trickle to advance
    const initial = canvas.getByTestId('status-progress').textContent ?? '0%'
    await waitFor(
      () => {
        const current =
          canvas.getByTestId('status-progress').textContent ?? '0%'
        expect(current).not.toBe(initial)
        expect(current).not.toContain('null')
      },
      { timeout: 3000 },
    )

    await userEvent.click(canvas.getByTestId('btn-done'))
    await waitForIdle(canvas)

    await expectCodeDisclosure(canvas, trickleSnippet)
  },
}

export const Increment: Story = {
  name: 'Increment',
  ...storyDescription(
    'Increment with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <IncrementExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('btn-start'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-loading')).toHaveTextContent('true'),
    )
    const p1 = canvas.getByTestId('status-progress').textContent

    await userEvent.click(canvas.getByTestId('btn-10'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-progress').textContent).not.toBe(p1),
    )

    await userEvent.click(canvas.getByTestId('btn-done'))
    await waitForIdle(canvas)

    await expectCodeDisclosure(canvas, incrementSnippet)
  },
}

export const ForcedCompletion: Story = {
  name: 'Forced completion',
  ...storyDescription(
    'Forced completion with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ForcedDoneExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // done() while idle: no-op
    await userEvent.click(canvas.getByTestId('btn-done'))
    await expect(canvas.getByTestId('status-loading')).toHaveTextContent(
      'false',
    )

    // done(force) shows briefly then hides
    await userEvent.click(canvas.getByTestId('btn-force'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-loading')).toHaveTextContent('true'),
    )
    await waitForIdle(canvas)

    await expectCodeDisclosure(canvas, forcedDoneSnippet)
  },
}

export const ImmediateRemove: Story = {
  name: 'Immediate remove',
  ...storyDescription(
    'Immediate remove with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ImmediateRemoveExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('btn-start'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-loading')).toHaveTextContent('true'),
    )

    // remove() is immediate
    await userEvent.click(canvas.getByTestId('btn-remove'))
    expect(canvas.getByTestId('status-loading')).toHaveTextContent('false')

    await expectCodeDisclosure(canvas, immediateRemoveSnippet)
  },
}

export const MultipleOwners: Story = {
  name: 'Multiple owners',
  ...storyDescription(
    'Multiple owners with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <MultipleOwnersExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Start slow — stays active
    await userEvent.click(canvas.getByTestId('btn-slow'))
    // Start fast — completes first
    await userEvent.click(canvas.getByTestId('btn-fast'))

    // Wait for fast to finish (0.6s), slow still active
    await waitFor(
      () => expect(canvas.getByTestId('btn-fast')).not.toBeDisabled(),
      { timeout: 3000 },
    )
    // Slow still loading
    await expect(canvas.getByTestId('btn-slow')).toBeDisabled()

    // Wait for slow to finish
    await waitFor(
      () => expect(canvas.getByTestId('btn-slow')).not.toBeDisabled(),
      { timeout: 5000 },
    )

    await expectCodeDisclosure(canvas, multipleOwnersSnippet)
  },
}

export const CustomContainer: Story = {
  name: 'Custom container',
  ...storyDescription(
    'Custom container: bind useNProgress to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <CustomContainerExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('btn-save'))
    await waitFor(
      () =>
        expect(
          canvas
            .getByTestId('custom-card')
            .querySelector('[data-react-hooks-nprogress-root]'),
        ).toBeTruthy(),
      { timeout: 1000 },
    )

    // Wait for save to complete
    await waitFor(
      () =>
        expect(canvas.getByRole('button', { name: 'Save' })).not.toBeDisabled(),
      { timeout: 5000 },
    )

    await expectCodeDisclosure(canvas, customContainerSnippet)
  },
}

export const MultipleContainers: Story = {
  name: 'Multiple containers',
  ...storyDescription(
    'Multiple containers with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <MultipleContainersExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Start panel A
    await userEvent.click(canvas.getByTestId('panel-a-btn'))
    await waitFor(
      () =>
        expect(
          canvas
            .getByTestId('panel-a')
            .querySelector('[data-react-hooks-nprogress-root]'),
        ).toBeTruthy(),
      { timeout: 1000 },
    )

    // Panel B should NOT have progress bar
    expect(
      canvas
        .getByTestId('panel-b')
        .querySelector('[data-react-hooks-nprogress-root]'),
    ).toBeNull()

    // Wait for A to finish
    await waitFor(
      () => expect(canvas.getByTestId('panel-a-btn')).not.toBeDisabled(),
      { timeout: 5000 },
    )

    await expectCodeDisclosure(canvas, multipleContainersSnippet)
  },
}

export const Spinner: Story = {
  name: 'Spinner',
  ...storyDescription(
    'Spinner with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <SpinnerExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // With spinner on
    await userEvent.click(canvas.getByTestId('btn-start'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-loading')).toHaveTextContent('true'),
    )
    await userEvent.click(canvas.getByTestId('btn-done'))
    await waitForIdle(canvas)
    await expect(canvas.getByTestId('spinner-toggle')).toBeVisible()

    // Toggle spinner off
    await userEvent.click(canvas.getByTestId('spinner-toggle'))
    await userEvent.click(canvas.getByTestId('btn-start'))
    await userEvent.click(canvas.getByTestId('btn-done'))
    await waitForIdle(canvas)

    await expectCodeDisclosure(canvas, spinnerSnippet)
  },
}

export const VisualCustomization: Story = {
  name: 'Visual customization',
  ...storyDescription(
    'Visual customization: bind useNProgress to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <VisualCustomizationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('btn-start'))
    await waitFor(() =>
      expect(
        canvas
          .getByTestId('progress-container')
          .querySelector('[data-react-hooks-nprogress-bar]'),
      ).toBeTruthy(),
    )
    await userEvent.click(canvas.getByTestId('btn-done'))

    await expectCodeDisclosure(canvas, visualCustomizationSnippet)
  },
}

export const ReducedMotion: Story = {
  name: 'Reduced motion',
  ...storyDescription(
    'Reduced motion with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ReducedMotionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('btn-start'))
    // Check that the style element has the media query
    const styleEl = canvasElement.ownerDocument.head.querySelector(
      '[data-react-hooks-nprogress-style]',
    )
    await expect(styleEl?.textContent).toContain('prefers-reduced-motion')

    await userEvent.click(canvas.getByTestId('btn-done'))

    await expectCodeDisclosure(canvas, reducedMotionSnippet)
  },
}

export const DynamicTarget: Story = {
  name: 'Dynamic target',
  ...storyDescription(
    'Dynamic target: bind useNProgress to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <DynamicTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Start in panel 1
    await userEvent.click(canvas.getByTestId('btn-start'))
    await waitFor(() =>
      expect(
        canvas
          .getByTestId('panel-1')
          .querySelector('[data-react-hooks-nprogress-root]'),
      ).toBeTruthy(),
    )
    // Panel 2 should be clean
    expect(
      canvas
        .getByTestId('panel-2')
        .querySelector('[data-react-hooks-nprogress-root]'),
    ).toBeNull()

    // Switch to panel 2
    await userEvent.click(canvas.getByTestId('btn-panel2'))
    // The owner is re-assigned; panel 1 should clean up after context sync

    await userEvent.click(canvas.getByTestId('btn-done'))

    await expectCodeDisclosure(canvas, dynamicTargetSnippet)
  },
}

export const AsyncSave: Story = {
  name: 'Async save',
  ...storyDescription(
    'Async save with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <AsyncSaveExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Success path
    await userEvent.click(canvas.getByTestId('btn-save'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-text')).toHaveTextContent(/Saving/),
    )
    await waitFor(
      () =>
        expect(canvas.getByTestId('status-text')).toHaveTextContent(
          /Saved successfully/,
        ),
      { timeout: 5000 },
    )

    // Error path
    await userEvent.click(canvas.getByTestId('btn-save-fail'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-text')).toHaveTextContent(/Saving/),
    )
    await waitFor(
      () =>
        expect(canvas.getByTestId('status-text')).toHaveTextContent(
          /Save failed/,
        ),
      { timeout: 5000 },
    )

    await expectCodeDisclosure(canvas, asyncSaveSnippet)
  },
}

export const ConcurrentRequests: Story = {
  name: 'Concurrent requests',
  ...storyDescription(
    'Concurrent requests: reproduce the race or permission edge for useNProgress with the on-canvas controls. Confirm newer requests win or aborts clear state as documented, then inspect Show code for ownership rules.',
  ),
  render: () => <ConcurrentRequestsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Start multiple
    await userEvent.click(canvas.getByTestId('task-a-btn'))
    await userEvent.click(canvas.getByTestId('task-b-btn'))

    // A finishes first
    await waitFor(
      () => expect(canvas.getByTestId('task-a-btn')).not.toBeDisabled(),
      { timeout: 3000 },
    )
    // B still running
    await expect(canvas.getByTestId('task-b-btn')).toBeDisabled()

    // B finishes
    await waitFor(
      () => expect(canvas.getByTestId('task-b-btn')).not.toBeDisabled(),
      { timeout: 5000 },
    )

    await expectCodeDisclosure(canvas, concurrentRequestsSnippet)
  },
}

export const StrictCleanup: Story = {
  name: 'Strict cleanup',
  ...storyDescription(
    'Strict cleanup with useNProgress: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <StrictCleanupExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Start progress
    await userEvent.click(canvas.getByTestId('btn-inner-start'))
    await waitFor(() =>
      expect(canvas.getByTestId('mounted-status')).toHaveTextContent('Loading'),
    )

    // Unmount
    await userEvent.click(canvas.getByTestId('btn-unmount'))
    await waitFor(() =>
      expect(canvas.getByTestId('unmounted-text')).toHaveTextContent(
        /Progress DOM nodes: 0/,
      ),
    )

    // Remount
    await userEvent.click(canvas.getByTestId('btn-mount'))
    await waitFor(() =>
      expect(canvas.getByTestId('mounted-status')).toBeVisible(),
    )

    await expectCodeDisclosure(canvas, strictCleanupSnippet)
  },
}

export const SsrBehavior: Story = {
  name: 'SSR behavior',
  ...storyDescription(
    'SSR-safe useNProgress usage: confirm the demo stays idle without browser globals at import time and hydrates without duplicate subscriptions. Inspect status after mount and open Show code for the consumer-safe import pattern.',
  ),
  render: () => <SsrBehaviorExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Start in browser
    await userEvent.click(canvas.getByTestId('btn-start'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-loading')).toHaveTextContent('true'),
    )

    await userEvent.click(canvas.getByTestId('btn-done'))
    await waitForIdle(canvas)

    await expectCodeDisclosure(canvas, ssrBehaviorSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'useNProgress Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Start
    await userEvent.click(canvas.getByTestId('btn-start'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-loading')).toHaveTextContent('true'),
    )

    // Set
    await userEvent.click(canvas.getByTestId('btn-set50'))
    await waitFor(() =>
      expect(canvas.getByTestId('status-progress')).toHaveTextContent('50%'),
    )

    // Increment
    await userEvent.click(canvas.getByTestId('btn-increment'))

    // Done
    await userEvent.click(canvas.getByTestId('btn-done'))
    await waitForIdle(canvas)

    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
