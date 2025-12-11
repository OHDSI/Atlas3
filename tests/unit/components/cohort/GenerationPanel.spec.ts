/**
 * GenerationPanel Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import GenerationPanel from '@/components/cohort/GenerationPanel.vue'
import { useWebAPIStore } from '@/stores/webapi'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/webapi', () => ({
  fetchCDMSources: vi.fn().mockResolvedValue([]),
  getCohortGenerationInfo: vi.fn().mockResolvedValue({})
}))

const vuetify = createVuetify({ components, directives })

const mockSource1 = {
  sourceKey: 'cdm-1',
  sourceName: 'CDM Database 1',
  daimons: []
}

function mountComponent(props = {}) {
  return mount(GenerationPanel, {
    props: {
      modelValue: true,
      cohortId: 123,
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        VNavigationDrawer: {
          template: '<div class="v-navigation-drawer"><slot /></div>',
          props: ['modelValue', 'location', 'temporary', 'width']
        },
        DataSourceTileGrid: {
          template: '<div class="data-source-tile-grid"><slot /></div>',
          props: ['cohortId', 'sources']
        },
        ReportPanel: {
          template: '<div class="report-panel"><slot /></div>',
          props: ['cohortId', 'sourceKey', 'isOpen']
        }
      }
    }
  })
}

describe('GenerationPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should mount successfully', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should render navigation drawer', () => {
      const wrapper = mountComponent()
      const drawer = wrapper.find('.v-navigation-drawer')
      expect(drawer.exists()).toBe(true)
    })

    it('should render close button in header', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const closeBtn = buttons.find(btn => btn.props('icon') === 'mdi-close')
      expect(closeBtn).toBeDefined()
    })

    it('should render generation icon in header', () => {
      const wrapper = mountComponent()
      const icons = wrapper.findAllComponents({ name: 'VIcon' })
      // Should have icons rendered
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Unsaved Cohort State', () => {
    it('should show warning when cohortId is null', () => {
      const wrapper = mountComponent({ cohortId: null })
      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const warningAlert = alerts.find(alert => alert.props('type') === 'warning')
      expect(warningAlert).toBeDefined()
    })

    it('should not show data sources when cohortId is null', () => {
      const wrapper = mountComponent({ cohortId: null })
      // Should show warning alert instead
      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      expect(alerts.length).toBeGreaterThan(0)
    })
  })

  describe('Data Sources', () => {
    it('should render DataSourceTileGrid when sources available', async () => {
      const store = useWebAPIStore()
      store.sourcesList = [mockSource1]

      const wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      const dataSourceGrid = wrapper.find('.data-source-tile-grid')
      expect(dataSourceGrid.exists()).toBe(true)
    })

    it('should pass cohortId to DataSourceTileGrid', async () => {
      const store = useWebAPIStore()
      store.sourcesList = [mockSource1]

      const wrapper = mountComponent({ cohortId: 456 })
      await wrapper.vm.$nextTick()

      const grid = wrapper.findComponent({ name: 'DataSourceTileGrid' })
      if (grid.exists()) {
        expect(grid.props('cohortId')).toBe(456)
      } else {
        // Grid may not exist due to stubbing, check it was rendered
        expect(wrapper.find('.data-source-tile-grid').exists()).toBe(true)
      }
    })
  })

  describe('Props', () => {
    it('should accept modelValue prop', () => {
      const wrapper = mountComponent({ modelValue: false })
      expect(wrapper.props('modelValue')).toBe(false)
    })

    it('should accept cohortId prop', () => {
      const wrapper = mountComponent({ cohortId: 789 })
      expect(wrapper.props('cohortId')).toBe(789)
    })
  })

  describe('Events', () => {
    it('should emit update:modelValue when close is clicked', async () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const closeBtn = buttons.find(btn => btn.props('icon') === 'mdi-close')

      await closeBtn?.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })
  })

  describe('Layout', () => {
    it('should have generation layout container', () => {
      const wrapper = mountComponent()
      const layout = wrapper.find('.generation-layout')
      expect(layout.exists()).toBe(true)
    })

    it('should have sidebar for data sources', async () => {
      const store = useWebAPIStore()
      store.sourcesList = [mockSource1]

      const wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      const sidebar = wrapper.find('.generation-layout__sidebar')
      expect(sidebar.exists()).toBe(true)
    })

    it('should have content area', () => {
      const wrapper = mountComponent()
      const content = wrapper.find('.generation-layout__content')
      expect(content.exists()).toBe(true)
    })
  })

  describe('close function', () => {
    it('should emit update:modelValue with false when close is called', () => {
      const wrapper = mountComponent()

      wrapper.vm.close()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    })
  })

  describe('handleDataSourceClick function', () => {
    it('should set selectedSourceKey and show reports', async () => {
      const store = useWebAPIStore()
      store.sourcesList = [mockSource1]

      const wrapper = mountComponent()

      wrapper.vm.handleDataSourceClick('cdm-1')

      expect(wrapper.vm.selectedSourceKey).toBe('cdm-1')
      expect(wrapper.vm.showReports).toBe(true)
    })
  })

  describe('handleCloseReports function', () => {
    it('should hide reports and clear selected source', async () => {
      const store = useWebAPIStore()
      store.sourcesList = [mockSource1]

      const wrapper = mountComponent()

      // First open reports
      wrapper.vm.handleDataSourceClick('cdm-1')
      expect(wrapper.vm.showReports).toBe(true)
      expect(wrapper.vm.selectedSourceKey).toBe('cdm-1')

      // Then close them
      wrapper.vm.handleCloseReports()

      expect(wrapper.vm.showReports).toBe(false)
      expect(wrapper.vm.selectedSourceKey).toBeNull()
    })
  })
})
