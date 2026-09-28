import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSet } from '@/models/concept-set.types'
import type { ConceptSetChoice } from '@/stores/plugin-concept-set-chooser'

/**
 * Drives the concept set editor drawer that plugins open through the host
 * message bus (`conceptSet:edit`). The drawer edits the concept sets store's
 * currentSet, so this store seeds or loads it before opening. The pending
 * resolver is always settled, with null when the drawer closes without a save.
 */
export const usePluginConceptSetEditorStore = defineStore('plugin-concept-set-editor', () => {
  const isOpen = ref(false)
  const loadError = ref<{ conceptSetId: number | string; message: string | null } | null>(null)
  const pending = ref<((choice: ConceptSetChoice | null) => void) | null>(null)
  // Bumped by every open and cancel so a load that finishes after it was
  // superseded or cancelled does not open the drawer.
  let requestSeq = 0

  async function open(conceptSetId?: number | string | null): Promise<ConceptSetChoice | null> {
    const seq = ++requestSeq
    close(null)
    loadError.value = null
    const conceptSets = useConceptSetsStore()

    if (conceptSetId === undefined || conceptSetId === null || conceptSetId === '') {
      conceptSets.currentSet = { name: '', items: [] } as ConceptSet
    } else {
      await conceptSets.fetchOne(conceptSetId)
      if (seq !== requestSeq) return null
      if (!conceptSets.currentSet) {
        loadError.value = { conceptSetId, message: conceptSets.error }
        return null
      }
    }

    isOpen.value = true
    return new Promise(resolve => {
      pending.value = resolve
    })
  }

  function close(choice: ConceptSetChoice | null) {
    const wasOpen = isOpen.value
    isOpen.value = false
    const resolve = pending.value
    pending.value = null
    if (wasOpen) useConceptSetsStore().currentSet = null
    if (resolve) resolve(choice)
  }

  function saved(choice: ConceptSetChoice) {
    close(choice)
  }

  function cancel() {
    requestSeq++
    close(null)
  }

  function clearLoadError() {
    loadError.value = null
  }

  return { isOpen, loadError, pending, open, saved, cancel, clearLoadError }
})
