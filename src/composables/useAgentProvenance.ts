/**
 * useAgentProvenance Composable
 *
 * Loads the AI-agent history (MCP provenance) of a saved cohort definition or
 * concept set, and reloads it when the id changes. An unsaved artifact (no id)
 * has no history. Responses that arrive after the id has changed again are
 * dropped, so a slow request cannot show another artifact's history.
 *
 * @example
 * ```typescript
 * const { traces, count, loading, error, reload } = useAgentProvenance('cohortdefinition', cohortId)
 * ```
 */
import { computed, ref, watch, type Ref } from 'vue'
import {
  getProvenance,
  groupByTrace,
  type ProvenanceEntry,
  type ProvenanceKind,
} from '@/services/mcp-provenance.service'
import { toApiError } from '@/services/api-error'
import { logger } from '@/utils/logger'

export function useAgentProvenance(kind: ProvenanceKind, id: Ref<number | null | undefined>) {
  const entries = ref<ProvenanceEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let request = 0

  async function reload(): Promise<void> {
    const current = id.value
    const token = ++request
    error.value = null
    if (!current) {
      entries.value = []
      loading.value = false
      return
    }
    loading.value = true
    try {
      const result = await getProvenance(kind, current)
      if (token === request) {
        entries.value = result
      }
    } catch (err) {
      if (token === request) {
        entries.value = []
        error.value = toApiError(err).message
        logger.error('useAgentProvenance', `Failed to load agent history for ${kind} ${current}`, err)
      }
    } finally {
      if (token === request) {
        loading.value = false
      }
    }
  }

  watch(id, () => void reload(), { immediate: true })

  return {
    entries,
    traces: computed(() => groupByTrace(entries.value)),
    count: computed(() => entries.value.length),
    loading,
    error,
    reload,
  }
}
