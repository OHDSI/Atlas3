import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/webapi', () => ({
  generateIncidenceRate: vi.fn().mockResolvedValue({
    success: true, data: { id: { analysisId: 1, sourceId: 2 }, status: 'PENDING' },
  }),
  cancelIncidenceRateGeneration: vi.fn().mockResolvedValue(true),
  listIncidenceRateInfo: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

import IncidenceRateGenerationPanel from '@/components/incidence-rate/IncidenceRateGenerationPanel.vue'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useDataSourcesStore } from '@/stores/datasources'
import { createTestVuetify } from '../../helpers/vuetify-setup'

beforeEach(() => setActivePinia(createPinia()))

describe('IncidenceRateGenerationPanel', () => {
  it('renders rows for each data source', async () => {
    const ds = useDataSourcesStore()
    ds.sources = [
      { sourceKey: 'CCAE', sourceName: 'Commercial Claims', sourceId: 1, daimons: [] } as never,
      { sourceKey: 'MDCR', sourceName: 'Medicare', sourceId: 2, daimons: [] } as never,
    ]
    const ir = useIncidenceRateStore()
    ir.createNewIR()
    if (ir.currentIR) ir.currentIR.id = 7
    const w = mount(IncidenceRateGenerationPanel, {
      props: { irId: 7 },
      global: { plugins: [createTestVuetify()], stubs: { IncidenceRateReport: true } },
    })
    await flushPromises()
    expect(w.text()).toContain('Commercial Claims')
    expect(w.text()).toContain('Medicare')
  })
})
