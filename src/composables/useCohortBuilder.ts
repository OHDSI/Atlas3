/**
 * useCohortBuilder Composable
 * Provides cohort building functionality
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCohortStore } from '@/stores/cohort'
import type { CohortEvent } from '@/models/cohort.types'
import type { ConceptSetReference } from '@/models/cohort.types'
import { v4 as uuidv4 } from 'uuid'

export function useCohortBuilder() {
  const router = useRouter()
  const cohortStore = useCohortStore()

  // Computed
  const currentCohort = computed(() => cohortStore.currentCohort)
  const isDirty = computed(() => cohortStore.isDirty)
  const canSave = computed(() => {
    if (!cohortStore.currentCohort) return false
    const hasName = cohortStore.currentCohort.name.trim().length > 0
    const hasEvents = cohortStore.entryEventCount > 0
    return hasName && hasEvents
  })

  // Actions
  function createNewCohort() {
    cohortStore.createNewCohort()
  }

  function loadCohort(_id: number | string) {
    // TODO: Load from WebAPI when backend integration is ready
    // For now, just ensure we have a cohort in the store
    if (!cohortStore.currentCohort) {
      cohortStore.createNewCohort()
    }
  }

  function addEntryEvent(criteriaType?: string) {
    const newEvent: CohortEvent = {
      id: uuidv4(),
      criteriaType: (criteriaType as CohortEvent['criteriaType']) || 'ConditionOccurrence',
      attributes: [],
    }

    cohortStore.addEntryEvent(newEvent)
    return newEvent.id
  }

  function removeEntryEvent(eventId: string) {
    cohortStore.removeEntryEvent(eventId)
  }

  function updateEntryEvent(eventId: string, updatedEvent: CohortEvent) {
    cohortStore.updateEntryEvent(eventId, updatedEvent)
  }

  function saveCohort(name: string, description?: string) {
    if (!canSave.value) {
      throw new Error('Cannot save: cohort must have a name and at least one entry event')
    }

    if (!cohortStore.currentCohort) {
      throw new Error('No cohort to save')
    }

    // Gather concept sets from events
    const conceptSetRefs = new Map<number | string, ConceptSetReference>()
    for (const event of cohortStore.currentCohort.entryEvents) {
      if (event.conceptSet) {
        conceptSetRefs.set(event.conceptSet.id, event.conceptSet)
      }
    }

    const cohortDefinition = {
      ...cohortStore.currentCohort,
      name,
      description,
      conceptSets: Array.from(conceptSetRefs.values()),
    }

    cohortStore.setCohort(cohortDefinition)
    cohortStore.markClean()

    return cohortDefinition
  }

  function cancelEditing() {
    if (cohortStore.isDirty) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to cancel?')
      if (!confirmed) return false
    }

    cohortStore.clearCohort()
    router.push('/cohorts')
    return true
  }

  function updateCohortName(name: string) {
    if (cohortStore.currentCohort) {
      cohortStore.setCohort({
        ...cohortStore.currentCohort,
        name,
      })
      cohortStore.markDirty()
    }
  }

  function updateCohortDescription(description: string) {
    if (cohortStore.currentCohort) {
      cohortStore.setCohort({
        ...cohortStore.currentCohort,
        description,
      })
      cohortStore.markDirty()
    }
  }

  return {
    // State
    currentCohort,
    isDirty,
    canSave,

    // Actions
    createNewCohort,
    loadCohort,
    addEntryEvent,
    removeEntryEvent,
    updateEntryEvent,
    saveCohort,
    cancelEditing,
    updateCohortName,
    updateCohortDescription,
  }
}
