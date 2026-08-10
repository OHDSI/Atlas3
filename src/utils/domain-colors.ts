/**
 * Maps OMOP CDM domains to a consistent palette for chips, badges,
 * and other indicator UI. Colors are drawn from the Vuetify named
 * palette so they automatically follow theme tweaks.
 *
 * Used wherever a domain identifier needs to read at a glance —
 * concept set tables, paste-IDs summaries, search results.
 */

export const DOMAIN_COLORS: Record<string, string> = {
  Condition: 'red',
  Drug: 'purple',
  Procedure: 'teal',
  Measurement: 'blue',
  Observation: 'amber',
  Device: 'brown',
  Visit: 'cyan',
  Specimen: 'green',
  Note: 'grey',
  Provider: 'indigo',
  Geography: 'light-green',
  Race: 'pink',
  Gender: 'deep-purple',
  Ethnicity: 'lime',
  Type: 'blue-grey',
  Unit: 'orange',
  Currency: 'amber-darken-2',
  Metadata: 'grey-darken-1',
}

// Vuetify's base named colours are tuned for white surfaces. On the dark
// surface these particular hues drop below AA as tonal chip labels, so dark
// mode substitutes a lighter step of the same hue.
export const DARK_DOMAIN_COLORS: Record<string, string> = {
  Condition: 'red-lighten-1',
  Drug: 'purple-lighten-3',
  Procedure: 'teal-lighten-2',
  Measurement: 'blue-lighten-2',
  Observation: 'amber-lighten-2',
  Device: 'brown-lighten-2',
  Visit: 'cyan-lighten-2',
  Specimen: 'green-lighten-2',
  Note: 'grey-lighten-1',
  Provider: 'indigo-lighten-3',
  Geography: 'light-green-lighten-2',
  Race: 'pink-lighten-2',
  Gender: 'deep-purple-lighten-3',
  Ethnicity: 'lime-lighten-2',
  Type: 'blue-grey-lighten-2',
  Unit: 'orange-lighten-2',
  Currency: 'amber-lighten-1',
  // One step below Note, mirroring the light map's grey / grey-darken-1 split
  // so the two greys stay tellable apart as chips and as timeline series.
  Metadata: 'grey',
}

const DEFAULT_COLOR = 'primary'

export function getDomainColor(
  domain: string | null | undefined,
  mode: 'light' | 'dark' = 'light',
): string {
  if (!domain) return DEFAULT_COLOR
  const map = mode === 'dark' ? DARK_DOMAIN_COLORS : DOMAIN_COLORS
  return map[domain] ?? DEFAULT_COLOR
}
