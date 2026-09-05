export const HOOK_CATEGORIES = [
  'Events',
  'Elements',
  'Input',
  'Sensors',
  'Media',
  'State and storage',
  'Network',
  'Browser',
  'Utilities',
] as const

export type HookCategory = (typeof HOOK_CATEGORIES)[number]

export const HOOK_NAMES = [
  'useOnClickOutside',
  'useOnElementRemoval',
  'useOnKeyStroke',
  'useEventListener',
  'useOnLongPress',
  'useOnStartTyping',
  'useEventBus',
  'useElementByPoint',
  'useElementHover',
  'useFocus',
  'useFocusWithin',
  'useTextSelection',
  'useMouse',
  'useMousePressed',
  'useParallax',
  'useScroll',
  'useScrollLock',
  'useInfiniteScroll',
  'usePageLeave',
  'useDevicesList',
  'useDisplayMedia',
  'useUserMedia',
  'useEyeDropper',
  'useLocalStorage',
  'useSessionStorage',
  'useCookies',
  'useUrlSearchParams',
  'useJwt',
  'useWebSocket',
  'useFullscreen',
  'useFavicon',
  'useNProgress',
  'useQRCode',
  'useBase64',
  'useDebounceFn',
] as const

export type HookName = (typeof HOOK_NAMES)[number]

export interface HookParameterDoc {
  name: string
  description: string
}

export interface HookDocumentation {
  name: HookName
  category: HookCategory
  purpose: string
  overview: string
  whenToUse: string[]
  whenNotToUse: string[]
  importExample: string
  signature: string
  parameters: HookParameterDoc[]
  returnValues: string
  defaults: string
  runtimeBehavior: string[]
  ssrBehavior: string
  strictModeBehavior: string
  accessibility: string
  limitations: string[]
  relatedHooks: HookName[]
}
