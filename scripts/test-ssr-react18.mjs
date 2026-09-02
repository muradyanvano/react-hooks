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
} from '@muradyanvano/react-hooks'

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
  return createElement('div', { ref, 'data-focus-api': 'ready' }, 'ssr-ok')
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

let html = ''
let renderError = null
let postRenderFocusError = null
let postRenderBlurError = null
try {
  html = renderToString(createElement(TestComponent))
  renderToString(createElement(CaptureFocusApi))
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
  if (previousAdd) {
    EventTarget.prototype.addEventListener = previousAdd
  }
}

console.log(
  JSON.stringify({
    reactVersion: reactPkg.version,
    reactDomVersion: reactDomPkg.version,
    html,
    mutationObserverCalls,
    listenerCalls,
    warnings,
    errors,
    renderError,
    postRenderFocusError,
    postRenderBlurError,
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

  if (!String(payload.html).includes('ssr-ok')) {
    throw new Error(`Unexpected SSR HTML: ${payload.html}`)
  }

  if (payload.mutationObserverCalls !== 0) {
    throw new Error(
      `Expected no MutationObserver constructions, got ${payload.mutationObserverCalls}`,
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
