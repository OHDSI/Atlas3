/**
 * CharacterizationResultsView component tests
 *
 * Smoke-level: mounts with mocked services and checks that rows render
 * after the initial load. One test wires the threshold slider and
 * verifies it filters rows client-side.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { defineComponent, h } from 'vue'

import CharacterizationResultsView from '@/views/CharacterizationResultsView.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/characterization.service', () => ({
  getCharacterization: vi.fn(),
  getCharacterizationExecution: vi.fn(),
  getCharacterizationResultCount: vi.fn(),
  getCharacterizationResults: vi.fn(),
  explorePrevalence: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  getCharacterization,
  getCharacterizationExecution,
  getCharacterizationResultCount,
  getCharacterizationResults,
} from '@/services/characterization.service'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const Stub = defineComponent({ render: () => h('div') })

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/characterizations', component: Stub },
      { path: '/characterizations/:id', component: Stub },
      {
        path: '/characterizations/:id/results/:executionId',
        component: CharacterizationResultsView,
        props: true,
      },
    ],
  })
}

async function mountView() {
  const router = makeRouter()
  await router.push('/characterizations/42/results/7')
  await router.isReady()
  const wrapper = mount(CharacterizationResultsView, {
    props: { id: '42', executionId: '7' },
    global: { plugins: [vuetify, router] },
    attachTo: document.body,
  })
  return { wrapper, router }
}

describe('CharacterizationResultsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('loads execution + results and renders a prevalence card', async () => {
    vi.mocked(getCharacterization).mockResolvedValue({
      id: 42,
      name: 'Diabetes vs Hypertension',
      cohorts: [
        { id: 1, name: 'Diabetes' },
        { id: 2, name: 'Hypertension' },
      ],
      featureAnalyses: [],
      stratas: [],
    })
    vi.mocked(getCharacterizationExecution).mockResolvedValue({
      id: 7,
      sourceKey: 'CDM_V5',
      status: 'COMPLETED',
      startTime: 1_000,
      endTime: 2_000,
      duration: 1_000,
    })
    vi.mocked(getCharacterizationResultCount).mockResolvedValue(2)
    vi.mocked(getCharacterizationResults).mockResolvedValue([
      {
        analysisId: 100,
        analysisName: 'Race',
        covariateId: 8527,
        covariateName: 'race = White',
        conceptId: 8527,
        cohortId: 1,
        cohortName: 'Diabetes',
        count: 100,
        pct: 50,
      },
      {
        analysisId: 100,
        analysisName: 'Race',
        covariateId: 8527,
        covariateName: 'race = White',
        conceptId: 8527,
        cohortId: 2,
        cohortName: 'Hypertension',
        count: 60,
        pct: 30,
      },
    ])

    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.find('[data-testid="char-results-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="char-results-prevalence-100"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="char-results-error"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('threshold filter hides rows below the threshold', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(null)
    vi.mocked(getCharacterizationExecution).mockResolvedValue({
      id: 7,
      sourceKey: 'CDM_V5',
      status: 'COMPLETED',
    })
    vi.mocked(getCharacterizationResultCount).mockResolvedValue(2)
    vi.mocked(getCharacterizationResults).mockResolvedValue([
      {
        analysisId: 100,
        analysisName: 'Race',
        covariateId: 8527,
        covariateName: 'race = White',
        conceptId: 8527,
        cohortId: 1,
        cohortName: 'Cohort A',
        count: 100,
        pct: 60,
      },
      {
        analysisId: 100,
        analysisName: 'Race',
        covariateId: 8528,
        covariateName: 'race = Black',
        conceptId: 8528,
        cohortId: 1,
        cohortName: 'Cohort A',
        count: 5,
        pct: 1,
      },
    ])

    const { wrapper } = await mountView()
    await flushPromises()

    // Both rows present at threshold = 0.
    expect(wrapper.text()).toContain('race = White')
    expect(wrapper.text()).toContain('race = Black')

    // Bump threshold to 50% — only the 60% row remains.
    const slider = wrapper.findComponent({ name: 'VSlider' })
    expect(slider.exists()).toBe(true)
    slider.vm.$emit('update:modelValue', 50)
    await flushPromises()

    expect(wrapper.text()).toContain('race = White')
    expect(wrapper.text()).not.toContain('race = Black')
    wrapper.unmount()
  })
})
