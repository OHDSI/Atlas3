import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Drives the concept set chooser that plugins open through the host message bus.
 *
 * Plugins cannot mount an Atlas dialog themselves, so the chooser is mounted once
 * at the app root and opened from here. The pending resolver is what lets the bus
 * answer the plugin's request with the user's choice; it is always settled, with
 * null when the dialog is dismissed, so a plugin awaiting a response is never left
 * hanging.
 */
export interface ConceptSetChoice {
  conceptSetId: number
  name: string
}

export const usePluginConceptSetChooserStore = defineStore('plugin-concept-set-chooser', () => {
  const isOpen = ref(false)
  const title = ref<string | undefined>(undefined)
  const pending = ref<((choice: ConceptSetChoice | null) => void) | null>(null)

  function open(nextTitle?: string): Promise<ConceptSetChoice | null> {
    // A second request supersedes the first; settle it rather than drop it.
    settle(null)
    title.value = nextTitle
    isOpen.value = true
    return new Promise(resolve => {
      pending.value = resolve
    })
  }

  function settle(choice: ConceptSetChoice | null) {
    const resolve = pending.value
    pending.value = null
    if (resolve) resolve(choice)
  }

  function select(choice: ConceptSetChoice) {
    isOpen.value = false
    settle(choice)
  }

  function cancel() {
    isOpen.value = false
    settle(null)
  }

  return { isOpen, title, pending, open, select, cancel }
})
