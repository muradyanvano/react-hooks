import { useEffect, useRef, useState } from 'react'

import {
  DEFAULT_ENABLED,
  DEFAULT_REL,
  DEFAULT_RESTORE_ON_UNMOUNT,
  IDLE_STATE,
  faviconStatesEqual,
  invokeOnErrorSafely,
  isActiveIconRequest,
  isFaviconDocumentSupported,
  resolveEffectiveDocument,
  resolveIconHref,
  validateRel,
  type FaviconViewState,
  type UseFaviconOptions,
  type UseFaviconReturn,
} from './faviconHelpers'
import {
  acquireOrUpdateFavicon,
  createFaviconOwnerToken,
  ownerHoldsFavicon,
  releaseFavicon,
  type FaviconOwnerToken,
} from './faviconRegistry'

export type { UseFaviconOptions, UseFaviconReturn } from './faviconHelpers'

interface ActiveOwnership {
  document: Document
  relKey: string
  token: FaviconOwnerToken
}

/**
 * Controls a document favicon `<link>` through shared private ownership.
 *
 * `icon` is controlled by React state or props. `null` / `undefined` / `''`
 * release this instance. Explicit `document: null` never falls back to the
 * global document. Defaults: `enabled: true`, `rel: 'icon'`,
 * `restoreOnUnmount: true`.
 *
 * Browser favicon display may be cached or delayed; this hook updates the
 * document head only.
 */
export function useFavicon(
  icon: string | null | undefined,
  options?: UseFaviconOptions,
): UseFaviconReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const documentOption = options?.document
  const baseUrl = options?.baseUrl
  const relOption = options?.rel ?? DEFAULT_REL

  const [state, setState] = useState<FaviconViewState>(IDLE_STATE)

  const tokenRef = useRef<FaviconOwnerToken | null>(null)
  if (tokenRef.current === null) {
    tokenRef.current = createFaviconOwnerToken()
  }

  const ownershipRef = useRef<ActiveOwnership | null>(null)
  const lastTargetRef = useRef<ActiveOwnership | null>(null)
  const latestOnErrorRef = useRef(options?.onError)
  const restoreOnUnmountRef = useRef(
    options?.restoreOnUnmount ?? DEFAULT_RESTORE_ON_UNMOUNT,
  )
  const lifecycleGenerationRef = useRef(0)

  useEffect(() => {
    latestOnErrorRef.current = options?.onError
    restoreOnUnmountRef.current =
      options?.restoreOnUnmount ?? DEFAULT_RESTORE_ON_UNMOUNT
  })

  const publish = (next: FaviconViewState) => {
    setState((previous) =>
      faviconStatesEqual(previous, next) ? previous : next,
    )
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- favicon DOM ownership sync after commit */
    const lifecycleGeneration = ++lifecycleGenerationRef.current
    const token = tokenRef.current!
    let active: ActiveOwnership | null = ownershipRef.current

    const setActive = (next: ActiveOwnership | null) => {
      active = next
      ownershipRef.current = next
      if (next != null) {
        lastTargetRef.current = next
      }
    }

    const releaseToken = (
      target: ActiveOwnership | null,
      mode: 'restore' | 'persist',
    ): Error | null => {
      if (target == null) {
        return null
      }
      if (active?.token === target.token) {
        active = null
        ownershipRef.current = null
      }
      if (lastTargetRef.current?.token === target.token) {
        lastTargetRef.current = null
      }
      const result = releaseFavicon({
        document: target.document,
        relKey: target.relKey,
        token: target.token,
        mode,
      })
      return result.ok ? null : result.error
    }

    const reportError = (error: Error, supported: boolean) => {
      publish({ href: null, isSupported: supported, error })
      invokeOnErrorSafely(latestOnErrorRef.current, error)
    }

    if (!enabled || !isActiveIconRequest(icon)) {
      // Explicit lifecycle release always restores (restoreOnUnmount is unmount-only).
      const target = active ?? lastTargetRef.current
      const releaseError = releaseToken(target, 'restore')
      const doc =
        documentOption === null
          ? null
          : resolveEffectiveDocument(documentOption)
      const supported =
        documentOption === null ? false : isFaviconDocumentSupported(doc)
      if (releaseError != null) {
        reportError(releaseError, supported)
      } else {
        publish({ href: null, isSupported: supported, error: null })
      }
    } else if (documentOption === null) {
      releaseToken(active ?? lastTargetRef.current, 'restore')
      publish({ href: null, isSupported: false, error: null })
    } else {
      const relValidation = validateRel(relOption)
      const doc = resolveEffectiveDocument(documentOption)

      if (!relValidation.ok) {
        releaseToken(active ?? lastTargetRef.current, 'restore')
        reportError(relValidation.error, isFaviconDocumentSupported(doc))
      } else if (doc == null || !isFaviconDocumentSupported(doc)) {
        releaseToken(active ?? lastTargetRef.current, 'restore')
        if (doc == null) {
          publish({ href: null, isSupported: false, error: null })
        } else {
          reportError(
            new Error('Favicon document environment is not supported'),
            false,
          )
        }
      } else {
        const resolved = resolveIconHref(icon, baseUrl, doc)
        if (!resolved.ok) {
          releaseToken(active ?? lastTargetRef.current, 'restore')
          reportError(resolved.error, true)
        } else {
          if (
            active != null &&
            (active.document !== doc || active.relKey !== relValidation.key)
          ) {
            releaseToken(active, 'restore')
          }

          const acquired = acquireOrUpdateFavicon({
            document: doc,
            relKey: relValidation.key,
            relDisplay: relValidation.display,
            href: resolved.href,
            token,
          })

          if (!acquired.ok) {
            setActive(null)
            reportError(acquired.error, true)
          } else {
            setActive({
              document: doc,
              relKey: relValidation.key,
              token,
            })
            publish({
              href: acquired.href,
              isSupported: true,
              error: null,
            })
          }
        }
      }
    }

    return () => {
      const target = active ?? ownershipRef.current
      ownershipRef.current = null
      active = null
      if (target == null) {
        return
      }

      if (restoreOnUnmountRef.current === false) {
        // Defer persistence so Strict Mode remount (same tick) can reclaim the
        // owner before bookkeeping is dropped. Microtasks run after the remount
        // effect increments lifecycleGenerationRef.
        queueMicrotask(() => {
          // Compare against the latest generation intentionally — a Strict Mode
          // remount increments the ref before this microtask runs.
          // eslint-disable-next-line react-hooks/exhaustive-deps -- generation-owned persist
          if (lifecycleGenerationRef.current !== lifecycleGeneration) {
            return
          }
          if (ownershipRef.current?.token === target.token) {
            return
          }
          if (
            !ownerHoldsFavicon(target.document, target.relKey, target.token)
          ) {
            return
          }
          releaseFavicon({
            document: target.document,
            relKey: target.relKey,
            token: target.token,
            mode: 'persist',
          })
          if (lastTargetRef.current?.token === target.token) {
            lastTargetRef.current = null
          }
        })
        return
      }

      releaseFavicon({
        document: target.document,
        relKey: target.relKey,
        token: target.token,
        mode: 'restore',
      })
      if (lastTargetRef.current?.token === target.token) {
        lastTargetRef.current = null
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // onError / restoreOnUnmount identity changes must not reacquire (held in refs).
  }, [icon, enabled, documentOption, baseUrl, relOption])

  return {
    href: state.href,
    isSupported: state.isSupported,
    error: state.error,
  }
}
