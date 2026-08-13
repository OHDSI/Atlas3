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
  sourcesList: Array<Record<string, unknown>> = [],
  stubs: Record<string, unknown> = {}
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
      stubs,
    },
    props: { cohortId: 1, ...props },
  })
}

const tooltipStub = {
  AtlasTooltip: {
    name: 'AtlasTooltip',
    template: '<div class="tt-stub"><slot name="activator" :props="{}" /><slot /></div>',
  },
}

describe('CohortGenerationSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
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

  it('starts collapsed even when jobs exist (dataset list hidden by default)', async () => {
    const wrapper = mountSection(
      { cohortId: 1 },
      [{ id: 1, cohortDefinitionId: 1, sourceKey: 'CCAE', status: 'COMPLETE', personCount: 8420 }],
      [ccae]
    )
    await flushPromises()
    const header = wrapper.find('[data-testid="cs-header"]')
    expect(header.attributes('aria-expanded')).toBe('false')
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
    expect(document.querySelector('[data-testid="cohort-report-drawer"]')).not.toBeNull()
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

describe('CohortGenerationSection — CRITICAL design findings block generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('disables per-source Generate and explains why when a CRITICAL finding exists', async () => {
    const wrapper = mountSection({ cohortId: 1, criticalCount: 1 }, [], [ccae], tooltipStub)
    await flushPromises()
    expect(wrapper.find('[data-testid="run-btn-CCAE"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Design is not valid')
  })

  it('disables Generate all when a CRITICAL finding exists', async () => {
    const wrapper = mountSection({ cohortId: 1, criticalCount: 2 }, [], [ccae, mdcr], tooltipStub)
    await flushPromises()
    expect(wrapper.find('[data-testid="generate-all-btn"]').attributes('disabled')).toBeDefined()
  })

  it('does not call generateCohort for a design with a CRITICAL finding', async () => {
    const wrapper = mountSection({ cohortId: 1, criticalCount: 1 }, [], [ccae], tooltipStub)
    await flushPromises()
    const store = useWebAPIStore()
    const spy = vi.spyOn(store, 'generateCohort').mockResolvedValue(undefined as never)
    await wrapper.find('[data-testid="run-btn-CCAE"]').trigger('click')
    await wrapper.find('[data-testid="generate-all-btn"]').trigger('click')
    await flushPromises()
    expect(spy).not.toHaveBeenCalled()
  })

  it('allows generation when findings are only WARNING or INFO', async () => {
    const wrapper = mountSection({ cohortId: 1, criticalCount: 0 }, [], [ccae], tooltipStub)
    await flushPromises()
    expect(wrapper.find('[data-testid="run-btn-CCAE"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-testid="generate-all-btn"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Design is not valid')
    const store = useWebAPIStore()
    const spy = vi.spyOn(store, 'generateCohort').mockResolvedValue(undefined as never)
    await wrapper.find('[data-testid="run-btn-CCAE"]').trigger('click')
    await flushPromises()
    expect(spy).toHaveBeenCalledWith(1, 'CCAE')
  })
})
