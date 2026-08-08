import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePathwayStore } from '@/stores/pathway'
import { createPathway, savePathway, copyPathway, deletePathway } from '@/services/webapi'
import type { Pathway } from '@/models/pathway.types'
import { logger } from '@/utils/logger'

export interface PathwayBuilderFeedback {
  message: string
  color: 'success' | 'error' | 'info'
}

/**
 * usePathwayBuilder
 *
 * Wraps the pathway store with editor-level orchestration: save/copy/delete.
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
      notify(`Save failed: ${result.error}`, 'error')
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

  async function copy(): Promise<Pathway | null> {
    const id = store.currentPathway?.id
    if (!id) return null
    const result = await copyPathway(id)
    if (!result.success) {
      notify(`Copy failed: ${result.error}`, 'error')
      logger.error('PathwayBuilder', 'copy failed', result.error)
      return null
    }
    if (result.data.id) router.push(`/pathways/${result.data.id}`)
    return result.data
  }

  async function remove(): Promise<boolean> {
    const id = store.currentPathway?.id
    if (!id) return false
    const result = await deletePathway(id)
    if (result.success) {
      notify('Pathway deleted', 'success')
      router.push('/pathways')
    } else {
      notify(`Delete failed: ${result.error.message}`, 'error')
      logger.error('PathwayBuilder', 'delete failed', result.error)
    }
    return result.success
  }

  return { save, copy, remove, feedback }
}
