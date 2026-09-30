import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import IncidenceRateConceptSetsPanel from '@/components/incidence-rate/IncidenceRateConceptSetsPanel.vue'
import { useIncidenceRateStore } from '@/stores/incidence-rate'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/conceptset/:id', component: { template: '<div />' } }],
})

function mountPanel() {
  return mount(IncidenceRateConceptSetsPanel, {
    global: { plugins: [vuetify, router] },
  })
}

describe('IncidenceRateConceptSetsPanel', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await router.push('/conceptset/1')
    await router.isReady()
  })

  it('shows the empty message when no incidence rate is loaded', () => {
    const wrapper = mountPanel()

    expect(wrapper.text()).toContain('No concept sets to export')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('renders concept sets and links only numeric identifiers', () => {
    const store = useIncidenceRateStore()
    store.createNewIR()
    store.currentIR!.expression.ConceptSets = [
      { id: 12, name: 'Numeric concept set' },
      { id: 'draft', name: 'Unsaved concept set' },
    ] as never

    const wrapper = mountPanel()

    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain('Numeric concept set')
    expect(wrapper.text()).toContain('Unsaved concept set')
    expect(wrapper.find('a[href="/conceptset/12"]').text()).toContain('View')
    expect(wrapper.findAll('a')).toHaveLength(1)
  })
})