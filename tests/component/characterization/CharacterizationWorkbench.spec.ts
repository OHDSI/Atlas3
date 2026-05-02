import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CharacterizationWorkbench from '@/components/characterization/CharacterizationWorkbench.vue'

vi.mock('@/services/characterization.service', () => ({
  getCharacterizationExecution: vi.fn().mockResolvedValue({ id: 7, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, executionDuration: 0 }),
  getCharacterizationResultCount: vi.fn().mockResolvedValue(0),
  getCharacterizationResults: vi.fn().mockResolvedValue([]),
  listCharacterizationExecutions: vi.fn().mockResolvedValue([
    { id: 7, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, executionDuration: 0 }
  ]),
  getCharacterizationExecutions: vi.fn().mockResolvedValue([]),
  generateCharacterization: vi.fn(),
  cancelCharacterizationGeneration: vi.fn(),
  getCharacterization: vi.fn(),
  listCharacterizations: vi.fn(),
  createCharacterization: vi.fn(),
  updateCharacterization: vi.fn(),
  deleteCharacterization: vi.fn(),
  copyCharacterization: vi.fn(),
}))

const vuetify = createVuetify({ components, directives })
const stubs = [
  'CharacterizationDesignRail', 'CharacterizationCanvasToolbar',
  'CharacterizationTable1View', 'CharacterizationPerAnalysisView',
  'CharacterizationEmptyState', 'ConfigureInspector', 'RunExecutionDialog',
]

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/characterizations/:id', name: 'characterization-edit', component: { template: '<div/>' } }],
  })
}

const baseDraft = () => ({
  id: 5, name: 'X', description: '', cohorts: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
  featureAnalyses: [], stratas: [],
})

describe('CharacterizationWorkbench', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows no-id empty state when characterizationId is null', () => {
    const router = makeRouter()
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: { name: '', description: '', cohorts: [], featureAnalyses: [], stratas: [] },
               characterizationId: null, availableCohorts: [], availableFeatureAnalyses: [] },
    })
    const empty = w.findComponent({ name: 'CharacterizationEmptyState' })
    expect(empty.exists()).toBe(true)
    expect(empty.props('variant')).toBe('no-id')
  })

  it('switches to per-analysis view on toolbar mode change', async () => {
    const router = makeRouter()
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5,
               availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()
    const toolbar = w.findComponent({ name: 'CharacterizationCanvasToolbar' })
    await toolbar.vm.$emit('update:mode', 'perAnalysis')
    expect(w.findComponent({ name: 'CharacterizationPerAnalysisView' }).exists()).toBe(true)
  })

  it('opens and closes the configure inspector', async () => {
    const router = makeRouter()
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5,
               availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()
    expect(w.findComponent({ name: 'ConfigureInspector' }).props('open')).toBe(false)
    await w.findComponent({ name: 'CharacterizationCanvasToolbar' }).vm.$emit('open-configure')
    expect(w.findComponent({ name: 'ConfigureInspector' }).props('open')).toBe(true)
    await w.findComponent({ name: 'ConfigureInspector' }).vm.$emit('close')
    expect(w.findComponent({ name: 'ConfigureInspector' }).props('open')).toBe(false)
  })
})
