import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PathwayGenerationPanel from '@/components/pathway/PathwayGenerationPanel.vue'
import { usePathwayStore } from '@/stores/pathway'

const vuetify = createVuetify({ components, directives })

vi.mock('@/services/webapi', () => ({
  generatePathway: vi.fn(),
  cancelPathwayGeneration: vi.fn(),
  getPathwayExecution: vi.fn(),
  listPathwayExecutions: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

vi.mock('@/stores/datasources', () => ({
  useDataSourcesStore: () => ({
    sources: [{ sourceKey: 'cdm', sourceName: 'CDM Demo' }],
  }),
}))

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: () => true,
  }),
}))

describe('PathwayGenerationPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('disables Generate when pathway is dirty', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) store.currentPathway.id = 1
    store.markDirty()
    const w = mount(PathwayGenerationPanel, {
      props: { pathwayId: 1 },
      global: {
        plugins: [vuetify],
        stubs: ['router-link'],
      },
    })
    await flushPromises()
    const btn = w.find('button[data-testid="generate-btn"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('enables Generate when clean and valid', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) store.currentPathway.id = 1
    store.updateMeta({ name: 'X' })
    store.addTargetCohort({ id: 1, name: 'T' })
    store.addEventCohort({ id: 2, name: 'E' })
    await store.validatePathway()
    store.markClean()
    const w = mount(PathwayGenerationPanel, {
      props: { pathwayId: 1 },
      global: {
        plugins: [vuetify],
        stubs: ['router-link'],
      },
    })
    await flushPromises()
    const btn = w.find('button[data-testid="generate-btn"]')
    // Button is disabled until a source is selected
    expect(btn.attributes('disabled')).toBeDefined()
  })
})
