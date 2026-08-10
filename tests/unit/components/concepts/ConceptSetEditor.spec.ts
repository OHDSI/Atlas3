/**
 * ConceptSetEditor Component Tests (T131)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Some sandboxed jsdom builds don't expose a global `localStorage`, which the
// WebAPI store (and http-client) read directly. Provide a minimal in-memory
// shim so the editor's source-resolution computed can run. No-op when the
// environment already supplies localStorage (e.g. CI).
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  const shim = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: shim, configurable: true })
}
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useNotifications } from '@/stores/notifications'
import { useWebAPIStore } from '@/stores/webapi'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'
import type { ConceptSet, Concept } from '@/models/concept-set.types'
import * as conceptSearchService from '@/services/concept-search.service'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

// Default getValidVocabularySource to a non-SYNPUF source so we can prove the
// editor uses the store source (not the old hardcoded 'SYNPUF1K' default) when
// nothing is injected.
vi.mock('@/services/concept-search.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/concept-search.service')>()
  return {
    ...actual,
    getConceptsByIds: vi.fn(),
    getConceptsBySourceCodes: vi.fn(),
  }
})

vi.mock('@/services/concept-set-versions.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/concept-set-versions.service')>()
  return {
    ...actual,
    getVersions: vi.fn().mockResolvedValue([]),
  }
})
import { getVersions as mockedGetVersions } from '@/services/concept-set-versions.service'

const vuetify = createVuetify({ components, directives })

const mockConceptSet: ConceptSet = {
  id: 123,
  name: 'Test Concept Set',
  createdDate: '2024-01-15T10:00:00Z',
  createdBy: 'testuser',
  items: [
    {
      conceptId: 313217,
      conceptName: 'Atrial fibrillation',
      conceptCode: '49436004',
      domainId: 'Condition',
      vocabularyId: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
      invalidReason: null,
      isExcluded: false,
      includeDescendants: true,
      includeMapped: false,
    },
  ],
}

const mockConcept: Concept = {
  conceptId: 4329847,
  conceptName: 'Myocardial infarction',
  conceptCode: '22298006',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
}

function mountComponent(props = {}) {
  return mount(ConceptSetEditor, {
    props: {
      modelValue: true,
      conceptSet: null,
      ...props,
    },
    global: {
      plugins: [vuetify],
      stubs: {
        ConceptSearchInline: true,
        ConceptSetTable: true,
        VNavigationDrawer: {
          template: '<div class="v-navigation-drawer"><slot /></div>',
        },
        // Editor wraps the drawer in <Teleport to="body"> so the
        // overlay scrim can cover the viewport. Stub Teleport in
        // tests so its content stays inside the wrapper for
        // findComponent / find calls.
        Teleport: { template: '<div><slot /></div>' },
      },
    },
  })
}

describe('ConceptSetEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    // The editor's Save/Delete buttons are now permission-gated. Set up an
    // authenticated user with global write+create on concept sets so the
    // existing button-click assertions still fire.
    const authStore = useAuthStore()
    authStore.setUser({
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

  it('should mount successfully', () => {
    const wrapper = mountComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('should render as navigation drawer', () => {
    const wrapper = mountComponent()
    // Drawer is teleported to body for the overlay scrim, but the
    // test stubs Teleport so the drawer renders inline and we can
    // assert against the stub's class.
    const drawer = wrapper.find('.v-navigation-drawer')
    expect(drawer.exists()).toBe(true)
  })

  it('should display create mode title when no concept set ID', () => {
    const wrapper = mountComponent({ conceptSet: { name: '', items: [] } })
    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    // Should have create button instead of save
    const createBtn = buttons.find(btn => btn.props('color') === 'primary' && btn.props('variant') === 'flat')
    expect(createBtn).toBeTruthy()
  })

  it('should display edit mode title when concept set has ID', () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    // Should have delete button in edit mode
    const deleteBtn = buttons.find(btn => btn.props('color') === 'error')
    expect(deleteBtn).toBeTruthy()
  })

  // Discussion #97: new concept sets open on the Search tab so the user can
  // start adding concepts immediately; existing sets open on Selected.
  it('opens new concept sets on the Search tab', async () => {
    const wrapper = mountComponent({ conceptSet: null })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.activeTab).toBe('search')
  })

  it('opens existing concept sets on the Selected tab', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.activeTab).toBe('selected')
  })

  it('should render the inline name input', () => {
    const wrapper = mountComponent()
    // Refresh: the name field is now an inline-edit input styled
    // like the title rather than a v-text-field below the header.
    const titleInput = wrapper.find('input.cs-editor__title-input')
    expect(titleInput.exists()).toBe(true)
  })

  it('should populate the inline name input with the concept set name', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    await wrapper.vm.$nextTick()

    const titleInput = wrapper.find('input.cs-editor__title-input')
    expect(titleInput.exists()).toBe(true)
    expect((titleInput.element as HTMLInputElement).value).toBe('Test Concept Set')
  })

  it('should render tabs for search and selected concepts', () => {
    const wrapper = mountComponent()
    const tabs = wrapper.findComponent({ name: 'VTabs' })
    expect(tabs.exists()).toBe(true)
  })

  it('should render tab windows', () => {
    const wrapper = mountComponent()
    const window = wrapper.findComponent({ name: 'VWindow' })
    expect(window.exists()).toBe(true)
  })

  it('should render save button', () => {
    const wrapper = mountComponent()
    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const saveBtn = buttons.find(btn => btn.text().includes('Save') || btn.text().includes('Create'))
    expect(saveBtn).toBeTruthy()
  })

  it('should render close button', () => {
    const wrapper = mountComponent()
    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const closeBtn = buttons.find(btn => btn.props('icon') === 'mdi-close')
    expect(closeBtn).toBeTruthy()
  })

  it('should render delete button in edit mode', () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const deleteBtn = buttons.find(btn => btn.text().includes('Delete'))
    expect(deleteBtn).toBeTruthy()
  })

  it('should not render delete button in create mode', () => {
    const wrapper = mountComponent({ conceptSet: { name: '', items: [] } })
    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const deleteBtn = buttons.find(btn => btn.text().includes('Delete'))
    expect(deleteBtn).toBeFalsy()
  })

  it('should disable save button when form is invalid', async () => {
    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const saveBtn = buttons.find(btn => btn.text().includes('Save') || btn.text().includes('Create'))

    if (saveBtn) {
      expect(saveBtn.props('disabled')).toBe(true)
    }
  })

  it('should emit update:modelValue when close button is clicked', async () => {
    const wrapper = mountComponent()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const closeBtn = buttons.find(btn => btn.props('icon') === 'mdi-close')

    if (closeBtn) {
      await closeBtn.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    }
  })

  it('should call store update when save is triggered in edit mode', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const store = useConceptSetsStore()
    store.currentSet = mockConceptSet

    const updateSpy = vi.spyOn(store, 'update').mockResolvedValue(mockConceptSet)

    // Set form to valid state by accessing the ref
    wrapper.vm.formValid = true
    await wrapper.vm.$nextTick()

    // Manually call the save method
    await wrapper.vm.onSave()
    await flushPromises()

    expect(updateSpy).toHaveBeenCalled()
  })

  it('should call store create when save is triggered in create mode', async () => {
    const newSet = { name: 'New Set', items: [] }
    const wrapper = mountComponent({ conceptSet: newSet })
    const store = useConceptSetsStore()
    store.currentSet = newSet

    const createSpy = vi.spyOn(store, 'create').mockResolvedValue({ id: 456, ...newSet })

    // Set form to valid state by accessing the ref
    wrapper.vm.formValid = true
    await wrapper.vm.$nextTick()

    // Manually call the save method
    await wrapper.vm.onSave()
    await flushPromises()

    expect(createSpy).toHaveBeenCalled()
  })

  it('should emit delete when delete button is clicked and confirmed via the dialog', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const deleteBtn = buttons.find(btn => btn.text().includes('Delete'))

    if (deleteBtn) {
      await deleteBtn.trigger('click')
      // Native window.confirm has been replaced with a v-dialog —
      // the click sets the dialog flag rather than emitting delete
      // immediately.
      expect((wrapper.vm as unknown as { showDeleteConfirm: boolean }).showDeleteConfirm).toBe(true)
      expect(wrapper.emitted('delete')).toBeFalsy()

      // Invoking the confirm handler emits the delete event.
      ;(wrapper.vm as unknown as { confirmDelete: () => void }).confirmDelete()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('delete')).toBeTruthy()
      expect(wrapper.emitted('delete')![0]).toEqual([123])
    }
  })

  it('should not emit delete when confirmation is cancelled via the dialog', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const deleteBtn = buttons.find(btn => btn.text().includes('Delete'))

    if (deleteBtn) {
      await deleteBtn.trigger('click')
      // Cancel by closing the dialog without invoking confirmDelete.
      ;(wrapper.vm as unknown as { showDeleteConfirm: boolean }).showDeleteConfirm = false
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('delete')).toBeFalsy()
    }
  })

  it('should open confirmation dialog when closing with unsaved changes', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })

    // Simulate user changes via the inline title input — the input
    // event handler is what marks the form dirty (the deep watcher
    // on form was removed because it false-positived on initial
    // load when props.conceptSet populated form.value).
    const titleInput = wrapper.find('input.cs-editor__title-input')
    expect(titleInput.exists()).toBe(true)
    ;(titleInput.element as HTMLInputElement).value = 'Modified Name'
    await titleInput.trigger('input')
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const closeBtn = buttons.find(btn => btn.props('icon') === 'mdi-close')

    if (closeBtn) {
      await closeBtn.trigger('click')
      expect((wrapper.vm as unknown as { showCloseConfirm: boolean }).showCloseConfirm).toBe(true)
    }
  })

  describe('embedded mode (#133)', () => {
    const embeddedSet: ConceptSet = { id: 3, name: 'Embedded Set', items: [] }

    function mountEmbedded(props = {}) {
      return mountComponent({ conceptSet: embeddedSet, embedded: true, ...props })
    }

    it('renders Apply and Cancel instead of Save/Delete/Tags/Versions', () => {
      const wrapper = mountEmbedded()
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      expect(buttons.find(btn => btn.text().includes('Apply'))).toBeTruthy()
      expect(buttons.find(btn => btn.text().includes('Cancel'))).toBeTruthy()
      expect(buttons.find(btn => btn.text().includes('Save'))).toBeFalsy()
      expect(buttons.find(btn => btn.text().includes('Delete'))).toBeFalsy()
      expect(wrapper.find('[data-testid="cs-editor-tags-btn"]').exists()).toBe(false)
      expect(buttons.find(btn => btn.props('icon') === 'mdi-history')).toBeFalsy()
    })

    it('does not fetch version history for the cohort-local id', async () => {
      vi.mocked(mockedGetVersions).mockClear()
      mountEmbedded()
      await flushPromises()
      expect(mockedGetVersions).not.toHaveBeenCalled()
    })

    it('Apply emits the edited set without any store persistence call', async () => {
      const wrapper = mountEmbedded()
      const store = useConceptSetsStore()
      store.currentSet = { id: 3, name: 'Embedded Set', items: [mockConceptSet.items[0]!] }
      const updateSpy = vi.spyOn(store, 'update')
      const createSpy = vi.spyOn(store, 'create')

      wrapper.vm.formValid = true
      await wrapper.vm.$nextTick()
      wrapper.vm.onApply()

      expect(wrapper.emitted('apply')).toBeTruthy()
      expect(wrapper.emitted('apply')![0]![0]).toMatchObject({
        id: 3,
        name: 'Embedded Set',
        items: [expect.objectContaining({ conceptId: 313217 })],
      })
      expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
      expect(updateSpy).not.toHaveBeenCalled()
      expect(createSpy).not.toHaveBeenCalled()
    })

    it('Cancel with unsaved edits opens the confirm dialog; discarding closes without apply', async () => {
      const wrapper = mountEmbedded()
      const titleInput = wrapper.find('input.cs-editor__title-input')
      ;(titleInput.element as HTMLInputElement).value = 'Modified'
      await titleInput.trigger('input')

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelBtn = buttons.find(btn => btn.text().includes('Cancel'))!
      await cancelBtn.trigger('click')
      expect((wrapper.vm as unknown as { showCloseConfirm: boolean }).showCloseConfirm).toBe(true)
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
      ;(wrapper.vm as unknown as { confirmClose: () => void }).confirmClose()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
      expect(wrapper.emitted('apply')).toBeFalsy()
    })

    it('Cancel with no edits closes immediately', async () => {
      const wrapper = mountEmbedded()
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelBtn = buttons.find(btn => btn.text().includes('Cancel'))!
      await cancelBtn.trigger('click')

      expect((wrapper.vm as unknown as { showCloseConfirm: boolean }).showCloseConfirm).toBe(false)
      expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    })
  })

  it('should add concept to set when add-concept is emitted', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const store = useConceptSetsStore()
    store.currentSet = mockConceptSet
    const addConceptSpy = vi.spyOn(store, 'addConceptToSet')

    // Component is stubbed, so we can manually call the handler
    await wrapper.vm.onAddConcept(mockConcept)

    expect(addConceptSpy).toHaveBeenCalledWith(mockConcept, undefined)
  })

  it('should pass add-time flags straight through to the store', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const store = useConceptSetsStore()
    store.currentSet = mockConceptSet
    const addConceptSpy = vi.spyOn(store, 'addConceptToSet')
    const flags = { isExcluded: true, includeDescendants: true, includeMapped: false }

    await wrapper.vm.onAddConcept(mockConcept, flags)

    expect(addConceptSpy).toHaveBeenCalledWith(mockConcept, flags)
  })

  it('should add every concept of a bulk add with the same flags', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const store = useConceptSetsStore()
    store.currentSet = mockConceptSet
    const addConceptSpy = vi.spyOn(store, 'addConceptToSet')
    const second = { ...mockConcept, conceptId: mockConcept.conceptId + 1 }
    const flags = { isExcluded: false, includeDescendants: true, includeMapped: false }

    await wrapper.vm.onAddConcepts([mockConcept, second], flags)

    expect(addConceptSpy).toHaveBeenNthCalledWith(1, mockConcept, flags)
    expect(addConceptSpy).toHaveBeenNthCalledWith(2, second, flags)
  })

  it('should remove concept from set when remove-concept is emitted', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const store = useConceptSetsStore()
    store.currentSet = mockConceptSet
    const removeConceptSpy = vi.spyOn(store, 'removeConceptFromSet')

    // Component is stubbed, so we can manually call the handler
    await wrapper.vm.onRemoveConcept(mockConcept)

    expect(removeConceptSpy).toHaveBeenCalledWith(mockConcept.conceptId)
  })

  it('should toggle descendants when ConceptSetTable emits toggle:descendants', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const store = useConceptSetsStore()
    store.currentSet = mockConceptSet
    const toggleFlagSpy = vi.spyOn(store, 'toggleConceptFlag')

    // Component is stubbed, so we can manually call the handler
    await wrapper.vm.onToggleDescendants(313217)

    expect(toggleFlagSpy).toHaveBeenCalledWith(313217, 'includeDescendants')
  })

  it('should toggle mapped when ConceptSetTable emits toggle:mapped', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const store = useConceptSetsStore()
    store.currentSet = mockConceptSet
    const toggleFlagSpy = vi.spyOn(store, 'toggleConceptFlag')

    // Component is stubbed, so we can manually call the handler
    await wrapper.vm.onToggleMapped(313217)

    expect(toggleFlagSpy).toHaveBeenCalledWith(313217, 'includeMapped')
  })

  it('should toggle exclude when ConceptSetTable emits toggle:exclude', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const store = useConceptSetsStore()
    store.currentSet = mockConceptSet
    const toggleFlagSpy = vi.spyOn(store, 'toggleConceptFlag')

    // Component is stubbed, so we can manually call the handler
    await wrapper.vm.onToggleExclude(313217)

    expect(toggleFlagSpy).toHaveBeenCalledWith(313217, 'isExcluded')
  })

  it('should remove concept when ConceptSetTable emits remove', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const store = useConceptSetsStore()
    store.currentSet = mockConceptSet
    const removeConceptSpy = vi.spyOn(store, 'removeConceptFromSet')

    // Component is stubbed, so we can manually call the handler
    await wrapper.vm.onRemoveFromSet(313217)

    expect(removeConceptSpy).toHaveBeenCalledWith(313217)
  })

  it('should display item count in selected tab', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const store = useConceptSetsStore()
    store.currentSet = mockConceptSet
    await wrapper.vm.$nextTick()

    // Check that tabs exist
    const tabs = wrapper.findComponent({ name: 'VTabs' })
    expect(tabs.exists()).toBe(true)
  })

  it('should have loading state', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })

    // Verify component has loading state
    expect(wrapper.vm.loading).toBeDefined()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    // Check that buttons exist
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should reset form when concept set prop changes to null', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    await wrapper.vm.$nextTick()

    await wrapper.setProps({ conceptSet: null })
    await wrapper.vm.$nextTick()

    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    if (textFields.length > 0) {
      expect(textFields[0].props('modelValue')).toBe('')
    }
  })

  describe('source resolution (#94)', () => {
    it('falls back to webapiStore.getValidVocabularySource() when no sourceKey is injected', () => {
      const webapi = useWebAPIStore()
      vi.spyOn(webapi, 'getValidVocabularySource').mockReturnValue('MY_VOCAB')

      const wrapper = mountComponent()
      // The computed must NOT be the old hardcoded 'SYNPUF1K' default.
      expect((wrapper.vm as unknown as { sourceKey: string }).sourceKey).toBe('MY_VOCAB')
    })
  })

  describe('paste IDs import (#95 Part B)', () => {
    it('resolves pasted IDs via the batch endpoint and reports unresolved IDs', async () => {
      const webapi = useWebAPIStore()
      vi.spyOn(webapi, 'getValidVocabularySource').mockReturnValue('MY_VOCAB')

      const resolved: Concept = { ...mockConcept, conceptId: 201826 }
      vi.mocked(conceptSearchService.getConceptsByIds).mockResolvedValue([resolved])

      const wrapper = mountComponent()
      const vm = wrapper.vm as unknown as {
        pasteInput: string
        resolvePastedIds: () => Promise<void>
        pasteResolved: Concept[]
        pasteUnresolved: number[]
      }

      vm.pasteInput = '201826 999999'
      await vm.resolvePastedIds()

      // One batch call with the resolved source key (not 'SYNPUF1K').
      expect(conceptSearchService.getConceptsByIds).toHaveBeenCalledWith('MY_VOCAB', [201826, 999999])
      expect(vm.pasteResolved).toHaveLength(1)
      expect(vm.pasteUnresolved).toEqual([999999])
    })

    it('resets resolved/unresolved state when the input is edited after a failed resolve (issue #159)', async () => {
      const webapi = useWebAPIStore()
      vi.spyOn(webapi, 'getValidVocabularySource').mockReturnValue('MY_VOCAB')
      vi.mocked(conceptSearchService.getConceptsByIds).mockResolvedValue([])

      const wrapper = mountComponent()
      const vm = wrapper.vm as unknown as {
        pasteInput: string
        resolvePastedIds: () => Promise<void>
        pasteResolved: Concept[]
        pasteUnresolved: number[]
      }

      vm.pasteInput = '999999'
      await vm.resolvePastedIds()
      expect(vm.pasteUnresolved).toEqual([999999])

      // Correcting the input previously left pasteUnresolved stale, so the
      // dialog stayed stuck on a disabled "Add" button instead of reverting
      // to "Resolve" for the user to re-validate.
      vm.pasteInput = '201826'
      await wrapper.vm.$nextTick()

      expect(vm.pasteResolved).toEqual([])
      expect(vm.pasteUnresolved).toEqual([])
    })
  })

  describe('source code import (#95 Part A)', () => {
    it('resolves pasted source codes and reports unresolved codes', async () => {
      const webapi = useWebAPIStore()
      vi.spyOn(webapi, 'getValidVocabularySource').mockReturnValue('MY_VOCAB')

      const resolved: Concept = { ...mockConcept, conceptId: 1, conceptCode: 'E11.9' }
      vi.mocked(conceptSearchService.getConceptsBySourceCodes).mockResolvedValue([resolved])

      const wrapper = mountComponent()
      const vm = wrapper.vm as unknown as {
        sourceCodeInput: string
        resolvePastedSourceCodes: () => Promise<void>
        sourceCodeResolved: Concept[]
        sourceCodeUnresolved: string[]
      }

      vm.sourceCodeInput = 'E11.9, BADCODE'
      await vm.resolvePastedSourceCodes()

      expect(conceptSearchService.getConceptsBySourceCodes).toHaveBeenCalledWith('MY_VOCAB', [
        'E11.9',
        'BADCODE',
      ])
      expect(vm.sourceCodeResolved).toHaveLength(1)
      expect(vm.sourceCodeUnresolved).toEqual(['BADCODE'])
    })

    it('treats a resolved code as found even when its case differs from the input', async () => {
      const webapi = useWebAPIStore()
      vi.spyOn(webapi, 'getValidVocabularySource').mockReturnValue('MY_VOCAB')

      // User typed 'e11.9'; the vocabulary returns the canonical 'E11.9'.
      const resolved: Concept = { ...mockConcept, conceptId: 1, conceptCode: 'E11.9' }
      vi.mocked(conceptSearchService.getConceptsBySourceCodes).mockResolvedValue([resolved])

      const wrapper = mountComponent()
      const vm = wrapper.vm as unknown as {
        sourceCodeInput: string
        resolvePastedSourceCodes: () => Promise<void>
        sourceCodeResolved: Concept[]
        sourceCodeUnresolved: string[]
      }

      vm.sourceCodeInput = 'e11.9'
      await vm.resolvePastedSourceCodes()

      expect(vm.sourceCodeResolved).toHaveLength(1)
      // Must NOT be reported as unresolved just because of a case mismatch.
      expect(vm.sourceCodeUnresolved).toEqual([])
    })

    it('resets resolved/unresolved state when the input is edited after a failed resolve (issue #159)', async () => {
      const webapi = useWebAPIStore()
      vi.spyOn(webapi, 'getValidVocabularySource').mockReturnValue('MY_VOCAB')
      vi.mocked(conceptSearchService.getConceptsBySourceCodes).mockResolvedValue([])

      const wrapper = mountComponent()
      const vm = wrapper.vm as unknown as {
        sourceCodeInput: string
        resolvePastedSourceCodes: () => Promise<void>
        sourceCodeResolved: Concept[]
        sourceCodeUnresolved: string[]
      }

      vm.sourceCodeInput = 'BADCODE'
      await vm.resolvePastedSourceCodes()
      expect(vm.sourceCodeUnresolved).toEqual(['BADCODE'])

      // Correcting the code previously left the dialog stuck showing a
      // disabled "Add" button because sourceCodeUnresolved never cleared.
      vm.sourceCodeInput = 'E11.9'
      await wrapper.vm.$nextTick()

      expect(vm.sourceCodeResolved).toEqual([])
      expect(vm.sourceCodeUnresolved).toEqual([])
    })
  })

  describe('JSON import (#95 Part A)', () => {
    it('parses pasted expression JSON and adds items with flags preserved', async () => {
      const wrapper = mountComponent({ conceptSet: { name: 'Set', items: [] } })
      const store = useConceptSetsStore()
      store.currentSet = { name: 'Set', items: [] }
      const addSpy = vi.spyOn(store, 'addConceptToSet')
      const toggleSpy = vi.spyOn(store, 'toggleConceptFlag')

      const vm = wrapper.vm as unknown as {
        jsonInput: string
        parseJsonImport: () => void
        applyJsonItems: () => void
        jsonItems: unknown[]
        jsonError: string
      }

      vm.jsonInput = JSON.stringify({
        items: [
          {
            concept: {
              CONCEPT_ID: 201826,
              CONCEPT_NAME: 'Type 2 diabetes mellitus',
              CONCEPT_CODE: '44054006',
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
      vm.parseJsonImport()
      expect(vm.jsonError).toBe('')
      expect(vm.jsonItems).toHaveLength(1)

      vm.applyJsonItems()
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ conceptId: 201826 }))
      // includeDescendants flag should be restored via toggle.
      expect(toggleSpy).toHaveBeenCalledWith(201826, 'includeDescendants')
    })

    it('does not flip the flags of a concept already in the set on re-import', () => {
      // The concept is already present with includeDescendants ON. Importing JSON
      // that also has includeDescendants ON must leave it ON — a blind toggle
      // would flip it OFF, silently destroying the user's setting.
      const existing = {
        ...mockConcept,
        conceptId: 201826,
        isExcluded: false,
        includeDescendants: true,
        includeMapped: false,
      }
      const wrapper = mountComponent({ conceptSet: { name: 'Set', items: [existing] } })
      const store = useConceptSetsStore()
      store.currentSet = { name: 'Set', items: [{ ...existing }] }
      const toggleSpy = vi.spyOn(store, 'toggleConceptFlag')

      const vm = wrapper.vm as unknown as {
        jsonInput: string
        parseJsonImport: () => void
        applyJsonItems: () => void
      }

      vm.jsonInput = JSON.stringify({
        items: [
          {
            concept: {
              CONCEPT_ID: 201826,
              CONCEPT_NAME: 'Type 2 diabetes mellitus',
              CONCEPT_CODE: '44054006',
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
      vm.parseJsonImport()
      vm.applyJsonItems()

      // No toggle for a flag whose desired value already matches.
      expect(toggleSpy).not.toHaveBeenCalledWith(201826, 'includeDescendants')
      const item = store.currentSet?.items.find(i => i.conceptId === 201826)
      expect(item?.includeDescendants).toBe(true)
    })

    it('surfaces an error for malformed JSON', () => {
      const wrapper = mountComponent({ conceptSet: { name: 'Set', items: [] } })
      const vm = wrapper.vm as unknown as {
        jsonInput: string
        parseJsonImport: () => void
        jsonError: string
        jsonItems: unknown[]
      }

      vm.jsonInput = '{ not valid'
      vm.parseJsonImport()
      expect(vm.jsonError).toMatch(/invalid json/i)
      expect(vm.jsonItems).toHaveLength(0)
    })
  })

  describe('Tag sync on save', () => {
    it('notifies with the server message when tag sync fails after save', async () => {
      const store = useConceptSetsStore()
      vi.spyOn(store, 'update').mockResolvedValue(mockConceptSet)
      vi.spyOn(store, 'syncTags').mockResolvedValue({
        success: false,
        error: 'Tag "protected" may only be assigned once',
      })
      const notifications = useNotifications()
      const dangerSpy = vi.spyOn(notifications, 'danger')

      const wrapper = mountComponent({ conceptSet: mockConceptSet })
      await flushPromises()
      const vm = wrapper.vm as unknown as {
        formValid: boolean
        onSave: () => Promise<void>
      }
      vm.formValid = true
      await vm.onSave()

      expect(store.syncTags).toHaveBeenCalledWith(mockConceptSet.id, expect.anything(), expect.anything())
      expect(dangerSpy).toHaveBeenCalledWith(
        'Failed to update tags',
        expect.objectContaining({ message: 'Tag "protected" may only be assigned once' })
      )
    })

    it('assigns a newly added tag even though saving re-seeds the tag refs', async () => {
      const store = useConceptSetsStore()
      const newTag = { id: 42, name: 'cardiology' }
      vi.spyOn(store, 'syncTags').mockResolvedValue({ success: true })

      const wrapper = mountComponent({ conceptSet: { ...mockConceptSet, tags: [] } })
      await flushPromises()

      // Persisting hands back a concept set that does not carry the pending tag
      // yet. In the app that value flows straight back into props.conceptSet, so
      // the seeding watcher runs mid-save and clears both refs — reading them
      // after the await would diff nothing and silently drop the tag.
      vi.spyOn(store, 'update').mockImplementation(async () => {
        const persisted = { ...mockConceptSet, tags: [] }
        await wrapper.setProps({ conceptSet: persisted })
        return persisted
      })

      const vm = wrapper.vm as unknown as {
        formValid: boolean
        selectedTags: typeof newTag[]
        onSave: () => Promise<void>
      }
      vm.selectedTags = [newTag]
      vm.formValid = true
      await vm.onSave()

      expect(store.syncTags).toHaveBeenCalledWith(mockConceptSet.id, [], [newTag])
    })
  })
})
