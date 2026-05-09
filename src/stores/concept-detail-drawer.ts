import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConceptDetailDrawerStore = defineStore('concept-detail-drawer', () => {
  const isOpen = ref(false)
  const sourceKey = ref<string>('')
  const conceptId = ref<number | null>(null)

  function open(nextSourceKey: string, nextConceptId: number) {
    sourceKey.value = nextSourceKey
    conceptId.value = nextConceptId
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function reset() {
    isOpen.value = false
    sourceKey.value = ''
    conceptId.value = null
  }

  return { isOpen, sourceKey, conceptId, open, close, reset }
})
