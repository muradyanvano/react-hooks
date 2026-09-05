#!/usr/bin/env node
/**
 * Release and package safety checks for @muradyanvano/react-hooks.
 * No network calls required for local validation (except optional --check-registry).
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const ALLOWED_TARBALL_PATHS = new Set([
  'package.json',
  'LICENSE',
  'README.md',
  'CHANGELOG.md',
])

const ALLOWED_TARBALL_PREFIXES = ['dist/']

const FORBIDDEN_TARBALL_SUBSTRINGS = [
  'storybook',
  '.storybook',
  'src/stories',
  'src/hooks',
  'tailwind',
  'vitest',
  '.test.',
  '.type-test.',
  'mock',
  '.ai/',
  'coverage/',
  'node_modules/',
]

const FORBIDDEN_WORKFLOW_TOKEN_PATTERNS = [
  /NPM_TOKEN/i,
  /NODE_AUTH_TOKEN/,
  /npm_token/i,
]

const EXPECTED_EXPORT_KEYS = [
  'useBase64',
  'useCookies',
  'useDebounceFn',
  'useDevicesList',
  'useDisplayMedia',
  'useElementByPoint',
  'useElementHover',
  'useEventBus',
  'useEventListener',
  'useEyeDropper',
  'useFavicon',
  'useFocus',
  'useFocusWithin',
  'useFullscreen',
  'useInfiniteScroll',
  'useJwt',
  'useLocalStorage',
  'useMouse',
  'useMousePressed',
  'useNProgress',
  'useOnClickOutside',
  'useOnElementRemoval',
  'useOnKeyStroke',
  'useOnLongPress',
  'useOnStartTyping',
  'usePageLeave',
  'useParallax',
  'useQRCode',
  'useScroll',
  'useScrollLock',
  'useSessionStorage',
  'useTextSelection',
  'useUrlSearchParams',
  'useUserMedia',
  'useWebSocket',
]

function fail(message) {
  console.error(`validate-release: ${message}`)
  process.exitCode = 1
}

function readPackageJson() {
  return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
}

function parseArgs(argv) {
  return {
    requireTag: argv.includes('--require-tag'),
    requirePublishable: argv.includes('--require-publishable'),
    checkRegistry: argv.includes('--check-registry'),
    tag: process.env.RELEASE_TAG || null,
  }
}

function assertPackageMetadata(pkg, { requirePublishable }) {
  if (pkg.name !== '@muradyanvano/react-hooks') {
    fail(`unexpected package name: ${pkg.name}`)
  }
  if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
    fail('package.json version is missing')
  }
  if (pkg.private === true) {
    fail('package.json must not set private: true for a public release')
  }
  if (
    requirePublishable &&
    Object.hasOwn(pkg, 'private') &&
    pkg.private !== false
  ) {
    fail('package.json private field must be absent or false when publishing')
  }
  if (pkg.publishConfig?.access !== 'public') {
    fail('publishConfig.access must be "public"')
  }
  if (pkg.type !== 'module') {
    fail('package must remain ESM-only (type: module)')
  }
  if (pkg.exports?.['.']?.import !== './dist/index.js') {
    fail('root export import path must be ./dist/index.js')
  }
  const exportKeys = Object.keys(pkg.exports || {}).sort()
  if (
    exportKeys.length !== 2 ||
    exportKeys[0] !== '.' ||
    exportKeys[1] !== './package.json'
  ) {
    fail(`unexpected package exports map keys: ${exportKeys.join(', ')}`)
  }
  if (
    pkg.dependencies &&
    Object.keys(pkg.dependencies).sort().join(',') !== 'qrcode'
  ) {
    fail('runtime dependencies must be exactly qrcode')
  }
  if (!pkg.peerDependencies?.react) {
    fail('react peerDependency is required')
  }
}

function assertTagMatchesVersion(pkg, tag) {
  if (!tag) {
    fail('RELEASE_TAG is required with --require-tag')
    return
  }
  const expected = `v${pkg.version}`
  if (tag !== expected) {
    fail(
      `release tag ${tag} does not match package version (expected ${expected})`,
    )
  }
}

function listFilesRecursive(dir, base = dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = relative(base, full).split(sep).join('/')
    if (statSync(full).isDirectory()) {
      listFilesRecursive(full, base, acc)
    } else {
      acc.push(rel)
    }
  }
  return acc
}

function assertDistAllowlist({ requirePublishable }) {
  const distDir = join(root, 'dist')
  if (!existsSync(distDir)) {
    // Unit tests run before build:lib in `npm run verify`; only publishable
    // / post-build validation requires a built dist tree.
    if (requirePublishable) {
      fail(
        'dist/ is missing; run npm run build:lib before publishable validation',
      )
    } else {
      console.log(
        'validate-release: dist/ absent; skipping dist allowlist (ok before build)',
      )
    }
    return
  }
  const files = listFilesRecursive(distDir)
  for (const file of files) {
    const lower = file.toLowerCase()
    if (
      lower.includes('storybook') ||
      lower.includes('tailwind') ||
      lower.includes('.test.') ||
      lower.includes('src/stories')
    ) {
      fail(`forbidden path in dist/: ${file}`)
    }
  }
  const unexpected = files.filter(
    (file) =>
      file !== 'index.js' && file !== 'index.js.map' && file !== 'index.d.ts',
  )
  if (unexpected.length > 0) {
    fail(`unexpected files in dist/: ${unexpected.join(', ')}`)
  }
}

function assertTarballListing(pkg, { requirePublishable }) {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: root,
    encoding: 'utf8',
    // Windows resolves npm via PATHEXT only when shell is enabled.
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    fail(`npm pack --dry-run failed: ${result.stderr || result.stdout}`)
    return
  }
  let parsed
  try {
    parsed = JSON.parse(result.stdout)
  } catch {
    fail('could not parse npm pack --dry-run --json output')
    return
  }
  const listing = Array.isArray(parsed) ? parsed[0] : parsed
  const files = listing?.files?.map((file) => file.path || file) ?? []
  if (files.length === 0) {
    fail('npm pack listing contained no files')
    return
  }
  const normalizedFiles = []
  for (const file of files) {
    const normalized = String(file)
      .replace(/\\/g, '/')
      .replace(/^package\//, '')
    normalizedFiles.push(normalized)
    const allowed =
      ALLOWED_TARBALL_PATHS.has(normalized) ||
      ALLOWED_TARBALL_PREFIXES.some((prefix) => normalized.startsWith(prefix))
    if (!allowed) {
      fail(`tarball contains non-allowlisted path: ${normalized}`)
    }
    for (const forbidden of FORBIDDEN_TARBALL_SUBSTRINGS) {
      if (
        normalized !== 'README.md' &&
        normalized !== 'CHANGELOG.md' &&
        normalized.toLowerCase().includes(forbidden)
      ) {
        fail(
          `tarball path looks like forbidden content (${forbidden}): ${normalized}`,
        )
      }
    }
  }
  if (requirePublishable) {
    for (const required of ['dist/index.js', 'dist/index.d.ts']) {
      if (!normalizedFiles.includes(required)) {
        fail(`publishable tarball is missing required file: ${required}`)
      }
    }
  }
}

/**
 * Lightweight named-step extractor for GitHub Actions workflow YAML.
 * Avoids a yaml dependency; sufficient for ordered `run:` step inspection.
 */
function extractGithubWorkflowNamedSteps(yamlText) {
  const steps = []
  const lines = yamlText.split(/\r?\n/)
  let current = null
  let multilineRunIndent = null

  const pushCurrent = () => {
    if (current) {
      steps.push(current)
      current = null
    }
    multilineRunIndent = null
  }

  for (const line of lines) {
    const nameMatch = line.match(/^\s+- name:\s*(.+?)\s*$/)
    if (nameMatch) {
      pushCurrent()
      current = { name: nameMatch[1], run: '' }
      continue
    }

    if (!current) {
      continue
    }

    if (multilineRunIndent !== null) {
      const indentMatch = line.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1].length : 0
      if (line.trim() === '' || indent > multilineRunIndent) {
        current.run += `${current.run ? '\n' : ''}${line.slice(multilineRunIndent + 1)}`
        continue
      }
      multilineRunIndent = null
    }

    const blockRun = line.match(/^(\s+)run:\s*[|>][+-]?\s*$/)
    if (blockRun) {
      multilineRunIndent = blockRun[1].length
      current.run = ''
      continue
    }

    const inlineRun = line.match(/^\s+run:\s+(.+?)\s*$/)
    if (inlineRun) {
      current.run = inlineRun[1]
    }
  }

  pushCurrent()
  return steps
}

function inspectPublishWorkflowOrder(publishYaml) {
  const steps = extractGithubWorkflowNamedSteps(publishYaml)
  const buildLibIndexes = []
  const publishableIndexes = []
  const publishIndexes = []
  const buildLibraryNameIndexes = []

  steps.forEach((step, index) => {
    if (step.name === 'Build library') {
      buildLibraryNameIndexes.push(index)
    }
    if (/(?:^|[\s&;|])npm run build:lib(?:$|[\s&;|])/.test(step.run)) {
      buildLibIndexes.push(index)
    }
    if (/(?:^|[\s])--require-publishable(?:$|[\s])/.test(step.run)) {
      publishableIndexes.push(index)
    }
    if (/(?:^|[\s&;|])npm publish(?:$|[\s&;|])/.test(step.run)) {
      publishIndexes.push(index)
    }
  })

  return {
    steps,
    buildLibIndexes,
    publishableIndexes,
    publishIndexes,
    buildLibraryNameIndexes,
  }
}

function assertPublishWorkflowOrder(publish) {
  const {
    buildLibIndexes,
    publishableIndexes,
    publishIndexes,
    buildLibraryNameIndexes,
  } = inspectPublishWorkflowOrder(publish)

  if (buildLibIndexes.length === 0) {
    fail('publish.yml must run npm run build:lib before publishable validation')
  }
  if (buildLibraryNameIndexes.length !== 1) {
    fail(
      `publish.yml must contain exactly one standalone "Build library" step (found ${buildLibraryNameIndexes.length})`,
    )
  }
  if (publishableIndexes.length === 0) {
    fail('publish.yml must run validate-release with --require-publishable')
  }
  if (publishIndexes.length === 0) {
    fail('publish.yml must include an npm publish step')
  }

  const firstBuild = Math.min(...buildLibIndexes)
  const firstPublishable = Math.min(...publishableIndexes)
  const firstPublish = Math.min(...publishIndexes)

  if (firstPublishable < firstBuild) {
    fail(
      'publish.yml must build dist (npm run build:lib) before --require-publishable validation',
    )
  }
  if (firstPublish < firstPublishable) {
    fail('publish.yml must not publish before --require-publishable validation')
  }
}

function assertWorkflowSafety() {
  const workflowsDir = join(root, '.github', 'workflows')
  if (!existsSync(workflowsDir)) {
    fail('.github/workflows is missing')
    return
  }
  const files = readdirSync(workflowsDir).filter((name) =>
    /\.ya?ml$/i.test(name),
  )
  for (const name of files) {
    const text = readFileSync(join(workflowsDir, name), 'utf8')
    for (const pattern of FORBIDDEN_WORKFLOW_TOKEN_PATTERNS) {
      if (pattern.test(text)) {
        fail(`workflow ${name} references forbidden token pattern ${pattern}`)
      }
    }
  }

  const publishPath = join(workflowsDir, 'publish.yml')
  if (!existsSync(publishPath)) {
    fail('publish.yml is missing')
    return
  }
  const publish = readFileSync(publishPath, 'utf8')
  if (!/release:\s*\n\s*types:\s*\n\s*-\s*published/m.test(publish)) {
    fail('publish.yml must trigger only on release published')
  }
  if (
    /pull_request:/.test(publish) ||
    /push:\s*\n\s*branches:/m.test(publish)
  ) {
    fail('publish.yml must not run on pull_request or ordinary branch pushes')
  }
  if (!/id-token:\s*write/.test(publish)) {
    fail('publish.yml must request id-token: write for Trusted Publishing')
  }
  if (!/environment:\s*npm/.test(publish)) {
    fail('publish.yml must use the npm environment')
  }
  assertPublishWorkflowOrder(publish)

  const pagesPath = join(workflowsDir, 'pages.yml')
  if (existsSync(pagesPath)) {
    const pages = readFileSync(pagesPath, 'utf8')
    if (/pull_request:/.test(pages)) {
      fail('pages.yml must not deploy pull requests')
    }
    if (!/path:\s*storybook-static/.test(pages)) {
      fail('pages.yml must upload storybook-static')
    }
  }

  const ciPath = join(workflowsDir, 'ci.yml')
  if (existsSync(ciPath)) {
    const ci = readFileSync(ciPath, 'utf8')
    if (/npm publish/.test(ci)) {
      fail('ci.yml must not publish to npm')
    }
  }
}

function assertPublicExportsFromSource({ requirePublishable }) {
  const indexSource = readFileSync(join(root, 'src', 'index.ts'), 'utf8')
  if (/export\s+default/.test(indexSource)) {
    fail('src/index.ts must not have a default export')
  }
  const distEntry = join(root, 'dist', 'index.js')
  if (!existsSync(distEntry)) {
    if (requirePublishable) {
      fail(
        'dist/index.js is missing; run npm run build:lib before publishable validation',
      )
    }
    return
  }
  const distUrl = pathToFileURL(distEntry).href
  const mod = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import * as entry from ${JSON.stringify(distUrl)}; const keys = Object.keys(entry).sort(); console.log(JSON.stringify(keys)); if ('default' in entry) process.exit(2)`,
    ],
    { encoding: 'utf8' },
  )
  if (mod.status === 2) {
    fail('dist/index.js must not expose a default export')
  } else if (mod.status !== 0) {
    fail(`failed to import dist/index.js: ${mod.stderr || mod.stdout}`)
  } else {
    const keys = JSON.parse(mod.stdout.trim())
    if (JSON.stringify(keys) !== JSON.stringify(EXPECTED_EXPORT_KEYS)) {
      fail(
        `public export keys changed unexpectedly.\nexpected: ${EXPECTED_EXPORT_KEYS.join(', ')}\nactual: ${keys.join(', ')}`,
      )
    }
  }
}

function assertPagesArtifactHint() {
  const storybookIndex = join(root, 'storybook-static', 'index.html')
  if (existsSync(storybookIndex)) {
    const html = readFileSync(storybookIndex, 'utf8')
    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      fail('storybook-static/index.html does not look like an HTML document')
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const pkg = readPackageJson()

  console.log(`validate-release: ${pkg.name}@${pkg.version}`)
  assertPackageMetadata(pkg, options)
  if (options.requireTag) {
    assertTagMatchesVersion(pkg, options.tag)
  }
  assertDistAllowlist(options)
  assertTarballListing(pkg, options)
  assertWorkflowSafety()
  assertPublicExportsFromSource(options)
  assertPagesArtifactHint()

  if (process.exitCode) {
    process.exit(process.exitCode)
  }
  console.log('validate-release: ok')
}

main()
