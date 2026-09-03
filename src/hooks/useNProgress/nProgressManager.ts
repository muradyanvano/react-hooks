/**
 * Private shared progress manager for useNProgress.
 *
 * Architecture:
 * - Registry: Document → Map<HTMLElement(parent), ProgressChannel>
 * - Each channel manages its own DOM, trickle timer, and owner set
 * - Multiple owners share one visual channel per (document, parent) pair
 * - Owners release only themselves; final owner triggers DOM cleanup
 *
 * NOT exported from the public package entry.
 */

import {
  calcTrickleIncrement,
  clampFinite,
  normalizeDuration,
  normalizeDurationStrict,
  normalizeHeight,
  normalizeZIndex,
  safeCssNumber,
} from './nProgressHelpers'

// ─── Types ────────────────────────────────────────────────────────────────────

export type OwnerToken = symbol

export interface ChannelOptions {
  minimum: number
  easing: string
  speed: number
  trickle: boolean
  trickleSpeed: number
  showSpinner: boolean
  color: string
  height: number
  zIndex: number
  removeDelay: number
  ariaLabel: string
}

// Timer type compatible with both browser (returns number) and Node.js (returns Timeout).
// We only ever store and clear these values, so unknown is safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TimerId = any

interface OwnerRecord {
  progress: number | null // null = idle, number = active progress value
  options: ChannelOptions
  completionTimer: TimerId
  lastUpdated: number // monotonic generation for presentation-owner selection
}

interface ChannelDom {
  root: HTMLDivElement
  bar: HTMLDivElement
  peg: HTMLDivElement
  progressbar: HTMLDivElement
  spinner: HTMLDivElement
  style: HTMLStyleElement
}

interface ProgressChannel {
  owners: Map<OwnerToken, OwnerRecord>
  dom: ChannelDom | null
  trickleTimer: TimerId
  trickleGeneration: number
  renderedProgress: number // last rendered CSS transform value
  document: Document
  parent: HTMLElement
  generation: number // incremented on each significant change
}

// ─── Registry ─────────────────────────────────────────────────────────────────

// WeakMap<Document, Map<HTMLElement, ProgressChannel>>
const registry = new WeakMap<Document, Map<HTMLElement, ProgressChannel>>()

function getChannel(
  doc: Document,
  parent: HTMLElement,
): ProgressChannel | undefined {
  return registry.get(doc)?.get(parent)
}

function setChannel(
  doc: Document,
  parent: HTMLElement,
  channel: ProgressChannel,
): void {
  let docMap = registry.get(doc)
  if (docMap == null) {
    docMap = new Map()
    registry.set(doc, docMap)
  }
  docMap.set(parent, channel)
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────

const NS = 'data-react-hooks-nprogress'

function createDom(
  doc: Document,
  parent: HTMLElement,
  options: ChannelOptions,
): ChannelDom | null {
  try {
    const isBody = parent === doc.body

    // Style element
    const style = doc.createElement('style')
    style.setAttribute(`${NS}-style`, '')
    applyStyles(style, options, isBody)

    // Root container
    const root = doc.createElement('div') as HTMLDivElement
    root.setAttribute(`${NS}-root`, '')
    root.setAttribute('aria-hidden', 'false')

    // Progressbar wrapper (ARIA)
    const progressbar = doc.createElement('div') as HTMLDivElement
    progressbar.setAttribute('role', 'progressbar')
    progressbar.setAttribute('aria-label', options.ariaLabel)
    progressbar.setAttribute('aria-valuemin', '0')
    progressbar.setAttribute('aria-valuemax', '100')

    // Bar
    const bar = doc.createElement('div') as HTMLDivElement
    bar.setAttribute(`${NS}-bar`, '')

    // Peg (decorative)
    const peg = doc.createElement('div') as HTMLDivElement
    peg.setAttribute(`${NS}-peg`, '')
    peg.setAttribute('aria-hidden', 'true')

    // Spinner (decorative)
    const spinner = doc.createElement('div') as HTMLDivElement
    spinner.setAttribute(`${NS}-spinner`, '')
    spinner.setAttribute('aria-hidden', 'true')

    progressbar.append(bar, peg)
    root.append(progressbar, spinner)

    const dom: ChannelDom = { root, bar, peg, progressbar, spinner, style }

    // Apply initial styles
    applyDomStyles(dom, options, 0)

    // Insert into document
    if (doc.head != null) {
      doc.head.append(style)
    } else {
      doc.documentElement.prepend(style)
    }
    parent.prepend(root)

    return dom
  } catch {
    return null
  }
}

function applyStyles(
  style: HTMLStyleElement,
  options: ChannelOptions,
  isBody: boolean,
): void {
  const h = safeCssNumber(normalizeHeight(options.height), 3)
  const z = safeCssNumber(normalizeZIndex(options.zIndex), 1031)
  const speed = safeCssNumber(normalizeDurationStrict(options.speed, 200), 200)
  const pos = isBody ? 'fixed' : 'absolute'

  const css = [
    `[${NS}-root]{pointer-events:none;position:${pos};top:0;left:0;right:0;z-index:${z};}`,
    `[${NS}-root] [role=progressbar]{position:${pos};top:0;left:0;right:0;height:${h}px;overflow:hidden;}`,
    `[${NS}-bar]{height:100%;will-change:transform;transform:translate3d(-100%,0,0);}`,
    `[${NS}-peg]{display:block;position:absolute;right:0;width:100px;height:100%;opacity:1;transform:rotate(3deg) translate(0,-4px);}`,
    `[${NS}-spinner]{display:block;position:${pos};top:${h + 4}px;right:12px;}`,
    `[${NS}-spinner-icon]{width:18px;height:18px;box-sizing:border-box;border-radius:50%;border-top:2px solid;border-left:2px solid;border-bottom:2px solid transparent;border-right:2px solid transparent;animation:${NS}-spin 400ms linear infinite;}`,
    `@keyframes ${NS}-spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`,
    `@media(prefers-reduced-motion:reduce){[${NS}-bar]{transition:none !important;}[${NS}-spinner-icon]{animation:none !important;}}`,
    `[${NS}-bar]{transition:transform ${speed}ms;}`,
  ].join('\n')

  style.textContent = css
}

function applyDomStyles(
  dom: ChannelDom,
  options: ChannelOptions,
  renderedProgress: number,
): void {
  const color =
    typeof options.color === 'string' && options.color.trim().length > 0
      ? options.color
      : '#4f46e5'
  dom.bar.style.background = color
  dom.peg.style.boxShadow = `0 0 10px ${color}, 0 0 5px ${color}`

  let spinnerIcon = dom.spinner.querySelector(
    `[${NS}-spinner-icon]`,
  ) as HTMLDivElement | null
  if (spinnerIcon == null) {
    const doc = dom.bar.ownerDocument
    if (doc != null) {
      spinnerIcon = doc.createElement('div') as HTMLDivElement
      spinnerIcon.setAttribute(`${NS}-spinner-icon`, '')
      dom.spinner.append(spinnerIcon)
    }
  }
  if (spinnerIcon != null) {
    spinnerIcon.style.borderTopColor = color
    spinnerIcon.style.borderLeftColor = color
  }

  dom.spinner.style.display = options.showSpinner ? 'block' : 'none'

  const pct = clampFinite(renderedProgress, 0, 1, 0) * 100
  dom.bar.style.transform = `translate3d(${-(100 - pct)}%,0,0)`

  const speed = safeCssNumber(normalizeDurationStrict(options.speed, 200), 200)
  const easing =
    typeof options.easing === 'string' && options.easing.trim().length > 0
      ? options.easing
      : 'ease'
  dom.bar.style.transition = `transform ${speed}ms ${easing}`
}

function removeDom(dom: ChannelDom): void {
  try {
    dom.root.remove()
  } catch {
    /* ignore */
  }
  try {
    dom.style.remove()
  } catch {
    /* ignore */
  }
}

function ensureDom(channel: ProgressChannel, options: ChannelOptions): void {
  if (channel.dom != null) {
    // Verify root is still in DOM; if externally removed, recreate
    try {
      if (!channel.parent.contains(channel.dom.root)) {
        try {
          channel.dom.style.remove()
        } catch {
          /* ignore */
        }
        channel.dom = createDom(channel.document, channel.parent, options)
      }
    } catch {
      channel.dom = null
    }
    return
  }
  channel.dom = createDom(channel.document, channel.parent, options)
}

// ─── Aggregation helpers ───────────────────────────────────────────────────────

function getActiveOwners(
  channel: ProgressChannel,
): Array<[OwnerToken, OwnerRecord]> {
  const result: Array<[OwnerToken, OwnerRecord]> = []
  for (const [token, record] of channel.owners) {
    if (record.progress !== null) {
      result.push([token, record])
    }
  }
  return result
}

/** Aggregated progress = minimum active owner progress (slowest wins). */
function aggregatedProgress(channel: ProgressChannel): number | null {
  const active = getActiveOwners(channel)
  if (active.length === 0) return null
  let min = 1
  for (const [, record] of active) {
    if (record.progress !== null && record.progress < min) {
      min = record.progress
    }
  }
  return min
}

/** Presentation owner = most recently updated active owner. */
function getPresentationOwner(channel: ProgressChannel): OwnerRecord | null {
  const active = getActiveOwners(channel)
  if (active.length === 0) return null
  let best: OwnerRecord | null = null
  let bestTime = -1
  for (const [, record] of active) {
    if (record.lastUpdated > bestTime) {
      bestTime = record.lastUpdated
      best = record
    }
  }
  return best
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderChannel(channel: ProgressChannel): void {
  const agg = aggregatedProgress(channel)
  const presenter = getPresentationOwner(channel)

  if (agg === null || presenter === null) {
    // No active owners — remove DOM
    stopTrickle(channel)
    if (channel.dom != null) {
      removeDom(channel.dom)
      channel.dom = null
    }
    return
  }

  const options = presenter.options

  ensureDom(channel, options)
  if (channel.dom == null) return

  const dom = channel.dom
  const isBody = channel.parent === channel.document.body

  // Re-apply styles if options changed (safe: just re-assign properties)
  applyStyles(dom.style, options, isBody)
  applyDomStyles(dom, options, agg)
  channel.renderedProgress = agg

  // Update ARIA value
  dom.progressbar.setAttribute('aria-valuenow', String(Math.round(agg * 100)))
  dom.progressbar.setAttribute('aria-label', options.ariaLabel)
}

// ─── Trickle ──────────────────────────────────────────────────────────────────

function stopTrickle(channel: ProgressChannel): void {
  if (channel.trickleTimer != null) {
    try {
      const win = channel.document.defaultView
      if (win != null) win.clearTimeout(channel.trickleTimer)
      else clearTimeout(channel.trickleTimer)
    } catch {
      /* ignore */
    }
    channel.trickleTimer = null
  }
  channel.trickleGeneration += 1
}

function scheduleTrickle(channel: ProgressChannel): void {
  stopTrickle(channel)

  const presenter = getPresentationOwner(channel)
  if (presenter == null || !presenter.options.trickle) return

  const gen = ++channel.trickleGeneration
  const speed = normalizeDurationStrict(presenter.options.trickleSpeed, 200)

  const tick = () => {
    if (channel.trickleGeneration !== gen) return
    if (getActiveOwners(channel).length === 0) return

    // Trickle each active owner that has trickle enabled
    let changed = false
    for (const [, record] of channel.owners) {
      if (record.progress === null) continue
      if (!record.options.trickle) continue
      const inc = calcTrickleIncrement(record.progress)
      if (inc <= 0) continue
      const next = Math.min(0.994, record.progress + inc)
      record.progress = next
      changed = true
    }

    if (changed) {
      renderChannel(channel)
    }

    // Schedule next tick
    const currentGen = gen
    const nextPresenter = getPresentationOwner(channel)
    if (nextPresenter == null || channel.trickleGeneration !== currentGen)
      return
    const nextSpeed = normalizeDurationStrict(
      nextPresenter.options.trickleSpeed,
      200,
    )
    try {
      const win = channel.document.defaultView
      const timer =
        win != null
          ? win.setTimeout(tick, nextSpeed)
          : setTimeout(tick, nextSpeed)
      channel.trickleTimer = timer
    } catch {
      /* ignore */
    }
  }

  try {
    const win = channel.document.defaultView
    channel.trickleTimer =
      win != null ? win.setTimeout(tick, speed) : setTimeout(tick, speed)
  } catch {
    /* ignore */
  }
}

// ─── Public channel API ───────────────────────────────────────────────────────

export function createOwnerToken(): OwnerToken {
  return Symbol('nprogress-owner')
}

/**
 * Acquires a channel for (doc, parent) and registers the owner.
 * Returns the channel or null if DOM is disabled.
 */
export function acquireOwner(
  doc: Document,
  parent: HTMLElement,
  token: OwnerToken,
  options: ChannelOptions,
  initialProgress: number,
): ProgressChannel {
  let channel = getChannel(doc, parent)
  if (channel == null) {
    channel = {
      owners: new Map(),
      dom: null,
      trickleTimer: null,
      trickleGeneration: 0,
      renderedProgress: 0,
      document: doc,
      parent,
      generation: 0,
    }
    setChannel(doc, parent, channel)
  }

  channel.owners.set(token, {
    progress: initialProgress,
    options,
    completionTimer: null,
    lastUpdated: Date.now(),
  })

  renderChannel(channel)

  if (options.trickle) {
    scheduleTrickle(channel)
  }

  return channel
}

/**
 * Updates an owner's progress and options.
 */
export function updateOwner(
  channel: ProgressChannel,
  token: OwnerToken,
  progress: number | null,
  options: ChannelOptions,
): void {
  const record = channel.owners.get(token)
  if (record == null) return
  record.progress = progress
  record.options = options
  record.lastUpdated = Date.now()
  renderChannel(channel)

  if (progress !== null) {
    // Re-schedule trickle if needed
    const presenter = getPresentationOwner(channel)
    if (presenter?.options.trickle === true && channel.trickleTimer == null) {
      scheduleTrickle(channel)
    }
    if (!options.trickle) {
      // Only stop if NO active owner wants trickling
      const anyTrickle = getActiveOwners(channel).some(
        ([, r]) => r.options.trickle,
      )
      if (!anyTrickle) stopTrickle(channel)
    }
  } else {
    // Owner went idle — check if trickle should stop
    if (getActiveOwners(channel).length === 0) {
      stopTrickle(channel)
    }
  }
}

/**
 * Releases an owner immediately (no completion animation).
 */
export function releaseOwner(
  channel: ProgressChannel,
  token: OwnerToken,
): void {
  const record = channel.owners.get(token)
  if (record == null) return

  // Cancel any pending completion timer
  if (record.completionTimer != null) {
    try {
      const win = channel.document.defaultView
      if (win != null) win.clearTimeout(record.completionTimer)
      else clearTimeout(record.completionTimer)
    } catch {
      /* ignore */
    }
    record.completionTimer = null
  }

  record.progress = null
  channel.owners.set(token, record)

  // Re-render: if no active owners, removes DOM
  renderChannel(channel)
  if (getActiveOwners(channel).length === 0) {
    stopTrickle(channel)
  }
}

/**
 * Completes an owner: animates to 1, then releases after speed + removeDelay.
 * Generation guard prevents stale timers from releasing a restarted owner.
 */
export function completeOwner(
  channel: ProgressChannel,
  token: OwnerToken,
  options: ChannelOptions,
  onDone: () => void,
): void {
  const record = channel.owners.get(token)
  if (record == null) return

  // Cancel stale completion timer
  if (record.completionTimer != null) {
    try {
      const win = channel.document.defaultView
      if (win != null) win.clearTimeout(record.completionTimer)
      else clearTimeout(record.completionTimer)
    } catch {
      /* ignore */
    }
    record.completionTimer = null
  }

  // Set to 1 for this owner
  const completionGen = ++channel.generation
  record.progress = 1
  record.options = options
  record.lastUpdated = Date.now()
  renderChannel(channel)

  const speed = normalizeDurationStrict(options.speed, 200)
  const removeDelay = normalizeDuration(options.removeDelay, 200)
  const totalDelay = speed + removeDelay

  const doRelease = () => {
    // Generation guard: ensure no restart happened
    if (channel.generation !== completionGen) return
    const currentRecord = channel.owners.get(token)
    if (currentRecord == null) return
    if (currentRecord.progress !== 1) return // was restarted

    currentRecord.progress = null
    currentRecord.completionTimer = null
    renderChannel(channel)
    if (getActiveOwners(channel).length === 0) {
      stopTrickle(channel)
    }
    onDone()
  }

  try {
    const win = channel.document.defaultView
    const timer =
      win != null
        ? win.setTimeout(doRelease, totalDelay)
        : setTimeout(doRelease, totalDelay)
    record.completionTimer = timer
  } catch {
    // If timer fails, release immediately
    record.progress = null
    renderChannel(channel)
    onDone()
  }
}

/**
 * Cancels any pending completion timer for an owner (e.g. on restart).
 */
export function cancelCompletion(
  channel: ProgressChannel,
  token: OwnerToken,
): void {
  const record = channel.owners.get(token)
  if (record?.completionTimer == null) return
  try {
    const win = channel.document.defaultView
    if (win != null) win.clearTimeout(record.completionTimer)
    else clearTimeout(record.completionTimer)
  } catch {
    /* ignore */
  }
  record.completionTimer = null
}

/**
 * Fully removes an owner record from the channel (for unmount / doc change).
 */
export function evictOwner(channel: ProgressChannel, token: OwnerToken): void {
  const record = channel.owners.get(token)
  if (record?.completionTimer != null) {
    try {
      const win = channel.document.defaultView
      if (win != null) win.clearTimeout(record.completionTimer)
      else clearTimeout(record.completionTimer)
    } catch {
      /* ignore */
    }
  }
  channel.owners.delete(token)
  renderChannel(channel)
  if (getActiveOwners(channel).length === 0) {
    stopTrickle(channel)
  }
}

/**
 * Checks if an owner is currently registered in the channel.
 */
export function isOwnerActive(
  channel: ProgressChannel,
  token: OwnerToken,
): boolean {
  const record = channel.owners.get(token)
  if (record == null) return false
  return record.progress !== null
}

/**
 * Gets the current progress for an owner (null if idle).
 */
export function getOwnerProgress(
  channel: ProgressChannel,
  token: OwnerToken,
): number | null {
  return channel.owners.get(token)?.progress ?? null
}

// ─── Test helpers (not exported from index.ts) ────────────────────────────────

export function getChannelOwnerCount(
  doc: Document,
  parent: HTMLElement,
): number {
  return getChannel(doc, parent)?.owners.size ?? 0
}

export function getChannelActiveOwnerCount(
  doc: Document,
  parent: HTMLElement,
): number {
  const ch = getChannel(doc, parent)
  return ch != null ? getActiveOwners(ch).length : 0
}

export function channelHasDom(doc: Document, parent: HTMLElement): boolean {
  return getChannel(doc, parent)?.dom != null
}

export function channelHasTrickleTimer(
  doc: Document,
  parent: HTMLElement,
): boolean {
  return getChannel(doc, parent)?.trickleTimer != null
}

export function getChannelRenderedProgress(
  doc: Document,
  parent: HTMLElement,
): number {
  return getChannel(doc, parent)?.renderedProgress ?? 0
}
