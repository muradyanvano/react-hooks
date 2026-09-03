import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  acquireOwner,
  cancelCompletion,
  channelHasDom,
  channelHasTrickleTimer,
  completeOwner,
  createOwnerToken,
  evictOwner,
  getChannelActiveOwnerCount,
  getChannelOwnerCount,
  getChannelRenderedProgress,
  getOwnerProgress,
  isOwnerActive,
  releaseOwner,
  updateOwner,
  type ChannelOptions,
} from './nProgressManager'

const defaultOptions: ChannelOptions = {
  minimum: 0.08,
  easing: 'ease',
  speed: 200,
  trickle: true,
  trickleSpeed: 200,
  showSpinner: true,
  color: '#4f46e5',
  height: 3,
  zIndex: 1031,
  removeDelay: 200,
  ariaLabel: 'Page loading progress',
}

function noTrickleOptions(): ChannelOptions {
  return { ...defaultOptions, trickle: false }
}

function makeParent(doc: Document = document): HTMLElement {
  const el = doc.createElement('div')
  doc.body.append(el)
  return el
}

afterEach(() => {
  vi.useRealTimers()
  // Clean up any children added to body and owned styles left in head
  document.body.innerHTML = ''
  document.head
    .querySelectorAll('[data-react-hooks-nprogress-style]')
    .forEach((node) => node.remove())
})

describe('createOwnerToken', () => {
  it('creates a unique symbol each time', () => {
    const a = createOwnerToken()
    const b = createOwnerToken()
    expect(a).not.toBe(b)
    expect(typeof a).toBe('symbol')
  })
})

describe('acquireOwner', () => {
  it('creates a channel and registers the owner', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(document, parent, token, noTrickleOptions(), 0.08)
    expect(getChannelOwnerCount(document, parent)).toBe(1)
    expect(getChannelActiveOwnerCount(document, parent)).toBe(1)
  })

  it('creates DOM in the parent', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(document, parent, token, noTrickleOptions(), 0.08)
    expect(channelHasDom(document, parent)).toBe(true)
    expect(
      parent.querySelector('[data-react-hooks-nprogress-root]'),
    ).toBeTruthy()
  })

  it('adds a style element to head', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(document, parent, token, noTrickleOptions(), 0.08)
    expect(
      document.head.querySelector('[data-react-hooks-nprogress-style]'),
    ).toBeTruthy()
  })

  it('reuses existing channel for same doc+parent', () => {
    const parent = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    acquireOwner(document, parent, token1, noTrickleOptions(), 0.08)
    acquireOwner(document, parent, token2, noTrickleOptions(), 0.5)
    expect(getChannelOwnerCount(document, parent)).toBe(2)
    expect(
      parent.querySelectorAll('[data-react-hooks-nprogress-root]'),
    ).toHaveLength(1)
  })

  it('aggregated progress = minimum active progress', () => {
    const parent = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    acquireOwner(document, parent, token1, noTrickleOptions(), 0.3)
    acquireOwner(document, parent, token2, noTrickleOptions(), 0.7)
    // rendered progress should be min(0.3, 0.7) = 0.3
    expect(getChannelRenderedProgress(document, parent)).toBeCloseTo(0.3)
  })
})

describe('updateOwner', () => {
  it('updates progress for the owner', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token,
      noTrickleOptions(),
      0.08,
    )
    updateOwner(channel, token, 0.5, noTrickleOptions())
    expect(getOwnerProgress(channel, token)).toBe(0.5)
  })

  it('does nothing for unknown token', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const unknown = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token,
      noTrickleOptions(),
      0.08,
    )
    updateOwner(channel, unknown, 0.5, noTrickleOptions())
    expect(getOwnerProgress(channel, token)).toBe(0.08)
  })
})

describe('releaseOwner', () => {
  it('sets owner progress to null', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token,
      noTrickleOptions(),
      0.3,
    )
    releaseOwner(channel, token)
    expect(getOwnerProgress(channel, token)).toBeNull()
    expect(isOwnerActive(channel, token)).toBe(false)
  })

  it('removes DOM when last owner releases', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token,
      noTrickleOptions(),
      0.3,
    )
    releaseOwner(channel, token)
    expect(channelHasDom(document, parent)).toBe(false)
    expect(parent.querySelector('[data-react-hooks-nprogress-root]')).toBeNull()
  })

  it('keeps DOM when another owner is active', () => {
    const parent = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token1,
      noTrickleOptions(),
      0.3,
    )
    acquireOwner(document, parent, token2, noTrickleOptions(), 0.5)
    releaseOwner(channel, token1)
    expect(channelHasDom(document, parent)).toBe(true)
  })

  it('is idempotent', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token,
      noTrickleOptions(),
      0.3,
    )
    releaseOwner(channel, token)
    releaseOwner(channel, token) // should not throw
    expect(channelHasDom(document, parent)).toBe(false)
  })
})

describe('evictOwner', () => {
  it('fully removes the owner record', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token,
      noTrickleOptions(),
      0.3,
    )
    evictOwner(channel, token)
    expect(getChannelOwnerCount(document, parent)).toBe(0)
  })
})

describe('completeOwner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('sets progress to 1, then releases after delay', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const opts: ChannelOptions = {
      ...noTrickleOptions(),
      speed: 200,
      removeDelay: 100,
    }
    const channel = acquireOwner(document, parent, token, opts, 0.5)
    const onDone = vi.fn()

    completeOwner(channel, token, opts, onDone)
    expect(getOwnerProgress(channel, token)).toBe(1)

    vi.advanceTimersByTime(299)
    expect(onDone).not.toHaveBeenCalled()
    expect(getOwnerProgress(channel, token)).toBe(1)

    vi.advanceTimersByTime(2)
    expect(onDone).toHaveBeenCalledOnce()
    expect(getOwnerProgress(channel, token)).toBeNull()
  })

  it('keeps DOM while another owner remains active after completion', () => {
    const parent = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    const opts: ChannelOptions = {
      ...noTrickleOptions(),
      speed: 200,
      removeDelay: 100,
    }
    const channel = acquireOwner(document, parent, token1, opts, 0.3)
    acquireOwner(document, parent, token2, opts, 0.7)

    const onDone = vi.fn()
    completeOwner(channel, token1, opts, onDone)
    vi.advanceTimersByTime(400)
    expect(channelHasDom(document, parent)).toBe(true)
  })

  it('generation guard: restart cancels stale completion', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const opts: ChannelOptions = {
      ...noTrickleOptions(),
      speed: 200,
      removeDelay: 100,
    }
    const channel = acquireOwner(document, parent, token, opts, 0.5)
    const onDone = vi.fn()

    completeOwner(channel, token, opts, onDone)
    // Restart before completion fires
    cancelCompletion(channel, token)
    updateOwner(channel, token, 0.2, opts)

    vi.advanceTimersByTime(500)
    // onDone must not have fired because the owner is now restarted
    expect(onDone).not.toHaveBeenCalled()
  })

  it('two owners can complete concurrently without cancelling each other', () => {
    const parent = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    const opts: ChannelOptions = {
      ...noTrickleOptions(),
      speed: 100,
      removeDelay: 50,
    }
    const channel = acquireOwner(document, parent, token1, opts, 0.3)
    acquireOwner(document, parent, token2, opts, 0.4)
    const onDone1 = vi.fn()
    const onDone2 = vi.fn()

    completeOwner(channel, token1, opts, onDone1)
    completeOwner(channel, token2, opts, onDone2)
    vi.advanceTimersByTime(200)

    expect(onDone1).toHaveBeenCalledOnce()
    expect(onDone2).toHaveBeenCalledOnce()
    expect(channelHasDom(document, parent)).toBe(false)
  })
})

describe('cancelCompletion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('cancels a pending completion timer', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const opts: ChannelOptions = {
      ...noTrickleOptions(),
      speed: 200,
      removeDelay: 0,
    }
    const channel = acquireOwner(document, parent, token, opts, 0.5)
    const onDone = vi.fn()

    completeOwner(channel, token, opts, onDone)
    cancelCompletion(channel, token)
    vi.advanceTimersByTime(500)
    expect(onDone).not.toHaveBeenCalled()
  })
})

describe('isOwnerActive / getOwnerProgress', () => {
  it('reports active while progress is set', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token,
      noTrickleOptions(),
      0.4,
    )
    expect(isOwnerActive(channel, token)).toBe(true)
    expect(getOwnerProgress(channel, token)).toBe(0.4)
  })

  it('returns false/null for a token never registered in the channel', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token,
      noTrickleOptions(),
      0.4,
    )
    // Create a separate token that was never registered in this channel
    const unregistered = createOwnerToken()
    expect(isOwnerActive(channel, unregistered)).toBe(false)
    expect(getOwnerProgress(channel, unregistered)).toBeNull()
  })
})

describe('trickle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('starts a trickle timer when trickle is enabled', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(
      document,
      parent,
      token,
      { ...defaultOptions, trickleSpeed: 200 },
      0.08,
    )
    expect(channelHasTrickleTimer(document, parent)).toBe(true)
  })

  it('advances progress on each tick', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token,
      { ...defaultOptions, trickleSpeed: 200 },
      0.08,
    )
    const before = getOwnerProgress(channel, token) ?? 0
    vi.advanceTimersByTime(201)
    const after = getOwnerProgress(channel, token) ?? 0
    expect(after).toBeGreaterThan(before)
  })

  it('never reaches 1 from trickle alone', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token,
      { ...defaultOptions, trickleSpeed: 50 },
      0.08,
    )
    vi.advanceTimersByTime(10000)
    const p = getOwnerProgress(channel, token) ?? 0
    expect(p).toBeLessThan(1)
  })

  it('does not start timer when trickle is disabled', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(document, parent, token, noTrickleOptions(), 0.08)
    expect(channelHasTrickleTimer(document, parent)).toBe(false)
  })

  it('uses one shared timer for multiple owners', () => {
    const parent = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    acquireOwner(document, parent, token1, defaultOptions, 0.08)
    acquireOwner(document, parent, token2, defaultOptions, 0.2)
    // There's exactly one timer (not two)
    expect(channelHasTrickleTimer(document, parent)).toBe(true)
  })
})

describe('DOM structure', () => {
  it('creates progressbar with correct ARIA', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(document, parent, token, noTrickleOptions(), 0.08)
    const bar = parent.querySelector('[role=progressbar]')
    expect(bar).toBeTruthy()
    expect(bar?.getAttribute('aria-label')).toBe('Page loading progress')
    expect(bar?.getAttribute('aria-valuemin')).toBe('0')
    expect(bar?.getAttribute('aria-valuemax')).toBe('100')
  })

  it('spinner is aria-hidden', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(document, parent, token, noTrickleOptions(), 0.08)
    const spinner = parent.querySelector('[data-react-hooks-nprogress-spinner]')
    expect(spinner?.getAttribute('aria-hidden')).toBe('true')
  })

  it('bar uses translate3d for progress', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(document, parent, token, noTrickleOptions(), 0.5)
    const bar = parent.querySelector(
      '[data-react-hooks-nprogress-bar]',
    ) as HTMLElement | null
    expect(bar?.style.transform).toMatch(/translate3d/)
    expect(bar?.style.transform).toContain('-50%')
  })

  it('applies color to bar background', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(
      document,
      parent,
      token,
      { ...noTrickleOptions(), color: 'rgb(255, 0, 0)' },
      0.08,
    )
    const bar = parent.querySelector(
      '[data-react-hooks-nprogress-bar]',
    ) as HTMLElement | null
    expect(bar?.style.background).toBe('rgb(255, 0, 0)')
  })

  it('hides spinner when showSpinner is false', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(
      document,
      parent,
      token,
      { ...noTrickleOptions(), showSpinner: false },
      0.08,
    )
    const spinner = parent.querySelector(
      '[data-react-hooks-nprogress-spinner]',
    ) as HTMLElement | null
    expect(spinner?.style.display).toBe('none')
  })

  it('recreates root if externally removed', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const opts = noTrickleOptions()
    const channel = acquireOwner(document, parent, token, opts, 0.08)
    const root = parent.querySelector('[data-react-hooks-nprogress-root]')
    root?.remove()
    // Trigger re-render via update
    updateOwner(channel, token, 0.5, opts)
    expect(
      parent.querySelector('[data-react-hooks-nprogress-root]'),
    ).toBeTruthy()
  })

  it('removes only owned DOM, not unrelated elements', () => {
    const parent = makeParent()
    const unrelated = document.createElement('p')
    unrelated.textContent = 'keep me'
    parent.append(unrelated)

    const token = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token,
      noTrickleOptions(),
      0.08,
    )
    evictOwner(channel, token)

    expect(parent.querySelector('p')).toBeTruthy()
  })

  it('does not block pointer events', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(document, parent, token, noTrickleOptions(), 0.08)
    const root = parent.querySelector(
      '[data-react-hooks-nprogress-root]',
    ) as HTMLElement | null
    expect(root?.style.pointerEvents).toBe('none')
  })

  it('has one style element per document', () => {
    const parent1 = makeParent()
    const parent2 = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    acquireOwner(document, parent1, token1, noTrickleOptions(), 0.08)
    acquireOwner(document, parent2, token2, noTrickleOptions(), 0.08)
    const styles = document.head.querySelectorAll(
      '[data-react-hooks-nprogress-style]',
    )
    expect(styles).toHaveLength(1)
  })

  it('keeps peg inside the bar so the tip glow tracks progress', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(document, parent, token, noTrickleOptions(), 0.3)
    const bar = parent.querySelector('[data-react-hooks-nprogress-bar]')
    const peg = parent.querySelector('[data-react-hooks-nprogress-peg]')
    expect(bar).toBeTruthy()
    expect(peg).toBeTruthy()
    expect(bar?.contains(peg)).toBe(true)
  })

  it('applies independent height per parent channel', () => {
    const parent1 = makeParent()
    const parent2 = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    acquireOwner(
      document,
      parent1,
      token1,
      { ...noTrickleOptions(), height: 2 },
      0.2,
    )
    acquireOwner(
      document,
      parent2,
      token2,
      { ...noTrickleOptions(), height: 8 },
      0.2,
    )
    const bar1 = parent1.querySelector(
      '[role=progressbar]',
    ) as HTMLElement | null
    const bar2 = parent2.querySelector(
      '[role=progressbar]',
    ) as HTMLElement | null
    expect(bar1?.style.height).toBe('2px')
    expect(bar2?.style.height).toBe('8px')
  })

  it('does not mutate custom parent layout styles', () => {
    const parent = makeParent()
    parent.style.position = 'relative'
    parent.style.overflow = 'auto'
    parent.style.display = 'flex'
    parent.style.zIndex = '3'
    const token = createOwnerToken()
    acquireOwner(document, parent, token, noTrickleOptions(), 0.08)
    expect(parent.style.position).toBe('relative')
    expect(parent.style.overflow).toBe('auto')
    expect(parent.style.display).toBe('flex')
    expect(parent.style.zIndex).toBe('3')
  })

  it('removes the shared style when the last channel empties', () => {
    const parent1 = makeParent()
    const parent2 = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    const channel1 = acquireOwner(
      document,
      parent1,
      token1,
      noTrickleOptions(),
      0.08,
    )
    const channel2 = acquireOwner(
      document,
      parent2,
      token2,
      noTrickleOptions(),
      0.08,
    )
    expect(
      document.head.querySelectorAll('[data-react-hooks-nprogress-style]'),
    ).toHaveLength(1)
    releaseOwner(channel1, token1)
    expect(
      document.head.querySelectorAll('[data-react-hooks-nprogress-style]'),
    ).toHaveLength(1)
    releaseOwner(channel2, token2)
    expect(
      document.head.querySelector('[data-react-hooks-nprogress-style]'),
    ).toBeNull()
  })

  it('includes reduced-motion media query in CSS', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    acquireOwner(document, parent, token, noTrickleOptions(), 0.08)
    const styleEl = document.head.querySelector(
      '[data-react-hooks-nprogress-style]',
    )
    expect(styleEl?.textContent).toContain('prefers-reduced-motion')
  })
})

describe('multiple owners aggregation', () => {
  it('uses minimum progress across active owners', () => {
    const parent = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    acquireOwner(document, parent, token1, noTrickleOptions(), 0.6)
    acquireOwner(document, parent, token2, noTrickleOptions(), 0.2)
    expect(getChannelRenderedProgress(document, parent)).toBeCloseTo(0.2)
  })

  it('one owner completes — shared bar stays for remaining owner', () => {
    vi.useFakeTimers()
    const parent = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    const opts: ChannelOptions = {
      ...noTrickleOptions(),
      speed: 100,
      removeDelay: 50,
    }
    const channel = acquireOwner(document, parent, token1, opts, 0.3)
    acquireOwner(document, parent, token2, opts, 0.7)

    completeOwner(channel, token1, opts, vi.fn())
    // While completing owner is at 1, shared visual must stay at the other owner's 0.7
    expect(getChannelRenderedProgress(document, parent)).toBeCloseTo(0.7)
    vi.advanceTimersByTime(200)

    expect(channelHasDom(document, parent)).toBe(true)
    expect(getChannelActiveOwnerCount(document, parent)).toBe(1)
    expect(getChannelRenderedProgress(document, parent)).toBeCloseTo(0.7)
  })

  it('presentation options fall back to newest remaining owner', () => {
    const parent = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    const channel = acquireOwner(
      document,
      parent,
      token1,
      { ...noTrickleOptions(), color: 'rgb(0, 0, 255)' },
      0.2,
    )
    acquireOwner(
      document,
      parent,
      token2,
      { ...noTrickleOptions(), color: 'rgb(0, 128, 0)' },
      0.4,
    )
    const bar = parent.querySelector(
      '[data-react-hooks-nprogress-bar]',
    ) as HTMLElement | null
    expect(bar?.style.background).toBe('rgb(0, 128, 0)')
    releaseOwner(channel, token2)
    const barAfter = parent.querySelector(
      '[data-react-hooks-nprogress-bar]',
    ) as HTMLElement | null
    expect(barAfter?.style.background).toBe('rgb(0, 0, 255)')
  })

  it('malicious color is not interpolated into shared stylesheet text', () => {
    const parent = makeParent()
    const token = createOwnerToken()
    const evil = 'red;} body{background:url(https://evil.example)'
    acquireOwner(
      document,
      parent,
      token,
      { ...noTrickleOptions(), color: evil },
      0.08,
    )
    const styleEl = document.head.querySelector(
      '[data-react-hooks-nprogress-style]',
    )
    expect(styleEl?.textContent).not.toContain('evil.example')
    expect(styleEl?.textContent).not.toContain(evil)
  })

  it('final owner cleanup removes all DOM', () => {
    vi.useFakeTimers()
    const parent = makeParent()
    const token = createOwnerToken()
    const opts: ChannelOptions = {
      ...noTrickleOptions(),
      speed: 100,
      removeDelay: 50,
    }
    const channel = acquireOwner(document, parent, token, opts, 0.5)

    const onDone = vi.fn()
    completeOwner(channel, token, opts, onDone)
    vi.advanceTimersByTime(200)

    expect(channelHasDom(document, parent)).toBe(false)
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('different documents have independent channels', () => {
    const parent1 = makeParent(document)
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const doc2 = iframe.contentDocument!
    const parent2 = doc2.createElement('div')
    doc2.body.append(parent2)

    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    acquireOwner(document, parent1, token1, noTrickleOptions(), 0.3)
    acquireOwner(doc2, parent2, token2, noTrickleOptions(), 0.8)

    expect(getChannelActiveOwnerCount(document, parent1)).toBe(1)
    expect(getChannelActiveOwnerCount(doc2, parent2)).toBe(1)

    // Releasing from one document does not affect the other
    releaseOwner(
      acquireOwner(
        document,
        parent1,
        createOwnerToken(),
        noTrickleOptions(),
        0.1,
      ),
      token1,
    )
    expect(getChannelActiveOwnerCount(doc2, parent2)).toBe(1)
  })

  it('different parents in the same document are independent channels', () => {
    const parent1 = makeParent()
    const parent2 = makeParent()
    const token1 = createOwnerToken()
    const token2 = createOwnerToken()
    const channel1 = acquireOwner(
      document,
      parent1,
      token1,
      noTrickleOptions(),
      0.3,
    )
    acquireOwner(document, parent2, token2, noTrickleOptions(), 0.8)

    releaseOwner(channel1, token1)
    expect(channelHasDom(document, parent1)).toBe(false)
    expect(channelHasDom(document, parent2)).toBe(true)
  })
})
