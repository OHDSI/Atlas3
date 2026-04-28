/**
 * CharacterizationsView component tests
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

import type { CharacterizationListItem } from '@/models/characterization.types'

// Mock i18n with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

// Mock service layer (the store calls into this)
vi.mock('@/services/characterization.service', () => ({
  listCharacterizations: vi.fn(),
  getCharacterization: vi.fn(),
  createCharacterization: vi.fn(),
  updateCharacterization: vi.fn(),
  deleteCharacterization: vi.fn(),
  copyCharacterization: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { listCharacterizations } from '@/services/characterization.service'
import CharacterizationsView from '@/views/CharacterizationsView.vue'
import { useCharacterizationStore } from '@/stores/characterization'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const sampleList: CharacterizationListItem[] = [
  {
    id: 1,
    name: 'Diabetes Cohort Profile',
    description: 'Demographics + comorbidities',
    cohorts: [{ id: 11, name: 'Diabetes' }],
    featureAnalyses: [{ id: 21 }, { id: 22 }],
    createdBy: { login: 'admin', name: 'Admin' },
    createdDate: 1737000000000,
    modifiedDate: 1737500000000,
  },
  {
    id: 2,
    name: 'Hypertension Profile',
    cohorts: [{ id: 12, name: 'HTN' }],
    featureAnalyses: [{ id: 21 }],
    createdBy: 'ohdsi',
    createdDate: 1737100000000,
    modifiedDate: 1737200000000,
  },
]

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/analysis/characterizations', name: 'characterizations', component: { template: '<div />' } },
      { path: '/characterizations', redirect: { name: 'characterizations' } },
      { path: '/characterizations/new', name: 'characterization-new', component: { template: '<div />' } },
      { path: '/characterizations/:id', name: 'characterization-edit', component: { template: '<div />' } },
    ],
  })
}

async function mountView() {
  const router = makeRouter()
  await router.push('/characterizations')
  await router.isReady()

  const wrapper = mount(CharacterizationsView, {
    global: { plugins: [vuetify, createPinia(), router] },
  })

  await flushPromises()
  return { wrapper, router }
}

describe('CharacterizationsView', () => {
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
    vi.mocked(listCharacterizations).mockResolvedValue([])
    mounted = await mountView()

    expect(mounted.wrapper.find('[data-testid="characterizations-create"]').exists()).toBe(true)
    expect(mounted.wrapper.find('[data-testid="characterizations-search"]').exists()).toBe(true)
    // After i18n migration, the create button label collapsed to "New" (common.new)
    expect(mounted.wrapper.text()).toContain('New')
  })

  it('renders rows from the store after fetch', async () => {
    vi.mocked(listCharacterizations).mockResolvedValue(sampleList)
    mounted = await mountView()

    expect(mounted.wrapper.text()).toContain('Diabetes Cohort Profile')
    expect(mounted.wrapper.text()).toContain('Hypertension Profile')
  })

  it('shows empty state when there are no items', async () => {
    vi.mocked(listCharacterizations).mockResolvedValue([])
    mounted = await mountView()

    // After i18n migration, the empty-state label uses the generic "No data" string
    expect(mounted.wrapper.text()).toContain('No data')
  })

  it('search input drives the store filter (after debounce)', async () => {
    vi.useFakeTimers()
    vi.mocked(listCharacterizations).mockResolvedValue(sampleList)
    mounted = await mountView()

    const store = useCharacterizationStore()
    expect(store.filterTerm).toBe('')

    const searchEl = mounted.wrapper.find('[data-testid="characterizations-search"] input')
    await searchEl.setValue('Diabetes')

    // Debounce window
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(store.filterTerm).toBe('Diabetes')

    vi.useRealTimers()
  })

  it('clicking Create navigates to /characterizations/new', async () => {
    vi.mocked(listCharacterizations).mockResolvedValue([])
    mounted = await mountView()
    const { wrapper, router } = mounted

    const createEl = wrapper.get('[data-testid="characterizations-create"]').element as HTMLElement
    ;(createEl as HTMLButtonElement).click()
    await flushPromises()
    // Drain microtasks for router.push (which is itself async).
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/characterizations/new')
  })

  it('clicking a row name navigates to /characterizations/:id', async () => {
    vi.mocked(listCharacterizations).mockResolvedValue(sampleList)
    mounted = await mountView()
    const { wrapper, router } = mounted

    const link = wrapper.find('[data-testid="characterizations-row-name"]')
    expect(link.exists()).toBe(true)
    await link.trigger('click')
    await flushPromises()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/characterizations/1')
  })
})
