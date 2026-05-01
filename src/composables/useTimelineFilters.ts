import { computed, type ComputedRef } from 'vue'
import { useProfileStore } from '@/stores/profile'
import { DEFAULT_HIGHLIGHT_COLOR, OMOP_DOMAINS } from '@/models/profile.types'
import { getDomainColor } from '@/utils/domain-colors'

/**
 * WebAPI returns domain values inconsistently: Eunomia (CDM 5.4)
 * uses lowercase ("drug", "condition"), other CDMs use TitleCase
 * ("Drug", "ConditionEra"). The chart y-axis uses OMOP_DOMAINS
 * which is TitleCase, so points keyed off lowercase domains were
 * silently dropped by ECharts (no matching y-category).
 *
 * Normalise to the closest TitleCase value in OMOP_DOMAINS via
 * case-insensitive match; fall back to the original string when
 * unknown so plugin-domain rows aren't lost.
 */
const DOMAIN_LOOKUP = new Map(OMOP_DOMAINS.map(d => [d.toLowerCase(), d]))
function normalizeDomain(d: string): string {
  return DOMAIN_LOOKUP.get(d.toLowerCase()) ?? d
}

/**
 * Resolve a Vuetify named color (the format `getDomainColor` returns)
 * to the CSS string ECharts can paint with. We sidestep the theme
 * lookup and use the documented Vuetify Material palette tokens
 * directly so points still tint when ECharts renders into a canvas
 * without theme context.
 */
const VUETIFY_COLOR_HEX: Record<string, string> = {
  red: '#F44336',
  pink: '#E91E63',
  purple: '#9C27B0',
  'deep-purple': '#673AB7',
  indigo: '#3F51B5',
  blue: '#2196F3',
  'light-blue': '#03A9F4',
  cyan: '#00BCD4',
  teal: '#009688',
  green: '#4CAF50',
  'light-green': '#8BC34A',
  lime: '#CDDC39',
  yellow: '#FFEB3B',
  amber: '#FFC107',
  'amber-darken-2': '#FF8F00',
  orange: '#FF9800',
  'deep-orange': '#FF5722',
  brown: '#795548',
  'blue-grey': '#607D8B',
  grey: '#9E9E9E',
  'grey-darken-1': '#757575',
  primary: '#1976D2',
}

function resolveDomainColorHex(domain: string): string {
  const token = getDomainColor(domain)
  return VUETIFY_COLOR_HEX[token] ?? VUETIFY_COLOR_HEX.primary ?? DEFAULT_HIGHLIGHT_COLOR
}

export interface UniqueConcept {
  conceptId: number
  conceptName: string
  domain: string
  count: number
}

export interface TimelinePoint {
  conceptId: number
  conceptName: string
  startDay: number
  endDay: number | null
  /** explicit highlight color (or DEFAULT_HIGHLIGHT_COLOR) */
  color: string
  /** domain-derived fallback color for un-highlighted points */
  domainColor: string
}

export interface TimelineDataset {
  domain: string
  points: TimelinePoint[]
}

export function useTimelineFilters(): {
  uniqueConcepts: ComputedRef<UniqueConcept[]>
  chartSeries: ComputedRef<TimelineDataset[]>
} {
  const store = useProfileStore()

  const uniqueConcepts = computed<UniqueConcept[]>(() => {
    const map = new Map<number, UniqueConcept>()
    for (const r of store.filteredRecords) {
      const existing = map.get(r.conceptId)
      if (existing) existing.count += 1
      else map.set(r.conceptId, {
        conceptId: r.conceptId, conceptName: r.conceptName, domain: r.domain, count: 1,
      })
    }
    return Array.from(map.values())
  })

  const chartSeries = computed<TimelineDataset[]>(() => {
    const buckets = new Map<string, TimelinePoint[]>()
    for (const r of store.filteredRecords) {
      const domain = normalizeDomain(r.domain)
      const point: TimelinePoint = {
        conceptId: r.conceptId,
        conceptName: r.conceptName,
        startDay: r.startDay,
        // r.endDay is `number | null | undefined` after the schema
        // accepted both shapes; coerce undefined to null so the
        // TimelinePoint contract stays `number | null`.
        endDay: r.endDay ?? null,
        color: store.highlights.get(r.conceptId) ?? DEFAULT_HIGHLIGHT_COLOR,
        domainColor: resolveDomainColorHex(domain),
      }
      const arr = buckets.get(domain)
      if (arr) {
        arr.push(point)
      } else {
        buckets.set(domain, [point])
      }
    }
    return Array.from(buckets.entries()).map(([domain, points]) => ({ domain, points }))
  })

  return { uniqueConcepts, chartSeries }
}
