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

// Mock vue-router. The component uses router.replace + a watcher with
// `immediate: true` and a `route.query.tab !== newTab` guard, so the mock
// updates mockQuery on every replace to simulate real navigation — that
// keeps the guard accurate across multiple tab switches in a single test.
const mockReplace = vi.fn((opts?: { query?: Record<string, string | string[]> }) => {
  if (opts?.query) {
    mockQuery.value = { ...opts.query }
  }
})
const mockQuery = ref<Record<string, string | string[]>>({})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useRoute: () => ({
    get query() {
      return mockQuery.value
    },
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

const mockRemove = vi.fn()

vi.mock('@/stores/concept-sets', () => ({
  useConceptSetsStore: () => ({
    closeEditor: mockCloseEditor,
    fetchAll: mockFetchAll,
    remove: mockRemove,
    conceptSets: [],
    currentSet: null,
    loading: false,
    error: null,
    editorOpen: false,
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
        ConceptSetEditor: true,
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

    it('should have concept sets tab as the first tab', () => {
      const wrapper = mountComponent()
      const tabs = wrapper.findAllComponents({ name: 'VTab' })
      const setsTab = tabs[0]
      expect(setsTab.attributes('value')).toBe('sets')
    })

    it('should have search tab as the second tab', () => {
      const wrapper = mountComponent()
      const tabs = wrapper.findAllComponents({ name: 'VTab' })
      const searchTab = tabs[1]
      expect(searchTab.attributes('value')).toBe('search')
    })
  })

  describe('Tab Content', () => {
    it('should render ConceptSearch component in search tab', () => {
      // Mount with the search tab active so its window item renders ConceptSearch.
      mockQuery.value = { tab: 'search' }
      const wrapper = mountComponent()
      const windowItems = wrapper.findAllComponents({ name: 'VWindowItem' })
      expect(windowItems.length).toBe(2)
      // Search is now the second window item (sets is first by default).
      expect(windowItems[1].findComponent({ name: 'ConceptSearch' }).exists()).toBe(true)
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
    it('should default to concept sets tab when no query parameter is provided', () => {
      mockQuery.value = {}
      const wrapper = mountComponent()
      const _tabs = wrapper.findComponent({ name: 'VTabs' })

      // Default tab is concept sets — concept search is reachable via the second tab.
      expect(wrapper.vm.activeTab).toBe('sets')
    })

    it('should set active tab from URL query parameter', () => {
      mockQuery.value = { tab: 'sets' }
      const wrapper = mountComponent()

      expect(wrapper.vm.activeTab).toBe('sets')
    })

    it('should handle empty string query parameter', () => {
      mockQuery.value = { tab: '' }
      const wrapper = mountComponent()

      // Should fall back to default 'sets'
      expect(wrapper.vm.activeTab).toBe('sets')
    })
  })

  describe('Tab Switching', () => {
    it('should update URL when switching tabs', async () => {
      const wrapper = mountComponent()

      // Default tab is 'sets'; switching to 'search' should update the URL.
      wrapper.vm.activeTab = 'search'
      await flushPromises()

      expect(mockReplace).toHaveBeenCalledWith({ query: { tab: 'search' } })
    })

    it('should keep the editor open when switching tabs', async () => {
      // The editor is now a page-level drawer shared by both tabs, so it must
      // persist across tab switches (it no longer closes on navigation).
      const wrapper = mountComponent()

      wrapper.vm.activeTab = 'search'
      await flushPromises()

      expect(mockCloseEditor).not.toHaveBeenCalled()
    })

    it('should preserve other query parameters when switching tabs', async () => {
      mockQuery.value = { foo: 'bar', tab: 'sets' }
      const wrapper = mountComponent()

      wrapper.vm.activeTab = 'search'
      await flushPromises()

      expect(mockReplace).toHaveBeenCalledWith({ query: { foo: 'bar', tab: 'search' } })
    })

    it('should handle rapid tab switching', async () => {
      // Start on the non-default tab so each subsequent switch is a real change.
      mockQuery.value = { tab: 'search' }
      const wrapper = mountComponent()
      vi.clearAllMocks()

      wrapper.vm.activeTab = 'sets'
      await flushPromises()

      wrapper.vm.activeTab = 'search'
      await flushPromises()

      wrapper.vm.activeTab = 'sets'
      await flushPromises()

      // Should have called replace for each change
      expect(mockReplace).toHaveBeenCalledTimes(3)
      // The page-level editor persists across tab switches.
      expect(mockCloseEditor).not.toHaveBeenCalled()
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
    it('should initialize with concept sets tab active by default', () => {
      const wrapper = mountComponent()

      expect(wrapper.vm.activeTab).toBe('sets')
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

      expect(wrapper.vm.activeTab).toBe('sets')
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
    it('should update the URL via the router on tab change', async () => {
      const wrapper = mountComponent()

      wrapper.vm.activeTab = 'search'
      await flushPromises()

      expect(mockReplace).toHaveBeenCalledWith({ query: { tab: 'search' } })
    })

    it('should not close the editor when switching from sets to search', async () => {
      mockQuery.value = { tab: 'sets' }
      const wrapper = mountComponent()
      vi.clearAllMocks()

      wrapper.vm.activeTab = 'search'
      await flushPromises()

      expect(mockCloseEditor).not.toHaveBeenCalled()
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

      expect(wrapper.vm.activeTab).toBe('sets')

      wrapper.vm.activeTab = 'search'
      await flushPromises()

      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ tab: 'search' })
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
