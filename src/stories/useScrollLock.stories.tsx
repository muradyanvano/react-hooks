import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  DocumentTargetExample,
  DynamicTargetExample,
  ExistingOverflowExample,
  ExternalStylesExample,
  ImportantPriorityExample,
  InitialLockedExample,
  LateTargetExample,
  ModalPageLockExample,
  MultipleOwnersExample,
  PlaygroundExample,
  ScrollLockExample,
  ScrollPositionExample,
  SvgTargetExample,
  UnmountCleanupExample,
  WindowTargetExample,
} from './components/UseScrollLockExamples'
import {
  documentTargetSnippet,
  dynamicTargetSnippet,
  existingOverflowSnippet,
  externalStylesSnippet,
  importantPrioritySnippet,
  initialLockedSnippet,
  lateTargetSnippet,
  modalPageLockSnippet,
  multipleOwnersSnippet,
  playgroundSnippet,
  scrollLockSnippet,
  scrollPositionSnippet,
  svgTargetSnippet,
  unmountCleanupSnippet,
  windowTargetSnippet,
} from './components/useScrollLock.snippets'

const meta = {
  title: 'Hooks/useScrollLock',
  tags: ['autodocs'],
  ...createHookStoryMeta('useScrollLock', PlaygroundExample, {
    a11y: {
      test: 'error',
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
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  await userEvent.click(canvas.getByTestId('copy-code'))
  await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
}

function scrollElement(element: HTMLElement, left: number, top: number): void {
  element.scrollLeft = left
  element.scrollTop = top
  element.dispatchEvent(new Event('scroll', { bubbles: true }))
}

function iframeScrollRoot(iframe: HTMLIFrameElement): HTMLElement | null {
  const doc = iframe.contentDocument
  if (doc == null) {
    return null
  }

  const candidates = [doc.scrollingElement, doc.documentElement, doc.body]

  for (const candidate of candidates) {
    // Avoid cross-realm `instanceof HTMLElement` (false for iframe elements).
    if (candidate != null && candidate.nodeType === 1 && 'style' in candidate) {
      return candidate as HTMLElement
    }
  }

  return null
}

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Temporarily freeze scroll while preserving position — modals and drawers. Lock, attempt to scroll, then Unlock and confirm position returns. Finish every play unlocked; page locks belong in isolated iframes.',
  ),

  render: () => <ScrollLockExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const panel = canvas.getByTestId('scroll-lock-panel')

    await expect(canvas.getByTestId('lock-status')).toHaveTextContent('false')
    scrollElement(panel, 80, 60)
    await waitFor(() => {
      expect(panel.scrollLeft).toBeGreaterThan(0)
      expect(panel.scrollTop).toBeGreaterThan(0)
    })

    await userEvent.click(canvas.getByTestId('lock-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('lock-status')).toHaveTextContent('true')
      expect(panel.style.overflow).toBe('hidden')
      expect(canvas.getByTestId('lock-badge')).toBeVisible()
    })

    const lockedLeft = panel.scrollLeft
    const lockedTop = panel.scrollTop
    expect(lockedLeft).toBeGreaterThan(0)
    expect(lockedTop).toBeGreaterThan(0)

    panel.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: 120,
        deltaX: 80,
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(panel.scrollLeft).toBe(lockedLeft)
    expect(panel.scrollTop).toBe(lockedTop)

    await userEvent.click(canvas.getByTestId('lock-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('lock-status')).toHaveTextContent('false')
      expect(panel.style.getPropertyValue('overflow')).toBe('')
    })
    // Unlock must not reset position to the origin. Minor scrollbar-layout deltas
    // are acceptable; the locked offsets must remain clearly preserved.
    expect(Math.abs(panel.scrollLeft - lockedLeft)).toBeLessThanOrEqual(8)
    expect(Math.abs(panel.scrollTop - lockedTop)).toBeLessThanOrEqual(8)
    expect(panel.scrollLeft).toBeGreaterThan(0)
    expect(panel.scrollTop).toBeGreaterThan(0)

    const unlockedLeft = panel.scrollLeft
    const unlockedTop = panel.scrollTop
    scrollElement(panel, unlockedLeft + 20, unlockedTop + 20)
    await waitFor(() => {
      expect(panel.scrollLeft).toBeGreaterThan(unlockedLeft)
      expect(panel.scrollTop).toBeGreaterThan(unlockedTop)
    })

    await expectCodeDisclosure(canvas, scrollLockSnippet)
  },
}

export const ModalPageLock: Story = {
  name: 'Modal page lock',
  ...storyDescription(
    'Modal page lock example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <ModalPageLockExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(
      () => {
        expect(canvas.getByTestId('modal-ready')).toHaveTextContent('true')
      },
      { timeout: 5000 },
    )

    const iframe = canvas.getByTestId('modal-iframe') as HTMLIFrameElement
    const root = iframeScrollRoot(iframe)
    expect(root).toBeTruthy()

    const open = canvas.getByTestId('modal-open')
    await userEvent.click(open)
    await waitFor(() => {
      expect(canvas.getByTestId('modal-dialog')).toBeVisible()
      expect(canvas.getByTestId('modal-lock-status')).toHaveTextContent('true')
      expect(root?.style.overflow).toBe('hidden')
      expect(canvas.getByTestId('modal-close')).toHaveFocus()
    })

    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(canvas.queryByTestId('modal-dialog')).toBeNull()
      expect(canvas.getByTestId('modal-lock-status')).toHaveTextContent('false')
      expect(root?.style.getPropertyValue('overflow')).toBe('')
      expect(open).toHaveFocus()
    })

    await userEvent.click(open)
    await waitFor(() => {
      expect(canvas.getByTestId('modal-dialog')).toBeVisible()
    })
    await userEvent.click(canvas.getByTestId('modal-close'))
    await waitFor(() => {
      expect(canvas.queryByTestId('modal-dialog')).toBeNull()
      expect(canvas.getByTestId('modal-lock-status')).toHaveTextContent('false')
      expect(open).toHaveFocus()
    })

    await expectCodeDisclosure(canvas, modalPageLockSnippet)
  },
}

export const MultipleOwners: Story = {
  name: 'Multiple owners',
  ...storyDescription(
    'Multiple owners example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <MultipleOwnersExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scroller = canvas.getByTestId('owners-scroller')

    await userEvent.click(canvas.getByTestId('owner-a-lock'))
    await userEvent.click(canvas.getByTestId('owner-b-lock'))
    await waitFor(() => {
      expect(scroller.style.overflow).toBe('hidden')
      expect(canvas.getByTestId('owner-a-status')).toHaveTextContent('true')
      expect(canvas.getByTestId('owner-b-status')).toHaveTextContent('true')
    })

    await userEvent.click(canvas.getByTestId('owner-a-unlock'))
    await waitFor(() => {
      expect(scroller.style.overflow).toBe('hidden')
      expect(canvas.getByTestId('owner-a-status')).toHaveTextContent('false')
      expect(canvas.getByTestId('owner-b-status')).toHaveTextContent('true')
    })

    await userEvent.click(canvas.getByTestId('owner-b-unlock'))
    await waitFor(() => {
      expect(scroller.style.overflow).toBe('auto')
      expect(canvas.getByTestId('owner-b-status')).toHaveTextContent('false')
    })

    await expectCodeDisclosure(canvas, multipleOwnersSnippet)
  },
}

export const InitialLocked: Story = {
  name: 'Initial locked',
  ...storyDescription(
    'Initial locked example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <InitialLockedExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('initial-mount'))
    await waitFor(() => {
      const scroller = canvas.getByTestId('initial-scroller')
      expect(canvas.getByTestId('initial-lock-status')).toHaveTextContent(
        'true',
      )
      expect(scroller.style.overflow).toBe('hidden')
    })

    await userEvent.click(canvas.getByTestId('initial-unlock'))
    await waitFor(() => {
      expect(canvas.getByTestId('initial-lock-status')).toHaveTextContent(
        'false',
      )
      expect(canvas.getByTestId('initial-scroller').style.overflow).toBe('auto')
    })

    await expectCodeDisclosure(canvas, initialLockedSnippet)
  },
}

export const ExistingOverflow: Story = {
  name: 'Existing overflow',
  ...storyDescription(
    'Existing overflow example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <ExistingOverflowExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scroller = canvas.getByTestId('existing-scroller')
    await expect(scroller.style.overflow).toBe('auto')

    await userEvent.click(canvas.getByTestId('existing-lock'))
    await waitFor(() => {
      expect(scroller.style.overflow).toBe('hidden')
    })

    await userEvent.click(canvas.getByTestId('existing-unlock'))
    await waitFor(() => {
      expect(scroller.style.overflow).toBe('auto')
      expect(canvas.getByTestId('existing-status')).toHaveTextContent('false')
    })

    await expectCodeDisclosure(canvas, existingOverflowSnippet)
  },
}

export const ImportantPriority: Story = {
  name: 'Important priority',
  ...storyDescription(
    'Important priority example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <ImportantPriorityExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scroller = canvas.getByTestId('important-scroller')

    await waitFor(() => {
      expect(scroller.style.getPropertyValue('overflow')).toBe('auto')
      expect(scroller.style.getPropertyPriority('overflow')).toBe('important')
    })

    await userEvent.click(canvas.getByTestId('important-lock'))
    await waitFor(() => {
      expect(scroller.style.overflow).toBe('hidden')
    })

    await userEvent.click(canvas.getByTestId('important-unlock'))
    await waitFor(() => {
      expect(scroller.style.getPropertyValue('overflow')).toBe('auto')
      expect(scroller.style.getPropertyPriority('overflow')).toBe('important')
      expect(canvas.getByTestId('important-status')).toHaveTextContent('false')
    })

    await expectCodeDisclosure(canvas, importantPrioritySnippet)
  },
}

export const DynamicTarget: Story = {
  name: 'Dynamic target',
  ...storyDescription(
    'Dynamic target example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <DynamicTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const first = canvas.getByTestId('dynamic-first')
    const second = canvas.getByTestId('dynamic-second')

    await userEvent.click(canvas.getByTestId('dynamic-lock'))
    await waitFor(() => {
      expect(first.style.overflow).toBe('hidden')
      expect(second.style.overflow).toBe('scroll')
    })

    await userEvent.click(canvas.getByTestId('dynamic-switch'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-active')).toHaveTextContent('second')
      expect(first.style.overflow).toBe('auto')
      expect(second.style.overflow).toBe('hidden')
    })

    await userEvent.click(canvas.getByTestId('dynamic-unlock'))
    await waitFor(() => {
      expect(second.style.overflow).toBe('scroll')
      expect(canvas.getByTestId('dynamic-status')).toHaveTextContent('false')
    })

    await expectCodeDisclosure(canvas, dynamicTargetSnippet)
  },
}

export const LateTarget: Story = {
  name: 'Late target',
  ...storyDescription(
    'Late target example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <LateTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('late-lock'))
    await waitFor(() => {
      expect(canvas.getByTestId('late-status')).toHaveTextContent('true')
      expect(canvas.getByTestId('late-absent')).toBeVisible()
    })

    await userEvent.click(canvas.getByTestId('late-mount'))
    await waitFor(() => {
      const scroller = canvas.getByTestId('late-scroller')
      expect(scroller.style.overflow).toBe('hidden')
    })

    await userEvent.click(canvas.getByTestId('late-unlock'))
    await waitFor(() => {
      expect(canvas.getByTestId('late-scroller').style.overflow).toBe('auto')
      expect(canvas.getByTestId('late-status')).toHaveTextContent('false')
    })

    await expectCodeDisclosure(canvas, lateTargetSnippet)
  },
}

export const WindowTarget: Story = {
  name: 'Window target',
  ...storyDescription(
    'Window target example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <WindowTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(
      () => {
        expect(canvas.getByTestId('window-ready')).toHaveTextContent('true')
      },
      { timeout: 5000 },
    )

    const iframe = canvas.getByTestId('window-iframe') as HTMLIFrameElement
    const root = iframeScrollRoot(iframe)
    expect(root).toBeTruthy()

    await userEvent.click(canvas.getByTestId('window-lock'))
    await waitFor(() => {
      expect(canvas.getByTestId('window-status')).toHaveTextContent('true')
      expect(root?.style.overflow).toBe('hidden')
    })

    await userEvent.click(canvas.getByTestId('window-unlock'))
    await waitFor(() => {
      expect(canvas.getByTestId('window-status')).toHaveTextContent('false')
      expect(root?.style.getPropertyValue('overflow')).toBe('')
    })

    await expectCodeDisclosure(canvas, windowTargetSnippet)
  },
}

export const DocumentTarget: Story = {
  name: 'Document target',
  ...storyDescription(
    'Document target example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <DocumentTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(
      () => {
        expect(canvas.getByTestId('document-ready')).toHaveTextContent('true')
      },
      { timeout: 5000 },
    )

    const iframe = canvas.getByTestId('document-iframe') as HTMLIFrameElement
    const root = iframeScrollRoot(iframe)
    expect(root).toBeTruthy()

    await userEvent.click(canvas.getByTestId('document-lock'))
    await waitFor(() => {
      expect(canvas.getByTestId('document-status')).toHaveTextContent('true')
      expect(root?.style.overflow).toBe('hidden')
    })

    await userEvent.click(canvas.getByTestId('document-unlock'))
    await waitFor(() => {
      expect(canvas.getByTestId('document-status')).toHaveTextContent('false')
      expect(root?.style.getPropertyValue('overflow')).toBe('')
    })

    await expectCodeDisclosure(canvas, documentTargetSnippet)
  },
}

export const SvgTarget: Story = {
  name: 'SVG target',
  ...storyDescription(
    'SVG target example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <SvgTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const svg = canvas.getByTestId('svg-target')

    await userEvent.click(canvas.getByTestId('svg-lock'))
    await waitFor(() => {
      expect(canvas.getByTestId('svg-status')).toHaveTextContent('true')
      expect(svg.style.overflow).toBe('hidden')
    })

    await userEvent.click(canvas.getByTestId('svg-unlock'))
    await waitFor(() => {
      expect(canvas.getByTestId('svg-status')).toHaveTextContent('false')
      expect(svg.style.overflow).toBe('auto')
    })

    await expectCodeDisclosure(canvas, svgTargetSnippet)
  },
}

export const ScrollPosition: Story = {
  name: 'Scroll position',
  ...storyDescription(
    'Scroll position example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <ScrollPositionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scroller = canvas.getByTestId('position-scroller')

    scrollElement(scroller, 64, 48)
    await waitFor(() => {
      expect(scroller.scrollLeft).toBeGreaterThan(0)
      expect(scroller.scrollTop).toBeGreaterThan(0)
    })
    const left = scroller.scrollLeft
    const top = scroller.scrollTop

    await userEvent.click(canvas.getByTestId('position-capture'))
    await waitFor(() => {
      expect(canvas.getByTestId('position-left')).toHaveTextContent(
        String(left),
      )
      expect(canvas.getByTestId('position-top')).toHaveTextContent(String(top))
    })

    await userEvent.click(canvas.getByTestId('position-lock'))
    await waitFor(() => {
      expect(scroller.style.overflow).toBe('hidden')
      expect(scroller.scrollLeft).toBe(left)
      expect(scroller.scrollTop).toBe(top)
    })

    await userEvent.click(canvas.getByTestId('position-unlock'))
    await waitFor(() => {
      expect(scroller.style.overflow).toBe('auto')
      expect(scroller.scrollLeft).toBe(left)
      expect(scroller.scrollTop).toBe(top)
      expect(canvas.getByTestId('position-status')).toHaveTextContent('false')
    })

    await expectCodeDisclosure(canvas, scrollPositionSnippet)
  },
}

export const ExternalStyles: Story = {
  name: 'External styles',
  ...storyDescription(
    'External styles example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <ExternalStylesExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scroller = canvas.getByTestId('external-scroller')

    await expect(scroller.style.color).toBe('rgb(1, 2, 3)')
    await expect(scroller.style.overflowX).toBe('scroll')
    await expect(scroller.style.overflowY).toBe('auto')

    await userEvent.click(canvas.getByTestId('external-lock'))
    await waitFor(() => {
      expect(scroller.style.overflow).toBe('hidden')
      expect(scroller.style.color).toBe('rgb(1, 2, 3)')
    })

    await userEvent.click(canvas.getByTestId('external-unlock'))
    await waitFor(() => {
      // Chromium serializes differing axis values as a two-token overflow shorthand.
      expect(scroller.style.overflow).not.toBe('hidden')
      expect(scroller.style.overflowX).toBe('scroll')
      expect(scroller.style.overflowY).toBe('auto')
      expect(scroller.style.color).toBe('rgb(1, 2, 3)')
      expect(canvas.getByTestId('external-status')).toHaveTextContent('false')
    })

    await expectCodeDisclosure(canvas, externalStylesSnippet)
  },
}

export const UnmountCleanup: Story = {
  name: 'Unmount cleanup',
  ...storyDescription(
    'Unmount cleanup example for useScrollLock. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <UnmountCleanupExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scroller = canvas.getByTestId('unmount-scroller')

    await waitFor(() => {
      expect(scroller.style.overflow).toBe('hidden')
      expect(canvas.getByTestId('unmount-owner-status')).toHaveTextContent(
        'true',
      )
    })

    await userEvent.click(canvas.getByTestId('unmount-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('unmount-owner-state')).toHaveTextContent(
        'unmounted',
      )
      expect(scroller.style.overflow).toBe('auto')
    })

    await expectCodeDisclosure(canvas, unmountCleanupSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'Configurable useScrollLock playground. Use Controls when wired to hook options, try edge interactions, and compare runtime behavior with the code panel.',
  ),

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('play-mount'))
    await waitFor(() => {
      expect(canvas.getByTestId('play-body')).toBeVisible()
      expect(canvas.getByTestId('play-status')).toHaveTextContent('false')
    })

    await userEvent.click(canvas.getByTestId('play-lock'))
    await waitFor(() => {
      expect(canvas.getByTestId('play-status')).toHaveTextContent('true')
      expect(canvas.getByTestId('play-scroller').style.overflow).toBe('hidden')
    })

    await userEvent.click(canvas.getByTestId('play-unlock'))
    await waitFor(() => {
      expect(canvas.getByTestId('play-status')).toHaveTextContent('false')
      expect(canvas.getByTestId('play-scroller').style.overflow).toBe('auto')
    })

    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
