import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, renameSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const requireJson = createRequire(import.meta.url)

/**
 * Lightweight named-step extractor shared conceptually with
 * scripts/validate-release.mjs (no yaml dependency).
 */
function inspectPublishWorkflowOrder(publishYaml: string) {
  const steps: { name: string; run: string }[] = []
  const lines = publishYaml.split(/\r?\n/)
  let current: { name: string; run: string } | null = null
  let multilineRunIndent: number | null = null

  const pushCurrent = () => {
    if (current) {
      steps.push(current)
      current = null
    }
    multilineRunIndent = null
  }

  for (const line of lines) {
    const nameMatch = line.match(/^\s+- name:\s*(.+?)\s*$/)
    if (nameMatch?.[1]) {
      pushCurrent()
      current = { name: nameMatch[1], run: '' }
      continue
    }

    if (!current) {
      continue
    }

    if (multilineRunIndent !== null) {
      const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0
      if (line.trim() === '' || indent > multilineRunIndent) {
        current.run += `${current.run ? '\n' : ''}${line.slice(multilineRunIndent + 1)}`
        continue
      }
      multilineRunIndent = null
    }

    const blockRun = line.match(/^(\s+)run:\s*[|>][+-]?\s*$/)
    if (blockRun?.[1]) {
      multilineRunIndent = blockRun[1].length
      current.run = ''
      continue
    }

    const inlineRun = line.match(/^\s+run:\s+(.+?)\s*$/)
    if (inlineRun?.[1]) {
      current.run = inlineRun[1]
    }
  }

  pushCurrent()

  const buildLibIndexes: number[] = []
  const publishableIndexes: number[] = []
  const publishIndexes: number[] = []
  const buildLibraryNameIndexes: number[] = []

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

describe('release validation', () => {
  it('passes validate-release without a built dist tree', () => {
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

  it('requires dist when --require-publishable is set and dist is missing', () => {
    const distDir = join(root, 'dist')
    const backupDir = join(root, 'dist.validate-release-backup')
    const hadDist = existsSync(distDir)
    if (hadDist) {
      renameSync(distDir, backupDir)
    }
    try {
      const result = spawnSync(
        process.execPath,
        [join(root, 'scripts/validate-release.mjs'), '--require-publishable'],
        {
          cwd: root,
          encoding: 'utf8',
        },
      )
      expect(result.status).not.toBe(0)
      expect(result.stderr + result.stdout).toMatch(/dist\/ is missing/)
    } finally {
      if (hadDist && existsSync(backupDir)) {
        renameSync(backupDir, distDir)
      }
    }
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

  it('builds dist before publishable validation and publishes only after', () => {
    const publish = readFileSync(
      join(root, '.github/workflows/publish.yml'),
      'utf8',
    )
    expect(publish).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/i)
    expect(publish).not.toMatch(/pull_request:/)
    expect(publish).not.toMatch(/push:\s*\n\s*branches:/m)

    const {
      buildLibIndexes,
      publishableIndexes,
      publishIndexes,
      buildLibraryNameIndexes,
    } = inspectPublishWorkflowOrder(publish)

    expect(buildLibIndexes.length).toBeGreaterThan(0)
    expect(buildLibraryNameIndexes).toHaveLength(1)
    expect(publishableIndexes.length).toBeGreaterThan(0)
    expect(publishIndexes.length).toBeGreaterThan(0)

    const firstBuild = Math.min(...buildLibIndexes)
    const firstPublishable = Math.min(...publishableIndexes)
    const firstPublish = Math.min(...publishIndexes)

    expect(firstBuild).toBeLessThan(firstPublishable)
    expect(firstPublishable).toBeLessThan(firstPublish)
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
