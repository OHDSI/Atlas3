import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createCohortSample } from '@/services/cohort-sample.service'
import { useNotifications } from '@/stores/notifications'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'
import type { ApiResult } from '@/types/api'
import type { CohortSample, SampleParameters } from '@/models/cohort-sample.types'

export interface PendingSampleCreation {
  id: number
  cohortId: number
  sourceKey: string
  name: string
  size: number
  startedAt: number
}

// Sample creation is a single long-running POST. Tracking it here instead of
// in the panel keeps the in-flight state visible after the panel unmounts.
export const useCohortSampleCreationsStore = defineStore('cohort-sample-creations', () => {
  const { tv } = useI18n()
  const pending = ref<PendingSampleCreation[]>([])
  let nextId = 1

  function pendingFor(cohortId: number, sourceKey: string): PendingSampleCreation[] {
    return pending.value.filter(p => p.cohortId === cohortId && p.sourceKey === sourceKey)
  }

  function isPending(cohortId: number, sourceKey: string): boolean {
    return pendingFor(cohortId, sourceKey).length > 0
  }

  async function create(
    cohortId: number,
    sourceKey: string,
    parameters: SampleParameters
  ): Promise<ApiResult<CohortSample>> {
    const notify = useNotifications()
    const id = nextId++
    pending.value.push({
      id,
      cohortId,
      sourceKey,
      name: parameters.name,
      size: parameters.size,
      startedAt: Date.now(),
    })
    try {
      const result = await createCohortSample(cohortId, sourceKey, parameters)
      if (result.success) {
        notify.success(tv('components.cohortSamples.sampleCreated', { name: result.data.name }))
      } else {
        logger.error('CohortSampleCreations', 'Failed to create sample', result.error)
        notify.danger(tv('components.cohortSamples.failedToCreateSample'), {
          message: result.error.message || undefined,
        })
      }
      return result
    } finally {
      pending.value = pending.value.filter(p => p.id !== id)
    }
  }

  return { pending, pendingFor, isPending, create }
})
