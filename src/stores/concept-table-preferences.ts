import { defineStore } from 'pinia'
import { ref } from 'vue'

export const DEFAULT_VISIBLE_CONCEPT_COLUMN_KEYS = [
  'conceptCode',
  'vocabularyId',
  'standardConcept',
  'domainId',
  'conceptClassId',
  'recordCount',
  'descendantRecordCount',
]

export const useConceptTablePreferencesStore = defineStore('concept-table-preferences', () => {
  const visibleColumnKeys = ref([...DEFAULT_VISIBLE_CONCEPT_COLUMN_KEYS])

  function setColumnVisibility(columnKey: string, visible: boolean) {
    if (visible) {
      visibleColumnKeys.value = [...new Set([...visibleColumnKeys.value, columnKey])]
      return
    }

    visibleColumnKeys.value = visibleColumnKeys.value.filter(key => key !== columnKey)
  }

  return { visibleColumnKeys, setColumnVisibility }
})
