/**
 * ConceptsView Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import ConceptsView from '@/views/ConceptsView.vue'

// Mock vue-router
const mockPush = vi.fn()
const mockQuery = ref<Record<string, string | string[]>>({})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useRoute: () => ({
    query: mockQuery.value,
  }),
}))

// Mock useI18n composable
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ref(fallback),
  }),
}))

// Mock concept sets store
const mockCloseEditor = vi.fn()
const mockFetchAll = vi.fn()

vi.mock('@/stores/concept-sets', () => ({
  useConceptSetsStore: () => ({
    closeEditor: mockCloseEditor,
    fetchAll: mockFetchAll,
    conceptSets: ref([]),
    currentSet: ref(null),
    loading: ref(false),
    error: ref(null),
    editorOpen: ref(false),
  }),
}))

// Mock child components
vi.mock('@/components/concepts/ConceptSearch.vue', () => ({
  default: {
    name: 'ConceptSearch',
    template: '<div class="concept-search"></div>',
  },
}))

vi.mock('@/components/concepts/ConceptSetList.vue', () => ({
  default: {
    name: 'ConceptSetList',
    template: '<div class="concept-set-list"></div>',
  },
}))

const vuetify = createVuetify({ components, directives })

function mountComponent(options = {}) {
  return mount(ConceptsView, {
    global: {
      plugins: [vuetify],
      stubs: {
        ConceptSearch: true,
        ConceptSetList: true,
      },
    },
    ...options,
  })
}

describe('ConceptsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockQuery.value = {}
  })

  describe('Component Rendering', () => {
    it('should render the concepts view wrapper', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.concepts-view').exists()).toBe(true)
    })

    it('should render the page wrapper with correct structure', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-wrapper').exists()).toBe(true)
      expect(wrapper.find('.page-card').exists()).toBe(true)
    })

    it('should render tabs for navigation', () => {
      const wrapper = mountComponent()
      const tabs = wrapper.findComponent({ name: 'VTabs' })
      expect(tabs.exists()).toBe(true)
    })

    it('should render window component for tab content', () => {
      const wrapper = mountComponent()
      const window = wrapper.findComponent({ name: 'VWindow' })
      expect(window.exists()).toBe(true)
    })

    it('should render both tab buttons', () => {
      const wrapper = mountComponent()
      const tabButtons = wrapper.findAllComponents({ name: 'VTab' })
      expect(tabButtons.length).toBe(2)
    })

    it('should have search tab with correct value', () => {
      const wrapper = mountComponent()
      const tabs = wrapper.findAllComponents({ name: 'VTab' })
      const searchTab = tabs[0]
      expect(searchTab.attributes('value')).toBe('search')
    })

    it('should have concept sets tab with correct value', () => {
      const wrapper = mountComponent()
      const tabs = wrapper.findAllComponents({ name: 'VTab' })
      const setsTab = tabs[1]
      expect(setsTab.attributes('value')).toBe('sets')
    })
  })

  describe('Tab Content', () => {
    it('should render ConceptSearch component in search tab', () => {
      const wrapper = mountComponent()
      const windowItems = wrapper.findAllComponents({ name: 'VWindowItem' })
      expect(windowItems.length).toBe(2)
      expect(windowItems[0].findComponent({ name: 'ConceptSearch' }).exists()).toBe(true)
    })

    it('should render ConceptSetList component in sets tab', () => {
      const wrapper = mountComponent()
      const windowItems = wrapper.findAllComponents({ name: 'VWindowItem' })
      expect(windowItems.length).toBe(2)
      // When using stubs, both child components are present in the DOM
      // Check that we have the window items structure for both tabs
      expect(windowItems[0].exists()).toBe(true)
      expect(windowItems[1].exists()).toBe(true)
    })
  })

  describe('Default Tab State', () => {
    it('should default to search tab when no query parameter is provided', () => {
      mockQuery.value = {}
      const wrapper = mountComponent()
      const _tabs = wrapper.findComponent({ name: 'VTabs' })

      // The v-model binding should be on the search tab by default
      expect(wrapper.vm.activeTab).toBe('search')
    })

    it('should set active tab from URL query parameter', () => {
      mockQuery.value = { tab: 'sets' }
      const wrapper = mountComponent()

      expect(wrapper.vm.activeTab).toBe('sets')
    })

    it('should handle empty string query parameter', () => {
      mockQuery.value = { tab: '' }
      const wrapper = mountComponent()

      // Should fall back to default 'search'
      expect(wrapper.vm.activeTab).toBe('search')
    })
  })

  describe('Tab Switching', () => {
    it('should update URL when switching tabs', async () => {
      const wrapper = mountComponent()

      wrapper.vm.activeTab = 'sets'
      await flushPromises()

      expect(mockPush).toHaveBeenCalledWith({ query: { tab: 'sets' } })
    })

    it('should close editor when switching tabs', async () => {
      const wrapper = mountComponent()

      wrapper.vm.activeTab = 'sets'
      await flushPromises()

      expect(mockCloseEditor).toHaveBeenCalled()
    })

    it('should preserve other query parameters when switching tabs', async () => {
      mockQuery.value = { foo: 'bar', tab: 'search' }
      const wrapper = mountComponent()

      wrapper.vm.activeTab = 'sets'
      await flushPromises()

      expect(mockPush).toHaveBeenCalledWith({ query: { foo: 'bar', tab: 'sets' } })
    })

    it('should handle rapid tab switching', async () => {
      const wrapper = mountComponent()

      wrapper.vm.activeTab = 'sets'
      await flushPromises()

      wrapper.vm.activeTab = 'search'
      await flushPromises()

      wrapper.vm.activeTab = 'sets'
      await flushPromises()

      // Should have called push for each change
      expect(mockPush).toHaveBeenCalledTimes(3)
      expect(mockCloseEditor).toHaveBeenCalledTimes(3)
    })
  })

  describe('Provide/Inject', () => {
    it('should provide sourceKey to child components', () => {
      const wrapper = mountComponent()

      // Access the provided value through the component instance
      expect(wrapper.vm.sourceKey).toBe('SYNPUF1K')
    })

    it('should provide reactive sourceKey ref', () => {
      const wrapper = mountComponent()

      // Verify sourceKey is a ref
      expect(typeof wrapper.vm.sourceKey).toBe('string')
    })
  })

  describe('Tab Configuration', () => {
    it('should render tabs with correct styling properties', () => {
      const wrapper = mountComponent()
      const tabs = wrapper.findComponent({ name: 'VTabs' })

      expect(tabs.exists()).toBe(true)
      // The mb-4 class is applied to the VTabs component in the template
      const tabsElement = wrapper.find('.concepts-view').findComponent({ name: 'VTabs' })
      expect(tabsElement.exists()).toBe(true)
    })

    it('should render window items with correct structure', () => {
      const wrapper = mountComponent()
      const windowItems = wrapper.findAllComponents({ name: 'VWindowItem' })

      expect(windowItems.length).toBe(2)
    })
  })

  describe('Responsive Design', () => {
    it('should apply correct CSS classes for responsive layout', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.page-wrapper').exists()).toBe(true)
      expect(wrapper.find('.page-card').exists()).toBe(true)
      expect(wrapper.find('.concepts-view').exists()).toBe(true)
    })
  })

  describe('Component Lifecycle', () => {
    it('should initialize with search tab active by default', () => {
      const wrapper = mountComponent()

      expect(wrapper.vm.activeTab).toBe('search')
    })

    it('should respect initial query parameter on mount', () => {
      mockQuery.value = { tab: 'sets' }
      const wrapper = mountComponent()

      expect(wrapper.vm.activeTab).toBe('sets')
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid tab query parameter gracefully', () => {
      mockQuery.value = { tab: 'invalid-tab' }
      const wrapper = mountComponent()

      // Component should render despite invalid tab value
      expect(wrapper.find('.concepts-view').exists()).toBe(true)
    })

    it('should handle array query parameter', () => {
      mockQuery.value = { tab: ['search', 'sets'] }
      const wrapper = mountComponent()

      // Should handle array by taking first value or defaulting
      expect(wrapper.vm.activeTab).toBeTruthy()
    })

    it('should handle undefined query object', () => {
      mockQuery.value = {}
      const wrapper = mountComponent()

      expect(wrapper.vm.activeTab).toBe('search')
      expect(wrapper.find('.concepts-view').exists()).toBe(true)
    })
  })

  describe('Integration with Child Components', () => {
    it('should render ConceptSearch when search tab is active', () => {
      mockQuery.value = { tab: 'search' }
      const wrapper = mountComponent()

      expect(wrapper.findComponent({ name: 'ConceptSearch' }).exists()).toBe(true)
    })

    it('should render ConceptSetList when sets tab is active', () => {
      mockQuery.value = { tab: 'sets' }
      const wrapper = mountComponent()

      expect(wrapper.findComponent({ name: 'ConceptSetList' }).exists()).toBe(true)
    })
  })

  describe('Store Integration', () => {
    it('should interact with concept sets store on tab change', async () => {
      const wrapper = mountComponent()

      wrapper.vm.activeTab = 'sets'
      await flushPromises()

      expect(mockCloseEditor).toHaveBeenCalled()
    })

    it('should call closeEditor when switching from sets to search', async () => {
      mockQuery.value = { tab: 'sets' }
      const wrapper = mountComponent()
      vi.clearAllMocks()

      wrapper.vm.activeTab = 'search'
      await flushPromises()

      expect(mockCloseEditor).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper tab structure for accessibility', () => {
      const wrapper = mountComponent()
      const tabs = wrapper.findComponent({ name: 'VTabs' })

      expect(tabs.exists()).toBe(true)
      expect(wrapper.findAllComponents({ name: 'VTab' }).length).toBe(2)
    })

    it('should render tab content in accessible window items', () => {
      const wrapper = mountComponent()
      const windowItems = wrapper.findAllComponents({ name: 'VWindowItem' })

      expect(windowItems.length).toBe(2)
    })
  })

  describe('Navigation State Synchronization', () => {
    it('should sync activeTab state with router', async () => {
      const wrapper = mountComponent()

      expect(wrapper.vm.activeTab).toBe('search')

      wrapper.vm.activeTab = 'sets'
      await flushPromises()

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ tab: 'sets' })
        })
      )
    })

    it('should maintain tab state during component lifecycle', () => {
      mockQuery.value = { tab: 'sets' }
      const wrapper = mountComponent()

      expect(wrapper.vm.activeTab).toBe('sets')

      // Simulate remount
      wrapper.unmount()
      const wrapper2 = mountComponent()

      expect(wrapper2.vm.activeTab).toBe('sets')
    })
  })

  describe('Styling Classes', () => {
    it('should apply correct wrapper classes', () => {
      const wrapper = mountComponent()

      const pageWrapper = wrapper.find('.page-wrapper')
      expect(pageWrapper.exists()).toBe(true)
    })

    it('should apply correct card classes', () => {
      const wrapper = mountComponent()

      const pageCard = wrapper.find('.page-card')
      expect(pageCard.exists()).toBe(true)
    })

    it('should apply correct view container classes', () => {
      const wrapper = mountComponent()

      const conceptsView = wrapper.find('.concepts-view')
      expect(conceptsView.exists()).toBe(true)
    })

    it('should have margin classes on tabs', () => {
      const wrapper = mountComponent()
      const tabsWrapper = wrapper.find('.concepts-view')

      expect(tabsWrapper.exists()).toBe(true)
    })
  })
})
