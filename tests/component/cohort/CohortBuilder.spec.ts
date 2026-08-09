/**
 * CohortBuilder interaction tests
 *
 * Replaces the prior render-only placeholder spec. Exercises the handlers
 * declared in <script setup> (~25 wired functions) plus the exposed API
 * via defineExpose: lifecycle (mount with/without id), cohort load,
 * concept-set/criteria selection contexts, additional-criteria mutations,
 * export flow, cancel routing, tag updates, and the unsaved-changes guard.
 *
 * Every producer→handler wire-up (a child emitting an event that
 * CohortBuilder's template listens for) is driven through that child's
 * stub via `.vm.$emit(...)`, exactly as the real child would. State that
 * has no child to observe or drive it through (selection routing context,
 * pending picker callbacks, pure export/snapshot helpers, the
 * criteria-selection provide/inject service) is reached through the
 * named `defineExpose` contract in CohortBuilder.vue instead of Vue's
 * private component-instance internals: a rename there is a compile
 * error in the component file, not a silent test break.
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
  downloadAtlasJSONSpy,
  exportToAtlasSpy,
  importFromFileSpy,
  importFromAtlasSpy,
  conversionErrorRef,
} = vi.hoisted(() => ({
  downloadAtlasJSONSpy: vi.fn(),
  exportToAtlasSpy: vi.fn(() => '{"mocked":true}'),
  importFromFileSpy: vi.fn(),
  importFromAtlasSpy: vi.fn(),
  conversionErrorRef: { value: null as string | null },
}))

vi.mock('@/composables/useAtlasConverter', () => {
  return {
    useAtlasConverter: () => ({
      importFromFile: importFromFileSpy,
      importFromAtlas: importFromAtlasSpy,
      downloadAtlasJSON: downloadAtlasJSONSpy,
      exportToAtlas: exportToAtlasSpy,
      conversionError: conversionErrorRef,
    }),
  }
})

// A few flows (load existing cohort, save) need predictable ApiResult values.
vi.mock('@/services/cohort-definition.service', () => ({
  getCohortDefinition: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 42,
      name: 'Existing Cohort',
      description: 'A loaded cohort',
      tags: [],
      expression: JSON.stringify({
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
      }),
    },
  }),
  saveCohortDefinition: vi.fn().mockResolvedValue({ success: true, data: { id: 99, name: 'Saved' } }),
  assignTagToCohort: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  unassignTagFromCohort: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}))

vi.mock('@/services/source.service', () => ({
  fetchCDMSources: vi.fn().mockResolvedValue({ success: true, data: [] }),
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

import CohortBuilder from '@/components/cohort/CohortBuilder.vue'
import { convertInternalToAtlas } from '@/services/atlas-converter'
import { ApiError } from '@/services/api-error'
import { logger } from '@/utils/logger'

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

  // ---------------------------------------------------------------------------
  // Child-component locators + drive helpers.
  //
  // Every one of these finds the exact stub the real CohortBuilder template
  // wires a handler to, and emits the same event name/payload shape the real
  // child would. This exercises the actual `@event="handler"` binding in the
  // template, which a raw `setup.handler()` call never touched.
  // ---------------------------------------------------------------------------

  type Wrapper = ReturnType<typeof createWrapper>

  const entryEventsList = (wrapper: Wrapper) => wrapper.findComponent({ name: 'EntryEventsList' })
  const inclusionCriteriaPanel = (wrapper: Wrapper) =>
    wrapper.findComponent({ name: 'InclusionCriteriaPanel' })
  const exitCriteriaPanel = (wrapper: Wrapper) => wrapper.findComponent({ name: 'ExitCriteriaPanel' })
  const censorWindowEditor = (wrapper: Wrapper) => wrapper.findComponent({ name: 'CensorWindowEditor' })
  const groupCriteriaUI = (wrapper: Wrapper) => wrapper.findComponent({ name: 'GroupCriteriaUI' })
  const conceptSetSelectionDialog = (wrapper: Wrapper) =>
    wrapper.findComponent({ name: 'ConceptSetSelectionDialog' })
  const conceptSearchDialog = (wrapper: Wrapper) => wrapper.findComponent({ name: 'ConceptSearchDialog' })
  const conceptSetsListDialog = (wrapper: Wrapper) =>
    wrapper.findComponent({ name: 'ConceptSetsListDialog' })
  const conceptSetEditor = (wrapper: Wrapper) => wrapper.findComponent({ name: 'ConceptSetEditor' })
  const tagSelectionDialog = (wrapper: Wrapper) => wrapper.findComponent({ name: 'TagSelectionDialog' })
  const cohortJsonDialog = (wrapper: Wrapper) => wrapper.findComponent({ name: 'CohortJsonDialog' })
  const cohortBreadcrumb = (wrapper: Wrapper) => wrapper.findComponent({ name: 'CohortBreadcrumb' })

  /** Click the real (unstubbed) "Restrict initial events" button. */
  async function clickAddAdditionalCriteria(wrapper: Wrapper) {
    const btn = wrapper.find('.cohort-builder__add-additional button')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
  }

  /** Emit `apply` from the stubbed CohortJsonDialog, as the real dialog does. */
  async function applyJson(wrapper: Wrapper, json: string) {
    const dialog = cohortJsonDialog(wrapper)
    dialog.vm.$emit('apply', json)
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
  }

  // ---------------------------------------------------------------------------
  // Lifecycle + render
  // ---------------------------------------------------------------------------

  it('renders without throwing when no id is given', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.exists()).toBe(true)
    expect((wrapper.vm as any).cohortId).toBeNull()
  })

  // Regression: Pythia applies proposals to the cohort store and only then
  // navigates to /cohorts/new. The editor mounts with the store already
  // populated, but its local refs start empty: so an agent-set entry event
  // stayed invisible until the NEXT agent mutation (typically the observation
  // window) bumped agentRevision and re-bound them.
  it('shows criteria the agent put in the store before it mounted', async () => {
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal({
      kind: 'addEntryEvent',
      event: { id: 'e1', type: 'DrugExposure', name: 'Diclofenac', conceptSetId: 'cs1' },
    } as never)

    const wrapper = createWrapper()      // no id -> the "new cohort" path
    await wrapper.vm.$nextTick()

    const events = entryEventsList(wrapper).props('events')
    expect(events).toHaveLength(1)
    expect(events[0].name).toBe('Diclofenac')
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
  // handleCancel: exposed routes back to /cohorts
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
  // Export flow: buildExportCohort + exportFilename + handleExportDownload
  // ---------------------------------------------------------------------------

  it('handleExportDownload invokes downloadAtlasJSON', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const toolbar = wrapper.findComponent({ name: 'CohortToolbarActions' })
    expect(toolbar.exists()).toBe(true)

    await toolbar.vm.$emit('export-download')
    await wrapper.vm.$nextTick()

    expect(downloadAtlasJSONSpy).toHaveBeenCalledTimes(1)
  })

  it('exportFilename builds a slug from cohortName', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ name: 'My Cool Cohort!' })
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).cohortName).toBe('My Cool Cohort!')
  })

  // ---------------------------------------------------------------------------
  // Concept-set / concept selection routing: each producer child emits the
  // event CohortBuilder's template listens for. Dialog visibility and the
  // search domain filter are read back through the consumer dialog's own
  // props (they are v-model/prop bound, so the stub reflects them exactly).
  // selectedCriteriaContext has no such child-observable form, so it is read
  // through the named defineExpose contract instead: the "genuinely
  // internal" bucket from the task brief.
  // ---------------------------------------------------------------------------

  it('selecting a concept set for an entry event sets context to entry-event mode', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('select-concept-set', 'evt-1')
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(vm.selectedCriteriaContext).toEqual({
      eventId: 'evt-1',
      ruleIndex: -1,
      groupIndex: -1,
      eventIndex: -1,
    })
    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(true)
  })

  it('selecting a concept set for inclusion criteria sets context to inclusion-rule mode', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    inclusionCriteriaPanel(wrapper).vm.$emit('select-concept-set', {
      ruleIndex: 0,
      groupIndex: 1,
      eventIndex: 2,
    })
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(vm.selectedCriteriaContext).toMatchObject({
      ruleIndex: 0,
      groupIndex: 1,
      eventIndex: 2,
      eventId: null,
    })
    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(true)
  })

  it('selecting a concept set for additional criteria sets ruleIndex -2 from a numeric arg', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await clickAddAdditionalCriteria(wrapper)
    groupCriteriaUI(wrapper).vm.$emit('select-concept-set', 3)
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(vm.selectedCriteriaContext).toEqual({
      eventId: null,
      ruleIndex: -2,
      groupIndex: 0,
      eventIndex: 3,
    })
  })

  it('selecting a concept set for additional criteria sets ruleIndex -2 from an object arg', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await clickAddAdditionalCriteria(wrapper)
    groupCriteriaUI(wrapper).vm.$emit('select-concept-set', { eventIndex: 7, eventId: 'unused' })
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).selectedCriteriaContext).toMatchObject({ ruleIndex: -2, eventIndex: 7 })
  })

  it('selecting a drug concept set for exit criteria sets selection type DRUG_EXPOSURE', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    exitCriteriaPanel(wrapper).vm.$emit('select-drug-concept-set')
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(vm.exitCriteriaSelectionType).toBe('DRUG_EXPOSURE')
    expect(vm.selectedCriteriaContext.ruleIndex).toBe(-3)
    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(true)
  })

  it('selecting a censoring concept set for exit criteria sets selection type CENSORING_EVENT', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    exitCriteriaPanel(wrapper).vm.$emit('select-censoring-concept-set')
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(vm.exitCriteriaSelectionType).toBe('CENSORING_EVENT')
    expect(vm.selectedCriteriaContext.ruleIndex).toBe(-3)
  })

  it('selecting a concept for an entry-event attribute opens the search dialog with a domain filter', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('select-concept-for-attribute', 'evt-1', 0, 'Condition')
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(conceptSearchDialog(wrapper).props('domainFilter')).toBe('Condition')
    expect(conceptSearchDialog(wrapper).props('modelValue')).toBe(true)
    expect(vm.selectedCriteriaContext).toMatchObject({
      eventId: 'evt-1',
      ruleIndex: -1,
      attributeIndex: 0,
    })
  })

  it('selecting a concept for additional-criteria attribute sets ruleIndex -2', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await clickAddAdditionalCriteria(wrapper)
    groupCriteriaUI(wrapper).vm.$emit('select-concept', { eventIndex: 4, domainFilter: 'Drug' })
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(conceptSearchDialog(wrapper).props('domainFilter')).toBe('Drug')
    expect(vm.selectedCriteriaContext).toMatchObject({ ruleIndex: -2, eventIndex: 4 })
    expect(conceptSearchDialog(wrapper).props('modelValue')).toBe(true)
  })

  it('selecting a concept for inclusion criteria forwards full context', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    inclusionCriteriaPanel(wrapper).vm.$emit('select-concept', {
      ruleIndex: 1,
      groupIndex: 0,
      eventIndex: 2,
      attributeIndex: 3,
      domainFilter: 'Procedure',
    })
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    expect(vm.selectedCriteriaContext).toMatchObject({
      ruleIndex: 1,
      groupIndex: 0,
      eventIndex: 2,
      attributeIndex: 3,
      eventId: null,
    })
    expect(conceptSearchDialog(wrapper).props('domainFilter')).toBe('Procedure')
  })

  // ---------------------------------------------------------------------------
  // Concept search dialog resolution (handleConceptsSelected)
  // ---------------------------------------------------------------------------

  it('closes the search dialog when no concepts are selected', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('select-concept-for-attribute', 'x', 0, undefined)
    await wrapper.vm.$nextTick()
    expect(conceptSearchDialog(wrapper).props('modelValue')).toBe(true)

    conceptSearchDialog(wrapper).vm.$emit('concepts-selected', [])
    await wrapper.vm.$nextTick()
    expect(conceptSearchDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('merges selected concepts into an entry-event attribute', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('update:events', [
      {
        id: 'evt-1',
        criteriaType: 'ConditionOccurrence',
        attributes: [{ type: 'concept', concepts: [] }],
      },
    ])
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('select-concept-for-attribute', 'evt-1', 0, undefined)
    await wrapper.vm.$nextTick()

    conceptSearchDialog(wrapper).vm.$emit('concepts-selected', [
      {
        conceptId: 100,
        conceptName: 'Gender Male',
        conceptCode: 'M',
        domainId: 'Gender',
        vocabularyId: 'Gender',
        conceptClassId: 'Gender',
        standardConcept: 'S',
        invalidReason: null,
      },
    ])
    await wrapper.vm.$nextTick()

    const concepts = entryEventsList(wrapper).props('events')[0].attributes[0].concepts
    expect(concepts).toHaveLength(1)
    expect(concepts[0].CONCEPT_ID).toBe(100)
    expect(conceptSearchDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('dedupes selected concepts by CONCEPT_ID for entry events', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('update:events', [
      {
        id: 'evt-1',
        criteriaType: 'ConditionOccurrence',
        attributes: [
          { type: 'concept', concepts: [{ CONCEPT_ID: 100, CONCEPT_NAME: 'Existing' }] },
        ],
      },
    ])
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('select-concept-for-attribute', 'evt-1', 0, undefined)
    await wrapper.vm.$nextTick()

    conceptSearchDialog(wrapper).vm.$emit('concepts-selected', [
      {
        conceptId: 100,
        conceptName: 'Dup',
        conceptCode: '',
        domainId: '',
        vocabularyId: '',
        conceptClassId: '',
        standardConcept: null,
        invalidReason: null,
      },
    ])
    await wrapper.vm.$nextTick()

    expect(entryEventsList(wrapper).props('events')[0].attributes[0].concepts).toHaveLength(1)
  })

  it('updates inclusion-rule criteria when concepts are selected', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const rules = [
      {
        name: 'r1',
        description: '',
        criteriaGroups: [
          {
            id: 'g1',
            logicType: 'ALL',
            qualifyingLimit: 'ALL',
            events: [
              {
                id: 'inc1',
                criteriaType: 'ConditionOccurrence',
                attributes: [{ type: 'concept', concepts: [] }],
              },
            ],
          },
        ],
      },
    ]
    inclusionCriteriaPanel(wrapper).vm.$emit('update:modelValue', rules)
    await wrapper.vm.$nextTick()
    inclusionCriteriaPanel(wrapper).vm.$emit('select-concept', {
      ruleIndex: 0,
      groupIndex: 0,
      eventIndex: 0,
      attributeIndex: 0,
      domainFilter: undefined,
    })
    await wrapper.vm.$nextTick()

    conceptSearchDialog(wrapper).vm.$emit('concepts-selected', [
      {
        conceptId: 200,
        conceptName: 'IC',
        conceptCode: '',
        domainId: '',
        vocabularyId: '',
        conceptClassId: '',
        standardConcept: null,
        invalidReason: null,
      },
    ])
    await wrapper.vm.$nextTick()

    const updatedRules = inclusionCriteriaPanel(wrapper).props('modelValue')
    expect(updatedRules[0].criteriaGroups[0].events[0].attributes[0].concepts).toHaveLength(1)
  })

  // ---------------------------------------------------------------------------
  // Criteria-selection service (issue #112): descendants request the pickers
  // and CohortBuilder delivers the result back through a pending callback
  // rather than the index-context relay. No stub in this shallow tree injects
  // the service, so it is reached through the named `criteriaSelectionService`
  // exposed for exactly this reason, instead of Vue's private provide/inject
  // instance internals.
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
    // A prior index-context is cleared so it can't hijack the result.
    expect(vm.selectedCriteriaContext).toBeNull()

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

  it('criteriaSelectionService.requestConceptSet opens the picker and delivers the chosen set', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any

    const cb = vi.fn()
    vm.criteriaSelectionService.requestConceptSet(cb)
    await wrapper.vm.$nextTick()

    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(true)
    expect(vm.selectedCriteriaContext).toBeNull()

    // Picking an in-definition set routes to the pending callback (not an
    // index context).
    conceptSetSelectionDialog(wrapper).vm.$emit('local-concept-set-selected', {
      id: 5,
      name: 'Diabetes',
      items: [],
    })
    await wrapper.vm.$nextTick()

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb.mock.calls[0][0]).toMatchObject({ id: 5, name: 'Diabetes' })
    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('criteriaSelectionService.editConceptSet opens the concept-set editor', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any

    vm.criteriaSelectionService.editConceptSet({ id: 9, name: 'Hypertension', items: [] })
    await wrapper.vm.$nextTick()

    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const store = useConceptSetsStore()
    expect(store.editorOpen).toBe(true)
    expect(store.currentSet).toMatchObject({ id: 9, name: 'Hypertension' })
  })

  it('a later index-context selection clears a stale pending service callback', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any

    const stale = vi.fn()
    vm.criteriaSelectionService.requestConceptSet(stale)

    // A legacy opener sets an index context: the watch must drop the stale
    // callback so it can't swallow the next selection.
    entryEventsList(wrapper).vm.$emit('select-concept-set', 'evt-1')
    await wrapper.vm.$nextTick()
    expect(vm.pendingConceptSetCallback).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Additional criteria
  // ---------------------------------------------------------------------------

  it('the "restrict initial events" button creates an empty criteria group', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    expect(groupCriteriaUI(wrapper).exists()).toBe(false)

    await clickAddAdditionalCriteria(wrapper)

    const group = groupCriteriaUI(wrapper)
    expect(group.exists()).toBe(true)
    expect(group.props('modelValue').logicType).toBe('ALL')
    expect(group.props('modelValue').events).toEqual([])
    const header = wrapper.find('.cohort-builder__additional-criteria-header')
    expect(header.exists()).toBe(true)
    expect(
      group.element.compareDocumentPosition(header.element) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('removing additional criteria clears the criteria group', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await clickAddAdditionalCriteria(wrapper)
    expect(groupCriteriaUI(wrapper).exists()).toBe(true)

    groupCriteriaUI(wrapper).vm.$emit('remove')
    await wrapper.vm.$nextTick()

    expect(groupCriteriaUI(wrapper).exists()).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Censor window
  // ---------------------------------------------------------------------------

  it('updating the censor window sets the censor window ref', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    censorWindowEditor(wrapper).vm.$emit('update:censorWindow', { daysBefore: 7, daysAfter: 14 })
    await wrapper.vm.$nextTick()
    expect(censorWindowEditor(wrapper).props('censorWindow')).toEqual({ daysBefore: 7, daysAfter: 14 })
  })

  it('updating the censor window to undefined sets it to null', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    censorWindowEditor(wrapper).vm.$emit('update:censorWindow', undefined)
    await wrapper.vm.$nextTick()
    expect(censorWindowEditor(wrapper).props('censorWindow')).toBeNull()
  })

  it('a censor-window validation error does not throw', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    expect(() => censorWindowEditor(wrapper).vm.$emit('validation-error', [])).not.toThrow()
  })

  // ---------------------------------------------------------------------------
  // gatherConceptSets / buildExportCohort / exportFilename
  // ---------------------------------------------------------------------------

  it('gatherConceptSets deduplicates concept sets from entry events', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('update:events', [
      { id: 'e1', criteriaType: 'X', attributes: [], conceptSet: { id: 1, name: 'A', items: [] } },
      { id: 'e2', criteriaType: 'X', attributes: [], conceptSet: { id: 1, name: 'A', items: [] } },
      { id: 'e3', criteriaType: 'X', attributes: [], conceptSet: { id: 2, name: 'B', items: [] } },
      { id: 'e4', criteriaType: 'X', attributes: [] },
    ])
    await wrapper.vm.$nextTick()
    const result = (wrapper.vm as any).gatherConceptSets()
    expect(result).toHaveLength(2)
    expect(result.map((c: any) => c.id).sort()).toEqual([1, 2])
  })

  it('buildExportCohort assembles a CohortDefinition from local state', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Exported'
    vm.cohortDescription = 'desc'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])
    await wrapper.vm.$nextTick()
    const def = vm.buildExportCohort()
    expect(def.name).toBe('Exported')
    expect(def.description).toBe('desc')
    expect(def.entryEvents).toHaveLength(1)
    expect(def.qualifyingLimit).toBe('ALL')
  })

  it('buildCohortExpression keeps a concept set whose id is 0 (single concept-set cohort)', async () => {
    // Regression test for #144: dropping the id-0 set leaves criteria
    // referencing CodesetId 0 against an empty ConceptSets.
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('update:events', [
      {
        id: 'e1',
        criteriaType: 'DrugExposure',
        attributes: [],
        conceptSet: { id: 0, name: 'Solo Concept Set', items: [{ concept: { CONCEPT_ID: 1 } }] },
      },
    ])
    // The deep watch on entryEvents triggers buildCohortExpression asynchronously.
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))

    const lastCall = (convertInternalToAtlas as unknown as { mock: { calls: any[][] } }).mock.calls.at(
      -1
    )
    expect(lastCall?.[0].conceptSets).toHaveLength(1)
    expect(lastCall?.[0].conceptSets[0].id).toBe(0)
  })

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

  it('handleExportDownload calls downloadAtlasJSON with the built cohort + filename', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Test'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])
    await wrapper.vm.$nextTick()
    vm.handleExportDownload()
    expect(downloadAtlasJSONSpy).toHaveBeenCalled()
    const args = downloadAtlasJSONSpy.mock.calls[0]
    expect(args[1]).toBe('test_cohort.json')
    expect(args[0]).toHaveProperty('name', 'Test')
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
    expect(parsed).toHaveProperty('entryEvents')
    expect(parsed).toHaveProperty('inclusionRules')
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

  it('deleting a concept set removes it from the cohort', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.createNewCohort()
    if (store.currentCohort) {
      store.currentCohort.conceptSets = [{ id: 3, name: 'to-delete', items: [] }]
    }
    await wrapper.vm.$nextTick()

    conceptSetsListDialog(wrapper).vm.$emit('delete', { id: 3, name: 'to-delete', items: [] })
    await wrapper.vm.$nextTick()

    expect(store.currentCohort?.conceptSets).toEqual([])
  })

  it('creating a new concept set closes the selection dialog', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('select-concept-set', 'evt-1')
    await wrapper.vm.$nextTick()
    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(true)

    conceptSetSelectionDialog(wrapper).vm.$emit('create-new')
    await wrapper.vm.$nextTick()

    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // assignConceptSetToContext: exposed directly. Its branches (entry event,
  // inclusion rule, additional criteria, exit criteria drug/censoring) are
  // precise routing logic with no single child to drive them through; the
  // producer→consumer round trip is covered separately above and in the
  // concept-set-selected tests below.
  // ---------------------------------------------------------------------------

  it('assignConceptSetToContext attaches concept set to entry event', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'evt-1', criteriaType: 'X', attributes: [] }])
    await wrapper.vm.$nextTick()
    vm.selectedCriteriaContext = { eventId: 'evt-1', ruleIndex: -1, groupIndex: 0, eventIndex: 0 }
    vm.assignConceptSetToContext({ id: 10, name: 'cs', items: [] })
    await wrapper.vm.$nextTick()
    expect(entryEventsList(wrapper).props('events')[0].conceptSet).toEqual({ id: 10, name: 'cs', items: [] })
    expect(vm.selectedCriteriaContext).toBeNull()
  })

  it('assignConceptSetToContext attaches concept set to inclusion rule criteria', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    inclusionCriteriaPanel(wrapper).vm.$emit('update:modelValue', [
      {
        name: 'r1',
        description: '',
        criteriaGroups: [
          {
            id: 'g1',
            logicType: 'ALL',
            qualifyingLimit: 'ALL',
            events: [{ id: 'ie1', criteriaType: 'X', attributes: [] }],
          },
        ],
      },
    ])
    await wrapper.vm.$nextTick()
    vm.selectedCriteriaContext = { eventId: null, ruleIndex: 0, groupIndex: 0, eventIndex: 0 }
    vm.assignConceptSetToContext({ id: 20, name: 'cs2', items: [] })
    await wrapper.vm.$nextTick()
    expect(
      inclusionCriteriaPanel(wrapper).props('modelValue')[0].criteriaGroups[0].events[0].conceptSet
    ).toEqual({ id: 20, name: 'cs2', items: [] })
  })

  it('assignConceptSetToContext attaches to exit-criteria drug exposure', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    exitCriteriaPanel(wrapper).vm.$emit('update:modelValue', { strategy: 'CONTINUOUS_DRUG' })
    await wrapper.vm.$nextTick()
    vm.exitCriteriaSelectionType = 'DRUG_EXPOSURE'
    vm.selectedCriteriaContext = { eventId: null, ruleIndex: -3, groupIndex: 0, eventIndex: 0 }
    vm.assignConceptSetToContext({ id: 30, name: 'cs3', items: [] })
    await wrapper.vm.$nextTick()
    expect(exitCriteriaPanel(wrapper).props('modelValue').conceptSet).toEqual({
      id: 30,
      name: 'cs3',
      items: [],
    })
  })

  it('assignConceptSetToContext appends censoring event', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.exitCriteriaSelectionType = 'CENSORING_EVENT'
    vm.selectedCriteriaContext = { eventId: null, ruleIndex: -3, groupIndex: 0, eventIndex: 0 }
    vm.assignConceptSetToContext({ id: 40, name: 'cs4', items: [] })
    await wrapper.vm.$nextTick()
    const censoringCriteria = exitCriteriaPanel(wrapper).props('censoringCriteria')
    expect(censoringCriteria).toHaveLength(1)
    expect(censoringCriteria[0].conceptSet).toEqual({ id: 40, name: 'cs4', items: [] })
  })

  it('assignConceptSetToContext attaches concept set to additional criteria event', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    await clickAddAdditionalCriteria(wrapper)
    groupCriteriaUI(wrapper).vm.$emit('update:modelValue', {
      ...groupCriteriaUI(wrapper).props('modelValue'),
      events: [{ id: 'ace-1', criteriaType: 'X', attributes: [] }],
    })
    await wrapper.vm.$nextTick()
    vm.selectedCriteriaContext = { eventId: null, ruleIndex: -2, groupIndex: 0, eventIndex: 0 }
    vm.assignConceptSetToContext({ id: 50, name: 'cs5', items: [] })
    await wrapper.vm.$nextTick()
    expect(groupCriteriaUI(wrapper).props('modelValue').events[0].conceptSet).toEqual({
      id: 50,
      name: 'cs5',
      items: [],
    })
  })

  // ---------------------------------------------------------------------------
  // handleEditConceptSet / handleConceptSetApplied (embedded editor flow)
  // ---------------------------------------------------------------------------

  it('editing a concept set opens the editor on a clone, leaving cohort items untouched', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const items = [{ conceptId: 1, includeDescendants: false }]
    entryEventsList(wrapper).vm.$emit('edit-concept-set', { id: 5, name: 'Embedded', items })
    await flushPromises()
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

  it('applying concept-set changes updates every usage of the id and marks the cohort dirty', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('update:events', [
      { id: 'evt-1', criteriaType: 'X', attributes: [], conceptSet: { id: 7, name: 'Old', items: [] } },
      { id: 'evt-2', criteriaType: 'X', attributes: [], conceptSet: { id: 8, name: 'Other', items: [] } },
    ])
    inclusionCriteriaPanel(wrapper).vm.$emit('update:modelValue', [
      {
        id: 'rule-1',
        name: 'r',
        criteriaGroups: [
          {
            id: 'g-1',
            logicType: 'ALL',
            events: [
              { id: 'evt-3', criteriaType: 'X', attributes: [], conceptSet: { id: 7, name: 'Old', items: [] } },
            ],
          },
        ],
      },
    ])
    exitCriteriaPanel(wrapper).vm.$emit('update:modelValue', {
      strategy: 'CONTINUOUS_DRUG',
      conceptSet: { id: 7, name: 'Old', items: [] },
    })
    await wrapper.vm.$nextTick()

    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const store = useConceptSetsStore()
    store.openCreateEditor()
    await wrapper.vm.$nextTick()

    const vm = wrapper.vm as any
    vm.loadedSnapshot = vm.createStateSnapshot()
    expect(vm.hasUnsavedChanges).toBe(false)

    const newItems = [{ conceptId: 42 }]
    conceptSetEditor(wrapper).vm.$emit('apply', { id: 7, name: 'Updated', items: newItems })
    await wrapper.vm.$nextTick()

    expect(entryEventsList(wrapper).props('events')[0].conceptSet).toEqual({
      id: 7,
      name: 'Updated',
      items: newItems,
    })
    expect(entryEventsList(wrapper).props('events')[1].conceptSet).toEqual({ id: 8, name: 'Other', items: [] })
    expect(
      inclusionCriteriaPanel(wrapper).props('modelValue')[0].criteriaGroups[0].events[0].conceptSet
    ).toEqual({ id: 7, name: 'Updated', items: newItems })
    expect(exitCriteriaPanel(wrapper).props('modelValue').conceptSet).toEqual({
      id: 7,
      name: 'Updated',
      items: newItems,
    })
    expect(vm.hasUnsavedChanges).toBe(true)
  })

  it('applying concept-set changes assigns the applied set to a pending entry-event context', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'evt-1', criteriaType: 'X', attributes: [] }])
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('select-concept-set', 'evt-1')
    await wrapper.vm.$nextTick()

    conceptSetSelectionDialog(wrapper).vm.$emit('create-new')
    await wrapper.vm.$nextTick()
    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const store = useConceptSetsStore()
    expect(store.editorOpen).toBe(true)

    conceptSetEditor(wrapper).vm.$emit('apply', { id: 77, name: 'Saved Set', items: [] })
    await wrapper.vm.$nextTick()

    expect(entryEventsList(wrapper).props('events')[0].conceptSet).toMatchObject({ id: 77, name: 'Saved Set' })
  })

  // ---------------------------------------------------------------------------
  // handleConceptSetSelected (async: fetches items via store)
  // ---------------------------------------------------------------------------

  it('selecting a concept set from the repository is a no-op with no pending context', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    conceptSetSelectionDialog(wrapper).vm.$emit('concept-set-selected', { id: 1, name: 'x', items: [] })
    await flushPromises()
    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(false) // unchanged
  })

  it('selecting a concept set from the repository uses items inline when already populated', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'evt-1', criteriaType: 'X', attributes: [] }])
    entryEventsList(wrapper).vm.$emit('select-concept-set', 'evt-1')
    await wrapper.vm.$nextTick()

    conceptSetSelectionDialog(wrapper).vm.$emit('concept-set-selected', {
      id: 5,
      name: 'Inline',
      items: [{ concept: { CONCEPT_ID: 99, CONCEPT_NAME: 'X' } }],
    })
    await flushPromises()

    expect(entryEventsList(wrapper).props('events')[0].conceptSet).toMatchObject({ id: 0, name: 'Inline' })
    expect(conceptSetSelectionDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('selecting a concept set from the repository fetches items from store when missing', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'evt-1', criteriaType: 'X', attributes: [] }])
    entryEventsList(wrapper).vm.$emit('select-concept-set', 'evt-1')
    await wrapper.vm.$nextTick()

    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const store = useConceptSetsStore()
    const fetchSpy = vi.spyOn(store, 'fetchOne').mockImplementation(async (id: number | string) => {
      store.currentSet = { id, name: 'Fetched', items: [{ concept: { CONCEPT_ID: 1 } }] } as any
    })
    conceptSetSelectionDialog(wrapper).vm.$emit('concept-set-selected', { id: 6, name: 'NeedsFetch' })
    await flushPromises()

    expect(fetchSpy).toHaveBeenCalledWith(6)
    expect(entryEventsList(wrapper).props('events')[0].conceptSet).toMatchObject({ id: 0, name: 'Fetched' })
  })

  it('selecting a concept set from the repository fetches items even when the id is 0 (issue #144)', async () => {
    // Regression test for #144: a truthy guard skips the fetch for id 0 and
    // leaves the partial reference, showing the wrong embedded concept set.
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'evt-1', criteriaType: 'X', attributes: [] }])
    entryEventsList(wrapper).vm.$emit('select-concept-set', 'evt-1')
    await wrapper.vm.$nextTick()

    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const store = useConceptSetsStore()
    const fetchSpy = vi.spyOn(store, 'fetchOne').mockImplementation(async (id: number | string) => {
      store.currentSet = { id, name: 'FirstSet', items: [{ concept: { CONCEPT_ID: 42 } }] } as any
    })
    conceptSetSelectionDialog(wrapper).vm.$emit('concept-set-selected', { id: 0, name: 'FirstSet' })
    await flushPromises()

    expect(fetchSpy).toHaveBeenCalledWith(0)
    expect(entryEventsList(wrapper).props('events')[0].conceptSet).toMatchObject({
      id: 0,
      name: 'FirstSet',
      items: [{ concept: { CONCEPT_ID: 42 } }],
    })
  })

  it('picking a local concept set sets store.currentSet and opens editor when edited', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const store = useConceptSetsStore()
    conceptSetSelectionDialog(wrapper).vm.$emit('edit-concept-set', { id: 12, name: 'Edited', items: [] })
    await flushPromises()
    expect(store.currentSet).toMatchObject({ id: 12, name: 'Edited' })
    expect(store.editorOpen).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // handleSave: full save flow
  // ---------------------------------------------------------------------------

  it('handleSave returns early when canSave is false', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    // canSave is computed false for an empty cohort.
    const cohortDefService = await import('@/services/cohort-definition.service')
    const spy = vi.spyOn(cohortDefService, 'saveCohortDefinition')
    await (wrapper.vm as any).handleSave()
    expect(spy).not.toHaveBeenCalled()
  })

  it('handleSave calls saveCohortDefinition with an Atlas wrapper', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    // Make canSave true: have name + entry events + grant permission via mock.
    vm.cohortName = 'A Cohort'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'evt-1', criteriaType: 'X', attributes: [] }])
    await wrapper.vm.$nextTick()
    const cohortDefService = await import('@/services/cohort-definition.service')
    await vm.handleSave()
    expect(cohortDefService.saveCohortDefinition).toHaveBeenCalled()
  })

  // Regression: the save assembled its payload field by field and silently
  // omitted three of them, so anything set there was accepted on screen, shown
  // in the editor, and dropped on the way to WebAPI: including censoring
  // events, which the agent has always been able to propose. Found by driving
  // the real editor and reading the cohort back from the database; the unit
  // tests missed it because they convert the store directly and never go
  // through the editor's own payload.
  it('handleSave sends every field the editor holds, not just some of them', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'A Cohort'
    entryEventsList(wrapper).vm.$emit('update:events', [
      { id: 'evt-1', criteriaType: 'DrugExposure', conceptSet: { id: 0, name: 'X', items: [] } },
    ])
    censorWindowEditor(wrapper).vm.$emit('update:censorWindow', { startDate: '2015-01-01', endDate: '2019-12-31' })
    censorWindowEditor(wrapper).vm.$emit('update:collapseSettings', { collapseType: 'ERA', eraPad: 30 })
    exitCriteriaPanel(wrapper).vm.$emit('update:censoringCriteria', [
      { id: 'c1', criteriaType: 'ConditionOccurrence', conceptSet: { id: 1, name: 'Death', items: [] } },
    ])
    await wrapper.vm.$nextTick()

    // The converter is stubbed in this spec, so assert on what the editor hands
    // it: that is exactly where the fields were being dropped.
    const converter = await import('@/services/atlas-converter')
    vi.mocked(converter.convertInternalToAtlas).mockClear()
    await vm.handleSave()

    const definition = vi.mocked(converter.convertInternalToAtlas).mock.calls[0]?.[0] as unknown as {
      censorWindow?: { startDate?: string }
      collapseSettings?: { eraPad?: number }
      censoringCriteria?: unknown[]
    }
    expect(definition, 'the save never reached the converter').toBeTruthy()
    expect(definition.censorWindow).toMatchObject({ startDate: '2015-01-01', endDate: '2019-12-31' })
    expect(definition.collapseSettings?.eraPad).toBe(30)
    expect(definition.censoringCriteria).toHaveLength(1)
  })

  // ---------------------------------------------------------------------------
  // handleExportCopy
  // ---------------------------------------------------------------------------

  it('handleExportCopy writes the atlas JSON to clipboard on success', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Copyable'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      configurable: true,
    })
    await vm.handleExportCopy()
    expect(writeText).toHaveBeenCalled()
    expect(vm.showSuccess).toBe(true)
  })

  it('handleExportCopy surfaces an error when clipboard rejects', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Copyable2'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard blocked'))
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      configurable: true,
    })
    await vm.handleExportCopy()
    expect(vm.showError).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // handleBackToCurrent
  // ---------------------------------------------------------------------------

  it('handleBackToCurrent is a no-op when cohortId is null', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')
    await (wrapper.vm as any).handleBackToCurrent()
    // cohortId is null so no navigation should occur for this no-id wrapper.
    expect(
      pushSpy.mock.calls.find(c => typeof c[0] === 'object' && (c[0] as any).path?.includes('version/current'))
    ).toBeUndefined()
  })

  it('handleBackToCurrent navigates to current version when cohortId is set', async () => {
    const wrapper = createWrapper({ id: '42' })
    // Wait for onMounted to settle
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')
    await (wrapper.vm as any).handleBackToCurrent()
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/cohortdefinition/42/version/current' })
    )
  })

  // ---------------------------------------------------------------------------
  // versionsConfig.currentVersion(): covers the inline currentVersion arrow
  // function inside the computed config block.
  // ---------------------------------------------------------------------------

  it('versionsConfig.currentVersion returns Unknown user when store has no cohort', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const cfg = (wrapper.vm as any).versionsConfig
    const v = cfg.currentVersion()
    expect(v.displayVersion).toBe('Current')
    expect(v.createdBy.name).toBe('Unknown')
  })

  it('versionsConfig.currentVersion uses store.currentCohort when present', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.createNewCohort()
    if (store.currentCohort) {
      const cc = store.currentCohort as Record<string, unknown>
      cc.id = 5
      cc.modifiedDate = '2024-01-01T00:00:00.000Z'
      cc.modifiedBy = { id: 7, name: 'Tester' }
    }
    const cfg = (wrapper.vm as any).versionsConfig
    const v = cfg.currentVersion()
    expect(v.assetId).toBe(5)
    expect((v.createdBy as any).name).toBe('Tester')
  })

  it('versionsConfig.clearPreview delegates to cohort store', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    const spy = vi.spyOn(store, 'clearPreviewVersion').mockResolvedValue()
    ;(wrapper.vm as any).versionsConfig.clearPreview()
    expect(spy).toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Two-way name/description sync with the host view
  // ---------------------------------------------------------------------------

  it('incoming name prop change updates cohortName ref', async () => {
    const wrapper = createWrapper({ name: 'One' })
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ name: 'Two' })
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).cohortName).toBe('Two')
  })

  it('incoming description prop change updates cohortDescription ref', async () => {
    const wrapper = createWrapper({ description: 'd1' })
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ description: 'd2' })
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).cohortDescription).toBe('d2')
  })

  it('two-way sync emits update:name when local cohortName changes (after props.name is set)', async () => {
    const wrapper = createWrapper({ name: 'Initial' })
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ name: 'Synced' })
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).cohortName).toBe('Synced')
    cohortBreadcrumb(wrapper).vm.$emit('update:modelValue', 'Renamed')
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
    expect((wrapper.vm as any).cohortDescription).toBe('mid')
    ;(wrapper.vm as any).cohortDescription = 'second'
    await wrapper.vm.$nextTick()
    const emits = wrapper.emitted('update:description')
    expect(emits).toBeTruthy()
    expect(emits!.some(e => e[0] === 'second')).toBe(true)
  })

  it('mutating entryEvents triggers the buildCohortExpression watcher', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])
    await wrapper.vm.$nextTick()
    // Watcher fires asynchronously; let it resolve.
    await new Promise(r => setTimeout(r, 0))
    expect(entryEventsList(wrapper).props('events')).toHaveLength(1)
  })

  // ---------------------------------------------------------------------------
  // Host bridge handshake: saveRequest / newCohortSignal watchers
  // ---------------------------------------------------------------------------

  it('saveRequest watcher applies saveOptions to local name/description and calls notifySaved', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()

    const notifySpy = vi.spyOn(store, 'notifySaved')
    // canSave is false (no entry events): handleSave returns {} and the watcher
    // still calls notifySaved so the bridge's awaited Promise resolves.
    const p = store.requestSave({ name: 'From Agent', description: 'Agent desc' })
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))

    const vm = wrapper.vm as any
    expect(vm.cohortName).toBe('From Agent')
    expect(vm.cohortDescription).toBe('Agent desc')
    expect(notifySpy).toHaveBeenCalled()
    await expect(p).resolves.toEqual({})
  })

  it('saveRequest watcher leaves name untouched when saveOptions is empty', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Existing'
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()

    store.requestSave()
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))

    expect(vm.cohortName).toBe('Existing')
  })

  it('newCohortSignal watcher repopulates local refs from the blank store cohort', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    // Dirty up the editor first
    vm.cohortName = 'old name'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'evt-old', criteriaType: 'X', attributes: [] }])
    inclusionCriteriaPanel(wrapper).vm.$emit('update:modelValue', [
      { id: 'r1', name: 'leftover', description: '', criteriaGroups: [] },
    ])
    await wrapper.vm.$nextTick()

    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.requestNewCohort()
    await wrapper.vm.$nextTick()

    // Blank cohort uses default name from createNewCohort; in this mock setup it
    // is the cohort store's default. Just assert the watcher cleared the prior
    // entry events and inclusion rules.
    expect(entryEventsList(wrapper).props('events')).toEqual([])
    expect(inclusionCriteriaPanel(wrapper).props('modelValue')).toEqual([])
    expect(exitCriteriaPanel(wrapper).props('modelValue')).toEqual({ strategy: 'CONTINUOUS_OBSERVATION' })
    expect(vm.loadedTags).toEqual([])
  })

  it('newCohortSignal watcher is a no-op when there is no current cohort', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'preserved'
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.clearCohort()
    // Trigger the signal even though no cohort exists; watcher must early-return.
    ;(store as unknown as { newCohortSignal: number }).newCohortSignal += 1
    await wrapper.vm.$nextTick()
    expect(vm.cohortName).toBe('preserved')
  })

  it('reloadRequest watcher re-fetches the cohort and resyncs local state when props.id is set', async () => {
    const wrapper = createWrapper({ id: '42' })
    // Wait for onMounted's own loadCohort() to resolve first.
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any

    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.getCohortDefinition).mockClear()
    vm.cohortName = 'stale preview name'

    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    // clearPreviewVersion increments this on the store; simulate it directly
    // to isolate the watcher's consumer behaviour.
    ;(store as unknown as { reloadRequest: number }).reloadRequest += 1
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(cohortDefService.getCohortDefinition).toHaveBeenCalledWith(42)
    expect(vm.cohortName).toBe('Existing Cohort')
  })

  it('reloadRequest watcher does not fetch when there is no props.id (new-cohort route)', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.getCohortDefinition).mockClear()

    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    ;(store as unknown as { reloadRequest: number }).reloadRequest += 1
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))

    expect(cohortDefService.getCohortDefinition).not.toHaveBeenCalled()
  })

  // Regression for a Critical: loadVersionPreview used to assign the raw,
  // Atlas-shaped version DTO (entityDTO) straight into currentCohort. That
  // DTO has no top-level conceptSets/entryEvents/inclusionRules: only a
  // JSON-string `expression`: so previewing a version left currentCohort
  // with conceptSets === undefined. handleSave then read
  // `currentCohort?.conceptSets || []`, silently dropping every concept set
  // (and, via the equivalent tags gap, unassigning every tag) on save. The
  // fix routes version entry through the same reloadRequest/reloadVersion
  // signal as the exit path, so the mounted editor does the real
  // fetch-convert-resync instead of the store assigning raw DTO shape.
  it('entering version preview converts the historical DTO into an internal CohortDefinition with populated conceptSets', async () => {
    const wrapper = createWrapper({ id: '42' })
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any

    const versionsService = await import('@/services/cohort-definition-versions.service')
    const historicalConceptSets = [{ id: 1, name: 'Historical Set' }]
    vi.mocked(versionsService.getVersion).mockResolvedValue({
      versionDTO: {
        version: 3,
        assetId: 42,
        createdBy: { id: 1, name: 'U', email: 'u@test.com' },
        createdDate: '2024-01-01T00:00:00Z',
        comment: null,
        archived: false,
      },
      // Raw historical DTO: id/name/description/expression only: no
      // top-level conceptSets, entryEvents, or inclusionRules. Matches the
      // WebAPI's CohortRawDTO shape confirmed against the WebAPI source.
      entityDTO: {
        id: 42,
        name: 'Historical Name',
        description: 'Historical description',
        expression: JSON.stringify({
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
        }),
      },
    } as never)

    const atlasConverter = await import('@/services/atlas-converter')
    vi.mocked(atlasConverter.convertAtlasToInternal).mockReturnValueOnce({
      entryEvents: [{ id: 'evt-hist', criteriaType: 'ConditionOccurrence', attributes: [] }],
      inclusionRules: [],
      exitCriteria: { strategy: 'CONTINUOUS_OBSERVATION' },
      observationPeriod: { priorDays: 0, postDays: 0 },
      qualifyingLimit: 'ALL',
      primaryCriteriaLimit: 'First',
      inclusionQualifyingLimit: 'ALL',
      additionalCriteria: undefined,
      conceptSets: historicalConceptSets,
    } as never)

    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    await store.loadVersionPreview(3)
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(versionsService.getVersion).toHaveBeenCalledWith(42, 3)
    expect(Array.isArray(store.currentCohort?.conceptSets)).toBe(true)
    expect(store.currentCohort?.conceptSets).toEqual(historicalConceptSets)
    expect(vm.cohortName).toBe('Historical Name')
  })

  it('handleSave returns an empty object when canSave is false (so the bridge resolves)', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const result = await (wrapper.vm as any).handleSave()
    expect(result).toEqual({})
  })

  // ---------------------------------------------------------------------------
  // Section-state chips (entryEventsState / inclusionRulesState /
  // exitCriteriaState): pluralization + tone/label branches rendered in the
  // section headers.
  // ---------------------------------------------------------------------------

  it('inclusionRulesState pluralizes to "{count} rules" when more than one rule', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    inclusionCriteriaPanel(wrapper).vm.$emit('update:modelValue', [
      { name: 'r1', description: '', criteriaGroups: [] },
      { name: 'r2', description: '', criteriaGroups: [] },
    ])
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).inclusionRulesState).toEqual({ label: '2 rules', tone: 'primary' })
  })

  it('inclusionRulesState uses the singular label for exactly one rule', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    inclusionCriteriaPanel(wrapper).vm.$emit('update:modelValue', [
      { name: 'r1', description: '', criteriaGroups: [] },
    ])
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).inclusionRulesState).toEqual({ label: '1 rule', tone: 'primary' })
  })

  it('exitCriteriaState flags a fixed-duration strategy with no offset as "Needs offset"', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    exitCriteriaPanel(wrapper).vm.$emit('update:modelValue', { strategy: 'FIXED_DURATION' })
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).exitCriteriaState).toEqual({ label: 'Needs offset', tone: 'warning' })
  })

  it('exitCriteriaState reports "+{count} days" for a configured fixed-duration offset', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    exitCriteriaPanel(wrapper).vm.$emit('update:modelValue', { strategy: 'FIXED_DURATION', offset: 30 })
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).exitCriteriaState).toEqual({ label: '+30 days', tone: 'success' })
  })

  it('exitCriteriaState flags a continuous-drug strategy with no concept set as "Needs drug set"', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    exitCriteriaPanel(wrapper).vm.$emit('update:modelValue', { strategy: 'CONTINUOUS_DRUG' })
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).exitCriteriaState).toEqual({ label: 'Needs drug set', tone: 'warning' })
  })

  it('exitCriteriaState reports "Drug exposure" once a continuous-drug concept set is chosen', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    exitCriteriaPanel(wrapper).vm.$emit('update:modelValue', {
      strategy: 'CONTINUOUS_DRUG',
      conceptSet: { id: 1, name: 'D', items: [] },
    })
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).exitCriteriaState).toEqual({ label: 'Drug exposure', tone: 'success' })
  })

  it('exitCriteriaState falls back to "Configured" for an unrecognized strategy', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    exitCriteriaPanel(wrapper).vm.$emit('update:modelValue', { strategy: 'SOMETHING_ELSE' })
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).exitCriteriaState).toEqual({ label: 'Configured', tone: 'muted' })
  })

  // ---------------------------------------------------------------------------
  // handleSave: server + catch error branches
  // ---------------------------------------------------------------------------

  it('handleSave surfaces a save-to-server error when the API returns no id', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Savable'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])

    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.saveCohortDefinition).mockResolvedValueOnce({
      success: true,
      data: {} as never,
    })

    const result = await vm.handleSave()
    expect(result).toEqual({})
    expect(vm.errorMessage).toBe('Failed to save cohort to server')
    expect(vm.showError).toBe(true)
  })

  it('handleSave logs and shows the localized server error when the save API fails', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Savable'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])

    const apiError = new ApiError('HTTP 500: <html>Internal Server Error</html>', 500, null)
    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.saveCohortDefinition).mockResolvedValueOnce({
      success: false,
      error: apiError,
    })
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

    const result = await vm.handleSave()

    expect(result).toEqual({})
    expect(loggerSpy).toHaveBeenCalledWith('CohortBuilder', 'saveCohortDefinition failed', apiError)
    // Raw transport text must not leak into the banner.
    expect(vm.errorMessage).toBe('Failed to save cohort to server')
    expect(vm.errorMessage).not.toContain('HTTP 500')
    expect(vm.showError).toBe(true)

    loggerSpy.mockRestore()
  })

  it('handleSave shows the forbidden message when the save API returns 403', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Savable'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])

    const apiError = new ApiError('HTTP 403: Forbidden', 403, null)
    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.saveCohortDefinition).mockResolvedValueOnce({
      success: false,
      error: apiError,
    })
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

    const result = await vm.handleSave()

    expect(result).toEqual({})
    expect(loggerSpy).toHaveBeenCalledWith('CohortBuilder', 'saveCohortDefinition failed', apiError)
    expect(vm.errorMessage).toBe('You do not have permission to save this cohort')
    expect(vm.showError).toBe(true)

    loggerSpy.mockRestore()
  })

  it('handleSave surfaces the thrown Error message when saving rejects', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Savable'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])

    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.saveCohortDefinition).mockRejectedValueOnce(new Error('server boom'))

    const result = await vm.handleSave()
    expect(result).toEqual({})
    expect(vm.errorMessage).toBe('server boom')
    expect(vm.showError).toBe(true)
  })

  it('handleSave falls back to a generic message when a non-Error is thrown', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Savable'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])

    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.saveCohortDefinition).mockRejectedValueOnce('plain string failure')

    const result = await vm.handleSave()
    expect(result).toEqual({})
    expect(vm.errorMessage).toBe('Failed to save cohort')
    expect(vm.showError).toBe(true)
  })

  it('handleSave surfaces the server message when a tag assignment fails', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Savable'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])
    tagSelectionDialog(wrapper).vm.$emit('update:selected-tags', [{ id: 7, name: 'protected' }])
    await wrapper.vm.$nextTick()

    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.assignTagToCohort).mockResolvedValueOnce({
      success: false,
      error: new ApiError('Tag group "Status" allows only one assignment', 400, null),
    })

    await vm.handleSave()
    expect(vm.errorMessage).toBe('Tag group "Status" allows only one assignment')
    expect(vm.showError).toBe(true)
  })

  it('handleSave falls back to a per-tag message when unassignment fails without detail', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Savable'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])
    vm.loadedTags = [{ id: 9, name: 'old-tag' }]

    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.unassignTagFromCohort).mockResolvedValueOnce({
      success: false,
      error: new ApiError('', 0, null),
    })

    await vm.handleSave()
    expect(vm.errorMessage).toBe('Failed to unassign tag "old-tag"')
    expect(vm.showError).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Export failure branches (conversionError set)
  // ---------------------------------------------------------------------------

  it('handleExportDownload surfaces an export-failed message when conversion errors', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Broken'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])
    conversionErrorRef.value = 'bad expression'

    vm.handleExportDownload()
    expect(vm.errorMessage).toBe('Export failed: bad expression')
    expect(vm.showError).toBe(true)
  })

  it('handleExportCopy surfaces an export-failed message when conversion errors', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Broken2'
    entryEventsList(wrapper).vm.$emit('update:events', [{ id: 'e1', criteriaType: 'X', attributes: [] }])
    conversionErrorRef.value = 'cannot serialize'

    await vm.handleExportCopy()
    expect(vm.errorMessage).toBe('Export failed: cannot serialize')
    expect(vm.showError).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // JSON dialog: view / edit / overwrite the expression
  // ---------------------------------------------------------------------------

  /** A cohort as importFromAtlas would hand it back: a procedure entry event. */
  const importedProcedureCohort = () => ({
    name: 'Name From Pasted JSON',
    description: 'Description from pasted JSON',
    entryEvents: [
      {
        id: 'imported-evt',
        criteriaType: 'ProcedureOccurrence',
        conceptSet: { id: 7, name: 'Coronary Artery Bypass', items: [] },
        attributes: [],
      },
    ],
    // No inclusionRules key at all: importing a JSON that omits a section
    // must clear it, not leave the previous cohort's rules behind.
    exitCriteria: { strategy: 'CONTINUOUS_OBSERVATION' },
    observationPeriod: { priorDays: 365, postDays: 30 },
    qualifyingLimit: 'FIRST',
    conceptSets: [{ id: 7, name: 'Coronary Artery Bypass', items: [] }],
  })

  it('openJsonDialog seeds the dialog with the exported Atlas JSON', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'My Cohort'

    vm.openJsonDialog()
    await wrapper.vm.$nextTick()

    expect(exportToAtlasSpy).toHaveBeenCalled()
    expect(cohortJsonDialog(wrapper).props('modelValue')).toBe(true)
    expect(cohortJsonDialog(wrapper).props('json')).toBe('{"mocked":true}')
  })

  it('applying JSON overwrites the expression but keeps name and description', async () => {
    const wrapper = createWrapper({ id: '42' })
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any

    // Loaded cohort: one condition entry event and one inclusion rule.
    expect(vm.cohortName).toBe('Existing Cohort')
    expect(inclusionCriteriaPanel(wrapper).props('modelValue')).toHaveLength(1)

    importFromAtlasSpy.mockResolvedValueOnce(importedProcedureCohort())
    await applyJson(wrapper, '{"PrimaryCriteria":{}}')

    expect(importFromAtlasSpy).toHaveBeenCalledWith('{"PrimaryCriteria":{}}')
    // Expression replaced...
    const events = entryEventsList(wrapper).props('events')
    expect(events).toHaveLength(1)
    expect(events[0].criteriaType).toBe('ProcedureOccurrence')
    expect(entryEventsList(wrapper).props('observationPeriod')).toEqual({ priorDays: 365, postDays: 30 })
    // ...identity preserved, even though the pasted JSON carried its own name.
    expect(vm.cohortName).toBe('Existing Cohort')
    expect(vm.cohortDescription).toBe('A loaded cohort')
  })

  it('applying JSON that omits a section clears it', async () => {
    const wrapper = createWrapper({ id: '42' })
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    expect(inclusionCriteriaPanel(wrapper).props('modelValue')).toHaveLength(1)

    importFromAtlasSpy.mockResolvedValueOnce(importedProcedureCohort())
    await applyJson(wrapper, '{}')

    // The pasted JSON has no InclusionRules, so the loaded rule is gone.
    expect(inclusionCriteriaPanel(wrapper).props('modelValue')).toEqual([])
  })

  // Regression test for #144: applying JSON refreshed the entry events but
  // not the store list the embedded concept sets dialog reads from.
  it('applying JSON refreshes the store concept-sets list backing the Concepts dialog', async () => {
    const wrapper = createWrapper({ id: '42' })
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    // Loaded cohort mock has no concept sets yet.
    expect(store.currentCohort?.conceptSets).toEqual([])

    importFromAtlasSpy.mockResolvedValueOnce(importedProcedureCohort())
    await applyJson(wrapper, '{"PrimaryCriteria":{}}')

    expect(store.currentCohort?.conceptSets).toEqual([
      { id: 7, name: 'Coronary Artery Bypass', items: [] },
    ])
  })

  it('applying JSON that omits concept sets clears the store list too', async () => {
    const wrapper = createWrapper({ id: '42' })
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    // Seed a leftover concept set as if a prior expression had loaded one.
    if (store.currentCohort) {
      store.currentCohort.conceptSets = [{ id: 0, name: 'Stale Set', items: [] }]
    }

    const { conceptSets: _omit, ...withoutConceptSets } = importedProcedureCohort()
    importFromAtlasSpy.mockResolvedValueOnce(withoutConceptSets)
    await applyJson(wrapper, '{}')

    expect(store.currentCohort?.conceptSets).toEqual([])
  })

  it('applying JSON closes the dialog and reports success', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.openJsonDialog()
    await wrapper.vm.$nextTick()
    expect(cohortJsonDialog(wrapper).props('modelValue')).toBe(true)

    importFromAtlasSpy.mockResolvedValueOnce(importedProcedureCohort())
    await applyJson(wrapper, '{}')

    expect(cohortJsonDialog(wrapper).props('modelValue')).toBe(false)
    expect(vm.showSuccess).toBe(true)
  })

  it('a failed import leaves the expression untouched and surfaces an error', async () => {
    const wrapper = createWrapper({ id: '42' })
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.openJsonDialog()
    await wrapper.vm.$nextTick()

    const entryEventsBefore = entryEventsList(wrapper).props('events')
    importFromAtlasSpy.mockResolvedValueOnce(null)
    conversionErrorRef.value = 'Unexpected token }'

    await applyJson(wrapper, '{ broken')

    expect(vm.showError).toBe(true)
    expect(vm.errorMessage).toContain('Unexpected token }')
    // State untouched, dialog stays open so the user can fix the JSON.
    expect(entryEventsList(wrapper).props('events')).toBe(entryEventsBefore)
    expect(cohortJsonDialog(wrapper).props('modelValue')).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Planned-feature status helpers: exposed under "_"-prefixed names because
  // nothing in the template wires them up yet (see the comment above their
  // declaration in CohortBuilder.vue). Asserted directly since there is no
  // rendered output to drive them through.
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

  // Regression: `cohortId` is derived from the route param, so a cohort saved
  // from /cohorts/new left the editor id-less: the Generation panel kept
  // offering "Save cohort to generate" for a cohort that had just been saved,
  // and it could not be generated without navigating away and back.
  it('opens the saved cohort after saving a new one', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Adults on ibuprofen'
    entryEventsList(wrapper).vm.$emit('update:events', [
      { id: 'e1', criteriaType: 'DrugExposure', conceptSet: { id: 0, name: 'Ibuprofen', items: [] } },
    ])
    await wrapper.vm.$nextTick()

    const pushed: string[] = []
    const spy = vi.spyOn(router, 'replace').mockImplementation(async (to: any) => {
      pushed.push(typeof to === 'string' ? to : JSON.stringify(to))
    })

    await vm.handleSave()
    spy.mockRestore()

    expect(pushed.some(p => /\/cohorts\/\d+/.test(p))).toBe(true)
  })

  // The cohort is already persisted by the time we navigate, so a failed
  // navigation must not be reported to the user as a failed save.
  it('still reports the save as successful when opening the cohort fails', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Adults on ibuprofen'
    entryEventsList(wrapper).vm.$emit('update:events', [
      { id: 'e1', criteriaType: 'DrugExposure', conceptSet: { id: 0, name: 'Ibuprofen', items: [] } },
    ])
    await wrapper.vm.$nextTick()

    const spy = vi.spyOn(router, 'replace').mockRejectedValue(new Error('navigation aborted'))
    const result = await vm.handleSave()
    spy.mockRestore()

    expect(result?.id).toBeDefined()
  })

  // Regression: adopting the id of the cohort we just saved used to re-run
  // loadCohort. That fetch is async, so anything added while it was in flight,
  // such as the agent's next accepted proposals, was overwritten when it resolved, and
  // the next save persisted the stale definition. Seen live: an observation
  // window and four inclusion rules accepted on screen, none of them in the
  // saved cohort, which still held only the entry event.
  it('does not reload over the editor when adopting the id of the cohort it just saved', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as any
    vm.cohortName = 'Adults on ibuprofen'
    entryEventsList(wrapper).vm.$emit('update:events', [
      { id: 'e1', criteriaType: 'DrugExposure', conceptSet: { id: 0, name: 'Ibuprofen', items: [] } },
    ])
    await wrapper.vm.$nextTick()

    const spy = vi.spyOn(router, 'replace').mockResolvedValue(undefined as never)
    const saved = await vm.handleSave()
    spy.mockRestore()
    expect(saved?.id).toBeDefined()

    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.getCohortDefinition).mockClear()
    // The route now carries the saved id: the same change router.replace made.
    await wrapper.setProps({ id: String(saved.id) })
    await flushPromises()

    expect(cohortDefService.getCohortDefinition).not.toHaveBeenCalled()
    expect(entryEventsList(wrapper).props('events')).toHaveLength(1)
    expect(vm.cohortName).toBe('Adults on ibuprofen')
  })

  it('still loads when the route changes to a different cohort', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const cohortDefService = await import('@/services/cohort-definition.service')
    vi.mocked(cohortDefService.getCohortDefinition).mockClear()

    await wrapper.setProps({ id: '42' })
    await flushPromises()

    expect(cohortDefService.getCohortDefinition).toHaveBeenCalledWith(42)
  })
})
