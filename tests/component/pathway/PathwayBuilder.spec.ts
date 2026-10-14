import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PathwayBuilder from '@/components/pathway/PathwayBuilder.vue'
import { usePathwayStore } from '@/stores/pathway'

const vuetify = createVuetify({ components, directives })

const builderMocks = vi.hoisted(() => ({
  save: vi.fn(),
  feedback: { value: null as { message: string; color: 'success' | 'error' | 'info' } | null },
}))

const serviceMocks = vi.hoisted(() => ({
  exportPathway: vi.fn(),
  importPathway: vi.fn(),
}))

const accessMocks = vi.hoisted(() => ({
  fetchEntityAccessRoles: vi.fn().mockResolvedValue({ success: true, data: [] }),
  loadRoleSuggestions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  grantEntityAccess: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  revokeEntityAccess: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}))

vi.mock('@/composables/usePathwayBuilder', () => ({
  usePathwayBuilder: () => ({
    save: builderMocks.save,
    feedback: builderMocks.feedback,
  }),
}))

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}))

vi.mock('@/services/pathway.service', () => ({
  exportPathway: serviceMocks.exportPathway,
  importPathway: serviceMocks.importPathway,
}))

vi.mock('@/services/access.service', () => ({
  fetchEntityAccessRoles: accessMocks.fetchEntityAccessRoles,
  loadRoleSuggestions: accessMocks.loadRoleSuggestions,
  grantEntityAccess: accessMocks.grantEntityAccess,
  revokeEntityAccess: accessMocks.revokeEntityAccess,
}))

const stubs = [
  'PathwayWorkbench',
  'TagSelectionDialog',
  'EntityAccessDialog',
  'VersionsTabContent',
  'AtlasDialog',
]

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

function loadPathway(id = 42, name = 'Foo', description = 'Bar') {
  const store = usePathwayStore()
  store.createNewPathway()
  if (store.currentPathway) {
    store.currentPathway.id = id
    store.updateMeta({ name, description })
    store.addTargetCohort({ id: 1, name: 'Target' } as never)
    store.addEventCohort({ id: 2, name: 'Event' } as never)
  }
  return store
}

describe('PathwayBuilder', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders empty state with no current pathway', () => {
    const w = mount(PathwayBuilder, {
      global: {
        plugins: [vuetify, router],
        stubs,
      },
    })
    expect(w.text()).toMatch(/No pathway loaded/i)
  })

  it('renders the workbench when a pathway is loaded', async () => {
    loadPathway()
    const w = mount(PathwayBuilder, {
      global: {
        plugins: [vuetify, router],
        stubs,
      },
    })
    await flushPromises()
    expect(w.findComponent({ name: 'PathwayWorkbench' }).exists()).toBe(true)
  })

  it('renders inline title and subtitle inputs from the current pathway metadata', async () => {
    loadPathway(42, 'Pathway 1', 'Short note')
    const w = mount(PathwayBuilder, {
      global: {
        plugins: [vuetify, router],
        stubs,
      },
    })
    await flushPromises()

    expect(w.find('[data-testid="pathway-builder-name"]').element.tagName).toBe('TEXTAREA')
    expect(w.find('[data-testid="pathway-builder-description"]').element.tagName).toBe('TEXTAREA')
    expect((w.find('[data-testid="pathway-builder-name"]').element as HTMLTextAreaElement).value).toBe('Pathway 1')
    expect((w.find('[data-testid="pathway-builder-description"]').element as HTMLTextAreaElement).value).toBe('Short note')
    expect(w.findComponent({ name: 'AnalysisBuilderShell' }).props('subtitle')).toBe('#42 · Short note')
  })

  it('routes back and forwards save actions while omitting list-level actions', async () => {
    loadPathway()
    const pushSpy = vi.spyOn(router, 'push')
    builderMocks.save.mockResolvedValue(true)

    const w = mount(PathwayBuilder, {
      global: {
        plugins: [vuetify, router],
        stubs,
      },
    })
    await flushPromises()

    expect(w.get('[data-testid="pathway-builder-save"]').attributes('disabled')).toBeUndefined()
    await w.get('[data-testid="pathway-builder-cancel"]').trigger('click')
    await w.get('[data-testid="pathway-builder-save"]').trigger('click')
    await flushPromises()

    expect(pushSpy).toHaveBeenCalledWith('/analysis/pathways')
    expect(builderMocks.save).toHaveBeenCalled()
    expect(w.find('[data-testid="pathway-builder-copy"]').exists()).toBe(false)
    expect(w.find('[data-testid="pathway-builder-delete"]').exists()).toBe(false)
  })

  it('opens the tags dialog and syncs updates back to the store', async () => {
    const store = loadPathway()
    const syncSpy = vi.spyOn(store, 'syncTags').mockResolvedValue(undefined)

    const w = mount(PathwayBuilder, {
      global: {
        plugins: [vuetify, router],
        stubs,
      },
    })
    await flushPromises()

    await w.get('[data-testid="pathway-builder-tags"]').trigger('click')
    const dialog = w.findComponent({ name: 'TagSelectionDialog' })
    expect(dialog.exists()).toBe(true)
    await dialog.vm.$emit('update:selected-tags', [{ id: 1, name: 'trial' }])
    expect(syncSpy).toHaveBeenCalledWith([{ id: 1, name: 'trial' }])
  })

  it('opens the access dialog from the action bar', async () => {
    loadPathway()

    const w = mount(PathwayBuilder, {
      global: {
        plugins: [vuetify, router],
        stubs,
      },
    })
    await flushPromises()

    await w.get('[data-testid="pathway-builder-access"]').trigger('click')
    await flushPromises()

    expect(w.findComponent({ name: 'EntityAccessDialog' }).props('modelValue')).toBe(true)
  })

  it('returns early from export and import handlers when no design or file is available', async () => {
    const w = mount(PathwayBuilder, {
      global: {
        plugins: [vuetify, router],
        stubs,
      },
    })

    await expect((w.vm as any).$.setupState.handleExport()).resolves.toBeUndefined()
    await expect(
      (w.vm as any).$.setupState.handleImportFileChange({ target: { files: [], value: 'x' } })
    ).resolves.toBeUndefined()
    expect(serviceMocks.exportPathway).not.toHaveBeenCalled()
  })

  it('surfaces import and export failures and clears dismissed feedback', async () => {
    loadPathway(42, 'Failure case')
    serviceMocks.exportPathway.mockRejectedValueOnce(new Error('export failed'))
    serviceMocks.importPathway.mockRejectedValueOnce(new Error('import failed'))
    const w = mount(PathwayBuilder, {
      global: {
        plugins: [vuetify, router],
        stubs,
      },
    })
    await flushPromises()

    await (w.vm as any).$.setupState.handleExport()
    expect(builderMocks.feedback.value).toMatchObject({ message: 'Export failed', color: 'error' })

    const file = { text: async () => JSON.stringify({ name: 'Imported' }) }
    await (w.vm as any).$.setupState.handleImportFileChange({ target: { files: [file], value: '' } })
    expect(builderMocks.feedback.value).toMatchObject({ message: 'Import failed', color: 'error' })

    ;(w.vm as any).$.setupState.onSnackbarUpdate(false)
    expect(builderMocks.feedback.value).toBeNull()
  })

  it('builds versions configuration and opens the import picker', async () => {
    const store = loadPathway(42, 'Versioned pathway')
    store.currentPathway!.createdBy = { name: 'Author' } as never
    store.currentPathway!.createdDate = 0 as never
    const clearPreviewSpy = vi.spyOn(store, 'clearPreviewVersion')
    const w = mount(PathwayBuilder, {
      global: {
        plugins: [vuetify, router],
        stubs,
      },
    })
    await flushPromises()

    const input = w.get('[data-testid="pathway-builder-import-input"]').element as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => undefined)
    const setupState = (w.vm as any).$.setupState
    setupState.handleImportClick()
    expect(clickSpy).toHaveBeenCalled()

    const versionsConfig = setupState.versionsConfig
    expect(versionsConfig).toMatchObject({ assetType: 'pathway-analysis', assetId: 42 })
    expect(versionsConfig.currentVersion()).toMatchObject({
      assetId: 42,
      createdBy: { name: 'Author' },
      createdDate: new Date(0).toISOString(),
      displayVersion: 'Current',
    })
    versionsConfig.clearPreview()
    expect(clearPreviewSpy).toHaveBeenCalled()
  })

  it('exports and imports pathway designs through the file handlers', async () => {
    loadPathway(42, 'Export Me')
    serviceMocks.exportPathway.mockResolvedValue({ name: 'Exported Pathway' })
    serviceMocks.importPathway.mockResolvedValue({ id: 77 })

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

    const pushSpy = vi.spyOn(router, 'push').mockResolvedValue(undefined)
    const w = mount(PathwayBuilder, {
      global: {
        plugins: [vuetify, router],
        stubs,
      },
    })
    await flushPromises()

    await w.get('[data-testid="pathway-builder-export"]').trigger('click')
    expect(serviceMocks.exportPathway).toHaveBeenCalledWith(42)
    expect(createObjectURLMock).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock')

    const input = w.get('[data-testid="pathway-builder-import-input"]')
    const badFile = { text: async () => '{not-json' }
    Object.defineProperty(input.element, 'files', { value: [badFile], configurable: true })
    await input.trigger('change')
    await flushPromises()
    expect(serviceMocks.importPathway).not.toHaveBeenCalled()

    const goodFile = { text: async () => JSON.stringify({ name: 'Imported' }) }
    Object.defineProperty(input.element, 'files', { value: [goodFile], configurable: true })
    await input.trigger('change')
    await flushPromises()

    expect(serviceMocks.importPathway).toHaveBeenCalled()
    expect(pushSpy).toHaveBeenCalledWith('/pathways/77')

    createElementSpy.mockRestore()
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', { value: originalCreateObjectURL, configurable: true })
    } else {
      delete (URL as typeof URL & { createObjectURL?: typeof URL.createObjectURL }).createObjectURL
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', { value: originalRevokeObjectURL, configurable: true })
    } else {
      delete (URL as typeof URL & { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL
    }
  })
})
