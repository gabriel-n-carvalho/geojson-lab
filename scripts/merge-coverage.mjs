import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const out = resolve(root, 'coverage/merged')
mkdirSync(out, { recursive: true })

const inputs = [
  resolve(root, 'coverage/unit/coverage-final.json'),
  resolve(root, 'coverage/e2e/coverage-final.json'),
]

const merged = {}
for (const input of inputs) {
  if (!existsSync(input)) continue
  const data = JSON.parse(readFileSync(input, 'utf8'))
  for (const [file, fileCov] of Object.entries(data)) {
    if (!merged[file]) {
      merged[file] = fileCov
      continue
    }
    const existing = merged[file]
    for (const key of Object.keys(fileCov.s)) {
      existing.s[key] = (existing.s[key] ?? 0) + fileCov.s[key]
    }
    for (const key of Object.keys(fileCov.f)) {
      existing.f[key] = (existing.f[key] ?? 0) + fileCov.f[key]
    }
    for (const key of Object.keys(fileCov.b)) {
      const a = existing.b[key] ?? []
      const b = fileCov.b[key]
      existing.b[key] = b.map((count, i) => (a[i] ?? 0) + count)
    }
    if (existing.bT && fileCov.bT) {
      for (const key of Object.keys(fileCov.bT)) {
        const a = existing.bT[key] ?? []
        const b = fileCov.bT[key]
        existing.bT[key] = b.map((count, i) => (a[i] ?? 0) + count)
      }
    }
  }
}

writeFileSync(resolve(out, 'coverage-final.json'), JSON.stringify(merged), 'utf8')
console.log(
  `Merged ${Object.keys(merged).length} files into ${resolve(out, 'coverage-final.json')}`,
)
