/**
 * useFeatureAnalysisFacets
 *
 * Facet definitions for the feature-analysis pickers, matching the ones Atlas
 * 2.15 offers on its "Choose a Feature analyses..." dialog: Type, Domain,
 * Created, Updated, Author and Designs.
 *
 * 2.15 facets on those six and nothing else — in particular not on stat type —
 * and a library of ~1,400 analyses is why plain text search is not enough there.
 *
 * The facet machinery itself is `useConceptFacets`, which is generic over the
 * item type despite its name: it takes the definitions below and a search-text
 * extractor, and returns cross-facet option counts ("CONDITION (546)") in the
 * same style 2.15 shows.
 */
import type { FacetDefinition } from '@/composables/useConceptFacets'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

/** 2.15's wording for the analysis types, which reads better than the enum. */
const TYPE_LABELS: Record<string, string> = {
  CRITERIA_SET: 'Criteria set',
  CUSTOM_FE: 'Custom',
  PRESET: 'Preset',
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export const RECENCY_THIS_WEEK = 'This Week'
export const RECENCY_LAST_WEEK = 'Last Week'
export const RECENCY_OLDER = '2+ Weeks Ago'
export const RECENCY_UNKNOWN = 'Unknown'

export const DESIGNS_MINE = 'My designs'
export const DESIGNS_OTHER = 'Other designs'

/**
 * The three buckets 2.15 shows for Created and Updated.
 *
 * `now` is passed in rather than read from the clock so the bucket a row falls
 * into is a pure function of its timestamp, which is what makes it testable.
 */
export function recencyBucket(timestamp: number | undefined, now: number): string {
  if (timestamp === undefined || Number.isNaN(timestamp)) return RECENCY_UNKNOWN

  const age = now - timestamp
  if (age < WEEK_MS) return RECENCY_THIS_WEEK
  if (age < 2 * WEEK_MS) return RECENCY_LAST_WEEK
  return RECENCY_OLDER
}

/** The login on a WebAPI user ref, which is either a string or an object. */
export function authorLogin(createdBy: FeatureAnalysisListItem['createdBy']): string {
  if (!createdBy) return 'anonymous'
  if (typeof createdBy === 'string') return createdBy || 'anonymous'
  return createdBy.login || 'anonymous'
}

export interface FeatureAnalysisFacetContext {
  /** Login of the signed-in user, for the My designs / Other designs split. */
  currentUserLogin?: string
  /** Reference point for the Created / Updated buckets. */
  now: number
}

export function featureAnalysisFacets(
  context: FeatureAnalysisFacetContext
): FacetDefinition<FeatureAnalysisListItem>[] {
  return [
    {
      key: 'type',
      label: 'Type',
      display: fa => TYPE_LABELS[fa.type] ?? fa.type,
    },
    {
      key: 'domain',
      label: 'Domain',
      display: fa => fa.domain || 'Unknown',
    },
    {
      key: 'created',
      label: 'Created',
      display: fa => recencyBucket(fa.createdDate, context.now),
    },
    {
      key: 'updated',
      label: 'Updated',
      display: fa => recencyBucket(fa.modifiedDate, context.now),
    },
    {
      key: 'author',
      label: 'Author',
      display: fa => authorLogin(fa.createdBy),
    },
    {
      key: 'designs',
      label: 'Designs',
      display: fa =>
        context.currentUserLogin && authorLogin(fa.createdBy) === context.currentUserLogin
          ? DESIGNS_MINE
          : DESIGNS_OTHER,
    },
  ]
}

/** What the text box searches, mirroring the columns the dialog shows. */
export function featureAnalysisSearchText(fa: FeatureAnalysisListItem): string {
  return [fa.name, fa.description ?? '', fa.type, fa.domain ?? ''].join(' ')
}
