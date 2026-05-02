import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateGeneratePopover from '@/components/incidence-rate/IncidenceRateGeneratePopover.vue'

const startMock = vi.fn().mockResolvedValue(true)

vi.mock('@/composables/useIncidenceRateGeneration', () => ({
  useIncidenceRateGeneration: () => ({
    polling: { value: false },
    error: { value: null },
    start: startMock,
    cancel: vi.fn(),
    pollOnce: vi.fn(),
  }),
}))

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}))

vi.mock('@/stores/datasources', () => ({
  useDataSourcesStore: () => ({
    sources: [{ sourceKey: 'CCAE', sourceName: 'CCAE' }],
    isLoading: false,
    fetchDataSources: vi.fn(),
  }),
}))

describe('IncidenceRateGeneratePopover', () => {
  it('starts a generation against the selected source and emits "generated"', async () => {
    const w = mount(IncidenceRateGeneratePopover, {
      attachTo: document.body,
      global: { plugins: [pristinePinia(), vuetify] },
      props: { irId: 42 },
    })
    await w.findComponent({ name: 'VSelect' }).vm.$emit('update:modelValue', 'CCAE')
    await w.find('[data-testid="ir-generate-btn"]').trigger('click')
    await flushPromises()
    expect(startMock).toHaveBeenCalledWith('CCAE')
    expect(w.emitted('generated')).toBeTruthy()
    w.unmount()
  })
})
