/**
 * AnalysisHubView component tests
 *
 * Verifies that the hub renders a tab strip, the active tab tracks the
 * current route, and the active tab name is persisted to localStorage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router'
import { defineComponent, h, computed } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { usePluginMounts } from '@/composables/usePluginMounts'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/plugins/index', () => ({
  whenPluginFrameworkReady: () => Promise.resolve(),
}))

vi.mock('@/composables/usePluginMounts', () => ({
  usePluginMounts: vi.fn(() => ({ items: computed(() => []) })),
}))

// AnalysisHubView statically imports the four sub-views, which pull in
// Pinia stores. The hub itself doesn't touch a store, so we stub the
// children to keep this spec hermetic — without these stubs each test
// file would need its own Pinia instance.
vi.mock('@/views/CharacterizationsView.vue', () => ({
  default: { name: 'CharacterizationsViewStub', render: () => h('div', { class: 'child-chr' }, 'chr') },
}))
vi.mock('@/views/FeatureAnalysesView.vue', () => ({
  default: { name: 'FeatureAnalysesViewStub', render: () => h('div', { class: 'child-fa' }, 'fa') },
}))
vi.mock('@/views/PathwaysView.vue', () => ({
  default: { name: 'PathwaysViewStub', render: () => h('div', { class: 'child-pw' }, 'pw') },
}))
vi.mock('@/views/IncidenceRatesView.vue', () => ({
  default: { name: 'IncidenceRatesViewStub', render: () => h('div', { class: 'child-ir' }, 'ir') },
}))

import AnalysisHubView from '@/views/AnalysisHubView.vue'

const childStub = (label: string) => defineComponent({ render: () => h('div', { class: `child-${label}` }, label) })

const RootHost = defineComponent({
  render: () => h(RouterView),
})

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/analysis',
        component: AnalysisHubView,
        children: [
          { path: '', name: 'analysis-home', component: childStub('home') },
          { path: 'characterizations', name: 'characterizations', component: childStub('chr') },
          { path: 'feature-analyses', name: 'feature-analyses', component: childStub('fa') },
          { path: 'pathways', name: 'pathways', component: childStub('pw') },
          { path: 'incidence-rates', name: 'incidence-rates', component: childStub('ir') },
          { path: 'x/:pluginId/:itemId', name: 'analysis-plugin', component: AnalysisHubView },
        ],
      },
    ],
  })
}

describe('AnalysisHubView', () => {
  let vuetify: ReturnType<typeof createVuetify>

  beforeEach(() => {
    vuetify = createVuetify({ components, directives })
    localStorage.clear()
  })

  function factory(router: Router) {
    return mount(RootHost, {
      global: {
        plugins: [router, vuetify],
        stubs: {
          PluginParcelOutlet: { template: '<div data-testid="analysis-plugin-outlet" />' },
        },
      },
    })
  }

  it('renders four tabs with the expected labels', async () => {
    const router = makeRouter()
    await router.push('/analysis/characterizations')
    await router.isReady()

    const wrapper = mount(RootHost, {
      global: { plugins: [router, vuetify] },
    })
    await flushPromises()

    const tabs = wrapper.findAll('.v-tab')
    expect(tabs).toHaveLength(4)

    const labels = tabs.map(t => t.text())
    expect(labels.some(l => l.includes('Characterizations'))).toBe(true)
    expect(labels.some(l => l.includes('Feature Analyses'))).toBe(true)
    expect(labels.some(l => l.includes('Pathways'))).toBe(true)
    expect(labels.some(l => l.includes('Incidence Rates'))).toBe(true)
  })

  it('marks the tab matching the current route as active', async () => {
    const router = makeRouter()
    await router.push('/analysis/pathways')
    await router.isReady()

    const wrapper = mount(RootHost, {
      global: { plugins: [router, vuetify] },
    })
    await flushPromises()

    const active = wrapper.find('.v-tab--selected')
    expect(active.exists()).toBe(true)
    expect(active.text()).toContain('Pathways')
  })

  it('persists the active tab name to localStorage on route change', async () => {
    const router = makeRouter()
    await router.push('/analysis/characterizations')
    await router.isReady()

    mount(RootHost, { global: { plugins: [router, vuetify] } })
    await flushPromises()
    expect(localStorage.getItem('atlas3.analysis.lastTab')).toBe('characterizations')

    await router.push('/analysis/incidence-rates')
    await flushPromises()
    expect(localStorage.getItem('atlas3.analysis.lastTab')).toBe('incidence-rates')
  })

  it('renders a plugin tab and mounts its outlet when active', async () => {
    vi.mocked(usePluginMounts).mockReturnValue({
      items: computed(() => [
        {
          key: 'plugin:p1:my-tab',
          pluginId: 'p1',
          itemId: 'my-tab',
          surface: 'analysis-tabs' as const,
          name: 'My Tab',
          icon: 'mdi-puzzle-outline',
          order: 10,
          visible: true,
        },
      ]),
    })

    const router = makeRouter()
    await router.push({ name: 'analysis-plugin', params: { pluginId: 'p1', itemId: 'my-tab' } })
    await router.isReady()
    const wrapper = factory(router)
    await flushPromises()

    expect(wrapper.text()).toContain('My Tab')
    expect(wrapper.find('[data-testid="analysis-plugin-outlet"]').exists()).toBe(true)
  })

  it('shows a plugin tab label and hint as literals, not translations', async () => {
    // 'common.cancel' and 'common.close' are real i18n keys whose translated
    // values ('Cancel', 'Close') differ from the raw key text. If the
    // plugin-literal bypass in getLabel/activeTabHint were ever removed,
    // these would render as 'Cancel'/'Close' instead of the raw name/hint.
    vi.mocked(usePluginMounts).mockReturnValue({
      items: computed(() => [
        {
          key: 'plugin:p3:literal-tab',
          pluginId: 'p3',
          itemId: 'literal-tab',
          surface: 'analysis-tabs' as const,
          name: 'common.cancel',
          hint: 'common.close',
          icon: 'mdi-puzzle-outline',
          order: 10,
          visible: true,
        },
      ]),
    })

    const router = makeRouter()
    await router.push({ name: 'analysis-plugin', params: { pluginId: 'p3', itemId: 'literal-tab' } })
    await router.isReady()
    const wrapper = factory(router)
    await flushPromises()

    expect(wrapper.text()).toContain('common.cancel')
    expect(wrapper.text()).not.toContain('Cancel')
    expect(wrapper.text()).toContain('common.close')
    expect(wrapper.text()).not.toContain('Close')
  })

  it('falls back to feature-analyses when the URL names a plugin tab that is not registered', async () => {
    vi.mocked(usePluginMounts).mockReturnValue({ items: computed(() => []) })

    const router = makeRouter()
    await router.push({ name: 'analysis-plugin', params: { pluginId: 'ghost', itemId: 'gone' } })
    await router.isReady()
    const wrapper = factory(router)
    await flushPromises()

    const active = wrapper.find('.v-tab--selected')
    expect(active.exists()).toBe(true)
    expect(active.text()).toContain('Feature Analyses')
    expect(wrapper.find('.child-fa').exists()).toBe(true)
  })

  describe('plugin tab placement and default tab (#426)', () => {
    const pluginTab = (extra: Record<string, unknown> = {}) => ({
      key: 'plugin:hello-tab:hello-analysis',
      pluginId: 'hello-tab',
      itemId: 'hello-analysis',
      surface: 'analysis-tabs' as const,
      name: 'Plugin Tab',
      icon: 'mdi-puzzle',
      order: 1,
      visible: true,
      ...extra,
    })

    function withPluginTab(extra: Record<string, unknown> = {}) {
      vi.mocked(usePluginMounts).mockReturnValue({ items: computed(() => [pluginTab(extra)]) })
    }

    async function openBareAnalysis() {
      const router = makeRouter()
      await router.push('/analysis')
      await router.isReady()
      const wrapper = factory(router)
      await flushPromises()
      return { router, wrapper }
    }

    it('places a plugin tab with insertBefore before that core tab', async () => {
      withPluginTab({ insertBefore: 'feature-analyses' })
      const { wrapper } = await openBareAnalysis()

      const labels = wrapper.findAll('.v-tab').map(t => t.text())
      expect(labels[0]).toContain('Plugin Tab')
      expect(labels[1]).toContain('Feature Analyses')
    })

    it('places a plugin tab with insertAfter after that core tab', async () => {
      withPluginTab({ insertAfter: 'characterizations' })
      const { wrapper } = await openBareAnalysis()

      const labels = wrapper.findAll('.v-tab').map(t => t.text())
      expect(labels[1]).toContain('Characterizations')
      expect(labels[2]).toContain('Plugin Tab')
    })

    it('opens the first tab on a first visit, also when it is a plugin tab', async () => {
      withPluginTab({ insertBefore: 'feature-analyses' })
      const { router, wrapper } = await openBareAnalysis()

      expect(router.currentRoute.value.fullPath).toBe('/analysis/x/hello-tab/hello-analysis')
      expect(wrapper.find('.v-tab--selected').text()).toContain('Plugin Tab')
      expect(localStorage.getItem('atlas3.analysis.lastTab')).toBe('plugin:hello-tab:hello-analysis')
    })

    it('restores the last-used plugin tab', async () => {
      withPluginTab()
      localStorage.setItem('atlas3.analysis.lastTab', 'plugin:hello-tab:hello-analysis')
      const { router } = await openBareAnalysis()

      expect(router.currentRoute.value.fullPath).toBe('/analysis/x/hello-tab/hello-analysis')
    })

    it('restores the last-used core tab', async () => {
      withPluginTab({ insertBefore: 'feature-analyses' })
      localStorage.setItem('atlas3.analysis.lastTab', 'pathways')
      const { router } = await openBareAnalysis()

      expect(router.currentRoute.value.name).toBe('pathways')
    })

    it('falls back to the first tab when the stored plugin tab is no longer registered', async () => {
      vi.mocked(usePluginMounts).mockReturnValue({ items: computed(() => []) })
      localStorage.setItem('atlas3.analysis.lastTab', 'plugin:gone:tab')
      const { router } = await openBareAnalysis()

      expect(router.currentRoute.value.name).toBe('feature-analyses')
    })

    it('keeps Feature Analyses as the default without plugin tabs', async () => {
      vi.mocked(usePluginMounts).mockReturnValue({ items: computed(() => []) })
      const { router } = await openBareAnalysis()

      expect(router.currentRoute.value.name).toBe('feature-analyses')
    })

    it('does not overwrite the saved tab while a plugin tab is not registered yet', async () => {
      vi.mocked(usePluginMounts).mockReturnValue({ items: computed(() => []) })
      localStorage.setItem('atlas3.analysis.lastTab', 'plugin:hello-tab:hello-analysis')

      const router = makeRouter()
      await router.push({ name: 'analysis-plugin', params: { pluginId: 'hello-tab', itemId: 'hello-analysis' } })
      await router.isReady()
      factory(router)
      await flushPromises()

      expect(localStorage.getItem('atlas3.analysis.lastTab')).toBe('plugin:hello-tab:hello-analysis')
    })
  })
})
