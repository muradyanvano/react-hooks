import type { Dispatch, SetStateAction } from 'react'

import { readLocalStorageArea } from '../browserStorage/browserStorageHelpers'
import {
  useBrowserStorage,
  type BrowserStorageOptions,
} from '../browserStorage/useBrowserStorage'

export interface UseLocalStorageSerializer<T> {
  read: (raw: string) => T
  write: (value: T) => string
}

export type UseLocalStorageMergeDefaults<T> =
  boolean | ((storedValue: T, defaultValue: T) => T)

export interface UseLocalStorageOptions<T> {
  serializer?: UseLocalStorageSerializer<T>
  mergeDefaults?: UseLocalStorageMergeDefaults<T>
  writeDefaults?: boolean
  listenToStorageChanges?: boolean
  window?: Window | null
  onError?: (error: Error) => void
}

export interface UseLocalStorageReturn<T> {
  value: T
  setValue: Dispatch<SetStateAction<T>>
  remove: () => void
  reset: () => void
  isSupported: boolean
  isReady: boolean
  error: Error | null
}

/**
 * Persist a value in `localStorage` with SSR-safe hydration, automatic
 * serialization, same-document registry sync, and optional cross-tab events.
 *
 * Browser storage is accessed only in effects. The first client render matches
 * the server (`value: defaultValue`, `isReady: false`, `isSupported: false`).
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options?: UseLocalStorageOptions<T>,
): UseLocalStorageReturn<T> {
  return useBrowserStorage(
    key,
    defaultValue,
    readLocalStorageArea,
    options as BrowserStorageOptions<T> | undefined,
  )
}
