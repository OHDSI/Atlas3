import { computed, type ComputedRef } from 'vue'
import { useProfileStore } from '@/stores/profile'
import { useThemeStore } from '@/stores/theme'
import { DEFAULT_HIGHLIGHT_COLOR, OMOP_DOMAINS } from '@/models/profile.types'
import { getDomainColor } from '@/utils/domain-colors'
import { tokens } from '@/ui/tokens'

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
export const VUETIFY_COLOR_HEX: Record<string, string> = {
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
  // Dark-mode tokens from getDomainColor(domain, 'dark') — lighter steps of
  // the same hues, tuned to stay legible on the dark timeline canvas.
  'red-lighten-1': '#EF5350',
  'purple-lighten-3': '#CE93D8',
  'teal-lighten-2': '#4DB6AC',
  'blue-lighten-2': '#64B5F6',
  'amber-lighten-2': '#FFD54F',
  'brown-lighten-2': '#A1887F',
  'cyan-lighten-2': '#4DD0E1',
  'green-lighten-2': '#81C784',
  'grey-lighten-1': '#BDBDBD',
  'indigo-lighten-3': '#9FA8DA',
  'light-green-lighten-2': '#AED581',
  'pink-lighten-2': '#F06292',
  'deep-purple-lighten-3': '#B39DDB',
  'lime-lighten-2': '#DCE775',
  'blue-grey-lighten-2': '#90A4AE',
  'orange-lighten-2': '#FFB74D',
  'amber-lighten-1': '#FFCA28',
  primary: '#1976D2',
}

// getDomainColor answers 'primary' for domains outside the map. The table above
// holds only the light-mode primary, which is invisible against the dark
// timeline canvas, so the fallback resolves per mode.
const PRIMARY_FALLBACK_HEX: Record<'light' | 'dark', string> = {
  light: VUETIFY_COLOR_HEX.primary ?? DEFAULT_HIGHLIGHT_COLOR,
  dark: tokens.colorDark.primary,
}

function resolveDomainColorHex(domain: string, mode: 'light' | 'dark'): string {
  const token = getDomainColor(domain, mode)
  if (token === 'primary') return PRIMARY_FALLBACK_HEX[mode]
  return VUETIFY_COLOR_HEX[token] ?? PRIMARY_FALLBACK_HEX[mode]
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
  /** True when endDay is a number greater than startDay — render as a bar. */
  isRange: boolean
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
  axisExtent: ComputedRef<{ min: number; max: number }>
} {
  const store = useProfileStore()
  const themeStore = useThemeStore()

  const uniqueConcepts = computed<UniqueConcept[]>(() => {
    const map = new Map<number, UniqueConcept>()
    for (const r of store.filteredRecords) {
      const existing = map.get(r.conceptId)
      if (existing) existing.count += 1
      else
        map.set(r.conceptId, {
          conceptId: r.conceptId,
          conceptName: r.conceptName,
          domain: r.domain,
          count: 1,
        })
    }
    return Array.from(map.values())
  })

  const chartSeries = computed<TimelineDataset[]>(() => {
    const buckets = new Map<string, TimelinePoint[]>()
    for (const r of store.filteredRecords) {
      const domain = normalizeDomain(r.domain)
      const endDay = r.endDay ?? null
      const point: TimelinePoint = {
        conceptId: r.conceptId,
        conceptName: r.conceptName,
        startDay: r.startDay,
        // r.endDay is `number | null | undefined` after the schema
        // accepted both shapes; coerce undefined to null so the
        // TimelinePoint contract stays `number | null`.
        endDay,
        isRange: endDay !== null && endDay > r.startDay,
        color: store.highlights.get(r.conceptId) ?? DEFAULT_HIGHLIGHT_COLOR,
        domainColor: resolveDomainColorHex(domain, themeStore.resolved),
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

  const axisExtent = computed<{ min: number; max: number }>(() => {
    // Anchor on cohort entry (day 0) so the axis always shows the
    // index event even when all records fall on one side of it.
    let min = 0
    let max = 0
    for (const r of store.person?.records ?? []) {
      if (r.startDay < min) min = r.startDay
      if (r.startDay > max) max = r.startDay
      if (typeof r.endDay === 'number') {
        if (r.endDay < min) min = r.endDay
        if (r.endDay > max) max = r.endDay
      }
    }
    for (const op of store.person?.observationPeriods ?? []) {
      if (typeof op.startDays === 'number' && op.startDays < min) min = op.startDays
      if (typeof op.endDays === 'number' && op.endDays > max) max = op.endDays
    }
    return { min, max }
  })

  return { uniqueConcepts, chartSeries, axisExtent }
}
