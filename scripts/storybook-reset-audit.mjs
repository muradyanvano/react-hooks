import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

/**
 * Browser-level proof that resetAfterPlayDecorator remounts representative
 * public stories after play (and the intentional errored internal fixture).
 *
 * Prerequisite: `npm run build:storybook`
 *
 * Optional: RESET_AUDIT_LIMIT=3 for smoke.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const staticDir = resolve(repoRoot, 'storybook-static')

const STORY_TIMEOUT_MS = 45_000
const LIMIT = process.env.RESET_AUDIT_LIMIT
  ? Number(process.env.RESET_AUDIT_LIMIT)
  : null

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

/** Representative matrix: category → story id + idle assertion. */
const MATRIX = [
  {
    category: 'Debounced timers',
    storyId: 'hooks-usedebouncefn--overview',
    idle: async (page) => {
      await page.locator('#debounce-search').waitFor({ state: 'visible' })
      await page.getByTestId('debounce-pending').waitFor({ state: 'attached' })
    },
  },
  {
    category: 'Scroll ownership',
    storyId: 'hooks-usescrolllock--overview',
    idle: async (page) => {
      await page.getByRole('button', { name: /lock/i }).first().waitFor()
    },
  },
  {
    category: 'Dialog/popover',
    storyId: 'hooks-useonclickoutside--overview',
    idle: async (page) => {
      await page.getByTestId('overview-panel').waitFor({ state: 'visible' })
    },
  },
  {
    category: 'Local persistence',
    storyId: 'hooks-uselocalstorage--overview',
    idle: async (page) => {
      await page
        .getByText(/saved locally/i)
        .first()
        .waitFor({ state: 'attached' })
    },
  },
  {
    category: 'Session persistence',
    storyId: 'hooks-usesessionstorage--overview',
    idle: async (page) => {
      await page
        .getByText(/saved for this tab/i)
        .first()
        .waitFor({
          state: 'attached',
        })
    },
  },
  {
    category: 'Cookies',
    storyId: 'hooks-usecookies--overview',
    idle: async (page) => {
      await page.getByRole('button', { name: /reset/i }).first().waitFor()
    },
  },
  {
    category: 'Media mock',
    storyId: 'hooks-useusermedia--overview',
    idle: async (page) => {
      await page.getByRole('button', { name: /start/i }).first().waitFor()
    },
  },
  {
    category: 'Display stream mock',
    storyId: 'hooks-usedisplaymedia--overview',
    idle: async (page) => {
      await page
        .getByRole('button', { name: /start|share/i })
        .first()
        .waitFor()
    },
  },
  {
    category: 'WebSocket mock',
    storyId: 'hooks-usewebsocket--overview',
    idle: async (page) => {
      await page.getByTestId('dash-send').waitFor({ state: 'visible' })
    },
  },
  {
    category: 'Fullscreen mock',
    storyId: 'hooks-usefullscreen--overview',
    idle: async (page) => {
      await page
        .getByRole('button', { name: /fullscreen|enter/i })
        .first()
        .waitFor()
    },
  },
  {
    category: 'Progress timers/DOM',
    storyId: 'hooks-usenprogress--overview',
    idle: async (page) => {
      await page.getByTestId('progress-container').waitFor({ state: 'visible' })
      await page.locator('[data-testid^="nav-"]').first().waitFor()
    },
  },
  {
    category: 'Page-leave iframe',
    storyId: 'hooks-usepageleave--overview',
    idle: async (page) => {
      await page
        .getByText(/inside|idle|left/i)
        .first()
        .waitFor({ state: 'attached' })
    },
  },
  {
    category: 'Text selection',
    storyId: 'hooks-usetextselection--overview',
    idle: async (page) => {
      await page
        .getByText(/select|selection|empty/i)
        .first()
        .waitFor({
          state: 'attached',
        })
    },
  },
  {
    category: 'Event registry',
    storyId: 'hooks-useeventbus--overview',
    idle: async (page) => {
      await page
        .getByRole('button', { name: /publish|emit|invoice/i })
        .first()
        .waitFor()
    },
  },
  {
    category: 'Async generation',
    storyId: 'hooks-usebase64--overview',
    idle: async (page) => {
      await page.getByRole('textbox').first().waitFor()
    },
  },
  {
    category: 'Infinite loading',
    storyId: 'hooks-useinfinitescroll--overview',
    idle: async (page) => {
      await page.getByRole('button', { name: /reset/i }).first().waitFor()
    },
  },
  {
    category: 'Internal counter fixture',
    storyId: 'internal-layout--reset-after-play',
    idle: async (page) => {
      await page.getByTestId('reset-counter').waitFor()
      const text = await page.getByTestId('reset-counter').textContent()
      if (text !== 'Count 0') {
        throw new Error(`Expected remounted idle Count 0, got ${text}`)
      }
    },
  },
]

const ERRORED = {
  category: 'Errored play fixture',
  storyId: 'internal-layout--errored-play-reset',
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
        reject(new Error('Failed to bind reset audit server'))
        return
      }
      resolveServer({
        server,
        origin: `http://127.0.0.1:${address.port}`,
      })
    })
  })
}

async function generation(page) {
  return page
    .locator('[data-story-reset-generation]')
    .first()
    .getAttribute('data-story-reset-generation')
}

async function waitForPostPlayRemount(page) {
  await page.waitForSelector('[data-story-reset-generation]', {
    timeout: STORY_TIMEOUT_MS,
  })
  // Fast plays may already have remounted before we sample generation.
  const current = (await generation(page)) ?? '0'
  if (current !== '0') {
    return current
  }
  await page.waitForFunction(
    () => {
      const node = document.querySelector('[data-story-reset-generation]')
      if (node == null) return false
      return node.getAttribute('data-story-reset-generation') !== '0'
    },
    { timeout: STORY_TIMEOUT_MS },
  )
  return (await generation(page)) ?? '0'
}

async function auditPlayedStory(page, origin, entry, failures) {
  const url = `${origin}/iframe.html?id=${encodeURIComponent(entry.storyId)}&viewMode=story`
  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: STORY_TIMEOUT_MS,
    })

    const afterGen = await waitForPostPlayRemount(page)
    if (afterGen === '0') {
      throw new Error('Generation stayed at 0 after play window')
    }

    await entry.idle(page)

    // Re-open: fresh mount then play+reset again (must not loop unboundedly).
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: STORY_TIMEOUT_MS,
    })
    const second = await waitForPostPlayRemount(page)
    const n = Number(second)
    if (!Number.isFinite(n) || n < 1 || n > 3) {
      throw new Error(`Unexpected second-pass generation ${second}`)
    }
    await entry.idle(page)

    console.log(`  PASS ${entry.category} (${entry.storyId}) gen→${afterGen}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push({ ...entry, message })
    console.error(`  FAIL ${entry.category}: ${message}`)
  }
}

async function auditErroredStory(page, origin, failures) {
  const url = `${origin}/iframe.html?id=${encodeURIComponent(ERRORED.storyId)}&viewMode=story`
  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: STORY_TIMEOUT_MS,
    })
    await waitForPostPlayRemount(page)
    await page.getByTestId('errored-reset-counter').waitFor()
    const text = await page.getByTestId('errored-reset-counter').textContent()
    if (text !== 'Count 0') {
      throw new Error(`Errored remount did not clear state: ${text}`)
    }
    console.log(`  PASS ${ERRORED.category}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push({ ...ERRORED, message })
    console.error(`  FAIL ${ERRORED.category}: ${message}`)
  }
}

async function auditStorySwitchRace(page, origin, failures) {
  // Story A (counter) completes → queue remount; quickly navigate to Story B.
  const storyA = 'internal-layout--reset-after-play'
  const storyB = 'internal-layout--reset-switch-target'
  try {
    await page.goto(
      `${origin}/iframe.html?id=${encodeURIComponent(storyA)}&viewMode=story`,
      { waitUntil: 'domcontentloaded', timeout: STORY_TIMEOUT_MS },
    )
    await page.waitForSelector('[data-story-reset-generation]', {
      timeout: STORY_TIMEOUT_MS,
    })
    // As soon as generation exists, switch before/around remount window.
    await page.goto(
      `${origin}/iframe.html?id=${encodeURIComponent(storyB)}&viewMode=story`,
      { waitUntil: 'domcontentloaded', timeout: STORY_TIMEOUT_MS },
    )
    await page.waitForSelector('[data-testid="switch-target-marker"]', {
      timeout: STORY_TIMEOUT_MS,
    })
    const genBefore = await generation(page)
    await page.waitForTimeout(250)
    const genAfter = await generation(page)
    if (genBefore !== genAfter) {
      throw new Error(
        `Stale reset remounted Story B (gen ${genBefore} → ${genAfter})`,
      )
    }
    const marker = await page.getByTestId('switch-target-marker').textContent()
    if (!marker?.includes('stable')) {
      throw new Error(`Story B lost stable marker: ${marker}`)
    }
    console.log('  PASS story-switch stale-reset race')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push({ category: 'Story-switch race', storyId: storyB, message })
    console.error(`  FAIL story-switch race: ${message}`)
  }
}

if (!existsSync(join(staticDir, 'index.json'))) {
  console.error('Missing storybook-static/index.json — run build:storybook')
  process.exit(1)
}

const entries = LIMIT == null ? MATRIX : MATRIX.slice(0, LIMIT)
console.log(
  `Reset audit: ${entries.length} matrix stories + errored + switch race`,
)

let server
let origin
let browser
const failures = []

try {
  ;({ server, origin } = await startStaticServer())
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  for (const entry of entries) {
    await auditPlayedStory(page, origin, entry, failures)
  }
  await auditErroredStory(page, origin, failures)
  await auditStorySwitchRace(page, origin, failures)
} finally {
  if (browser) await browser.close().catch(() => undefined)
  if (server) {
    await new Promise((resolveClose) => server.close(resolveClose))
  }
}

if (failures.length > 0) {
  console.error(`\nReset audit failures: ${failures.length}`)
  process.exitCode = 1
} else {
  console.log('\nReset audit passed.')
}
