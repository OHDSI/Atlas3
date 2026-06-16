/**
 * Concept Sets Store
 * State management for concept set CRUD operations
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  getAllConceptSets,
  getConceptSetById,
  createConceptSet,
  updateConceptSet,
  deleteConceptSet,
} from '@/services/concept-set.service'
import type {
  ConceptSet,
  ConceptSetListItem,
  ConceptSetItem,
  ComparisonResultItem,
  ConceptSetExpression,
} from '@/models/concept-set.types'
import type { Concept } from '@/models/concept-set.types'
import type { Version, VersionedAsset } from '@/components/versions/types'
import { conceptToConceptSetItem, conceptSetItemToExpressionItem } from '@/utils/api-mappers'
import { getVersion as getVersionAPI } from '@/services/concept-set-versions.service'
import {
  getRecommendedConcepts,
  getConceptRecordCounts,
  compareConceptSets,
  resolveConceptSetExpression,
  getMappedSourceCodes,
} from '@/services/concept-search.service'
import { useWebAPIStore } from '@/stores/webapi'
import { logger } from '@/utils/logger'
import { debounce } from '@/utils/debounce'

export const useConceptSetsStore = defineStore('concept-sets', () => {
  // ============================================================================
  // State
  // ============================================================================

  const conceptSets = ref<ConceptSetListItem[]>([])
  const currentSet = ref<ConceptSet | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const filterTerm = ref<string>('')
  const editorOpen = ref<boolean>(false)

  // Version preview state (T017)
  const previewVersion = ref<Version | null>(null)
  const isDirty = ref<boolean>(false)

  const recommendedConcepts = ref<Concept[]>([])
  const loadingRecommended = ref<boolean>(false)
  const isRecommendedAvailable = ref<boolean>(true)
  const recommendedError = ref<string | null>(null)

  const comparison = ref<ComparisonResultItem[]>([])
  const comparisonOtherSet = ref<ConceptSet | null>(null)
  const loadingComparison = ref<boolean>(false)
  const comparisonError = ref<string | null>(null)

  const includedItems = ref<Concept[]>([])
  const includedLoading = ref<boolean>(false)
  const includedError = ref<string | null>(null)
  const includedFetchedAt = ref<number | null>(null)
  let includedAbortCtrl: AbortController | null = null

  // Mapped source codes (the "Source Codes" tab) — the non-standard codes that
  // map to the resolved/included standard concepts.
  const sourceCodeItems = ref<Concept[]>([])
  const sourceCodeLoading = ref<boolean>(false)
  const sourceCodeError = ref<string | null>(null)
  const sourceCodeFetchedAt = ref<number | null>(null)
  let sourceCodeAbortCtrl: AbortController | null = null

  // ============================================================================
  // Getters
  // ============================================================================

  const filteredSets = computed(() => {
    if (!filterTerm.value) {
      return conceptSets.value
    }

    const term = filterTerm.value.toLowerCase()
    return conceptSets.value.filter(set => set.name.toLowerCase().includes(term))
  })

  const isEmpty = computed(() => conceptSets.value.length === 0)

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Fetch all concept sets
   */
  async function fetchAll() {
    // Skip if already loading to prevent concurrent calls
    if (loading.value) {
      return
    }

    loading.value = true
    error.value = null

    try {
      conceptSets.value = await getAllConceptSets()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch concept sets'
      logger.error('ConceptSetsStore', 'Fetch concept sets error', err)
      conceptSets.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single concept set by ID with full details
   */
  async function fetchOne(id: number | string) {
    loading.value = true
    error.value = null

    try {
      const set = await getConceptSetById(id)
      if (set) {
        currentSet.value = set
      } else {
        error.value = 'Concept set not found'
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch concept set'
      logger.error('ConceptSetsStore', 'Fetch concept set error', err)
      currentSet.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new concept set
   */
  async function create(
    set: Omit<ConceptSet, 'id' | 'createdDate' | 'createdBy' | 'modifiedDate' | 'modifiedBy'>
  ) {
    loading.value = true
    error.value = null

    try {
      const created = await createConceptSet(set)
      if (created) {
        // Refresh the list
        await fetchAll()
        currentSet.value = created
        return created
      } else {
        error.value = 'Failed to create concept set'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create concept set'
      logger.error('ConceptSetsStore', 'Create concept set error', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing concept set
   */
  async function update(set: ConceptSet) {
    loading.value = true
    error.value = null

    try {
      const updated = await updateConceptSet(set)
      if (updated) {
        // Refresh the list
        await fetchAll()
        currentSet.value = updated
        return updated
      } else {
        error.value = 'Failed to update concept set'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update concept set'
      logger.error('ConceptSetsStore', 'Update concept set error', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a concept set
   */
  async function remove(id: number | string) {
    loading.value = true
    error.value = null

    try {
      const success = await deleteConceptSet(id)
      if (success) {
        // Remove from local list
        conceptSets.value = conceptSets.value.filter(set => set.id !== id)
        if (currentSet.value?.id === id) {
          currentSet.value = null
        }
        return true
      } else {
        error.value = 'Failed to delete concept set'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete concept set'
      logger.error('ConceptSetsStore', 'Delete concept set error', err)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Set filter term (debounced)
   */
  const setFilter = debounce((term: string) => {
    filterTerm.value = term
  }, 300)

  /**
   * Open editor for creating new concept set
   */
  function openCreateEditor() {
    currentSet.value = {
      name: '',
      items: [] as ConceptSetItem[],
    } as ConceptSet
    editorOpen.value = true
  }

  /**
   * Open editor for editing existing concept set
   */
  async function openEditEditor(id: number | string) {
    await fetchOne(id)
    editorOpen.value = true
  }

  /**
   * Close editor
   */
  function closeEditor() {
    editorOpen.value = false
    currentSet.value = null
    error.value = null
  }

  /**
   * Clear error
   */
  function clearError() {
    error.value = null
  }

  // ============================================================================
  // Phase 5: Concept Set Building Actions
  // ============================================================================

  /**
   * Add a concept to the current concept set
   */
  function addConceptToSet(concept: Concept) {
    if (!currentSet.value) {
      error.value = 'No concept set selected'
      return
    }

    const exists = currentSet.value.items.some(item => item.conceptId === concept.conceptId)

    if (exists) {
      error.value = 'Concept already exists in this set'
      return
    }

    const item: ConceptSetItem = conceptToConceptSetItem(concept)
    currentSet.value.items.push(item)
    error.value = null
  }

  /**
   * Remove a concept from the current concept set
   */
  function removeConceptFromSet(conceptId: number) {
    if (!currentSet.value) {
      error.value = 'No concept set selected'
      return
    }

    currentSet.value.items = currentSet.value.items.filter(item => item.conceptId !== conceptId)
  }

  /**
   * Toggle concept flags (descendants, mapped, exclude)
   */
  function toggleConceptFlag(
    conceptId: number,
    flag: 'includeDescendants' | 'includeMapped' | 'isExcluded'
  ) {
    if (!currentSet.value) {
      error.value = 'No concept set selected'
      return
    }

    const item = currentSet.value.items.find(item => item.conceptId === conceptId)

    if (item) {
      item[flag] = !item[flag]
    }
  }

  /**
   * Check if a concept is in the current concept set
   */
  function isConceptInSet(conceptId: number): boolean {
    if (!currentSet.value) return false

    return currentSet.value.items.some(item => item.conceptId === conceptId)
  }

  // ============================================================================
  // Version Preview Actions (T018-T020)
  // ============================================================================

  /**
   * Load a specific version for preview
   * Fetches the historical version data and sets it as current with preview flag
   * @param versionNumber - The version number to load
   */
  async function loadVersionPreview(versionNumber: number): Promise<void> {
    if (!currentSet.value?.id) {
      logger.error('ConceptSetsStore', 'Cannot load version preview: no current concept set ID')
      throw new Error('No current concept set ID')
    }

    const conceptSetId = currentSet.value.id
    if (typeof conceptSetId !== 'number') {
      logger.error('ConceptSetsStore', 'Concept set ID must be a number for version preview')
      throw new Error('Concept set ID must be a number')
    }

    try {
      loading.value = true
      const versionedAsset: VersionedAsset<ConceptSet> = await getVersionAPI(
        conceptSetId,
        versionNumber
      )

      // Set preview version metadata
      previewVersion.value = versionedAsset.versionDTO

      // Replace current concept set with historical data
      currentSet.value = versionedAsset.entityDTO

      // Mark as clean (read-only mode, no editing)
      isDirty.value = false

      logger.debug('ConceptSetsStore', `Loaded version ${versionNumber} for preview`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : `Failed to load version ${versionNumber}`
      logger.error('ConceptSetsStore', `Failed to load version ${versionNumber}`, err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Clear preview state and reload current version
   * Returns to normal editing mode
   */
  async function clearPreviewVersion(): Promise<void> {
    const wasPreviewingId = currentSet.value?.id

    // Clear preview state
    previewVersion.value = null

    // Reload current version if we were previewing
    if (wasPreviewingId) {
      await fetchOne(wasPreviewingId)
    }

    logger.debug('ConceptSetsStore', 'Preview cleared, returned to current version')
  }

  /**
   * Save the currently previewed version as the new current version
   * Creates a new version with the historical data
   */
  async function savePreviewAsCurrent(): Promise<boolean> {
    if (!previewVersion.value) {
      logger.error('ConceptSetsStore', 'Cannot save preview: not in preview mode')
      return false
    }

    if (!currentSet.value) {
      logger.error('ConceptSetsStore', 'Cannot save preview: no concept set data')
      return false
    }

    try {
      // Save the current (historical) data as new version
      const result = await update(currentSet.value)

      if (result) {
        // Clear preview state after successful save
        previewVersion.value = null
        isDirty.value = false
        logger.debug('ConceptSetsStore', 'Preview saved as current version')
        return true
      }

      return false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save preview as current'
      logger.error('ConceptSetsStore', 'Failed to save preview as current', err)
      return false
    }
  }

  async function loadRecommendedConcepts(sourceKey: string): Promise<void> {
    const seed = (currentSet.value?.items ?? [])
      .filter(item => !item.isExcluded)
      .map(item => item.conceptId)

    if (seed.length === 0) {
      recommendedConcepts.value = []
      isRecommendedAvailable.value = true
      recommendedError.value = null
      return
    }

    loadingRecommended.value = true
    recommendedError.value = null

    try {
      const result = await getRecommendedConcepts(sourceKey, seed)

      if (!result.available) {
        isRecommendedAvailable.value = false
        recommendedConcepts.value = []
        return
      }

      const existingIds = new Set((currentSet.value?.items ?? []).map(item => item.conceptId))
      const candidates = result.concepts.filter(c => !existingIds.has(c.conceptId))

      isRecommendedAvailable.value = true

      const ids = candidates.map(c => c.conceptId)
      const counts = await getConceptRecordCounts(sourceKey, ids)
      const enriched = candidates.map(c => {
        const rc = counts.get(c.conceptId)
        if (!rc) return c
        return {
          ...c,
          recordCount: rc.recordCount,
          descendantRecordCount: rc.descendantRecordCount,
          personCount: rc.personCount,
          descendantPersonCount: rc.descendantPersonCount,
        }
      })

      recommendedConcepts.value = enriched
    } catch (err) {
      logger.error('ConceptSetsStore', 'Failed to load recommended concepts', err)
      recommendedError.value = String(err)
      recommendedConcepts.value = []
    } finally {
      loadingRecommended.value = false
    }
  }

  async function loadComparison(sourceKey: string, otherSetId: number | string): Promise<void> {
    if (!currentSet.value || (currentSet.value.items?.length ?? 0) === 0) {
      comparison.value = []
      comparisonOtherSet.value = null
      comparisonError.value = 'No concept set loaded'
      return
    }

    if (otherSetId === currentSet.value.id) {
      comparison.value = []
      comparisonOtherSet.value = null
      comparisonError.value = 'Cannot compare a concept set with itself'
      return
    }

    loadingComparison.value = true
    comparisonError.value = null

    try {
      const cs2 = await getConceptSetById(otherSetId)
      if (!cs2) {
        comparisonError.value = 'Other concept set not found'
        comparison.value = []
        comparisonOtherSet.value = null
        return
      }

      const expr1: ConceptSetExpression = {
        items: currentSet.value.items.map(conceptSetItemToExpressionItem),
      }
      const expr2: ConceptSetExpression = {
        items: (cs2.items ?? []).map(conceptSetItemToExpressionItem),
      }

      const result = await compareConceptSets(sourceKey, expr1, expr2)
      comparison.value = result
      comparisonOtherSet.value = cs2
    } catch (err) {
      logger.error('ConceptSetsStore', 'Failed to load concept set comparison', err)
      comparisonError.value = String(err)
      comparison.value = []
      comparisonOtherSet.value = null
    } finally {
      loadingComparison.value = false
    }
  }

  // ============================================================================
  // Included concepts
  // ============================================================================

  async function resolveIncluded(sourceKey?: string): Promise<void> {
    const items = currentSet.value?.items ?? []
    if (items.length === 0) {
      includedAbortCtrl?.abort()
      includedAbortCtrl = null
      includedItems.value = []
      includedError.value = null
      includedLoading.value = false
      return
    }

    const key = sourceKey || useWebAPIStore().getValidVocabularySource()
    if (!key) {
      includedError.value = 'No vocabulary source available'
      return
    }

    includedAbortCtrl?.abort()
    const ctrl = new AbortController()
    includedAbortCtrl = ctrl

    includedLoading.value = true
    includedError.value = null

    const expression: ConceptSetExpression = {
      items: items.map(conceptSetItemToExpressionItem),
    }

    try {
      const concepts = await resolveConceptSetExpression(key, expression, ctrl.signal)
      if (ctrl !== includedAbortCtrl) return
      includedItems.value = concepts
      includedFetchedAt.value = Date.now()
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      if (ctrl !== includedAbortCtrl) return
      includedError.value = err instanceof Error ? err.message : 'Failed to resolve concept set'
      logger.error('ConceptSetsStore', 'resolveIncluded error', err)
    } finally {
      if (ctrl === includedAbortCtrl) {
        includedLoading.value = false
      }
    }
  }

  function resetIncluded(): void {
    includedAbortCtrl?.abort()
    includedAbortCtrl = null
    includedItems.value = []
    includedLoading.value = false
    includedError.value = null
    includedFetchedAt.value = null
    resetSourceCodes()
  }

  async function resolveSourceCodes(sourceKey?: string): Promise<void> {
    const conceptIds = includedItems.value.map((c) => c.conceptId)
    if (conceptIds.length === 0) {
      sourceCodeAbortCtrl?.abort()
      sourceCodeAbortCtrl = null
      sourceCodeItems.value = []
      sourceCodeError.value = null
      sourceCodeLoading.value = false
      return
    }

    const key = sourceKey || useWebAPIStore().getValidVocabularySource()
    if (!key) {
      sourceCodeError.value = 'No vocabulary source available'
      return
    }

    sourceCodeAbortCtrl?.abort()
    const ctrl = new AbortController()
    sourceCodeAbortCtrl = ctrl

    sourceCodeLoading.value = true
    sourceCodeError.value = null

    try {
      const concepts = await getMappedSourceCodes(key, conceptIds, ctrl.signal)
      if (ctrl !== sourceCodeAbortCtrl) return
      sourceCodeItems.value = concepts
      sourceCodeFetchedAt.value = Date.now()
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      if (ctrl !== sourceCodeAbortCtrl) return
      sourceCodeError.value = err instanceof Error ? err.message : 'Failed to resolve source codes'
      logger.error('ConceptSetsStore', 'resolveSourceCodes error', err)
    } finally {
      if (ctrl === sourceCodeAbortCtrl) {
        sourceCodeLoading.value = false
      }
    }
  }

  function resetSourceCodes(): void {
    sourceCodeAbortCtrl?.abort()
    sourceCodeAbortCtrl = null
    sourceCodeItems.value = []
    sourceCodeLoading.value = false
    sourceCodeError.value = null
    sourceCodeFetchedAt.value = null
  }

  // ============================================================================
  // Pythia partial-update entry-point
  // ============================================================================

  /**
   * Merge a partial change into `currentSet` from a pythia agent proposal.
   * Mutates in place so the open editor re-renders; callers should pre-shape
   * `payload.items` into full ConceptSetItem records when present.
   *
   * Returns true when something was applied; false if no editor is open
   * or the payload had no recognised fields.
   */
  function applyProposal(payload: {
    name?: string
    description?: string
    itemsToAdd?: ConceptSetItem[]
    items?: ConceptSetItem[]
  }): boolean {
    if (!currentSet.value) return false
    let applied = false

    if (typeof payload.name === 'string' && payload.name.trim()) {
      currentSet.value.name = payload.name
      applied = true
    }
    if (typeof payload.description === 'string') {
      currentSet.value.description = payload.description
      applied = true
    }
    if (Array.isArray(payload.items)) {
      // Full replace
      currentSet.value.items = payload.items
      applied = true
    } else if (Array.isArray(payload.itemsToAdd) && payload.itemsToAdd.length > 0) {
      // Append-only path: skip duplicates by conceptId
      const existing = new Set(currentSet.value.items.map(it => it.conceptId))
      for (const item of payload.itemsToAdd) {
        if (!existing.has(item.conceptId)) {
          currentSet.value.items.push(item)
          existing.add(item.conceptId)
        }
      }
      applied = true
    }

    if (applied) isDirty.value = true
    return applied
  }

  // ============================================================================
  // Debounced watcher: auto-resolve included list on item edits
  // ============================================================================

  const debouncedResolveIncluded = debounce(() => {
    void resolveIncluded()
  }, 500)

  watch(
    () => currentSet.value?.items,
    (items) => {
      if (!items || items.length === 0) {
        debouncedResolveIncluded.cancel()
        includedAbortCtrl?.abort()
        includedAbortCtrl = null
        includedItems.value = []
        includedError.value = null
        includedLoading.value = false
        includedFetchedAt.value = null
        sourceCodeAbortCtrl?.abort()
        sourceCodeAbortCtrl = null
        sourceCodeItems.value = []
        sourceCodeError.value = null
        sourceCodeLoading.value = false
        sourceCodeFetchedAt.value = null
        return
      }
      debouncedResolveIncluded()
    },
    { deep: true },
  )

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    conceptSets,
    currentSet,
    loading,
    error,
    filterTerm,
    editorOpen,
    previewVersion,
    isDirty,
    recommendedConcepts,
    loadingRecommended,
    isRecommendedAvailable,
    recommendedError,
    comparison,
    comparisonOtherSet,
    loadingComparison,
    comparisonError,

    // Getters
    filteredSets,
    isEmpty,

    // Actions
    fetchAll,
    fetchOne,
    create,
    update,
    remove,
    setFilter,
    openCreateEditor,
    openEditEditor,
    closeEditor,
    clearError,

    // Phase 5: Building actions
    addConceptToSet,
    removeConceptFromSet,
    toggleConceptFlag,
    isConceptInSet,

    // Pythia agent partial-update entry-point
    applyProposal,

    // Version preview (T018-T020)
    loadVersionPreview,
    clearPreviewVersion,
    savePreviewAsCurrent,
    loadRecommendedConcepts,
    loadComparison,

    // Included concepts
    includedItems,
    includedLoading,
    includedError,
    includedFetchedAt,
    resolveIncluded,
    resetIncluded,

    // Source codes (mapped non-standard codes for included concepts)
    sourceCodeItems,
    sourceCodeLoading,
    sourceCodeError,
    sourceCodeFetchedAt,
    resolveSourceCodes,
    resetSourceCodes,
  }
})
