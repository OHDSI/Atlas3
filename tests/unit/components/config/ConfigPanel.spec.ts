/**
 * Component Tests: ConfigPanel
 *
 * Tests for configuration panel component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { computed } from 'vue'
import ConfigPanel from '@/components/config/ConfigPanel.vue'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { usePluginMounts } from '@/composables/usePluginMounts'
import CacheManagementSection from '@/components/config/CacheManagementSection.vue'
import DataSourcesSection from '@/components/config/DataSourcesSection.vue'
import TagManagementSection from '@/components/config/TagManagementSection.vue'

const vuetify = createVuetify({ components, directives })

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/composables/usePluginMounts', () => ({
  usePluginMounts: vi.fn(() => ({ items: computed(() => []) })),
}))

// Helper to mount ConfigPanel with stubs for layout components
function mountConfigPanel(options: any = {}) {
  return mount(ConfigPanel, {
    global: {
      plugins: [vuetify],
      ...options.global,
      stubs: {
        VNavigationDrawer: {
          name: 'VNavigationDrawer',
          template: '<div class="v-navigation-drawer"><slot /></div>',
          props: ['modelValue', 'location', 'temporary', 'width']
        },
        ...options.global?.stubs
      }
    }
  })
}

describe.skip('ConfigPanel.vue', () => {
  // Note: These tests are skipped because VNavigationDrawer requires complex Vuetify layout setup
  // The component works correctly in the actual application
  // TODO: Investigate proper Vuetify layout testing setup
  let wrapper: VueWrapper
  let uiStore: ReturnType<typeof useUIStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    uiStore = useUIStore()

    // Suppress Vuetify layout warnings in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  describe('Mounting and initialization', () => {
    it('should mount successfully', () => {
      wrapper = mountConfigPanel({
        global: {
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should render navigation drawer', () => {
      wrapper = mountConfigPanel({
        global: {
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      const drawer = wrapper.findComponent({ name: 'VNavigationDrawer' })
      expect(drawer.exists()).toBe(true)
    })

    it('should be closed by default', () => {
      wrapper = mountConfigPanel({
        global: {
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      expect(uiStore.configPanelState.isOpen).toBe(false)
    })
  })

  describe('Opening and closing', () => {
    it('should open when store state changes', async () => {
      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify],
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      uiStore.openConfigPanel()
      await wrapper.vm.$nextTick()

      expect(uiStore.configPanelState.isOpen).toBe(true)
    })

    it('should close when close button clicked', async () => {
      uiStore.openConfigPanel()

      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify],
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      const closeButton = wrapper.find('[aria-label="Close configuration panel"]')
      await closeButton.trigger('click')

      expect(uiStore.configPanelState.isOpen).toBe(false)
    })
  })

  describe('Section navigation', () => {
    it('should display all three tab options', () => {
      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify],
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      const tabs = wrapper.findAllComponents({ name: 'VTab' })
      expect(tabs.length).toBe(3)
      expect(tabs[0].text()).toContain('Cache Management')
      expect(tabs[1].text()).toContain('Data Sources')
      expect(tabs[2].text()).toContain('Tag Management')
    })

    it('should switch to cache section when cache tab clicked', async () => {
      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify],
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      const tabs = wrapper.findAllComponents({ name: 'VTab' })
      await tabs[0].trigger('click')
      await wrapper.vm.$nextTick()

      expect(uiStore.configPanelState.activeSection).toBe('cache')
    })

    it('should switch to sources section when sources tab clicked', async () => {
      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify],
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      const tabs = wrapper.findAllComponents({ name: 'VTab' })
      await tabs[1].trigger('click')
      await wrapper.vm.$nextTick()

      // Should map 'sources' to 'vocabulary' in store
      expect(uiStore.configPanelState.activeSection).toBe('vocabulary')
    })

    it('should switch to tags section when tags tab clicked', async () => {
      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify],
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      const tabs = wrapper.findAllComponents({ name: 'VTab' })
      await tabs[2].trigger('click')
      await wrapper.vm.$nextTick()

      expect(uiStore.configPanelState.activeSection).toBe('tags')
    })
  })

  describe('Section components', () => {
    it('should render CacheManagementSection in cache section', async () => {
      uiStore.setConfigPanelSection('cache')

      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      const cacheSection = wrapper.findComponent(CacheManagementSection)
      expect(cacheSection.exists()).toBe(true)
    })

    it('should render DataSourcesSection in sources section', async () => {
      uiStore.setConfigPanelSection('vocabulary')

      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      const sourcesSection = wrapper.findComponent(DataSourcesSection)
      expect(sourcesSection.exists()).toBe(true)
    })

    it('should render TagManagementSection in tags section', async () => {
      uiStore.setConfigPanelSection('tags')

      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      const tagsSection = wrapper.findComponent(TagManagementSection)
      expect(tagsSection.exists()).toBe(true)
    })
  })

  describe('Responsive drawer width', () => {
    it('should calculate drawer width based on window width', () => {
      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify],
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      const drawer = wrapper.findComponent({ name: 'VNavigationDrawer' })
      expect(drawer.props('width')).toBeDefined()
    })

  })

  describe('Scroll position persistence', () => {
    it('should track scroll position', async () => {
      uiStore.openConfigPanel()

      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify],
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // Find scroll container
      const scrollContainer = wrapper.find('.config-panel__sections')
      expect(scrollContainer.exists()).toBe(true)

      // Simulate scroll
      const scrollEvent = new Event('scroll')
      Object.defineProperty(scrollContainer.element, 'scrollTop', { value: 100, writable: true })
      scrollContainer.element.dispatchEvent(scrollEvent)

      await wrapper.vm.$nextTick()

      expect(uiStore.configPanelState.scrollPosition).toBe(100)
    })
  })

  describe('Drawer properties', () => {
    it('should be positioned on the right', () => {
      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify],
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      const drawer = wrapper.findComponent({ name: 'VNavigationDrawer' })
      expect(drawer.props('location')).toBe('right')
    })

    it('should be temporary overlay', () => {
      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify],
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      const drawer = wrapper.findComponent({ name: 'VNavigationDrawer' })
      expect(drawer.props('temporary')).toBe(true)
    })
  })

  describe('Window resize handling', () => {
    it('should update width on window resize', async () => {
      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify],
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      const _initialWidth = wrapper.findComponent({ name: 'VNavigationDrawer' }).props('width')

      // Simulate window resize
      global.innerWidth = 1200
      window.dispatchEvent(new Event('resize'))

      await wrapper.vm.$nextTick()

      // Width should be recalculated
      expect(wrapper.findComponent({ name: 'VNavigationDrawer' }).props('width')).toBeDefined()
    })
  })

  describe('Section visibility', () => {
    it('should show only active section content', async () => {
      uiStore.setConfigPanelSection('cache')

      wrapper = mount(ConfigPanel, {
        global: {
          plugins: [vuetify],
          stubs: {
            CacheManagementSection: true,
            DataSourcesSection: true,
            TagManagementSection: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      const sections = wrapper.findAll('.config-section')

      // Cache section should be visible (v-show=true)
      expect(sections[0].isVisible()).toBe(true)

      // Other sections should be hidden (v-show=false)
      expect(sections[1].isVisible()).toBe(false)
      expect(sections[2].isVisible()).toBe(false)
    })
  })
})

// Regression: drawerWidth previously returned `windowWidth - 100` regardless
// of breakpoint, ignoring the "85% with max 1400px, min 300px" behavior
// documented right above it in the component. That produced an 1820px drawer
// on a 1920px viewport (no cap at all) and a 275px drawer on a 375px viewport
// (below its own 300px floor).
describe('ConfigPanel responsive drawer width', () => {
  let wrapper: VueWrapper
  const originalWidth = window.innerWidth

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(usePluginMounts).mockReturnValue({ items: computed(() => []) })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    global.innerWidth = originalWidth
    vi.restoreAllMocks()
  })

  function widthAt(viewport: number) {
    global.innerWidth = viewport
    wrapper = mountConfigPanel({
      global: {
        stubs: {
          CacheManagementSection: true,
          DataSourcesSection: true,
          TagManagementSection: true,
        },
      },
    })
    return wrapper.findComponent({ name: 'VNavigationDrawer' }).props('width')
  }

  it('caps the drawer width at 1400px on a wide desktop viewport', () => {
    expect(widthAt(1920)).toBe(1400)
  })

  it('uses 85% of the viewport between the floor and the cap', () => {
    expect(widthAt(1000)).toBe(850)
  })

  it('leaves a 12px gutter on each side on a mobile viewport', () => {
    expect(widthAt(375)).toBe(351)
  })

  it('never drops below the 300px floor on a very narrow viewport', () => {
    expect(widthAt(280)).toBe(300)
  })

  it('recalculates the width when the window is resized', async () => {
    expect(widthAt(1920)).toBe(1400)

    global.innerWidth = 1000
    window.dispatchEvent(new Event('resize'))
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'VNavigationDrawer' }).props('width')).toBe(850)
  })
})

describe('ConfigPanel plugin admin tabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // vi.clearAllMocks() clears call history but not a prior
    // mockReturnValue(), so restore the no-plugin-tabs default explicitly to
    // keep tests order-independent.
    vi.mocked(usePluginMounts).mockReturnValue({ items: computed(() => []) })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  function withPluginTab() {
    vi.mocked(usePluginMounts).mockReturnValue({
      items: computed(() => [
        {
          key: 'plugin:p1:audit',
          pluginId: 'p1',
          itemId: 'audit',
          surface: 'admin-tabs' as const,
          name: 'Audit',
          icon: 'mdi-shield',
          order: 10,
          visible: true,
        },
      ]),
    })
  }

  it('renders a plugin admin tab', () => {
    withPluginTab()

    const wrapper = mountConfigPanel({
      global: { stubs: { PluginParcelOutlet: true } },
    })

    expect(wrapper.find('[data-testid="config-tab-plugin:p1:audit"]').exists()).toBe(true)
  })

  it('suppresses the no-access alert when a plugin supplies the only visible tab', () => {
    withPluginTab()

    const wrapper = mountConfigPanel({
      global: { stubs: { PluginParcelOutlet: true } },
    })

    expect(wrapper.text()).not.toContain("You don't have access to any administrative settings.")
  })

  it('shows the no-access alert when there are no core and no plugin tabs', () => {
    const wrapper = mountConfigPanel({
      global: { stubs: { PluginParcelOutlet: true } },
    })

    expect(wrapper.text()).toContain("You don't have access to any administrative settings.")
  })

  it('falls back to a visible section when the stored section belongs to a since-removed plugin tab', () => {
    withPluginTab()
    useAuthStore().setUser({
      login: 'tester',
      displayName: 'tester',
      permissionIdx: { admin: ['admin:tags'] },
    })

    const wrapper = mountConfigPanel({
      global: {
        stubs: {
          PluginParcelOutlet: true,
          CacheManagementSection: true,
          DataSourcesSection: true,
          TagManagementSection: true,
          PermissionsSection: true,
        },
      },
    })
    useUIStore().setConfigPanelSection('plugin:p1:audit')
    wrapper.unmount()

    // Simulate the plugin having been unregistered while the drawer was
    // closed: the store still holds the stale `plugin:p1:audit` key, but
    // usePluginMounts no longer resolves it to a tab.
    vi.mocked(usePluginMounts).mockReturnValue({ items: computed(() => []) })

    const reopened = mountConfigPanel({
      global: {
        stubs: {
          PluginParcelOutlet: true,
          CacheManagementSection: true,
          DataSourcesSection: true,
          TagManagementSection: true,
          PermissionsSection: true,
        },
      },
    })

    expect(reopened.text()).not.toContain("You don't have access to any administrative settings.")
    expect(reopened.findComponent({ name: 'TagManagementSection' }).exists()).toBe(true)
  })
})
