import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateBuilder from '@/components/incidence-rate/IncidenceRateBuilder.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useIncidenceRateStore } from '@/stores/incidence-rate'

const builderMocks = vi.hoisted(() => ({
  save: vi.fn(),
  copy: vi.fn(),
  remove: vi.fn(),
  feedback: { value: null as { message: string; color: 'success' | 'error' | 'info' } | null },
}))

const serviceMocks = vi.hoisted(() => ({
  exportIncidenceRate: vi.fn(),
  importIncidenceRate: vi.fn(),
}))

const accessMocks = vi.hoisted(() => ({
  fetchEntityAccessRoles: vi.fn().mockResolvedValue({ success: true, data: [] }),
  loadRoleSuggestions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  grantEntityAccess: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  revokeEntityAccess: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}))

vi.mock('@/composables/useIncidenceRateBuilder', () => ({
  useIncidenceRateBuilder: () => ({
    save: builderMocks.save,
    copy: builderMocks.copy,
    remove: builderMocks.remove,
    feedback: builderMocks.feedback,
  }),
}))

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}))

vi.mock('@/composables/useEntityAccess', () => ({
  useEntityAccess: () => ({ canWrite: { value: true }, canDelete: { value: true } }),
}))

vi.mock('@/services/incidence-rate.service', () => ({
  getIncidenceRateReport: vi.fn().mockResolvedValue({ success: true, data: null }),
  listIncidenceRateInfo: vi.fn().mockResolvedValue({ success: true, data: [] }),
  generateIncidenceRate: vi.fn(),
  cancelIncidenceRateGeneration: vi.fn(),
  exportIncidenceRate: serviceMocks.exportIncidenceRate,
  importIncidenceRate: serviceMocks.importIncidenceRate,
  assignIncidenceRateTag: vi.fn(),
  unassignIncidenceRateTag: vi.fn(),
}))

vi.mock('@/services/access.service', () => ({
  fetchEntityAccessRoles: accessMocks.fetchEntityAccessRoles,
  loadRoleSuggestions: accessMocks.loadRoleSuggestions,
  grantEntityAccess: accessMocks.grantEntityAccess,
  revokeEntityAccess: accessMocks.revokeEntityAccess,
}))

const stubs = [
  'IncidenceRateWorkbench',
  'TagSelectionDialog',
  'EntityAccessDialog',
  'IncidenceRateConceptSetsPanel',
  'IncidenceRateVersionsPanel',
  'AtlasDialog',
]

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div/>' } }],
})

describe('IncidenceRateBuilder', () => {
  beforeEach(() => pristinePinia())
  beforeEach(() => {
    vi.clearAllMocks()
    builderMocks.feedback.value = null
  })

  function loadIR(id = 42, name = 'Foo', description = 'Bar') {
    const store = useIncidenceRateStore()
    store.createNewIR()
    if (store.currentIR) {
      store.currentIR.id = id
      store.updateMeta({ name, description })
      store.addTargetCohortId(1, 'Target')
      store.addOutcomeCohortId(2, 'Outcome')
    }
    return store
  }

  it('renders the workbench when an IR is loaded', async () => {
    loadIR()
    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()
    expect(w.findComponent({ name: 'AnalysisBuilderShell' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'IncidenceRateWorkbench' }).exists()).toBe(true)
  })

  it('renders the shell fallback when no IR is loaded', async () => {
    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()

    expect(w.findComponent({ name: 'AnalysisBuilderShell' }).props('title')).toBe('Incidence rate analysis')
    expect(w.find('[data-testid="ir-builder-name"]').exists()).toBe(false)
    expect(w.find('[data-testid="ir-builder-description"]').exists()).toBe(false)
    expect(w.findComponent({ name: 'IncidenceRateWorkbench' }).exists()).toBe(false)
  })

  it('renders an inline title input bound to currentIR.name', async () => {
    loadIR(42, 'Foo')
    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()
    const inp = w.find('[data-testid="ir-builder-name"]').element as HTMLInputElement
    expect(inp.value).toBe('Foo')
  })

  it('renders the inline subtitle from the current IR metadata', async () => {
    loadIR(42, 'Foo', 'Short note')
    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()
    const inp = w.find('[data-testid="ir-builder-description"]').element as HTMLInputElement
    expect(inp.value).toBe('Short note')
    expect((w.findComponent({ name: 'AnalysisBuilderShell' }).props('subtitle') as string)).toBe(
      '#42 · Short note'
    )
  })

  it('routes back and forwards save/copy/delete actions to the builder composable', async () => {
    const store = loadIR()
    const pushSpy = vi.spyOn(router, 'push')
    builderMocks.save.mockResolvedValue(true)
    builderMocks.copy.mockResolvedValue(true)
    builderMocks.remove.mockResolvedValue(true)

    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()

    expect(w.get('[data-testid="ir-builder-save"]').attributes('disabled')).toBeUndefined()

    await w.get('[data-testid="ir-builder-cancel"]').trigger('click')
    await w.get('[data-testid="ir-builder-save"]').trigger('click')
    await w.get('[data-testid="ir-builder-copy"]').trigger('click')
    await w.get('[data-testid="ir-builder-delete"]').trigger('click')
    await flushPromises()

    expect(pushSpy).toHaveBeenCalledWith('/analysis/incidence-rates')
    expect(builderMocks.save).toHaveBeenCalled()
    expect(builderMocks.copy).toHaveBeenCalled()
    expect(store.currentIR?.id).toBe(42)
  })

  it('returns early from export and import handlers when there is no loaded IR or no file', async () => {
    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()

    await expect((w.vm as any).$.setupState.handleExport()).resolves.toBeUndefined()
    await expect(
      (w.vm as any).$.setupState.handleImportFileChange({ target: { files: [], value: 'x' } })
    ).resolves.toBeUndefined()

    expect(serviceMocks.exportIncidenceRate).not.toHaveBeenCalled()
  })

  it('surfaces an export error and does not navigate when an imported design has no id', async () => {
    loadIR(42, 'Export Me')
    serviceMocks.exportIncidenceRate.mockRejectedValueOnce(new Error('boom'))
    serviceMocks.importIncidenceRate.mockResolvedValueOnce({ id: null })
    const pushSpy = vi.spyOn(router, 'push')

    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()

    await (w.vm as any).$.setupState.handleExport()
    expect(builderMocks.feedback.value?.message).toBe('Export failed')
    expect(builderMocks.feedback.value?.color).toBe('error')

    const importedFile = { text: async () => JSON.stringify({ name: 'Imported' }) }
    await (w.vm as any).$.setupState.handleImportFileChange({ target: { files: [importedFile], value: '' } })
    await flushPromises()

    expect(serviceMocks.importIncidenceRate).toHaveBeenCalled()
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('confirms deletion through the incidence-rate delete dialog', async () => {
    loadIR()
    builderMocks.remove.mockResolvedValue(true)

    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()

    await w.get('[data-testid="ir-builder-delete"]').trigger('click')
    await flushPromises()

    await (w.vm as any).$.setupState.onDelete()
    await flushPromises()

    expect(builderMocks.remove).toHaveBeenCalled()
  })

  it('handles concept-set helper branches with real items and both delete paths', async () => {
    const store = loadIR(42, 'Criteria Edit')
    store.currentIR!.expression.ConceptSets = [
      { id: 11, name: 'Used set', expression: { items: [] } } as never,
    ]
    store.currentIR!.expression.strata = [
      {
        expression: {
          Type: 'ALL',
          CriteriaList: [{ ConditionOccurrence: { CodesetId: 11 } }],
          DemographicCriteriaList: [],
          Groups: [],
        },
      },
      {
        expression: {
          Type: 'ALL',
          CriteriaList: [{ ConditionOccurrence: { CodesetId: 11 } }],
          DemographicCriteriaList: [],
          Groups: [],
        },
      },
    ] as never

    const conceptSetsStore = useConceptSetsStore()
    const openCreateEditorSpy = vi.spyOn(conceptSetsStore, 'openCreateEditor')
    const openEmbeddedEditorSpy = vi.spyOn(conceptSetsStore, 'openEmbeddedEditor')

    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()

    const setupState = w.vm as any

    const importInput = w.get('[data-testid="ir-builder-import-input"]').element as HTMLInputElement
    const importClickSpy = vi.spyOn(importInput, 'click').mockImplementation(() => undefined)
    setupState.$.setupState.handleImportClick()
    expect(importClickSpy).toHaveBeenCalled()

    setupState.$.setupState.createConceptSet()
    expect(openCreateEditorSpy).toHaveBeenCalled()

    setupState.$.setupState.handleViewConceptSet({ id: undefined, name: 'New set', items: [] })
    expect(openEmbeddedEditorSpy).toHaveBeenCalledWith({ id: undefined, name: 'New set', items: [] })

    setupState.$.setupState.handleConceptSetApplied({
      name: 'Applied set',
      items: [
        {
          concept: {
            CONCEPT_ID: 123,
            CONCEPT_NAME: 'Alpha concept',
            CONCEPT_CODE: 'A123',
            DOMAIN_ID: 'Condition',
            VOCABULARY_ID: 'SNOMED',
            CONCEPT_CLASS_ID: 'Clinical Finding',
            STANDARD_CONCEPT: 'S',
            INVALID_REASON: null,
          },
          isExcluded: true,
          includeDescendants: true,
          includeMapped: false,
        },
      ],
    })

    setupState.$.setupState.handleDeleteConceptSet({ id: 'bad' as any, name: 'Ignored set', items: [] })

    setupState.$.setupState.handleDeleteConceptSet({ id: 11, name: 'Used set', items: [] })
    await flushPromises()
    setupState.$.setupState.confirmDeleteConceptSet()
    expect(store.currentIR!.expression.ConceptSets.find(set => set.id === 11)).toBeUndefined()

    setupState.$.setupState.cancelDeleteConceptSet()

    store.currentIR!.expression.ConceptSets.push({ id: 22, name: 'Unused set', expression: { items: [] } } as never)
    setupState.$.setupState.handleDeleteConceptSet({ id: 22, name: 'Unused set', items: [] })
    expect(store.currentIR!.expression.ConceptSets.find(set => set.id === 22)).toBeUndefined()
  })

  it('opens the tags dialog and syncs updates back to the store', async () => {
    const store = loadIR()
    const syncSpy = vi.spyOn(store, 'syncTags').mockResolvedValue(undefined)

    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()

    await w.get('[data-testid="ir-builder-tags-icon"]').trigger('click')
    const dialog = w.findComponent({ name: 'TagSelectionDialog' })
    expect(dialog.exists()).toBe(true)

    await dialog.vm.$emit('update:selected-tags', [{ id: 1, name: 'trial' }])
    expect(syncSpy).toHaveBeenCalledWith([{ id: 1, name: 'trial' }])
  })

  it('opens the access dialog from the action bar', async () => {
    loadIR()

    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()

    await w.get('[data-testid="ir-builder-access-icon"]').trigger('click')
    await flushPromises()

    expect(w.findComponent({ name: 'EntityAccessDialog' }).props('modelValue')).toBe(true)
  })

  it('exports and imports incidence rate designs through the file handlers', async () => {
    loadIR(42, 'Export Me')
    serviceMocks.exportIncidenceRate.mockResolvedValue({ name: 'Exported IR' })
    serviceMocks.importIncidenceRate.mockResolvedValue({ id: 77 })

    const originalCreateObjectURL = (URL as typeof URL & { createObjectURL?: typeof URL.createObjectURL }).createObjectURL
    const originalRevokeObjectURL = (URL as typeof URL & { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL
    const createObjectURLMock = vi.fn(() => 'blob:mock')
    const revokeObjectURLMock = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURLMock, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURLMock, configurable: true })
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') {
        const anchor = originalCreateElement('a')
        vi.spyOn(anchor, 'click').mockImplementation(() => undefined)
        return anchor
      }
      return originalCreateElement(tagName)
    }) as typeof document.createElement)

    vi.spyOn(router, 'push').mockResolvedValue(undefined)
    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()

    await w.get('[data-testid="ir-builder-export-icon"]').trigger('click')
    expect(serviceMocks.exportIncidenceRate).toHaveBeenCalledWith(42)
    expect(createObjectURLMock).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock')

    const badFile = { text: async () => '{not-json' }
    await (w.vm as any).handleImportFileChange({ target: { files: [badFile], value: '' } })
    await flushPromises()
    expect(serviceMocks.importIncidenceRate).not.toHaveBeenCalled()

    const goodFile = { text: async () => JSON.stringify({ name: 'Imported' }) }
    await (w.vm as any).handleImportFileChange({ target: { files: [goodFile], value: '' } })
    await flushPromises()

    expect(serviceMocks.importIncidenceRate).toHaveBeenCalled()

    createElementSpy.mockRestore()
    if (originalCreateObjectURL) Object.defineProperty(URL, 'createObjectURL', { value: originalCreateObjectURL, configurable: true })
    else delete (URL as typeof URL & { createObjectURL?: typeof URL.createObjectURL }).createObjectURL
    if (originalRevokeObjectURL) Object.defineProperty(URL, 'revokeObjectURL', { value: originalRevokeObjectURL, configurable: true })
    else delete (URL as typeof URL & { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL
  })
})
