import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import {
  createIncidenceRate,
  saveIncidenceRate,
  copyIncidenceRate,
  deleteIncidenceRate,
  existsIncidenceRate,
} from '@/services/webapi'

export interface BuilderFeedback {
  message: string
  color: 'success' | 'error' | 'info'
}

export function useIncidenceRateBuilder() {
  const store = useIncidenceRateStore()
  const router = useRouter()
  const feedback = ref<BuilderFeedback | null>(null)

  function notify(message: string, color: BuilderFeedback['color']) {
    feedback.value = { message, color }
  }

  async function save(): Promise<boolean> {
    const ir = store.currentIR
    if (!ir) return false

    await store.validateIR()
    if (store.hasErrors) {
      const messages = store.validationErrors
        .filter((e) => e.severity === 'error')
        .map((e) => e.message)
        .join(' · ')
      notify(messages ? `Cannot save: ${messages}` : 'Cannot save — fix validation errors first', 'error')
      return false
    }

    // Name uniqueness check
    const existing = await existsIncidenceRate(ir.name, ir.id ?? 0)
    if (existing > 0) {
      notify('An incidence rate with this name already exists', 'error')
      return false
    }

    const result = ir.id !== undefined
      ? await saveIncidenceRate(ir.id, ir)
      : await createIncidenceRate(ir)
    if (!result.success) {
      notify(result.error, 'error')
      return false
    }
    store.setIR(result.data)
    store.clearDraft()
    notify('Saved', 'success')
    if (result.data.id !== undefined && result.data.id !== ir.id) {
      router.push(`/incidence-rates/${result.data.id}`)
    }
    return true
  }

  async function copy(): Promise<boolean> {
    if (!store.currentIR?.id) return false
    const result = await copyIncidenceRate(store.currentIR.id)
    if (!result.success) { notify(result.error, 'error'); return false }
    store.setIR(result.data)
    notify('Copied', 'success')
    if (result.data.id !== undefined) {
      router.push(`/incidence-rates/${result.data.id}`)
    }
    return true
  }

  async function remove(): Promise<boolean> {
    if (!store.currentIR?.id) return false
    const ok = await deleteIncidenceRate(store.currentIR.id)
    if (!ok) { notify('Delete failed', 'error'); return false }
    notify('Deleted', 'success')
    router.push('/incidence-rates')
    return true
  }

  return { save, copy, remove, feedback }
}
