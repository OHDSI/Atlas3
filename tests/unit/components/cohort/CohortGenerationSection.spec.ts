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

const ccae = { sourceId: 1, sourceKey: 'CCAE', sourceName: 'CCAE', sourceDialect: 'postgresql', daimons: [] }
const mdcr = { sourceId: 2, sourceKey: 'MDCR', sourceName: 'MDCR', sourceDialect: 'postgresql', daimons: [] }

function mountSection(
  props: Record<string, unknown>,
  jobs: Array<Record<string, unknown>> = [],
  sourcesList: Array<Record<string, unknown>> = []
) {
  setActivePinia(createPinia())
  const store = useWebAPIStore()
  store.sources = sourcesList as never
  for (const j of jobs) store.addGenerationJob(j as never)
  const router = makeRouter()
  return mount(CohortGenerationSection, {
    global: {
      plugins: [vuetify, router],
      stubs: {
        VNavigationDrawer: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div data-testid="cohort-report-drawer" v-if="modelValue"><slot /></div>',
        },
      },
    },
    props: { cohortId: 1, ...props },
  })
}

describe('CohortGenerationSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "Save cohort to generate" chip when cohortId is null', async () => {
    const wrapper = mountSection({ cohortId: null }, [], [ccae])
    await flushPromises()
    expect(wrapper.text()).toMatch(/Save cohort to generate/)
  })

  it('shows "No generations yet" chip when saved with no jobs', async () => {
    const wrapper = mountSection({ cohortId: 1 }, [], [ccae, mdcr])
    await flushPromises()
    expect(wrapper.text()).toMatch(/No generations yet/)
  })

  it('shows "N / M generated" chip with mixed jobs', async () => {
    const wrapper = mountSection(
      { cohortId: 1 },
      [{ id: 1, cohortDefinitionId: 1, sourceKey: 'CCAE', status: 'COMPLETE', personCount: 8420 }],
      [ccae, mdcr]
    )
    await flushPromises()
    expect(wrapper.text()).toMatch(/1 \/ 2 generated/)
  })

  it('starts collapsed when no jobs exist', async () => {
    const wrapper = mountSection({ cohortId: 1 }, [], [ccae])
    await flushPromises()
    const header = wrapper.find('[data-testid="cs-header"]')
    expect(header.attributes('aria-expanded')).toBe('false')
  })

  it('starts expanded when at least one job exists', async () => {
    const wrapper = mountSection(
      { cohortId: 1 },
      [{ id: 1, cohortDefinitionId: 1, sourceKey: 'CCAE', status: 'COMPLETE', personCount: 8420 }],
      [ccae]
    )
    await flushPromises()
    const header = wrapper.find('[data-testid="cs-header"]')
    expect(header.attributes('aria-expanded')).toBe('true')
  })

  it('opens drawer when row Inclusion-report button is clicked on a complete row', async () => {
    const wrapper = mountSection(
      { cohortId: 1 },
      [{ id: 1, cohortDefinitionId: 1, sourceKey: 'CCAE', status: 'COMPLETE', personCount: 8420 }],
      [ccae]
    )
    await flushPromises()
    const btn = wrapper.find('[data-testid="row-extra-inclusion-CCAE"]')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeUndefined()
    await btn.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="cohort-report-drawer"]').exists()).toBe(true)
  })

  it('disables Inclusion report and Samples buttons for non-complete rows', async () => {
    const wrapper = mountSection(
      { cohortId: 1 },
      [{ id: 1, cohortDefinitionId: 1, sourceKey: 'CCAE', status: 'RUNNING' }],
      [ccae]
    )
    await flushPromises()
    expect(wrapper.find('[data-testid="row-extra-inclusion-CCAE"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="row-extra-samples-CCAE"]').attributes('disabled')).toBeDefined()
  })
})
