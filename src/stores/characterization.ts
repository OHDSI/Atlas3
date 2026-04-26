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
  listCharacterizationExecutions,
  getCharacterizationExecution,
  generateCharacterization,
  cancelCharacterizationGeneration,
} from '@/services/characterization.service'
import type {
  CharacterizationDefinition,
  CharacterizationExecution,
  CharacterizationListItem,
} from '@/models/characterization.types'
import type { Version } from '@/components/versions/types'
import { logger } from '@/utils/logger'
import { debounce } from '@/utils/debounce'
import {
  useExecutionPolling,
  isTerminalStatus,
} from '@/composables/useExecutionPolling'
import { effectScope } from 'vue'

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

  // Phase 4: executions and polling.
  const executions = ref<CharacterizationExecution[]>([])
  const executionsLoading = ref<boolean>(false)
  const executionsError = ref<string | null>(null)
  // Map generationId -> stop function so callers can stop polling cleanly.
  const pollingHandles = ref<Map<number, () => void>>(new Map())
  // Each polling helper owns its own effect scope so we can dispose handles
  // independently when an execution reaches a terminal state.
  const pollingScopes = new Map<number, ReturnType<typeof effectScope>>()

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

  // ============================================================================
  // Executions / polling
  // ============================================================================

  function sortByStartTimeDesc(a: CharacterizationExecution, b: CharacterizationExecution) {
    const aStart = a.startTime ?? 0
    const bStart = b.startTime ?? 0
    return bStart - aStart
  }

  /**
   * Load executions for a characterization, sorted newest-first.
   */
  async function loadExecutions(characterizationId: number): Promise<void> {
    executionsLoading.value = true
    executionsError.value = null

    try {
      const list = await listCharacterizationExecutions(characterizationId)
      executions.value = [...list].sort(sortByStartTimeDesc)
    } catch (err) {
      executionsError.value = err instanceof Error ? err.message : 'Failed to load executions'
      logger.error('CharacterizationStore', 'Load executions error', err)
      executions.value = []
    } finally {
      executionsLoading.value = false
    }
  }

  /**
   * Trigger a new characterization generation against the given source.
   * Prepends the returned execution and returns it to the caller.
   */
  async function runExecution(
    characterizationId: number,
    sourceKey: string
  ): Promise<CharacterizationExecution> {
    executionsError.value = null

    try {
      const created = await generateCharacterization(characterizationId, sourceKey)

      // Replace any existing execution with the same generation id; otherwise prepend.
      const existingIdx = created.id != null
        ? executions.value.findIndex((e) => e.id === created.id)
        : -1
      if (existingIdx >= 0) {
        executions.value.splice(existingIdx, 1, created)
      } else {
        executions.value = [created, ...executions.value]
      }

      return created
    } catch (err) {
      executionsError.value = err instanceof Error ? err.message : 'Failed to start generation'
      logger.error('CharacterizationStore', 'Run execution error', err)
      throw err
    }
  }

  /**
   * Cancel a characterization generation. Stops polling for the matching
   * generation id (if registered) and refreshes the executions list.
   */
  async function cancelExecution(
    characterizationId: number,
    sourceKey: string,
    generationId?: number
  ): Promise<void> {
    executionsError.value = null

    try {
      await cancelCharacterizationGeneration(characterizationId, sourceKey)
      if (generationId != null) {
        stopPolling(generationId)
      }
      await loadExecutions(characterizationId)
    } catch (err) {
      executionsError.value = err instanceof Error ? err.message : 'Failed to cancel generation'
      logger.error('CharacterizationStore', 'Cancel execution error', err)
      throw err
    }
  }

  function updateExecutionInList(updated: CharacterizationExecution): void {
    const idx = executions.value.findIndex((e) => e.id === updated.id)
    if (idx >= 0) {
      executions.value.splice(idx, 1, updated)
    } else {
      executions.value = [updated, ...executions.value]
    }
  }

  /**
   * Begin polling a single execution. The handle is registered in
   * `pollingHandles` so it can be stopped explicitly via `stopPolling`.
   * `onTerminal` is called once when the execution reaches a terminal state.
   */
  function pollExecution(
    generationId: number,
    onTerminal?: (execution: CharacterizationExecution) => void
  ): void {
    // Avoid registering two pollers for the same id.
    if (pollingHandles.value.has(generationId)) {
      return
    }

    const scope = effectScope()

    function cleanup() {
      pollingHandles.value.delete(generationId)
      pollingScopes.delete(generationId)
    }

    scope.run(() => {
      const polling = useExecutionPolling<CharacterizationExecution>({
        fetcher: async () => {
          const item = await getCharacterizationExecution(generationId)
          return item
        },
        isTerminal: (item) => isTerminalStatus(item.status),
        onUpdate: (item) => {
          updateExecutionInList(item)
          if (isTerminalStatus(item.status)) {
            try {
              onTerminal?.(item)
            } catch (err) {
              logger.error('CharacterizationStore', 'pollExecution onTerminal threw', err)
            }
            // Polling will stop itself via isTerminal — clean up the registry.
            cleanup()
          }
        },
      })

      // Wrap stop so explicit cancellation also clears the registry.
      const stopAndCleanup = () => {
        polling.stop()
        scope.stop()
        cleanup()
      }

      pollingHandles.value.set(generationId, stopAndCleanup)
      pollingScopes.set(generationId, scope)

      void polling.start()
    })
  }

  /**
   * Stop polling the given generation id (if registered).
   */
  function stopPolling(generationId: number): void {
    const stop = pollingHandles.value.get(generationId)
    if (stop) {
      stop()
    }
  }

  /**
   * Stop all active polling. Call when the store is being torn down or
   * the user navigates away from anything that needs live updates.
   */
  function dispose(): void {
    for (const [, stop] of pollingHandles.value) {
      try {
        stop()
      } catch (err) {
        logger.error('CharacterizationStore', 'dispose stop threw', err)
      }
    }
    pollingHandles.value.clear()
    pollingScopes.clear()
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
    executions,
    executionsLoading,
    executionsError,
    pollingHandles,

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
    loadExecutions,
    runExecution,
    cancelExecution,
    pollExecution,
    stopPolling,
    dispose,
  }
})
