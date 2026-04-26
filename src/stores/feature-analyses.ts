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
    return featureAnalyses.value.filter((fa) =>
      fa.name.toLowerCase().includes(term)
    )
  })

  const isEmpty = computed(() => featureAnalyses.value.length === 0)

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Fetch all feature analyses.
   * Skip if already loading to prevent concurrent calls.
   */
  async function fetchAll() {
    if (loading.value) {
      return
    }

    loading.value = true
    error.value = null

    try {
      featureAnalyses.value = await listFeatureAnalyses()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch feature analyses'
      logger.error('FeatureAnalysesStore', 'Fetch feature analyses error', err)
      featureAnalyses.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single feature analysis by id.
   */
  async function fetchOne(id: number) {
    loading.value = true
    error.value = null

    try {
      const fa = await getFeatureAnalysis(id)
      if (fa) {
        currentFA.value = fa
      } else {
        error.value = 'Feature analysis not found'
        currentFA.value = null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch feature analysis'
      logger.error('FeatureAnalysesStore', 'Fetch feature analysis error', err)
      currentFA.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new feature analysis.
   */
  async function create(fa: FeatureAnalysis): Promise<FeatureAnalysis | null> {
    loading.value = true
    error.value = null

    try {
      const created = await createFeatureAnalysis(fa)
      if (created) {
        await fetchAll()
        currentFA.value = created
        return created
      }
      error.value = 'Failed to create feature analysis'
      return null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create feature analysis'
      logger.error('FeatureAnalysesStore', 'Create feature analysis error', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing feature analysis.
   */
  async function update(fa: FeatureAnalysis): Promise<FeatureAnalysis | null> {
    loading.value = true
    error.value = null

    try {
      const updated = await updateFeatureAnalysis(fa)
      if (updated) {
        await fetchAll()
        currentFA.value = updated
        return updated
      }
      error.value = 'Failed to update feature analysis'
      return null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update feature analysis'
      logger.error('FeatureAnalysesStore', 'Update feature analysis error', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a feature analysis.
   */
  async function remove(id: number): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      await deleteFeatureAnalysis(id)
      featureAnalyses.value = featureAnalyses.value.filter((fa) => fa.id !== id)
      if (currentFA.value?.id === id) {
        currentFA.value = null
      }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete feature analysis'
      logger.error('FeatureAnalysesStore', 'Delete feature analysis error', err)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Server-side copy of a feature analysis.
   */
  async function copy(id: number): Promise<FeatureAnalysis | null> {
    loading.value = true
    error.value = null

    try {
      const copied = await copyFeatureAnalysis(id)
      if (copied) {
        await fetchAll()
        currentFA.value = copied
        return copied
      }
      error.value = 'Failed to copy feature analysis'
      return null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to copy feature analysis'
      logger.error('FeatureAnalysesStore', 'Copy feature analysis error', err)
      return null
    } finally {
      loading.value = false
    }
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
    try {
      domains.value = await listFeatureAnalysisDomains()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load feature analysis domains'
      logger.error('FeatureAnalysesStore', 'Load domains error', err)
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
    try {
      aggregates.value = await listFeatureAnalysisAggregates()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load feature analysis aggregates'
      logger.error('FeatureAnalysesStore', 'Load aggregates error', err)
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

  return {
    // State
    featureAnalyses,
    currentFA,
    loading,
    error,
    filterTerm,
    domains,
    aggregates,

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
  }
})
