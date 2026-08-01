/**
 * useCohortBuilder Composable
 * Provides cohort building functionality
 *
 * @deprecated Most functionality has moved to CohortBuilder.vue.
 * Entry-event manipulation now works on CohortExpression directly (circe.types.ts).
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCohortStore } from '@/stores/cohort'

export function useCohortBuilder() {
  const router = useRouter()
  const cohortStore = useCohortStore()

  const currentCohort = computed(() => cohortStore.currentCohort)
  const isDirty = computed(() => cohortStore.isDirty)
  const canSave = computed(() => cohortStore.canSave)

  function createNewCohort() {
    cohortStore.createNewCohort()
  }

  function loadCohort(_id: number | string) {
    if (!cohortStore.currentCohort) {
      cohortStore.createNewCohort()
    }
  }

  /** @deprecated Manage entry events via CohortExpression.PrimaryCriteria in CohortBuilder.vue */
  function addEntryEvent(_criteriaType?: string): string {
    return ''
  }

  /** @deprecated */
  function removeEntryEvent(_eventId: string): void {}

  function saveCohort(name: string, description?: string) {
    if (!cohortStore.currentCohort) throw new Error('No cohort to save')
    cohortStore.setCohort({ ...cohortStore.currentCohort, name, description })
    cohortStore.markClean()
    return cohortStore.currentCohort
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
      cohortStore.setCohort({ ...cohortStore.currentCohort, name })
      cohortStore.markDirty()
    }
  }

  function updateCohortDescription(description: string) {
    if (cohortStore.currentCohort) {
      cohortStore.setCohort({ ...cohortStore.currentCohort, description })
      cohortStore.markDirty()
    }
  }

  return {
    currentCohort,
    isDirty,
    canSave,
    createNewCohort,
    loadCohort,
    addEntryEvent,
    removeEntryEvent,
    saveCohort,
    cancelEditing,
    updateCohortName,
    updateCohortDescription,
  }
}

