/* eslint-disable vue/require-default-prop */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import { mount, flushPromises } from '@vue/test-utils'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { tr } from '../../helpers/i18n-mock'

const routerPush = vi.fn()
const routeParams = { executionId: '123' }
const pathwayResultsMocks = {
  execution: ref<{ id: number; sourceKey: string } | null>(null),
  design: ref<any>(null),
  results: ref<any>(null),
  loading: ref(false),
  error: ref<string | null>(null),
  load: vi.fn(),
}

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: routeParams }),
  useRouter: () => ({ push: routerPush }),
}))

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/composables/usePathwayResults', () => ({
  usePathwayResults: () => pathwayResultsMocks,
}))

const AnalysisBuilderShellStub = defineComponent({
  name: 'AnalysisBuilderShell',
  emits: ['back'],
  template: '<div><button data-testid="pathway-results-back" @click="$emit(\'back\')">back</button><slot name="actions" /><slot /></div>',
})

const PathwayCohortResultsStub = defineComponent({
  name: 'PathwayCohortResults',
  props: {
    design: { type: Object, required: false },
    results: { type: Object, required: false },
    group: { type: Object, required: false },
    targetCohortId: { type: Number, required: false },
    cohortName: { type: String, required: false },
    colors: { type: Function, required: false },
  },
  template: '<div data-testid="pathway-cohort-results" :data-cohort-name="cohortName" />',
})
const PathwayTableViewStub = defineComponent({
  name: 'PathwayTableView',
  props: {
    design: { type: Object, required: false },
    results: { type: Object, required: false },
    targetCohortId: { type: Number, required: false },
  },
  template: '<div data-testid="pathway-table-view" />',
})

const vuetify = createVuetify({ components, directives })

async function mountView() {
  const { default: PathwayResultsView } = await import('@/views/PathwayResultsView.vue')
  return mount(PathwayResultsView, {
    global: {
      plugins: [vuetify, createPinia()],
      stubs: {
        AnalysisBuilderShell: AnalysisBuilderShellStub,
        PathwayCohortResults: PathwayCohortResultsStub,
        PathwayTableView: PathwayTableViewStub,
      },
    },
  })
}

describe('PathwayResultsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    routerPush.mockReset()
    routeParams.executionId = '123'
    pathwayResultsMocks.execution.value = null
    pathwayResultsMocks.design.value = null
    pathwayResultsMocks.results.value = null
    pathwayResultsMocks.loading.value = false
    pathwayResultsMocks.error.value = null
    pathwayResultsMocks.load.mockReset()
  })

  it('loads the execution id from the route and renders the loading state', async () => {
    pathwayResultsMocks.loading.value = true

    const wrapper = await mountView()
    await flushPromises()

    expect(pathwayResultsMocks.load).toHaveBeenCalledWith(123)
    expect(wrapper.find('.pathway-results__state').text()).toBe(tr('pathway.results.loading'))
  })

  it('renders one labelled results row per target cohort in visual mode', async () => {
    pathwayResultsMocks.execution.value = { id: 99, sourceKey: 'source-a' }
    pathwayResultsMocks.design.value = {
      id: 42,
      name: 'My pathway',
      targetCohorts: [
        { id: 1, name: 'Target A' },
        { id: 2, name: 'Target B' },
        { id: 3, name: 'Target with no data' },
      ],
      eventCohorts: [{ code: 0 }, { code: 1 }],
    }
    pathwayResultsMocks.results.value = {
      eventCodes: [{ code: 1, isCombo: false }, { code: 2, isCombo: false }],
      pathwayGroups: [
        { targetCohortId: 1, targetCohortCount: 10, totalPathwaysCount: 20 },
        { targetCohortId: 2, targetCohortCount: 5, totalPathwaysCount: 8 },
      ],
    }

    const wrapper = await mountView()
    await flushPromises()

    expect(pathwayResultsMocks.load).toHaveBeenCalledWith(123)
    expect(wrapper.attributes('title')).toBe('My pathway')
    expect(wrapper.attributes('subtitle')).toBe('Execution Id #99 · source-a')

    const rows = wrapper.findAll('[data-testid="pathway-cohort-results"]')
    expect(rows.map(r => r.attributes('data-cohort-name'))).toEqual([
      'Target A',
      'Target B',
      'Target with no data',
    ])
  })

  it('switches to tabular results and assigns colors from result event codes', async () => {
    pathwayResultsMocks.design.value = {
      id: 42,
      name: 'My pathway',
      targetCohorts: [{ id: 1, name: 'Target A' }],
      eventCohorts: [],
    }
    pathwayResultsMocks.results.value = {
      eventCodes: [
        { code: 2, isCombo: false },
        { code: 1, isCombo: false },
        { code: 3, isCombo: true },
      ],
      pathwayGroups: [{ targetCohortId: 1, targetCohortCount: 10, totalPathwaysCount: 8 }],
    }

    const wrapper = await mountView()
    const colors = wrapper.getComponent(PathwayCohortResultsStub).props('colors') as (key: string) => string
    expect(colors('1')).toBe('#1f77b4')
    expect(colors('2')).toBe('#ff7f0e')
    expect(colors('3')).toBe('#ccc')

    await wrapper.get('button[value="tabular"]').trigger('click')
    expect(wrapper.find('[data-testid="pathway-table-view"]').exists()).toBe(true)
  })

  it('uses configured event cohorts for colors when event codes are absent', async () => {
    pathwayResultsMocks.design.value = {
      name: '  ',
      targetCohorts: [{ id: 1, name: 'Target A' }],
      eventCohorts: [{ code: 1 }, { code: 2 }],
    }
    pathwayResultsMocks.results.value = {
      eventCodes: [],
      pathwayGroups: [{ targetCohortId: 1, targetCohortCount: 10, totalPathwaysCount: 8 }],
    }

    const wrapper = await mountView()

    expect(wrapper.attributes('title')).toBe(tr('pathway.results.title'))
    expect(wrapper.attributes('subtitle')).toBeUndefined()
    const colors = wrapper.getComponent(PathwayCohortResultsStub).props('colors') as (key: string) => string
    expect(colors('2')).toBe('#1f77b4')
    expect(colors('4')).toBe('#ff7f0e')
    expect(colors('missing')).toBe('#ccc')
  })

  it('does not load an invalid route execution id', async () => {
    routeParams.executionId = 'not-a-number'

    await mountView()
    await flushPromises()

    expect(pathwayResultsMocks.load).not.toHaveBeenCalled()
  })

  it('navigates back to the pathway design when a design id exists', async () => {
    pathwayResultsMocks.design.value = { id: 42 }

    const wrapper = await mountView()
    await flushPromises()

    await wrapper.get('[data-testid="pathway-results-back"]').trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/pathways/42')
  })

  it('navigates back to the pathway list when no design id exists', async () => {
    pathwayResultsMocks.execution.value = { id: 7, sourceKey: 'source-c' }
    pathwayResultsMocks.design.value = null
    pathwayResultsMocks.results.value = null

    const wrapper = await mountView()
    await flushPromises()

    await wrapper.get('[data-testid="pathway-results-back"]').trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/analysis/pathways')
  })
})