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
  copy: vi.fn(),
  remove: vi.fn(),
  feedback: { value: null as { message: string; color: 'success' | 'error' | 'info' } | null },
}))

const serviceMocks = vi.hoisted(() => ({
  exportPathway: vi.fn(),
  importPathway: vi.fn(),
}))

vi.mock('@/composables/usePathwayBuilder', () => ({
  usePathwayBuilder: () => ({
    save: builderMocks.save,
    copy: builderMocks.copy,
    remove: builderMocks.remove,
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

const stubs = [
  'PathwayWorkbench',
  'TagSelectionDialog',
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

    expect((w.find('[data-testid="pathway-builder-name"]').element as HTMLInputElement).value).toBe('Pathway 1')
    expect((w.find('[data-testid="pathway-builder-description"]').element as HTMLInputElement).value).toBe('Short note')
    expect(w.findComponent({ name: 'AnalysisBuilderShell' }).props('subtitle')).toBe('#42 · Short note')
  })

  it('routes back and forwards save/copy/delete actions to the builder composable', async () => {
    loadPathway()
    const pushSpy = vi.spyOn(router, 'push')
    builderMocks.save.mockResolvedValue(true)
    builderMocks.copy.mockResolvedValue(true)
    builderMocks.remove.mockResolvedValue(true)

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
    await w.get('[data-testid="pathway-builder-copy"]').trigger('click')
    await w.get('[data-testid="pathway-builder-delete"]').trigger('click')
    await flushPromises()

    expect(pushSpy).toHaveBeenCalledWith('/analysis/pathways')
    expect(builderMocks.save).toHaveBeenCalled()
    expect(builderMocks.copy).toHaveBeenCalled()
    expect(builderMocks.remove).toHaveBeenCalled()
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
