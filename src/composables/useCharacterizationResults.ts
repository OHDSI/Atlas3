import { ref, shallowRef } from 'vue'
import {
  getCharacterizationExecution,
  getCharacterizationResultCount,
  getCharacterizationResults,
} from '@/services/characterization.service'
import { mapCharacterizationResultReport } from '@/utils/characterization-result-mapper'
import type {
  CharacterizationExecution,
  DistributionStat,
  PrevalenceStat,
} from '@/models/characterization.types'
import type { CharacterizationResultsBody } from '@/services/characterization.service'
import { logger } from '@/utils/logger'

export function useCharacterizationResults() {
  const execution = ref<CharacterizationExecution | null>(null)
  const resultCount = ref<number>(0)
  // Shallow: a run can return tens of thousands of rows, each with nested
  // count/pct maps. They are only ever replaced wholesale, so deep proxies
  // would just tax every filter, sort and render pass.
  const prevalence = shallowRef<PrevalenceStat[]>([])
  const distribution = shallowRef<DistributionStat[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  let latestRequest = 0

  async function load(
    executionId: number,
    filters: CharacterizationResultsBody = {}
  ): Promise<boolean> {
    const request = ++latestRequest
    execution.value = null
    resultCount.value = 0
    prevalence.value = []
    distribution.value = []
    error.value = null
    loading.value = true
    try {
      const [execResult, countResult, resultsResult] = await Promise.all([
        getCharacterizationExecution(executionId),
        getCharacterizationResultCount(executionId),
        getCharacterizationResults(executionId, filters),
      ])
      if (request !== latestRequest) return false
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

      const mapped = resultsResult.data.reports.map(mapCharacterizationResultReport)
      resultCount.value = countResult.data
      prevalence.value = mapped.flatMap(report => report.prevalence)
      distribution.value = mapped.flatMap(report => report.distribution)
      return true
    } catch (err) {
      if (request !== latestRequest) return false
      error.value = err instanceof Error ? err.message : 'Failed to load results'
      logger.error('CharacterizationResults', 'load failed', err)
      return false
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
    latestRequest++
    execution.value = null
    resultCount.value = 0
    prevalence.value = []
    distribution.value = []
    error.value = null
    loading.value = false
  }

  return { execution, resultCount, prevalence, distribution, loading, error, load, reset }
}
