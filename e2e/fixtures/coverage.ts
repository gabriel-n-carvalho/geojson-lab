import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { test as base } from './mapkit-mock'

const OUTPUT_DIR = resolve(process.cwd(), 'coverage/e2e/raw')

export const test = base.extend<{ collectCoverage: void }>({
  collectCoverage: [
    async ({ page }, use, testInfo) => {
      await use()
      const coverage = await page
        .evaluate(() => (window as unknown as { __coverage__?: unknown }).__coverage__)
        .catch(() => undefined)
      if (!coverage) return
      mkdirSync(OUTPUT_DIR, { recursive: true })
      const safeTitle = testInfo.title.replace(/[^a-zA-Z0-9_-]/g, '_')
      const file = resolve(OUTPUT_DIR, `${safeTitle}-${testInfo.project.name}-${randomUUID()}.json`)
      writeFileSync(file, JSON.stringify(coverage), 'utf8')
    },
    { auto: true },
  ],
})

export const expect = test.expect
