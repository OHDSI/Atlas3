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
import { createRouter, createMemoryHistory, onBeforeRouteLeave, type Router } from 'vue-router'

import type { FeatureAnalysis } from '@/models/feature-analysis.types'
import { useAuthStore } from '@/stores/auth'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useFeatureAnalysesStore } from '@/stores/feature-analyses'
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
  deleteFeatureAnalysis,
  copyFeatureAnalysis,
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
      stubs: {
        ConceptSetSelectionDialog: true,
        ConceptSetsListDialog: {
          name: 'ConceptSetsListDialog',
          props: ['modelValue', 'conceptSets', 'usedConceptSets'],
          emits: ['delete', 'view'],
          template:
            '<div v-if="modelValue" data-testid="concept-sets-dialog"><slot name="actions" /></div>',
        },
        ConceptSetEditor: {
          name: 'ConceptSetEditor',
          props: ['modelValue', 'conceptSet', 'embedded'],
          emits: ['update:modelValue', 'apply'],
          template:
            '<div v-if="modelValue" data-testid="concept-set-editor"><button data-testid="concept-set-editor-apply" @click="$emit(\'apply\', { id: 11, name: \'Concept set 1\', items: [] })">Apply</button></div>',
        },
        EntityAccessDialog: {
          name: 'EntityAccessDialog',
          props: ['modelValue', 'entityType', 'entityId', 'title', 'subtitle'],
          emits: ['close'],
          template: '<div v-if="modelValue" data-testid="entity-access-dialog" />',
        },
        AtlasDialog: {
          name: 'AtlasDialog',
          props: ['modelValue', 'title', 'eyebrow'],
          emits: ['close'],
          template:
            '<div v-if="modelValue" data-testid="atlas-dialog"><slot /><slot name="actions" /></div>',
        },
      },
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

  it('redirects malformed edit ids back to the list', async () => {
    mounted = await mountEditor('/feature-analyses/not-a-number', { id: 'not-a-number' })
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
    expect((mounted.wrapper.vm as any).$.setupState.prevalenceDraftDesign).toEqual([])
    expect((mounted.wrapper.vm as any).$.setupState.prevalenceDraftConceptSets).toEqual([])
    expect((mounted.wrapper.vm as any).$.setupState.distributionDraftDesign).toEqual([])
    expect((mounted.wrapper.vm as any).$.setupState.distributionDraftConceptSets).toEqual([])

    const nameInput = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-name"] input'
    ).element as HTMLInputElement
    expect(nameInput.value).toBe('')
  })

  it('hydrates the custom SQL field when editing an existing custom analysis', async () => {
    vi.mocked(getFeatureAnalysis).mockResolvedValue(
      success({
        id: 77,
        name: 'Custom SQL FA',
        description: 'Custom SQL editor',
        type: 'CUSTOM_FE',
        domain: 'CONDITION',
        design: 'SELECT 1',
      } as never)
    )

    mounted = await mountEditor('/feature-analyses/77', { id: '77' })
    await flushPromises()

    const customSqlInput = mounted.wrapper.find(
      '[data-testid="feature-analysis-editor-custom-sql"] textarea'
    ).element as HTMLTextAreaElement
    expect(customSqlInput.value).toBe('SELECT 1')
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

  it('shows a snackbar when copying the custom SQL template fails', async () => {
    const clipboardWriteText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: clipboardWriteText },
      configurable: true,
    })

    mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')

    await mounted.wrapper.get('[data-testid="feature-analysis-editor-custom-sql-copy"]').trigger('click')
    await flushPromises()

    expect(clipboardWriteText).toHaveBeenCalledTimes(1)
    expect(mounted.wrapper.findComponent({ name: 'AtlasSnackbar' }).props('text')).toBe(
      'Failed to copy SQL template'
    )
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

  it('still mounts criteria-set creation when aggregate loading fails', async () => {
    vi.mocked(listFeatureAnalysisDomains).mockRejectedValueOnce(new Error('domains down'))
    vi.mocked(listFeatureAnalysisAggregates).mockRejectedValueOnce(new Error('aggregates down'))

    mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=PREVALENCE')
    await flushPromises()

    expect(mounted.wrapper.find('[data-testid="fa-prevalence-add-criteria"]').exists()).toBe(true)
  })

  it('keeps edit mode mounted when loading the editor data fails', async () => {
    vi.mocked(listFeatureAnalysisDomains).mockRejectedValueOnce(new Error('domains down'))
    vi.mocked(listFeatureAnalysisAggregates).mockRejectedValueOnce(new Error('aggregates down'))
    vi.mocked(getFeatureAnalysis).mockResolvedValue(
      success({
        id: 42,
        name: 'Criteria edit',
        description: 'With concept sets',
        type: 'CRITERIA_SET',
        statType: 'DISTRIBUTION',
        domain: 'CONDITION',
        design: [],
        conceptSets: [],
      } as never)
    )

    mounted = await mountEditor('/feature-analyses/42', { id: '42' })
    await flushPromises()

    expect(mounted.wrapper.find('[data-testid="feature-analysis-editor-name"]').exists()).toBe(true)
  })

  it('shows a snackbar when saving prevalence criteria without a default aggregate', async () => {
    mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=PREVALENCE')

    const store = useFeatureAnalysesStore()
    store.aggregates = []

    const nameInput = mounted.wrapper.find('[data-testid="feature-analysis-editor-name"] input')
    await nameInput.setValue('No aggregate FA')

    await mounted.wrapper.get('[data-testid="feature-analysis-editor-save"]').trigger('click')
    await flushPromises()

    expect(mounted.wrapper.findComponent({ name: 'AtlasSnackbar' }).props('text')).toBe(
      'Unable to load the default aggregate'
    )
  })

  it('shows a snackbar when create returns no id', async () => {
    mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
    const store = useFeatureAnalysesStore()
    vi.spyOn(store, 'create').mockResolvedValue({} as never)

    const nameInput = mounted.wrapper.find('[data-testid="feature-analysis-editor-name"] input')
    await nameInput.setValue('Missing id')

    await (mounted.wrapper.vm as any).$.setupState.handleSave()
    await flushPromises()

    expect(mounted.wrapper.findComponent({ name: 'AtlasSnackbar' }).props('text')).toBe(
      'An error occurred while attempting to save a feature analysis.'
    )
  })

  it('applies and removes concept sets through the editor helpers with real concept items', async () => {
    vi.mocked(getFeatureAnalysis).mockResolvedValue(
      success({
        id: 42,
        name: 'Criteria edit',
        description: 'With concept sets',
        type: 'CRITERIA_SET',
        statType: 'DISTRIBUTION',
        domain: 'CONDITION',
        design: [],
        conceptSets: [],
      } as never)
    )

    mounted = await mountEditor('/feature-analyses/42', { id: '42' })
    await flushPromises()

    const conceptSetItem = {
      concept: {
        CONCEPT_ID: 123,
        CONCEPT_NAME: 'Alpha concept',
        CONCEPT_CODE: 'A123',
        DOMAIN_ID: 'Condition',
        VOCABULARY_ID: 'SNOMED',
        CONCEPT_CLASS_ID: 'Clinical Finding',
        STANDARD_CONCEPT: 'S',
        INVALID_REASON: null,
      },
      isExcluded: true,
      includeDescendants: true,
      includeMapped: false,
    }

    ;(mounted.wrapper.vm as any).$.setupState.handleConceptSetApplied({
      name: 'Concept set 1',
      items: [conceptSetItem],
    })
    await flushPromises()

    const conceptSetsDialog = mounted.wrapper.findComponent({ name: 'ConceptSetsListDialog' })
    expect(conceptSetsDialog.props('modelValue')).toBe(true)
    expect(conceptSetsDialog.props('conceptSets')).toHaveLength(1)
    expect((conceptSetsDialog.props('conceptSets') as any[])[0].items[0]).toMatchObject({
      conceptId: 123,
      conceptName: 'Alpha concept',
      isExcluded: true,
      includeDescendants: true,
      includeMapped: false,
    })

    await conceptSetsDialog.vm.$emit('delete', conceptSetsDialog.props('conceptSets')?.[0])
    await flushPromises()

    expect(conceptSetsDialog.props('conceptSets')).toHaveLength(0)
  })

  it('shows a snackbar when copy or delete fails through the store helpers', async () => {
    vi.mocked(getFeatureAnalysis).mockResolvedValue(
      success({
        id: 42,
        name: 'Criteria edit',
        description: 'With concept sets',
        type: 'CRITERIA_SET',
        statType: 'DISTRIBUTION',
        domain: 'CONDITION',
        design: [],
        conceptSets: [],
      } as never)
    )

    mounted = await mountEditor('/feature-analyses/42', { id: '42' })
    await flushPromises()

    const store = useFeatureAnalysesStore()
    vi.spyOn(store, 'copy').mockResolvedValue(null)
    vi.spyOn(store, 'remove').mockResolvedValue(false)

    await (mounted.wrapper.vm as any).$.setupState.handleSaveCopy()
    await flushPromises()
    await (mounted.wrapper.vm as any).$.setupState.confirmDelete()
    await flushPromises()

    expect(mounted.wrapper.findComponent({ name: 'AtlasSnackbar' }).props('text')).toBe(
      'An error occurred while attempting to save a feature analysis.'
    )
  })

  it('opens the edit-mode dialogs and routes copy/delete actions through the store', async () => {
    vi.mocked(getFeatureAnalysis).mockResolvedValue(
      success({
        id: 42,
        name: 'Criteria edit',
        description: 'With concept sets',
        type: 'CRITERIA_SET',
        statType: 'DISTRIBUTION',
        domain: 'CONDITION',
        design: [],
        conceptSets: [
          { id: 11, name: 'Concept set 1', expression: { items: [] } },
        ],
      } as never)
    )
    vi.mocked(copyFeatureAnalysis).mockResolvedValue(
      success({
        id: 99,
        name: 'Criteria edit (copy)',
        type: 'CRITERIA_SET',
        statType: 'DISTRIBUTION',
        domain: 'CONDITION',
        design: [],
        conceptSets: [],
      } as never)
    )
    vi.mocked(deleteFeatureAnalysis).mockResolvedValue(success(undefined as never))

    mounted = await mountEditor('/feature-analyses/42', { id: '42' })
    await flushPromises()

    await mounted.wrapper.get('[data-testid="feature-analysis-editor-conceptsets-icon"]').trigger('click')
    expect(mounted.wrapper.findComponent({ name: 'ConceptSetsListDialog' }).props('modelValue')).toBe(true)

    await mounted.wrapper.get('[data-testid="feature-analysis-editor-access-icon"]').trigger('click')
    const accessDialog = mounted.wrapper.findComponent({ name: 'EntityAccessDialog' })
    expect(accessDialog.props('modelValue')).toBe(true)
    expect(accessDialog.props('entityType')).toBe('FE_ANALYSIS')
    expect(accessDialog.props('entityId')).toBe(42)

    await mounted.wrapper.get('[data-testid="feature-analysis-editor-copy"]').trigger('click')
    await flushPromises()
    expect(copyFeatureAnalysis).toHaveBeenCalledWith(42)

    await mounted.wrapper.get('[data-testid="feature-analysis-editor-delete"]').trigger('click')
    await flushPromises()
    expect(mounted.wrapper.findComponent({ name: 'AtlasDialog' }).exists()).toBe(true)

    await mounted.wrapper.get('[data-testid="feature-analysis-editor-delete-confirm"]').trigger('click')
    await flushPromises()
    expect(deleteFeatureAnalysis).toHaveBeenCalledWith(42)
  })

  it('opens the embedded concept-set editor and applies or deletes a concept set', async () => {
    vi.mocked(getFeatureAnalysis).mockResolvedValue(
      success({
        id: 42,
        name: 'Criteria edit',
        description: 'With concept sets',
        type: 'CRITERIA_SET',
        statType: 'DISTRIBUTION',
        domain: 'CONDITION',
        design: [],
        conceptSets: [
          { id: 11, name: 'Concept set 1', expression: { items: [] } },
        ],
      } as never)
    )

    mounted = await mountEditor('/feature-analyses/42', { id: '42' })
    await flushPromises()

    const conceptSetsStore = useConceptSetsStore()
    const conceptSetsDialog = mounted.wrapper.findComponent({ name: 'ConceptSetsListDialog' })

    await mounted.wrapper.get('[data-testid="feature-analysis-editor-conceptsets-icon"]').trigger('click')
    expect(conceptSetsDialog.props('modelValue')).toBe(true)

    await conceptSetsDialog.vm.$emit('view', { id: 11, name: 'Concept set 1', items: [] })
    await flushPromises()
    expect(conceptSetsStore.editorOpen).toBe(true)
    expect(mounted.wrapper.find('[data-testid="concept-set-editor"]').exists()).toBe(true)

    await mounted.wrapper.get('[data-testid="concept-set-editor-apply"]').trigger('click')
    await flushPromises()
    expect(conceptSetsStore.currentSet?.id).toBe(11)
    expect(conceptSetsStore.editorOpen).toBe(true)

    await mounted.wrapper.findComponent({ name: 'ConceptSetEditor' }).vm.$emit('update:modelValue', false)
    await flushPromises()
    expect(conceptSetsStore.editorOpen).toBe(false)

    await mounted.wrapper.get('[data-testid="feature-analysis-editor-conceptsets-icon"]').trigger('click')
    await flushPromises()
    await conceptSetsDialog.vm.$emit('delete', { id: 11, name: 'Concept set 1', items: [] })
    await flushPromises()
    expect(mounted.wrapper.findComponent({ name: 'AtlasDialog' }).exists()).toBe(true)
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

  it('shows the unsaved-changes dialog from the registered leave guard and resumes or cancels navigation', async () => {
    mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')

    const nameInput = mounted.wrapper.find('[data-testid="feature-analysis-editor-name"] input')
    await nameInput.setValue('Dirty editor')
    await flushPromises()

    const leaveGuard = vi.mocked(onBeforeRouteLeave).mock.calls[0][0] as (
      to: { fullPath: string },
      from: unknown,
      next: (decision?: boolean) => void
    ) => void
    const next = vi.fn()
    const pushSpy = vi.spyOn(mounted.router, 'push')

    leaveGuard({ fullPath: '/analysis/feature-analyses' }, {} as never, next)

    expect(next).toHaveBeenCalledWith(false)

    const vm = mounted.wrapper.vm as {
      showUnsavedDialog: boolean
      confirmLeaveUnsaved: () => void
      cancelLeaveUnsaved: () => void
    }

    vm.showUnsavedDialog = true
    vm.confirmLeaveUnsaved()
    await flushPromises()

    expect(pushSpy).toHaveBeenCalledWith('/analysis/feature-analyses')
    expect(vm.showUnsavedDialog).toBe(false)

    const confirmedNext = vi.fn()
    leaveGuard({ fullPath: '/analysis/feature-analyses' }, {} as never, confirmedNext)
    expect(confirmedNext).toHaveBeenCalled()

    vm.showUnsavedDialog = true
    vm.cancelLeaveUnsaved()
    expect(vm.showUnsavedDialog).toBe(false)

    pushSpy.mockRestore()
  })

  it('aborts a second leave attempt while the unsaved confirmation is already active', async () => {
    mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')

    const nameInput = mounted.wrapper.find('[data-testid="feature-analysis-editor-name"] input')
    await nameInput.setValue('Dirty editor')
    await flushPromises()

    const leaveGuard = vi.mocked(onBeforeRouteLeave).mock.calls[0][0] as (
      to: { fullPath: string },
      from: unknown,
      next: (decision?: boolean) => void
    ) => void
    const next = vi.fn()

    leaveGuard({ fullPath: '/analysis/feature-analyses' }, {} as never, next)
    expect(next).toHaveBeenCalledWith(false)

    next.mockReset()
    leaveGuard({ fullPath: '/analysis/feature-analyses' }, {} as never, next)
    expect(next).toHaveBeenCalledWith(false)
  })
})
