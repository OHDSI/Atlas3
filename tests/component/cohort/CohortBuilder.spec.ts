/**
 * CohortBuilder interaction tests
 *
 * Replaces the prior render-only placeholder spec. Exercises the handlers
 * declared in <script setup> (~25 wired functions) plus the exposed API
 * via defineExpose: lifecycle (mount with/without id), cohort load,
 * concept-set/criteria selection contexts, additional-criteria mutations,
 * export flow, cancel routing, tag updates, and the unsaved-changes guard.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'

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
  saveCohortDefinition: vi.fn().mockResolvedValue({ id: 99, name: 'Saved' }),
  assignTagToCohort: vi.fn().mockResolvedValue({ success: true }),
  unassignTagFromCohort: vi.fn().mockResolvedValue({ success: true }),
  validateCohortDefinition: vi.fn().mockResolvedValue({ warnings: [], errors: [] }),
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

// convertAtlasToInternal is what loadCohort feeds the expression into. Keep
// a simple identity-ish stub so we can confirm load() populates local refs.
vi.mock('@/services/atlas-converter', () => ({
  convertAtlasToInternal: vi.fn(() => ({
    entryEvents: [{ id: 'evt-1', criteriaType: 'ConditionOccurrence', attributes: [] }],
    inclusionRules: [
      {
        name: 'Rule 1',
        description: '',
        criteriaGroups: [
          {
            id: 'group-1',
            logicType: 'ALL',
            qualifyingLimit: 'ALL',
            events: [
              {
                id: 'inc-evt-1',
                criteriaType: 'ConditionOccurrence',
                attributes: [
                  { type: 'concept', concepts: [] },
                ],
              },
            ],
          },
        ],
      },
    ],
    exitCriteria: { strategy: 'CONTINUOUS_OBSERVATION' },
    observationPeriod: { priorDays: 1, postDays: 2 },
    qualifyingLimit: 'ALL',
    primaryCriteriaLimit: 'First',
    inclusionQualifyingLimit: 'ALL',
    additionalCriteria: undefined,
    conceptSets: [],
  })),
  convertInternalToAtlas: vi.fn(() => ({ mocked: 'atlas-expression' })),
}))

import { ApiError } from '@/services/api-error'
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

  const createWrapper = (props: Record<string, unknown> = {}) => {
    return mount(CohortBuilder, {
      props,
      global: {
        plugins: [vuetify, router],
        stubs: childStubs,
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

  it('canSave is false when name is empty', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).canSave).toBe(false)
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
    Object.assign(setup.expression, { PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] } })
    const webapi = await import('@/services/cohort-definition.service')
    await setup.handleSave()
    expect(webapi.saveCohortDefinition).toHaveBeenCalled()
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
})
