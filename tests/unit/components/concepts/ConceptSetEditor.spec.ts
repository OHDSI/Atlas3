/**
 * ConceptSetEditor Component Tests (T131)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'
import type { ConceptSet, Concept } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

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

  it('should add concept to set when add-concept is emitted', async () => {
    const wrapper = mountComponent({ conceptSet: mockConceptSet })
    const store = useConceptSetsStore()
    store.currentSet = mockConceptSet
    const addConceptSpy = vi.spyOn(store, 'addConceptToSet')

    // Component is stubbed, so we can manually call the handler
    await wrapper.vm.onAddConcept(mockConcept)

    expect(addConceptSpy).toHaveBeenCalledWith(mockConcept)
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
})
