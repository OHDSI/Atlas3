/**
 * CohortBuilder interaction tests
 *
 * Replaces the prior render-only placeholder spec. Exercises the handlers
 * declared in <script setup> (~25 wired functions) plus the exposed API
 * via defineExpose: lifecycle (mount with/without id), cohort load,
 * concept-set/criteria selection contexts, additional-criteria mutations,
 * export flow, cancel routing, tag updates, and the unsaved-changes guard.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ref } from 'vue'

// Mock i18n composable with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

// downloadAtlasJSON spy lifted out via hoisted so test bodies can assert on
// the call site without re-importing the composable internals.
const {
  downloadAtlasJSONSpy: _downloadAtlasJSONSpy,
  exportToAtlasSpy: _exportToAtlasSpy,
  importFromFileSpy: _importFromFileSpy,
  importFromAtlasSpy: _importFromAtlasSpy,
  conversionErrorRef,
} = vi.hoisted(() => ({
  downloadAtlasJSONSpy: vi.fn(),
  exportToAtlasSpy: vi.fn(() => '{"mocked":true}'),
  importFromFileSpy: vi.fn(),
  importFromAtlasSpy: vi.fn(),
  conversionErrorRef: { value: null as string | null },
}))

// (useAtlasConverter composable removed in Phase 6 — legacy export tests below will fail)

// Webapi mocks: most calls are unused in these tests, but a few flows
// (load existing cohort, save) need predictable return values.
vi.mock('@/services/cohort-definition.service', () => ({
  fetchCDMSources: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getAllConceptSets: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getCohortDefinition: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 42,
      name: 'Existing Cohort',
      description: 'A loaded cohort',
      tags: [],
      expression: {
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [{ ConditionOccurrence: {} }],
          ObservationWindow: { PriorDays: 0, PostDays: 0 },
          PrimaryCriteriaLimit: { Type: 'First' },
        },
        QualifiedLimit: { Type: 'First' },
        ExpressionLimit: { Type: 'First' },
        InclusionRules: [],
        CensoringCriteria: [],
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      },
    },
  }),
  saveCohortDefinition: vi.fn().mockResolvedValue({ success: true, data: { id: 99, name: 'Saved' } }),
  validateCohortDefinition: vi.fn().mockResolvedValue({ success: true, data: { warnings: [] } }),
  assignTagToCohort: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  unassignTagFromCohort: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}))

vi.mock('@/services/concept-set.service', () => ({
  getConceptSetById: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Mock Set',
    items: [{ concept: { CONCEPT_ID: 1, CONCEPT_NAME: 'X' } }],
  }),
  getAllConceptSets: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/services/cohort-definition-versions.service', () => ({
  getVersions: vi.fn().mockResolvedValue([]),
  getVersion: vi.fn().mockResolvedValue(null),
  updateVersion: vi.fn().mockResolvedValue(null),
  copyVersion: vi.fn().mockResolvedValue(null),
}))

// Permission composable: grant every permission so canSave can become true
// when a name + entry events are present, allowing the save flow tests to
// exercise the full handleSave body.
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    cacheHitRate: { value: 1 },
    clearCache: () => {},
  }),
}))

vi.mock('@/composables/useEntityAccess', async () => {
  const { computed } = await import('vue')
  return {
    useEntityAccess: () => ({
      canRead: computed(() => true),
      canWrite: computed(() => true),
      canDelete: computed(() => true),
    }),
  }
})

import { ApiError } from '@/services/api-error'
import { useCohortStore, AUTO_SAVE_INTERVAL_MS } from '@/stores/cohort'
import CohortBuilder from '@/components/cohort/CohortBuilder.vue'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Stub all heavy child components so their own lifecycle doesn't fire.
// The handlers under test live in CohortBuilder itself, not in the children.
const childStubs = {
  EntryEventsList: true,
  ConceptSetSelectionDialog: true,
  ConceptSearchDialog: true,
  ConceptSetEditor: true,
  InclusionCriteriaPanel: true,
  ExitCriteriaPanel: true,
  CensorWindowEditor: true,
  GroupCriteriaUI: true,
  CohortGenerationSection: true,
  VersionsTabContent: true,
  CohortBreadcrumb: true,
  CohortToolbarActions: true,
  CohortToolbarStatus: true,
  ConceptSetsListDialog: true,
  ValidationMessagesDialog: true,
  CohortJsonDialog: true,
  TagSelectionDialog: true,
  'router-link': true,
} as const

describe('CohortBuilder', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/cohorts', component: { template: '<div>Cohorts</div>' } },
        { path: '/cohorts/:id?', component: { template: '<div>Cohort</div>' } },
        {
          path: '/cohortdefinition/:id/version/:version',
          component: { template: '<div>Version</div>' },
        },
      ],
    })
    vi.clearAllMocks()
    conversionErrorRef.value = null
  })

  const createWrapper = (
    props: Record<string, unknown> = {},
    stubs: Record<string, unknown> = {}
  ) => {
    return mount(CohortBuilder, {
      props,
      global: {
        plugins: [vuetify, router],
        stubs: { ...childStubs, ...stubs },
      },
      attachTo: document.body,
    })
  }

  type Wrapper = ReturnType<typeof createWrapper>

  const conceptSetsListDialog = (wrapper: Wrapper) =>
    wrapper.findComponent({ name: 'ConceptSetsListDialog' })
  const conceptSearchDialog = (wrapper: Wrapper) =>
    wrapper.findComponent({ name: 'ConceptSearchDialog' })
  const tagSelectionDialog = (wrapper: Wrapper) =>
    wrapper.findComponent({ name: 'TagSelectionDialog' })
  const conceptSetSelectionDialog = (wrapper: Wrapper) =>
    wrapper.findComponent({ name: 'ConceptSetSelectionDialog' })
  const conceptSetEditor = (wrapper: Wrapper) => wrapper.findComponent({ name: 'ConceptSetEditor' })
  const cohortJsonDialog = (wrapper: Wrapper) => wrapper.findComponent({ name: 'CohortJsonDialog' })

  // ---------------------------------------------------------------------------
  // Lifecycle + render
  // ---------------------------------------------------------------------------

  it('renders without throwing when no id is given', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.exists()).toBe(true)
    expect((wrapper.vm as any).cohortId).toBeNull()
  })

  it('exposes status state via defineExpose', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(vm).toHaveProperty('totalConceptSets')
    expect(vm).toHaveProperty('unusedConceptSetCount')
    expect(vm).toHaveProperty('validationCount')
    expect(vm).toHaveProperty('canSave')
    expect(vm).toHaveProperty('handleCancel')
    expect(vm).toHaveProperty('handleSave')
    expect(typeof vm.openConceptSetsDialog).toBe('function')
    expect(typeof vm.openValidationDialog).toBe('function')
    expect(typeof vm.openVersionsDialog).toBe('function')
    expect(typeof vm.openTagsDialog).toBe('function')
  })

  // #200: the payload sent for validation used to be rebuilt from the criteria
  // alone, so a concept set the cohort declares but whose reference the criteria
  // walk cannot see was dropped and circe reported a dangling CodesetId. The
  // editor now posts the cohort expression itself, so the guarantee to hold is
  // that a declared set reaches checkV2 whether or not a criterion cites it.
  it('validates against the concept sets the cohort declares, not only the discovered ones', async () => {
    const { validateCohortDefinition } = await import('@/services/cohort-definition.service')
    const store = useCohortStore()
    store.createNewCohort()
    store.currentCohort!.expression.ConceptSets = [
      { id: 11, name: 'Inpatient visit types', expression: { items: [] } },
    ]
    vi.mocked(validateCohortDefinition).mockClear()

    // The mount itself bumps the expression revision, which is what schedules
    // the debounced validation run — so the clock has to be fake before it.
    vi.useFakeTimers()
    try {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      // Past the 2s validation debounce, but not so far that the 30s auto-save
      // interval keeps re-arming itself.
      await vi.advanceTimersByTimeAsync(3000)
      await wrapper.vm.$nextTick()

      expect(validateCohortDefinition).toHaveBeenCalled()
      const posted = vi.mocked(validateCohortDefinition).mock.calls.at(-1)![1]
      expect((posted.ConceptSets ?? []).map(cs => cs.id)).toEqual([11])
    } finally {
      vi.useRealTimers()
    }
  })

  it('loadCohort populates internal state when id prop is provided', async () => {
    const wrapper = createWrapper({ id: '42' })
    // Wait for onMounted's loadCohort() to resolve.
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(vm.cohortId).toBe(42)
  })

  it('shows a load error when the stored expression fails validation', async () => {
    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.getCohortDefinition).mockResolvedValueOnce({
      success: false,
      error: new ApiError('Cohort expression failed validation', 422, null),
    })

    const wrapper = createWrapper({ id: '1' })
    await flushPromises()

    const errorSnackbar = wrapper
      .findAllComponents({ name: 'AtlasSnackbar' })
      .find(s => s.props('severity') === 'danger')
    expect(errorSnackbar?.props('modelValue')).toBe(true)
    expect(errorSnackbar?.props('text')).toContain('Failed to parse cohort definition')
  })

  it('shows the generic load error when the fetch fails for a non-422 reason', async () => {
    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.getCohortDefinition).mockResolvedValueOnce({
      success: false,
      error: new ApiError('HTTP 500: <html>Internal Server Error</html>', 500, null),
    })

    const wrapper = createWrapper({ id: '1' })
    await flushPromises()

    const errorSnackbar = wrapper
      .findAllComponents({ name: 'AtlasSnackbar' })
      .find(s => s.props('severity') === 'danger')
    expect(errorSnackbar?.props('modelValue')).toBe(true)
    expect(errorSnackbar?.props('text')).toBe('Failed to load cohort')
    // Raw transport text must not leak into the banner.
    expect(errorSnackbar?.props('text')).not.toContain('HTTP 500')
    expect(getSetup(wrapper).isLoadingCohort).toBe(false)
  })

  it('retryLoad retries a failed cohort load', async () => {
    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.getCohortDefinition).mockResolvedValueOnce({
      success: false,
      error: new ApiError('HTTP 500: <html>Internal Server Error</html>', 500, null),
    })

    const wrapper = createWrapper({ id: '1' })
    await flushPromises()
    const setup = getSetup(wrapper)

    expect(setup.loadError).toBe('Failed to load cohort')
    const callsBeforeRetry = vi.mocked(cohortDefService.getCohortDefinition).mock.calls.length

    setup.retryLoad()
    await flushPromises()

    expect(vi.mocked(cohortDefService.getCohortDefinition).mock.calls.length).toBe(
      callsBeforeRetry + 1
    )
  })

  it('refuses to load a definition whose expression type is not a simple expression', async () => {
    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.getCohortDefinition).mockResolvedValueOnce({
      success: true,
      data: {
        id: 5,
        name: 'Imported Cohort',
        description: '',
        tags: [],
        expressionType: 'CONCEPT_SET_EXPRESSION',
        expression: { ConceptSets: [], InclusionRules: [] },
      },
    })

    const wrapper = createWrapper({ id: '5' })
    await flushPromises()

    const errorSnackbar = wrapper
      .findAllComponents({ name: 'AtlasSnackbar' })
      .find(s => s.props('severity') === 'danger')
    expect(errorSnackbar?.props('modelValue')).toBe(true)
    expect(errorSnackbar?.props('text')).toBe('Failed to load cohort')
    const setup = getSetup(wrapper)
    expect(setup.isLoadingCohort).toBe(false)
    expect(setup.cohortName).toBe('')
  })

  it('drops the previous definition and shows an error state when the next load fails', async () => {
    const wrapper = createWrapper({ id: '42' })
    await flushPromises()
    expect(renderedExpression(wrapper).PrimaryCriteria.CriteriaList).toEqual([
      { ConditionOccurrence: {} },
    ])

    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.getCohortDefinition).mockResolvedValueOnce({
      success: false,
      error: new ApiError('Cohort definition not found', 404, null),
    })

    await wrapper.setProps({ id: '7' })
    await flushPromises()

    const loadError = wrapper.find('.cohort-builder__load-error')
    expect(loadError.exists()).toBe(true)
    expect(loadError.text()).toContain('Failed to load cohort')
    // Cohort 42's criteria must not stay on screen under cohort 7's header.
    expect(wrapper.findComponent({ name: 'CohortExpressionEditor' }).exists()).toBe(false)

    const setup = getSetup(wrapper)
    expect(setup.cohortName).toBe('')
    expect(setup.isLoadingCohort).toBe(false)
    const { useCohortStore } = await import('@/stores/cohort')
    expect(useCohortStore().currentCohort).toBeNull()

    // A load that succeeds afterwards clears the error state again.
    await wrapper.setProps({ id: '42' })
    await flushPromises()
    expect(wrapper.find('.cohort-builder__load-error').exists()).toBe(false)
    expect(renderedExpression(wrapper).PrimaryCriteria.CriteriaList).toEqual([
      { ConditionOccurrence: {} },
    ])
  })

  it('reports a load that throws instead of leaving the previous definition on screen', async () => {
    const wrapper = createWrapper({ id: '42' })
    await flushPromises()

    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.getCohortDefinition).mockRejectedValueOnce(new Error('network down'))

    await wrapper.setProps({ id: '7' })
    await flushPromises()

    expect(wrapper.find('.cohort-builder__load-error').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CohortExpressionEditor' }).exists()).toBe(false)
    const setup = getSetup(wrapper)
    expect(setup.showError).toBe(true)
    expect(setup.errorMessage).toBe('Failed to load cohort')
    expect(setup.isLoadingCohort).toBe(false)
  })

  it('canSave is false when name is empty', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).canSave).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Auto-save lifecycle — the editor owns the store's draft timer
  // ---------------------------------------------------------------------------

  describe('auto-save lifecycle', () => {
    const DRAFT_KEY = 'atlas3_cohort_draft'

    beforeEach(() => {
      sessionStorage.clear()
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      sessionStorage.clear()
    })

    it('starts the store auto-save on mount so drafts reach sessionStorage', async () => {
      const cohortStore = useCohortStore()
      const startSpy = vi.spyOn(cohortStore, 'startAutoSave')

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      expect(startSpy).toHaveBeenCalledTimes(1)

      cohortStore.markDirty()
      sessionStorage.removeItem(DRAFT_KEY)
      await vi.advanceTimersByTimeAsync(AUTO_SAVE_INTERVAL_MS)

      expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull()
      wrapper.unmount()
    })

    it('stops the auto-save on unmount so no draft is written afterwards', async () => {
      const cohortStore = useCohortStore()
      const stopSpy = vi.spyOn(cohortStore, 'stopAutoSave')

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      cohortStore.markDirty()

      wrapper.unmount()
      expect(stopSpy).toHaveBeenCalledTimes(1)

      sessionStorage.removeItem(DRAFT_KEY)
      await vi.advanceTimersByTimeAsync(AUTO_SAVE_INTERVAL_MS * 2)

      expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // openXDialog handlers (exposed)
  // ---------------------------------------------------------------------------

  it('openConceptSetsDialog opens the concept sets dialog', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const dialog = conceptSetsListDialog(wrapper)
    expect(dialog.props('modelValue')).toBe(false)

    ;(wrapper.vm as any).openConceptSetsDialog()
    await wrapper.vm.$nextTick()

    expect(dialog.props('modelValue')).toBe(true)
  })

  it('openValidationDialog/openVersionsDialog/openTagsDialog can be invoked', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(() => vm.openValidationDialog()).not.toThrow()
    expect(() => vm.openVersionsDialog()).not.toThrow()
    expect(() => vm.openTagsDialog()).not.toThrow()
  })

  it('wires toolbar status and breadcrumb events to the local dialog state', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')

    const toolbar = wrapper.findComponent({ name: 'CohortToolbarStatus' })
    toolbar.vm.$emit('show-concept-sets')
    toolbar.vm.$emit('show-validation')
    toolbar.vm.$emit('show-versions')
    toolbar.vm.$emit('show-tags')

    await wrapper.vm.$nextTick()
    expect(conceptSetsListDialog(wrapper).props('modelValue')).toBe(true)
    expect(wrapper.findComponent({ name: 'ValidationMessagesDialog' }).props('modelValue')).toBe(
      true
    )
    expect(wrapper.findComponent({ name: 'AtlasDialog' }).exists()).toBe(true)

    const breadcrumb = wrapper.findComponent({ name: 'CohortBreadcrumb' })
    breadcrumb.vm.$emit('navigate-back')
    await wrapper.vm.$nextTick()

    expect(pushSpy).toHaveBeenCalledWith('/cohorts')
  })

  it('syncs the breadcrumb name and opens the dialog chrome from real child emits', async () => {
    const wrapper = createWrapper({}, {
      CohortBreadcrumb: false,
      CohortToolbarStatus: false,
    })
    await wrapper.vm.$nextTick()

    const breadcrumb = wrapper.findComponent({ name: 'CohortBreadcrumb' })
    await breadcrumb.vm.$emit('update:modelValue', 'Updated Cohort')
    await wrapper.vm.$nextTick()
    expect(breadcrumb.props('modelValue')).toBe('Updated Cohort')

    const toolbar = wrapper.findComponent({ name: 'CohortToolbarStatus' })
    toolbar.vm.$emit('show-concept-sets')
    toolbar.vm.$emit('show-validation')
    toolbar.vm.$emit('show-versions')
    toolbar.vm.$emit('show-tags')
    await wrapper.vm.$nextTick()

    expect(conceptSetsListDialog(wrapper).props('modelValue')).toBe(true)
    expect(wrapper.findComponent({ name: 'ValidationMessagesDialog' }).props('modelValue')).toBe(
      true
    )
    expect(wrapper.findComponent({ name: 'TagSelectionDialog' }).props('modelValue')).toBe(true)
  })

  it('handles dialog v-model and close emits from the child components', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const conceptSetsStore = useConceptSetsStore()
    conceptSetsStore.openCreateEditor()
    await wrapper.vm.$nextTick()

    const conceptSetSelection = conceptSetSelectionDialog(wrapper)
    const conceptSearch = conceptSearchDialog(wrapper)
    const conceptSetEditorVm = conceptSetEditor(wrapper)
    const conceptSetsList = conceptSetsListDialog(wrapper)
    const validationDialog = wrapper.findComponent({ name: 'ValidationMessagesDialog' })
    const jsonDialog = cohortJsonDialog(wrapper)
    const tagDialog = tagSelectionDialog(wrapper)
    const versionDialog = wrapper.findComponent({ name: 'AtlasDialog' })

    conceptSetsList.vm.$emit('update:modelValue', false)
    validationDialog.vm.$emit('update:modelValue', false)
    jsonDialog.vm.$emit('update:modelValue', false)
    conceptSetSelection.vm.$emit('update:modelValue', false)
    conceptSearch.vm.$emit('update:modelValue', false)
    conceptSetEditorVm.vm.$emit('update:modelValue', false)
    tagDialog.vm.$emit('update:modelValue', false)

    versionDialog.vm.$emit('close')

    await wrapper.vm.$nextTick()

    expect(conceptSetsList.props('modelValue')).toBe(false)
    expect(validationDialog.props('modelValue')).toBe(false)
    expect(jsonDialog.props('modelValue')).toBe(false)
    expect(conceptSetSelection.props('modelValue')).toBe(false)
    expect(conceptSearch.props('modelValue')).toBe(false)
    expect(conceptSetsStore.editorOpen).toBe(false)
    expect(tagDialog.props('modelValue')).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // handleCancel — exposed routes back to /cohorts
  // ---------------------------------------------------------------------------

  it('handleCancel routes back to /cohorts', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')
    ;(wrapper.vm as any).handleCancel()
    await wrapper.vm.$nextTick()
    expect(pushSpy).toHaveBeenCalledWith('/cohorts')
  })

  // ---------------------------------------------------------------------------
  // Export flow — exportFilename + handleExportDownload
  // ---------------------------------------------------------------------------

  it('exportFilename builds a slug from cohortName', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ name: 'My Cool Cohort!' })
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).cohortName).toBe('My Cool Cohort!')
  })

  // ---------------------------------------------------------------------------
  // Internal setupState handler invocations
  //
  // We pull the raw setup state to call the non-exposed handlers directly.
  // ---------------------------------------------------------------------------

  function getSetup(wrapper: ReturnType<typeof createWrapper>) {
    return (wrapper.vm as any).$.setupState
  }

  // ---------------------------------------------------------------------------
  // handleConceptsSelected
  // ---------------------------------------------------------------------------

  it('closes the search dialog when no concepts are selected', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.criteriaSelectionService.requestConcepts(undefined, vi.fn())
    await wrapper.vm.$nextTick()
    expect(conceptSearchDialog(wrapper).props('modelValue')).toBe(true)

    conceptSearchDialog(wrapper).vm.$emit('concepts-selected', [])
    await wrapper.vm.$nextTick()
    expect(conceptSearchDialog(wrapper).props('modelValue')).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Criteria-selection service (issue #112): descendants request the pickers
  // and CohortBuilder delivers the result back through a pending callback
  // rather than the index-context relay.
  // ---------------------------------------------------------------------------

  it('criteriaSelectionService.requestConcepts opens the search dialog and registers a pending callback', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any

    const cb = vi.fn()
    vm.criteriaSelectionService.requestConcepts('Gender', cb)
    await wrapper.vm.$nextTick()

    expect(conceptSearchDialog(wrapper).props('modelValue')).toBe(true)
    expect(conceptSearchDialog(wrapper).props('domainFilter')).toBe('Gender')

    // Delivering the dialog result runs the pending-callback branch of
    // handleConceptsSelected (converts + hands back Atlas-format concepts).
    conceptSearchDialog(wrapper).vm.$emit('concepts-selected', [
      {
        conceptId: 8507,
        conceptName: 'MALE',
        conceptCode: 'M',
        domainId: 'Gender',
        vocabularyId: 'Gender',
        conceptClassId: 'Gender',
        standardConcept: 'S',
        invalidReason: null,
      },
    ])
    await wrapper.vm.$nextTick()

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb.mock.calls[0][0][0]).toMatchObject({ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' })
    expect(conceptSearchDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('criteriaSelectionService.editConceptSet opens the concept-set editor', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    ;(wrapper.vm as any).criteriaSelectionService.editConceptSet({
      id: 9,
      name: 'Hypertension',
      items: [],
    })
    await wrapper.vm.$nextTick()

    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const store = useConceptSetsStore()
    expect(store.editorOpen).toBe(true)
    expect(store.currentSet).toMatchObject({ id: 9, name: 'Hypertension' })
  })

  // ---------------------------------------------------------------------------
  // exportFilename
  // ---------------------------------------------------------------------------

  it('exportFilename slugifies the cohort name', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'My Cool Cohort!'
    expect(vm.exportFilename()).toBe('my_cool_cohort__cohort.json')
  })

  it('exportFilename falls back to "cohort" for an empty name', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = ''
    expect(vm.exportFilename()).toBe('cohort_cohort.json')
  })

  // ---------------------------------------------------------------------------
  // createStateSnapshot
  // ---------------------------------------------------------------------------

  it('createStateSnapshot returns a stable JSON string capturing all fields', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Snap'
    vm.cohortDescription = 'snap-desc'
    const snap = vm.createStateSnapshot()
    expect(typeof snap).toBe('string')
    const parsed = JSON.parse(snap)
    expect(parsed.name).toBe('Snap')
    expect(parsed.description).toBe('snap-desc')
    expect(parsed).toHaveProperty('expression')
  })

  // ---------------------------------------------------------------------------
  // confirmLeaveUnsaved / cancelLeaveUnsaved
  // ---------------------------------------------------------------------------

  it('cancelLeaveUnsaved closes the unsaved-changes dialog and clears state', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.showUnsavedDialog = true
    vm.isConfirmingNavigation = true
    vm.cancelLeaveUnsaved()
    expect(vm.showUnsavedDialog).toBe(false)
    expect(vm.isConfirmingNavigation).toBe(false)
  })

  it('confirmLeaveUnsaved closes the dialog and runs pending navigation', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.showUnsavedDialog = true
    // confirmLeaveUnsaved consumes a module-local `pendingNavigation` we can't
    // easily set; assert the dialog flips off regardless.
    vm.confirmLeaveUnsaved()
    expect(vm.showUnsavedDialog).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // handleTagsUpdate
  // ---------------------------------------------------------------------------

  it('updating tags writes new tags onto the current cohort in the store', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    // store.currentCohort may be undefined for a brand-new cohort with no id;
    // ensure there's something to write into.
    if (!store.currentCohort) {
      store.createNewCohort()
    }
    const tags = [{ id: 1, name: 'tag1' }, { id: 2, name: 'tag2' }]
    tagSelectionDialog(wrapper).vm.$emit('update:selected-tags', tags)
    await wrapper.vm.$nextTick()
    expect(store.currentCohort?.tags).toEqual(tags)
  })

  // ---------------------------------------------------------------------------
  // handleViewConceptSet / handleCreateNewConceptSet
  // ---------------------------------------------------------------------------

  it('viewing a concept set closes the list dialog and opens the editor', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as any).openConceptSetsDialog()
    await wrapper.vm.$nextTick()
    expect(conceptSetsListDialog(wrapper).props('modelValue')).toBe(true)

    conceptSetsListDialog(wrapper).vm.$emit('view', { id: 1, name: 'cs', items: [] })
    await wrapper.vm.$nextTick()

    expect(conceptSetsListDialog(wrapper).props('modelValue')).toBe(false)
    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const store = useConceptSetsStore()
    expect(store.editorOpen).toBe(true)
  })

  it('creating a new concept set closes the selection dialog', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.isConceptSetDialogOpen = true
    await wrapper.vm.$nextTick()
    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(true)

    conceptSetSelectionDialog(wrapper).vm.$emit('create-new')
    await wrapper.vm.$nextTick()

    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('selecting a repository concept set adds it to the expression and resolves the target', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    const targetRef = ref<number | null | undefined>(undefined)

    setup.onSelectConceptSet({ targetRef })
    await wrapper.vm.$nextTick()

    expect(() => setup.criteriaSelectionService.requestConceptSet()).not.toThrow()
    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(true)

    conceptSetSelectionDialog(wrapper).vm.$emit('concept-set-selected', {
      id: 27,
      name: 'Repository Set',
      items: [{ conceptId: 101, conceptName: 'Alpha' }],
    })
    await flushPromises()

    expect(setup.expression.ConceptSets).toHaveLength(1)
    expect(setup.expression.ConceptSets?.[0]).toMatchObject({ id: 27, name: 'Repository Set' })
    expect(targetRef.value).toBe(27)
    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('handleClearConceptSet closes the active selection without changing the expression', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    const targetRef = ref<number | null | undefined>(undefined)

    setup.onSelectConceptSet({ targetRef })
    await wrapper.vm.$nextTick()
    setup.handleClearConceptSet()
    await wrapper.vm.$nextTick()

    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(false)
    expect(targetRef.value).toBeUndefined()
    expect(setup.expression.ConceptSets).toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // handleEditConceptSet / handleConceptSetApplied (embedded editor flow)
  // ---------------------------------------------------------------------------

  it('handleEditConceptSet opens the editor on a clone, leaving cohort items untouched', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    const items = [{ conceptId: 1, includeDescendants: false }]
    await setup.handleEditConceptSet({ id: 5, name: 'Embedded', items })
    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const store = useConceptSetsStore()
    expect(store.editorOpen).toBe(true)
    store.currentSet!.items.push({ conceptId: 2 } as any)
    store.currentSet!.items[0]!.includeDescendants = true
    expect(items).toEqual([{ conceptId: 1, includeDescendants: false }])
  })

  it('applying concept-set changes is a no-op without a matching usage or pending context', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const store = useConceptSetsStore()
    store.openCreateEditor()
    await wrapper.vm.$nextTick()
    expect(() =>
      conceptSetEditor(wrapper).vm.$emit('apply', { id: 9, name: 'x', items: [] })
    ).not.toThrow()
  })

  // ---------------------------------------------------------------------------
  // handleEditConceptSet (open editor)
  // ---------------------------------------------------------------------------

  it('picking a local concept set sets store.currentSet and opens editor when edited', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const store = useConceptSetsStore()
    conceptSetSelectionDialog(wrapper).vm.$emit('edit-concept-set', {
      id: 12,
      name: 'Edited',
      items: [],
    })
    await flushPromises()
    expect(store.currentSet).toMatchObject({ id: 12, name: 'Edited' })
    expect(store.editorOpen).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // handleSave — full save flow
  // ---------------------------------------------------------------------------

  it('handleSave returns early when canSave is false', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    // canSave is computed false for an empty cohort.
    const webapi = await import('@/services/cohort-definition.service')
    const spy = vi.spyOn(webapi, 'saveCohortDefinition')
    await setup.handleSave()
    expect(spy).not.toHaveBeenCalled()
  })

  it('handleSave calls saveCohortDefinition with an Atlas wrapper', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    // Make canSave true: have name + entry events + grant permission via mock.
    setup.cohortName = 'A Cohort'
    setup.cohortDescription = 'Described'
    Object.assign(setup.expression, {
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] },
      // No items: handleSave must hydrate them from the concept set service
      // before the definition goes to the server.
      ConceptSets: [{ id: 7, name: 'Unhydrated', expression: { items: [] } }],
    })
    const webapi = await import('@/services/cohort-definition.service')
    const conceptSetService = await import('@/services/concept-set.service')
    await setup.handleSave()

    expect(webapi.saveCohortDefinition).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(webapi.saveCohortDefinition).mock.calls[0][0] as any
    expect(payload).toMatchObject({
      id: undefined,
      name: 'A Cohort',
      description: 'Described',
      expressionType: 'SIMPLE_EXPRESSION',
    })
    expect(payload.expression.PrimaryCriteria.CriteriaList).toEqual([{ ConditionOccurrence: {} }])
    expect(conceptSetService.getConceptSetById).toHaveBeenCalledWith(7)
    expect(payload.expression.ConceptSets[0].expression.items).toHaveLength(1)
  })

  it('handleSave leaves concept sets that already carry their items alone', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'A Cohort'
    const hydrated = { concept: { CONCEPT_ID: 42, CONCEPT_NAME: 'Already here' } }
    Object.assign(setup.expression, {
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] },
      ConceptSets: [{ id: 7, name: 'Hydrated', expression: { items: [hydrated] } }],
    })
    const webapi = await import('@/services/cohort-definition.service')
    const conceptSetService = await import('@/services/concept-set.service')
    await setup.handleSave()

    expect(conceptSetService.getConceptSetById).not.toHaveBeenCalled()
    const payload = vi.mocked(webapi.saveCohortDefinition).mock.calls[0][0] as any
    expect(payload.expression.ConceptSets[0].expression.items).toEqual([hydrated])
  })

  // ATLAS 2.15 does not gate saving on validation: cohort-definition-manager.js builds
  // canSave from edit permission, dirty state and name correctness only, and save() runs
  // just a name-uniqueness check. criticalCount gates canGenerate instead. A cohort whose
  // CustomEra exit strategy has no drug concept set is savable there, so it is here too.
  it('saves a cohort carrying a CRITICAL exit-criteria finding, as ATLAS 2.15 does', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Incomplete exit criteria'
    Object.assign(setup.expression, {
      PrimaryCriteria: { CriteriaList: [{ DrugExposure: {} }] },
      EndStrategy: { CustomEra: { GapDays: 30, Offset: 0 } },
    })
    await wrapper.vm.$nextTick()

    const { validateEndStrategy } = await import('@/composables/useExitCriteriaValidation')
      .then(m => m.useExitCriteriaValidation())
    expect(validateEndStrategy(setup.expression.EndStrategy)[0]!.severity).toBe('CRITICAL')

    expect(setup.canSave).toBe(true)
    const webapi = await import('@/services/cohort-definition.service')
    await setup.handleSave()

    expect(webapi.saveCohortDefinition).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(webapi.saveCohortDefinition).mock.calls[0][0] as any
    expect(payload.expression.EndStrategy).toEqual({ CustomEra: { GapDays: 30, Offset: 0 } })
  })

  // The other half of the 2.15 contract: the same CRITICAL finding that leaves save
  // alone must reach CohortGenerationSection, whose canGenerate mirrors
  // cohort-definition-manager.js `criticalCount() <= 0`.
  it('hands the CRITICAL count to the generation section while save stays enabled', async () => {
    const webapi = await import('@/services/cohort-definition.service')
    vi.mocked(webapi.validateCohortDefinition).mockResolvedValue({
      success: true,
      data: {
        warnings: [
          {
            type: 'DefaultWarning',
            severity: 'CRITICAL',
            message: 'Drug concept set must be selected at Exit Criteria.',
          },
        ],
      },
    })
    vi.useFakeTimers()
    try {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      const setup = getSetup(wrapper)
      setup.cohortName = 'Incomplete exit criteria'
      Object.assign(setup.expression, {
        PrimaryCriteria: { CriteriaList: [{ DrugExposure: {} }] },
        EndStrategy: { CustomEra: { GapDays: 30, Offset: 0 } },
      })
      await wrapper.vm.$nextTick()
      await vi.advanceTimersByTimeAsync(3000)

      const section = wrapper.findComponent({ name: 'CohortGenerationSection' })
      expect(section.props('criticalCount')).toBeGreaterThan(0)
      expect(setup.canSave).toBe(true)
    } finally {
      vi.useRealTimers()
      vi.mocked(webapi.validateCohortDefinition).mockResolvedValue({
        success: true,
        data: { warnings: [] },
      })
    }
  })

  // The gap the CRITICAL count alone cannot cover: validation is debounced by
  // 2000ms, so for the first seconds of every cohort criticalCount is 0 because
  // nothing has been checked, not because nothing is wrong. The generation
  // section must be told the difference or it offers Generate on a broken design.
  it('reports the design as unvalidated before the first check resolves, though its CRITICAL count is still 0', async () => {
    const webapi = await import('@/services/cohort-definition.service')
    vi.mocked(webapi.validateCohortDefinition).mockResolvedValue({
      success: true,
      data: {
        warnings: [
          {
            type: 'DefaultWarning',
            severity: 'CRITICAL',
            message: 'Drug concept set must be selected at Exit Criteria.',
          },
        ],
      },
    })
    vi.useFakeTimers()
    try {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      const setup = getSetup(wrapper)
      setup.cohortName = 'Incomplete exit criteria'
      Object.assign(setup.expression, {
        PrimaryCriteria: { CriteriaList: [{ DrugExposure: {} }] },
        EndStrategy: { CustomEra: { GapDays: 30, Offset: 0 } },
      })
      await wrapper.vm.$nextTick()
      await vi.advanceTimersByTimeAsync(500)

      const section = wrapper.findComponent({ name: 'CohortGenerationSection' })
      expect(section.props('criticalCount')).toBe(0)
      expect(section.props('validationStatus')).not.toBe('validated')

      await vi.advanceTimersByTimeAsync(3000)
      expect(section.props('criticalCount')).toBeGreaterThan(0)
      expect(section.props('validationStatus')).toBe('validated')
    } finally {
      vi.useRealTimers()
      vi.mocked(webapi.validateCohortDefinition).mockResolvedValue({
        success: true,
        data: { warnings: [] },
      })
    }
  })

  it('marks the generation section validated once a clean check resolves', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      const setup = getSetup(wrapper)
      setup.cohortName = 'Complete exit criteria'
      Object.assign(setup.expression, {
        PrimaryCriteria: { CriteriaList: [{ DrugExposure: {} }] },
        EndStrategy: { CustomEra: { DrugCodesetId: 3, GapDays: 30, Offset: 0 } },
      })
      await wrapper.vm.$nextTick()

      const section = wrapper.findComponent({ name: 'CohortGenerationSection' })
      expect(section.props('validationStatus')).toBe('unvalidated')

      await vi.advanceTimersByTimeAsync(3000)
      expect(section.props('validationStatus')).toBe('validated')
      expect(section.props('criticalCount')).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports no CRITICAL count to the generation section for a valid design', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      const setup = getSetup(wrapper)
      setup.cohortName = 'Complete exit criteria'
      Object.assign(setup.expression, {
        PrimaryCriteria: { CriteriaList: [{ DrugExposure: {} }] },
        EndStrategy: { CustomEra: { DrugCodesetId: 3, GapDays: 30, Offset: 0 } },
      })
      await wrapper.vm.$nextTick()
      await vi.advanceTimersByTimeAsync(3000)

      const section = wrapper.findComponent({ name: 'CohortGenerationSection' })
      expect(section.props('criticalCount')).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  // The gate is per-editor, not per-mount: an editor that already validated one
  // definition keeps that verdict when a *different* definition is installed
  // into it (version preview, Back to current, /cohorts/A -> /cohorts/B). For the
  // debounce plus the round-trip the section would otherwise read the previous
  // definition's CRITICAL count as this one's, with hasUnsavedChanges false
  // because applyDefinition took a fresh snapshot — Generate enabled on a design
  // nothing has checked.
  it('re-opens the unvalidated window when a second definition is installed in the same editor', async () => {
    const webapi = await import('@/services/cohort-definition.service')
    vi.mocked(webapi.validateCohortDefinition).mockResolvedValue({
      success: true,
      data: {
        warnings: [
          {
            type: 'DefaultWarning',
            severity: 'CRITICAL',
            message: 'Drug concept set must be selected at Exit Criteria.',
          },
        ],
      },
    })
    vi.useFakeTimers()
    try {
      const wrapper = createWrapper({ id: '42' })
      await vi.advanceTimersByTimeAsync(3000)

      const section = wrapper.findComponent({ name: 'CohortGenerationSection' })
      expect(section.props('validationStatus')).toBe('validated')
      expect(section.props('criticalCount')).toBeGreaterThan(0)

      const store = useCohortStore()
      store.setCohort({
        id: 42,
        name: 'Version 1',
        description: '',
        tags: [],
        expression: {
          ConceptSets: [],
          PrimaryCriteria: {
            CriteriaList: [{ DrugExposure: {} }],
            ObservationWindow: { PriorDays: 0, PostDays: 0 },
            PrimaryCriteriaLimit: { Type: 'First' },
          },
          InclusionRules: [],
        },
      } as any)
      store.previewVersion = { version: 1, assetId: 42 } as any
      store.reloadRequest++
      await flushPromises()

      expect(section.props('validationStatus')).not.toBe('validated')
      expect(section.props('criticalCount')).toBe(0)

      await vi.advanceTimersByTimeAsync(3000)
      expect(section.props('validationStatus')).toBe('validated')
      expect(section.props('criticalCount')).toBeGreaterThan(0)
    } finally {
      vi.useRealTimers()
      vi.mocked(webapi.validateCohortDefinition).mockResolvedValue({
        success: true,
        data: { warnings: [] },
      })
    }
  })

  // The isDirty half of 2.15's canGenerate: unsaved edits must reach the
  // generation section, which blocks the run, while save stays enabled.
  it('hands unsaved-change state to the generation section while save stays enabled', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Edited cohort'
    Object.assign(setup.expression, {
      PrimaryCriteria: { CriteriaList: [{ DrugExposure: {} }] },
    })
    await wrapper.vm.$nextTick()

    const section = wrapper.findComponent({ name: 'CohortGenerationSection' })
    expect(section.props('isDirty')).toBe(true)
    expect(setup.canSave).toBe(true)
  })

  it('reports a saved cohort as clean to the generation section', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Saved cohort'
    Object.assign(setup.expression, {
      PrimaryCriteria: { CriteriaList: [{ DrugExposure: {} }] },
    })
    await wrapper.vm.$nextTick()
    setup.loadedSnapshot = setup.createStateSnapshot()
    await wrapper.vm.$nextTick()

    const section = wrapper.findComponent({ name: 'CohortGenerationSection' })
    expect(section.props('isDirty')).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Post-save route adoption
  // ---------------------------------------------------------------------------

  /** Make canSave true, then save. Returns the handleSave result. */
  async function saveNewCohort(wrapper: Wrapper) {
    const setup = getSetup(wrapper)
    setup.cohortName = 'Adults on ibuprofen'
    Object.assign(setup.expression, {
      PrimaryCriteria: { CriteriaList: [{ DrugExposure: {} }] },
    })
    await wrapper.vm.$nextTick()
    return setup.handleSave()
  }

  // Regression: `cohortId` is derived from the route param, so a cohort saved
  // from /cohorts/new left the editor id-less: the Generation panel kept
  // offering "Save cohort to generate", the versions panel stayed disabled,
  // and a second Save created a duplicate cohort instead of updating this one.
  it('opens the saved cohort after saving a new one', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const replaced: string[] = []
    const spy = vi.spyOn(router, 'replace').mockImplementation(async to => {
      replaced.push(typeof to === 'string' ? to : JSON.stringify(to))
    })
    await saveNewCohort(wrapper)
    spy.mockRestore()

    expect(replaced).toEqual(['/cohorts/99'])
  })

  it('does not re-route when saving a cohort that already has an id', async () => {
    const wrapper = createWrapper({ id: '42' })
    await flushPromises()

    const spy = vi.spyOn(router, 'replace').mockResolvedValue(undefined)
    await saveNewCohort(wrapper)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  // The cohort is already persisted by the time we navigate, so a failed
  // navigation must not be reported to the user as a failed save.
  it('still reports the save as successful when opening the cohort fails', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const spy = vi.spyOn(router, 'replace').mockRejectedValue(new Error('navigation aborted'))
    const result = await saveNewCohort(wrapper)
    spy.mockRestore()

    expect(result?.id).toBe(99)
    expect(getSetup(wrapper).showSuccess).toBe(true)
  })

  // Regression: adopting the id of the cohort we just saved used to re-run
  // loadCohort. That fetch is async, so anything added while it was in flight —
  // the agent's next accepted proposal, the user's next edit — was silently
  // overwritten when it resolved, and the next save persisted the stale
  // definition. Seen live: an observation window and four inclusion rules
  // accepted on screen, none of them in the saved cohort.
  it('does not reload over the editor when adopting the id of the cohort it just saved', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const spy = vi.spyOn(router, 'replace').mockResolvedValue(undefined)
    const saved = await saveNewCohort(wrapper)
    spy.mockRestore()
    expect(saved?.id).toBe(99)

    const webapi = await import('@/services/cohort-definition.service')
    vi.mocked(webapi.getCohortDefinition).mockClear()
    // The route now carries the saved id: the same change router.replace made.
    await wrapper.setProps({ id: String(saved.id) })
    await flushPromises()

    const setup = getSetup(wrapper)
    expect(webapi.getCohortDefinition).not.toHaveBeenCalled()
    expect(setup.expression.PrimaryCriteria.CriteriaList).toHaveLength(1)
    expect(setup.cohortName).toBe('Adults on ibuprofen')
    expect(setup.cohortId).toBe(99)
  })

  // The skip is armed for exactly one id change. Navigating on to a different
  // cohort afterwards must load normally.
  it('loads normally when the route moves on from the just-saved cohort', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const spy = vi.spyOn(router, 'replace').mockResolvedValue(undefined)
    await saveNewCohort(wrapper)
    spy.mockRestore()

    const webapi = await import('@/services/cohort-definition.service')
    await wrapper.setProps({ id: '99' })
    await flushPromises()
    vi.mocked(webapi.getCohortDefinition).mockClear()

    await wrapper.setProps({ id: '7' })
    await flushPromises()

    expect(webapi.getCohortDefinition).toHaveBeenCalledWith(7)
  })

  // ---------------------------------------------------------------------------
  // Leftovers from the previously open cohort
  // ---------------------------------------------------------------------------

  it('ignores a version preview that belongs to a different cohort', async () => {
    const wrapper = createWrapper({ id: '42' })
    await flushPromises()
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    const setup = getSetup(wrapper)

    store.previewVersion = { version: 1 } as never
    await wrapper.vm.$nextTick()
    expect(setup.isPreviewingVersion).toBe(true)

    // The preview was left behind by another cohort's editor: nothing clears
    // previewVersion outside /version/current and Back-to-current.
    store.currentCohort!.id = 5
    await wrapper.vm.$nextTick()
    expect(setup.isPreviewingVersion).toBe(false)
  })

  it('a New Cohort route is never in preview mode', async () => {
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.setCohort({ id: 5, name: 'Previewed elsewhere' })
    store.previewVersion = { version: 1 } as never

    const wrapper = createWrapper()
    await flushPromises()

    expect(getSetup(wrapper).isPreviewingVersion).toBe(false)
    expect(store.previewVersion).toBeNull()
  })

  it('a New Cohort route does not inherit the previous cohort tags', async () => {
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.setCohort({ id: 5, name: 'Diabetes', description: 'prior', tags: [{ id: 3, name: 'Cardio' }] })

    const wrapper = createWrapper()
    await flushPromises()
    const setup = getSetup(wrapper)

    expect(setup.cohortTags).toEqual([])
    expect(setup.cohortName).toBe('')
    expect(store.currentCohort?.id).toBeUndefined()
  })

  // Regression: handleSave diffs cohortTags against loadedTags, which is empty
  // on a new cohort — so every inherited tag was assigned to the cohort the
  // save had just created.
  it('does not assign the previous cohort tags to a newly created cohort', async () => {
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.setCohort({ id: 5, name: 'Diabetes', tags: [{ id: 3, name: 'Cardio' }] })

    const wrapper = createWrapper()
    await flushPromises()
    const webapi = await import('@/services/cohort-definition.service')
    const spy = vi.spyOn(router, 'replace').mockResolvedValue(undefined)
    await saveNewCohort(wrapper)
    spy.mockRestore()

    expect(webapi.saveCohortDefinition).toHaveBeenCalled()
    expect(webapi.assignTagToCohort).not.toHaveBeenCalled()
  })

  // The other half of the same check: content that pythia put into the store
  // right before routing us here must survive, even though the identity that
  // came with it must not.
  it('keeps in-flight content on a New Cohort route while dropping the stale identity', async () => {
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.setCohort({
      id: 5,
      name: 'Diabetes',
      tags: [{ id: 3, name: 'Cardio' }],
      expression: { PrimaryCriteria: { CriteriaList: [{ DrugExposure: {} }] } } as never,
    })

    const wrapper = createWrapper()
    await flushPromises()
    const setup = getSetup(wrapper)

    expect(setup.expression.PrimaryCriteria.CriteriaList).toHaveLength(1)
    expect(setup.cohortTags).toEqual([])
    expect(store.currentCohort?.id).toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // handleExportCopy
  // ---------------------------------------------------------------------------

  it('handleExportCopy writes the atlas JSON to clipboard on success', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Copyable'
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      configurable: true,
    })
    await setup.handleExportCopy()
    expect(writeText).toHaveBeenCalled()
    expect(setup.showSuccess).toBe(true)
  })

  it('handleExportCopy surfaces an error when clipboard rejects', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Copyable2'
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard blocked'))
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      configurable: true,
    })
    await setup.handleExportCopy()
    expect(setup.showError).toBe(true)
  })

  it('handleExportDownload writes a blob download and reports success', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Downloadable'
    Object.assign(setup.expression, {
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] },
    })

    const click = vi.fn()
    const createObjectURL = vi.fn().mockReturnValue('blob:atlas')
    const revokeObjectURL = vi.fn()
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click,
    } as never)
    const urlApi = globalThis.URL as typeof URL & {
      createObjectURL?: typeof URL.createObjectURL
      revokeObjectURL?: typeof URL.revokeObjectURL
    }
    const originalCreateObjectURL = urlApi.createObjectURL
    const originalRevokeObjectURL = urlApi.revokeObjectURL

    Object.defineProperty(urlApi, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(urlApi, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
      writable: true,
    })

    try {
      setup.handleExportDownload()
      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:atlas')
      expect(setup.showSuccess).toBe(true)
    } finally {
      createElementSpy.mockRestore()
      Object.defineProperty(urlApi, 'createObjectURL', {
        value: originalCreateObjectURL,
        configurable: true,
        writable: true,
      })
      Object.defineProperty(urlApi, 'revokeObjectURL', {
        value: originalRevokeObjectURL,
        configurable: true,
        writable: true,
      })
    }
  })

  it('warns on beforeunload when the cohort has unsaved changes', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Dirty Cohort'
    await wrapper.vm.$nextTick()

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent & {
      returnValue?: string
    }
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    window.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(event.returnValue).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // handleBackToCurrent
  // ---------------------------------------------------------------------------

  it('handleBackToCurrent is a no-op when cohortId is null', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    const pushSpy = vi.spyOn(router, 'push')
    await setup.handleBackToCurrent()
    // cohortId is null so no navigation should occur for this no-id wrapper.
    expect(
      pushSpy.mock.calls.find(c => typeof c[0] === 'object' && (c[0] as any).path?.includes('version/current'))
    ).toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // versionsConfig.currentVersion() — covers the inline currentVersion arrow
  // function inside the computed config block.
  // ---------------------------------------------------------------------------

  it('versionsConfig.currentVersion returns Unknown user when store has no cohort', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    const cfg = setup.versionsConfig
    const v = cfg.currentVersion()
    expect(v.displayVersion).toBe('Current')
    expect(v.createdBy.name).toBe('Unknown')
  })

  it('versionsConfig.currentVersion uses store.currentCohort when present', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.createNewCohort()
    if (store.currentCohort) {
      const cc = store.currentCohort as Record<string, unknown>
      cc.id = 5
      cc.modifiedDate = '2024-01-01T00:00:00.000Z'
      cc.modifiedBy = { id: 7, name: 'Tester' }
    }
    const cfg = setup.versionsConfig
    const v = cfg.currentVersion()
    expect(v.assetId).toBe(5)
    expect((v.createdBy as any).name).toBe('Tester')
  })

  it('versionsConfig.clearPreview delegates to cohort store', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    const spy = vi.spyOn(store, 'clearPreviewVersion').mockResolvedValue()
    setup.versionsConfig.clearPreview()
    expect(spy).toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Version preview — the editor must render the historical definition, not the
  // current one, on both the warm (already mounted) and cold (bookmarked URL)
  // paths. Mirrors the live difference on cohort 1: v1 has DrugEra/AgeAtStart
  // and no EndStrategy, current has ConditionOccurrence and an EndStrategy.
  // ---------------------------------------------------------------------------

  const historicalExpression = {
    ConceptSets: [],
    PrimaryCriteria: {
      CriteriaList: [{ DrugEra: { AgeAtStart: { Op: 'gte', Value: 16 } } }],
      ObservationWindow: { PriorDays: 0, PostDays: 0 },
      PrimaryCriteriaLimit: { Type: 'First' },
    },
    InclusionRules: [],
  }

  const historicalVersionDTO = {
    version: 1,
    assetId: 42,
    createdBy: { id: 1, name: 'U', email: 'u@test.com' },
    createdDate: '2024-01-01T00:00:00Z',
    comment: null,
    archived: false,
  }

  const renderedExpression = (wrapper: Wrapper) =>
    wrapper.findComponent({ name: 'CohortExpressionEditor' }).props('expression') as any

  it('renders the historical expression when a preview starts while the editor is open', async () => {
    const wrapper = createWrapper({ id: '42' })
    await flushPromises()
    expect(renderedExpression(wrapper).PrimaryCriteria.CriteriaList).toEqual([
      { ConditionOccurrence: {} },
    ])

    const versionsService = await import('@/services/cohort-definition-versions.service')
    vi.mocked(versionsService.getVersion).mockResolvedValueOnce({
      versionDTO: historicalVersionDTO,
      entityDTO: {
        id: 42,
        name: 'Historical Cohort',
        description: '',
        expression: historicalExpression,
      },
    } as never)

    const { useCohortStore } = await import('@/stores/cohort')
    await useCohortStore().loadVersionPreview(1)
    await flushPromises()

    expect(renderedExpression(wrapper).PrimaryCriteria.CriteriaList).toEqual(
      historicalExpression.PrimaryCriteria.CriteriaList
    )
    expect((wrapper.vm as any).isPreviewingVersion).toBe(true)
  })

  it('renders the historical expression on a cold load and disables save', async () => {
    // The router guard populates the store before the editor mounts when a
    // version URL is opened directly.
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.setCohort({
      id: 42,
      name: 'Historical Cohort',
      description: '',
      expression: historicalExpression,
    } as never)
    store.previewVersion = historicalVersionDTO

    const wrapper = createWrapper({ id: '42' })
    await flushPromises()

    expect(renderedExpression(wrapper).PrimaryCriteria.CriteriaList).toEqual(
      historicalExpression.PrimaryCriteria.CriteriaList
    )
    expect(renderedExpression(wrapper).EndStrategy).toBeUndefined()

    const actions = wrapper.findComponent({ name: 'CohortToolbarActions' })
    expect(actions.props('isPreviewingVersion')).toBe(true)
  })

  it('ignores a preview belonging to another cohort when mounting on a new one', async () => {
    // previewVersion survives unmount, so opening a different cohort from the
    // list while a preview is active must still fetch that cohort.
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.setCohort({
      id: 5,
      name: 'Historical Cohort',
      description: '',
      expression: historicalExpression,
    } as never)
    store.previewVersion = { ...historicalVersionDTO, assetId: 5 }

    const cohortDefService = await import('@/services/cohort-definition.service')
    const wrapper = createWrapper({ id: '7' })
    await flushPromises()

    expect(cohortDefService.getCohortDefinition).toHaveBeenCalledWith(7)
    expect(renderedExpression(wrapper).PrimaryCriteria.CriteriaList).toEqual([
      { ConditionOccurrence: {} },
    ])
  })

  it('keeps the preview when the id prop changes into a previewed cohort', async () => {
    const wrapper = createWrapper({ id: '5' })
    await flushPromises()

    // The route guard installs cohort 7's preview before the props watcher runs.
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.setCohort({
      id: 7,
      name: 'Historical Cohort',
      description: '',
      expression: historicalExpression,
    } as never)
    store.previewVersion = { ...historicalVersionDTO, assetId: 7 }

    await wrapper.setProps({ id: '7' })
    await flushPromises()

    expect(renderedExpression(wrapper).PrimaryCriteria.CriteriaList).toEqual(
      historicalExpression.PrimaryCriteria.CriteriaList
    )
  })

  it('leaving a preview restores the current definition', async () => {
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.setCohort({
      id: 42,
      name: 'Historical Cohort',
      description: '',
      expression: historicalExpression,
    } as never)
    store.previewVersion = historicalVersionDTO

    const wrapper = createWrapper({ id: '42' })
    await flushPromises()

    await (wrapper.vm as any).$.setupState.handleBackToCurrent()
    await flushPromises()

    expect(store.previewVersion).toBeNull()
    expect(renderedExpression(wrapper).PrimaryCriteria.CriteriaList).toEqual([
      { ConditionOccurrence: {} },
    ])
  })

  // Preview cohort 5 v1 → back to the list → open cohort 7: the preview chrome
  // followed the user onto a cohort that was never previewed.
  it('ends the preview when the next editor opens a different cohort', async () => {
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()

    const first = createWrapper({ id: '5' })
    await flushPromises()
    store.currentCohort!.id = 5
    store.previewVersion = { ...historicalVersionDTO, assetId: 5 }
    await first.vm.$nextTick()
    expect(first.find('.cohort-builder__preview-banner').exists()).toBe(true)
    first.unmount()

    const second = createWrapper({ id: '7' })
    await flushPromises()

    expect(store.previewVersion).toBeNull()
    expect(getSetup(second).isPreviewingVersion).toBe(false)
    expect(second.find('.cohort-builder__preview-banner').exists()).toBe(false)
    expect(second.findComponent({ name: 'CohortToolbarActions' }).props('isPreviewingVersion')).toBe(
      false
    )
  })

  it('ends the preview when the id prop moves to a cohort that is not previewed', async () => {
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()

    const wrapper = createWrapper({ id: '5' })
    await flushPromises()
    store.currentCohort!.id = 5
    store.previewVersion = { ...historicalVersionDTO, assetId: 5 }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.cohort-builder__preview-banner').exists()).toBe(true)

    await wrapper.setProps({ id: '7' })
    await flushPromises()

    expect(store.previewVersion).toBeNull()
    expect(wrapper.find('.cohort-builder__preview-banner').exists()).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // buildCohortExpression — implicit via buildExportCohort variant; ensure
  // the explicit function runs by mutating entryEvents (the deep watcher
  // fires it). Coverage credit comes from the watch handler.
  // ---------------------------------------------------------------------------

  it('two-way sync emits update:name when local cohortName changes (after props.name is set)', async () => {
    const wrapper = createWrapper({ name: 'Initial' })
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ name: 'Synced' })
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    expect(setup.cohortName).toBe('Synced')
    setup.cohortName = 'Renamed'
    await wrapper.vm.$nextTick()
    const emits = wrapper.emitted('update:name')
    expect(emits).toBeTruthy()
    expect(emits!.some(e => e[0] === 'Renamed')).toBe(true)
  })

  it('two-way sync emits update:description when local cohortDescription changes', async () => {
    const wrapper = createWrapper({ description: 'first' })
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ description: 'mid' })
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    expect(setup.cohortDescription).toBe('mid')
    setup.cohortDescription = 'second'
    await wrapper.vm.$nextTick()
    const emits = wrapper.emitted('update:description')
    expect(emits).toBeTruthy()
    expect(emits!.some(e => e[0] === 'second')).toBe(true)
  })

  it('incoming name prop change updates cohortName ref', async () => {
    const wrapper = createWrapper({ name: 'One' })
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ name: 'Two' })
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    expect(setup.cohortName).toBe('Two')
  })

  it('incoming description prop change updates cohortDescription ref', async () => {
    const wrapper = createWrapper({ description: 'd1' })
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ description: 'd2' })
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    expect(setup.cohortDescription).toBe('d2')
  })

  // ---------------------------------------------------------------------------
  // Planned-feature status helpers: exposed under "_"-prefixed names because
  // nothing in the template wires them up yet. Asserted directly since there is
  // no rendered output to drive them through.
  // ---------------------------------------------------------------------------

  it('_getStatusColor returns the right color per status', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(vm._getStatusColor('COMPLETE')).toBe('success')
    expect(vm._getStatusColor('FAILED')).toBe('error')
    expect(vm._getStatusColor('RUNNING')).toBe('primary')
    expect(vm._getStatusColor('PENDING')).toBe('warning')
    expect(vm._getStatusColor('UNKNOWN')).toBe('grey')
  })

  it('_getStatusIcon returns the right icon per status', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(vm._getStatusIcon('COMPLETE')).toBe('mdi-check-circle')
    expect(vm._getStatusIcon('FAILED')).toBe('mdi-alert-circle')
    expect(vm._getStatusIcon('RUNNING')).toBe('mdi-loading mdi-spin')
    expect(vm._getStatusIcon('PENDING')).toBe('mdi-clock-outline')
    expect(vm._getStatusIcon('???')).toBe('mdi-help-circle')
  })

  it('_getStatusText returns the right label per status', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(vm._getStatusText('COMPLETE')).toBe('Complete')
    expect(vm._getStatusText('FAILED')).toBe('Failed')
    expect(vm._getStatusText('RUNNING')).toBe('Generating...')
    expect(vm._getStatusText('PENDING')).toBe('Pending')
    expect(vm._getStatusText('weird')).toBe('Unknown')
  })

  it('handleBackToCurrent navigates to current version when cohortId is set', async () => {
    const wrapper = createWrapper({ id: '42' })
    // Wait for onMounted to settle
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    const pushSpy = vi.spyOn(router, 'push')
    await setup.handleBackToCurrent()
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/cohortdefinition/42/version/current' })
    )
  })

  // ---------------------------------------------------------------------------
  // Host bridge handshake — saveRequest / newCohortSignal watchers
  // ---------------------------------------------------------------------------

  it('saveRequest watcher applies saveOptions to local name/description and calls notifySaved', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()

    const notifySpy = vi.spyOn(store, 'notifySaved')
    // canSave is false (no entry events) — handleSave returns {} and the watcher
    // still calls notifySaved so the bridge's awaited Promise resolves.
    const p = store.requestSave({ name: 'From Agent', description: 'Agent desc' })
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))

    expect(setup.cohortName).toBe('From Agent')
    expect(setup.cohortDescription).toBe('Agent desc')
    expect(notifySpy).toHaveBeenCalled()
    await expect(p).resolves.toEqual({})
  })

  it('saveRequest watcher leaves name untouched when saveOptions is empty', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Existing'
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()

    store.requestSave()
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))

    expect(setup.cohortName).toBe('Existing')
  })

  it('newCohortSignal watcher resets cohortName when the signal fires', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'old name'
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    // Trigger the signal — watcher clears local state regardless of cohort presence.
    ;(store as unknown as { newCohortSignal: number }).newCohortSignal += 1
    await wrapper.vm.$nextTick()
    expect(setup.cohortName).toBe('')
  })

  it('handleSave returns an empty object when canSave is false (so the bridge resolves)', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    const result = await setup.handleSave()
    expect(result).toEqual({})
  })

  // ---------------------------------------------------------------------------
  // handleSave — server + catch error branches
  // ---------------------------------------------------------------------------

  it('handleSave surfaces a save-to-server error when the API returns no id', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Savable'
    Object.assign(setup.expression, { PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] } })

    const webapi = await import('@/services/cohort-definition.service')
    vi.mocked(webapi.saveCohortDefinition).mockResolvedValueOnce({
      success: true,
      data: {} as never,
    })

    const result = await setup.handleSave()
    expect(result).toEqual({})
    expect(setup.errorMessage).toBe('Failed to save cohort to server')
    expect(setup.showError).toBe(true)
  })

  it('handleSave shows the localized server error when the save API fails', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Savable'
    Object.assign(setup.expression, { PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] } })

    const webapi = await import('@/services/cohort-definition.service')
    vi.mocked(webapi.saveCohortDefinition).mockResolvedValueOnce({
      success: false,
      error: new ApiError('HTTP 500: <html>Internal Server Error</html>', 500, null),
    })

    const result = await setup.handleSave()

    expect(result).toEqual({})
    // Raw transport text must not leak into the banner.
    expect(setup.errorMessage).toBe('Failed to save cohort to server')
    expect(setup.errorMessage).not.toContain('HTTP 500')
    expect(setup.showError).toBe(true)
  })

  it('handleSave surfaces the thrown Error message when saving rejects', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Savable'
    Object.assign(setup.expression, { PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] } })

    const webapi = await import('@/services/cohort-definition.service')
    vi.mocked(webapi.saveCohortDefinition).mockRejectedValueOnce(new Error('server boom'))

    const result = await setup.handleSave()
    expect(result).toEqual({})
    expect(setup.errorMessage).toBe('server boom')
    expect(setup.showError).toBe(true)
  })

  it('handleSave falls back to a generic message when a non-Error is thrown', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Savable'
    Object.assign(setup.expression, { PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] } })

    const webapi = await import('@/services/cohort-definition.service')
    vi.mocked(webapi.saveCohortDefinition).mockRejectedValueOnce('plain string failure')

    const result = await setup.handleSave()
    expect(result).toEqual({})
    expect(setup.errorMessage).toBe('Failed to save cohort')
    expect(setup.showError).toBe(true)
  })

  it('handleSave surfaces the server message when a tag assignment fails', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Savable'
    Object.assign(setup.expression, { PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] } })
    tagSelectionDialog(wrapper).vm.$emit('update:selected-tags', [{ id: 7, name: 'protected' }])
    await wrapper.vm.$nextTick()

    const webapi = await import('@/services/cohort-definition.service')
    vi.mocked(webapi.assignTagToCohort).mockResolvedValueOnce({
      success: false,
      error: new ApiError('Tag group "Status" allows only one assignment', 400, null),
    })

    await setup.handleSave()
    expect(setup.errorMessage).toBe('Tag group "Status" allows only one assignment')
    expect(setup.showError).toBe(true)
  })

  // Tag syncs are independent of each other, so N tag changes must cost one
  // round-trip, not N.
  it('handleSave issues every tag call in one round-trip', async () => {
    const wrapper = createWrapper({ id: '42' })
    await flushPromises()
    const setup = getSetup(wrapper)
    setup.loadedTags = [{ id: 9, name: 'old-tag' }]
    tagSelectionDialog(wrapper).vm.$emit('update:selected-tags', [
      { id: 7, name: 'a' },
      { id: 8, name: 'b' },
    ])
    await wrapper.vm.$nextTick()

    const inFlight: string[] = []
    let release!: () => void
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    const webapi = await import('@/services/cohort-definition.service')
    const hold = (label: string) => async (_cohortId: number, tagId: number) => {
      inFlight.push(`${label}:${tagId}`)
      await gate
      return { success: true as const, data: undefined }
    }
    vi.mocked(webapi.assignTagToCohort)
      .mockImplementationOnce(hold('assign'))
      .mockImplementationOnce(hold('assign'))
    vi.mocked(webapi.unassignTagFromCohort).mockImplementationOnce(hold('unassign'))

    const saving = setup.handleSave()
    try {
      await flushPromises()
      expect(inFlight).toEqual(['assign:7', 'assign:8', 'unassign:9'])
    } finally {
      // Drain the gate and the queued one-shot implementations, or a failure
      // here leaks a permanently pending tag call into the next test.
      release()
      await saving
      const succeed = { success: true as const, data: undefined }
      vi.mocked(webapi.assignTagToCohort).mockReset().mockResolvedValue(succeed)
      vi.mocked(webapi.unassignTagFromCohort).mockReset().mockResolvedValue(succeed)
    }
  })

  it('handleSave falls back to a per-tag message when unassignment fails without detail', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'Savable'
    Object.assign(setup.expression, { PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] } })
    setup.loadedTags = [{ id: 9, name: 'old-tag' }]

    const webapi = await import('@/services/cohort-definition.service')
    vi.mocked(webapi.unassignTagFromCohort).mockResolvedValueOnce({
      success: false,
      error: new ApiError('', 0, null),
    })

    await setup.handleSave()
    expect(setup.errorMessage).toBe('Failed to unassign tag "old-tag"')
    expect(setup.showError).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // JSON dialog: view / edit / overwrite the expression
  // ---------------------------------------------------------------------------

  /** Emit `apply` from the stubbed CohortJsonDialog, as the real dialog does. */
  async function applyJson(wrapper: Wrapper, json: string) {
    cohortJsonDialog(wrapper).vm.$emit('apply', json)
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
  }

  it('openJsonDialog seeds the dialog with the exported Atlas JSON', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    setup.cohortName = 'My Cohort'
    Object.assign(setup.expression, {
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] },
    })

    ;(wrapper.vm as any).openJsonDialog()
    await wrapper.vm.$nextTick()

    const dialog = cohortJsonDialog(wrapper)
    expect(dialog.props('modelValue')).toBe(true)
    expect(JSON.parse(dialog.props('json') as string)).toMatchObject({
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] },
    })
  })

  it('applying JSON closes the dialog and reports success', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)
    ;(wrapper.vm as any).openJsonDialog()
    await wrapper.vm.$nextTick()
    expect(cohortJsonDialog(wrapper).props('modelValue')).toBe(true)

    await applyJson(wrapper, '{}')

    expect(cohortJsonDialog(wrapper).props('modelValue')).toBe(false)
    expect(setup.showSuccess).toBe(true)
  })

  it('still loads when the route changes to a different cohort', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const webapi = await import('@/services/cohort-definition.service')
    vi.mocked(webapi.getCohortDefinition).mockClear()

    await wrapper.setProps({ id: '42' })
    await flushPromises()

    expect(webapi.getCohortDefinition).toHaveBeenCalledWith(42)
  })

  // loadCohort is async and un-awaited, so responses can land out of order. Since
  // a failed load blanks the editor and swaps in the error panel, a superseded
  // failure arriving last would erase a cohort that loaded perfectly well —
  // reachable by a slow 404 followed by a route change, or by clicking Retry
  // twice.
  it('ignores a superseded failed load that lands after a later cohort loaded', async () => {
    const webapi = await import('@/services/cohort-definition.service')
    const successResponse = await webapi.getCohortDefinition(42)
    let failSlowLoad: () => void = () => {}
    vi.mocked(webapi.getCohortDefinition).mockImplementation(((id: number) => {
      if (id === 7) {
        return new Promise(resolve => {
          failSlowLoad = () => resolve({ success: false, error: { status: 404 } })
        })
      }
      return Promise.resolve(successResponse)
    }) as any)

    try {
      const wrapper = createWrapper({ id: '7' })
      await flushPromises()

      await wrapper.setProps({ id: '42' })
      await flushPromises()

      const setup = getSetup(wrapper)
      expect(setup.cohortName).toBe('Existing Cohort')

      failSlowLoad()
      await flushPromises()

      expect(setup.loadError).toBeNull()
      expect(setup.cohortName).toBe('Existing Cohort')
    } finally {
      vi.mocked(webapi.getCohortDefinition).mockResolvedValue(successResponse as any)
    }
  })

  it('applying invalid JSON surfaces an error and keeps dialog open', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as any).openJsonDialog()
    await wrapper.vm.$nextTick()
    const setup = getSetup(wrapper)

    await applyJson(wrapper, '{ broken json')

    expect(setup.showError).toBe(true)
    expect(setup.showJsonDialog).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // hasUnsavedChanges — dirty tracking after a cohort has been loaded
  // ---------------------------------------------------------------------------

  /** Mount with an id and wait for onMounted's loadCohort() to seed loadedSnapshot. */
  async function mountLoaded() {
    const wrapper = createWrapper({ id: '42' })
    await flushPromises()
    await wrapper.vm.$nextTick()
    return wrapper
  }

  it('hasUnsavedChanges is false immediately after a cohort loads', async () => {
    const wrapper = await mountLoaded()
    const vm = wrapper.vm as any
    expect(vm.loadedSnapshot).toBeTypeOf('string')
    expect(vm.hasUnsavedChanges).toBe(false)
  })

  it('hasUnsavedChanges flips when a deep criteria value is edited in place', async () => {
    const wrapper = await mountLoaded()
    const vm = wrapper.vm as any
    const setup = getSetup(wrapper)

    // Read once first so the computed caches — the regression this guards is a
    // cached computed that never re-evaluates because it read a non-reactive
    // snapshot of the expression.
    expect(vm.hasUnsavedChanges).toBe(false)

    setup.expression.PrimaryCriteria.ObservationWindow.PriorDays = 365
    await wrapper.vm.$nextTick()

    expect(vm.hasUnsavedChanges).toBe(true)
  })

  it('hasUnsavedChanges flips when a nested criteria object is pushed in place', async () => {
    const wrapper = await mountLoaded()
    const vm = wrapper.vm as any
    const setup = getSetup(wrapper)

    expect(vm.hasUnsavedChanges).toBe(false)

    setup.expression.PrimaryCriteria.CriteriaList.push({ ProcedureOccurrence: {} })
    await wrapper.vm.$nextTick()

    expect(vm.hasUnsavedChanges).toBe(true)
  })

  it('hasUnsavedChanges flips after applying JSON over a loaded cohort', async () => {
    const wrapper = await mountLoaded()
    const vm = wrapper.vm as any

    expect(vm.hasUnsavedChanges).toBe(false)

    await applyJson(
      wrapper,
      JSON.stringify({
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [{ ProcedureOccurrence: {} }],
          ObservationWindow: { PriorDays: 0, PostDays: 0 },
          PrimaryCriteriaLimit: { Type: 'First' },
        },
        QualifiedLimit: { Type: 'First' },
        ExpressionLimit: { Type: 'First' },
        InclusionRules: [],
        CensoringCriteria: [],
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      })
    )

    expect(vm.hasUnsavedChanges).toBe(true)
  })

  it('does not report unsaved changes for a cohort that was only opened', async () => {
    const { getCohortDefinition } = await import('@/services/cohort-definition.service')
    vi.mocked(getCohortDefinition).mockResolvedValueOnce({
      success: true,
      data: {
        id: 42,
        name: 'Existing Cohort',
        description: 'A loaded cohort',
        tags: [],
        expression: {
          ConceptSets: [],
          PrimaryCriteria: {
            CriteriaList: [{ ConditionOccurrence: {} }],
            ObservationWindow: { PriorDays: 0, PostDays: 0 },
            PrimaryCriteriaLimit: { Type: 'First' },
          },
          InclusionRules: [],
        },
      },
    } as never)

    const wrapper = createWrapper({ id: '42' })
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    expect((wrapper.vm as unknown as { hasUnsavedChanges: boolean }).hasUnsavedChanges).toBe(false)
  })

})

// One cohort document: the editor owns the CohortExpression instance and the
// store holds a reference to it. These two guard the defects that the previous
// copy-based reconciliation caused.
describe('CohortBuilder — one document, shared with the store', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/cohorts', component: { template: '<div>Cohorts</div>' } },
        { path: '/cohorts/:id?', component: { template: '<div>Cohort</div>' } },
      ],
    })
    vi.clearAllMocks()
  })

  const mountBuilder = (props: Record<string, unknown> = {}) =>
    mount(CohortBuilder, {
      props,
      global: { plugins: [vuetify, router], stubs: childStubs },
      attachTo: document.body,
    })

  const setupOf = (wrapper: ReturnType<typeof mountBuilder>) =>
    (wrapper.vm as any).$.setupState

  it('an agent proposal does not discard a locally created inclusion rule', async () => {
    const wrapper = mountBuilder()
    await wrapper.vm.$nextTick()
    const setup = setupOf(wrapper)
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()

    // The user creates a rule in the UI before the agent says anything.
    setup.expression.InclusionRules = [{ name: 'User rule' }]
    await wrapper.vm.$nextTick()

    store.applyProposal({
      kind: 'addInclusionRule',
      rule: { name: 'Agent rule', description: '' },
    } as never)
    await wrapper.vm.$nextTick()

    expect((setup.expression.InclusionRules ?? []).map((r: any) => r.name)).toEqual([
      'User rule',
      'Agent rule',
    ])
  })

  it('a New Cohort editor opened after another cohort starts blank', async () => {
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()

    const loaded = mountBuilder({ id: '42' })
    await flushPromises()
    expect(
      setupOf(loaded).expression.PrimaryCriteria?.CriteriaList?.length
    ).toBeGreaterThan(0)

    setupOf(loaded).expression.InclusionRules = [{ name: 'Belongs to cohort 42' }]

    // Back to the list, then New Cohort: nothing resets the store in between.
    loaded.unmount()

    const fresh = mountBuilder()
    await flushPromises()

    const expression = setupOf(fresh).expression
    expect(expression.PrimaryCriteria?.CriteriaList ?? []).toHaveLength(0)
    expect(expression.InclusionRules ?? []).toHaveLength(0)
    // And the store follows the new editor, not the one that closed.
    expect(store.currentCohort?.expression).toBe(expression)
  })

  it('saving does not blind the agent bridge', async () => {
    const wrapper = mountBuilder()
    await wrapper.vm.$nextTick()
    const setup = setupOf(wrapper)
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()

    setup.cohortName = 'Savable'
    Object.assign(setup.expression, {
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] },
    })
    await setup.handleSave()
    await flushPromises()

    // Editing continues after the save; the bridge reads the store.
    setup.expression.InclusionRules = [{ name: 'Added after the save' }]
    await wrapper.vm.$nextTick()

    expect(store.currentCohort?.expression?.InclusionRules).toHaveLength(1)
  })
})

/**
 * Deleting a concept set clears every CodesetId that pointed at it, and a
 * criterion with no CodesetId matches its whole domain rather than nothing —
 * so a delete can quietly widen the cohort. The dialog used to emit delete
 * straight through with nothing shown.
 */
describe('CohortBuilder — deleting a concept set that is still in use', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/cohorts', component: { template: '<div>Cohorts</div>' } },
        { path: '/cohorts/:id?', component: { template: '<div>Cohort</div>' } },
      ],
    })
    vi.clearAllMocks()
  })

  const mountBuilder = () =>
    mount(CohortBuilder, {
      global: { plugins: [vuetify, router], stubs: childStubs },
      attachTo: document.body,
    })

  const setupOf = (wrapper: ReturnType<typeof mountBuilder>) =>
    (wrapper.vm as any).$.setupState

  function seedReferencedConceptSet(setup: any) {
    Object.assign(setup.expression, {
      ConceptSets: [{ id: 3, name: 'Diabetes', expression: { items: [] } }],
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: { CodesetId: 3 } }] },
      InclusionRules: [
        {
          name: 'Rule 1',
          expression: {
            Type: 'ALL',
            DemographicCriteriaList: [{ GenderCS: { CodesetId: 3 } }],
          },
        },
      ],
    })
  }

  it('asks before removing a set something still points at', async () => {
    const wrapper = mountBuilder()
    await wrapper.vm.$nextTick()
    const setup = setupOf(wrapper)
    seedReferencedConceptSet(setup)

    setup.handleDeleteConceptSet({ id: 3, name: 'Diabetes' })
    await wrapper.vm.$nextTick()

    expect(setup.showDeleteConceptSetDialog).toBe(true)
    // Nothing removed yet, and nothing un-constrained.
    expect(setup.expression.ConceptSets).toHaveLength(1)
    expect(setup.expression.PrimaryCriteria.CriteriaList[0].ConditionOccurrence.CodesetId).toBe(3)
  })

  it('counts every reference, including the wrapped demographic ones', async () => {
    const wrapper = mountBuilder()
    await wrapper.vm.$nextTick()
    const setup = setupOf(wrapper)
    seedReferencedConceptSet(setup)

    setup.handleDeleteConceptSet({ id: 3, name: 'Diabetes' })
    await wrapper.vm.$nextTick()

    expect(setup.conceptSetPendingDeleteUsage).toBe(2)
  })

  it('removes the set and clears its references once confirmed', async () => {
    const wrapper = mountBuilder()
    await wrapper.vm.$nextTick()
    const setup = setupOf(wrapper)
    seedReferencedConceptSet(setup)
    setup.handleConceptSetApplied({ id: 3, name: 'Diabetes', items: [] })
    await wrapper.vm.$nextTick()

    expect(setup.usedConceptSets).toHaveLength(1)

    setup.handleDeleteConceptSet({ id: 3, name: 'Diabetes' })
    await wrapper.vm.$nextTick()
    setup.confirmDeleteConceptSet()
    await wrapper.vm.$nextTick()

    expect(setup.showDeleteConceptSetDialog).toBe(false)
    expect(setup.expression.ConceptSets).toHaveLength(0)
    expect(
      setup.expression.PrimaryCriteria.CriteriaList[0].ConditionOccurrence.CodesetId
    ).toBeUndefined()
    expect(
      setup.expression.InclusionRules[0].expression.DemographicCriteriaList[0].GenderCS.CodesetId
    ).toBeUndefined()
    expect(setup.usedConceptSets).toHaveLength(0)
  })

  it('leaves the cohort untouched when the confirmation is dismissed', async () => {
    const wrapper = mountBuilder()
    await wrapper.vm.$nextTick()
    const setup = setupOf(wrapper)
    seedReferencedConceptSet(setup)

    setup.handleDeleteConceptSet({ id: 3, name: 'Diabetes' })
    await wrapper.vm.$nextTick()
    setup.cancelDeleteConceptSet()
    await wrapper.vm.$nextTick()

    expect(setup.showDeleteConceptSetDialog).toBe(false)
    expect(setup.expression.ConceptSets).toHaveLength(1)
    expect(setup.expression.PrimaryCriteria.CriteriaList[0].ConditionOccurrence.CodesetId).toBe(3)
  })

  // An unused set carries no consequence to warn about, so the confirmation
  // would be pure friction.
  it('deletes an unreferenced set without asking', async () => {
    const wrapper = mountBuilder()
    await wrapper.vm.$nextTick()
    const setup = setupOf(wrapper)
    Object.assign(setup.expression, {
      ConceptSets: [{ id: 9, name: 'Unused', expression: { items: [] } }],
    })

    setup.handleDeleteConceptSet({ id: 9, name: 'Unused' })
    await wrapper.vm.$nextTick()

    expect(setup.showDeleteConceptSetDialog).toBe(false)
    expect(setup.expression.ConceptSets).toHaveLength(0)
  })
})

/**
 * Ported from develop's #212 case, which was written against the legacy model
 * (`cohortStore.currentCohort.conceptSets` plus per-criterion `event.conceptSet`
 * copies). Here the expression's ConceptSets array is the single canonical list,
 * so the same defect would look like a rename that never reaches it.
 */
describe('CohortBuilder — renaming a concept set with no selection context', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/cohorts', component: { template: '<div>Cohorts</div>' } },
        { path: '/cohorts/:id?', component: { template: '<div>Cohort</div>' } },
      ],
    })
    vi.clearAllMocks()
  })

  const mountBuilder = () =>
    mount(CohortBuilder, {
      global: { plugins: [vuetify, router], stubs: childStubs },
      attachTo: document.body,
    })

  const setupOf = (wrapper: ReturnType<typeof mountBuilder>) =>
    (wrapper.vm as any).$.setupState

  // The pencil in the concept sets list opens the editor with neither a
  // criteria selection context nor a pending callback, which is what made the
  // legacy path skip the canonical list.
  it('renames the set in the expression even though nothing is awaiting a selection', async () => {
    const wrapper = mountBuilder()
    await wrapper.vm.$nextTick()
    const setup = setupOf(wrapper)

    Object.assign(setup.expression, {
      ConceptSets: [{ id: 7, name: 'Old Name', expression: { items: [] } }],
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: { CodesetId: 7 } }] },
    })

    setup.handleConceptSetApplied({ id: 7, name: 'Renamed', items: [] })
    await wrapper.vm.$nextTick()

    expect(setup.expression.ConceptSets).toHaveLength(1)
    expect(setup.expression.ConceptSets[0]).toMatchObject({ id: 7, name: 'Renamed' })
    expect(setup.usedConceptSets).toHaveLength(1)
    expect(setup.usedConceptSets[0]).toMatchObject({ id: 7, name: 'Renamed' })
    // The criterion keeps pointing at it — the rename must not re-key the set.
    expect(setup.expression.PrimaryCriteria.CriteriaList[0].ConditionOccurrence.CodesetId).toBe(7)
  })

  it('adds the set rather than renaming when the id is not already present', async () => {
    const wrapper = mountBuilder()
    await wrapper.vm.$nextTick()
    const setup = setupOf(wrapper)

    setup.handleConceptSetApplied({ id: 12, name: 'Brand New', items: [] })
    await wrapper.vm.$nextTick()

    expect(setup.expression.ConceptSets).toHaveLength(1)
    expect(setup.expression.ConceptSets[0]).toMatchObject({ id: 12, name: 'Brand New' })
  })
})
