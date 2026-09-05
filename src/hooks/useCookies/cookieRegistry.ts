import {
  normalizePollingInterval,
  readDocumentCookie,
  resolveCookieStore,
  type CookieStoreChangeEventLike,
  type CookieStoreLike,
} from './cookieHelpers'

export type CookieObservationCause = 'set' | 'remove' | 'external'

export type CookieRegistryNotification = {
  raw: string
  previousRaw: string
  cause: CookieObservationCause
}

export type CookieRegistrySubscriber = {
  onChange: (notification: CookieRegistryNotification) => void
  /** When true, this subscriber requires polling if Cookie Store is unavailable. */
  needsPolling: boolean
  pollingInterval: number
}

type DocumentCookieEntry = {
  subscribers: Set<CookieRegistrySubscriber>
  raw: string
  pollTimer: ReturnType<typeof setInterval> | null
  pollInterval: number
  cookieStore: CookieStoreLike | null
  onCookieStoreChange: ((event: CookieStoreChangeEventLike) => void) | null
}

const registries = new WeakMap<object, DocumentCookieEntry>()

function getEntry(documentRef: object): DocumentCookieEntry {
  let entry = registries.get(documentRef)
  if (entry == null) {
    entry = {
      subscribers: new Set(),
      raw: '',
      pollTimer: null,
      pollInterval: 1000,
      cookieStore: null,
      onCookieStoreChange: null,
    }
    registries.set(documentRef, entry)
  }
  return entry
}

function clearPoller(entry: DocumentCookieEntry): void {
  if (entry.pollTimer != null) {
    clearInterval(entry.pollTimer)
    entry.pollTimer = null
  }
}

function detachCookieStore(entry: DocumentCookieEntry): void {
  if (entry.cookieStore != null && entry.onCookieStoreChange != null) {
    try {
      entry.cookieStore.removeEventListener('change', entry.onCookieStoreChange)
    } catch {
      // Contain platform detach errors.
    }
  }
  entry.cookieStore = null
  entry.onCookieStoreChange = null
}

function computePollingNeed(entry: DocumentCookieEntry): {
  needsPolling: boolean
  interval: number
} {
  let needsPolling = false
  let interval = Number.POSITIVE_INFINITY
  for (const subscriber of entry.subscribers) {
    if (!subscriber.needsPolling) {
      continue
    }
    needsPolling = true
    interval = Math.min(
      interval,
      normalizePollingInterval(subscriber.pollingInterval),
    )
  }
  if (!needsPolling || !Number.isFinite(interval)) {
    return { needsPolling: false, interval: 1000 }
  }
  return { needsPolling: true, interval }
}

function applyExternalRaw(entry: DocumentCookieEntry, nextRaw: string): void {
  const previousRaw = entry.raw
  if (previousRaw === nextRaw) {
    return
  }
  entry.raw = nextRaw
  notifySubscribers(entry, {
    raw: nextRaw,
    previousRaw,
    cause: 'external',
  })
}

function notifySubscribers(
  entry: DocumentCookieEntry,
  notification: CookieRegistryNotification,
  except?: CookieRegistrySubscriber,
): void {
  for (const subscriber of [...entry.subscribers]) {
    if (subscriber === except) {
      continue
    }
    try {
      subscriber.onChange(notification)
    } catch {
      // Contain subscriber exceptions.
    }
  }
}

function pollDocument(documentRef: Document, entry: DocumentCookieEntry): void {
  const read = readDocumentCookie(documentRef)
  if (!read.ok) {
    return
  }
  applyExternalRaw(entry, read.raw)
}

function ensurePoller(
  documentRef: Document,
  entry: DocumentCookieEntry,
  interval: number,
): void {
  if (entry.pollTimer != null && entry.pollInterval === interval) {
    return
  }
  clearPoller(entry)
  entry.pollInterval = interval
  entry.pollTimer = setInterval(() => {
    pollDocument(documentRef, entry)
  }, interval)
}

function reconcileObservation(
  documentRef: Document,
  entry: DocumentCookieEntry,
): void {
  const store = resolveCookieStore(documentRef)
  const pollNeed = computePollingNeed(entry)
  const shouldObserveExternalChanges = pollNeed.needsPolling

  if (!shouldObserveExternalChanges) {
    clearPoller(entry)
    detachCookieStore(entry)
    return
  }

  if (store != null) {
    clearPoller(entry)
    if (entry.cookieStore !== store) {
      detachCookieStore(entry)
      const onChange = () => {
        const read = readDocumentCookie(documentRef)
        if (!read.ok) {
          return
        }
        applyExternalRaw(entry, read.raw)
      }
      try {
        store.addEventListener('change', onChange)
        entry.cookieStore = store
        entry.onCookieStoreChange = onChange
      } catch {
        entry.cookieStore = null
        entry.onCookieStoreChange = null
      }
    }
    if (entry.cookieStore == null && pollNeed.needsPolling) {
      ensurePoller(documentRef, entry, pollNeed.interval)
    }
    return
  }

  detachCookieStore(entry)
  if (pollNeed.needsPolling) {
    ensurePoller(documentRef, entry, pollNeed.interval)
  } else {
    clearPoller(entry)
  }
}

export function subscribeCookieDocument(
  documentRef: Document,
  subscriber: CookieRegistrySubscriber,
): () => void {
  const entry = getEntry(documentRef)
  entry.subscribers.add(subscriber)

  if (entry.subscribers.size === 1) {
    const read = readDocumentCookie(documentRef)
    entry.raw = read.ok ? read.raw : ''
  }

  reconcileObservation(documentRef, entry)

  return () => {
    entry.subscribers.delete(subscriber)
    if (entry.subscribers.size === 0) {
      clearPoller(entry)
      detachCookieStore(entry)
      registries.delete(documentRef)
      return
    }
    reconcileObservation(documentRef, entry)
  }
}

/** Recompute shared poller / Cookie Store attachment after subscriber flag changes. */
export function reconcileCookieDocumentObservation(
  documentRef: Document,
): void {
  const entry = registries.get(documentRef)
  if (entry == null) {
    return
  }
  reconcileObservation(documentRef, entry)
}

export function publishCookieSnapshot(
  documentRef: Document,
  nextRaw: string,
  cause: CookieObservationCause,
  except?: CookieRegistrySubscriber,
): void {
  const entry = getEntry(documentRef)
  const previousRaw = entry.raw
  if (previousRaw === nextRaw) {
    entry.raw = nextRaw
    return
  }
  entry.raw = nextRaw
  notifySubscribers(
    entry,
    {
      raw: nextRaw,
      previousRaw,
      cause,
    },
    except,
  )
}

export function seedCookieRegistryRaw(
  documentRef: Document,
  raw: string,
): void {
  getEntry(documentRef).raw = raw
}

export function getCookiePollerIntervalForTests(
  documentRef: Document,
): number | null {
  const entry = registries.get(documentRef)
  if (entry == null || entry.pollTimer == null) {
    return null
  }
  return entry.pollInterval
}

export function hasCookieStoreListenerForTests(documentRef: Document): boolean {
  const entry = registries.get(documentRef)
  return entry?.cookieStore != null && entry.onCookieStoreChange != null
}
