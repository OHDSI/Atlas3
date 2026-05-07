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
import type {
  RelatedConcept,
  ConceptRecordCount,
  DrilldownReport,
} from '@/models/concept-detail.types'

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

  function applyEntry(entry: CacheEntry) {
    concept.value = entry.concept
    related.value = entry.related
    hierarchy.value = entry.hierarchy
    recordCountsBySource.value = new Map(entry.recordCounts)
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
    try {
      const [c, rel, hier, rcByConcept] = await Promise.all([
        getConceptById(sourceKey, conceptId),
        getConceptRelated(sourceKey, conceptId),
        getConceptAncestorAndDescendant(sourceKey, conceptId),
        getConceptRecordCounts(sourceKey, [conceptId]),
      ])

      if (!c) {
        error.value = 'Concept not found'
        concept.value = null
        related.value = []
        hierarchy.value = []
        recordCountsBySource.value = new Map()
        return
      }

      const rcMap = new Map<string, ConceptRecordCount>()
      const sourceCounts = rcByConcept.get(conceptId)
      if (sourceCounts) rcMap.set(sourceKey, sourceCounts)

      const entry: CacheEntry = {
        loadedAt: Date.now(),
        concept: c,
        related: rel,
        hierarchy: hier,
        recordCounts: rcMap,
      }
      cache.set(key, entry)
      applyEntry(entry)
    } catch (e) {
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

  async function loadDrilldown(sourceKey: string): Promise<void> {
    if (!concept.value) return
    if (drilldownBySource.value.has(sourceKey)) return

    isDrilldownLoading.value = true
    try {
      const report = await getConceptDrilldown(
        sourceKey,
        concept.value.domainId,
        concept.value.conceptId
      )
      drilldownBySource.value = new Map(drilldownBySource.value).set(sourceKey, report)
    } finally {
      isDrilldownLoading.value = false
    }
  }

  function reset() {
    concept.value = null
    related.value = []
    hierarchy.value = []
    recordCountsBySource.value = new Map()
    drilldownBySource.value = new Map()
    isLoading.value = false
    isDrilldownLoading.value = false
    error.value = null
  }

  return {
    concept,
    related,
    hierarchy,
    parents,
    children,
    recordCountsBySource,
    drilldownBySource,
    isLoading,
    isDrilldownLoading,
    error,
    loadConcept,
    loadRecordCountsForSources,
    loadDrilldown,
    reset,
  }
})
