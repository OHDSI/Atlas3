import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateBuilder from '@/components/incidence-rate/IncidenceRateBuilder.vue'
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

    const routerPushSpy = vi.spyOn(router, 'push').mockResolvedValue(undefined)
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
    expect(routerPushSpy).toHaveBeenCalledWith('/incidence-rates/77')

    createElementSpy.mockRestore()
    if (originalCreateObjectURL) Object.defineProperty(URL, 'createObjectURL', { value: originalCreateObjectURL, configurable: true })
    else delete (URL as typeof URL & { createObjectURL?: typeof URL.createObjectURL }).createObjectURL
    if (originalRevokeObjectURL) Object.defineProperty(URL, 'revokeObjectURL', { value: originalRevokeObjectURL, configurable: true })
    else delete (URL as typeof URL & { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL
  })
})
