// src/ui/build-tokens.ts
import type { AtlasTokens } from './tokens'

const HEADER = `/* GENERATED — DO NOT EDIT.
 * Source: src/ui/tokens.ts. Run \`npm run tokens:build\` to regenerate. */`

const camelToKebab = (s: string) =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

export function generateTokensCss(t: AtlasTokens): string {
  const lines: string[] = []
  for (const [group, values] of Object.entries(t)) {
    for (const [key, value] of Object.entries(values as Record<string, string | number>)) {
      const name = `--atlas-${camelToKebab(group)}-${camelToKebab(key)}`
      lines.push(`  ${name}: ${value};`)
    }
  }
  return `${HEADER}\n:root {\n${lines.join('\n')}\n}\n`
}
