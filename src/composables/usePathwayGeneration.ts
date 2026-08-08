import { ref, onUnmounted } from 'vue'
import { generatePathway, cancelPathwayGeneration, getPathwayExecution } from '@/services/webapi'
import type { PathwayExecution } from '@/models/pathway.types'
import { PATHWAY_GENERATION_POLL_MS } from '@/models/pathway.types'
import { logger } from '@/utils/logger'

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELED'])

export function usePathwayGeneration(pathwayId: number) {
  const execution = ref<PathwayExecution | null>(null)
  const polling = ref(false)
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setInterval> | null = null

  function stopPolling() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    polling.value = false
  }

  async function pollOnce() {
    if (!execution.value) return
    const result = await getPathwayExecution(execution.value.id)
    if (!result.success) {
      error.value = result.error.message
      stopPolling()
      return
    }
    execution.value = result.data
    if (TERMINAL.has(result.data.status)) stopPolling()
  }

  async function start(sourceKey: string): Promise<boolean> {
    error.value = null
    const result = await generatePathway(pathwayId, sourceKey)
    if (!result.success) {
      error.value = result.error.message
      logger.error('PathwayGeneration', 'start failed', result.error)
      return false
    }
    execution.value = result.data
    if (!TERMINAL.has(result.data.status)) {
      polling.value = true
      timer = setInterval(pollOnce, PATHWAY_GENERATION_POLL_MS)
    }
    return true
  }

  async function cancel(sourceKey: string): Promise<boolean> {
    const ok = await cancelPathwayGeneration(pathwayId, sourceKey)
    if (ok) stopPolling()
    return ok
  }

  // Use try/catch around onUnmounted in case the composable is invoked
  // outside a component context (e.g., in tests). Vue 3 ignores it then.
  try {
    onUnmounted(stopPolling)
  } catch {
    /* noop in non-component contexts */
  }

  return { execution, polling, error, start, cancel, stopPolling }
}
