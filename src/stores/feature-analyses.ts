/**
 * Feature Analyses Store
 *
 * State management for Feature Analysis CRUD operations and metadata
 * (domains and aggregates) used by the Characterization workflow.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import {
  listFeatureAnalyses,
  getFeatureAnalysis,
  createFeatureAnalysis,
  updateFeatureAnalysis,
  deleteFeatureAnalysis,
  copyFeatureAnalysis,
  listFeatureAnalysisDomains,
  listFeatureAnalysisAggregates,
} from '@/services/feature-analysis.service'
import type {
  FeatureAnalysis,
  FeatureAnalysisListItem,
  FeatureAnalysisAggregate,
} from '@/models/feature-analysis.types'
import { logger } from '@/utils/logger'
import { debounce } from '@/utils/debounce'

export const useFeatureAnalysesStore = defineStore('feature-analyses', () => {
  // ============================================================================
  // State
  // ============================================================================

  const featureAnalyses = ref<FeatureAnalysisListItem[]>([])
  const currentFA = ref<FeatureAnalysis | null>(null)
  const loading = ref<boolean>(false)
  let fetchAllInFlight: Promise<void> | null = null
  const error = ref<string | null>(null)
  const filterTerm = ref<string>('')
  const domains = ref<string[]>([])
  const aggregates = ref<FeatureAnalysisAggregate[]>([])

  // ============================================================================
  // Getters
  // ============================================================================

  const filteredFeatureAnalyses = computed(() => {
    if (!filterTerm.value) {
      return featureAnalyses.value
    }

    const term = filterTerm.value.toLowerCase()
    return featureAnalyses.value.filter(fa => fa.name.toLowerCase().includes(term))
  })

  const isEmpty = computed(() => featureAnalyses.value.length === 0)

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Fetch all feature analyses.
   * Concurrent callers share the in-flight request, so awaiting fetchAll()
   * always resolves against the response rather than the previous list.
   */
  async function fetchAll(): Promise<void> {
    if (fetchAllInFlight) {
      return fetchAllInFlight
    }

    loading.value = true
    error.value = null

    fetchAllInFlight = (async () => {
      try {
        const result = await listFeatureAnalyses()
        if (result.success) {
          featureAnalyses.value = result.data
        } else {
          error.value = result.error.message
          logger.error('FeatureAnalysesStore', 'Fetch feature analyses error', result.error)
          featureAnalyses.value = []
        }
      } finally {
        fetchAllInFlight = null
        loading.value = false
      }
    })()

    return fetchAllInFlight
  }

  /**
   * Fetch a single feature analysis by id.
   */
  async function fetchOne(id: number) {
    loading.value = true
    error.value = null

    const result = await getFeatureAnalysis(id)
    if (result.success) {
      currentFA.value = result.data
    } else {
      error.value = result.error.message
      logger.error('FeatureAnalysesStore', 'Fetch feature analysis error', result.error)
      currentFA.value = null
    }
    loading.value = false
  }

  /**
   * Create a new feature analysis.
   */
  async function create(fa: FeatureAnalysis): Promise<FeatureAnalysis | null> {
    loading.value = true
    error.value = null

    const result = await createFeatureAnalysis(fa)
    if (result.success) {
      await fetchAll()
      currentFA.value = result.data
      loading.value = false
      return result.data
    }
    error.value = result.error.message
    logger.error('FeatureAnalysesStore', 'Create feature analysis error', result.error)
    loading.value = false
    return null
  }

  /**
   * Update an existing feature analysis.
   */
  async function update(fa: FeatureAnalysis): Promise<FeatureAnalysis | null> {
    loading.value = true
    error.value = null

    const result = await updateFeatureAnalysis(fa)
    if (result.success) {
      await fetchAll()
      currentFA.value = result.data
      loading.value = false
      return result.data
    }
    error.value = result.error.message
    logger.error('FeatureAnalysesStore', 'Update feature analysis error', result.error)
    loading.value = false
    return null
  }

  /**
   * Delete a feature analysis.
   */
  async function remove(id: number): Promise<boolean> {
    loading.value = true
    error.value = null

    const result = await deleteFeatureAnalysis(id)
    if (result.success) {
      featureAnalyses.value = featureAnalyses.value.filter(fa => fa.id !== id)
      if (currentFA.value?.id === id) {
        currentFA.value = null
      }
      loading.value = false
      return true
    }
    error.value = result.error.message
    logger.error('FeatureAnalysesStore', 'Delete feature analysis error', result.error)
    loading.value = false
    return false
  }

  /**
   * Server-side copy of a feature analysis.
   */
  async function copy(id: number): Promise<FeatureAnalysis | null> {
    loading.value = true
    error.value = null

    const result = await copyFeatureAnalysis(id)
    if (result.success) {
      await fetchAll()
      currentFA.value = result.data
      loading.value = false
      return result.data
    }
    error.value = result.error.message
    logger.error('FeatureAnalysesStore', 'Copy feature analysis error', result.error)
    loading.value = false
    return null
  }

  /**
   * Set filter term (debounced).
   */
  const setFilter = debounce((term: string) => {
    filterTerm.value = term
  }, 300)

  /**
   * Lazily load CDM domains supported by feature analyses.
   * No-op if already populated.
   */
  async function loadDomains() {
    if (domains.value.length > 0) {
      return
    }
    const result = await listFeatureAnalysisDomains()
    if (result.success) {
      domains.value = result.data
    } else {
      error.value = result.error.message
      logger.error('FeatureAnalysesStore', 'Load domains error', result.error)
    }
  }

  /**
   * Lazily load FeatureExtraction aggregate options.
   * No-op if already populated.
   */
  async function loadAggregates() {
    if (aggregates.value.length > 0) {
      return
    }
    const result = await listFeatureAnalysisAggregates()
    if (result.success) {
      aggregates.value = result.data
    } else {
      error.value = result.error.message
      logger.error('FeatureAnalysesStore', 'Load aggregates error', result.error)
    }
  }

  /**
   * Clear error state.
   */
  function clearError() {
    error.value = null
  }

  /**
   * Clear current feature analysis.
   */
  function clearCurrent() {
    currentFA.value = null
  }

  // ============================================================================
  // Pythia partial-update entry-point
  // ============================================================================

  const isDirty = ref<boolean>(false)

  /**
   * Merge a partial change into `currentFA` from a pythia agent proposal.
   * Mutates in place so the open editor re-renders. Only the listed fields
   * are touched; everything else is preserved.
   */
  function applyProposal(payload: Partial<FeatureAnalysis>): boolean {
    if (!currentFA.value) return false
    let applied = false
    const fa = currentFA.value
    if (typeof payload.name === 'string' && payload.name.trim()) {
      fa.name = payload.name
      applied = true
    }
    if (typeof payload.description === 'string') {
      fa.description = payload.description
      applied = true
    }
    if (payload.type !== undefined) {
      fa.type = payload.type
      applied = true
    }
    if (payload.domain !== undefined) {
      fa.domain = payload.domain
      applied = true
    }
    if (payload.statType !== undefined) {
      fa.statType = payload.statType
      applied = true
    }
    if (payload.design !== undefined) {
      fa.design = payload.design as FeatureAnalysis['design']
      applied = true
    }
    if (applied) isDirty.value = true
    return applied
  }

  return {
    // State
    featureAnalyses,
    currentFA,
    loading,
    error,
    filterTerm,
    domains,
    aggregates,
    isDirty,

    // Getters
    filteredFeatureAnalyses,
    isEmpty,

    // Actions
    fetchAll,
    fetchOne,
    create,
    update,
    remove,
    copy,
    setFilter,
    loadDomains,
    loadAggregates,
    clearError,
    clearCurrent,
    applyProposal,
  }
})
