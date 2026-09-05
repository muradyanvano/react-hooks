import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const requireJson = createRequire(import.meta.url)

describe('package version display sync', () => {
  const pkg = requireJson(join(root, 'package.json')) as {
    name: string
    version: string
  }
  const lock = requireJson(join(root, 'package-lock.json')) as {
    version: string
    packages?: { '': { version?: string } }
  }

  it('keeps package.json and package-lock root versions aligned', () => {
    expect(pkg.version).toBe(lock.version)
    expect(lock.packages?.['']?.version).toBe(pkg.version)
  })

  it('keeps a Storybook-only packageMetadata helper sourced from package.json', () => {
    const metadata = readFileSync(
      join(root, 'src/stories/docs/packageMetadata.ts'),
      'utf8',
    )
    expect(metadata).toMatch(
      /from ['"]\.\.\/\.\.\/\.\.\/package\.json['"].*with\s*\{\s*type:\s*['"]json['"]\s*\}/,
    )
    expect(metadata).toMatch(/export const PACKAGE_NAME = packageJson\.name/)
    expect(metadata).toMatch(
      /export const PACKAGE_VERSION = packageJson\.version/,
    )
    expect(metadata).toMatch(
      /PACKAGE_STATUS_LABEL = `\$\{PACKAGE_VERSION\} · stable`/,
    )
    expect(metadata).toMatch(
      /PACKAGE_INSTALL_COMMAND = `npm install \$\{PACKAGE_NAME\}`/,
    )
  })

  it('renders Storybook version badges from packageMetadata, not hardcoded versions', () => {
    const introduction = readFileSync(
      join(root, 'src/stories/docs/IntroductionPage.tsx'),
      'utf8',
    )
    const hookDocs = readFileSync(
      join(root, 'src/stories/docs/HookDocumentationPage.tsx'),
      'utf8',
    )
    const gettingStarted = readFileSync(
      join(root, 'src/stories/GettingStarted.mdx'),
      'utf8',
    )

    for (const source of [introduction, hookDocs, gettingStarted]) {
      expect(source).toMatch(/packageMetadata/)
      expect(source).not.toMatch(/\b\d+\.\d+\.\d+ · stable\b/)
      expect(source).not.toMatch(/@muradyanvano\/react-hooks@\d+\.\d+\.\d+/)
    }

    expect(introduction).toMatch(/PACKAGE_STATUS_LABEL/)
    expect(hookDocs).toMatch(/PACKAGE_STATUS_LABEL/)
    expect(hookDocs).toMatch(/PACKAGE_INSTALL_COMMAND/)
    expect(gettingStarted).toMatch(/PACKAGE_INSTALL_COMMAND/)
  })

  it('keeps README version badge synced to package.json, not the npm registry', () => {
    const readme = readFileSync(join(root, 'README.md'), 'utf8')
    expect(readme).toMatch(/npm install @muradyanvano\/react-hooks/)
    expect(readme).not.toMatch(/@muradyanvano\/react-hooks@\d+\.\d+\.\d+/)
    expect(readme).not.toMatch(/current version:\s*\d+\.\d+\.\d+/i)
    // Registry badge lags until publish; use GitHub package.json version instead.
    expect(readme).not.toMatch(
      /img\.shields\.io\/npm\/v\/@muradyanvano\/react-hooks/,
    )
    expect(readme).toMatch(
      /img\.shields\.io\/github\/package-json\/v\/muradyanvano1995\/react-hooks\?label=npm/,
    )
  })

  it('keeps docs public-api status aligned with package.json', () => {
    const publicApi = readFileSync(join(root, 'docs/public-api.md'), 'utf8')
    expect(publicApi).toContain(`Status: stable \`${pkg.version}\``)
    expect(publicApi).toContain(`Stable \`${pkg.version}\` public API`)
  })

  it('does not ship Storybook packageMetadata through the library entry', () => {
    const indexSource = readFileSync(join(root, 'src/index.ts'), 'utf8')
    expect(indexSource).not.toMatch(/packageMetadata|PACKAGE_VERSION/)
  })
})
