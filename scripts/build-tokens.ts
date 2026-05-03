// scripts/build-tokens.ts
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { tokens } from '../src/ui/tokens'
import { generateTokensCss } from '../src/ui/build-tokens'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '../src/ui/tokens.css')
writeFileSync(out, generateTokensCss(tokens), 'utf8')
// eslint-disable-next-line no-console
console.log(`wrote ${out}`)
