/* eslint-disable vue/require-default-prop */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import { mount, flushPromises } from '@vue/test-utils'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const routerPush = vi.fn()
const pathwayResultsMocks = {
  execution: ref<{ id: number; sourceKey: string } | null>(null),
  design: ref<any>(null),
  results: ref<any>(null),
  loading: ref(false),
  error: ref<string | null>(null),
  load: vi.fn(),
}

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { executionId: '123' } }),
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

const PathwaySunburstStub = defineComponent({
  name: 'PathwaySunburst',
  emits: ['pathway:select'],
  template: '<button data-testid="pathway-sunburst-select" @click="$emit(\'pathway:select\', { code: 9, nodeName: \'Node\', value: 2 })">select</button>',
})

const PathwayLegendStub = defineComponent({
  name: 'PathwayLegend',
  props: {
    design: { type: Object, required: false },
    colors: { type: Array, required: false },
    eventCodes: { type: Array, required: false },
    targetCohortName: { type: String, required: false },
    targetCohortCount: { type: Number, required: false },
    totalPathwaysCount: { type: Number, required: false },
  },
  template: '<div data-testid="pathway-legend" />',
})

const PathwayPathDetailsStub = defineComponent({
  name: 'PathwayPathDetails',
  props: {
    steps: { type: Array, required: false },
    eventCodes: { type: Array, required: false },
    colors: { type: Array, required: false },
  },
  template: '<div data-testid="pathway-path-details" />',
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
        PathwaySunburst: PathwaySunburstStub,
        PathwayLegend: PathwayLegendStub,
        PathwayPathDetails: PathwayPathDetailsStub,
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
    expect(wrapper.find('.pathway-results__state').text()).toBe('Loading')
  })

  it('renders the visual mode and path details after selecting a pathway', async () => {
    pathwayResultsMocks.execution.value = { id: 99, sourceKey: 'source-a' }
    pathwayResultsMocks.design.value = {
      id: 42,
      name: 'My pathway',
      targetCohorts: [{ id: 1, name: 'Target cohort' }],
      eventCohorts: [{ code: 0 }, { code: 1 }],
    }
    pathwayResultsMocks.results.value = {
      eventCodes: [{ code: 1, isCombo: false }, { code: 2, isCombo: false }],
      pathwayGroups: [{ targetCohortId: 1, targetCohortCount: 10, totalPathwaysCount: 20 }],
    }

    const wrapper = await mountView()
    await flushPromises()

    expect(pathwayResultsMocks.load).toHaveBeenCalledWith(123)
    expect(wrapper.attributes('title')).toBe('My pathway')
    expect(wrapper.attributes('subtitle')).toBe('Execution Id #99 · source-a')

    expect(wrapper.find('[data-testid="pathway-legend"]').exists()).toBe(true)

    expect(wrapper.find('[data-testid="pathway-path-details"]').exists()).toBe(false)
    await wrapper.get('[data-testid="pathway-sunburst-select"]').trigger('click')
    expect(wrapper.find('[data-testid="pathway-path-details"]').exists()).toBe(true)
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