/**
 * FeatureAnalysesView component tests
 *
 * Smoke-level tests: the view mounts with the store, the table renders rows,
 * the search input updates the filter, and the create button navigates.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

// Mock i18n with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

// Mock service layer (the store calls into this)
vi.mock('@/services/feature-analysis.service', () => ({
  listFeatureAnalyses: vi.fn(),
  getFeatureAnalysis: vi.fn(),
  createFeatureAnalysis: vi.fn(),
  updateFeatureAnalysis: vi.fn(),
  deleteFeatureAnalysis: vi.fn(),
  copyFeatureAnalysis: vi.fn(),
  listFeatureAnalysisDomains: vi.fn(),
  listFeatureAnalysisAggregates: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { listFeatureAnalyses } from '@/services/feature-analysis.service'
import FeatureAnalysesView from '@/views/FeatureAnalysesView.vue'
import { useFeatureAnalysesStore } from '@/stores/feature-analyses'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const sampleList: FeatureAnalysisListItem[] = [
  {
    id: 1,
    name: 'Demographics PRESET',
    type: 'PRESET',
    domain: 'Demographics',
    statType: 'PREVALENCE',
    createdBy: { login: 'admin', name: 'Admin' },
    createdDate: 1737000000000,
    modifiedDate: 1737500000000,
  },
  {
    id: 2,
    name: 'Conditions Criteria',
    type: 'CRITERIA_SET',
    domain: 'Condition',
    statType: 'PREVALENCE',
    createdBy: 'ohdsi',
    createdDate: 1737100000000,
    modifiedDate: 1737200000000,
  },
]

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/analysis/feature-analyses', name: 'feature-analyses', component: { template: '<div />' } },
      { path: '/feature-analyses', redirect: { name: 'feature-analyses' } },
      { path: '/feature-analyses/new', name: 'feature-analysis-new', component: { template: '<div />' } },
      { path: '/feature-analyses/:id', name: 'feature-analysis-edit', component: { template: '<div />' } },
    ],
  })
}

async function mountView() {
  const router = makeRouter()
  await router.push('/feature-analyses')
  await router.isReady()

  // Set up a permitted user so the new permission gate doesn't disable the
  // Create button (the view now requires create:feature-analysis).
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: { create: ['create:feature-analysis'] },
    entityAccess: emptyEntityAccess(),
  })

  const wrapper = mount(FeatureAnalysesView, {
    global: { plugins: [vuetify, pinia, router] },
  })

  await flushPromises()
  return { wrapper, router }
}

describe('FeatureAnalysesView', () => {
  let mounted: { wrapper: ReturnType<typeof mount>; router: Router } | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  it('mounts with the create and search controls', async () => {
    vi.mocked(listFeatureAnalyses).mockResolvedValue([])
    mounted = await mountView()

    expect(mounted.wrapper.find('[data-testid="feature-analyses-create"]').exists()).toBe(true)
    expect(mounted.wrapper.find('[data-testid="feature-analyses-search"]').exists()).toBe(true)
    expect(mounted.wrapper.text()).toContain('Feature analyses')
    expect(mounted.wrapper.text()).toContain('New feature analysis')
  })

  it('renders rows from the store after fetch', async () => {
    vi.mocked(listFeatureAnalyses).mockResolvedValue(sampleList)
    mounted = await mountView()

    expect(mounted.wrapper.text()).toContain('Demographics PRESET')
    expect(mounted.wrapper.text()).toContain('Conditions Criteria')
    expect(mounted.wrapper.text()).toContain('PRESET')
    expect(mounted.wrapper.text()).toContain('CRITERIA_SET')
  })

  it('shows empty state when there are no items', async () => {
    vi.mocked(listFeatureAnalyses).mockResolvedValue([])
    mounted = await mountView()

    // After i18n migration the empty-state label uses generic "No data" (common.noData)
    expect(mounted.wrapper.text()).toContain('No data')
  })

  it('search input drives the store filter (after debounce)', async () => {
    vi.useFakeTimers()
    vi.mocked(listFeatureAnalyses).mockResolvedValue(sampleList)
    mounted = await mountView()

    const store = useFeatureAnalysesStore()
    expect(store.filterTerm).toBe('')

    const searchEl = mounted.wrapper.find('[data-testid="feature-analyses-search"] input')
    await searchEl.setValue('Demographics')

    // Debounce window
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(store.filterTerm).toBe('Demographics')

    vi.useRealTimers()
  })

  it('clicking Create navigates to /feature-analyses/new', async () => {
    vi.mocked(listFeatureAnalyses).mockResolvedValue([])
    mounted = await mountView()
    const { wrapper, router } = mounted

    const createEl = wrapper.get('[data-testid="feature-analyses-create"]').element as HTMLElement
    ;(createEl as HTMLButtonElement).click()
    await flushPromises()
    // Drain microtasks for router.push (which is itself async).
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/feature-analyses/new')
  })
})
