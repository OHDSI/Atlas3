/**
 * Maps OMOP CDM domains to a consistent palette for chips, badges,
 * and other indicator UI. Colors are drawn from the Vuetify named
 * palette so they automatically follow theme tweaks.
 *
 * Used wherever a domain identifier needs to read at a glance —
 * concept set tables, paste-IDs summaries, search results.
 */

const DOMAIN_COLORS: Record<string, string> = {
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

const DEFAULT_COLOR = 'primary'

export function getDomainColor(domain: string | null | undefined): string {
  if (!domain) return DEFAULT_COLOR
  return DOMAIN_COLORS[domain] ?? DEFAULT_COLOR
}
