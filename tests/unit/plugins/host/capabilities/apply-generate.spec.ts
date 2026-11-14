import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/router', () => ({
  default: { push: vi.fn().mockResolvedValue(undefined), currentRoute: { value: { name: 'home', params: {} } } },
}))

import { applyCapability } from '@/plugins/host/capabilities/apply'
import { useWebAPIStore } from '@/stores/webapi'

describe('applyCapability generate_analysis', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('reports applied:false with an error when no data source is available', async () => {
    const store = useWebAPIStore()
    store.sources = []
    store.selectedSource = null as never
    vi.spyOn(store, 'fetchSources').mockResolvedValue(undefined as never)

    const r = await applyCapability('generate_analysis', { analysisType: 'cohort', analysisId: 7 })

    expect(r).toMatchObject({ applied: false, kind: 'generateAnalysis', error: 'No data source selected' })
  })
})
