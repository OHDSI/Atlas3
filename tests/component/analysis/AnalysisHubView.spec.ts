/**
 * AnalysisHubView component tests
 *
 * Verifies that the hub renders a tab strip, the active tab tracks the
 * current route, and the active tab name is persisted to localStorage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router'
import { defineComponent, h } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

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
          { path: 'characterizations', name: 'characterizations', component: childStub('chr') },
          { path: 'feature-analyses', name: 'feature-analyses', component: childStub('fa') },
          { path: 'pathways', name: 'pathways', component: childStub('pw') },
          { path: 'incidence-rates', name: 'incidence-rates', component: childStub('ir') },
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
})
