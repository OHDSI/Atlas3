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
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function load(executionId: number): Promise<boolean> {
    execution.value = null
    resultCount.value = 0
    prevalence.value = []
    distribution.value = []
    error.value = null
    loading.value = true
    try {
      const [exec, count, raw] = await Promise.all([
        getCharacterizationExecution(executionId),
        getCharacterizationResultCount(executionId),
        getCharacterizationResults(executionId, {}),
      ])
      const mapped = mapCharacterizationResults(raw)
      execution.value = exec
      resultCount.value = count
      prevalence.value = mapped.prevalence
      distribution.value = mapped.distribution
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
    error.value = null
    loading.value = false
  }

  return { execution, resultCount, prevalence, distribution, loading, error, load, reset }
}
