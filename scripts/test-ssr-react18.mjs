import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * Packed-consumer SSR check against React 18.
 *
 * Kept out of the default unit-test run because it installs React 18 into a
 * temporary directory. Integrated into `verify:ci` after the library build.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const reactVersion = '18.3.1'
const reactDomVersion = '18.3.1'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    ...options,
  })

  if (result.error || result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    if (result.stdout) {
      console.error(result.stdout)
    }
    if (result.stderr) {
      console.error(result.stderr)
    }
    throw new Error(
      `Command failed (${result.status}): ${command} ${args.join(' ')}`,
    )
  }

  return result
}

function runNpm(args, options = {}) {
  // Windows resolves `npm` through the shell; avoid `npm.cmd` + shell:false ENOENT issues.
  return spawnSync('npm', args, {
    encoding: 'utf8',
    shell: true,
    ...options,
  })
}

function isLayoutEffectSsrMessage(message) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('uselayouteffect') &&
    (normalized.includes('does nothing on the server') ||
      normalized.includes('server-rendered') ||
      normalized.includes('server renderer'))
  )
}

function isUnexpectedSsrMessage(message) {
  const normalized = message.toLowerCase()
  if (isLayoutEffectSsrMessage(message)) {
    return true
  }

  // Fail on other React hook/SSR warnings that indicate package misuse.
  return (
    normalized.includes('warning:') &&
    (normalized.includes('react') ||
      normalized.includes('hook') ||
      normalized.includes('hydrat'))
  )
}

let tarballPath = null
let consumerDir = null

try {
  console.log('Building library for React 18 SSR consumer check...')
  const build = runNpm(['run', 'build'], { cwd: repoRoot })
  if (build.error || build.status !== 0) {
    if (build.error) {
      console.error(build.error)
    }
    if (build.stdout) {
      console.error(build.stdout)
    }
    if (build.stderr) {
      console.error(build.stderr)
    }
    throw new Error(`Command failed (${build.status}): npm run build`)
  }

  console.log('Packing library tarball...')
  const pack = runNpm(['pack', '--json'], { cwd: repoRoot })
  if (pack.error || pack.status !== 0) {
    if (pack.error) {
      console.error(pack.error)
    }
    if (pack.stdout) {
      console.error(pack.stdout)
    }
    if (pack.stderr) {
      console.error(pack.stderr)
    }
    throw new Error(`Command failed (${pack.status}): npm pack --json`)
  }
  const packJson = JSON.parse(pack.stdout)
  const packEntry = Array.isArray(packJson) ? packJson[0] : packJson
  if (packEntry?.filename == null) {
    throw new Error('npm pack --json did not return a filename')
  }

  tarballPath = resolve(repoRoot, packEntry.filename)
  console.log(`Tarball: ${packEntry.filename}`)

  consumerDir = mkdtempSync(join(tmpdir(), 'react-hooks-ssr18-'))
  writeFileSync(
    join(consumerDir, 'package.json'),
    JSON.stringify(
      {
        name: 'react-hooks-ssr18-consumer',
        private: true,
        type: 'module',
      },
      null,
      2,
    ),
  )

  console.log(
    `Installing react@${reactVersion}, react-dom@${reactDomVersion}, and packed package...`,
  )
  const install = runNpm(
    [
      'install',
      `react@${reactVersion}`,
      `react-dom@${reactDomVersion}`,
      tarballPath,
    ],
    { cwd: consumerDir },
  )
  if (install.error || install.status !== 0) {
    if (install.error) {
      console.error(install.error)
    }
    if (install.stdout) {
      console.error(install.stdout)
    }
    if (install.stderr) {
      console.error(install.stderr)
    }
    throw new Error(`Command failed (${install.status}): npm install`)
  }

  writeFileSync(
    join(consumerDir, 'ssr-check.mjs'),
    `import { createRequire } from 'node:module'
import { createElement, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import {
  useOnClickOutside,
  useOnElementRemoval,
  useOnKeyStroke,
  useEventListener,
  useOnLongPress,
  useOnStartTyping,
  useDevicesList,
  useDisplayMedia,
  useElementByPoint,
  useElementHover,
  useFocus,
  useFocusWithin,
  useInfiniteScroll,
  useMouse,
  useMousePressed,
  useParallax,
  useScroll,
  useScrollLock,
  useUserMedia,
  useWebSocket,
  useLocalStorage,
  useSessionStorage,
  useCookies,
  useJwt,
} from '@muradyanvano/react-hooks'

const SSR_JWT_VALID =
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJzc3ItZGVtbyIsIm5hbWUiOiJTU1IgVXNlciIsInJvbGUiOiJtZW1iZXIifQ.synthetic-sig'
const SSR_JWT_TYPED =
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ0eXBlZCIsInJvbGUiOiJhZG1pbiJ9.synthetic-sig'
const SSR_JWT_INVALID = 'not-a-jwt'

const require = createRequire(import.meta.url)
const reactPkg = require('react/package.json')
const reactDomPkg = require('react-dom/package.json')

const warnings = []
const errors = []
const originalWarn = console.warn
const originalError = console.error

console.warn = (...args) => {
  warnings.push(args.map(String).join(' '))
}
console.error = (...args) => {
  errors.push(args.map(String).join(' '))
}

let mutationObserverCalls = 0
const previousMO = globalThis.MutationObserver
globalThis.MutationObserver = class {
  constructor() {
    mutationObserverCalls += 1
  }
  observe() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

let resizeObserverCalls = 0
const previousRO = globalThis.ResizeObserver
globalThis.ResizeObserver = class {
  constructor() {
    resizeObserverCalls += 1
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

let animationFrameCalls = 0
const previousRaf = globalThis.requestAnimationFrame
globalThis.requestAnimationFrame = (callback) => {
  animationFrameCalls += 1
  return typeof previousRaf === 'function' ? previousRaf(callback) : 0
}

let listenerCalls = 0
const previousAdd =
  typeof EventTarget !== 'undefined'
    ? EventTarget.prototype.addEventListener
    : null
if (previousAdd) {
  EventTarget.prototype.addEventListener = function (...args) {
    listenerCalls += 1
    return previousAdd.apply(this, args)
  }
}

function TestComponent() {
  const ref = useRef(null)
  useOnClickOutside(ref, () => {})
  useOnElementRemoval(ref, () => {})
  useOnKeyStroke('Escape', () => {})
  useEventListener('resize', () => {})
  useOnLongPress(ref, () => {})
  useOnStartTyping(() => {})
  useDevicesList()
  useDisplayMedia()
  useElementByPoint({ x: 0, y: 0 })
  useElementByPoint({ x: 0, y: 0, multiple: true })
  useElementHover(ref)
  const { focused, focus, blur } = useFocus(ref)
  void focused
  const { focused: focusWithin } = useFocusWithin(ref)
  void focusWithin
  const infinite = useInfiniteScroll(ref, async () => {})
  void infinite.isLoading
  const mouse = useMouse()
  void mouse.x
  const mouseCustom = useMouse({ initialValue: { x: 12, y: 34 } })
  void mouseCustom.y
  const mousePressed = useMousePressed()
  void mousePressed.pressed
  const mousePressedInitial = useMousePressed({ initialValue: true })
  void mousePressedInitial.pressed
  const mousePressedNull = useMousePressed({ target: null })
  void mousePressedNull.pressed
  const parallaxNullRef = useRef(null)
  const parallax = useParallax(parallaxNullRef)
  void parallax.roll
  void parallax.tilt
  void parallax.source
  const scrollNullRef = useRef(null)
  const scroll = useScroll(scrollNullRef)
  void scroll.x
  void scroll.y
  void scroll.isScrolling
  void scroll.arrivedState.left
  void scroll.directions.bottom
  const scrollLockNullRef = useRef(null)
  const scrollLock = useScrollLock(scrollLockNullRef)
  void scrollLock.isLocked
  void scrollLock.lock
  void scrollLock.unlock
  void scrollLock.toggle
  const scrollLockInitial = useScrollLock(scrollLockNullRef, true)
  void scrollLockInitial.isLocked
  const userMedia = useUserMedia()
  void userMedia.isSupported
  void userMedia.stream
  void userMedia.isActive
  void userMedia.isLoading
  void userMedia.error
  void userMedia.start
  void userMedia.stop
  void userMedia.restart
  const webSocket = useWebSocket('wss://example.test')
  void webSocket.data
  void webSocket.status
  void webSocket.ws
  void webSocket.send
  void webSocket.open
  void webSocket.close
  const webSocketConfigured = useWebSocket('wss://example.test', {
    immediate: true,
    autoConnect: true,
    autoClose: true,
    autoReconnect: true,
    heartbeat: true,
  })
  void webSocketConfigured.status
  const localStoragePrimitive = useLocalStorage('ssr-local-storage', 'ssr-default')
  void localStoragePrimitive.value
  void localStoragePrimitive.isReady
  void localStoragePrimitive.isSupported
  void localStoragePrimitive.error
  void localStoragePrimitive.setValue
  void localStoragePrimitive.remove
  void localStoragePrimitive.reset
  const localStorageObject = useLocalStorage('ssr-local-storage-object', {
    theme: 'light',
  })
  void localStorageObject.value.theme
  const localStorageCustom = useLocalStorage('ssr-local-storage-custom', 0, {
    serializer: {
      read: (raw) => Number(raw),
      write: (value) => String(value),
    },
  })
  void localStorageCustom.value
  const sessionStoragePrimitive = useSessionStorage(
    'ssr-session-storage',
    'ssr-session-default',
  )
  void sessionStoragePrimitive.value
  void sessionStoragePrimitive.isReady
  void sessionStoragePrimitive.isSupported
  const sessionStorageObject = useSessionStorage('ssr-session-storage-object', {
    step: 1,
  })
  void sessionStorageObject.value.step
  const sessionStorageCustom = useSessionStorage('ssr-session-storage-custom', 0, {
    serializer: {
      read: (raw) => Number(raw),
      write: (value) => String(value),
    },
    window: null,
  })
  void sessionStorageCustom.value
  void sessionStorageCustom.isSupported
  const cookiesEmpty = useCookies(['ssr-cookie-locale'])
  void cookiesEmpty.get('ssr-cookie-locale')
  void cookiesEmpty.isReady
  void cookiesEmpty.isSupported
  const cookiesInitial = useCookies(['ssr-cookie-locale'], {
    initialCookies: 'ssr-cookie-locale=en-US; ssr-cookie-theme=dark',
  })
  void cookiesInitial.get('ssr-cookie-locale')
  void cookiesInitial.isReady
  const cookiesNullDocument = useCookies(null, { document: null })
  void cookiesNullDocument.getAll()
  void cookiesNullDocument.isSupported
  const jwtValid = useJwt(SSR_JWT_VALID)
  void jwtValid.header
  void jwtValid.payload
  void jwtValid.errors
  const jwtInvalid = useJwt(SSR_JWT_INVALID, {
    fallbackValue: { guest: true },
    onError: () => {
      throw new Error('useJwt onError must not run during SSR')
    },
  })
  void jwtInvalid.header
  void jwtInvalid.payload
  void jwtInvalid.errors
  const jwtTyped = useJwt(SSR_JWT_TYPED)
  void jwtTyped.payload
  return createElement(
    'div',
    { ref, 'data-focus-api': 'ready' },
    'ssr-ok:' +
      localStoragePrimitive.value +
      ':' +
      localStorageObject.value.theme +
      ':' +
      sessionStoragePrimitive.value +
      ':' +
      String(cookiesInitial.get('ssr-cookie-locale')) +
      ':' +
      String(jwtValid.payload?.sub) +
      ':' +
      String(jwtInvalid.errors.length),
  )
}

let focusMethod
let blurMethod
function CaptureFocusApi() {
  const ref = useRef(null)
  const api = useFocus(ref)
  focusMethod = api.focus
  blurMethod = api.blur
  return createElement('div', { ref }, 'focus-api')
}

let infiniteCheck
let infiniteReset
function CaptureInfiniteApi() {
  const ref = useRef(null)
  const api = useInfiniteScroll(ref, async () => {})
  infiniteCheck = api.check
  infiniteReset = api.reset
  return createElement('div', { ref }, 'infinite-api')
}

let scrollMeasure
let scrollToMethod
let scrollSetX
let scrollSetY
function CaptureScrollApi() {
  const ref = useRef(null)
  const api = useScroll(ref)
  scrollMeasure = api.measure
  scrollToMethod = api.scrollTo
  scrollSetX = api.setX
  scrollSetY = api.setY
  return createElement('div', { ref }, 'scroll-api')
}

let scrollLockLock
let scrollLockUnlock
let scrollLockToggle
let scrollLockIsLocked
let scrollLockInitialIsLocked
function CaptureScrollLockApi() {
  const ref = useRef(null)
  const unlocked = useScrollLock(ref)
  const locked = useScrollLock(ref, true)
  scrollLockLock = unlocked.lock
  scrollLockUnlock = unlocked.unlock
  scrollLockToggle = unlocked.toggle
  scrollLockIsLocked = unlocked.isLocked
  scrollLockInitialIsLocked = locked.isLocked
  return createElement('div', { ref }, 'scroll-lock-api')
}

let userMediaStart
let userMediaStop
let userMediaRestart
let userMediaIsSupported
let userMediaStream
let userMediaIsActive
let userMediaIsLoading
let userMediaError
function CaptureUserMediaApi() {
  const api = useUserMedia()
  userMediaStart = api.start
  userMediaStop = api.stop
  userMediaRestart = api.restart
  userMediaIsSupported = api.isSupported
  userMediaStream = api.stream
  userMediaIsActive = api.isActive
  userMediaIsLoading = api.isLoading
  userMediaError = api.error
  return createElement('div', null, 'user-media-api')
}

let webSocketOpen
let webSocketClose
let webSocketSend
let webSocketData
let webSocketStatus
let webSocketWs
let webSocketConfiguredStatus
function CaptureWebSocketApi() {
  const api = useWebSocket('wss://example.test')
  const configured = useWebSocket('wss://example.test', {
    immediate: false,
    autoReconnect: { retries: 3, delay: 1000 },
    heartbeat: { message: 'ping', responseMessage: 'pong' },
  })
  webSocketOpen = api.open
  webSocketClose = api.close
  webSocketSend = api.send
  webSocketData = api.data
  webSocketStatus = api.status
  webSocketWs = api.ws
  webSocketConfiguredStatus = configured.status
  return createElement('div', null, 'web-socket-api')
}

let localStorageSetValue
let localStorageRemove
let localStorageReset
let localStorageValue
let localStorageIsReady
let localStorageIsSupported
let localStorageError
let localStorageObjectTheme
let localStorageCustomValue
function CaptureLocalStorageApi() {
  const primitive = useLocalStorage('ssr-capture-primitive', 'ssr-default')
  const objectValue = useLocalStorage('ssr-capture-object', { theme: 'light' })
  const custom = useLocalStorage('ssr-capture-custom', 0, {
    serializer: {
      read: (raw) => Number(raw),
      write: (value) => String(value),
    },
  })
  localStorageSetValue = primitive.setValue
  localStorageRemove = primitive.remove
  localStorageReset = primitive.reset
  localStorageValue = primitive.value
  localStorageIsReady = primitive.isReady
  localStorageIsSupported = primitive.isSupported
  localStorageError = primitive.error
  localStorageObjectTheme = objectValue.value.theme
  localStorageCustomValue = custom.value
  return createElement('div', null, 'local-storage-api')
}

let sessionStorageSetValue
let sessionStorageRemove
let sessionStorageReset
let sessionStorageValue
let sessionStorageIsReady
let sessionStorageIsSupported
let sessionStorageError
let sessionStorageObjectStep
let sessionStorageCustomValue
let sessionStorageNullWindowSupported
function CaptureSessionStorageApi() {
  const primitive = useSessionStorage(
    'ssr-capture-session-primitive',
    'ssr-session-default',
  )
  const objectValue = useSessionStorage('ssr-capture-session-object', { step: 1 })
  const custom = useSessionStorage('ssr-capture-session-custom', 0, {
    serializer: {
      read: (raw) => Number(raw),
      write: (value) => String(value),
    },
  })
  const nullWindow = useSessionStorage('ssr-capture-session-null-window', 'x', {
    window: null,
  })
  sessionStorageSetValue = primitive.setValue
  sessionStorageRemove = primitive.remove
  sessionStorageReset = primitive.reset
  sessionStorageValue = primitive.value
  sessionStorageIsReady = primitive.isReady
  sessionStorageIsSupported = primitive.isSupported
  sessionStorageError = primitive.error
  sessionStorageObjectStep = objectValue.value.step
  sessionStorageCustomValue = custom.value
  sessionStorageNullWindowSupported = nullWindow.isSupported
  return createElement('div', null, 'session-storage-api')
}

let cookiesGet
let cookiesGetAll
let cookiesSet
let cookiesRemove
let cookiesRefresh
let cookiesAddChangeListener
let cookiesRemoveChangeListener
let cookiesValue
let cookiesIsReady
let cookiesIsSupported
let cookiesError
let cookiesInitialValue
let cookiesInitialReady
let cookiesNullDocumentSupported
let setIntervalCalls = 0
let documentCookieReads = 0
let documentCookieWrites = 0
function CaptureCookiesApi() {
  const empty = useCookies(['ssr-capture-cookie'])
  const initial = useCookies(['ssr-capture-cookie'], {
    initialCookies: 'ssr-capture-cookie=en-US',
  })
  const nullDocument = useCookies(['ssr-capture-cookie-null'], {
    document: null,
    initialCookies: 'ssr-capture-cookie-null=x',
  })
  cookiesGet = empty.get
  cookiesGetAll = empty.getAll
  cookiesSet = empty.set
  cookiesRemove = empty.remove
  cookiesRefresh = empty.refresh
  cookiesAddChangeListener = empty.addChangeListener
  cookiesRemoveChangeListener = empty.removeChangeListener
  cookiesValue = empty.get('ssr-capture-cookie')
  cookiesIsReady = empty.isReady
  cookiesIsSupported = empty.isSupported
  cookiesError = empty.error
  cookiesInitialValue = initial.get('ssr-capture-cookie')
  cookiesInitialReady = initial.isReady
  cookiesNullDocumentSupported = nullDocument.isSupported
  return createElement('div', null, 'cookies-api')
}

let jwtValidHeaderAlg
let jwtValidPayloadSub
let jwtValidErrorsLength
let jwtInvalidHeader
let jwtInvalidPayload
let jwtInvalidErrorsLength
let jwtInvalidErrorPart
let jwtTypedPayloadSub
let jwtTypedPayloadRole
let jwtOnErrorCalls = 0
function CaptureJwtApi() {
  const valid = useJwt(SSR_JWT_VALID)
  const invalid = useJwt(SSR_JWT_INVALID, {
    fallbackValue: { guest: true },
    onError: () => {
      jwtOnErrorCalls += 1
    },
  })
  const typed = useJwt(SSR_JWT_TYPED)
  jwtValidHeaderAlg = valid.header?.alg
  jwtValidPayloadSub = valid.payload?.sub
  jwtValidErrorsLength = valid.errors.length
  jwtInvalidHeader = invalid.header
  jwtInvalidPayload = invalid.payload
  jwtInvalidErrorsLength = invalid.errors.length
  jwtInvalidErrorPart = invalid.errors[0]?.part
  jwtTypedPayloadSub = typed.payload?.sub
  jwtTypedPayloadRole = typed.payload?.role
  return createElement('div', null, 'jwt-api')
}

let html = ''
let renderError = null
let postRenderFocusError = null
let postRenderBlurError = null
let postRenderInfiniteCheckError = null
let postRenderInfiniteResetError = null
let postRenderScrollMeasureError = null
let postRenderScrollToError = null
let postRenderScrollSetXError = null
let postRenderScrollSetYError = null
let postRenderScrollLockError = null
let postRenderUserMediaError = null
let postRenderWebSocketError = null
let postRenderLocalStorageError = null
let postRenderSessionStorageError = null
let postRenderCookiesError = null
let postRenderJwtError = null
let getUserMediaCalls = 0
let webSocketConstructCalls = 0
let localStorageGetItemCalls = 0
let localStorageSetItemCalls = 0
let localStorageRemoveItemCalls = 0
const previousSetInterval = globalThis.setInterval
globalThis.setInterval = function (...args) {
  setIntervalCalls += 1
  return previousSetInterval.apply(this, args)
}
const previousDocumentCookie =
  typeof Document !== 'undefined'
    ? Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
    : undefined
if (previousDocumentCookie?.get && previousDocumentCookie?.set) {
  Object.defineProperty(Document.prototype, 'cookie', {
    configurable: true,
    enumerable: true,
    get() {
      documentCookieReads += 1
      return previousDocumentCookie.get.call(this)
    },
    set(value) {
      documentCookieWrites += 1
      return previousDocumentCookie.set.call(this, value)
    },
  })
}
const previousGUM =
  typeof navigator !== 'undefined' && navigator.mediaDevices
    ? navigator.mediaDevices.getUserMedia
    : undefined
if (
  typeof navigator !== 'undefined' &&
  navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === 'function'
) {
  navigator.mediaDevices.getUserMedia = function (...args) {
    getUserMediaCalls += 1
    return previousGUM.apply(this, args)
  }
}
const previousWebSocket = globalThis.WebSocket
if (typeof previousWebSocket === 'function') {
  globalThis.WebSocket = function (...args) {
    webSocketConstructCalls += 1
    return new previousWebSocket(...args)
  }
  globalThis.WebSocket.CONNECTING = previousWebSocket.CONNECTING
  globalThis.WebSocket.OPEN = previousWebSocket.OPEN
  globalThis.WebSocket.CLOSING = previousWebSocket.CLOSING
  globalThis.WebSocket.CLOSED = previousWebSocket.CLOSED
}
const previousStorageGetItem =
  typeof Storage !== 'undefined' ? Storage.prototype.getItem : null
const previousStorageSetItem =
  typeof Storage !== 'undefined' ? Storage.prototype.setItem : null
const previousStorageRemoveItem =
  typeof Storage !== 'undefined' ? Storage.prototype.removeItem : null
if (previousStorageGetItem) {
  Storage.prototype.getItem = function (...args) {
    localStorageGetItemCalls += 1
    return previousStorageGetItem.apply(this, args)
  }
}
if (previousStorageSetItem) {
  Storage.prototype.setItem = function (...args) {
    localStorageSetItemCalls += 1
    return previousStorageSetItem.apply(this, args)
  }
}
if (previousStorageRemoveItem) {
  Storage.prototype.removeItem = function (...args) {
    localStorageRemoveItemCalls += 1
    return previousStorageRemoveItem.apply(this, args)
  }
}
try {
  html = renderToString(createElement(TestComponent))
  renderToString(createElement(CaptureFocusApi))
  renderToString(createElement(CaptureInfiniteApi))
  renderToString(createElement(CaptureScrollApi))
  renderToString(createElement(CaptureScrollLockApi))
  renderToString(createElement(CaptureUserMediaApi))
  renderToString(createElement(CaptureWebSocketApi))
  renderToString(createElement(CaptureLocalStorageApi))
  renderToString(createElement(CaptureSessionStorageApi))
  renderToString(createElement(CaptureCookiesApi))
  renderToString(createElement(CaptureJwtApi))
  if (typeof scrollLockLock !== 'function' || typeof scrollLockUnlock !== 'function' || typeof scrollLockToggle !== 'function') {
    postRenderScrollLockError = 'useScrollLock controls missing'
  }
  if (scrollLockIsLocked !== false || scrollLockInitialIsLocked !== true) {
    postRenderScrollLockError =
      'Unexpected SSR lock state: ' +
      scrollLockIsLocked +
      '/' +
      scrollLockInitialIsLocked
  }
  if (
    typeof userMediaStart !== 'function' ||
    typeof userMediaStop !== 'function' ||
    typeof userMediaRestart !== 'function'
  ) {
    postRenderUserMediaError = 'useUserMedia controls missing'
  }
  if (
    userMediaIsSupported !== false ||
    userMediaStream != null ||
    userMediaIsActive !== false ||
    userMediaIsLoading !== false ||
    userMediaError != null
  ) {
    postRenderUserMediaError = 'Unexpected useUserMedia SSR state'
  }
  if (getUserMediaCalls !== 0) {
    postRenderUserMediaError =
      'Expected zero getUserMedia calls, got ' + getUserMediaCalls
  }
  if (
    typeof webSocketOpen !== 'function' ||
    typeof webSocketClose !== 'function' ||
    typeof webSocketSend !== 'function'
  ) {
    postRenderWebSocketError = 'useWebSocket controls missing'
  }
  if (
    webSocketData != null ||
    webSocketStatus !== 'CLOSED' ||
    webSocketWs != null ||
    webSocketConfiguredStatus !== 'CLOSED'
  ) {
    postRenderWebSocketError = 'Unexpected useWebSocket SSR state'
  }
  if (webSocketConstructCalls !== 0) {
    postRenderWebSocketError =
      'Expected zero WebSocket constructions, got ' + webSocketConstructCalls
  }
  try {
    webSocketOpen()
    webSocketClose(1000, 'ssr')
    void webSocketSend('ssr', false)
  } catch (error) {
    postRenderWebSocketError =
      error instanceof Error ? error.stack ?? error.message : String(error)
  }
  if (webSocketConstructCalls !== 0) {
    postRenderWebSocketError =
      'Expected zero WebSocket constructions after safe method calls, got ' +
      webSocketConstructCalls
  }
  if (
    typeof localStorageSetValue !== 'function' ||
    typeof localStorageRemove !== 'function' ||
    typeof localStorageReset !== 'function'
  ) {
    postRenderLocalStorageError = 'useLocalStorage controls missing'
  }
  if (
    localStorageValue !== 'ssr-default' ||
    localStorageIsReady !== false ||
    localStorageIsSupported !== false ||
    localStorageError != null ||
    localStorageObjectTheme !== 'light' ||
    localStorageCustomValue !== 0
  ) {
    postRenderLocalStorageError = 'Unexpected useLocalStorage SSR state'
  }
  if (
    localStorageGetItemCalls !== 0 ||
    localStorageSetItemCalls !== 0 ||
    localStorageRemoveItemCalls !== 0
  ) {
    postRenderLocalStorageError =
      'Expected zero Storage method calls during SSR, got get=' +
      localStorageGetItemCalls +
      ' set=' +
      localStorageSetItemCalls +
      ' remove=' +
      localStorageRemoveItemCalls
  }
  try {
    localStorageSetValue('safe')
    localStorageRemove()
    localStorageReset()
  } catch (error) {
    postRenderLocalStorageError =
      error instanceof Error ? error.stack ?? error.message : String(error)
  }
  if (
    localStorageGetItemCalls !== 0 ||
    localStorageSetItemCalls !== 0 ||
    localStorageRemoveItemCalls !== 0
  ) {
    postRenderLocalStorageError =
      'Expected zero Storage method calls after safe controls, got get=' +
      localStorageGetItemCalls +
      ' set=' +
      localStorageSetItemCalls +
      ' remove=' +
      localStorageRemoveItemCalls
  }
  if (
    typeof sessionStorageSetValue !== 'function' ||
    typeof sessionStorageRemove !== 'function' ||
    typeof sessionStorageReset !== 'function'
  ) {
    postRenderSessionStorageError = 'useSessionStorage controls missing'
  }
  if (
    sessionStorageValue !== 'ssr-session-default' ||
    sessionStorageIsReady !== false ||
    sessionStorageIsSupported !== false ||
    sessionStorageError != null ||
    sessionStorageObjectStep !== 1 ||
    sessionStorageCustomValue !== 0 ||
    sessionStorageNullWindowSupported !== false
  ) {
    postRenderSessionStorageError = 'Unexpected useSessionStorage SSR state'
  }
  try {
    sessionStorageSetValue('safe')
    sessionStorageRemove()
    sessionStorageReset()
  } catch (error) {
    postRenderSessionStorageError =
      error instanceof Error ? error.stack ?? error.message : String(error)
  }
  if (
    localStorageGetItemCalls !== 0 ||
    localStorageSetItemCalls !== 0 ||
    localStorageRemoveItemCalls !== 0
  ) {
    postRenderSessionStorageError =
      'Expected zero Storage method calls after session controls, got get=' +
      localStorageGetItemCalls +
      ' set=' +
      localStorageSetItemCalls +
      ' remove=' +
      localStorageRemoveItemCalls
  }
  if (
    typeof cookiesGet !== 'function' ||
    typeof cookiesGetAll !== 'function' ||
    typeof cookiesSet !== 'function' ||
    typeof cookiesRemove !== 'function' ||
    typeof cookiesRefresh !== 'function' ||
    typeof cookiesAddChangeListener !== 'function' ||
    typeof cookiesRemoveChangeListener !== 'function'
  ) {
    postRenderCookiesError = 'useCookies controls missing'
  }
  if (
    cookiesValue !== undefined ||
    cookiesIsReady !== false ||
    cookiesIsSupported !== false ||
    cookiesError != null ||
    cookiesInitialValue !== 'en-US' ||
    cookiesInitialReady !== true ||
    cookiesNullDocumentSupported !== false
  ) {
    postRenderCookiesError = 'Unexpected useCookies SSR state'
  }
  try {
    cookiesSet('ssr-capture-cookie', 'safe', { path: '/' })
    cookiesRemove('ssr-capture-cookie', { path: '/' })
    cookiesRefresh()
    const unsub = cookiesAddChangeListener(() => {})
    unsub()
    cookiesRemoveChangeListener(() => {})
    void cookiesGetAll()
  } catch (error) {
    postRenderCookiesError =
      error instanceof Error ? error.stack ?? error.message : String(error)
  }
  if (documentCookieReads !== 0 || documentCookieWrites !== 0) {
    postRenderCookiesError =
      'Expected zero document.cookie access during SSR, got reads=' +
      documentCookieReads +
      ' writes=' +
      documentCookieWrites
  }
  if (setIntervalCalls !== 0) {
    postRenderCookiesError =
      'Expected zero setInterval calls during SSR, got ' + setIntervalCalls
  }
  if (
    jwtValidHeaderAlg !== 'none' ||
    jwtValidPayloadSub !== 'ssr-demo' ||
    jwtValidErrorsLength !== 0 ||
    jwtInvalidHeader?.guest !== true ||
    jwtInvalidPayload?.guest !== true ||
    jwtInvalidErrorsLength !== 1 ||
    jwtInvalidErrorPart !== 'token' ||
    jwtTypedPayloadSub !== 'typed' ||
    jwtTypedPayloadRole !== 'admin' ||
    jwtOnErrorCalls !== 0
  ) {
    postRenderJwtError =
      'Unexpected useJwt SSR state: ' +
      JSON.stringify({
        jwtValidHeaderAlg,
        jwtValidPayloadSub,
        jwtValidErrorsLength,
        jwtInvalidHeader,
        jwtInvalidPayload,
        jwtInvalidErrorsLength,
        jwtInvalidErrorPart,
        jwtTypedPayloadSub,
        jwtTypedPayloadRole,
        jwtOnErrorCalls,
      })
  }
  try {
    focusMethod()
  } catch (error) {
    postRenderFocusError =
      error instanceof Error ? error.stack ?? error.message : String(error)
  }
  try {
    blurMethod()
  } catch (error) {
    postRenderBlurError =
      error instanceof Error ? error.stack ?? error.message : String(error)
  }
  try {
    void infiniteCheck()
  } catch (error) {
    postRenderInfiniteCheckError =
      error instanceof Error ? error.stack ?? error.message : String(error)
  }
  try {
    infiniteReset()
  } catch (error) {
    postRenderInfiniteResetError =
      error instanceof Error ? error.stack ?? error.message : String(error)
  }
  try {
    scrollMeasure()
  } catch (error) {
    postRenderScrollMeasureError =
      error instanceof Error ? error.stack ?? error.message : String(error)
  }
  try {
    scrollToMethod({ x: 0, y: 0 })
  } catch (error) {
    postRenderScrollToError =
      error instanceof Error ? error.stack ?? error.message : String(error)
  }
  try {
    scrollSetX(0)
  } catch (error) {
    postRenderScrollSetXError =
      error instanceof Error ? error.stack ?? error.message : String(error)
  }
  try {
    scrollSetY(0)
  } catch (error) {
    postRenderScrollSetYError =
      error instanceof Error ? error.stack ?? error.message : String(error)
  }
} catch (error) {
  renderError = error instanceof Error ? error.stack ?? error.message : String(error)
} finally {
  console.warn = originalWarn
  console.error = originalError
  if (previousMO === undefined) {
    delete globalThis.MutationObserver
  } else {
    globalThis.MutationObserver = previousMO
  }
  if (previousRO === undefined) {
    delete globalThis.ResizeObserver
  } else {
    globalThis.ResizeObserver = previousRO
  }
  if (previousRaf === undefined) {
    delete globalThis.requestAnimationFrame
  } else {
    globalThis.requestAnimationFrame = previousRaf
  }
  if (previousAdd) {
    EventTarget.prototype.addEventListener = previousAdd
  }
  if (
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    previousGUM !== undefined
  ) {
    navigator.mediaDevices.getUserMedia = previousGUM
  }
  if (previousWebSocket === undefined) {
    delete globalThis.WebSocket
  } else {
    globalThis.WebSocket = previousWebSocket
  }
  if (previousStorageGetItem) {
    Storage.prototype.getItem = previousStorageGetItem
  }
  if (previousStorageSetItem) {
    Storage.prototype.setItem = previousStorageSetItem
  }
  if (previousStorageRemoveItem) {
    Storage.prototype.removeItem = previousStorageRemoveItem
  }
  globalThis.setInterval = previousSetInterval
  if (
    typeof Document !== 'undefined' &&
    previousDocumentCookie != null
  ) {
    Object.defineProperty(Document.prototype, 'cookie', previousDocumentCookie)
  }
}

console.log(
  JSON.stringify({
    reactVersion: reactPkg.version,
    reactDomVersion: reactDomPkg.version,
    html,
    mutationObserverCalls,
    resizeObserverCalls,
    animationFrameCalls,
    listenerCalls,
    warnings,
    errors,
    renderError,
    postRenderFocusError,
    postRenderBlurError,
    postRenderInfiniteCheckError,
    postRenderInfiniteResetError,
    postRenderScrollMeasureError,
    postRenderScrollToError,
    postRenderScrollSetXError,
    postRenderScrollSetYError,
    postRenderScrollLockError,
    postRenderUserMediaError,
    postRenderWebSocketError,
    postRenderLocalStorageError,
    postRenderSessionStorageError,
    postRenderCookiesError,
    postRenderJwtError,
    webSocketConstructCalls,
    localStorageGetItemCalls,
    localStorageSetItemCalls,
    localStorageRemoveItemCalls,
    setIntervalCalls,
    documentCookieReads,
    documentCookieWrites,
  }),
)
`,
  )

  const check = run(process.execPath, ['ssr-check.mjs'], {
    cwd: consumerDir,
  })
  const payload = JSON.parse(check.stdout.trim())

  console.log(`React ${payload.reactVersion}`)
  console.log(`ReactDOM ${payload.reactDomVersion}`)
  console.log(`HTML: ${payload.html}`)
  console.log(
    `MutationObserver constructions: ${payload.mutationObserverCalls}`,
  )
  console.log(`ResizeObserver constructions: ${payload.resizeObserverCalls}`)
  console.log(`requestAnimationFrame calls: ${payload.animationFrameCalls}`)
  console.log(`addEventListener constructions: ${payload.listenerCalls}`)

  if (payload.renderError) {
    throw new Error(`SSR render threw:\\n${payload.renderError}`)
  }

  if (payload.postRenderFocusError) {
    throw new Error(
      `useFocus.focus() threw after SSR render:\\n${payload.postRenderFocusError}`,
    )
  }

  if (payload.postRenderBlurError) {
    throw new Error(
      `useFocus.blur() threw after SSR render:\\n${payload.postRenderBlurError}`,
    )
  }

  if (payload.postRenderInfiniteCheckError) {
    throw new Error(
      `useInfiniteScroll.check() threw after SSR render:\\n${payload.postRenderInfiniteCheckError}`,
    )
  }

  if (payload.postRenderInfiniteResetError) {
    throw new Error(
      `useInfiniteScroll.reset() threw after SSR render:\\n${payload.postRenderInfiniteResetError}`,
    )
  }

  if (payload.postRenderScrollMeasureError) {
    throw new Error(
      `useScroll.measure() threw after SSR render:\\n${payload.postRenderScrollMeasureError}`,
    )
  }

  if (payload.postRenderScrollToError) {
    throw new Error(
      `useScroll.scrollTo() threw after SSR render:\\n${payload.postRenderScrollToError}`,
    )
  }

  if (payload.postRenderScrollSetXError) {
    throw new Error(
      `useScroll.setX() threw after SSR render:\\n${payload.postRenderScrollSetXError}`,
    )
  }

  if (payload.postRenderScrollSetYError) {
    throw new Error(
      `useScroll.setY() threw after SSR render:\\n${payload.postRenderScrollSetYError}`,
    )
  }

  if (payload.postRenderScrollLockError) {
    throw new Error(
      `useScrollLock SSR check failed:\\n${payload.postRenderScrollLockError}`,
    )
  }

  if (payload.postRenderUserMediaError) {
    throw new Error(
      `useUserMedia SSR check failed:\\n${payload.postRenderUserMediaError}`,
    )
  }

  if (payload.postRenderWebSocketError) {
    throw new Error(
      `useWebSocket SSR check failed:\\n${payload.postRenderWebSocketError}`,
    )
  }

  if (payload.postRenderLocalStorageError) {
    throw new Error(
      `useLocalStorage SSR check failed:\\n${payload.postRenderLocalStorageError}`,
    )
  }

  if (payload.postRenderSessionStorageError) {
    throw new Error(
      `useSessionStorage SSR check failed:\\n${payload.postRenderSessionStorageError}`,
    )
  }

  if (payload.postRenderCookiesError) {
    throw new Error(
      `useCookies SSR check failed:\\n${payload.postRenderCookiesError}`,
    )
  }

  if (payload.postRenderJwtError) {
    throw new Error(`useJwt SSR check failed:\\n${payload.postRenderJwtError}`)
  }

  if (payload.setIntervalCalls !== 0) {
    throw new Error(
      `Expected no setInterval calls during SSR, got ${payload.setIntervalCalls}`,
    )
  }

  if (payload.documentCookieReads !== 0 || payload.documentCookieWrites !== 0) {
    throw new Error(
      `Expected no document.cookie access during SSR, got reads=${payload.documentCookieReads} writes=${payload.documentCookieWrites}`,
    )
  }

  if (payload.webSocketConstructCalls !== 0) {
    throw new Error(
      `Expected no WebSocket constructions, got ${payload.webSocketConstructCalls}`,
    )
  }

  if (
    payload.localStorageGetItemCalls !== 0 ||
    payload.localStorageSetItemCalls !== 0 ||
    payload.localStorageRemoveItemCalls !== 0
  ) {
    throw new Error(
      `Expected no Storage method calls during SSR, got get=${payload.localStorageGetItemCalls} set=${payload.localStorageSetItemCalls} remove=${payload.localStorageRemoveItemCalls}`,
    )
  }

  if (!String(payload.html).includes('ssr-ok')) {
    throw new Error(`Unexpected SSR HTML: ${payload.html}`)
  }

  if (payload.mutationObserverCalls !== 0) {
    throw new Error(
      `Expected no MutationObserver constructions, got ${payload.mutationObserverCalls}`,
    )
  }

  if (payload.resizeObserverCalls !== 0) {
    throw new Error(
      `Expected no ResizeObserver constructions, got ${payload.resizeObserverCalls}`,
    )
  }

  if (payload.animationFrameCalls !== 0) {
    throw new Error(
      `Expected no requestAnimationFrame calls, got ${payload.animationFrameCalls}`,
    )
  }

  if (payload.listenerCalls !== 0) {
    throw new Error(
      `Expected no addEventListener calls during SSR, got ${payload.listenerCalls}`,
    )
  }

  if (!String(payload.reactVersion).startsWith('18.')) {
    throw new Error(
      `Expected React 18.x in consumer, got ${payload.reactVersion}`,
    )
  }

  if (!String(payload.reactDomVersion).startsWith('18.')) {
    throw new Error(
      `Expected ReactDOM 18.x in consumer, got ${payload.reactDomVersion}`,
    )
  }

  const unexpected = [...payload.warnings, ...payload.errors].filter(
    isUnexpectedSsrMessage,
  )

  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected React 18 SSR console output:\\n${unexpected.join('\\n')}`,
    )
  }

  console.log('React 18 packed SSR consumer check passed.')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  if (consumerDir) {
    rmSync(consumerDir, { recursive: true, force: true })
  }
  if (tarballPath) {
    rmSync(tarballPath, { force: true })
  }
  // Clean any leftover pack artifact in the repo root from earlier probes.
  rmSync(resolve(repoRoot, 'muradyanvano-react-hooks-0.1.0-beta.1.tgz'), {
    force: true,
  })
}
