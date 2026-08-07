#!/usr/bin/env node
/**
 * Copies the SystemJS builds of the plugin-runtime dependencies out of
 * node_modules into public/vendor, so the version served to plugins can never
 * drift from package.json.
 */
import { copyFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'vendor')

const ARTIFACTS = [
  {
    from: join(ROOT, 'node_modules', 'single-spa-vue', 'dist', 'system', 'single-spa-vue.js'),
    to: join(OUT, 'single-spa-vue.js'),
  },
]

await mkdir(OUT, { recursive: true })

for (const { from, to } of ARTIFACTS) {
  if (!existsSync(from)) {
    console.error(`[build-vendor] missing artifact: ${from}`)
    console.error('[build-vendor] run `npm ci` first, or check the package layout')
    process.exit(1)
  }
  await copyFile(from, to)
  console.log(`[build-vendor] ${to}`)
}
