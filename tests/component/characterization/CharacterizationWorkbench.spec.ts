import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CharacterizationWorkbench from '@/components/characterization/CharacterizationWorkbench.vue'
import { useCharacterizationStore } from '@/stores/characterization'

// vi.mock factories are hoisted above imports, so the ApiResult shape is
// inlined here rather than built via the `success()` helper.
vi.mock('@/services/characterization.service', () => ({
  getCharacterizationExecution: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 7, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, executionDuration: 0 },
  }),
  getCharacterizationResultCount: vi.fn().mockResolvedValue({ success: true, data: 0 }),
  getCharacterizationResults: vi.fn().mockResolvedValue({ success: true, data: [] }),
  listCharacterizationExecutions: vi.fn().mockResolvedValue({
    success: true,
    data: [{ id: 7, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, executionDuration: 0 }],
  }),
  getCharacterizationExecutions: vi.fn().mockResolvedValue({ success: true, data: [] }),
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
  'CharacterizationRunMeta', 'ResultsFilterPanel',
  'CharacterizationTable1View', 'CharacterizationPerAnalysisView',
  'CharacterizationEmptyState', 'ConfigureInspector',
  'DataSourceRunTable', 'PreviousRunsDialog',
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
    await router.push('/characterizations/5')
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
    await router.push('/characterizations/5')
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

  it('run with a returned execution pins the run query and starts polling', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const store = useCharacterizationStore()
    const runSpy = vi.spyOn(store, 'runExecution').mockResolvedValue({
      id: 42, sourceKey: 'CCAE', status: 'PENDING', startTime: 0, executionDuration: 0,
    })
    const pollSpy = vi.spyOn(store, 'pollExecution').mockImplementation(() => {})
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5,
               availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()

    // Spy only after the mount-time watchers have finished replacing the query.
    const replaceSpy = vi.spyOn(router, 'replace')
    await w.findComponent({ name: 'DataSourceRunTable' }).vm.$emit('run', 'CCAE')
    await flushPromises()

    expect(runSpy).toHaveBeenCalledWith(5, 'CCAE')
    expect(replaceSpy).toHaveBeenCalledWith({ query: expect.objectContaining({ run: '42' }) })
    expect(pollSpy).toHaveBeenCalledWith(42, expect.any(Function))
  })

  it('run that resolves null neither pins the run query nor starts polling', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const store = useCharacterizationStore()
    const runSpy = vi.spyOn(store, 'runExecution').mockResolvedValue(null)
    const pollSpy = vi.spyOn(store, 'pollExecution').mockImplementation(() => {})
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5,
               availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()

    const replaceSpy = vi.spyOn(router, 'replace')
    await w.findComponent({ name: 'DataSourceRunTable' }).vm.$emit('run', 'CCAE')
    await flushPromises()

    expect(runSpy).toHaveBeenCalledWith(5, 'CCAE')
    expect(replaceSpy).not.toHaveBeenCalled()
    expect(pollSpy).not.toHaveBeenCalled()
  })
})
