// src/ui/build-tokens.ts
import type { AtlasTokens } from './tokens'

const HEADER = `/* GENERATED — DO NOT EDIT.
 * Source: src/ui/tokens.ts. Run \`npm run tokens:build\` to regenerate. */`

const camelToKebab = (s: string) =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

export function generateTokensCss(t: AtlasTokens): string {
  const lightColor: string[] = []
  const darkColor: string[] = []
  const shared: string[] = []

  for (const [group, values] of Object.entries(t)) {
    // 'color' = light palette, 'colorDark' = dark overrides. Both emit the same
    // --atlas-color-* names so the dark block overrides via .v-theme--dark scope.
    // All other groups are theme-independent and live only in the light/:root block.
    if (group === 'color' || group === 'colorDark') {
      const target = group === 'color' ? lightColor : darkColor
      for (const [key, value] of Object.entries(values as Record<string, string>)) {
        target.push(`  --atlas-color-${camelToKebab(key)}: ${value};`)
      }
    } else {
      for (const [key, value] of Object.entries(values as Record<string, string | number>)) {
        shared.push(`  --atlas-${camelToKebab(group)}-${camelToKebab(key)}: ${value};`)
      }
    }
  }

  return [
    HEADER,
    `:root, .v-theme--light {`,
    [...lightColor, ...shared].join('\n'),
    `}`,
    `.v-theme--dark {`,
    darkColor.join('\n'),
    `}`,
    '',
  ].join('\n')
}
