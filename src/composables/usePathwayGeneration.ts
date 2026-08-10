import { ref } from 'vue'
import { generatePathway, cancelPathwayGeneration, getPathwayExecution } from '@/services/pathway.service'
import type { PathwayExecution } from '@/models/pathway.types'
import { PATHWAY_GENERATION_POLL_MS } from '@/models/pathway.types'
import { useExecutionPolling } from '@/composables/useExecutionPolling'
import { logger } from '@/utils/logger'

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELED'])

export function usePathwayGeneration(pathwayId: number) {
  const execution = ref<PathwayExecution | null>(null)
  const error = ref<string | null>(null)

  const poller = useExecutionPolling<PathwayExecution>({
    intervalMs: PATHWAY_GENERATION_POLL_MS,
    fetcher: async () => {
      if (!execution.value) return null
      const result = await getPathwayExecution(execution.value.id)
      if (!result.success) {
        error.value = result.error.message
        throw result.error
      }
      return result.data
    },
    isTerminal: item => TERMINAL.has(item.status),
    onUpdate: item => {
      execution.value = item
    },
  })

  function stopPolling() {
    poller.stop()
  }

  async function start(sourceKey: string): Promise<boolean> {
    error.value = null
    stopPolling()
    const result = await generatePathway(pathwayId, sourceKey)
    if (!result.success) {
      error.value = result.error.message
      logger.error('PathwayGeneration', 'start failed', result.error)
      return false
    }
    execution.value = result.data
    // result.data is null when the generate response carried no execution id:
    // the run started, but there is nothing to poll.
    if (result.data && !TERMINAL.has(result.data.status)) {
      void poller.start()
    }
    return true
  }

  async function cancel(sourceKey: string): Promise<boolean> {
    const result = await cancelPathwayGeneration(pathwayId, sourceKey)
    if (!result.success) {
      error.value = result.error.message
      logger.error('PathwayGeneration', 'cancel failed', result.error)
      return false
    }
    stopPolling()
    return true
  }

  return { execution, polling: poller.isPolling, error, start, cancel, stopPolling }
}
