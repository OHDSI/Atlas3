/**
 * ConceptSetSelectionDialog Component Tests
 *
 * The dialog was rebuilt to mirror the modernised /concepts list:
 * eyebrow + accent rule + clean title, search + count chip + create
 * button toolbar, and a SurfaceCard-wrapped v-data-table with a
 * filled empty-state container. The previous v-list / v-pagination
 * structure has been replaced — these tests check the new behaviour.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import ConceptSetSelectionDialog from '@/components/cohort/ConceptSetSelectionDialog.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSetListItem } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

function mountComponent(props = {}) {
  return mount(ConceptSetSelectionDialog, {
    props: {
      modelValue: true,
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        // Stub Teleport so the drawer renders inline and tests can
        // query its DOM.
        Teleport: { template: '<div><slot /></div>' },
        VNavigationDrawer: {
          template: '<div class="v-navigation-drawer"><slot /></div>',
          props: ['modelValue', 'location', 'temporary', 'width']
        }
      }
    }
  })
}

describe('ConceptSetSelectionDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should mount successfully', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should render the modernised eyebrow + accent rule + title block', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.cs-picker__eyebrow-row').exists()).toBe(true)
      expect(wrapper.find('.cs-picker__accent-rule').exists()).toBe(true)
      expect(wrapper.find('.cs-picker__title').exists()).toBe(true)
      expect(wrapper.text().toLowerCase()).toContain('select concept set')
    })

    it('should render the search input + close button', () => {
      const wrapper = mountComponent()
      expect(wrapper.findComponent({ name: 'VTextField' }).exists()).toBe(true)
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const closeBtn = buttons.find(b => b.props('icon') === 'mdi-close')
      expect(closeBtn).toBeDefined()
    })
  })

  describe('Concept sets display', () => {
    it('should render the empty-state container when no sets', async () => {
      const wrapper = mountComponent()
      const store = useConceptSetsStore()
      store.conceptSets = []
      store.loading = false
      await nextTick()

      expect(wrapper.find('.cs-picker__empty').exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'VDataTable' }).exists()).toBe(false)
    })

    it('should render the data-table when sets exist', async () => {
      const wrapper = mountComponent()
      const store = useConceptSetsStore()

      const mockSets: ConceptSetListItem[] = [
        { id: 1, name: 'Diabetes Concepts' },
        { id: 2, name: 'Hypertension Concepts' }
      ]
      store.conceptSets = mockSets
      store.loading = false
      await nextTick()

      const table = wrapper.findComponent({ name: 'VDataTable' })
      expect(table.exists()).toBe(true)
      expect(wrapper.text()).toContain('Diabetes Concepts')
      expect(wrapper.text()).toContain('Hypertension Concepts')
    })

    it('should display the loading indicator when loading', async () => {
      const wrapper = mountComponent()
      const store = useConceptSetsStore()
      store.loading = true
      await nextTick()

      expect(wrapper.findComponent({ name: 'VProgressLinear' }).exists()).toBe(true)
    })
  })

  describe('Search', () => {
    beforeEach(() => {
      const store = useConceptSetsStore()
      store.conceptSets = [
        { id: 1, name: 'Diabetes Mellitus' },
        { id: 2, name: 'Type 2 Diabetes' },
        { id: 3, name: 'Hypertension' },
        { id: 4, name: 'Heart Disease' }
      ]
      store.loading = false
    })

    it('should filter the table items by search term (case-insensitive)', async () => {
      const wrapper = mountComponent()
      const searchInput = wrapper.findComponent({ name: 'VTextField' })

      await searchInput.vm.$emit('update:modelValue', 'DIAbetes')
      await nextTick()

      const vm = wrapper.vm as unknown as { filteredSets: ConceptSetListItem[] }
      const names = vm.filteredSets.map(s => s.name)
      expect(names).toEqual(expect.arrayContaining(['Diabetes Mellitus', 'Type 2 Diabetes']))
      expect(names).not.toContain('Hypertension')
    })

    it('should show the filtered-empty container when nothing matches', async () => {
      const wrapper = mountComponent()
      const searchInput = wrapper.findComponent({ name: 'VTextField' })

      await searchInput.vm.$emit('update:modelValue', 'nonexistent')
      await nextTick()

      expect(wrapper.find('.cs-picker__empty').exists()).toBe(true)
      expect(wrapper.text().toLowerCase()).toMatch(/no concept sets|no results/)
    })
  })

  describe('Local concept sets (#111)', () => {
    const localSets = [
      { id: 1, name: 'Diabetes drugs' },
      { id: 2, name: 'Hospital visits' },
    ]

    it('does not render the local section when there are no local sets', () => {
      const wrapper = mountComponent({ localConceptSets: [] })
      expect(wrapper.find('[data-testid="local-concept-sets"]').exists()).toBe(false)
    })

    it('renders the in-definition list when local sets are provided', () => {
      const wrapper = mountComponent({ localConceptSets: localSets })
      expect(wrapper.find('[data-testid="local-concept-sets"]').exists()).toBe(true)
      const items = wrapper.findAll('[data-testid="local-concept-set-item"]')
      expect(items.length).toBe(2)
      expect(wrapper.text()).toContain('Diabetes drugs')
      expect(wrapper.text()).toContain('Hospital visits')
    })

    it('excludes placeholder concept sets (id 0 / null / undefined) from the local list', () => {
      const withPlaceholders = [
        { id: 1, name: 'Diabetes drugs' },
        { id: 0, name: 'Select concept set...' },
        { id: null as unknown as number, name: 'Select concept set...' },
      ]
      const wrapper = mountComponent({ localConceptSets: withPlaceholders })
      const items = wrapper.findAll('[data-testid="local-concept-set-item"]')
      expect(items.length).toBe(1)
      expect(wrapper.text()).toContain('Diabetes drugs')
    })

    it('hides the local section entirely when only placeholders are present', () => {
      const wrapper = mountComponent({
        localConceptSets: [{ id: 0, name: 'Select concept set...' }],
      })
      expect(wrapper.find('[data-testid="local-concept-sets"]').exists()).toBe(false)
    })

    it('emits local-concept-set-selected with the ref and closes when a local row is clicked', async () => {
      const wrapper = mountComponent({ localConceptSets: localSets })
      const items = wrapper.findAll('[data-testid="local-concept-set-item"]')
      await items[0].trigger('click')

      expect(wrapper.emitted('local-concept-set-selected')).toBeTruthy()
      expect(wrapper.emitted('local-concept-set-selected')![0]).toEqual([localSets[0]])
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    })
  })

  describe('Events', () => {
    it('should emit concept-set-selected and close when a row is clicked', async () => {
      const wrapper = mountComponent()
      const store = useConceptSetsStore()
      const mockSet: ConceptSetListItem = { id: 1, name: 'Test Set' }
      store.conceptSets = [mockSet]
      store.loading = false
      await nextTick()

      const table = wrapper.findComponent({ name: 'VDataTable' })
      // Simulate the (event, payload) signature v-data-table emits
      // for click:row.
      await table.vm.$emit('click:row', new Event('click'), { item: mockSet })

      expect(wrapper.emitted('concept-set-selected')).toBeTruthy()
      expect(wrapper.emitted('concept-set-selected')![0]).toEqual([mockSet])
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    })

    it('should emit edit-concept-set without closing when the edit pencil is clicked', async () => {
      const wrapper = mountComponent()
      const store = useConceptSetsStore()
      const mockSet: ConceptSetListItem = { id: 1, name: 'Test Set' }
      store.conceptSets = [mockSet]
      store.loading = false
      await nextTick()

      const vm = wrapper.vm as unknown as { onEditClick: (s: ConceptSetListItem) => void }
      vm.onEditClick(mockSet)

      expect(wrapper.emitted('edit-concept-set')).toBeTruthy()
      expect(wrapper.emitted('edit-concept-set')![0]).toEqual([mockSet])
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('should emit create-new from the empty-state CTA', async () => {
      const wrapper = mountComponent()
      const store = useConceptSetsStore()
      store.conceptSets = []
      store.loading = false
      await nextTick()

      const buttons = wrapper.find('.cs-picker__empty').findAllComponents({ name: 'VBtn' })
      const createBtn = buttons.find(b => b.text().toLowerCase().includes('new concept set'))
      await createBtn?.trigger('click')

      expect(wrapper.emitted('create-new')).toBeTruthy()
    })
  })
})
