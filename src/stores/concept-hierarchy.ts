import { defineStore } from 'pinia'
import { ref } from 'vue'
import { logger } from '@/utils/logger'
import { fetchConceptAncestorAndDescendant } from '@/services/concept-detail.service'
import { getConceptRecordCounts } from '@/services/concept-search.service'
import type { RelatedConcept, ConceptRecordCount } from '@/models/concept-detail.types'

const CHILD_RELATIONSHIP = 'Has descendant of'

export function directDescendants(rows: RelatedConcept[]): RelatedConcept[] {
  return rows.filter(r =>
    r.relationships.some(
      x => x.relationshipName === CHILD_RELATIONSHIP && x.relationshipDistance === 1
    )
  )
}

export const useConceptHierarchyStore = defineStore('concept-hierarchy', () => {
  const sourceKey = ref('')
  const childrenByConcept = ref(new Map<number, RelatedConcept[]>())
  const loadingNodes = ref(new Set<number>())
  const leafNodes = ref(new Set<number>())
  const expandedNodes = ref(new Set<number>())
  const failedNodes = ref(new Set<number>())
  const countsByConcept = ref(new Map<number, ConceptRecordCount>())

  const inFlight = new Map<number, Promise<void>>()
  let sourceGeneration = 0

  function reset() {
    childrenByConcept.value = new Map()
    loadingNodes.value = new Set()
    leafNodes.value = new Set()
    expandedNodes.value = new Set()
    failedNodes.value = new Set()
    countsByConcept.value = new Map()
    inFlight.clear()
    sourceGeneration++
  }

  function setSource(nextSourceKey: string) {
    if (nextSourceKey === sourceKey.value) return
    sourceKey.value = nextSourceKey
    reset()
  }

  function childrenOf(conceptId: number): RelatedConcept[] {
    return childrenByConcept.value.get(conceptId) ?? []
  }

  function isLoading(conceptId: number) {
    return loadingNodes.value.has(conceptId)
  }
  function isLeaf(conceptId: number) {
    return leafNodes.value.has(conceptId)
  }
  function isExpanded(conceptId: number) {
    return expandedNodes.value.has(conceptId)
  }
  function hasFailed(conceptId: number) {
    return failedNodes.value.has(conceptId)
  }
  function countsFor(conceptId: number): ConceptRecordCount | undefined {
    return countsByConcept.value.get(conceptId)
  }

  function collapseNode(conceptId: number) {
    expandedNodes.value = new Set(
      [...expandedNodes.value].filter(id => id !== conceptId)
    )
  }

  // Counts are decorative: a failure must not take the tree down with it.
  async function loadCounts(conceptIds: number[], requestSourceKey: string): Promise<void> {
    const missing = conceptIds.filter(id => !countsByConcept.value.has(id))
    if (missing.length === 0) return
    const loadGeneration = sourceGeneration
    try {
      const fetched = await getConceptRecordCounts(requestSourceKey, missing)
      if (loadGeneration !== sourceGeneration) return
      const next = new Map(countsByConcept.value)
      for (const [id, counts] of fetched) next.set(id, counts)
      countsByConcept.value = next
    } catch (e) {
      logger.error('ConceptHierarchy', `loadCounts failed for ${requestSourceKey}`, e)
    }
  }

  async function fetchChildren(conceptId: number): Promise<void> {
    const fetchSourceKey = sourceKey.value
    const fetchGeneration = sourceGeneration
    loadingNodes.value = new Set(loadingNodes.value).add(conceptId)
    failedNodes.value = new Set([...failedNodes.value].filter(id => id !== conceptId))
    try {
      const payload = await fetchConceptAncestorAndDescendant(fetchSourceKey, conceptId)
      const children = directDescendants(payload)
      if (fetchGeneration === sourceGeneration) {
        childrenByConcept.value = new Map(childrenByConcept.value).set(conceptId, children)
        if (children.length === 0) {
          leafNodes.value = new Set(leafNodes.value).add(conceptId)
        } else {
          expandedNodes.value = new Set(expandedNodes.value).add(conceptId)
          await loadCounts(children.map(c => c.conceptId), fetchSourceKey)
        }
      }
    } catch (e) {
      logger.error('ConceptHierarchy', `expandNode failed for ${fetchSourceKey}/${conceptId}`, e)
      if (fetchGeneration === sourceGeneration) {
        failedNodes.value = new Set(failedNodes.value).add(conceptId)
      }
    } finally {
      if (fetchGeneration === sourceGeneration) {
        loadingNodes.value = new Set([...loadingNodes.value].filter(id => id !== conceptId))
        inFlight.delete(conceptId)
      }
    }
  }

  async function expandNode(conceptId: number): Promise<void> {
    if (childrenByConcept.value.has(conceptId)) {
      if (childrenOf(conceptId).length > 0) {
        expandedNodes.value = new Set(expandedNodes.value).add(conceptId)
      }
      return
    }
    const pending = inFlight.get(conceptId)
    if (pending) return pending

    const task = fetchChildren(conceptId)
    inFlight.set(conceptId, task)
    return task
  }

  return {
    sourceKey,
    setSource,
    expandNode,
    collapseNode,
    childrenOf,
    isLoading,
    isLeaf,
    isExpanded,
    hasFailed,
    countsFor,
    loadCounts,
    reset,
  }
})
