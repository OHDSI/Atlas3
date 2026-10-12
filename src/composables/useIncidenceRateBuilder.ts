import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import {
  createIncidenceRate,
  saveIncidenceRate,
  existsIncidenceRate,
} from '@/services/incidence-rate.service'

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
    if (!ir.name?.trim()) {
      notify('Cannot save: Name is required', 'error')
      return false
    }

    // Name uniqueness check. Advisory only: if the check itself fails (it is
    // already logged by the service), still attempt the save — the server is
    // the authority and the save surfaces its own errors.
    const existsResult = await existsIncidenceRate(ir.name, ir.id ?? 0)
    if (existsResult.success && existsResult.data > 0) {
      notify('An incidence rate with this name already exists', 'error')
      return false
    }

    const result =
      ir.id !== undefined ? await saveIncidenceRate(ir.id, ir) : await createIncidenceRate(ir)
    if (!result.success) {
      notify(result.error.message, 'error')
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

  return { save, feedback }
}
