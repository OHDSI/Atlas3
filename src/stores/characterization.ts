/**
 * Characterization Store
 *
 * State management for Characterization CRUD operations. The list view is
 * the primary consumer right now; the version-preview / dirty-tracking
 * hooks (`previewVersion`, `isDirty`, `markDirty`, `markClean`) are
 * pre-wired here so the Phase 3B editor / versions tab can adopt them
 * without further store churn.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import {
  listCharacterizations,
  getCharacterization,
  createCharacterization,
  updateCharacterization,
  deleteCharacterization,
  copyCharacterization,
} from '@/services/characterization.service'
import type {
  CharacterizationDefinition,
  CharacterizationListItem,
} from '@/models/characterization.types'
import type { Version } from '@/components/versions/types'
import { logger } from '@/utils/logger'
import { debounce } from '@/utils/debounce'

export const useCharacterizationStore = defineStore('characterization', () => {
  // ============================================================================
  // State
  // ============================================================================

  const characterizations = ref<CharacterizationListItem[]>([])
  const currentCharacterization = ref<CharacterizationDefinition | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const filterTerm = ref<string>('')

  // Future-proofing for Phase 3B (versions tab, auto-save).
  const previewVersion = ref<Version | null>(null)
  const isDirty = ref<boolean>(false)

  // ============================================================================
  // Getters
  // ============================================================================

  const filteredCharacterizations = computed(() => {
    if (!filterTerm.value) {
      return characterizations.value
    }

    const term = filterTerm.value.toLowerCase()
    return characterizations.value.filter((cc) =>
      cc.name.toLowerCase().includes(term)
    )
  })

  const isEmpty = computed(() => characterizations.value.length === 0)

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Fetch all characterizations.
   * Skip if already loading to prevent concurrent calls.
   */
  async function fetchAll() {
    if (loading.value) {
      return
    }

    loading.value = true
    error.value = null

    try {
      characterizations.value = await listCharacterizations()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch characterizations'
      logger.error('CharacterizationStore', 'Fetch characterizations error', err)
      characterizations.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single characterization by id.
   */
  async function fetchOne(id: number) {
    loading.value = true
    error.value = null

    try {
      const cc = await getCharacterization(id)
      if (cc) {
        currentCharacterization.value = cc
      } else {
        error.value = 'Characterization not found'
        currentCharacterization.value = null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch characterization'
      logger.error('CharacterizationStore', 'Fetch characterization error', err)
      currentCharacterization.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new characterization.
   */
  async function create(
    def: CharacterizationDefinition
  ): Promise<CharacterizationDefinition | null> {
    loading.value = true
    error.value = null

    try {
      const created = await createCharacterization(def)
      if (created) {
        await fetchAll()
        currentCharacterization.value = created
        return created
      }
      error.value = 'Failed to create characterization'
      return null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create characterization'
      logger.error('CharacterizationStore', 'Create characterization error', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing characterization.
   */
  async function update(
    def: CharacterizationDefinition
  ): Promise<CharacterizationDefinition | null> {
    loading.value = true
    error.value = null

    try {
      const updated = await updateCharacterization(def)
      if (updated) {
        await fetchAll()
        currentCharacterization.value = updated
        return updated
      }
      error.value = 'Failed to update characterization'
      return null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update characterization'
      logger.error('CharacterizationStore', 'Update characterization error', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a characterization.
   */
  async function remove(id: number): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      await deleteCharacterization(id)
      characterizations.value = characterizations.value.filter((cc) => cc.id !== id)
      if (currentCharacterization.value?.id === id) {
        currentCharacterization.value = null
      }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete characterization'
      logger.error('CharacterizationStore', 'Delete characterization error', err)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Server-side copy of a characterization.
   */
  async function copy(id: number): Promise<CharacterizationDefinition | null> {
    loading.value = true
    error.value = null

    try {
      const copied = await copyCharacterization(id)
      if (copied) {
        await fetchAll()
        currentCharacterization.value = copied
        return copied
      }
      error.value = 'Failed to copy characterization'
      return null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to copy characterization'
      logger.error('CharacterizationStore', 'Copy characterization error', err)
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
   * Clear error state.
   */
  function clearError() {
    error.value = null
  }

  /**
   * Clear current characterization.
   */
  function clearCurrent() {
    currentCharacterization.value = null
  }

  /**
   * Mark the current characterization as dirty (has unsaved changes).
   * Phase 3B will hook this into auto-save.
   */
  function markDirty() {
    isDirty.value = true
  }

  /**
   * Mark the current characterization as clean (no unsaved changes).
   */
  function markClean() {
    isDirty.value = false
  }

  return {
    // State
    characterizations,
    currentCharacterization,
    loading,
    error,
    filterTerm,
    previewVersion,
    isDirty,

    // Getters
    filteredCharacterizations,
    isEmpty,

    // Actions
    fetchAll,
    fetchOne,
    create,
    update,
    remove,
    copy,
    setFilter,
    clearError,
    clearCurrent,
    markDirty,
    markClean,
  }
})
