/**
 * Concept Sets Store
 * State management for concept set CRUD operations
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getAllConceptSets,
  getConceptSetById,
  createConceptSet,
  updateConceptSet,
  deleteConceptSet,
} from '@/services/concept-set.service'
import type { ConceptSet, ConceptSetListItem, ConceptSetItem } from '@/models/concept-set.types'
import type { Concept } from '@/models/concept-set.types'
import type { Version, VersionedAsset } from '@/components/versions/types'
import { conceptToConceptSetItem } from '@/utils/api-mappers'
import {
  getVersion as getVersionAPI,
} from '@/services/concept-set-versions.service'
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

  // ============================================================================
  // Getters
  // ============================================================================

  const filteredSets = computed(() => {
    if (!filterTerm.value) {
      return conceptSets.value
    }

    const term = filterTerm.value.toLowerCase()
    return conceptSets.value.filter((set) =>
      set.name.toLowerCase().includes(term)
    )
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
  async function create(set: Omit<ConceptSet, 'id' | 'createdDate' | 'createdBy' | 'modifiedDate' | 'modifiedBy'>) {
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
        conceptSets.value = conceptSets.value.filter((set) => set.id !== id)
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

    const exists = currentSet.value.items.some(
      (item) => item.conceptId === concept.conceptId
    )

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

    currentSet.value.items = currentSet.value.items.filter(
      (item) => item.conceptId !== conceptId
    )
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

    const item = currentSet.value.items.find(
      (item) => item.conceptId === conceptId
    )

    if (item) {
      item[flag] = !item[flag]
    }
  }

  /**
   * Check if a concept is in the current concept set
   */
  function isConceptInSet(conceptId: number): boolean {
    if (!currentSet.value) return false

    return currentSet.value.items.some(
      (item) => item.conceptId === conceptId
    )
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
      const versionedAsset: VersionedAsset<ConceptSet> = await getVersionAPI(conceptSetId, versionNumber)

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

    // Version preview (T018-T020)
    loadVersionPreview,
    clearPreviewVersion,
    savePreviewAsCurrent,
  }
})
