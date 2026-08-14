import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/utils/logger'
import { getConceptById, getConceptRecordCounts } from '@/services/concept-search.service'
import {
  getConceptRelated,
  getConceptAncestorAndDescendant,
  getConceptDrilldown,
} from '@/services/concept-detail.service'
import type { Concept } from '@/models/concept-set.types'
import type { RelatedConcept, ConceptRecordCount } from '@/models/concept-detail.types'
import type { DrilldownReport } from '@/models/report.types'

const CACHE_TTL_MS = 5 * 60 * 1000

const PARENT_RELATIONSHIPS = new Set(['Has ancestor of', 'Subsumes'])
const CHILD_RELATIONSHIPS = new Set(['Has descendant of', 'Is a'])

interface CacheEntry {
  loadedAt: number
  concept: Concept
  related: RelatedConcept[]
  hierarchy: RelatedConcept[]
  recordCounts: Map<string, ConceptRecordCount>
}

export const useConceptDetailStore = defineStore('concept-detail', () => {
  const concept = ref<Concept | null>(null)
  const related = ref<RelatedConcept[]>([])
  const hierarchy = ref<RelatedConcept[]>([])
  const recordCountsBySource = ref<Map<string, ConceptRecordCount>>(new Map())
  const drilldownBySource = ref<Map<string, DrilldownReport | null>>(new Map())
  const isLoading = ref(false)
  const isDrilldownLoading = ref(false)
  const error = ref<string | null>(null)
  const relatedError = ref<string | null>(null)
  const hierarchyError = ref<string | null>(null)
  const recordCountsError = ref<string | null>(null)
  const drilldownErrorBySource = ref<Map<string, string>>(new Map())

  const cache = new Map<string, CacheEntry>()

  const parents = computed(() =>
    hierarchy.value.filter((c) =>
      c.relationships.some(
        (r) => PARENT_RELATIONSHIPS.has(r.relationshipName) && r.relationshipDistance === 1
      )
    )
  )

  const children = computed(() =>
    hierarchy.value.filter((c) =>
      c.relationships.some(
        (r) => CHILD_RELATIONSHIPS.has(r.relationshipName) && r.relationshipDistance === 1
      )
    )
  )

  function cacheKey(sourceKey: string, conceptId: number) {
    return `${sourceKey}-${conceptId}`
  }

  function applyValues(entry: CacheEntry) {
    concept.value = entry.concept
    related.value = entry.related
    hierarchy.value = entry.hierarchy
    recordCountsBySource.value = new Map(entry.recordCounts)
  }

  // A cache entry is only ever written for a fully successful load, so
  // replaying one always clears the per-section errors.
  function applyEntry(entry: CacheEntry) {
    applyValues(entry)
    relatedError.value = null
    hierarchyError.value = null
    recordCountsError.value = null
  }

  // Returns the outcome rather than writing the error ref, so a load reads only
  // its own results: two loadConcept calls overlap freely (the view re-runs it
  // on every concept switch), and a shared ref would let the first load's
  // failure both suppress the second's cache write and mislabel its data.
  function sectionOutcome<T>(
    result: PromiseSettledResult<T>,
    fallback: T,
    section: string,
    key: string
  ): { value: T; error: string | null } {
    if (result.status === 'fulfilled') return { value: result.value, error: null }
    logger.error('ConceptDetail', `loadConcept ${section} failed for ${key}`, result.reason)
    return { value: fallback, error: `Failed to load ${section}` }
  }

  async function loadConcept(sourceKey: string, conceptId: number, force = false): Promise<void> {
    const key = cacheKey(sourceKey, conceptId)
    const cached = cache.get(key)
    if (!force && cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
      applyEntry(cached)
      return
    }

    isLoading.value = true
    error.value = null
    relatedError.value = null
    hierarchyError.value = null
    recordCountsError.value = null
    try {
      const [conceptResult, relatedResult, hierarchyResult, countsResult] = await Promise.allSettled(
        [
          getConceptById(sourceKey, conceptId),
          getConceptRelated(sourceKey, conceptId),
          getConceptAncestorAndDescendant(sourceKey, conceptId),
          getConceptRecordCounts(sourceKey, [conceptId]),
        ]
      )

      if (conceptResult.status === 'rejected') {
        logger.error('ConceptDetail', `loadConcept failed for ${key}`, conceptResult.reason)
        error.value = 'Failed to load concept'
        return
      }

      const c = conceptResult.value
      if (!c) {
        error.value = 'Concept not found'
        concept.value = null
        related.value = []
        hierarchy.value = []
        recordCountsBySource.value = new Map()
        return
      }

      const rel = sectionOutcome(relatedResult, [], 'related concepts', key)
      const hier = sectionOutcome(hierarchyResult, [], 'hierarchy', key)
      const counts = sectionOutcome(
        countsResult,
        new Map<number, ConceptRecordCount>(),
        'record counts',
        key
      )

      const rcMap = new Map<string, ConceptRecordCount>()
      const sourceCounts = counts.value.get(conceptId)
      if (sourceCounts) rcMap.set(sourceKey, sourceCounts)

      const entry: CacheEntry = {
        loadedAt: Date.now(),
        concept: c,
        related: rel.value,
        hierarchy: hier.value,
        recordCounts: rcMap,
      }
      // A partial load is shown but never cached: caching it would let the
      // empty stand-in for a failed section be served later as real data.
      if (!rel.error && !hier.error && !counts.error) {
        cache.set(key, entry)
      }
      applyValues(entry)
      relatedError.value = rel.error
      hierarchyError.value = hier.error
      recordCountsError.value = counts.error
    } catch (e) {
      // Callers invoke loadConcept from onMounted/watch without a .catch, so it
      // must never reject: anything unexpected degrades to the fatal error.
      logger.error('ConceptDetail', `loadConcept failed for ${key}`, e)
      error.value = 'Failed to load concept'
    } finally {
      isLoading.value = false
    }
  }

  async function loadRecordCountsForSources(
    sourceKeys: string[],
    conceptId: number
  ): Promise<void> {
    await Promise.all(
      sourceKeys.map(async (sk) => {
        if (recordCountsBySource.value.has(sk)) return
        const map = await getConceptRecordCounts(sk, [conceptId])
        const counts = map.get(conceptId)
        if (counts) {
          recordCountsBySource.value = new Map(recordCountsBySource.value).set(sk, counts)
        }
      })
    )
  }

  // Keyed by source AND concept (`cacheKey`), not source alone. A
  // source-only key meant that once any concept under a source had been
  // drilled down, `has(sourceKey)` was true forever for that source, so
  // every later concept viewed under the same source reused the FIRST
  // concept's cached result (including a null/empty one) without ever
  // re-fetching, regardless of which concept was actually being viewed
  // (#225).
  function getDrilldown(sourceKey: string, conceptId: number): DrilldownReport | null {
    return drilldownBySource.value.get(cacheKey(sourceKey, conceptId)) ?? null
  }

  async function loadDrilldown(sourceKey: string): Promise<void> {
    if (!concept.value) return
    const conceptId = concept.value.conceptId
    const key = cacheKey(sourceKey, conceptId)
    if (drilldownBySource.value.has(key)) return

    isDrilldownLoading.value = true
    drilldownErrorBySource.value = new Map(
      [...drilldownErrorBySource.value].filter(([sk]) => sk !== sourceKey)
    )
    try {
      const report = await getConceptDrilldown(
        sourceKey,
        concept.value.domainId,
        conceptId,
        concept.value.conceptName,
      )
      drilldownBySource.value = new Map(drilldownBySource.value).set(key, report)
    } catch (e) {
      logger.error('ConceptDetail', `loadDrilldown failed for ${sourceKey}`, e)
      // Deliberately not written to drilldownBySource: that map doubles as the
      // "already fetched" guard, so a failure must stay retryable.
      drilldownErrorBySource.value = new Map(drilldownErrorBySource.value).set(
        sourceKey,
        'Failed to load drilldown'
      )
    } finally {
      isDrilldownLoading.value = false
    }
  }

  function drilldownErrorFor(sourceKey: string): string | null {
    return drilldownErrorBySource.value.get(sourceKey) ?? null
  }

  function reset() {
    concept.value = null
    related.value = []
    hierarchy.value = []
    recordCountsBySource.value = new Map()
    drilldownBySource.value = new Map()
    drilldownErrorBySource.value = new Map()
    isLoading.value = false
    isDrilldownLoading.value = false
    error.value = null
    relatedError.value = null
    hierarchyError.value = null
    recordCountsError.value = null
  }

  return {
    concept,
    related,
    hierarchy,
    parents,
    children,
    recordCountsBySource,
    drilldownBySource,
    getDrilldown,
    isLoading,
    isDrilldownLoading,
    error,
    relatedError,
    hierarchyError,
    recordCountsError,
    drilldownErrorBySource,
    drilldownErrorFor,
    loadConcept,
    loadRecordCountsForSources,
    loadDrilldown,
    reset,
  }
})
