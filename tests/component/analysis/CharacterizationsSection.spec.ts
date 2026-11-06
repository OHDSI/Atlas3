import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { defineComponent, h } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/plugins/navigation/PluginRoutes', () => ({
  generatePluginRoutes: () => [],
}))
vi.mock('@/views/CharacterizationsView.vue', () => ({
  default: { name: 'CharacterizationsViewStub', render: () => h('div', { 'data-testid': 'stub-characterizations-view' }) },
}))
vi.mock('@/views/FeatureAnalysesView.vue', () => ({
  default: { name: 'FeatureAnalysesViewStub', render: () => h('div', { 'data-testid': 'stub-feature-analyses-view' }) },
}))

import CharacterizationsSection from '@/components/analysis/CharacterizationsSection.vue'
import { routes } from '@/router/routes'

const stub = defineComponent({ render: () => h('div') })

function stubRoutes(rs: RouteRecordRaw[]): RouteRecordRaw[] {
  return rs.map((r) => {
    const next: RouteRecordRaw = { ...r }
    if ('component' in next && next.component) next.component = stub
    if (next.children) next.children = stubRoutes(next.children)
    return next
  })
}

async function mountAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: stubRoutes(routes) })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(CharacterizationsSection, {
    global: {
      plugins: [router, createVuetify({ components, directives })],
    },
  })
  return { wrapper, router }
}

describe('CharacterizationsSection', () => {
  it('shows the characterizations list on /analysis/characterizations', async () => {
    const { wrapper } = await mountAt('/analysis/characterizations')
    expect(wrapper.find('[data-testid="stub-characterizations-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stub-feature-analyses-view"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="cc-subview-characterizations"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="cc-subview-feature-analyses"]').attributes('aria-pressed')).toBe('false')
    expect(wrapper.text()).toContain('Compare cohorts on shared feature analyses.')
  })

  it('shows the feature analyses library on /analysis/characterizations/feature-analyses', async () => {
    const { wrapper } = await mountAt('/analysis/characterizations/feature-analyses')
    expect(wrapper.find('[data-testid="stub-feature-analyses-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stub-characterizations-view"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="cc-subview-feature-analyses"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Reusable feature definitions you add to a characterization design.')
  })

  it('navigates to the feature-analyses route when the switch is clicked', async () => {
    const { wrapper, router } = await mountAt('/analysis/characterizations')
    await wrapper.get('[data-testid="cc-subview-feature-analyses"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('feature-analyses')
  })

  it('navigates back to the characterizations route', async () => {
    const { wrapper, router } = await mountAt('/analysis/characterizations/feature-analyses')
    await wrapper.get('[data-testid="cc-subview-characterizations"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('characterizations')
  })
})
