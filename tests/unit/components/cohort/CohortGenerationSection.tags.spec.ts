import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import CohortGenerationSection from '@/components/cohort/CohortGenerationSection.vue'
import { useWebAPIStore } from '@/stores/webapi'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/composables/useEntityAccess', () => ({
  useSourceAccess: () => ({
    canRead: computed(() => true),
    canWrite: computed(() => true),
  }),
  useSourceAccessFor: () => ({
    canRead: () => true,
    canWrite: () => true,
  }),
}))

vi.mock('@/components/reports/inclusion/InclusionRuleReport.vue', () => ({
  default: { name: 'InclusionRuleReport', template: '<div />' },
}))
vi.mock('@/components/cohort-samples/CohortSamplesPanel.vue', () => ({
  default: { name: 'CohortSamplesPanel', template: '<div />' },
}))

const vuetify = createVuetify({ components, directives })

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
}

const s1 = { sourceId: 1, sourceKey: 'S1', sourceName: 'Source 1', sourceDialect: 'postgresql', daimons: [] }
const s2 = { sourceId: 2, sourceKey: 'S2', sourceName: 'Source 2', sourceDialect: 'postgresql', daimons: [] }

function mountSection(
  jobs: Array<Record<string, unknown>> = [],
  sourcesList: Array<Record<string, unknown>> = []
) {
  setActivePinia(createPinia())
  const store = useWebAPIStore()
  store.sources = sourcesList as never
  for (const j of jobs) store.addGenerationJob(j as never)
  vi.spyOn(store, 'fetchSources').mockResolvedValue(undefined)
  vi.spyOn(store, 'fetchCohortGenerationInfo').mockResolvedValue(undefined)
  const router = makeRouter()
  return mount(CohortGenerationSection, {
    attachTo: document.body,
    global: {
      plugins: [vuetify, router],
    },
    props: { cohortId: 1 },
  })
}

describe('CohortGenerationSection dataset visibility (task-9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('collapses the dataset list by default even when jobs exist', async () => {
    const wrapper = mountSection(
      [{ id: 1, cohortDefinitionId: 1, sourceKey: 'S1', status: 'COMPLETE', personCount: 100 }],
      [s1, s2]
    )
    await flushPromises()
    const header = wrapper.find('[data-testid="cs-header"]')
    expect(header.attributes('aria-expanded')).toBe('false')
  })

  it('only-generated toggle filters to sources with a COMPLETE job', async () => {
    const wrapper = mountSection(
      [{ id: 1, cohortDefinitionId: 1, sourceKey: 'S1', status: 'COMPLETE', personCount: 100 }],
      [s1, s2]
    )
    await flushPromises()
    const vm = wrapper.vm as unknown as {
      onlyGenerated: boolean
      visibleRunTableSources: { sourceKey: string }[]
    }
    // Before toggling: both sources visible
    expect(vm.visibleRunTableSources.map(s => s.sourceKey)).toEqual(['S1', 'S2'])
    // After toggling: only S1 (COMPLETE job)
    vm.onlyGenerated = true
    await wrapper.vm.$nextTick()
    expect(vm.visibleRunTableSources.map(s => s.sourceKey)).toEqual(['S1'])
  })
})
