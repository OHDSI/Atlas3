/**
 * Cohort Store
 * Manages current cohort definition state
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { CohortDefinition, CohortEvent } from '@/models/cohort.types'
import {
  saveCohortToCache,
  getCohortFromCache,
  deleteCohortFromCache,
} from '@/utils/cohort-cache'

const STORAGE_KEY = 'atlas3_cohort_draft'
const AUTO_SAVE_INTERVAL_MS = 30000 // 30 seconds

// Exponential backoff retry configuration
const RETRY_CONFIG = {
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  maxAttempts: 5,
  backoffMultiplier: 2,
}

interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

interface RetryState {
  attempt: number
  nextRetryAt: Date | null
  isRetrying: boolean
}

export const useCohortStore = defineStore('cohort', () => {
  // State
  const currentCohort = ref<CohortDefinition | null>(null)
  const isDirty = ref(false)
  const lastAutoSave = ref<Date | null>(null)

  // Validation state
  const validationErrors = ref<ValidationError[]>([])
  const isReadOnly = ref(false)

  // Network retry state
  const retryState = ref<RetryState>({
    attempt: 0,
    nextRetryAt: null,
    isRetrying: false,
  })

  // Auto-save timer
  let autoSaveTimer: ReturnType<typeof setInterval> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null

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

  const hasValidationErrors = computed(() => {
    return validationErrors.value.some((err) => err.severity === 'error')
  })

  const canSave = computed(() => {
    return !isReadOnly.value && !hasValidationErrors.value
  })

  // Actions
  function setCohort(cohort: CohortDefinition) {
    currentCohort.value = cohort
    isDirty.value = false
    validateCohort()
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

  // Validation logic
  function validateCohort() {
    const errors: ValidationError[] = []

    if (!currentCohort.value) {
      validationErrors.value = errors
      isReadOnly.value = false
      return
    }

    const cohort = currentCohort.value

    // Check required fields
    if (!cohort.name || cohort.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Cohort name is required',
        severity: 'error',
      })
    }

    if (cohort.entryEvents.length === 0) {
      errors.push({
        field: 'entryEvents',
        message: 'At least one entry event is required',
        severity: 'error',
      })
    }

    // Validate CollapseSettings if present
    if (cohort.collapseSettings) {
      if (!cohort.collapseSettings.collapseType) {
        errors.push({
          field: 'collapseSettings.collapseType',
          message: 'Collapse type is required when collapse settings are specified',
          severity: 'error',
        })
      }
    }

    // Validate CensorWindow dates
    if (cohort.censorWindow) {
      const { startDate, endDate } = cohort.censorWindow
      if (startDate && endDate) {
        // Ensure start comes before end (simplified check)
        if (
          startDate.dateField === 'END_DATE' &&
          endDate.dateField === 'START_DATE'
        ) {
          errors.push({
            field: 'censorWindow',
            message: 'Censor window start date must come before end date',
            severity: 'warning',
          })
        }
      }
    }

    validationErrors.value = errors
    isReadOnly.value = errors.some((err) => err.severity === 'error')
  }

  // Calculate exponential backoff delay
  function calculateBackoffDelay(attempt: number): number {
    const delay = Math.min(
      RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
      RETRY_CONFIG.maxDelay
    )
    return delay
  }

  // Load cohort with caching and retry
  async function loadCohort(cohortId: number | string): Promise<CohortDefinition | null> {
    try {
      // TODO: Replace with actual WebAPI call
      // For now, try to load from cache
      const cachedCohort = await getCohortFromCache(cohortId)

      if (cachedCohort) {
        setCohort(cachedCohort)
        console.log(`[CohortStore] Loaded cohort ${cohortId} from cache`)
        return cachedCohort
      }

      // If not in cache, would normally fetch from WebAPI here
      console.warn(`[CohortStore] Cohort ${cohortId} not found in cache and WebAPI not implemented`)
      return null
    } catch (error) {
      console.error('[CohortStore] Failed to load cohort:', error)

      // Try to get from cache as fallback
      return await getCachedCohort(cohortId)
    }
  }

  // Get cohort from cache (fallback when WebAPI fails)
  async function getCachedCohort(cohortId: number | string): Promise<CohortDefinition | null> {
    try {
      const cachedCohort = await getCohortFromCache(cohortId)

      if (cachedCohort) {
        console.log(`[CohortStore] Loaded cohort ${cohortId} from cache (fallback mode)`)
        setCohort(cachedCohort)
        return cachedCohort
      }

      return null
    } catch (error) {
      console.error('[CohortStore] Failed to retrieve cached cohort:', error)
      return null
    }
  }

  // Save cohort with retry logic
  async function saveCohort(): Promise<boolean> {
    if (!currentCohort.value) {
      console.warn('[CohortStore] No cohort to save')
      return false
    }

    if (!canSave.value) {
      console.warn('[CohortStore] Cannot save cohort: validation errors exist or read-only mode')
      return false
    }

    // Reset retry state
    retryState.value = {
      attempt: 0,
      nextRetryAt: null,
      isRetrying: false,
    }

    return await saveCohortWithRetry()
  }

  // Internal save with exponential backoff retry
  async function saveCohortWithRetry(): Promise<boolean> {
    if (!currentCohort.value) return false

    try {
      retryState.value.isRetrying = true

      // TODO: Replace with actual WebAPI save call
      // For now, just cache the cohort
      // Convert to plain object to avoid Pinia reactive proxy issues
      const plainCohort = JSON.parse(JSON.stringify(currentCohort.value))
      await saveCohortToCache(plainCohort, 'local')

      console.log(`[CohortStore] Cohort saved successfully`)
      markClean()
      retryState.value.isRetrying = false
      retryState.value.attempt = 0
      retryState.value.nextRetryAt = null

      return true
    } catch (error) {
      console.error(`[CohortStore] Save attempt ${retryState.value.attempt + 1} failed:`, error)

      // Check if we should retry
      if (retryState.value.attempt < RETRY_CONFIG.maxAttempts) {
        retryState.value.attempt++

        const delay = calculateBackoffDelay(retryState.value.attempt - 1)
        retryState.value.nextRetryAt = new Date(Date.now() + delay)

        console.log(
          `[CohortStore] Retrying in ${delay / 1000} seconds (attempt ${retryState.value.attempt}/${RETRY_CONFIG.maxAttempts})`
        )

        // Schedule retry
        return new Promise((resolve) => {
          if (retryTimer) {
            clearTimeout(retryTimer)
          }

          retryTimer = setTimeout(async () => {
            const result = await saveCohortWithRetry()
            resolve(result)
          }, delay)
        })
      } else {
        console.error(
          `[CohortStore] Max retry attempts (${RETRY_CONFIG.maxAttempts}) reached. Save failed.`
        )
        retryState.value.isRetrying = false
        return false
      }
    }
  }

  // Cancel pending retry
  function cancelRetry() {
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }

    retryState.value = {
      attempt: 0,
      nextRetryAt: null,
      isRetrying: false,
    }

    console.log('[CohortStore] Retry cancelled')
  }

  // Delete cohort from cache
  async function deleteCachedCohort(cohortId: number | string): Promise<void> {
    try {
      await deleteCohortFromCache(cohortId)
      console.log(`[CohortStore] Cohort ${cohortId} deleted from cache`)
    } catch (error) {
      console.error('[CohortStore] Failed to delete cached cohort:', error)
    }
  }

  return {
    // State
    currentCohort,
    isDirty,
    lastAutoSave,
    validationErrors,
    isReadOnly,
    retryState,
    // Getters
    hasEntryEvents,
    hasInclusionRules,
    entryEventCount,
    hasValidationErrors,
    canSave,
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
    // Validation
    validateCohort,
    // Caching and retry
    loadCohort,
    getCachedCohort,
    saveCohort,
    cancelRetry,
    deleteCachedCohort,
  }
})
