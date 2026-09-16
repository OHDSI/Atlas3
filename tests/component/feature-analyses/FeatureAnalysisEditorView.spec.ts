/**
 * FeatureAnalysisEditorView component tests
 *
 * Smoke-level tests for the editor: the create menu's type/statType is read
 * from the route query (there is no in-editor type switcher), direct
 * navigation to `/feature-analyses/new` without a query redirects to the
 * list, and Save dispatches to the right store action.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

import type { FeatureAnalysis } from '@/models/feature-analysis.types'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    onBeforeRouteLeave: vi.fn(),
  }
})

// Mock i18n with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

// Mock service layer (the store and the view both call into this)
vi.mock('@/services/feature-analysis.service', () => ({
  listFeatureAnalyses: vi.fn(),
  getFeatureAnalysis: vi.fn(),
  createFeatureAnalysis: vi.fn(),
  updateFeatureAnalysis: vi.fn(),
  deleteFeatureAnalysis: vi.fn(),
  copyFeatureAnalysis: vi.fn(),
  listFeatureAnalysisDomains: vi.fn(),
  listFeatureAnalysisAggregates: vi.fn(),
  featureAnalysisNameExists: vi.fn(),
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
  getFeatureAnalysis,
  createFeatureAnalysis,
  updateFeatureAnalysis,
  listFeatureAnalysisDomains,
  listFeatureAnalysisAggregates,
} from '@/services/feature-analysis.service'
import FeatureAnalysisEditorView from '@/views/FeatureAnalysisEditorView.vue'
import { success } from '@/types/api'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const sampleFA: FeatureAnalysis = {
  id: 42,
  name: 'Demographics PRESET',
  description: 'Standard demographics',
  type: 'PRESET',
  domain: 'DEMOGRAPHICS',
  design: 'DemographicsAge',
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/analysis/feature-analyses', name: 'feature-analyses', component: { template: '<div />' } },
      { path: '/feature-analyses', redirect: { name: 'feature-analyses' } },
      {
        path: '/feature-analyses/new',
        name: 'feature-analysis-new',
        component: FeatureAnalysisEditorView,
      },
      {
        path: '/feature-analyses/:id',
        name: 'feature-analysis-edit',
        component: FeatureAnalysisEditorView,
        props: true,
      },
    ],
  })
}

async function mountEditor(path: string, props?: Record<string, unknown>) {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()

  // Pinia must be installed AND active before the component sets up, so that
  // the new usePermissions() / useEntityAccess composables read a permitted
  // user. Without this, canSave is false and the Save button stays disabled.
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: {
      create: ['create:feature-analysis'],
      write: ['write:feature-analysis'],
    },
    entityAccess: emptyEntityAccess(),
  })

  const wrapper = mount(FeatureAnalysisEditorView, {
    global: {
      plugins: [vuetify, pinia, router],
      // Renders as a v-navigation-drawer/Teleport - needs a real Vuetify
      // layout to mount, which this test harness doesn't provide. Same stub
      // used by CohortBuilder.spec.ts and StrataEditor.spec.ts.
      stubs: { ConceptSetSelectionDialog: true },
    },
    props,
  })

  await flushPromises()
  return { wrapper, router }
}

describe('FeatureAnalysisEditorView', () => {
  let mounted: { wrapper: VueWrapper; router: Router } | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Default lookup-data stubs so onMounted lookups resolve cleanly.
    vi.mocked(listFeatureAnalysisDomains).mockResolvedValue(success(['DEMOGRAPHICS', 'CONDITION']))
    vi.mocked(listFeatureAnalysisAggregates).mockResolvedValue(
      success([
        { id: 20, name: 'Fallback aggregate' },
        { id: 10, name: 'Default aggregate', isDefault: true },
      ])
    )
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  it('redirects to the list when /new is opened without a type query param', async () => {
    mounted = await mountEditor('/feature-analyses/new')
    // The redirect chases a `redirect:` route entry, which resolves one
    // macrotask later than the single flushPromises() in mountEditor.
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    await flushPromises()

    expect(mounted.router.currentRoute.value.name).toBe('feature-analyses')
  })

  it('mounts in new mode for Custom SQL', async () => {
    mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')

    const text = mounted.wrapper.text()
    expect(text).toContain('New')
    expect(
      mounted.wrapper.find('[data-testid="feature-analysis-editor-design-custom"]').exists()
    ).toBe(true)
    expect(
      mounted.wrapper.find('[data-testid="feature-analysis-editor-design-criteria"]').exists()
    ).toBe(false)
    expect(
      mounted.wrapper.find('[data-testid="feature-analysis-editor-design-preset"]').exists()
    ).toBe(false)

    const nameInput = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-name"] input'
    ).element as HTMLInputElement
    expect(nameInput.value).toBe('')
  })

  it('shows the custom SQL sample text and can copy it to the clipboard', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: clipboardWriteText },
      configurable: true,
    })

    mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')

    const textarea = mounted.wrapper.get(
      '[data-testid="feature-analysis-editor-custom-sql"] textarea'
    ).element as HTMLTextAreaElement

    expect(mounted.wrapper.text()).toContain('SELECT covariate_id, covariate_name, concept_id, sum_value, average_value FROM (')
    expect(mounted.wrapper.text()).toContain(')')
    expect(mounted.wrapper.text()).toContain('Available variables:')
    expect(mounted.wrapper.text()).toContain('@cdm_database_schema')
    expect(textarea.getAttribute('placeholder')).toContain('One covariate per drug in the drug_era table')
    expect(textarea.value).toBe('')

    await mounted.wrapper.get('[data-testid="feature-analysis-editor-custom-sql-sample"]').trigger('click')
    await flushPromises()

    expect(textarea.value).toContain('SELECT')
    expect(textarea.value).toContain('covariate_id')

    await mounted.wrapper.get('[data-testid="feature-analysis-editor-custom-sql-copy"]').trigger('click')
    await flushPromises()

    expect(clipboardWriteText).toHaveBeenCalledTimes(1)
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('covariate_name'))
  })

  it('mounts in new mode for Prevalence Criteria', async () => {
    mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=PREVALENCE')

    expect(
      mounted.wrapper.find('[data-testid="feature-analysis-editor-design-criteria"]').exists()
    ).toBe(true)
    expect(
      mounted.wrapper.find('[data-testid="fa-prevalence-add-criteria"]').exists()
    ).toBe(true)
    // Prevalence rows are edited directly, not via a JSON textarea.
    expect(
      mounted.wrapper.find('[data-testid="feature-analysis-editor-criteria-design-json"]').exists()
    ).toBe(false)
    expect(listFeatureAnalysisAggregates).toHaveBeenCalledTimes(1)
  })

  it('mounts in new mode for Distribution Criteria', async () => {
    mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=DISTRIBUTION')

    expect(
      mounted.wrapper.find('[data-testid="feature-analysis-editor-design-criteria"]').exists()
    ).toBe(true)
    expect(listFeatureAnalysisAggregates).toHaveBeenCalledTimes(1)
  })

  it('hydrates fields from store in edit mode', async () => {
    vi.mocked(getFeatureAnalysis).mockResolvedValue(success(sampleFA))

    mounted = await mountEditor('/feature-analyses/42', { id: '42' })
    await flushPromises()

    const text = mounted.wrapper.text()
    // After i18n migration, the editor title uses the generic "Edit" wording
    expect(text).toContain('Edit')

    const nameInput = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-name"] input'
    ).element as HTMLInputElement
    expect(nameInput.value).toBe('Demographics PRESET')

    // PRESET's design is a plain preset-name string, not JSON.
    const presetInput = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-preset-name"] input'
    ).element as HTMLInputElement
    expect(presetInput.value).toBe('DemographicsAge')

    // Save Copy / Delete are visible in edit mode.
    expect(mounted.wrapper.find('[data-testid="feature-analysis-editor-copy"]').exists()).toBe(true)
    expect(mounted.wrapper.find('[data-testid="feature-analysis-editor-delete"]').exists()).toBe(true)
  })

  it('Save in new mode calls createFeatureAnalysis', async () => {
    vi.mocked(createFeatureAnalysis).mockResolvedValue(
      success({ ...sampleFA, type: 'CUSTOM_FE', design: 'SELECT 1', id: 99 })
    )

    mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')

    // Fill name.
    const nameInput = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-name"] input'
    )
    await nameInput.setValue('My new FA')

    const saveBtn = mounted.wrapper.get(
      '[data-testid="feature-analysis-editor-save"]'
    ).element as HTMLButtonElement
    saveBtn.click()
    await flushPromises()

    expect(createFeatureAnalysis).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(createFeatureAnalysis).mock.calls[0][0]
    expect(payload.name).toBe('My new FA')
    expect(payload.type).toBe('CUSTOM_FE')
  })

  it('Save in edit mode calls updateFeatureAnalysis', async () => {
    vi.mocked(getFeatureAnalysis).mockResolvedValue(success(sampleFA))
    vi.mocked(updateFeatureAnalysis).mockResolvedValue(success({ ...sampleFA, name: 'Renamed FA' }))

    mounted = await mountEditor('/feature-analyses/42', { id: '42' })
    await flushPromises()

    // Tweak name to make it dirty.
    const nameInput = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-name"] input'
    )
    await nameInput.setValue('Renamed FA')

    const saveBtn = mounted.wrapper.get(
      '[data-testid="feature-analysis-editor-save"]'
    ).element as HTMLButtonElement
    saveBtn.click()
    await flushPromises()

    expect(updateFeatureAnalysis).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(updateFeatureAnalysis).mock.calls[0][0]
    expect(payload.id).toBe(42)
    expect(payload.name).toBe('Renamed FA')
  })

  it('Prevalence: Add Criteria feature appends a row and Save sends a CriteriaGroup design', async () => {
    mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=PREVALENCE')
    vi.mocked(createFeatureAnalysis).mockResolvedValue(
      success({
        name: 'Prevalence FA',
        type: 'CRITERIA_SET',
        statType: 'PREVALENCE',
        design: [],
        conceptSets: [],
        id: 77,
      })
    )

    const nameInput = mounted.wrapper.find('[data-testid="feature-analysis-editor-name"] input')
    await nameInput.setValue('Prevalence FA')

    const addBtn = mounted.wrapper.get(
      '[data-testid="fa-prevalence-add-criteria"]'
    ).element as HTMLButtonElement
    addBtn.click()
    await flushPromises()

    expect(mounted.wrapper.find('[data-testid="fa-prevalence-row-0"]').exists()).toBe(true)

    const saveBtn = mounted.wrapper.get(
      '[data-testid="feature-analysis-editor-save"]'
    ).element as HTMLButtonElement
    saveBtn.click()
    await flushPromises()

    expect(createFeatureAnalysis).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(createFeatureAnalysis).mock.calls[0][0]
    expect(payload.type).toBe('CRITERIA_SET')
    if (payload.type === 'CRITERIA_SET' && payload.statType === 'PREVALENCE') {
      expect(payload.design).toHaveLength(2)
      expect(payload.design[0].criteriaType).toBe('CriteriaGroup')
    } else {
      expect.fail('expected a PREVALENCE payload')
    }
  })

  it('mounts in new mode for Distribution Criteria with the live editor', async () => {
    mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=DISTRIBUTION')

    // Fill name.
    const nameInput = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-name"] input'
    )
    await nameInput.setValue('Bad JSON FA')

    expect(
      mounted.wrapper.find('[data-testid="feature-analysis-editor-design-criteria"]').exists()
    ).toBe(true)
    expect(
      mounted.wrapper.find('[data-testid="fa-distribution-add-criteria"]').exists()
    ).toBe(true)
    expect(
      mounted.wrapper.find('[data-testid="feature-analysis-editor-criteria-design-json"]').exists()
    ).toBe(false)

    const saveBtn = mounted.wrapper.get(
      '[data-testid="feature-analysis-editor-save"]'
    ).element as HTMLButtonElement
    saveBtn.click()
    await flushPromises()

    expect(createFeatureAnalysis).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(createFeatureAnalysis).mock.calls[0][0]
    expect(payload.type).toBe('CRITERIA_SET')
    if (payload.type === 'CRITERIA_SET' && payload.statType === 'DISTRIBUTION') {
      expect(payload.design).toEqual([])
      expect(payload.conceptSets).toEqual([])
    } else {
      expect.fail('expected a DISTRIBUTION payload')
    }
  })

  it('Cancel defers the unsaved-changes prompt to the route guard, not itself', async () => {
    // onBeforeRouteLeave doesn't register outside a real <router-view> (see
    // the "No active route record" warning logged by every test in this
    // file), so it can't be exercised here - but this still locks in the
    // regression: handleBack() must never call window.confirm itself, or a
    // real navigation shows the "unsaved changes" dialog twice (#found via
    // manual testing 2026-09-15 - handleBack confirmed, then pushed, and the
    // route guard confirmed *again* for the same navigation).
    mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const nameInput = mounted.wrapper.find('[data-testid="feature-analysis-editor-name"] input')
    await nameInput.setValue('Dirty me up')

    const cancelBtn = mounted.wrapper.get(
      '[data-testid="feature-analysis-editor-cancel"]'
    ).element as HTMLButtonElement
    cancelBtn.click()
    await flushPromises()
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    await flushPromises()

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(mounted.router.currentRoute.value.name).toBe('feature-analyses')

    confirmSpy.mockRestore()
  })

  it('Cancel with no unsaved changes navigates without prompting', async () => {
    mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const cancelBtn = mounted.wrapper.get(
      '[data-testid="feature-analysis-editor-cancel"]'
    ).element as HTMLButtonElement
    cancelBtn.click()
    await flushPromises()
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    await flushPromises()

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(mounted.router.currentRoute.value.name).toBe('feature-analyses')

    confirmSpy.mockRestore()
  })
})
