import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const requireJson = createRequire(import.meta.url)

describe('release validation', () => {
  it('passes validate-release for the current package metadata', () => {
    const result = spawnSync(
      process.execPath,
      [join(root, 'scripts/validate-release.mjs')],
      {
        cwd: root,
        encoding: 'utf8',
      },
    )
    expect(result.status, result.stderr || result.stdout).toBe(0)
    expect(result.stdout).toContain('validate-release: ok')
  }, 30_000)

  it('rejects a mismatched release tag', () => {
    const result = spawnSync(
      process.execPath,
      [join(root, 'scripts/validate-release.mjs'), '--require-tag'],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          RELEASE_TAG: 'v0.0.0-mismatch',
        },
      },
    )
    expect(result.status).not.toBe(0)
    expect(result.stderr + result.stdout).toMatch(
      /does not match package version/,
    )
  }, 30_000)

  it('keeps package public-scoped and non-private', () => {
    const pkg = requireJson(join(root, 'package.json')) as {
      name: string
      private?: boolean
      publishConfig?: { access?: string }
    }
    expect(pkg.name).toBe('@muradyanvano/react-hooks')
    expect(pkg.private).not.toBe(true)
    expect(pkg.publishConfig?.access).toBe('public')
  })

  it('does not reference npm tokens in workflows', () => {
    const workflows = ['ci.yml', 'layout-audit.yml', 'pages.yml', 'publish.yml']
    for (const name of workflows) {
      const text = readFileSync(join(root, '.github/workflows', name), 'utf8')
      expect(text).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/i)
    }
  })

  it('publishes only from stable GitHub Releases', () => {
    const publish = readFileSync(
      join(root, '.github/workflows/publish.yml'),
      'utf8',
    )
    expect(publish).toMatch(/release:\s*\n\s*types:\s*\n\s*-\s*published/m)
    expect(publish).toMatch(/github\.event\.release\.prerelease == false/)
    expect(publish).not.toMatch(/pull_request:/)
    expect(publish).not.toMatch(/push:\s*\n\s*branches:/m)
  })

  it('keeps Pages artifact rooted at storybook-static with index.html check', () => {
    const pages = readFileSync(
      join(root, '.github/workflows/pages.yml'),
      'utf8',
    )
    expect(pages).toMatch(/path:\s*storybook-static/)
    expect(pages).toMatch(/storybook-static\/index\.html/)
    expect(pages).not.toMatch(/pull_request:/)
  })
})
