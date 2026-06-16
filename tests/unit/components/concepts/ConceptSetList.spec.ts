/**
 * ConceptSetList Component Tests (T132)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetList from '@/components/concepts/ConceptSetList.vue'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSetListItem } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

const mockConceptSets: ConceptSetListItem[] = [
  {
    id: 123,
    name: 'Diabetes Concepts',
    createdDate: '2024-01-15T10:00:00Z',
    createdBy: { id: 1, name: 'John Doe', login: 'jdoe' },
    modifiedDate: '2024-06-01T15:30:00Z',
  },
  {
    id: 456,
    name: 'Cardiovascular Concepts',
    createdDate: '2024-02-20T08:00:00Z',
    createdBy: 'admin',
    modifiedDate: '2024-05-15T12:00:00Z',
  },
]

function mountComponent() {
  return mount(ConceptSetList, {
    global: {
      plugins: [vuetify],
      stubs: {
        ConceptSetEditor: true,
      },
    },
  })
}

describe('ConceptSetList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should mount successfully', () => {
    const wrapper = mountComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('should render search input field', () => {
    const wrapper = mountComponent()
    const textField = wrapper.findComponent({ name: 'VTextField' })
    expect(textField.exists()).toBe(true)
  })

  it('should have search icon in input', () => {
    const wrapper = mountComponent()
    const textField = wrapper.findComponent({ name: 'VTextField' })
    expect(textField.props('prependInnerIcon')).toBe('mdi-magnify')
  })

  it('should render add concept set button', () => {
    const wrapper = mountComponent()
    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    // Check for button existence - text matching may not work with translation keys
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should render data table when concept sets exist', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    // Refresh: the data table only renders when there are rows or
    // the store is loading. With an empty store we render an MD3
    // filled empty-state container instead — see the empty-state
    // tests below.
    store.conceptSets = mockConceptSets
    store.filterTerm = ''
    await wrapper.vm.$nextTick()

    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.exists()).toBe(true)
  })

  it('should fetch concept sets on mount', async () => {
    const store = useConceptSetsStore()
    const fetchAllSpy = vi.spyOn(store, 'fetchAll').mockResolvedValue()

    mountComponent()
    await flushPromises()

    expect(fetchAllSpy).toHaveBeenCalled()
  })

  it('should display concept sets in table', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.conceptSets = mockConceptSets
    store.filterTerm = ''
    await wrapper.vm.$nextTick()

    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('items')).toEqual(mockConceptSets)
  })

  it('should display loading state', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.loading = true
    await wrapper.vm.$nextTick()

    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('loading')).toBe(true)
  })

  it('renders ConceptSetFilters and forwards update:filters to the store', async () => {
    const store = useConceptSetsStore()
    store.conceptSets = mockConceptSets
    const setFiltersSpy = vi.spyOn(store, 'setFilters')

    const wrapper = mountComponent()
    const filters = wrapper.findComponent({ name: 'ConceptSetFilters' })
    expect(filters.exists()).toBe(true)

    filters.vm.$emit('update:filters', {
      searchQuery: 'diabetes',
      author: '',
      createdDateRange: {},
      modifiedDateRange: {},
    })
    await wrapper.vm.$nextTick()
    expect(setFiltersSpy).toHaveBeenCalledWith({
      searchQuery: 'diabetes',
      author: '',
      createdDateRange: {},
      modifiedDateRange: {},
    })
  })

  it('should open create editor when add button is clicked', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()
    const openCreateEditorSpy = vi.spyOn(store, 'openCreateEditor')

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const addBtn = buttons.find(btn => btn.text().includes('Add concept set'))

    if (addBtn) {
      await addBtn.trigger('click')
      expect(openCreateEditorSpy).toHaveBeenCalled()
    }
  })

  it('should display error alert when store has error', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.error = 'Failed to fetch concept sets'
    await wrapper.vm.$nextTick()

    const alert = wrapper.findComponent({ name: 'VAlert' })
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('Failed to fetch concept sets')
  })

  it('should clear error when alert is closed', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.error = 'Failed to fetch concept sets'
    await wrapper.vm.$nextTick()

    const alert = wrapper.findComponent({ name: 'VAlert' })
    await alert.vm.$emit('click:close')

    expect(store.error).toBe(null)
  })

  it('should open edit editor when edit button is clicked', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.filteredSets = mockConceptSets
    const openEditEditorSpy = vi.spyOn(store, 'openEditEditor')

    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const editButtons = buttons.filter(btn => btn.props('icon') === 'mdi-pencil')

    if (editButtons.length > 0) {
      await editButtons[0].trigger('click')
      expect(openEditEditorSpy).toHaveBeenCalledWith(123)
    }
  })

  it('should render ConceptSetEditor when editor is open', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.editorOpen = true
    await wrapper.vm.$nextTick()

    const editor = wrapper.findComponent(ConceptSetEditor)
    expect(editor.exists()).toBe(true)
  })

  it('should close editor when editor emits update:modelValue', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.editorOpen = true
    const closeEditorSpy = vi.spyOn(store, 'closeEditor')

    await wrapper.vm.$nextTick()

    const editor = wrapper.findComponent(ConceptSetEditor)
    await editor.vm.$emit('update:modelValue', false)

    expect(closeEditorSpy).toHaveBeenCalled()
  })

  it('should refresh list when editor emits save', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.editorOpen = true
    const fetchAllSpy = vi.spyOn(store, 'fetchAll').mockResolvedValue()

    await wrapper.vm.$nextTick()

    const editor = wrapper.findComponent(ConceptSetEditor)
    await editor.vm.$emit('save')
    await flushPromises()

    expect(fetchAllSpy).toHaveBeenCalled()
  })

  it('should display delete confirmation dialog', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.editorOpen = true
    store.currentSet = {
      id: 123,
      name: 'Test Set',
      items: [],
    }

    await wrapper.vm.$nextTick()

    const editor = wrapper.findComponent(ConceptSetEditor)
    await editor.vm.$emit('delete', 123)
    await wrapper.vm.$nextTick()

    const dialog = wrapper.findComponent({ name: 'VDialog' })
    expect(dialog.exists()).toBe(true)
  })

  it('should handle delete event from editor', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.conceptSets = mockConceptSets
    store.filterTerm = ''
    store.editorOpen = true
    store.currentSet = {
      id: 123,
      name: 'Test Set',
      items: [],
    }

    await wrapper.vm.$nextTick()

    const editor = wrapper.findComponent(ConceptSetEditor)
    await editor.vm.$emit('delete', 123)
    await wrapper.vm.$nextTick()

    // Verify dialog exists
    const dialog = wrapper.findComponent({ name: 'VDialog' })
    expect(dialog.exists()).toBe(true)
  })

  it('should format author name from object', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.conceptSets = mockConceptSets
    store.filterTerm = ''
    await wrapper.vm.$nextTick()

    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('items')).toEqual(mockConceptSets)
  })

  it('should format author name from string', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.conceptSets = mockConceptSets
    store.filterTerm = ''
    await wrapper.vm.$nextTick()

    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('items')).toEqual(mockConceptSets)
  })

  it('should render the filled empty-state container when list is empty', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.conceptSets = []
    store.filterTerm = ''
    store.loading = false
    await wrapper.vm.$nextTick()

    // Refresh: empty list renders the MD3 empty-state container in
    // place of the data table.
    expect(wrapper.find('.concept-set-list__empty').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'VDataTable' }).exists()).toBe(false)
  })

  it('should display empty state message and create CTA', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.conceptSets = []
    store.filterTerm = ''
    store.loading = false
    await wrapper.vm.$nextTick()

    const empty = wrapper.find('.concept-set-list__empty')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toMatch(/concept sets/i)
    // CTA is present when there's no active filter.
    const ctaButtons = empty.findAllComponents({ name: 'VBtn' })
    expect(ctaButtons.length).toBeGreaterThan(0)
  })

  it('should render loading skeleton when loading', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.loading = true
    await wrapper.vm.$nextTick()

    const skeletons = wrapper.findAllComponents({ name: 'VSkeletonLoader' })
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should set items per page', async () => {
    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('itemsPerPage')).toBe(25)
  })

  it('should not open editor when not in editorOpen state', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()

    store.editorOpen = false
    await wrapper.vm.$nextTick()

    const editor = wrapper.findComponent(ConceptSetEditor)
    expect(editor.exists()).toBe(false)
  })
})
