import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePathwayStore } from '@/stores/pathway'
import { createPathway, savePathway } from '@/services/pathway.service'
import type { Pathway } from '@/models/pathway.types'

export interface PathwayBuilderFeedback {
  message: string
  color: 'success' | 'error' | 'info'
}

/**
 * usePathwayBuilder
 *
 * Wraps the pathway store with editor-level save orchestration.
 * Exposes a `feedback` ref that components can watch to show snackbars
 * (Atlas3 uses local v-snackbar per component, so the composable does not
 * call into a global UI store).
 */
export function usePathwayBuilder() {
  const store = usePathwayStore()
  const router = useRouter()
  const feedback = ref<PathwayBuilderFeedback | null>(null)

  function notify(message: string, color: PathwayBuilderFeedback['color']) {
    feedback.value = { message, color }
  }

  async function save(): Promise<Pathway | null> {
    if (!store.currentPathway) return null
    await store.validatePathway()
    if (store.hasErrors) {
      const messages = store.validationErrors
        .filter(e => e.severity === 'error')
        .map(e => e.message)
        .join(' · ')
      notify(
        messages ? `Cannot save: ${messages}` : 'Cannot save — fix validation errors first',
        'error'
      )
      return null
    }
    const id = store.currentPathway.id
    const result = id
      ? await savePathway(id, store.currentPathway)
      : await createPathway(store.currentPathway)
    if (!result.success) {
      notify(`Save failed: ${result.error.message}`, 'error')
      return null
    }
    store.setPathway(result.data)
    store.markClean()
    store.clearDraft()
    notify('Pathway saved', 'success')
    if (!id && result.data.id) {
      router.push(`/pathways/${result.data.id}`)
    }
    return result.data
  }

  return { save, feedback }
}
