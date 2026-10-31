import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useNotifications } from '@/stores/notifications'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'
import type { Concept, ConceptSet, ConceptSetItem } from '@/models/concept-set.types'
import type { VersionsConfig } from '@/components/versions/types'
import type { Version } from '@/services/concept-set-versions.service'
import * as conceptSearchService from '@/services/concept-search.service'
import { getVersions } from '@/services/concept-set-versions.service'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/concept-search.service', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/concept-search.service')>()
  return { ...actual, getConceptsByIds: vi.fn(), getConceptsBySourceCodes: vi.fn() }
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

const concept = (conceptId: number, overrides: Partial<Concept> = {}): Concept => ({
  conceptId,
  conceptName: `Concept ${conceptId}`,
  conceptCode: String(conceptId),
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
  ...overrides,
})

const existingSet = (overrides: Partial<ConceptSet> = {}): ConceptSet => ({
  id: 123,
  name: 'Heart failure',
  createdBy: 'alice',
  createdDate: '2024-01-15T10:00:00.000Z',
  items: [item(316139, 'Heart failure', { includeDescendants: true })],
  ...overrides,
})

const DrawerStub = defineComponent({
  name: 'VNavigationDrawer',
  props: {
    modelValue: Boolean,
    location: { type: String, default: undefined },
    temporary: Boolean,
    width: { type: Number, default: undefined },
  },
  emits: ['update:modelValue'],
  template: '<div class="drawer-stub"><slot /></div>',
})

const DialogStub = defineComponent({
  name: 'AtlasDialog',
  props: { modelValue: Boolean, title: { type: String, default: '' }, eyebrow: { type: String, default: '' } },
  emits: ['update:modelValue', 'close'],
  template: '<section v-if="modelValue" class="dialog-stub" :data-title="title"><slot /><slot name="actions" /></section>',
})

const JsonDialogStub = defineComponent({
  name: 'ConceptSetJsonDialog',
  props: {
    modelValue: Boolean,
    json: { type: String, default: '' },
    filename: { type: String, default: '' },
    canApply: Boolean,
  },
  emits: ['update:modelValue', 'apply'],
  template: '<div class="json-dialog-stub" />',
})

const OptimizeDialogStub = defineComponent({
  name: 'ConceptSetOptimizeDialog',
  props: {
    modelValue: Boolean,
    items: { type: Array, default: () => [] },
    busy: Boolean,
    canCreateNew: Boolean,
  },
  emits: ['update:modelValue', 'overwrite', 'create'],
  template: '<div class="optimize-dialog-stub" />',
})

const VersionsStub = defineComponent({
  name: 'VersionsTabContent',
  props: { config: { type: Object, required: true } },
  template: '<div class="versions-stub" />',
})

const DetailStub = defineComponent({
  name: 'ConceptDetailContent',
  props: {
    sourceKey: { type: String, default: '' },
    conceptId: { type: Number, default: 0 },
    onBack: { type: Function, default: undefined },
  },
  emits: ['navigate'],
  template: '<div class="detail-stub" />',
})

const AuthorshipStub = defineComponent({
  name: 'AssetAuthorship',
  props: {
    createdBy: { type: String, default: undefined },
    createdDate: { type: [String, Number], default: undefined },
    modifiedBy: { type: String, default: undefined },
    modifiedDate: { type: [String, Number], default: undefined },
  },
  template: '<div class="authorship-stub" />',
})

const SetTableStub = defineComponent({
  name: 'ConceptSetTable',
  props: { items: { type: Array, default: () => [] }, sourceKey: { type: String, default: '' } },
  emits: ['toggle:descendants', 'toggle:mapped', 'toggle:exclude', 'remove', 'view-concept'],
  template: '<div class="set-table-stub" />',
})

const SearchEmbedStub = defineComponent({
  name: 'ConceptSearchEmbed',
  emits: ['add-concept', 'add-concepts', 'remove-concept', 'view-concept'],
  template: '<div class="search-stub" />',
})

const IncludedStub = defineComponent({
  name: 'IncludedConceptsTable',
  emits: ['view-concept', 'add-concepts', 'retry'],
  template: '<div class="included-stub" />',
})

const SourceCodesTabStub = defineComponent({
  name: 'IncludedSourceCodesTable',
  props: { active: Boolean, sourceKey: { type: String, default: '' } },
  emits: ['view-concept', 'add-concepts'],
  template: '<div class="source-codes-tab-stub" />',
})

const RecommendStub = defineComponent({
  name: 'RecommendTab',
  props: { active: Boolean },
  emits: ['concepts-added'],
  template: '<div class="recommend-stub" />',
})

const FacetFiltersStub = defineComponent({
  name: 'ConceptFacetFilters',
  props: { facetOptions: { type: Object, default: () => ({}) } },
  template: '<div class="facet-stub" />',
})

const ConceptTableStub = defineComponent({
  name: 'ConceptTable',
  props: { concepts: { type: Array, default: () => [] }, selected: { type: Array, default: () => [] } },
  emits: ['update:selected'],
  template: '<div class="concept-table-stub" />',
})

interface MountOptions {
  conceptSet?: ConceptSet | null
  currentSet?: ConceptSet | null
  modelValue?: boolean
  embedded?: boolean
  presentation?: 'drawer' | 'page'
  sourceKey?: string
}

function mountEditor(options: MountOptions = {}) {
  const store = useConceptSetsStore()
  const conceptSet = options.conceptSet === undefined ? existingSet() : options.conceptSet
  store.currentSet =
    options.currentSet === undefined
      ? conceptSet
        ? { ...conceptSet, items: [...conceptSet.items] }
        : null
      : options.currentSet
  return mount(ConceptSetEditor, {
    props: {
      modelValue: options.modelValue ?? true,
      conceptSet,
      embedded: options.embedded,
      presentation: options.presentation,
    },
    global: {
      plugins: [vuetify],
      provide: { sourceKey: { value: options.sourceKey ?? 'SRC1' } },
      stubs: {
        VNavigationDrawer: DrawerStub,
        Teleport: { template: '<div><slot /></div>' },
        AtlasMenu: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
        AtlasDialog: DialogStub,
        ConceptSetJsonDialog: JsonDialogStub,
        ConceptSetOptimizeDialog: OptimizeDialogStub,
        VersionsTabContent: VersionsStub,
        ConceptDetailContent: DetailStub,
        AssetAuthorship: AuthorshipStub,
        ConceptSetTable: SetTableStub,
        ConceptSearchEmbed: SearchEmbedStub,
        IncludedConceptsTable: IncludedStub,
        IncludedSourceCodesTable: SourceCodesTabStub,
        RecommendTab: RecommendStub,
        CompareTab: true,
        ConceptFacetFilters: FacetFiltersStub,
        ConceptTable: ConceptTableStub,
        TagSelectionDialog: true,
        EntityAccessDialog: true,
        EntityAccessLockButton: true,
      },
    },
  })
}

async function mountReady(options: MountOptions = {}) {
  const w = mountEditor(options)
  await flushPromises()
  return w
}

type Editor = VueWrapper<InstanceType<typeof ConceptSetEditor>>

const activeTab = (w: Editor) => (w.vm as unknown as { activeTab: string }).activeTab
const setActiveTab = async (w: Editor, tab: string) => {
  (w.vm as unknown as { activeTab: string }).activeTab = tab
  await nextTick()
}
const primary = (w: Editor) => w.get('[data-testid="cs-editor-primary-btn"]')
const dialog = (w: Editor, title: string) => w.find(`.dialog-stub[data-title="${title}"]`)
const buttonIn = (w: Editor, title: string, label: string) => {
  const btn = dialog(w, title)
    .findAll('button')
    .find(b => b.text().trim().startsWith(label))
  if (!btn) throw new Error(`No "${label}" button in dialog "${title}"`)
  return btn
}
const menuItem = (w: Editor, testid: string) => w.get(`[data-testid="${testid}"]`)
const typeTitle = async (w: Editor, value: string) => {
  const input = w.get('input.cs-editor__title-input')
  ;(input.element as HTMLInputElement).value = value
  await input.trigger('input')
}

async function expectCloseAsksToConfirm(w: Editor) {
  await w.get('[data-testid="cs-editor-close-btn"]').trigger('click')
  expect(dialog(w, 'Unsaved changes').exists()).toBe(true)
  expect(w.emitted('update:modelValue')).toBeUndefined()
}

async function expectCloseClosesImmediately(w: Editor) {
  const before = w.emitted('update:modelValue')?.length ?? 0
  await w.get('[data-testid="cs-editor-close-btn"]').trigger('click')
  expect(dialog(w, 'Unsaved changes').exists()).toBe(false)
  expect(w.emitted('update:modelValue')?.slice(before)).toEqual([[false]])
}

function setUser(permissions: { create?: string[]; write?: string[] } = {}) {
  useAuthStore().setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: {
      create: permissions.create ?? ['create:conceptset'],
      write: permissions.write ?? ['write:conceptset'],
      read: ['read:conceptset'],
    },
    entityAccess: emptyEntityAccess(),
  })
}

const previewVersion = { version: 2 } as unknown as Version

describe('ConceptSetEditor behaviors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getVersions).mockResolvedValue([])
    setActivePinia(createPinia())
    setUser()
    document.body.style.overflow = ''
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  describe('initial state', () => {
    it('opens with every dialog closed', async () => {
      const w = mountEditor()
      await flushPromises()

      expect(w.findAll('.dialog-stub')).toHaveLength(0)
      expect(w.findComponent(JsonDialogStub).props('modelValue')).toBe(false)
      expect(w.findComponent(OptimizeDialogStub).exists()).toBe(false)
      expect(w.findComponent({ name: 'TagSelectionDialog' }).props('modelValue')).toBe(false)
      expect(w.findComponent({ name: 'EntityAccessDialog' }).props('modelValue')).toBe(false)
      expect(w.findComponent(VersionsStub).exists()).toBe(false)
    })

    it('closes without confirmation when nothing was edited', async () => {
      const w = mountEditor()
      await expectCloseClosesImmediately(w)
    })

    it('labels the header with the set id for an existing set and plainly for a new one', () => {
      expect(mountEditor().get('.text-eyebrow').text()).toBe('Concept Set · #123')
      expect(mountEditor({ conceptSet: { name: 'x', items: [] } }).get('.text-eyebrow').text()).toBe('Concept Set')
      expect(mountEditor({ conceptSet: null }).get('.text-eyebrow').text()).toBe('Concept Set')
    })

    it('shows the rail label', () => {
      expect(mountEditor().get('.cs-editor__rail-text').text()).toBe('Concept set editor')
    })

    it('shows the selected item count, and zero without a current set', () => {
      const two = existingSet({ items: [item(1, 'a'), item(2, 'b')] })
      const firstChip = (w: Editor) => w.get('.cs-editor__tab-count').text()
      expect(firstChip(mountEditor({ conceptSet: two }))).toBe('2')
      expect(firstChip(mountEditor({ conceptSet: null, currentSet: null }))).toBe('0')
    })

    it('shows an ellipsis on the Included and Source codes counts while they load', async () => {
      const w = mountEditor()
      const store = useConceptSetsStore()
      store.includedLoading = true
      store.sourceCodeLoading = true
      await nextTick()
      const chips = w.findAll('.cs-editor__tab-count').map(c => c.text())
      expect(chips.slice(1)).toEqual(['…', '…'])
    })
  })

  describe('authorship', () => {
    it('shows who created and modified a saved set', () => {
      const w = mountEditor({
        conceptSet: existingSet({ modifiedBy: 'bob', modifiedDate: '2024-02-01T00:00:00.000Z' }),
      })
      expect(w.getComponent(AuthorshipStub).props()).toEqual({
        createdBy: 'alice',
        createdDate: '2024-01-15T10:00:00.000Z',
        modifiedBy: 'bob',
        modifiedDate: '2024-02-01T00:00:00.000Z',
      })
    })

    it('is hidden for an unsaved set and for the "new" placeholder id', () => {
      expect(mountEditor({ conceptSet: { name: 'x', items: [] } }).findComponent(AuthorshipStub).exists()).toBe(false)
      expect(
        mountEditor({ conceptSet: existingSet({ id: 'new' }) }).findComponent(AuthorshipStub).exists()
      ).toBe(false)
    })
  })

  describe('drawer presentation', () => {
    it('renders a temporary right-hand drawer at 95% of the window, never narrower than 500px', async () => {
      const original = window.innerWidth
      try {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
        const w = mountEditor()
        await nextTick()
        const drawer = w.getComponent(DrawerStub)
        expect(drawer.props('location')).toBe('right')
        expect(drawer.props('temporary')).toBe(true)
        expect(drawer.props('modelValue')).toBe(true)
        expect(drawer.props('width')).toBe(950)

        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 })
        window.dispatchEvent(new Event('resize'))
        await flushPromises()
        expect(w.getComponent(DrawerStub).props('width')).toBe(500)
      } finally {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: original })
      }
    })

    it('stops tracking window resizes once unmounted', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      const w = mountEditor()
      w.unmount()
      expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
      removeSpy.mockRestore()
    })

    it('stacks above the cohort builder when embedded', () => {
      const w = mountEditor({ embedded: true })
      expect(w.getComponent(DrawerStub).attributes('style')).toContain('z-index: 2100')
      expect(mountEditor().getComponent(DrawerStub).attributes('style')).toBeUndefined()
    })

    it('locks body scroll while open and releases it on close and on unmount', async () => {
      const w = mountEditor()
      expect(document.body.style.overflow).toBe('hidden')
      await w.setProps({ modelValue: false })
      expect(document.body.style.overflow).toBe('')
      await w.setProps({ modelValue: true })
      expect(document.body.style.overflow).toBe('hidden')
      w.unmount()
      expect(document.body.style.overflow).toBe('')
    })

    it('forwards the drawer opening itself and treats a drawer dismissal as Close', async () => {
      const w = mountEditor()
      await w.getComponent(DrawerStub).vm.$emit('update:modelValue', true)
      expect(w.emitted('update:modelValue')).toEqual([[true]])

      await typeTitle(w, 'Renamed')
      await w.getComponent(DrawerStub).vm.$emit('update:modelValue', false)
      expect(dialog(w, 'Unsaved changes').exists()).toBe(true)
      expect(w.emitted('update:modelValue')).toEqual([[true]])
    })
  })

  describe('page presentation', () => {
    it('renders inline instead of as a drawer and leaves body scroll alone', () => {
      const w = mountEditor({ presentation: 'page' })
      expect(w.findComponent(DrawerStub).exists()).toBe(false)
      expect(w.find('.cs-editor__page').exists()).toBe(true)
      expect(document.body.style.overflow).toBe('')
    })

    it('stays open after saving', async () => {
      const w = await mountReady({ presentation: 'page' })
      const store = useConceptSetsStore()
      vi.spyOn(store, 'update').mockResolvedValue(existingSet())
      vi.spyOn(store, 'syncTags').mockResolvedValue({ success: true })
      await primary(w).trigger('click')
      await flushPromises()
      expect(w.emitted('save')).toHaveLength(1)
      expect(w.emitted('update:modelValue')).toBeUndefined()
    })
  })

  describe('opening tab', () => {
    it('opens a set with id 0 on Selected, since 0 is still a saved id', () => {
      expect(activeTab(mountEditor({ conceptSet: existingSet({ id: 0, items: [] }) }))).toBe('selected')
    })

    it('treats a null id as unsaved: opens on Search with a plain header and Create', () => {
      const w = mountEditor({ conceptSet: { id: null, name: 'x', items: [] } as unknown as ConceptSet })
      expect(activeTab(w)).toBe('search')
      expect(w.get('.text-eyebrow').text()).toBe('Concept Set')
      expect(primary(w).text()).toBe('Create')
    })

    it('falls back to Search when the set has no items array at all', () => {
      const w = mountEditor({ conceptSet: { name: '' } as unknown as ConceptSet, currentSet: null })
      expect(activeTab(w)).toBe('search')
    })

    it('re-evaluates the tab each time the drawer reopens', async () => {
      const w = mountEditor()
      await setActiveTab(w, 'compare')
      await w.setProps({ modelValue: false })
      await w.setProps({ modelValue: true })
      expect(activeTab(w)).toBe('selected')
    })

    it('passes the active state to the tabs that load lazily', async () => {
      const w = mountEditor()
      await setActiveTab(w, 'recommend')
      await flushPromises()
      expect(w.getComponent(RecommendStub).props('active')).toBe(true)
      await setActiveTab(w, 'source-codes')
      await flushPromises()
      expect(w.getComponent(SourceCodesTabStub).props('active')).toBe(true)
      expect(w.getComponent(RecommendStub).props('active')).toBe(false)
    })
  })

  describe('name validation', () => {
    it('reports a blank name and disables the primary button', async () => {
      const w = mountEditor()
      await typeTitle(w, '   ')
      expect(w.get('.cs-editor__title-error').text()).toBe('Name is required')
      expect(primary(w).attributes('disabled')).toBeDefined()
      expect(w.get('[data-testid="disabled-reason-wrap"]').attributes('title')).toBe(
        'Give the concept set a name before saving.'
      )
    })

    it('accepts 255 characters and rejects 256', async () => {
      const w = mountEditor()
      await typeTitle(w, 'a'.repeat(255))
      expect(w.find('.cs-editor__title-error').exists()).toBe(false)
      expect(primary(w).attributes('disabled')).toBeUndefined()

      await typeTitle(w, 'a'.repeat(256))
      expect(w.get('.cs-editor__title-error').text()).toBe('Name must be between 1 and 255 characters')
      expect(primary(w).attributes('disabled')).toBeDefined()
    })

    it('treats a set without a name as blank', () => {
      const w = mountEditor({ conceptSet: existingSet({ name: undefined as unknown as string }) })
      expect((w.get('input.cs-editor__title-input').element as HTMLInputElement).value).toBe('')
      expect(w.get('.cs-editor__title-error').text()).toBe('Name is required')
    })

    it('ignores a direct save or apply while the name is invalid', async () => {
      const w = mountEditor({ conceptSet: { name: '', items: [] } })
      const store = useConceptSetsStore()
      const createSpy = vi.spyOn(store, 'create')
      const vm = w.vm as unknown as { onSave: () => Promise<void>; onApply: () => void }
      await vm.onSave()
      vm.onApply()
      expect(createSpy).not.toHaveBeenCalled()
      expect(w.emitted('apply')).toBeUndefined()
    })
  })

  describe('primary button', () => {
    it('reads Create for a new set and calls store.create with the name and items', async () => {
      const newSet: ConceptSet = { name: 'New', items: [item(1, 'a')] }
      const w = await mountReady({ conceptSet: newSet })
      const store = useConceptSetsStore()
      const created = { ...newSet, id: 77 }
      const createSpy = vi.spyOn(store, 'create').mockResolvedValue(created)
      const syncSpy = vi.spyOn(store, 'syncTags').mockResolvedValue({ success: true })
      expect(primary(w).text()).toBe('Create')

      await typeTitle(w, 'Renamed')
      await primary(w).trigger('click')
      await flushPromises()

      expect(createSpy).toHaveBeenCalledWith({ name: 'Renamed', items: [item(1, 'a')] })
      expect(syncSpy).toHaveBeenCalledWith(77, [], [])
      expect(w.emitted('save')).toEqual([[created]])
      expect(w.emitted('update:modelValue')).toEqual([[false]])
    })

    it('creates with no items when there is no current set', async () => {
      const w = await mountReady({ conceptSet: { name: 'New', items: [] }, currentSet: null })
      const store = useConceptSetsStore()
      const createSpy = vi.spyOn(store, 'create').mockResolvedValue(null)
      await primary(w).trigger('click')
      await flushPromises()
      expect(createSpy).toHaveBeenCalledWith({ name: 'New', items: [] })
    })

    it('reads Save for an existing set and calls store.update with the edited name and current items', async () => {
      const set = existingSet()
      const w = await mountReady({ conceptSet: set })
      const store = useConceptSetsStore()
      store.currentSet = { ...set, items: [item(9, 'nine')] }
      const updateSpy = vi.spyOn(store, 'update').mockResolvedValue(set)
      vi.spyOn(store, 'syncTags').mockResolvedValue({ success: true })
      expect(primary(w).text()).toBe('Save')

      await typeTitle(w, 'Edited')
      await primary(w).trigger('click')
      await flushPromises()

      expect(updateSpy).toHaveBeenCalledWith({ ...set, name: 'Edited', items: [item(9, 'nine')] })
      expect(w.emitted('save')).toEqual([[set]])
    })

    it('updates with no items when the current set is gone', async () => {
      const set = existingSet()
      const w = await mountReady({ conceptSet: set, currentSet: null })
      const store = useConceptSetsStore()
      const updateSpy = vi.spyOn(store, 'update').mockResolvedValue(null)
      await primary(w).trigger('click')
      await flushPromises()
      expect(updateSpy).toHaveBeenCalledWith({ ...set, items: [] })
    })

    it('creates rather than updates when the id is 0', async () => {
      const set = existingSet({ id: 0 })
      const w = await mountReady({ conceptSet: set })
      const store = useConceptSetsStore()
      const updateSpy = vi.spyOn(store, 'update')
      const createSpy = vi.spyOn(store, 'create').mockResolvedValue(null)
      await primary(w).trigger('click')
      await flushPromises()
      expect(updateSpy).not.toHaveBeenCalled()
      expect(createSpy).toHaveBeenCalled()
    })

    it('emits nothing and stays dirty when the save fails', async () => {
      const w = await mountReady()
      const store = useConceptSetsStore()
      vi.spyOn(store, 'update').mockResolvedValue(null)
      const syncSpy = vi.spyOn(store, 'syncTags')
      await typeTitle(w, 'Edited')
      await primary(w).trigger('click')
      await flushPromises()

      expect(syncSpy).not.toHaveBeenCalled()
      expect(w.emitted('save')).toBeUndefined()
      expect(primary(w).classes()).not.toContain('v-btn--loading')
      await expectCloseAsksToConfirm(w)
    })

    it('skips tag sync when the saved set comes back without an id', async () => {
      const w = await mountReady({ conceptSet: { name: 'New', items: [] } })
      const store = useConceptSetsStore()
      vi.spyOn(store, 'create').mockResolvedValue({ name: 'New', items: [] })
      const syncSpy = vi.spyOn(store, 'syncTags')
      await primary(w).trigger('click')
      await flushPromises()
      expect(syncSpy).not.toHaveBeenCalled()
      expect(w.emitted('save')).toHaveLength(1)
    })

    it('does not warn when tags sync cleanly, and clears the dirty flag after saving', async () => {
      const w = await mountReady({ presentation: 'page' })
      const store = useConceptSetsStore()
      vi.spyOn(store, 'update').mockResolvedValue(existingSet())
      vi.spyOn(store, 'syncTags').mockResolvedValue({ success: true })
      const dangerSpy = vi.spyOn(useNotifications(), 'danger')
      await typeTitle(w, 'Edited')
      await primary(w).trigger('click')
      await flushPromises()
      expect(dangerSpy).not.toHaveBeenCalled()
      await expectCloseClosesImmediately(w)
    })

    it('diffs tags against the last saved tags on a second save', async () => {
      const tag = { id: 5, name: 'cardio' }
      const w = await mountReady({ presentation: 'page' })
      const store = useConceptSetsStore()
      vi.spyOn(store, 'update').mockResolvedValue(existingSet())
      const syncSpy = vi.spyOn(store, 'syncTags').mockResolvedValue({ success: true })
      ;(w.vm as unknown as { selectedTags: typeof tag[] }).selectedTags = [tag]
      await primary(w).trigger('click')
      await flushPromises()
      await primary(w).trigger('click')
      await flushPromises()
      expect(syncSpy.mock.calls[1]).toEqual([123, [tag], [tag]])
    })

    it('shows a loading button while the save is in flight', async () => {
      const w = await mountReady()
      const store = useConceptSetsStore()
      let resolve!: (v: ConceptSet | null) => void
      vi.spyOn(store, 'update').mockReturnValue(new Promise(r => (resolve = r)))
      await primary(w).trigger('click')
      await nextTick()
      expect(primary(w).classes()).toContain('v-btn--loading')
      resolve(null)
      await flushPromises()
      expect(primary(w).classes()).not.toContain('v-btn--loading')
    })

    it('explains a missing create permission for a new set', () => {
      setUser({ create: [] })
      const w = mountEditor({ conceptSet: { name: 'New', items: [] } })
      expect(primary(w).attributes('disabled')).toBeDefined()
      expect(w.get('[data-testid="disabled-reason-wrap"]').attributes('title')).toBe(
        'You do not have permission to create a concept set.'
      )
    })

    it('explains missing write access for an existing set', () => {
      setUser({ write: [] })
      const w = mountEditor()
      expect(primary(w).attributes('disabled')).toBeDefined()
      expect(w.get('[data-testid="disabled-reason-wrap"]').attributes('title')).toBe(
        'You do not own this concept set and have not been granted write access to it.'
      )
    })

    it('lets an embedded set apply without any repository permission', async () => {
      setUser({ create: [], write: [] })
      const w = await mountReady({ conceptSet: existingSet({ id: 4 }), embedded: true })
      expect(primary(w).text()).toBe('Apply')
      expect(primary(w).attributes('disabled')).toBeUndefined()
      await typeTitle(w, 'Edited')
      await primary(w).trigger('click')
      expect(w.emitted('apply')).toEqual([[{ id: 4, name: 'Edited', items: existingSet().items }]])
      expect(w.emitted('update:modelValue')).toEqual([[false]])
    })

    it('applies an empty item list when the embedded editor has no current set', async () => {
      const w = await mountReady({ conceptSet: existingSet({ id: 4 }), embedded: true, currentSet: null })
      await primary(w).trigger('click')
      expect(w.emitted('apply')).toEqual([[{ id: 4, name: 'Heart failure', items: [] }]])
    })

    it('does not fetch versions for an id that is not a number', async () => {
      mountEditor({ conceptSet: existingSet({ id: 'abc' }) })
      await flushPromises()
      expect(getVersions).not.toHaveBeenCalled()
    })
  })

  describe('versions', () => {
    const historyButton = (w: Editor) => w.get('[aria-label="Version history"]')

    it('counts the versions of a saved set on the history badge', async () => {
      vi.mocked(getVersions).mockResolvedValue([{}, {}, {}] as unknown as Version[])
      const w = mountEditor()
      await flushPromises()
      expect(getVersions).toHaveBeenCalledWith(123)
      expect(w.findAll('.v-badge__badge').map(b => b.text())).toContain('3')
    })

    it('shows no count when loading versions fails', async () => {
      vi.mocked(getVersions).mockRejectedValue(new Error('boom'))
      const w = mountEditor()
      await flushPromises()
      expect(w.findAll('.v-badge__badge').map(b => b.text())).not.toContain('3')
      expect((w.vm as unknown as { versionCount: number }).versionCount).toBe(0)
    })

    it('resets the count when switching to an unsaved set', async () => {
      vi.mocked(getVersions).mockResolvedValue([{}, {}] as unknown as Version[])
      const w = mountEditor()
      await flushPromises()
      await w.setProps({ conceptSet: { name: 'New', items: [] } })
      await flushPromises()
      expect((w.vm as unknown as { versionCount: number }).versionCount).toBe(0)
    })

    it('opens the history dialog with a config for this set', async () => {
      const set = existingSet({ modifiedBy: 'bob', modifiedDate: Date.UTC(2024, 1, 1) })
      const w = mountEditor({ conceptSet: set })
      const store = useConceptSetsStore()
      const clearSpy = vi.spyOn(store, 'clearPreviewVersion').mockResolvedValue()
      await historyButton(w).trigger('click')
      await nextTick()

      const config = w.getComponent(VersionsStub).props('config') as VersionsConfig
      expect(config.assetType).toBe('conceptset')
      expect(config.assetId).toBe(123)
      expect(config.currentVersion()).toEqual({
        version: 0,
        assetId: 123,
        createdBy: { id: 0, name: 'bob' },
        createdDate: '2024-02-01T00:00:00.000Z',
        comment: null,
        archived: false,
        displayVersion: 'Current',
        isCurrent: true,
        isPreviewing: false,
        formattedDate: 'Current',
      })
      expect(config.canEdit.value).toBe(true)
      expect(config.isDirty.value).toBe(false)
      store.previewVersion = previewVersion
      expect(config.canEdit.value).toBe(false)
      expect(config.previewVersion.value).toEqual(previewVersion)
      config.clearPreview()
      expect(clearSpy).toHaveBeenCalled()
    })

    it('falls back to the creator and creation date for the current row', async () => {
      const w = mountEditor()
      await historyButton(w).trigger('click')
      await nextTick()
      const row = (w.getComponent(VersionsStub).props('config') as VersionsConfig).currentVersion()
      expect(row.createdBy).toEqual({ id: 0, name: 'alice' })
      expect(row.createdDate).toBe('2024-01-15T10:00:00.000Z')
    })

    it('names an unknown author when the set records none', async () => {
      const w = mountEditor({ conceptSet: existingSet({ createdBy: undefined, createdDate: undefined }) })
      await historyButton(w).trigger('click')
      await nextTick()
      const row = (w.getComponent(VersionsStub).props('config') as VersionsConfig).currentVersion()
      expect(row.createdBy).toEqual({ id: 0, name: 'Unknown' })
      expect(Number.isNaN(Date.parse(row.createdDate))).toBe(false)
    })

    it('reports unsaved edits through the config', async () => {
      const w = mountEditor()
      await historyButton(w).trigger('click')
      await typeTitle(w, 'Edited')
      expect((w.getComponent(VersionsStub).props('config') as VersionsConfig).isDirty.value).toBe(true)
    })
  })

  describe('previewing a version', () => {
    function mountPreview(options: MountOptions = {}) {
      const w = mountEditor(options)
      useConceptSetsStore().previewVersion = previewVersion
      return w
    }

    it('makes the editor read-only and offers to go back to the current version', async () => {
      const w = mountPreview()
      await nextTick()
      expect(w.get('input.cs-editor__title-input').attributes('disabled')).toBeDefined()
      expect(w.get('[data-testid="cs-editor-tags-btn"]').attributes('disabled')).toBeDefined()
      expect(w.find('[data-testid="cs-editor-paste-ids"]').exists()).toBe(false)
      expect(w.find('[data-testid="cs-editor-import-source-codes"]').exists()).toBe(false)
      expect(w.find('[data-testid="cs-editor-import-json"]').exists()).toBe(false)
      expect(w.find('[data-testid="cs-editor-optimize-menu-item"]').exists()).toBe(false)
      expect(w.find('[data-testid="cs-editor-download-json"]').exists()).toBe(true)

      await w.get('[aria-label="Back to current version"]').trigger('click')
      expect(w.emitted('back-to-current')).toHaveLength(1)
    })

    it('has no back-to-current button outside preview', () => {
      expect(mountEditor().find('[aria-label="Back to current version"]').exists()).toBe(false)
    })

    it('ignores edits from the tables and search while previewing', async () => {
      const w = mountPreview()
      await nextTick()
      const store = useConceptSetsStore()
      const add = vi.spyOn(store, 'addConceptToSet')
      const remove = vi.spyOn(store, 'removeConceptFromSet')
      const removeItem = vi.spyOn(store, 'removeConceptItem')
      const toggle = vi.spyOn(store, 'toggleConceptItemFlag')
      const row = store.currentSet!.items[0]
      const table = w.getComponent(SetTableStub)
      table.vm.$emit('toggle:descendants', row)
      table.vm.$emit('toggle:mapped', row)
      table.vm.$emit('toggle:exclude', row)
      table.vm.$emit('remove', row)
      await setActiveTab(w, 'search')
      await flushPromises()
      const search = w.getComponent(SearchEmbedStub)
      search.vm.$emit('add-concept', concept(1))
      search.vm.$emit('add-concepts', [concept(2)])
      search.vm.$emit('remove-concept', concept(1))
      await nextTick()

      expect(add).not.toHaveBeenCalled()
      expect(remove).not.toHaveBeenCalled()
      expect(removeItem).not.toHaveBeenCalled()
      expect(toggle).not.toHaveBeenCalled()
      expect(activeTab(w)).toBe('search')
    })

    it('blocks applying edited expression JSON while previewing', async () => {
      const w = mountPreview()
      await nextTick()
      const json = w.getComponent(JsonDialogStub)
      expect(json.props('canApply')).toBe(false)
      json.vm.$emit('apply', [item(5, 'five')])
      await nextTick()
      expect(useConceptSetsStore().currentSet!.items.map(i => i.conceptId)).toEqual([316139])
    })

    it('saves the previewed version as current after confirmation', async () => {
      const w = mountPreview()
      await nextTick()
      const store = useConceptSetsStore()
      const saveSpy = vi.spyOn(store, 'savePreviewAsCurrent').mockResolvedValue(true)
      expect(primary(w).text()).toBe('Save as current version')
      expect(primary(w).attributes('disabled')).toBeUndefined()
      expect(w.find('[data-testid="disabled-reason-wrap"]').exists()).toBe(false)

      await primary(w).trigger('click')
      expect(saveSpy).not.toHaveBeenCalled()
      expect(dialog(w, 'Save as current version').exists()).toBe(true)

      await buttonIn(w, 'Save as current version', 'Save').trigger('click')
      await flushPromises()
      expect(saveSpy).toHaveBeenCalled()
      expect(w.emitted('save')).toEqual([[store.currentSet]])
      expect(dialog(w, 'Save as current version').exists()).toBe(false)
    })

    it('keeps the confirmation open when saving the preview fails', async () => {
      const w = mountPreview()
      await nextTick()
      vi.spyOn(useConceptSetsStore(), 'savePreviewAsCurrent').mockResolvedValue(false)
      await primary(w).trigger('click')
      await buttonIn(w, 'Save as current version', 'Save').trigger('click')
      await flushPromises()
      expect(w.emitted('save')).toBeUndefined()
      expect(dialog(w, 'Save as current version').exists()).toBe(true)
    })

    it('does not emit save when the preview saved but no current set remains', async () => {
      const w = mountPreview()
      await nextTick()
      const store = useConceptSetsStore()
      vi.spyOn(store, 'savePreviewAsCurrent').mockImplementation(async () => {
        store.currentSet = null
        return true
      })
      await primary(w).trigger('click')
      await buttonIn(w, 'Save as current version', 'Save').trigger('click')
      await flushPromises()
      expect(w.emitted('save')).toBeUndefined()
    })

    it('shows the confirm Save as loading while the preview save runs', async () => {
      const w = mountPreview()
      await nextTick()
      let resolve!: (v: boolean) => void
      vi.spyOn(useConceptSetsStore(), 'savePreviewAsCurrent').mockReturnValue(new Promise(r => (resolve = r)))
      await primary(w).trigger('click')
      await buttonIn(w, 'Save as current version', 'Save').trigger('click')
      await nextTick()
      expect(primary(w).classes()).toContain('v-btn--loading')
      resolve(false)
      await flushPromises()
      expect(primary(w).classes()).not.toContain('v-btn--loading')
    })

    it('cancels the save-as-current confirmation', async () => {
      const w = mountPreview()
      await nextTick()
      await primary(w).trigger('click')
      await buttonIn(w, 'Save as current version', 'Cancel').trigger('click')
      expect(dialog(w, 'Save as current version').exists()).toBe(false)
    })
  })

  describe('unsaved-changes tracking', () => {
    it('marks the set dirty after each kind of edit from the tables', async () => {
      const store = useConceptSetsStore()
      for (const event of ['toggle:descendants', 'toggle:mapped', 'toggle:exclude', 'remove'] as const) {
        const w = mountEditor()
        const row = store.currentSet!.items[0]
        w.getComponent(SetTableStub).vm.$emit(event, row)
        await nextTick()
        await expectCloseAsksToConfirm(w)
        w.unmount()
      }
    })

    it('marks the set dirty after removing a concept from search', async () => {
      const w = mountEditor()
      await setActiveTab(w, 'search')
      await flushPromises()
      const removeSpy = vi.spyOn(useConceptSetsStore(), 'removeConceptFromSet')
      w.getComponent(SearchEmbedStub).vm.$emit('remove-concept', concept(316139))
      expect(removeSpy).toHaveBeenCalledWith(316139)
      await expectCloseAsksToConfirm(w)
    })

    it('marks the set dirty after a recommend batch', async () => {
      const w = mountEditor()
      await setActiveTab(w, 'recommend')
      await flushPromises()
      w.getComponent(RecommendStub).vm.$emit('concepts-added', 0)
      await expectCloseAsksToConfirm(w)
    })

    it('discarding closes, clears the dirty flag and dismisses the confirmation', async () => {
      const w = mountEditor()
      await typeTitle(w, 'Edited')
      await w.get('[data-testid="cs-editor-close-btn"]').trigger('click')
      await buttonIn(w, 'Unsaved changes', 'Discard changes').trigger('click')
      expect(dialog(w, 'Unsaved changes').exists()).toBe(false)
      expect(w.emitted('update:modelValue')).toEqual([[false]])
      await expectCloseClosesImmediately(w)
    })

    it('cancelling the confirmation keeps the editor open', async () => {
      const w = mountEditor()
      await typeTitle(w, 'Edited')
      await w.get('[data-testid="cs-editor-close-btn"]').trigger('click')
      await buttonIn(w, 'Unsaved changes', 'Cancel').trigger('click')
      expect(dialog(w, 'Unsaved changes').exists()).toBe(false)
      expect(w.emitted('update:modelValue')).toBeUndefined()
    })

    it('applying an embedded set clears the dirty flag', async () => {
      const w = await mountReady({ conceptSet: existingSet({ id: 4 }), embedded: true })
      await typeTitle(w, 'Edited')
      await primary(w).trigger('click')
      await expectCloseClosesImmediately(w)
    })

    it('reopening with a new set clears the dirty flag', async () => {
      const w = mountEditor()
      await typeTitle(w, 'Edited')
      await w.setProps({ conceptSet: existingSet({ id: 456, name: 'Other' }) })
      expect((w.get('input.cs-editor__title-input').element as HTMLInputElement).value).toBe('Other')
      await expectCloseClosesImmediately(w)
    })
  })

  describe('adding concepts', () => {
    it('stays on Search when adding to a set that already has items', async () => {
      const w = mountEditor()
      await setActiveTab(w, 'search')
      await flushPromises()
      w.getComponent(SearchEmbedStub).vm.$emit('add-concepts', [concept(5)])
      await nextTick()
      expect(activeTab(w)).toBe('search')
      await expectCloseAsksToConfirm(w)
    })

    it('switches to Selected after a bulk add fills an empty set', async () => {
      const w = mountEditor({ conceptSet: { name: 'New', items: [] } })
      await flushPromises()
      w.getComponent(SearchEmbedStub).vm.$emit('add-concepts', [concept(5), concept(6)])
      await nextTick()
      expect(activeTab(w)).toBe('selected')
      expect(useConceptSetsStore().currentSet!.items.map(i => i.conceptId)).toEqual([5, 6])
    })

    it('stays on Search when a bulk add into an empty set adds nothing', async () => {
      const w = mountEditor({ conceptSet: { name: 'New', items: [] } })
      await flushPromises()
      w.getComponent(SearchEmbedStub).vm.$emit('add-concepts', [])
      await nextTick()
      expect(activeTab(w)).toBe('search')
    })

    it('stays on Search when a single add finds no current set', async () => {
      const w = mountEditor({ conceptSet: { name: 'New', items: [] }, currentSet: null })
      await flushPromises()
      vi.spyOn(useConceptSetsStore(), 'addConceptToSet').mockImplementation(() => {})
      w.getComponent(SearchEmbedStub).vm.$emit('add-concept', concept(5))
      await nextTick()
      expect(activeTab(w)).toBe('search')
      await expectCloseAsksToConfirm(w)
    })

    it('re-resolves source codes only when adding from the Source codes tab', async () => {
      const w = mountEditor()
      const store = useConceptSetsStore()
      const included = vi.spyOn(store, 'resolveIncluded').mockResolvedValue()
      const codes = vi.spyOn(store, 'resolveSourceCodes').mockResolvedValue()

      await setActiveTab(w, 'included')
      await flushPromises()
      w.getComponent(IncludedStub).vm.$emit('add-concepts', [concept(8)])
      expect(included).toHaveBeenCalledWith('SRC1')
      expect(codes).not.toHaveBeenCalled()

      await setActiveTab(w, 'source-codes')
      await flushPromises()
      w.getComponent(SourceCodesTabStub).vm.$emit('add-concepts', [concept(9)])
      expect(codes).toHaveBeenCalledWith('SRC1')
    })

    it('retries the included resolution against the current source', async () => {
      const w = mountEditor()
      const included = vi.spyOn(useConceptSetsStore(), 'resolveIncluded').mockResolvedValue()
      await setActiveTab(w, 'included')
      await flushPromises()
      w.getComponent(IncludedStub).vm.$emit('retry')
      expect(included).toHaveBeenCalledWith('SRC1')
    })

    it('stays put when a recommend batch finds no current set', async () => {
      const w = mountEditor({ conceptSet: { name: 'New', items: [] }, currentSet: null })
      await setActiveTab(w, 'recommend')
      await flushPromises()
      w.getComponent(RecommendStub).vm.$emit('concepts-added', 2)
      expect(activeTab(w)).toBe('recommend')
    })
  })

  describe('inline concept detail', () => {
    it('opens a concept from the table, follows navigation and closes on back', async () => {
      const w = mountEditor()
      expect(w.find('[data-testid="concept-set-editor-inline-detail"]').exists()).toBe(false)
      w.getComponent(SetTableStub).vm.$emit('view-concept', { conceptId: 11, sourceKey: 'VOC' })
      await nextTick()

      const detail = w.getComponent(DetailStub)
      expect(detail.props('conceptId')).toBe(11)
      expect(detail.props('sourceKey')).toBe('VOC')

      detail.vm.$emit('navigate', 22)
      await nextTick()
      expect(w.getComponent(DetailStub).props('conceptId')).toBe(22)
      expect(w.getComponent(DetailStub).props('sourceKey')).toBe('VOC')

      ;(w.getComponent(DetailStub).props('onBack') as () => void)()
      await nextTick()
      expect(w.find('[data-testid="concept-set-editor-inline-detail"]').exists()).toBe(false)
    })

    it('ignores navigation when no concept is open', () => {
      const w = mountEditor()
      ;(w.vm as unknown as { onInlineConceptNavigate: (id: number) => void }).onInlineConceptNavigate(5)
      expect((w.vm as unknown as { viewingConcept: unknown }).viewingConcept).toBeNull()
    })

    it('clears the open concept when the editor closes', async () => {
      const w = mountEditor()
      w.getComponent(SetTableStub).vm.$emit('view-concept', { conceptId: 11, sourceKey: 'VOC' })
      await nextTick()
      await w.setProps({ modelValue: false })
      await w.setProps({ modelValue: true })
      expect(w.find('[data-testid="concept-set-editor-inline-detail"]').exists()).toBe(false)
    })
  })

  describe('missing concepts warning', () => {
    it('names the source, the count and the missing ids', () => {
      const set = existingSet({
        items: [item(1, ''), item(2, 'ok'), item(3, 'x', { missingFromVocabulary: true } as Partial<ConceptSetItem>)],
      })
      const w = mountEditor({ conceptSet: set, sourceKey: 'MYSRC' })
      const text = w.get('[data-testid="cs-editor-missing-concepts"]').text()
      expect(text).toContain('source MYSRC')
      expect(text).toContain('contain 2 of the concepts')
      expect(text).toContain(': 1, 3.')
    })

    it('is absent when there is no current set', () => {
      const w = mountEditor({ currentSet: null })
      expect(w.find('[data-testid="cs-editor-missing-concepts"]').exists()).toBe(false)
    })
  })

  describe('tools menu: expression JSON', () => {
    function blobText(blob: Blob): Promise<string> {
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.readAsText(blob)
      })
    }

    it('downloads the expression as a JSON file named after the set', async () => {
      const createUrl = vi.fn(() => 'blob:cs')
      const revokeUrl = vi.fn()
      const originalCreate = URL.createObjectURL
      const originalRevoke = URL.revokeObjectURL
      URL.createObjectURL = createUrl
      URL.revokeObjectURL = revokeUrl
      const clicked: HTMLAnchorElement[] = []
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push(this)
      })
      try {
        const w = mountEditor({ conceptSet: existingSet({ name: 'A/B: C??' }) })
        await menuItem(w, 'cs-editor-download-json').trigger('click')

        expect(clicked).toHaveLength(1)
        expect(clicked[0].download).toBe('A-B- C-.json')
        expect(clicked[0].href).toBe('blob:cs')
        expect(revokeUrl).toHaveBeenCalledWith('blob:cs')
        const blob = (createUrl.mock.calls[0] as unknown as [Blob])[0]
        expect(blob.type).toBe('application/json')
        expect(JSON.parse(await blobText(blob))).toEqual({
          items: [
            {
              concept: {
                CONCEPT_ID: 316139,
                CONCEPT_NAME: 'Heart failure',
                CONCEPT_CODE: '316139',
                DOMAIN_ID: 'Condition',
                VOCABULARY_ID: 'SNOMED',
                CONCEPT_CLASS_ID: 'Clinical Finding',
                STANDARD_CONCEPT: 'S',
                INVALID_REASON: null,
              },
              isExcluded: false,
              includeDescendants: true,
              includeMapped: false,
            },
          ],
        })
      } finally {
        URL.createObjectURL = originalCreate
        URL.revokeObjectURL = originalRevoke
        clickSpy.mockRestore()
      }
    })

    it('names the file concept-set.json when the set has no name', () => {
      const w = mountEditor({ conceptSet: existingSet({ name: '   ' }) })
      expect(w.getComponent(JsonDialogStub).props('filename')).toBe('concept-set.json')
    })

    it('serialises an empty expression without a current set', () => {
      const w = mountEditor({ currentSet: null })
      expect(JSON.parse(w.getComponent(JsonDialogStub).props('json') as string)).toEqual({ items: [] })
    })

    it('copies the expression JSON and confirms', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
      const w = mountEditor()
      const success = vi.spyOn(useNotifications(), 'success')
      await menuItem(w, 'cs-editor-copy-json').trigger('click')
      await flushPromises()
      expect(writeText).toHaveBeenCalledWith(w.getComponent(JsonDialogStub).props('json'))
      expect(success).toHaveBeenCalledWith('Copied')
    })

    it('reports a failed copy', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('denied'))
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
      const w = mountEditor()
      const danger = vi.spyOn(useNotifications(), 'danger')
      const success = vi.spyOn(useNotifications(), 'success')
      await menuItem(w, 'cs-editor-copy-json').trigger('click')
      await flushPromises()
      expect(danger).toHaveBeenCalledWith('Copy failed')
      expect(success).not.toHaveBeenCalled()
    })

    it('opens the JSON view and applies an edited expression', async () => {
      const w = mountEditor()
      await setActiveTab(w, 'compare')
      await menuItem(w, 'cs-editor-view-json').trigger('click')
      const json = w.getComponent(JsonDialogStub)
      expect(json.props('modelValue')).toBe(true)
      expect(json.props('canApply')).toBe(true)

      json.vm.$emit('apply', [item(5, 'five')])
      await nextTick()
      expect(useConceptSetsStore().currentSet!.items).toEqual([item(5, 'five')])
      expect(activeTab(w)).toBe('selected')
      expect(json.props('modelValue')).toBe(false)
      await expectCloseAsksToConfirm(w)
    })

    it('ignores an applied expression when there is no current set', async () => {
      const w = mountEditor({ currentSet: null })
      await setActiveTab(w, 'compare')
      w.getComponent(JsonDialogStub).vm.$emit('apply', [item(5, 'five')])
      await nextTick()
      expect(activeTab(w)).toBe('compare')
    })
  })

  describe('tools menu: paste ids', () => {
    const title = 'Paste concept IDs'
    const textarea = (w: Editor) => dialog(w, title).get('textarea')

    async function openPaste(w: Editor) {
      await menuItem(w, 'cs-editor-paste-ids').trigger('click')
      expect(dialog(w, title).exists()).toBe(true)
    }

    it('opens empty with Resolve disabled', async () => {
      const w = mountEditor()
      await openPaste(w)
      expect((textarea(w).element as HTMLTextAreaElement).value).toBe('')
      expect(buttonIn(w, title, 'Resolve').attributes('disabled')).toBeDefined()
      expect(dialog(w, title).find('.cs-paste__summary').exists()).toBe(false)
    })

    it('resolves, shows the summary, and adds the resolved concepts', async () => {
      vi.mocked(conceptSearchService.getConceptsByIds).mockResolvedValue([concept(201826)])
      const w = mountEditor()
      await setActiveTab(w, 'compare')
      await openPaste(w)
      await textarea(w).setValue('201826, 999')
      await buttonIn(w, title, 'Resolve').trigger('click')
      await flushPromises()

      expect(conceptSearchService.getConceptsByIds).toHaveBeenCalledWith('SRC1', [201826, 999])
      expect(dialog(w, title).get('.cs-paste__summary-row--ok').text()).toBe('Resolved: 1')
      expect(dialog(w, title).get('.cs-paste__summary-row--err').text()).toBe('Not found: 999')
      expect(buttonIn(w, title, 'Add').text()).toBe('Add 1')

      await buttonIn(w, title, 'Add').trigger('click')
      expect(dialog(w, title).exists()).toBe(false)
      expect(useConceptSetsStore().currentSet!.items.map(i => i.conceptId)).toEqual([316139, 201826])
      expect(activeTab(w)).toBe('selected')
      await expectCloseAsksToConfirm(w)
    })

    it('disables the input while resolving', async () => {
      let resolve!: (c: Concept[]) => void
      vi.mocked(conceptSearchService.getConceptsByIds).mockReturnValue(new Promise(r => (resolve = r)))
      const w = mountEditor()
      await openPaste(w)
      await textarea(w).setValue('5')
      await buttonIn(w, title, 'Resolve').trigger('click')
      await nextTick()
      expect(textarea(w).attributes('disabled')).toBeDefined()
      resolve([])
      await flushPromises()
      expect(textarea(w).attributes('disabled')).toBeUndefined()
    })

    it('reports every id as not found when the lookup fails', async () => {
      vi.mocked(conceptSearchService.getConceptsByIds).mockRejectedValue(new Error('500'))
      const w = mountEditor()
      await openPaste(w)
      await textarea(w).setValue('7 8')
      await buttonIn(w, title, 'Resolve').trigger('click')
      await flushPromises()
      expect(dialog(w, title).find('.cs-paste__summary-row--ok').exists()).toBe(false)
      expect(dialog(w, title).get('.cs-paste__summary-row--err').text()).toBe('Not found: 7, 8')
      expect(buttonIn(w, title, 'Add').attributes('disabled')).toBeDefined()
      expect(textarea(w).attributes('disabled')).toBeUndefined()
    })

    it('makes no request when the input holds no ids', async () => {
      const w = mountEditor()
      await openPaste(w)
      await textarea(w).setValue('abc')
      await buttonIn(w, title, 'Resolve').trigger('click')
      await flushPromises()
      expect(conceptSearchService.getConceptsByIds).not.toHaveBeenCalled()
      expect(dialog(w, title).find('.cs-paste__summary').exists()).toBe(false)
    })

    it('keeps an untouched summary when the input is edited before any resolve', async () => {
      const w = mountEditor()
      await openPaste(w)
      await textarea(w).setValue('1')
      expect(buttonIn(w, title, 'Resolve').attributes('disabled')).toBeUndefined()
    })

    it('cancelling clears the input for the next open', async () => {
      vi.mocked(conceptSearchService.getConceptsByIds).mockResolvedValue([concept(1)])
      const w = mountEditor()
      await openPaste(w)
      await textarea(w).setValue('1')
      await buttonIn(w, title, 'Resolve').trigger('click')
      await flushPromises()
      await buttonIn(w, title, 'Cancel').trigger('click')
      expect(dialog(w, title).exists()).toBe(false)

      await openPaste(w)
      expect((textarea(w).element as HTMLTextAreaElement).value).toBe('')
      expect(dialog(w, title).find('.cs-paste__summary').exists()).toBe(false)
      expect(textarea(w).attributes('disabled')).toBeUndefined()
    })
  })

  describe('tools menu: import source codes', () => {
    const title = 'Import by source code'
    const textarea = (w: Editor) => dialog(w, title).get('textarea')

    async function openCodes(w: Editor) {
      await menuItem(w, 'cs-editor-import-source-codes').trigger('click')
      expect(dialog(w, title).exists()).toBe(true)
    }

    it('opens empty with Resolve disabled and no results', async () => {
      const w = mountEditor()
      await openCodes(w)
      expect((textarea(w).element as HTMLTextAreaElement).value).toBe('')
      expect(buttonIn(w, title, 'Resolve').attributes('disabled')).toBeDefined()
      expect(dialog(w, title).find('.cs-paste__summary').exists()).toBe(false)
      expect(w.findComponent(ConceptTableStub).exists()).toBe(false)
    })

    it('matches codes case-insensitively and adds only the selected concepts', async () => {
      vi.mocked(conceptSearchService.getConceptsBySourceCodes).mockResolvedValue([
        concept(1, { conceptCode: 'E11.9', vocabularyId: 'ICD10CM', domainId: 'Condition' }),
        concept(2, { conceptCode: '250.00', vocabularyId: undefined as unknown as string, domainId: undefined as unknown as string }),
      ])
      const w = mountEditor()
      await setActiveTab(w, 'compare')
      await openCodes(w)
      await textarea(w).setValue('e11.9, 250.00, ZZZ')
      await buttonIn(w, title, 'Resolve').trigger('click')
      await flushPromises()

      expect(conceptSearchService.getConceptsBySourceCodes).toHaveBeenCalledWith('SRC1', ['e11.9', '250.00', 'ZZZ'])
      expect(dialog(w, title).get('.cs-paste__summary-row--ok').text()).toBe('Resolved: 2')
      expect(dialog(w, title).get('.cs-paste__summary-row--err').text()).toBe('Not found: ZZZ')
      const options = w.getComponent(FacetFiltersStub).props('facetOptions') as Record<string, { value: string }[]>
      expect(options.vocabularyId.map(o => o.value)).toEqual(['', 'ICD10CM'])
      expect(options.domainId.map(o => o.value)).toEqual(['', 'Condition'])
      expect(buttonIn(w, title, 'Add').attributes('disabled')).toBeDefined()

      w.getComponent(ConceptTableStub).vm.$emit('update:selected', [2])
      await nextTick()
      expect(buttonIn(w, title, 'Add').text()).toBe('Add 1')
      await buttonIn(w, title, 'Add').trigger('click')

      expect(dialog(w, title).exists()).toBe(false)
      expect(useConceptSetsStore().currentSet!.items.map(i => i.conceptId)).toEqual([316139, 2])
      expect(activeTab(w)).toBe('selected')
    })

    it('treats a returned concept without a code as matching nothing', async () => {
      vi.mocked(conceptSearchService.getConceptsBySourceCodes).mockResolvedValue([
        concept(1, { conceptCode: undefined as unknown as string }),
      ])
      const w = mountEditor()
      await openCodes(w)
      await textarea(w).setValue('A1')
      await buttonIn(w, title, 'Resolve').trigger('click')
      await flushPromises()
      expect(dialog(w, title).get('.cs-paste__summary-row--err').text()).toBe('Not found: A1')
    })

    it('reports every code as not found when the lookup fails, and re-enables the input', async () => {
      vi.mocked(conceptSearchService.getConceptsBySourceCodes).mockRejectedValue(new Error('500'))
      const w = mountEditor()
      await openCodes(w)
      await textarea(w).setValue('A1\nB2')
      await buttonIn(w, title, 'Resolve').trigger('click')
      await flushPromises()
      expect(dialog(w, title).find('.cs-paste__summary-row--ok').exists()).toBe(false)
      expect(dialog(w, title).get('.cs-paste__summary-row--err').text()).toBe('Not found: A1, B2')
      expect(w.findComponent(ConceptTableStub).exists()).toBe(false)
      expect(textarea(w).attributes('disabled')).toBeUndefined()
    })

    it('disables the input while resolving', async () => {
      let resolve!: (c: Concept[]) => void
      vi.mocked(conceptSearchService.getConceptsBySourceCodes).mockReturnValue(new Promise(r => (resolve = r)))
      const w = mountEditor()
      await openCodes(w)
      await textarea(w).setValue('A1')
      await buttonIn(w, title, 'Resolve').trigger('click')
      await nextTick()
      expect(textarea(w).attributes('disabled')).toBeDefined()
      resolve([])
      await flushPromises()
      expect(textarea(w).attributes('disabled')).toBeUndefined()
    })

    it('makes no request when the input holds no codes', async () => {
      const w = mountEditor()
      await openCodes(w)
      await textarea(w).setValue(' , ')
      await buttonIn(w, title, 'Resolve').trigger('click')
      await flushPromises()
      expect(conceptSearchService.getConceptsBySourceCodes).not.toHaveBeenCalled()
    })

    it('keeps Resolve available when the input is edited before any resolve', async () => {
      const w = mountEditor()
      await openCodes(w)
      await textarea(w).setValue('A1')
      expect(buttonIn(w, title, 'Resolve').attributes('disabled')).toBeUndefined()
    })

    it('cancelling clears the input and results for the next open', async () => {
      vi.mocked(conceptSearchService.getConceptsBySourceCodes).mockResolvedValue([concept(1, { conceptCode: 'A1' })])
      const w = mountEditor()
      await openCodes(w)
      await textarea(w).setValue('A1')
      await buttonIn(w, title, 'Resolve').trigger('click')
      await flushPromises()
      w.getComponent(ConceptTableStub).vm.$emit('update:selected', [1])
      await buttonIn(w, title, 'Cancel').trigger('click')
      expect(dialog(w, title).exists()).toBe(false)

      await openCodes(w)
      expect((textarea(w).element as HTMLTextAreaElement).value).toBe('')
      expect(dialog(w, title).find('.cs-paste__summary').exists()).toBe(false)
      expect(w.findComponent(ConceptTableStub).exists()).toBe(false)
      expect(textarea(w).attributes('disabled')).toBeUndefined()
    })
  })

  describe('tools menu: import JSON', () => {
    const title = 'Import concept set JSON'
    const textarea = (w: Editor) => dialog(w, title).get('textarea')
    const expression = (items: ConceptSetItem[]) =>
      JSON.stringify({
        items: items.map(i => ({
          concept: { CONCEPT_ID: i.conceptId, CONCEPT_NAME: i.conceptName },
          isExcluded: i.isExcluded,
          includeDescendants: i.includeDescendants,
          includeMapped: i.includeMapped,
        })),
      })

    async function openJson(w: Editor) {
      await menuItem(w, 'cs-editor-import-json').trigger('click')
      expect(dialog(w, title).exists()).toBe(true)
    }

    it('opens empty with Parse disabled', async () => {
      const w = mountEditor()
      await openJson(w)
      expect((textarea(w).element as HTMLTextAreaElement).value).toBe('')
      expect(buttonIn(w, title, 'Parse').attributes('disabled')).toBeDefined()
      expect(dialog(w, title).find('.cs-paste__summary').exists()).toBe(false)
    })

    it('parses, merges flags into an existing row, adds new concepts and closes', async () => {
      const w = mountEditor()
      await setActiveTab(w, 'compare')
      const store = useConceptSetsStore()
      const setFlags = vi.spyOn(store, 'setConceptItemFlags')
      const add = vi.spyOn(store, 'addConceptToSet')
      await openJson(w)
      await textarea(w).setValue(
        expression([item(316139, 'Heart failure', { isExcluded: true }), item(42, 'New one')])
      )
      await buttonIn(w, title, 'Parse').trigger('click')
      expect(dialog(w, title).get('.cs-paste__summary-row--ok').text()).toBe('Resolved: 2')
      expect(buttonIn(w, title, 'Add').text()).toBe('Add 2')

      await buttonIn(w, title, 'Add').trigger('click')
      expect(setFlags).toHaveBeenCalledTimes(1)
      expect(setFlags.mock.calls[0][0].conceptId).toBe(316139)
      expect(add).toHaveBeenCalledTimes(1)
      expect(add.mock.calls[0][0].conceptId).toBe(42)
      expect(dialog(w, title).exists()).toBe(false)
      expect(activeTab(w)).toBe('selected')
      await expectCloseAsksToConfirm(w)
    })

    it('shows the parse error and returns to Parse once the text changes', async () => {
      const w = mountEditor()
      await openJson(w)
      await textarea(w).setValue('{not json')
      await buttonIn(w, title, 'Parse').trigger('click')
      expect(dialog(w, title).get('.cs-paste__summary-row--err').text()).toBe(
        'Invalid JSON: could not parse the pasted text.'
      )

      await textarea(w).setValue('{}')
      expect(dialog(w, title).find('.cs-paste__summary-row--err').exists()).toBe(false)
      expect(buttonIn(w, title, 'Parse').attributes('disabled')).toBeUndefined()
    })

    it('drops parsed items when the text changes after a successful parse', async () => {
      const w = mountEditor()
      await openJson(w)
      await textarea(w).setValue(expression([item(42, 'New one')]))
      await buttonIn(w, title, 'Parse').trigger('click')
      expect(buttonIn(w, title, 'Add').text()).toBe('Add 1')
      await textarea(w).setValue(expression([item(43, 'Other')]))
      expect(dialog(w, title).find('.cs-paste__summary').exists()).toBe(false)
      expect(buttonIn(w, title, 'Parse').exists()).toBe(true)
    })

    it('cancelling clears the input and any error for the next open', async () => {
      const w = mountEditor()
      await openJson(w)
      await textarea(w).setValue('{not json')
      await buttonIn(w, title, 'Parse').trigger('click')
      await buttonIn(w, title, 'Cancel').trigger('click')
      expect(dialog(w, title).exists()).toBe(false)

      await openJson(w)
      expect((textarea(w).element as HTMLTextAreaElement).value).toBe('')
      expect(dialog(w, title).find('.cs-paste__summary').exists()).toBe(false)
      expect(buttonIn(w, title, 'Parse').attributes('disabled')).toBeDefined()
    })
  })

  describe('tools menu: optimize', () => {
    const optimize = (w: Editor) => menuItem(w, 'cs-editor-optimize-menu-item')
    const twoItems = () => existingSet({ items: [item(1, 'a'), item(2, 'b')] })

    it('is enabled with two resolvable concepts and opens the dialog', async () => {
      const w = mountEditor({ conceptSet: twoItems() })
      expect(optimize(w).classes()).not.toContain('v-list-item--disabled')
      await optimize(w).trigger('click')
      expect(w.getComponent(OptimizeDialogStub).props('items')).toEqual(twoItems().items)
    })

    it('is disabled without a current set', () => {
      const w = mountEditor({ currentSet: null })
      expect(optimize(w).classes()).toContain('v-list-item--disabled')
    })

    it('is disabled while a save is in flight', async () => {
      const w = await mountReady({ conceptSet: twoItems() })
      vi.spyOn(useConceptSetsStore(), 'update').mockReturnValue(new Promise(() => {}))
      await primary(w).trigger('click')
      await nextTick()
      expect(optimize(w).classes()).toContain('v-list-item--disabled')
    })

    it('switches to Selected after an overwrite', async () => {
      const w = mountEditor({ conceptSet: twoItems() })
      await setActiveTab(w, 'compare')
      await optimize(w).trigger('click')
      vi.spyOn(useConceptSetsStore(), 'applyProposal').mockImplementation(() => {})
      w.getComponent(OptimizeDialogStub).vm.$emit('overwrite', [item(1, 'a')])
      await nextTick()
      expect(activeTab(w)).toBe('selected')
      expect(w.findComponent(OptimizeDialogStub).exists()).toBe(false)
    })

    it('marks the dialog busy while creating and lands on Selected afterwards', async () => {
      const w = mountEditor({ conceptSet: twoItems() })
      await setActiveTab(w, 'compare')
      await optimize(w).trigger('click')
      const store = useConceptSetsStore()
      let resolve!: (v: ConceptSet | null) => void
      vi.spyOn(store, 'create').mockReturnValue(new Promise(r => (resolve = r)))
      const success = vi.spyOn(useNotifications(), 'success')
      w.getComponent(OptimizeDialogStub).vm.$emit('create', { name: 'Optimized', items: [item(1, 'a')] })
      await nextTick()
      expect(w.getComponent(OptimizeDialogStub).props('busy')).toBe(true)

      resolve({ id: 9, name: 'Optimized', items: [] })
      await flushPromises()
      expect(w.findComponent(OptimizeDialogStub).exists()).toBe(false)
      expect(activeTab(w)).toBe('selected')
      expect(success).toHaveBeenCalledWith('Created concept set "Optimized"')
    })

    it('clears the busy flag and reports a failed create with the store error', async () => {
      const w = mountEditor({ conceptSet: twoItems() })
      await setActiveTab(w, 'compare')
      await optimize(w).trigger('click')
      const store = useConceptSetsStore()
      vi.spyOn(store, 'create').mockImplementation(async () => {
        store.error = 'quota exceeded'
        return null
      })
      const danger = vi.spyOn(useNotifications(), 'danger')
      w.getComponent(OptimizeDialogStub).vm.$emit('create', { name: 'Optimized', items: [] })
      await flushPromises()
      expect(danger).toHaveBeenCalledWith('Could not create the optimized concept set', { message: 'quota exceeded' })
      expect(w.getComponent(OptimizeDialogStub).props('busy')).toBe(false)
      expect(activeTab(w)).toBe('compare')
    })

    it('clears the dirty flag after creating a new optimized set', async () => {
      const w = mountEditor({ conceptSet: twoItems() })
      await typeTitle(w, 'Edited')
      await optimize(w).trigger('click')
      vi.spyOn(useConceptSetsStore(), 'create').mockResolvedValue({ id: 9, name: 'Optimized', items: [] })
      w.getComponent(OptimizeDialogStub).vm.$emit('create', { name: 'Optimized', items: [] })
      await flushPromises()
      await expectCloseClosesImmediately(w)
    })
  })
})
