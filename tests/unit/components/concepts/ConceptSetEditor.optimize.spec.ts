import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useNotifications } from '@/stores/notifications'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'
import type { ConceptSet, ConceptSetItem } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/concept-set-versions.service', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/concept-set-versions.service')>()
  return { ...actual, getVersions: vi.fn().mockResolvedValue([]) }
})

const vuetify = createVuetify({ components, directives })

const item = (conceptId: number, name: string, flags: Partial<ConceptSetItem> = {}): ConceptSetItem => ({
  conceptId,
  conceptName: name,
  conceptCode: String(conceptId),
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
  isExcluded: false,
  includeDescendants: false,
  includeMapped: false,
  ...flags,
})

const parent = item(201820, 'Diabetes mellitus', { includeDescendants: true })
const child = item(201826, 'Type 2 diabetes mellitus')

const OptimizeDialogStub = defineComponent({
  name: 'ConceptSetOptimizeDialog',
  props: {
    modelValue: Boolean,
    items: { type: Array, default: () => [] },
    sourceKey: { type: String, default: '' },
    conceptSetName: { type: String, default: '' },
    canCreateNew: Boolean,
    busy: Boolean,
  },
  emits: ['update:modelValue', 'overwrite', 'create'],
  template: '<div data-testid="optimize-dialog-stub" />',
})

function mountEditor(set: ConceptSet, props: Record<string, unknown> = {}) {
  const store = useConceptSetsStore()
  store.currentSet = set
  return mount(ConceptSetEditor, {
    props: { modelValue: true, conceptSet: set, ...props },
    global: {
      plugins: [vuetify],
      stubs: {
        ConceptSetOptimizeDialog: OptimizeDialogStub,
        EntityAccessDialog: true,
        EntityAccessLockButton: true,
        ConceptSearchInline: true,
        ConceptSetTable: true,
        VNavigationDrawer: { template: '<div class="v-navigation-drawer"><slot /></div>' },
        Teleport: { template: '<div><slot /></div>' },
      },
    },
  })
}

const optimizeButton = (w: ReturnType<typeof mountEditor>) =>
  w.find('[data-testid="cs-editor-optimize-btn"]')

describe('ConceptSetEditor optimize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    useAuthStore().setUser({
      login: 'tester',
      displayName: 'tester',
      permissionIdx: {
        create: ['create:conceptset'],
        write: ['write:conceptset'],
        read: ['read:conceptset'],
      },
      entityAccess: emptyEntityAccess(),
    })
  })

  it('needs at least two concepts', () => {
    const w = mountEditor({ id: 7, name: 'Diabetes', items: [parent] })
    expect(optimizeButton(w).attributes('disabled')).toBeDefined()
  })

  it('is disabled while concepts are missing from the vocabulary', () => {
    const w = mountEditor({
      id: 7,
      name: 'Diabetes',
      items: [parent, { ...child, conceptName: '', missingFromVocabulary: true }],
    })
    expect(optimizeButton(w).attributes('disabled')).toBeDefined()
  })

  it('opens the dialog with the current items and allows a new set in the standalone editor', async () => {
    const w = mountEditor({ id: 7, name: 'Diabetes', items: [parent, child] })
    expect(optimizeButton(w).attributes('disabled')).toBeUndefined()

    await optimizeButton(w).trigger('click')

    const dialog = w.findComponent(OptimizeDialogStub)
    expect(dialog.props('items')).toEqual([parent, child])
    expect(dialog.props('conceptSetName')).toBe('Diabetes')
    expect(dialog.props('canCreateNew')).toBe(true)
  })

  it('does not offer a new repository set from the cohort-embedded editor', async () => {
    const w = mountEditor({ id: 3, name: 'Diabetes', items: [parent, child] }, { embedded: true })
    await optimizeButton(w).trigger('click')

    expect(w.findComponent(OptimizeDialogStub).props('canCreateNew')).toBe(false)
  })

  it('overwrites the items and leaves the change unsaved', async () => {
    const store = useConceptSetsStore()
    const w = mountEditor({ id: 7, name: 'Diabetes', items: [parent, child] })
    await optimizeButton(w).trigger('click')

    w.findComponent(OptimizeDialogStub).vm.$emit('overwrite', [parent])
    await flushPromises()

    expect(store.currentSet?.items).toEqual([parent])
    expect(w.findComponent(OptimizeDialogStub).exists()).toBe(false)
    expect((w.vm as unknown as { hasUnsavedChanges: boolean }).hasUnsavedChanges).toBe(true)
  })

  it('creates the optimized set as a new concept set', async () => {
    const store = useConceptSetsStore()
    const create = vi
      .spyOn(store, 'create')
      .mockResolvedValue({ id: 8, name: 'Diabetes - OPTIMIZED', items: [parent] } as never)
    const w = mountEditor({ id: 7, name: 'Diabetes', items: [parent, child] })
    await optimizeButton(w).trigger('click')

    w.findComponent(OptimizeDialogStub).vm.$emit('create', {
      name: 'Diabetes - OPTIMIZED',
      items: [parent],
    })
    await flushPromises()

    expect(create).toHaveBeenCalledWith({ name: 'Diabetes - OPTIMIZED', items: [parent] })
    expect(w.findComponent(OptimizeDialogStub).exists()).toBe(false)
    expect(useNotifications().items).toEqual([
      expect.objectContaining({ severity: 'success', title: 'Created concept set "Diabetes - OPTIMIZED"' }),
    ])
  })

  it('keeps the dialog open and reports a failed create', async () => {
    const store = useConceptSetsStore()
    vi.spyOn(store, 'create').mockImplementation(async () => {
      store.error = 'HTTP 409: name exists'
      return null
    })
    const w = mountEditor({ id: 7, name: 'Diabetes', items: [parent, child] })
    await optimizeButton(w).trigger('click')

    w.findComponent(OptimizeDialogStub).vm.$emit('create', { name: 'Diabetes', items: [parent] })
    await flushPromises()

    expect(w.findComponent(OptimizeDialogStub).exists()).toBe(true)
    expect(useNotifications().items).toEqual([
      expect.objectContaining({ severity: 'danger', message: 'HTTP 409: name exists' }),
    ])
  })
})
