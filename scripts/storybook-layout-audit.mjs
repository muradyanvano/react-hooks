import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

/**
 * Static Storybook layout audit over HTTP (file:// hangs on many stories).
 *
 * Discovers public hook stories from `storybook-static/index.json`.
 * Stories tagged `layout-audit-skip` are reported as intentional exclusions.
 *
 * Prerequisite: `npm run build:storybook`
 *
 * Optional env:
 *   LAYOUT_AUDIT_CONCURRENCY=4
 *   LAYOUT_AUDIT_LIMIT=50
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const staticDir = resolve(repoRoot, 'storybook-static')
const indexPath = resolve(staticDir, 'index.json')

const VIEWPORTS = [
  { name: '320x568', width: 320, height: 568 },
  { name: '375x812', width: 375, height: 812 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
]

const LAYOUT_AUDIT_SKIP_TAG = 'layout-audit-skip'
const STORY_TIMEOUT_MS = 15_000
const CONCURRENCY = Number(process.env.LAYOUT_AUDIT_CONCURRENCY ?? 4)
const LIMIT = process.env.LAYOUT_AUDIT_LIMIT
  ? Number(process.env.LAYOUT_AUDIT_LIMIT)
  : null

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

function isPublicHookStory(entry, storyId) {
  if (entry == null || typeof entry !== 'object') return false
  if (entry.type && entry.type !== 'story') return false
  const title = entry.title ?? ''
  if (title.startsWith('Internal/')) return false
  const isHookTitle = title.startsWith('Hooks/') || /^use[A-Z]/.test(title)
  if (!isHookTitle) return false
  if (storyId.endsWith('--documentation') || storyId.endsWith('--docs')) {
    return false
  }
  return true
}

function hasSkipTag(entry) {
  const tags = Array.isArray(entry.tags) ? entry.tags : []
  return tags.includes(LAYOUT_AUDIT_SKIP_TAG)
}

function loadStories() {
  if (!existsSync(indexPath)) {
    throw new Error(
      `Missing ${indexPath}. Run \`npm run build:storybook\` before \`npm run test:layout\`.`,
    )
  }

  const index = JSON.parse(readFileSync(indexPath, 'utf8'))
  const entries = index.entries ?? index.stories ?? index
  const audited = []
  const excluded = []

  for (const [storyId, entry] of Object.entries(entries)) {
    if (!isPublicHookStory(entry, storyId)) continue
    const item = {
      storyId,
      title: entry.title ?? '',
      name: entry.name ?? storyId,
      tags: entry.tags ?? [],
    }
    if (hasSkipTag(entry)) {
      excluded.push(item)
    } else {
      audited.push(item)
    }
  }

  audited.sort((a, b) => a.storyId.localeCompare(b.storyId))
  excluded.sort((a, b) => a.storyId.localeCompare(b.storyId))

  return {
    audited: LIMIT == null ? audited : audited.slice(0, LIMIT),
    excluded,
    totalPublic: audited.length + excluded.length,
  }
}

function startStaticServer() {
  return new Promise((resolveServer, reject) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
        let pathname = decodeURIComponent(url.pathname)
        if (pathname.endsWith('/')) pathname += 'index.html'
        const filePath = join(staticDir, pathname.replace(/^\//, ''))
        if (!filePath.startsWith(staticDir) || !existsSync(filePath)) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        if (statSync(filePath).isDirectory()) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        const ext = extname(filePath)
        res.writeHead(200, {
          'Content-Type': MIME[ext] ?? 'application/octet-stream',
        })
        res.end(readFileSync(filePath))
      } catch (error) {
        res.writeHead(500)
        res.end(String(error))
      }
    })

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address == null || typeof address === 'string') {
        reject(new Error('Failed to bind layout audit server'))
        return
      }
      resolveServer({
        server,
        origin: `http://127.0.0.1:${address.port}`,
      })
    })
  })
}

async function assertNoHorizontalOverflow(page) {
  return page.evaluate(() => {
    const docEl = document.documentElement
    const viewportWidth = docEl.clientWidth
    if (docEl.scrollWidth > viewportWidth) {
      return {
        ok: false,
        message: `scrollWidth ${docEl.scrollWidth} > clientWidth ${viewportWidth}`,
      }
    }

    const offenders = []
    const nodes = document.body.querySelectorAll(
      '[data-showcase], [data-testid="stress-status-panel"]',
    )
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue
      if (node.closest('[data-allow-h-scroll]')) continue
      const rect = node.getBoundingClientRect()
      if (rect.width > 0 && rect.right > viewportWidth + 1) {
        offenders.push(
          `<${node.tagName.toLowerCase()}> right=${Math.round(rect.right)}px`,
        )
      }
    }

    if (offenders.length > 0) {
      return {
        ok: false,
        message: `showcase escaped viewport: ${offenders.slice(0, 3).join('; ')}`,
      }
    }

    return { ok: true }
  })
}

const IGNORE_ERROR_PATTERNS = [
  /WebSocket connection to ['"]?wss:\/\/storybook\.example/i,
  /net::ERR_NAME_NOT_RESOLVED/i,
  /Unable to find/i,
  /getElementError/i,
  /Ignoring error/i,
  /Expected.*Received/i,
  /toHaveTextContent/i,
  /expect\(/i,
  /\bat play \(/i,
  /ResizeObserver loop/i,
]

function isIgnorableError(message) {
  return IGNORE_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

async function waitForStableIdle(page) {
  await page.waitForSelector('#storybook-root', {
    state: 'attached',
    timeout: STORY_TIMEOUT_MS,
  })
  // Prefer post-play remount (generation > 0). Fall back to painted showcase.
  await page
    .waitForFunction(
      () => {
        const root = document.querySelector('#storybook-root')
        if (root == null || root.childElementCount === 0) return false
        if (document.querySelector('[data-testid="seed-loading"]')) return false
        const gen = document.querySelector('[data-story-reset-generation]')
        if (gen != null) {
          const value = gen.getAttribute('data-story-reset-generation')
          if (value != null && value !== '0') return true
        }
        return Boolean(
          root.querySelector('[data-showcase], button, input, textarea'),
        )
      },
      { timeout: STORY_TIMEOUT_MS },
    )
    .catch(() => undefined)
  await page.waitForTimeout(100)
}

async function auditStory(page, origin, story, failures) {
  const pageErrors = []
  const onPageError = (error) => {
    pageErrors.push(error instanceof Error ? error.message : String(error))
  }
  const onConsole = (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(msg.text())
    }
  }

  page.on('pageerror', onPageError)
  page.on('console', onConsole)

  try {
    for (const viewport of VIEWPORTS) {
      pageErrors.length = 0
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })

      const url = `${origin}/iframe.html?id=${encodeURIComponent(story.storyId)}&viewMode=story&layoutAudit=1`
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: STORY_TIMEOUT_MS,
        })
        await waitForStableIdle(page)
        // Discard play-phase assertion / mock-bootstrap noise collected during settle.
        pageErrors.length = 0
        await page.waitForTimeout(50)
      } catch (error) {
        failures.push({
          storyId: story.storyId,
          title: story.title,
          viewport: viewport.name,
          message: `Navigation/idle timeout: ${error instanceof Error ? error.message : String(error)}`,
        })
        continue
      }

      const unexpected = pageErrors.filter(
        (message) => !isIgnorableError(message),
      )
      if (unexpected.length > 0) {
        failures.push({
          storyId: story.storyId,
          title: story.title,
          viewport: viewport.name,
          message: `Console/page error: ${unexpected.slice(0, 2).join(' | ')}`,
        })
        continue
      }

      const result = await assertNoHorizontalOverflow(page)
      if (!result.ok) {
        failures.push({
          storyId: story.storyId,
          title: story.title,
          viewport: viewport.name,
          message: result.message,
        })
      }
    }
  } finally {
    page.off('pageerror', onPageError)
    page.off('console', onConsole)
  }
}

async function mapPool(items, concurrency, worker) {
  const results = []
  let index = 0

  async function run() {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await worker(items[current], current)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  )
  return results
}

const { audited: stories, excluded, totalPublic } = loadStories()
console.log(
  `Public hook stories: ${totalPublic} (auditing ${stories.length}, intentionally excluded ${excluded.length})`,
)
if (excluded.length > 0) {
  console.log('Intentional exclusions (tag: layout-audit-skip):')
  for (const item of excluded) {
    console.log(`  - ${item.storyId}`)
  }
}
console.log(
  `Auditing at ${VIEWPORTS.length} viewports (concurrency=${CONCURRENCY})…`,
)

let server
let origin
let browser
const failures = []

try {
  ;({ server, origin } = await startStaticServer())
  browser = await chromium.launch({ headless: true })

  await mapPool(stories, CONCURRENCY, async (story, i) => {
    const page = await browser.newPage()
    try {
      process.stdout.write(`[${i + 1}/${stories.length}] ${story.storyId}\n`)
      await auditStory(page, origin, story, failures)
    } finally {
      await page.close()
    }
  })
} finally {
  if (browser) {
    await browser.close().catch(() => undefined)
  }
  if (server) {
    await new Promise((resolveClose) => server.close(resolveClose))
  }
}

if (failures.length > 0) {
  console.error('\nStorybook layout audit failures:\n')
  for (const failure of failures) {
    console.error(
      `- ${failure.storyId} (${failure.title}) @ ${failure.viewport}: ${failure.message}`,
    )
  }
  console.error(
    `\n${failures.length} failure(s) across ${stories.length} audited stories.`,
  )
  process.exitCode = 1
} else {
  console.log(
    `\nStorybook layout audit passed (${stories.length} stories audited, ${excluded.length} excluded).`,
  )
}
