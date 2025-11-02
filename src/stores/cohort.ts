/**
 * Cohort Store
 * Manages current cohort definition state
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { CohortDefinition, CohortEvent } from '@/models/cohort.types'

const STORAGE_KEY = 'atlas3_cohort_draft'
const AUTO_SAVE_INTERVAL_MS = 30000 // 30 seconds

export const useCohortStore = defineStore('cohort', () => {
  // State
  const currentCohort = ref<CohortDefinition | null>(null)
  const isDirty = ref(false)
  const lastAutoSave = ref<Date | null>(null)

  // Auto-save timer
  let autoSaveTimer: ReturnType<typeof setInterval> | null = null

  // Getters
  const hasEntryEvents = computed(() => {
    return (currentCohort.value?.entryEvents.length ?? 0) > 0
  })

  const hasInclusionRules = computed(() => {
    return (currentCohort.value?.inclusionRules.length ?? 0) > 0
  })

  const entryEventCount = computed(() => {
    return currentCohort.value?.entryEvents.length ?? 0
  })

  // Actions
  function setCohort(cohort: CohortDefinition) {
    currentCohort.value = cohort
    isDirty.value = false
  }

  function createNewCohort() {
    currentCohort.value = {
      name: 'New Cohort',
      entryEvents: [],
      qualifyingLimit: 'ALL',
      inclusionRules: [],
      conceptSets: [],
    }
    isDirty.value = false
  }

  function addEntryEvent(event: CohortEvent) {
    if (!currentCohort.value) {
      createNewCohort()
    }
    currentCohort.value?.entryEvents.push(event)
    isDirty.value = true
  }

  function removeEntryEvent(eventId: string) {
    if (!currentCohort.value) return

    const index = currentCohort.value.entryEvents.findIndex(e => e.id === eventId)
    if (index !== -1) {
      currentCohort.value.entryEvents.splice(index, 1)
      isDirty.value = true
    }
  }

  function updateEntryEvent(eventId: string, updatedEvent: CohortEvent) {
    if (!currentCohort.value) return

    const index = currentCohort.value.entryEvents.findIndex(e => e.id === eventId)
    if (index !== -1) {
      currentCohort.value.entryEvents[index] = updatedEvent
      isDirty.value = true
    }
  }

  function clearCohort() {
    currentCohort.value = null
    isDirty.value = false
  }

  function markClean() {
    isDirty.value = false
  }

  function markDirty() {
    isDirty.value = true
  }

  // T122: SessionStorage auto-save
  function saveToDraft() {
    if (!currentCohort.value || !isDirty.value) return

    try {
      const draftData = {
        cohort: currentCohort.value,
        timestamp: new Date().toISOString(),
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draftData))
      lastAutoSave.value = new Date()
      console.log('[CohortStore] Draft auto-saved at', lastAutoSave.value)
    } catch (error) {
      console.error('[CohortStore] Failed to save draft:', error)
    }
  }

  // T123: SessionStorage restore
  function restoreFromDraft(): boolean {
    try {
      const draftJson = sessionStorage.getItem(STORAGE_KEY)
      if (!draftJson) return false

      const draftData = JSON.parse(draftJson)
      if (draftData.cohort) {
        currentCohort.value = draftData.cohort
        isDirty.value = true // Mark as dirty since it's a draft
        console.log('[CohortStore] Draft restored from', draftData.timestamp)
        return true
      }
    } catch (error) {
      console.error('[CohortStore] Failed to restore draft:', error)
      sessionStorage.removeItem(STORAGE_KEY)
    }
    return false
  }

  function clearDraft() {
    sessionStorage.removeItem(STORAGE_KEY)
    lastAutoSave.value = null
  }

  function startAutoSave() {
    if (autoSaveTimer) return // Already running

    autoSaveTimer = setInterval(() => {
      saveToDraft()
    }, AUTO_SAVE_INTERVAL_MS)

    console.log('[CohortStore] Auto-save started (every 30s)')
  }

  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
      console.log('[CohortStore] Auto-save stopped')
    }
  }

  // Watch for changes and trigger auto-save timer
  watch(isDirty, (dirty) => {
    if (dirty) {
      startAutoSave()
    }
  })

  return {
    // State
    currentCohort,
    isDirty,
    lastAutoSave,
    // Getters
    hasEntryEvents,
    hasInclusionRules,
    entryEventCount,
    // Actions
    setCohort,
    createNewCohort,
    addEntryEvent,
    removeEntryEvent,
    updateEntryEvent,
    clearCohort,
    markClean,
    markDirty,
    // Draft management
    saveToDraft,
    restoreFromDraft,
    clearDraft,
    startAutoSave,
    stopAutoSave,
  }
})
