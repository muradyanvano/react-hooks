import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Packed-consumer check: installs the real npm tarball into a temporary
 * project and verifies TypeScript declarations (bundler + NodeNext
 * resolution), Node ESM runtime import, and the exports-map boundary.
 *
 * Kept out of the default unit-test run because it installs React and
 * TypeScript into a temporary directory. Integrated into `verify:ci`.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageName = '@muradyanvano/react-hooks'
const typescriptVersion = JSON.parse(
  readFileSync(
    join(repoRoot, 'node_modules', 'typescript', 'package.json'),
    'utf8',
  ),
).version

function run(command, args, options = {}) {
  // Windows resolves `npm` / `npx` through the shell, which concatenates args.
  const shell = options.shell ?? process.platform === 'win32'
  const finalArgs = shell
    ? args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg))
    : args
  const result = spawnSync(command, finalArgs, {
    encoding: 'utf8',
    ...options,
    shell,
  })
  if (result.error || result.status !== 0) {
    if (result.error) console.error(result.error)
    if (result.stdout) console.error(result.stdout)
    if (result.stderr) console.error(result.stderr)
    throw new Error(
      `Command failed (${result.status}): ${command} ${args.join(' ')}`,
    )
  }
  return result
}

const consumerSource = `import { useRef } from 'react'
import {
  useDebounceFn,
  useElementByPoint,
  useEventBus,
  useEventListener,
  useJwt,
  useLocalStorage,
  useOnClickOutside,
  useOnKeyStroke,
  useScroll,
  useUrlSearchParams,
  useWebSocket,
  type EventBusKey,
  type UseLocalStorageReturn,
  type UseWebSocketStatus,
} from '${packageName}'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false
function assertType<T extends true>(_value?: T): void {}

const cartBus: EventBusKey<{ id: string }> = Symbol('cart')

export function App() {
  const ref = useRef<HTMLDivElement>(null)
  useOnClickOutside(ref, (event) => {
    assertType<Equal<typeof event, PointerEvent | MouseEvent>>()
  })
  useOnKeyStroke('Escape', (event) => {
    assertType<Equal<typeof event, KeyboardEvent>>()
  })
  useEventListener('resize', (event) => {
    assertType<Equal<typeof event, UIEvent>>()
  })
  useEventListener(ref, 'keydown', (event) => {
    assertType<Equal<typeof event, KeyboardEvent>>()
  })

  const theme = useLocalStorage('theme', { mode: 'light' as 'light' | 'dark' })
  assertType<Equal<typeof theme, UseLocalStorageReturn<{ mode: 'light' | 'dark' }>>>()
  theme.setValue((previous) => ({ ...previous, mode: 'dark' }))
  // @ts-expect-error value type is enforced
  theme.setValue({ mode: 'blue' })

  const jwt = useJwt<{ sub: string; role: 'admin' | 'user' }>('a.b.c')
  const role: 'admin' | 'user' | undefined = jwt.payload?.role
  void role

  const bus = useEventBus(cartBus)
  bus.emit({ id: '1' })
  // @ts-expect-error payload type is enforced
  bus.emit({ id: 1 })

  const debounced = useDebounceFn((value: string) => value.length, 200)
  const pending: Promise<number | undefined> = debounced.run('abc')
  void pending
  // @ts-expect-error argument type is enforced
  void debounced.run(1)

  const socket = useWebSocket<string>('wss://example.test')
  const status: UseWebSocketStatus = socket.status
  const data: string | null = socket.data
  void status
  void data

  const point = useElementByPoint({ x: 0, y: 0, multiple: true })
  const elements: readonly Element[] = point.element
  void elements

  const scroll = useScroll(ref)
  const y: number = scroll.y
  void y

  const search = useUrlSearchParams('history')
  void search.params

  return <div ref={ref}>consumer</div>
}
`

function tsconfig(moduleKind, moduleResolution) {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: moduleKind,
        moduleResolution,
        jsx: 'react-jsx',
        strict: true,
        exactOptionalPropertyTypes: true,
        noUncheckedIndexedAccess: true,
        noEmit: true,
        skipLibCheck: false,
      },
      files: ['consumer.tsx'],
    },
    null,
    2,
  )
}

const runtimeCheck = `import { createRequire } from 'node:module'
import * as entry from '${packageName}'

const keys = Object.keys(entry)
if (keys.length === 0 || 'default' in entry) {
  throw new Error('unexpected ESM entry shape: ' + keys.join(','))
}
for (const key of keys) {
  if (!key.startsWith('use') || typeof entry[key] !== 'function') {
    throw new Error('unexpected runtime export: ' + key)
  }
}

const require = createRequire(import.meta.url)
const pkg = require('${packageName}/package.json')
if (pkg.name !== '${packageName}') throw new Error('package.json subpath export broken')

async function expectBlocked(specifier) {
  try {
    await import(specifier)
  } catch (error) {
    if (error && error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') return
    throw error
  }
  throw new Error('deep import should be blocked by exports: ' + specifier)
}
await expectBlocked('${packageName}/dist/index.js')
await expectBlocked('${packageName}/src/index.ts')

console.log(JSON.stringify({ exports: keys.length }))
`

let consumerDir = null

try {
  console.log('Building library for packed consumer check...')
  run('npm', ['run', 'build:lib'], { cwd: repoRoot })

  consumerDir = mkdtempSync(join(tmpdir(), 'react-hooks-consumer-'))

  console.log('Packing library tarball...')
  const pack = run(
    'npm',
    ['pack', '--json', '--pack-destination', consumerDir],
    {
      cwd: repoRoot,
    },
  )
  const packJson = JSON.parse(pack.stdout)
  const packEntry = Array.isArray(packJson) ? packJson[0] : packJson
  if (packEntry?.filename == null) {
    throw new Error('npm pack --json did not return a filename')
  }
  console.log(`Tarball: ${packEntry.filename}`)

  writeFileSync(
    join(consumerDir, 'package.json'),
    JSON.stringify(
      { name: 'react-hooks-consumer', private: true, type: 'module' },
      null,
      2,
    ),
  )

  console.log(
    `Installing packed package, React 19, and TypeScript ${typescriptVersion}...`,
  )
  run(
    'npm',
    [
      'install',
      '--no-audit',
      '--no-fund',
      `./${packEntry.filename}`,
      'react@19',
      'react-dom@19',
      '@types/react@19',
      '@types/react-dom@19',
      `typescript@${typescriptVersion}`,
    ],
    { cwd: consumerDir },
  )

  writeFileSync(join(consumerDir, 'consumer.tsx'), consumerSource)
  writeFileSync(
    join(consumerDir, 'tsconfig.bundler.json'),
    tsconfig('ESNext', 'Bundler'),
  )
  writeFileSync(
    join(consumerDir, 'tsconfig.nodenext.json'),
    tsconfig('NodeNext', 'NodeNext'),
  )

  for (const project of ['tsconfig.bundler.json', 'tsconfig.nodenext.json']) {
    console.log(`Typechecking consumer with ${project}...`)
    run('npx', ['tsc', '-p', project], { cwd: consumerDir })
  }

  writeFileSync(join(consumerDir, 'runtime-check.mjs'), runtimeCheck)
  console.log('Importing package through Node ESM resolution...')
  const runtime = run(process.execPath, ['runtime-check.mjs'], {
    cwd: consumerDir,
    shell: false,
  })
  console.log(runtime.stdout.trim())

  console.log('Packed consumer check passed.')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  if (consumerDir) {
    rmSync(consumerDir, { recursive: true, force: true })
  }
}
