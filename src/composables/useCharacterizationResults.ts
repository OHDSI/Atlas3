import { ref } from 'vue'
import {
  getCharacterizationExecution,
  getCharacterizationResultCount,
  getCharacterizationResults,
} from '@/services/characterization.service'
import { mapCharacterizationResults } from '@/utils/characterization-result-mapper'
import type {
  CharacterizationExecution,
  DistributionStat,
  PrevalenceStat,
} from '@/models/characterization.types'
import { logger } from '@/utils/logger'

export function useCharacterizationResults() {
  const execution = ref<CharacterizationExecution | null>(null)
  const resultCount = ref<number>(0)
  const prevalence = ref<PrevalenceStat[]>([])
  const distribution = ref<DistributionStat[]>([])
  const unmapped = ref<Record<string, unknown>[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function load(executionId: number): Promise<boolean> {
    execution.value = null
    resultCount.value = 0
    prevalence.value = []
    distribution.value = []
    unmapped.value = []
    error.value = null
    loading.value = true
    try {
      const [execResult, countResult, resultsResult] = await Promise.all([
        getCharacterizationExecution(executionId),
        getCharacterizationResultCount(executionId),
        getCharacterizationResults(executionId, {}),
      ])
      if (!execResult.success) throw execResult.error

      // Keep the execution even when the result queries fail. A run that
      // failed has no results to fetch, so treating that as a total failure
      // discarded the one object carrying the reason and left the UI showing
      // "no runs" instead of the failure.
      execution.value = execResult.data

      if (execResult.data.status === 'FAILED') {
        error.value = execResult.data.exitMessage || 'Generation failed'
        return false
      }

      if (!countResult.success) throw countResult.error
      if (!resultsResult.success) throw resultsResult.error

      const mapped = mapCharacterizationResults(resultsResult.data)
      resultCount.value = countResult.data
      prevalence.value = mapped.prevalence
      distribution.value = mapped.distribution
      unmapped.value = mapped.unmapped
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load results'
      logger.error('CharacterizationResults', 'load failed', err)
      return false
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
    execution.value = null
    resultCount.value = 0
    prevalence.value = []
    distribution.value = []
    unmapped.value = []
    error.value = null
    loading.value = false
  }

  return { execution, resultCount, prevalence, distribution, unmapped, loading, error, load, reset }
}
