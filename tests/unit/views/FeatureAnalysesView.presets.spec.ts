/**
 * FeatureAnalysesView — PRESET rows are read-only (OHDSI/Atlas3#265)
 *
 * Built-in PRESET feature analyses ship with WebAPI and are shared by every
 * characterization, so the list must not offer to open, copy or delete them.
 * Non-PRESET rows (CRITERIA_SET / CUSTOM_FE) keep all three actions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

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
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { listFeatureAnalyses, copyFeatureAnalysis } from '@/services/feature-analysis.service'
import { success } from '@/types/api'
import FeatureAnalysesView from '@/views/FeatureAnalysesView.vue'
import AnalysisDataTable from '@/components/analysis/AnalysisDataTable.vue'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const PRESET_ROW: FeatureAnalysisListItem = {
  id: 1,
  name: 'Demographics Gender',
  type: 'PRESET',
  domain: 'Demographics',
  statType: 'PREVALENCE',
  createdBy: { login: 'system', name: 'System' },
  createdDate: 1737000000000,
  modifiedDate: 1737500000000,
}

const CRITERIA_ROW: FeatureAnalysisListItem = {
  id: 2,
  name: 'Conditions Criteria',
  type: 'CRITERIA_SET',
  domain: 'Condition',
  statType: 'PREVALENCE',
  createdBy: 'ohdsi',
  createdDate: 1737100000000,
  modifiedDate: 1737200000000,
}

const sampleList: FeatureAnalysisListItem[] = [PRESET_ROW, CRITERIA_ROW]

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/analysis/feature-analyses',
        name: 'feature-analyses',
        component: { template: '<div />' },
      },
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

  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  // Full rights: the only thing that may block an action is the PRESET rule.
  authStore.setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: {
      create: ['create:feature-analysis'],
      read: ['read:feature-analysis'],
      write: ['write:feature-analysis'],
      delete: ['delete:feature-analysis'],
    },
    entityAccess: emptyEntityAccess(),
  })

  const wrapper = mount(FeatureAnalysesView, {
    global: { plugins: [vuetify, pinia, router] },
  })

  await flushPromises()
  return { wrapper, router }
}

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

/** Locate the `<tr>` whose text contains the given analysis name. */
function rowFor(wrapper: Wrapper, name: string) {
  const row = wrapper.findAll('tbody tr').find(tr => tr.text().includes(name))
  if (!row) throw new Error(`No table row found for "${name}"`)
  return row
}

function actionButton(wrapper: Wrapper, name: string, ariaLabel: string) {
  const btn = rowFor(wrapper, name).find(`button[aria-label="${ariaLabel}"]`)
  if (!btn.exists()) throw new Error(`No "${ariaLabel}" button in row "${name}"`)
  return btn
}

/** Wait out router.push()'s own microtask/macrotask chain. */
async function settle() {
  await flushPromises()
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  await flushPromises()
}

describe('FeatureAnalysesView — PRESET rows are read-only', () => {
  let mounted: Awaited<ReturnType<typeof mountView>> | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success(sampleList))
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  it('renders a PRESET name as plain text, with no link to click', async () => {
    mounted = await mountView()
    const { wrapper } = mounted

    const presetRow = rowFor(wrapper, 'Demographics Gender')
    expect(presetRow.find('a').exists()).toBe(false)
    expect(presetRow.get('.analysis-data-table__name-static').text()).toBe('Demographics Gender')

    // The editable row alongside it still offers the link.
    expect(rowFor(wrapper, 'Conditions Criteria').find('a').exists()).toBe(true)
  })

  it('ignores an open event raised for a PRESET row', async () => {
    mounted = await mountView()
    const { wrapper, router } = mounted
    const startPath = router.currentRoute.value.path

    wrapper.findComponent(AnalysisDataTable).vm.$emit('open', PRESET_ROW)
    await settle()

    expect(router.currentRoute.value.path).toBe(startPath)
  })

  it('disables copy and delete on a PRESET row', async () => {
    mounted = await mountView()
    const { wrapper } = mounted

    expect(actionButton(wrapper, 'Demographics Gender', 'Copy').attributes('disabled')).toBeDefined()
    expect(actionButton(wrapper, 'Demographics Gender', 'Delete').attributes('disabled')).toBeDefined()
  })

  it('ignores copy and delete events raised for a PRESET row', async () => {
    mounted = await mountView()
    const { wrapper } = mounted
    const table = wrapper.findComponent(AnalysisDataTable)

    table.vm.$emit('copy', PRESET_ROW)
    table.vm.$emit('delete', PRESET_ROW)
    await settle()

    expect(vi.mocked(copyFeatureAnalysis)).not.toHaveBeenCalled()
    // The delete confirmation dialog must not have opened.
    expect(wrapper.text()).not.toContain('Delete feature analysis')
  })

  it('still opens the editor for a CRITERIA_SET row', async () => {
    mounted = await mountView()
    const { wrapper, router } = mounted

    await rowFor(wrapper, 'Conditions Criteria').get('a').trigger('click')
    await settle()

    expect(router.currentRoute.value.path).toBe('/feature-analyses/2')
  })

  it('still enables copy and delete on a CRITERIA_SET row', async () => {
    mounted = await mountView()
    const { wrapper } = mounted

    expect(actionButton(wrapper, 'Conditions Criteria', 'Copy').attributes('disabled')).toBeUndefined()
    expect(actionButton(wrapper, 'Conditions Criteria', 'Delete').attributes('disabled')).toBeUndefined()
  })

  it('still opens the delete dialog for a CRITERIA_SET row', async () => {
    mounted = await mountView()
    const { wrapper } = mounted

    await actionButton(wrapper, 'Conditions Criteria', 'Delete').trigger('click')
    await settle()

    expect(document.body.textContent).toContain('Conditions Criteria')
  })
})
