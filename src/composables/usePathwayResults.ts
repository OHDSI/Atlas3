import { ref } from 'vue'
import {
  getPathwayExecution,
  getPathwayDesignByGeneration,
  getPathwayResults,
} from '@/services/webapi'
import type { Pathway, PathwayExecution, PathwayResults } from '@/models/pathway.types'
import { logger } from '@/utils/logger'

export function usePathwayResults() {
  const execution = ref<PathwayExecution | null>(null)
  const design = ref<Pathway | null>(null)
  const results = ref<PathwayResults | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(generationId: number): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const [execRes, designRes, resultsRes] = await Promise.all([
        getPathwayExecution(generationId),
        getPathwayDesignByGeneration(generationId),
        getPathwayResults(generationId),
      ])
      if (!execRes.success || !designRes.success || !resultsRes.success) {
        const errs = [execRes, designRes, resultsRes]
          .map(r => (r.success ? null : r.error))
          .filter((e): e is string => Boolean(e))
        error.value = errs.length > 0 ? errs.join('; ') : 'Failed to load results'
        return false
      }
      execution.value = execRes.data
      design.value = designRes.data
      results.value = resultsRes.data
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load'
      logger.error('PathwayResults', 'load failed', err)
      return false
    } finally {
      loading.value = false
    }
  }

  return { execution, design, results, loading, error, load }
}
