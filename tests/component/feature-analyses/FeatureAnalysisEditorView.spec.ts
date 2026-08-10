/**
 * FeatureAnalysisEditorView component tests
 *
 * Smoke-level tests for the editor: mount in new vs. edit mode, the type
 * select drives which design section renders, the "load defaults" button
 * fills the JSON textarea, and Save dispatches to the right store action.
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
  getDefaultCovariateSettings: vi.fn(),
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
  getDefaultCovariateSettings,
  listFeatureAnalysisDomains,
  listFeatureAnalysisAggregates,
} from '@/services/feature-analysis.service'
import FeatureAnalysisEditorView from '@/views/FeatureAnalysisEditorView.vue'
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'

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
  domain: 'Demographics',
  statType: 'PREVALENCE',
  design: { temporal: false, useDemographicsGender: true },
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
    global: { plugins: [vuetify, pinia, router] },
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
    vi.mocked(listFeatureAnalysisDomains).mockResolvedValue(success(['Demographics', 'Condition']))
    vi.mocked(listFeatureAnalysisAggregates).mockResolvedValue(success([]))
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  it('mounts in new mode with empty form and PRESET design section', async () => {
    mounted = await mountEditor('/feature-analyses/new')

    const text = mounted.wrapper.text()
    // After i18n migration, the title in new mode collapsed to "New" (common.new)
    expect(text).toContain('New')
    expect(
      mounted.wrapper.find('[data-testid="feature-analysis-editor-design-preset"]').exists()
    ).toBe(true)
    expect(
      mounted.wrapper.find('[data-testid="feature-analysis-editor-design-criteria"]').exists()
    ).toBe(false)
    expect(
      mounted.wrapper.find('[data-testid="feature-analysis-editor-design-custom"]').exists()
    ).toBe(false)

    // Copy / Delete now always render (disabled when not editing) so the
    // toolbar reads identically across the cohort + analysis builders.
    const copyBtn = mounted.wrapper.find('[data-testid="feature-analysis-editor-copy"]')
    const deleteBtn = mounted.wrapper.find('[data-testid="feature-analysis-editor-delete"]')
    expect(copyBtn.exists()).toBe(true)
    expect(deleteBtn.exists()).toBe(true)
    expect(copyBtn.attributes('disabled')).toBeDefined()
    expect(deleteBtn.attributes('disabled')).toBeDefined()

    // Name field starts empty.
    const nameInput = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-name"] input'
    ).element as HTMLInputElement
    expect(nameInput.value).toBe('')
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

    // The PRESET design textarea should be populated with stringified JSON.
    const presetTextarea = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-preset-json"] textarea'
    ).element as HTMLTextAreaElement
    expect(presetTextarea.value).toContain('useDemographicsGender')

    // Save Copy / Delete are visible in edit mode.
    expect(mounted.wrapper.find('[data-testid="feature-analysis-editor-copy"]').exists()).toBe(true)
    expect(mounted.wrapper.find('[data-testid="feature-analysis-editor-delete"]').exists()).toBe(true)
  })

  it('"Load default covariate settings" populates the JSON textarea', async () => {
    vi.mocked(getDefaultCovariateSettings).mockResolvedValue(success({ temporal: false, useDemographicsGender: true }))

    mounted = await mountEditor('/feature-analyses/new')

    const btn = mounted.wrapper.get(
      '[data-testid="feature-analysis-editor-preset-default"]'
    ).element as HTMLButtonElement
    btn.click()
    await flushPromises()

    expect(getDefaultCovariateSettings).toHaveBeenCalledWith(false)

    const presetTextarea = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-preset-json"] textarea'
    ).element as HTMLTextAreaElement
    expect(presetTextarea.value).toContain('useDemographicsGender')
  })

  it('a failed "Load default covariate settings" shows the load-defaults error, not the save error', async () => {
    vi.mocked(getDefaultCovariateSettings).mockResolvedValue(
      failure(new ApiError('HTTP 500: boom', 500, null))
    )

    mounted = await mountEditor('/feature-analyses/new')

    const btn = mounted.wrapper.get(
      '[data-testid="feature-analysis-editor-preset-default"]'
    ).element as HTMLButtonElement
    btn.click()
    await flushPromises()

    const snackbar = mounted.wrapper.findComponent({ name: 'AtlasSnackbar' })
    // 'cc.fa.loadDefaultsError'
    expect(snackbar.props('text')).toBe('Failed to load default covariate settings.')
    // ...and not 'cc.fa.saveError', which this branch used to reuse.
    expect(snackbar.props('text')).not.toBe(
      'An error occurred while attempting to save a feature analysis.'
    )
    expect(snackbar.props('severity')).toBe('danger')
    expect(snackbar.props('modelValue')).toBe(true)

    // The textarea must stay untouched on failure.
    const presetTextarea = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-preset-json"] textarea'
    ).element as HTMLTextAreaElement
    expect(presetTextarea.value).not.toContain('useDemographicsGender')
  })

  it('Save in new mode calls createFeatureAnalysis', async () => {
    vi.mocked(createFeatureAnalysis).mockResolvedValue(success({ ...sampleFA, id: 99 }))

    mounted = await mountEditor('/feature-analyses/new')

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
    expect(payload.type).toBe('PRESET')
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

  it('blocks save when PRESET design JSON is invalid', async () => {
    mounted = await mountEditor('/feature-analyses/new')

    // Fill name.
    const nameInput = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-name"] input'
    )
    await nameInput.setValue('Bad JSON FA')

    // Replace JSON textarea with garbage.
    const presetTextarea = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-preset-json"] textarea'
    )
    await presetTextarea.setValue('{ this is not valid json')

    const saveBtn = mounted.wrapper.get(
      '[data-testid="feature-analysis-editor-save"]'
    ).element as HTMLButtonElement
    saveBtn.click()
    await flushPromises()

    expect(createFeatureAnalysis).not.toHaveBeenCalled()
    // The invalid-JSON chip should be visible.
    expect(
      mounted.wrapper.find('[data-testid="feature-analysis-editor-preset-invalid"]').exists()
    ).toBe(true)
  })
})
