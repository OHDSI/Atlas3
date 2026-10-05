/**
 * useConceptRecordCounts
 * Fetches record/person counts for a list of concepts from a chosen Results
 * source and merges them onto the rows, the same way concept search does.
 */
import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import type { Concept } from '@/models/concept-set.types'
import { getConceptRecordCounts } from '@/services/concept-search.service'
import { getSourceKey } from '@/config/webapi'
import { useWebAPIStore } from '@/stores/webapi'
import { logger } from '@/utils/logger'

type Counts = Awaited<ReturnType<typeof getConceptRecordCounts>>

export function useConceptRecordCounts(concepts: Ref<Concept[]>) {
  const webapiStore = useWebAPIStore()

  const selectedSourceKey = ref<string | null>(null)
  const counts = ref<Counts>(new Map())
  const loading = ref(false)

  // Until the user picks one, counts come from the vocabulary source, as in concept search.
  const effectiveSourceKey = computed(
    () => selectedSourceKey.value ?? (webapiStore.getValidVocabularySource() || getSourceKey() || '')
  )

  // Only sources that can report counts; a vocabulary-only source would blank the columns.
  const sources = computed(() => webapiStore.resultsSources ?? [])

  const idsSignature = computed(() => concepts.value.map(c => c.conceptId).join(','))

  let latestRequest = 0

  watch(
    [idsSignature, effectiveSourceKey],
    async ([, sourceKey]) => {
      const request = ++latestRequest
      const ids = concepts.value.map(c => c.conceptId)
      if (ids.length === 0 || !sourceKey) {
        counts.value = new Map()
        loading.value = false
        return
      }

      loading.value = true
      try {
        const result = await getConceptRecordCounts(sourceKey, ids)
        if (request === latestRequest) counts.value = result
      } catch (err) {
        logger.error('useConceptRecordCounts', 'Failed to load record counts', err)
      } finally {
        if (request === latestRequest) loading.value = false
      }
    },
    { immediate: true }
  )

  const conceptsWithCounts = computed<Concept[]>(() => {
    if (counts.value.size === 0) return concepts.value
    return concepts.value.map(c => ({ ...c, ...counts.value.get(c.conceptId) }))
  })

  function setSource(sourceKey: string) {
    selectedSourceKey.value = sourceKey
  }

  return { conceptsWithCounts, loading, sources, effectiveSourceKey, setSource }
}
