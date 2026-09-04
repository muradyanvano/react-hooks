import {
  applyIconToLink,
  createIconLink,
  findMatchingIconLinks,
  isFaviconDocumentSupported,
  normalizeError,
  restoreLinkSnapshot,
  selectManagedLink,
  snapshotExistingLink,
  type LinkSnapshot,
} from './faviconHelpers'

export type FaviconOwnerToken = symbol

export interface FaviconOwnerRecord {
  token: FaviconOwnerToken
  href: string
  relDisplay: string
}

interface RelChannel {
  snapshot: LinkSnapshot
  owners: FaviconOwnerRecord[]
}

type DocumentChannels = Map<string, RelChannel>

const registry = new WeakMap<Document, DocumentChannels>()

export function createFaviconOwnerToken(): FaviconOwnerToken {
  return Symbol('favicon-owner')
}

function getDocumentChannels(doc: Document): DocumentChannels {
  let channels = registry.get(doc)
  if (channels == null) {
    channels = new Map()
    registry.set(doc, channels)
  }
  return channels
}

function pruneEmptyDocument(doc: Document, channels: DocumentChannels): void {
  if (channels.size === 0) {
    registry.delete(doc)
  }
}

function ensureManagedLink(
  doc: Document,
  relKey: string,
  relDisplay: string,
  href: string,
): LinkSnapshot {
  const matches = findMatchingIconLinks(doc, relKey)
  const existing = selectManagedLink(matches)
  if (existing != null) {
    return snapshotExistingLink(existing)
  }
  const created = createIconLink(doc, href, relDisplay)
  return { kind: 'created', element: created }
}

function applyCurrentOwner(channel: RelChannel): void {
  const current = channel.owners[channel.owners.length - 1]
  if (current == null) {
    return
  }
  applyIconToLink(channel.snapshot.element, current.href, current.relDisplay)
}

function removeOwnerFromChannel(
  channel: RelChannel,
  token: FaviconOwnerToken,
): { removed: FaviconOwnerRecord; wasCurrent: boolean } | null {
  const index = channel.owners.findIndex((owner) => owner.token === token)
  if (index < 0) {
    return null
  }
  const wasCurrent = index === channel.owners.length - 1
  const [removed] = channel.owners.splice(index, 1)
  if (removed == null) {
    return null
  }
  return { removed, wasCurrent }
}

function rollbackFailedAcquire(
  doc: Document,
  channels: DocumentChannels,
  relKey: string,
  channel: RelChannel,
  token: FaviconOwnerToken,
): void {
  removeOwnerFromChannel(channel, token)
  if (channel.owners.length > 0) {
    try {
      applyCurrentOwner(channel)
    } catch {
      // Keep remaining owners registered; DOM may already match a prior owner.
    }
    return
  }
  channels.delete(relKey)
  pruneEmptyDocument(doc, channels)
  try {
    restoreLinkSnapshot(channel.snapshot)
  } catch {
    // Best-effort rollback of a failed acquire that emptied the channel.
  }
}

export type FaviconAcquireResult =
  { ok: true; href: string; wrote: boolean } | { ok: false; error: Error }

/**
 * Acquire or update ownership. Most recently updated owner becomes current,
 * except equivalent href+rel updates which preserve order and skip DOM writes.
 */
export function acquireOrUpdateFavicon(options: {
  document: Document
  relKey: string
  relDisplay: string
  href: string
  token: FaviconOwnerToken
}): FaviconAcquireResult {
  const { document: doc, relKey, relDisplay, href, token } = options

  if (!isFaviconDocumentSupported(doc)) {
    return {
      ok: false,
      error: new Error('Favicon document environment is not supported'),
    }
  }

  const channels = getDocumentChannels(doc)
  let channel = channels.get(relKey)

  try {
    if (channel == null) {
      const snapshot = ensureManagedLink(doc, relKey, relDisplay, href)
      channel = {
        snapshot,
        owners: [{ token, href, relDisplay }],
      }
      channels.set(relKey, channel)
      applyCurrentOwner(channel)
      return { ok: true, href, wrote: true }
    }

    // Re-bind when the managed element was removed externally.
    let rebound = false
    if (!channel.snapshot.element.isConnected) {
      channel.snapshot = ensureManagedLink(doc, relKey, relDisplay, href)
      rebound = true
    }

    const existingIndex = channel.owners.findIndex(
      (owner) => owner.token === token,
    )

    if (existingIndex >= 0) {
      const existing = channel.owners[existingIndex]!
      if (existing.href === href && existing.relDisplay === relDisplay) {
        // Equivalent update: preserve precedence. Apply only after a rebind so
        // the current owner (possibly this one) is written to the new element.
        if (rebound) {
          applyCurrentOwner(channel)
          return { ok: true, href, wrote: true }
        }
        // External href/rel edits on a still-connected managed node are not
        // fought by an equivalent React update.
        return { ok: true, href, wrote: false }
      }
      channel.owners.splice(existingIndex, 1)
    }

    channel.owners.push({ token, href, relDisplay })
    applyCurrentOwner(channel)
    return { ok: true, href, wrote: true }
  } catch (cause) {
    if (channel != null && channels.get(relKey) === channel) {
      rollbackFailedAcquire(doc, channels, relKey, channel, token)
    }
    return {
      ok: false,
      error: normalizeError(cause),
    }
  }
}

export type FaviconReleaseMode = 'restore' | 'persist'

/**
 * Release ownership for `token`.
 * - `restore`: reveal previous owner or restore/remove baseline when final
 * - `persist`: remove bookkeeping; if final/current, leave applied DOM as-is
 */
export function releaseFavicon(options: {
  document: Document
  relKey: string
  token: FaviconOwnerToken
  mode: FaviconReleaseMode
}): { ok: true; wrote: boolean } | { ok: false; error: Error } {
  const { document: doc, relKey, token, mode } = options
  const channels = registry.get(doc)
  if (channels == null) {
    return { ok: true, wrote: false }
  }

  const channel = channels.get(relKey)
  if (channel == null) {
    return { ok: true, wrote: false }
  }

  const removal = removeOwnerFromChannel(channel, token)
  if (removal == null) {
    return { ok: true, wrote: false }
  }

  try {
    if (channel.owners.length > 0) {
      if (removal.wasCurrent) {
        applyCurrentOwner(channel)
        return { ok: true, wrote: true }
      }
      // Non-current release: leave the displayed favicon untouched.
      return { ok: true, wrote: false }
    }

    channels.delete(relKey)
    pruneEmptyDocument(doc, channels)

    if (mode === 'persist') {
      return { ok: true, wrote: false }
    }

    restoreLinkSnapshot(channel.snapshot)
    return { ok: true, wrote: true }
  } catch (cause) {
    // Always drop empty channel bookkeeping even when DOM restore throws.
    channels.delete(relKey)
    pruneEmptyDocument(doc, channels)
    return {
      ok: false,
      error: normalizeError(cause),
    }
  }
}

/** Test helper: active owner count for a document/rel channel. */
export function getFaviconOwnerCount(doc: Document, relKey: string): number {
  return registry.get(doc)?.get(relKey)?.owners.length ?? 0
}

/** Test helper: whether a token currently owns a channel. */
export function ownerHoldsFavicon(
  doc: Document,
  relKey: string,
  token: FaviconOwnerToken,
): boolean {
  const owners = registry.get(doc)?.get(relKey)?.owners
  return owners?.some((owner) => owner.token === token) ?? false
}

/** Test helper: current applied href for a channel, if any. */
export function getCurrentFaviconHref(
  doc: Document,
  relKey: string,
): string | null {
  const owners = registry.get(doc)?.get(relKey)?.owners
  const current = owners?.[owners.length - 1]
  return current?.href ?? null
}

/** Test helper: ordered owner hrefs (oldest → current). */
export function getFaviconOwnerHrefs(doc: Document, relKey: string): string[] {
  return (
    registry
      .get(doc)
      ?.get(relKey)
      ?.owners.map((owner) => owner.href) ?? []
  )
}

/** Test helper: clear all channels for a document (test isolation). */
export function clearFaviconDocumentRegistry(doc: Document): void {
  registry.delete(doc)
}
