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
import { useExecutionPolling, isTerminalStatus } from '@/composables/useExecutionPolling'
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
    return characterizations.value.filter(cc => cc.name.toLowerCase().includes(term))
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

    const result = await listCharacterizations()
    if (result.success) {
      characterizations.value = result.data
    } else {
      error.value = result.error.message
      logger.error('CharacterizationStore', 'Fetch characterizations error', result.error)
      characterizations.value = []
    }
    loading.value = false
  }

  /**
   * Fetch a single characterization by id.
   */
  async function fetchOne(id: number) {
    loading.value = true
    error.value = null

    const result = await getCharacterization(id)
    if (result.success) {
      currentCharacterization.value = result.data
    } else {
      error.value = result.error.message
      logger.error('CharacterizationStore', 'Fetch characterization error', result.error)
      currentCharacterization.value = null
    }
    loading.value = false
  }

  /**
   * Create a new characterization.
   */
  async function create(
    def: CharacterizationDefinition
  ): Promise<CharacterizationDefinition | null> {
    loading.value = true
    error.value = null

    const result = await createCharacterization(def)
    if (result.success) {
      await fetchAll()
      currentCharacterization.value = result.data
      loading.value = false
      return result.data
    }
    error.value = result.error.message
    logger.error('CharacterizationStore', 'Create characterization error', result.error)
    loading.value = false
    return null
  }

  /**
   * Update an existing characterization.
   */
  async function update(
    def: CharacterizationDefinition
  ): Promise<CharacterizationDefinition | null> {
    loading.value = true
    error.value = null

    const result = await updateCharacterization(def)
    if (result.success) {
      await fetchAll()
      currentCharacterization.value = result.data
      loading.value = false
      return result.data
    }
    error.value = result.error.message
    logger.error('CharacterizationStore', 'Update characterization error', result.error)
    loading.value = false
    return null
  }

  /**
   * Delete a characterization.
   */
  async function remove(id: number): Promise<boolean> {
    loading.value = true
    error.value = null

    const result = await deleteCharacterization(id)
    if (result.success) {
      characterizations.value = characterizations.value.filter(cc => cc.id !== id)
      if (currentCharacterization.value?.id === id) {
        currentCharacterization.value = null
      }
      loading.value = false
      return true
    }
    error.value = result.error.message
    logger.error('CharacterizationStore', 'Delete characterization error', result.error)
    loading.value = false
    return false
  }

  /**
   * Server-side copy of a characterization.
   */
  async function copy(id: number): Promise<CharacterizationDefinition | null> {
    loading.value = true
    error.value = null

    const result = await copyCharacterization(id)
    if (result.success) {
      await fetchAll()
      currentCharacterization.value = result.data
      loading.value = false
      return result.data
    }
    error.value = result.error.message
    logger.error('CharacterizationStore', 'Copy characterization error', result.error)
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

    const result = await listCharacterizationExecutions(characterizationId)
    if (result.success) {
      executions.value = [...result.data].sort(sortByStartTimeDesc)
    } else {
      executionsError.value = result.error.message
      logger.error('CharacterizationStore', 'Load executions error', result.error)
      executions.value = []
    }
    executionsLoading.value = false
  }

  /**
   * Trigger a new characterization generation against the given source.
   * Prepends the returned execution and returns it to the caller.
   */
  async function runExecution(
    characterizationId: number,
    sourceKey: string
  ): Promise<CharacterizationExecution | null> {
    executionsError.value = null

    const result = await generateCharacterization(characterizationId, sourceKey)
    if (!result.success) {
      executionsError.value = result.error.message
      logger.error('CharacterizationStore', 'Run execution error', result.error)
      throw new Error(result.error.message)
    }

    const created = result.data
    // Started, but the response carried nothing trackable - fall back to the
    // canonical list instead of inserting/polling a synthetic row.
    if (created === null) {
      await loadExecutions(characterizationId)
      return null
    }
    // Replace any existing execution with the same generation id; otherwise prepend.
    const existingIdx =
      created.id != null ? executions.value.findIndex(e => e.id === created.id) : -1
    if (existingIdx >= 0) {
      executions.value.splice(existingIdx, 1, created)
    } else {
      executions.value = [created, ...executions.value]
    }

    return created
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

    const result = await cancelCharacterizationGeneration(characterizationId, sourceKey)
    if (!result.success) {
      executionsError.value = result.error.message
      logger.error('CharacterizationStore', 'Cancel execution error', result.error)
      throw new Error(result.error.message)
    }
    if (generationId != null) {
      stopPolling(generationId)
    }
    await loadExecutions(characterizationId)
  }

  function updateExecutionInList(updated: CharacterizationExecution): void {
    const idx = executions.value.findIndex(e => e.id === updated.id)
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
          const result = await getCharacterizationExecution(generationId)
          if (!result.success) throw result.error
          return result.data
        },
        isTerminal: item => isTerminalStatus(item.status),
        onUpdate: item => {
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

  // ============================================================================
  // Pythia partial-update entry-point
  // ============================================================================

  /**
   * Merge a partial change into `currentCharacterization` from a pythia
   * agent proposal. Mutates in place so the open editor re-renders. Only
   * the listed fields are touched; cohorts/featureAnalyses arrays accept
   * either a full replacement (`cohorts` / `featureAnalyses`) or an
   * append-only set (`cohortsToAdd` / `featureAnalysesToAdd`).
   */
  function applyProposal(payload: {
    name?: string
    description?: string
    cohorts?: Array<{ id: number; name: string }>
    cohortsToAdd?: Array<{ id: number; name: string }>
    featureAnalyses?: Array<{ id: number; name: string }>
    featureAnalysesToAdd?: Array<{ id: number; name: string }>
  }): boolean {
    if (!currentCharacterization.value) return false
    let applied = false
    const ch = currentCharacterization.value
    if (typeof payload.name === 'string' && payload.name.trim()) {
      ch.name = payload.name
      applied = true
    }
    if (typeof payload.description === 'string') {
      ch.description = payload.description
      applied = true
    }
    if (Array.isArray(payload.cohorts)) {
      ch.cohorts = payload.cohorts
      applied = true
    } else if (Array.isArray(payload.cohortsToAdd) && payload.cohortsToAdd.length > 0) {
      const seen = new Set((ch.cohorts ?? []).map(c => c.id))
      ch.cohorts = [...(ch.cohorts ?? [])]
      for (const c of payload.cohortsToAdd) {
        if (!seen.has(c.id)) {
          ch.cohorts.push(c)
          seen.add(c.id)
        }
      }
      applied = true
    }
    if (Array.isArray(payload.featureAnalyses)) {
      ch.featureAnalyses = payload.featureAnalyses
      applied = true
    } else if (Array.isArray(payload.featureAnalysesToAdd) && payload.featureAnalysesToAdd.length > 0) {
      const seen = new Set((ch.featureAnalyses ?? []).map(fa => fa.id))
      ch.featureAnalyses = [...(ch.featureAnalyses ?? [])]
      for (const fa of payload.featureAnalysesToAdd) {
        if (!seen.has(fa.id)) {
          ch.featureAnalyses.push(fa)
          seen.add(fa.id)
        }
      }
      applied = true
    }
    if (applied) markDirty()
    return applied
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
    applyProposal,
    loadExecutions,
    runExecution,
    cancelExecution,
    pollExecution,
    stopPolling,
    dispose,
  }
})
