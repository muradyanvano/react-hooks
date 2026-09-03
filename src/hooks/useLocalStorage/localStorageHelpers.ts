/**
 * Compatibility re-exports for colocated local-storage helper tests.
 * Shared implementation lives in `../browserStorage`.
 */
export {
  applyMergeDefaults,
  createDefaultSerializer,
  isBrowserEnvironment,
  isPlainObject,
  normalizeStorageError,
  resolveLocalStorage,
  resolveStorageWindow,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  shallowMergeDefaults,
  type SameDocumentListener,
  type SameDocumentNotification,
} from '../browserStorage/browserStorageHelpers'

export type {
  BrowserStorageMergeDefaults as UseLocalStorageMergeDefaults,
  BrowserStorageSerializer as UseLocalStorageSerializer,
} from '../browserStorage/browserStorageHelpers'
