import { ref } from 'vue'
import {
  generateIncidenceRate,
  cancelIncidenceRateGeneration,
  listIncidenceRateInfo,
} from '@/services/incidence-rate.service'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useDataSourcesStore } from '@/stores/datasources'
import { useExecutionPolling } from '@/composables/useExecutionPolling'
import { IR_GENERATION_POLL_MS, IR_TERMINAL_STATUSES } from '@/models/incidence-rate.types'
import { logger } from '@/utils/logger'

// Callers re-create the composable per action (see IncidenceRateWorkbench) and
// drop the handle, so the live poller has to be tracked per analysis id or a
// second run would leave the first one polling forever.
const activePollers = new Map<number, () => void>()

export function useIncidenceRateGeneration(irId: number) {
  const store = useIncidenceRateStore()
  const ds = useDataSourcesStore()
  const error = ref<string | null>(null)

  function isAnyRunning(): boolean {
    return Object.values(store.executionInfoBySourceKey).some(
      info => !IR_TERMINAL_STATUSES.has(info.executionInfo.status)
    )
  }

  const poller = useExecutionPolling<{ done: boolean }>({
    intervalMs: IR_GENERATION_POLL_MS,
    immediate: false,
    fetcher: async () => {
      await pollOnce()
      return { done: !isAnyRunning() }
    },
    isTerminal: item => item.done,
  })

  function stopPolling() {
    poller.stop()
    if (activePollers.get(irId) === poller.stop) {
      activePollers.delete(irId)
    }
  }

  async function pollOnce() {
    const result = await listIncidenceRateInfo(irId)
    if (!result.success) {
      error.value = result.error.message
      logger.error('IRGeneration', 'pollOnce failed', result.error)
      stopPolling()
      return
    }
    for (let attempt = 0; attempt < 2 && ds.sources.length === 0; attempt++) {
      try { await ds.fetchDataSources() } catch { /* retry */ }
    }
    const idToKey = new Map(ds.sources.map(s => [s.sourceId, s.sourceKey]))
    for (const info of result.data) {
      const numId = info.executionInfo.id.sourceId
      const sourceKey = idToKey.get(numId) ?? String(numId)
      store.setExecutionInfo(sourceKey, info)
    }
  }

  function startPolling() {
    if (poller.isPolling.value) return
    activePollers.get(irId)?.()
    activePollers.set(irId, poller.stop)
    void poller.start()
  }

  async function start(sourceKey: string): Promise<boolean> {
    error.value = null
    const result = await generateIncidenceRate(irId, sourceKey)
    if (!result.success) {
      error.value = result.error.message
      logger.error('IRGeneration', 'start failed', result.error)
      return false
    }
    await pollOnce()
    startPolling()
    return true
  }

  async function cancel(sourceKey: string): Promise<boolean> {
    const result = await cancelIncidenceRateGeneration(irId, sourceKey)
    if (!result.success) {
      error.value = result.error.message
      logger.error('IRGeneration', 'cancel failed', result.error)
      return false
    }
    return true
  }

  return { polling: poller.isPolling, error, start, cancel, pollOnce, startPolling, stopPolling }
}
