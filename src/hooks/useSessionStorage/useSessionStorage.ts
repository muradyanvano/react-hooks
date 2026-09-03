import type { Dispatch, SetStateAction } from 'react'

import { readSessionStorageArea } from '../browserStorage/browserStorageHelpers'
import {
  useBrowserStorage,
  type BrowserStorageOptions,
} from '../browserStorage/useBrowserStorage'

export interface UseSessionStorageSerializer<T> {
  read: (raw: string) => T
  write: (value: T) => string
}

export type UseSessionStorageMergeDefaults<T> =
  boolean | ((storedValue: T, defaultValue: T) => T)

export interface UseSessionStorageOptions<T> {
  serializer?: UseSessionStorageSerializer<T>
  mergeDefaults?: UseSessionStorageMergeDefaults<T>
  writeDefaults?: boolean
  listenToStorageChanges?: boolean
  window?: Window | null
  onError?: (error: Error) => void
}

export interface UseSessionStorageReturn<T> {
  value: T
  setValue: Dispatch<SetStateAction<T>>
  remove: () => void
  reset: () => void
  isSupported: boolean
  isReady: boolean
  error: Error | null
}

/**
 * Persist a value in `sessionStorage` with SSR-safe hydration, automatic
 * serialization, and same-document registry sync.
 *
 * Session storage survives reloads in the same browsing context and is cleared
 * when that top-level session ends. It is not a durable cross-tab store.
 *
 * Browser storage is accessed only in effects. The first client render matches
 * the server (`value: defaultValue`, `isReady: false`, `isSupported: false`).
 */
export function useSessionStorage<T>(
  key: string,
  defaultValue: T,
  options?: UseSessionStorageOptions<T>,
): UseSessionStorageReturn<T> {
  return useBrowserStorage(
    key,
    defaultValue,
    readSessionStorageArea,
    options as BrowserStorageOptions<T> | undefined,
  )
}
