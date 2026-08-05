import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DataSourceSidebar from '@/components/datasources/DataSourceSidebar.vue'
import { usePluginMounts } from '@/composables/usePluginMounts'

const vuetify = createVuetify({ components, directives })

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/composables/usePluginMounts', () => ({
  usePluginMounts: vi.fn(() => ({ items: computed(() => []) })),
}))

function factory() {
  return mount(DataSourceSidebar, {
    props: { modelValue: 'dashboard' },
    global: { plugins: [vuetify] },
  })
}

describe('DataSourceSidebar plugin items', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders a plugin item in a new group when the group label is unknown', () => {
    vi.mocked(usePluginMounts).mockReturnValue({
      items: computed(() => [
        {
          key: 'plugin:p1:my-report',
          pluginId: 'p1',
          itemId: 'my-report',
          surface: 'datasource-sidebar' as const,
          name: 'My Report',
          group: 'Custom',
          icon: 'mdi-chart-box',
          order: 10,
        },
      ]),
    })

    const wrapper = factory()

    expect(wrapper.find('[data-testid="datasource-sidebar-plugin:p1:my-report"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Custom')
  })

  it('merges a plugin item into an existing group, matching the label case-insensitively', () => {
    vi.mocked(usePluginMounts).mockReturnValue({
      items: computed(() => [
        {
          key: 'plugin:p1:extra',
          pluginId: 'p1',
          itemId: 'extra',
          surface: 'datasource-sidebar' as const,
          name: 'Extra',
          group: 'overview',
          order: 10,
        },
      ]),
    })

    const wrapper = factory()

    const groupLabels = wrapper.findAll('.datasource-sidebar__group-label').map(n => n.text())
    expect(groupLabels.filter(l => l.toLowerCase() === 'overview')).toHaveLength(1)
    expect(wrapper.find('[data-testid="datasource-sidebar-plugin:p1:extra"]').exists()).toBe(true)
  })

  it('appends a plugin item with no group to a trailing group', () => {
    vi.mocked(usePluginMounts).mockReturnValue({
      items: computed(() => [
        {
          key: 'plugin:p1:loose',
          pluginId: 'p1',
          itemId: 'loose',
          surface: 'datasource-sidebar' as const,
          name: 'Loose',
          order: 10,
        },
      ]),
    })

    const wrapper = factory()

    expect(wrapper.find('[data-testid="datasource-sidebar-plugin:p1:loose"]').exists()).toBe(true)
  })

  it('places an anchored plugin item after the named core item within its group', () => {
    vi.mocked(usePluginMounts).mockReturnValue({
      items: computed(() => [
        {
          key: 'plugin:p1:after-density',
          pluginId: 'p1',
          itemId: 'after-density',
          surface: 'datasource-sidebar' as const,
          name: 'After Density',
          group: 'Overview',
          insertAfter: 'datadensity',
          order: 10,
        },
      ]),
    })

    const wrapper = factory()

    const values = wrapper
      .findAll('[data-testid^="datasource-sidebar-"]')
      .map(n => n.attributes('data-testid'))
    const density = values.indexOf('datasource-sidebar-datadensity')
    const plugin = values.indexOf('datasource-sidebar-plugin:p1:after-density')
    expect(plugin).toBe(density + 1)
  })
})
