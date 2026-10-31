import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { defineComponent, h, ref, type Ref } from 'vue'
import { RouterView } from 'vue-router'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const access = vi.hoisted(() => ({
  hasPermission: vi.fn((_perm: string) => true),
  canWrite: { value: true },
  entityAccessArgs: [] as unknown[][],
}))

vi.mock('@/services/cohort-definition.service', () => ({
  fetchCDMSources: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getAllConceptSets: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getCohortDefinition: vi.fn(),
  saveCohortDefinition: vi.fn(),
  validateCohortDefinition: vi.fn().mockResolvedValue({ success: true, data: { warnings: [] } }),
  assignTagToCohort: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  unassignTagFromCohort: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  getCohortPrintFriendly: vi.fn().mockResolvedValue({ success: true, data: '<p></p>' }),
}))

vi.mock('@/services/cohort-sql.service', () => ({
  generateCohortSql: vi.fn().mockResolvedValue({ success: true, data: 'select 1' }),
  translateSql: vi.fn().mockResolvedValue({ success: true, data: 'select 1' }),
  SQLRENDER_DIALECTS: [],
}))

vi.mock('@/services/concept-set.service', () => ({
  getConceptSetById: vi.fn().mockResolvedValue(null),
  getAllConceptSets: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/services/cohort-definition-versions.service', () => ({
  getVersions: vi.fn().mockResolvedValue([]),
  getVersion: vi.fn().mockResolvedValue(null),
  updateVersion: vi.fn().mockResolvedValue(null),
  copyVersion: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: access.hasPermission,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    cacheHitRate: { value: 1 },
    clearCache: () => {},
  }),
}))

vi.mock('@/composables/useEntityAccess', async () => {
  const { computed } = await import('vue')
  return {
    useEntityAccess: (...args: unknown[]) => {
      access.entityAccessArgs.push(args)
      return {
        canRead: computed(() => true),
        canWrite: computed(() => access.canWrite.value),
        canDelete: computed(() => true),
      }
    },
    useSourceAccessFor: () => ({ canRead: () => true, canWrite: () => true }),
  }
})

import {
  getCohortDefinition,
  saveCohortDefinition,
  assignTagToCohort,
} from '@/services/cohort-definition.service'
import { getConceptSetById, getAllConceptSets } from '@/services/concept-set.service'
import { getVersions } from '@/services/cohort-definition-versions.service'
import { useCohortStore } from '@/stores/cohort'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { CohortExpression } from '@/models/circe-types'
import type { VersionsConfig } from '@/components/versions/types'
import type { Tag } from '@/models/cohort.types'
import CohortBuilder from '@/components/cohort/CohortBuilder.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const stubs = {
  ConceptSetSelectionDialog: true,
  ConceptSearchDialog: true,
  ConceptSetEditor: true,
  CensorWindowEditor: true,
  CohortGenerationSection: true,
  VersionsTabContent: true,
  CohortBreadcrumb: true,
  CohortToolbarActions: true,
  CohortToolbarStatus: true,
  ConceptSetsListDialog: true,
  ValidationMessagesDialog: true,
  CohortJsonDialog: true,
  CohortSqlDialog: true,
  CohortPrintFriendlyDialog: true,
  CohortExpressionEditor: true,
  EntityAccessDialog: true,
  TagSelectionDialog: true,
  AtlasSnackbar: true,
  'router-link': true,
} as const

interface BuilderVm {
  cohortName: string
  cohortDescription: string
  loadedTags: Tag[]
  isConfirmingNavigation: boolean
  showUnsavedDialog: boolean
  totalConceptSets: number
  unusedConceptSetCount: number
  validationCount: number
  validationColor: string
  authorship: Record<string, unknown> | null
  versionsConfig: VersionsConfig
  openValidationDialog: () => void
  openVersionsDialog: () => void
  confirmLeaveUnsaved: () => void
  handleSave: () => Promise<{ id?: number; name?: string }>
  handleExportDownload: () => void
  handleExportCopy: () => Promise<void>
}

type Wrapper = VueWrapper

function blankExpression(overrides: Partial<CohortExpression> = {}): CohortExpression {
  return {
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
    ...overrides,
  } as CohortExpression
}

function cohortResult(overrides: Record<string, unknown> = {}) {
  return {
    success: true as const,
    data: {
      id: 42,
      name: 'Existing Cohort',
      description: 'A loaded cohort',
      tags: [],
      expression: blankExpression(),
      ...overrides,
    },
  }
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (reason: unknown) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('CohortBuilder behaviors', () => {
  let router: Router
  const mounted: Wrapper[] = []

  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    vi.clearAllMocks()
    access.hasPermission.mockImplementation(() => true)
    access.canWrite.value = true
    access.entityAccessArgs.length = 0
    vi.mocked(getCohortDefinition).mockResolvedValue(cohortResult() as never)
    vi.mocked(saveCohortDefinition).mockResolvedValue({ success: true, data: { id: 99 } } as never)
    vi.mocked(getVersions).mockResolvedValue([])
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/cohorts', component: { template: '<div />' } },
        { path: '/cohorts/:id?', component: { template: '<div />' } },
        { path: '/cohortdefinition/:id/version/:version', component: { template: '<div />' } },
      ],
    })
  })

  afterEach(() => {
    while (mounted.length) mounted.pop()?.unmount()
    vi.useRealTimers()
  })

  function mountBuilder(props: Record<string, unknown> = {}): Wrapper {
    const wrapper = mount(CohortBuilder, {
      props,
      global: { plugins: [vuetify, router], stubs },
      attachTo: document.body,
    })
    mounted.push(wrapper)
    return wrapper
  }

  async function mountLoaded(overrides: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
    vi.mocked(getCohortDefinition).mockResolvedValue(cohortResult(overrides) as never)
    const wrapper = mountBuilder({ id: '42', ...props })
    await flushPromises()
    return wrapper
  }

  const vmOf = (wrapper: Wrapper) => wrapper.vm as unknown as BuilderVm
  const child = (wrapper: Wrapper, name: string) => wrapper.findComponent({ name })
  const propOf = (wrapper: Wrapper, name: string, prop: string) =>
    (child(wrapper, name).props() as Record<string, unknown>)[prop]
  const snackbars = (wrapper: Wrapper) => wrapper.findAllComponents({ name: 'AtlasSnackbar' })
  const errorSnackbar = (wrapper: Wrapper) =>
    snackbars(wrapper).find(s => s.props('severity') === 'danger')
  const successSnackbar = (wrapper: Wrapper) =>
    snackbars(wrapper).find(s => s.props('severity') === 'success')
  const loadingOverlay = (wrapper: Wrapper) =>
    wrapper.findAllComponents({ name: 'VOverlay' }).find(o => o.props('persistent') === true)
  const dialogByEyebrow = (wrapper: Wrapper, eyebrow: string) =>
    wrapper.findAllComponents({ name: 'AtlasDialog' }).find(d => d.props('eyebrow') === eyebrow)

  async function rename(wrapper: Wrapper, name: string) {
    child(wrapper, 'CohortBreadcrumb').vm.$emit('update:modelValue', name)
    await flushPromises()
  }

  function liveExpression(): CohortExpression {
    const expression = useCohortStore().currentCohort?.expression
    if (!expression) throw new Error('no attached expression')
    return expression
  }

  describe('initial state', () => {
    it('starts a new cohort with every dialog and message closed', async () => {
      const wrapper = mountBuilder()
      await flushPromises()
      const vm = vmOf(wrapper)

      expect(propOf(wrapper, 'ValidationMessagesDialog', 'modelValue')).toBe(false)
      expect(propOf(wrapper, 'EntityAccessDialog', 'modelValue')).toBe(false)
      expect(propOf(wrapper, 'CohortJsonDialog', 'modelValue')).toBe(false)
      expect(propOf(wrapper, 'CohortJsonDialog', 'json')).toBe('')
      expect(propOf(wrapper, 'CohortSqlDialog', 'modelValue')).toBe(false)
      expect(propOf(wrapper, 'CohortSqlDialog', 'filename')).toBe('cohort_cohort.sql')
      expect(propOf(wrapper, 'CohortPrintFriendlyDialog', 'modelValue')).toBe(false)
      expect(dialogByEyebrow(wrapper, 'VERSIONS')?.props('modelValue')).toBe(false)
      expect(errorSnackbar(wrapper)?.props()).toMatchObject({ modelValue: false, text: '' })
      expect(successSnackbar(wrapper)?.props()).toMatchObject({ modelValue: false, text: '' })
      expect(loadingOverlay(wrapper)?.props('modelValue')).toBe(false)
      expect(vm.cohortDescription).toBe('')
      expect(vm.loadedTags).toEqual([])
      expect(vm.isConfirmingNavigation).toBe(false)
      expect(vm.showUnsavedDialog).toBe(false)
    })

    it('shows the loading overlay until an existing cohort arrives', async () => {
      const pending = deferred<ReturnType<typeof cohortResult>>()
      vi.mocked(getCohortDefinition).mockReturnValueOnce(pending.promise as never)
      const wrapper = mountBuilder({ id: '42' })
      await wrapper.vm.$nextTick()
      expect(loadingOverlay(wrapper)?.props('modelValue')).toBe(true)

      pending.resolve(cohortResult())
      await flushPromises()
      expect(loadingOverlay(wrapper)?.props('modelValue')).toBe(false)
    })

    it('fetches the repository concept sets on mount', async () => {
      mountBuilder()
      await flushPromises()
      expect(getAllConceptSets).toHaveBeenCalled()
    })
  })

  describe('concept sets in the definition', () => {
    it('lists only identified sets, flattening their circe items', async () => {
      const wrapper = await mountLoaded({
        expression: blankExpression({
          ConceptSets: [
            {
              id: 3,
              name: 'Diabetes',
              expression: {
                items: [
                  {
                    concept: {
                      CONCEPT_ID: 201826,
                      CONCEPT_NAME: 'Type 2 diabetes',
                      CONCEPT_CODE: '44054006',
                      DOMAIN_ID: 'Condition',
                      VOCABULARY_ID: 'SNOMED',
                      CONCEPT_CLASS_ID: 'Clinical Finding',
                      STANDARD_CONCEPT: 'S',
                      INVALID_REASON: 'V',
                    },
                    isExcluded: true,
                    includeDescendants: true,
                    includeMapped: true,
                  },
                  {},
                ],
              },
            },
            { id: 4 },
            { name: 'No id', expression: { items: [] } },
          ],
        } as Partial<CohortExpression>),
      })

      expect(propOf(wrapper, 'ConceptSetsListDialog', 'conceptSets')).toEqual([
        {
          id: 3,
          name: 'Diabetes',
          items: [
            {
              conceptId: 201826,
              conceptName: 'Type 2 diabetes',
              conceptCode: '44054006',
              domainId: 'Condition',
              vocabularyId: 'SNOMED',
              conceptClassId: 'Clinical Finding',
              standardConcept: 'S',
              invalidReason: 'V',
              isExcluded: true,
              includeDescendants: true,
              includeMapped: true,
            },
            {
              conceptId: 0,
              conceptName: '',
              conceptCode: '',
              domainId: '',
              vocabularyId: '',
              conceptClassId: '',
              standardConcept: null,
              invalidReason: null,
              isExcluded: false,
              includeDescendants: false,
              includeMapped: false,
            },
          ],
        },
        { id: 4, name: '', items: [] },
      ])
    })

    it('exposes total, unused, and validation counts for the host toolbar', async () => {
      const wrapper = await mountLoaded({
        expression: blankExpression({
          ConceptSets: [
            { id: 0, name: 'Used', expression: { items: [] } },
            { id: 1, name: 'Unused A', expression: { items: [] } },
            { id: 2, name: 'Unused B', expression: { items: [] } },
          ],
          PrimaryCriteria: {
            CriteriaList: [{ ConditionOccurrence: { CodesetId: 0 } }],
            ObservationWindow: { PriorDays: 0, PostDays: 0 },
            PrimaryCriteriaLimit: { Type: 'First' },
          },
        } as Partial<CohortExpression>),
      })
      const vm = vmOf(wrapper)

      expect(vm.totalConceptSets).toBe(3)
      expect(vm.unusedConceptSetCount).toBe(2)
      expect(vm.validationCount).toBe(0)
      expect(vm.validationColor).toBe(propOf(wrapper, 'ValidationMessagesDialog', 'severityColor'))
      expect(typeof vm.validationColor).toBe('string')
    })

    it('reports zero concept sets for a definition that has none', async () => {
      const wrapper = await mountLoaded({
        expression: blankExpression({ ConceptSets: undefined } as Partial<CohortExpression>),
      })
      expect(vmOf(wrapper).totalConceptSets).toBe(0)
      expect(vmOf(wrapper).unusedConceptSetCount).toBe(0)
    })

    it('adds a repository set next to the existing ones', async () => {
      const conceptSetsStore = useConceptSetsStore()
      const wrapper = await mountLoaded({
        expression: blankExpression({
          ConceptSets: [{ id: 0, name: 'Local', expression: { items: [] } }],
        }),
      })
      const target = { targetRef: ref<number | undefined>(undefined) }
      child(wrapper, 'CohortExpressionEditor').vm.$emit('select-concept-set', target)
      await flushPromises()
      vi.spyOn(conceptSetsStore, 'fetchOne')

      child(wrapper, 'ConceptSetSelectionDialog').vm.$emit('concept-set-selected', {
        id: 50,
        name: 'Repo',
        items: [{ conceptId: 1, conceptName: 'X' }],
      })
      await flushPromises()

      expect(liveExpression().ConceptSets?.map(cs => cs.id)).toEqual([0, 50])
      expect(target.targetRef.value).toBe(50)
    })

    it('editing from a criterion opens the editor on the referenced set', async () => {
      const conceptSetsStore = useConceptSetsStore()
      const wrapper = await mountLoaded({
        expression: blankExpression({
          ConceptSets: [
            { id: 3, name: 'Diabetes', expression: { items: [] } },
            { id: 4, name: 'Other', expression: { items: [] } },
          ],
        }),
      })

      child(wrapper, 'CohortExpressionEditor').vm.$emit('edit-concept-set', {
        targetRef: ref(4),
      })
      await flushPromises()

      expect(conceptSetsStore.editorOpen).toBe(true)
      expect(conceptSetsStore.currentSet).toMatchObject({ id: 4, name: 'Other' })
      expect(propOf(wrapper, 'ConceptSetSelectionDialog', 'modelValue')).toBe(false)
    })

    it.each([
      ['no set chosen yet', undefined],
      ['a cleared set', null],
      ['a set missing from the definition', 77],
    ])('editing from a criterion with %s opens the picker instead', async (_label, id) => {
      const conceptSetsStore = useConceptSetsStore()
      const wrapper = await mountLoaded({
        expression: blankExpression({
          ConceptSets: [{ id: 3, name: 'Diabetes', expression: { items: [] } }],
        }),
      })

      child(wrapper, 'CohortExpressionEditor').vm.$emit('edit-concept-set', {
        targetRef: ref(id) as Ref<number | null | undefined>,
      })
      await flushPromises()

      expect(conceptSetsStore.editorOpen).toBe(false)
      expect(propOf(wrapper, 'ConceptSetSelectionDialog', 'modelValue')).toBe(true)
    })

    it('editing from a criterion without a target leaves the picker closed', async () => {
      const wrapper = await mountLoaded()

      child(wrapper, 'CohortExpressionEditor').vm.$emit('edit-concept-set', undefined)
      await flushPromises()

      expect(propOf(wrapper, 'ConceptSetSelectionDialog', 'modelValue')).toBe(false)
    })

    it('applying an unsaved set assigns the next free id and keeps the others', async () => {
      const conceptSetsStore = useConceptSetsStore()
      const wrapper = await mountLoaded({
        expression: blankExpression({
          ConceptSets: [
            { id: 0, name: 'A', expression: { items: [] } },
            { id: 4, name: 'B', expression: { items: [] } },
          ],
        }),
      })
      conceptSetsStore.openCreateEditor()
      await flushPromises()

      child(wrapper, 'ConceptSetEditor').vm.$emit('apply', {
        id: undefined,
        name: 'New',
        items: [],
      })
      await flushPromises()
      conceptSetsStore.openCreateEditor()
      await flushPromises()
      child(wrapper, 'ConceptSetEditor').vm.$emit('apply', { id: null, name: 'Newer', items: [] })
      await flushPromises()

      expect(liveExpression().ConceptSets).toEqual([
        { id: 0, name: 'A', expression: { items: [] } },
        { id: 4, name: 'B', expression: { items: [] } },
        { id: 5, name: 'New', expression: { items: [] } },
        { id: 6, name: 'Newer', expression: { items: [] } },
      ])
    })

    it('applying an edited set replaces only that set', async () => {
      const conceptSetsStore = useConceptSetsStore()
      const wrapper = await mountLoaded({
        expression: blankExpression({
          ConceptSets: [
            { id: 1, name: 'A', expression: { items: [] } },
            { id: 2, name: 'B', expression: { items: [] } },
          ],
        }),
      })
      conceptSetsStore.openEmbeddedEditor({ id: 2, name: 'B', items: [] })
      await flushPromises()

      child(wrapper, 'ConceptSetEditor').vm.$emit('apply', { id: 2, name: 'B renamed', items: [] })
      await flushPromises()

      expect(liveExpression().ConceptSets).toEqual([
        { id: 1, name: 'A', expression: { items: [] } },
        { id: 2, name: 'B renamed', expression: { items: [] } },
      ])
    })

    it('applying a set to a definition without a concept set list starts one', async () => {
      const conceptSetsStore = useConceptSetsStore()
      const wrapper = await mountLoaded({
        expression: blankExpression({ ConceptSets: undefined } as Partial<CohortExpression>),
      })
      conceptSetsStore.openCreateEditor()
      await flushPromises()

      child(wrapper, 'ConceptSetEditor').vm.$emit('apply', { name: 'First', items: [] })
      await flushPromises()

      expect(liveExpression().ConceptSets).toEqual([
        { id: 0, name: 'First', expression: { items: [] } },
      ])
    })
  })

  describe('deleting concept sets', () => {
    function referencedExpression(): CohortExpression {
      return blankExpression({
        ConceptSets: [
          { id: 3, name: 'Diabetes', expression: { items: [] } },
          { id: 4, name: 'Other', expression: { items: [] } },
          { id: 5, name: 'Spare', expression: { items: [] } },
          { name: 'Placeholder', expression: { items: [] } },
        ],
        PrimaryCriteria: {
          CriteriaList: [
            { ConditionOccurrence: { CodesetId: 3 } },
            { ConditionOccurrence: { CodesetId: 4 } },
          ],
          ObservationWindow: { PriorDays: 0, PostDays: 0 },
          PrimaryCriteriaLimit: { Type: 'First' },
        },
        InclusionRules: [
          {
            name: 'Rule 1',
            expression: {
              Type: 'ALL',
              DemographicCriteriaList: [{ GenderCS: { CodesetId: 4 } }],
            },
          },
        ],
      } as Partial<CohortExpression>)
    }

    it('names the set and counts one direct reference in the warning', async () => {
      const wrapper = await mountLoaded({ expression: referencedExpression() })

      child(wrapper, 'ConceptSetsListDialog').vm.$emit('delete', { id: 3, name: 'Diabetes' })
      await flushPromises()

      expect(dialogByEyebrow(wrapper, 'CONCEPT SET')?.props('modelValue')).toBe(true)
      expect(document.body.textContent).toContain(
        'Deleting "Diabetes" will clear it from those criteria, and a criterion with no concept set matches its entire domain. 1 criterion still uses it.'
      )
    })

    it('counts direct and wrapped references to the same set only', async () => {
      const wrapper = await mountLoaded({ expression: referencedExpression() })

      child(wrapper, 'ConceptSetsListDialog').vm.$emit('delete', { id: 4, name: 'Other' })
      await flushPromises()

      expect(document.body.textContent).toContain('2 criteria still use it.')
    })

    it('ignores a delete for a set without an id', async () => {
      const wrapper = await mountLoaded({ expression: referencedExpression() })

      child(wrapper, 'ConceptSetsListDialog').vm.$emit('delete', { name: 'Placeholder' })
      await flushPromises()

      expect(liveExpression().ConceptSets).toHaveLength(4)
      expect(dialogByEyebrow(wrapper, 'CONCEPT SET')?.props('modelValue')).toBe(false)
    })

    it('removes exactly the unreferenced set that was asked for', async () => {
      const wrapper = await mountLoaded({ expression: referencedExpression() })

      child(wrapper, 'ConceptSetsListDialog').vm.$emit('delete', { id: 5, name: 'Spare' })
      await flushPromises()

      expect(liveExpression().ConceptSets?.map(cs => cs.name)).toEqual([
        'Diabetes',
        'Other',
        'Placeholder',
      ])
    })

    it('leaves the list alone when the deleted set is not in it', async () => {
      const wrapper = await mountLoaded({ expression: referencedExpression() })

      child(wrapper, 'ConceptSetsListDialog').vm.$emit('delete', { id: 99, name: 'Ghost' })
      await flushPromises()

      expect(liveExpression().ConceptSets).toHaveLength(4)
    })
  })

  describe('name and description sync with the host', () => {
    it('adopts an incoming name without echoing it back', async () => {
      const wrapper = mountBuilder({ name: 'A' })
      await flushPromises()

      await wrapper.setProps({ name: 'B' })
      await flushPromises()

      expect(propOf(wrapper, 'CohortBreadcrumb', 'modelValue')).toBe('B')
      expect(wrapper.emitted('update:name')).toBeUndefined()

      await wrapper.setProps({ name: undefined })
      await flushPromises()
      expect(propOf(wrapper, 'CohortBreadcrumb', 'modelValue')).toBe('B')
    })

    it('emits local name edits only when the host controls the name', async () => {
      const controlled = mountBuilder({ name: 'A' })
      await flushPromises()
      await rename(controlled, 'Edited')
      expect(controlled.emitted('update:name')).toEqual([['Edited']])

      const uncontrolled = mountBuilder()
      await flushPromises()
      await rename(uncontrolled, 'Edited')
      expect(uncontrolled.emitted('update:name')).toBeUndefined()
    })

    it('adopts an incoming description without echoing it back', async () => {
      const wrapper = mountBuilder({ description: 'one' })
      await flushPromises()

      await wrapper.setProps({ description: 'two' })
      await flushPromises()
      expect(vmOf(wrapper).cohortDescription).toBe('two')
      expect(wrapper.emitted('update:description')).toBeUndefined()

      await wrapper.setProps({ description: undefined })
      await flushPromises()
      expect(vmOf(wrapper).cohortDescription).toBe('two')
    })

    it('emits a loaded description only when the host controls it', async () => {
      const controlled = await mountLoaded({}, { description: '' })
      expect(controlled.emitted('update:description')).toEqual([['A loaded cohort']])

      const uncontrolled = await mountLoaded()
      expect(uncontrolled.emitted('update:description')).toBeUndefined()
    })
  })

  describe('save gating', () => {
    it('gates a new cohort on create permission', async () => {
      access.hasPermission.mockImplementation(() => false)
      const wrapper = mountBuilder()
      await flushPromises()
      await rename(wrapper, 'Named')

      expect(access.hasPermission).toHaveBeenCalledWith('create:cohort-definition')
      expect(propOf(wrapper, 'CohortToolbarActions', 'canSave')).toBe(false)
      expect(propOf(wrapper, 'CohortToolbarActions', 'saveDisabledReason')).toBe(
        'You do not have permission to create a cohort.'
      )
    })

    it('gates an existing cohort on write access, not create permission', async () => {
      access.hasPermission.mockImplementation(() => false)
      const wrapper = await mountLoaded()

      expect(access.entityAccessArgs[0]?.[0]).toBe('cohortDefinition')
      expect(propOf(wrapper, 'CohortToolbarActions', 'canSave')).toBe(true)
      expect(propOf(wrapper, 'CohortToolbarActions', 'saveDisabledReason')).toBe('')

      access.canWrite.value = false
      const denied = await mountLoaded()
      access.hasPermission.mockImplementation(() => true)
      await flushPromises()
      expect(propOf(denied, 'CohortToolbarActions', 'canSave')).toBe(false)
      expect(propOf(denied, 'CohortToolbarActions', 'saveDisabledReason')).toBe(
        'You do not own this cohort and have not been granted write access to it.'
      )
    })

    it('treats a whitespace name as missing', async () => {
      const wrapper = mountBuilder()
      await flushPromises()
      await rename(wrapper, '   ')

      expect(propOf(wrapper, 'CohortToolbarActions', 'saveDisabledReason')).toBe(
        'Give the cohort a name before saving.'
      )
    })

    it('is not previewing a loaded cohort without a preview version', async () => {
      const wrapper = await mountLoaded()
      expect(propOf(wrapper, 'CohortToolbarActions', 'isPreviewingVersion')).toBe(false)
    })

    it('ignores a preview once the store holds another cohort', async () => {
      const wrapper = await mountLoaded()
      const store = useCohortStore()
      store.previewVersion = { version: 2 } as never
      await flushPromises()
      expect(propOf(wrapper, 'CohortToolbarActions', 'isPreviewingVersion')).toBe(true)

      if (store.currentCohort) store.currentCohort.id = 43
      await flushPromises()
      expect(propOf(wrapper, 'CohortToolbarActions', 'isPreviewingVersion')).toBe(false)
    })
  })

  describe('unsaved changes before the first snapshot', () => {
    it('is clean for a blank new cohort and for a whitespace name', async () => {
      const wrapper = mountBuilder()
      await flushPromises()
      expect(propOf(wrapper, 'CohortGenerationSection', 'isDirty')).toBe(false)

      await rename(wrapper, '  ')
      expect(propOf(wrapper, 'CohortGenerationSection', 'isDirty')).toBe(false)

      await rename(wrapper, 'Named')
      expect(propOf(wrapper, 'CohortGenerationSection', 'isDirty')).toBe(true)
    })

    it('is dirty once a new cohort has an entry event', async () => {
      const store = useCohortStore()
      store.createNewCohort()
      if (store.currentCohort?.expression) {
        store.currentCohort.expression.PrimaryCriteria = {
          CriteriaList: [{ ConditionOccurrence: {} }],
        } as CohortExpression['PrimaryCriteria']
      }
      const wrapper = mountBuilder()
      await flushPromises()

      expect(propOf(wrapper, 'CohortGenerationSection', 'isDirty')).toBe(true)
    })
  })

  describe('versions', () => {
    it('counts versions for a saved cohort as soon as it mounts', async () => {
      vi.mocked(getVersions).mockResolvedValue([{}, {}, {}] as never)
      const wrapper = await mountLoaded()

      expect(getVersions).toHaveBeenCalledWith(42)
      expect(propOf(wrapper, 'CohortToolbarStatus', 'versionCount')).toBe(3)
    })

    it('does not look up versions for a new cohort', async () => {
      const wrapper = mountBuilder()
      await flushPromises()
      expect(getVersions).not.toHaveBeenCalled()
      expect(propOf(wrapper, 'CohortToolbarStatus', 'versionCount')).toBe(0)
    })

    it('describes the current version of a saved cohort', async () => {
      const wrapper = await mountLoaded({
        createdDate: '2024-01-02T03:04:05Z',
        modifiedDate: '2024-03-04T05:06:07Z',
        modifiedBy: { id: 7, name: 'Ada', login: 'ada' },
      })
      const config = vmOf(wrapper).versionsConfig

      expect(config.assetType).toBe('cohortdefinition')
      expect(config.assetId).toBe(42)
      expect(config.canEdit.value).toBe(true)
      expect(config.currentVersion()).toEqual({
        version: -1,
        displayVersion: 'Current',
        assetId: 42,
        createdBy: { id: 7, name: 'Ada', login: 'ada' },
        createdDate: '2024-03-04T05:06:07Z',
        comment: null,
        archived: false,
        isCurrent: true,
        isPreviewing: false,
        formattedDate: expect.stringMatching(/2024/),
      })
    })

    it('falls back to the created date and an unknown author', async () => {
      const wrapper = await mountLoaded({
        createdDate: '2024-01-02T03:04:05Z',
        modifiedDate: undefined,
        createdBy: 'ada',
      })

      expect(vmOf(wrapper).versionsConfig.currentVersion()).toMatchObject({
        createdBy: { id: 0, name: 'Unknown' },
        createdDate: '2024-01-02T03:04:05Z',
      })
    })

    it('uses the current time and no formatted date when the cohort has no dates', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2025-05-06T07:08:09Z'))
      const wrapper = await mountLoaded({ createdDate: undefined, modifiedDate: undefined })

      expect(vmOf(wrapper).versionsConfig.currentVersion()).toMatchObject({
        createdDate: '2025-05-06T07:08:09.000Z',
        formattedDate: '',
      })
    })

    it('describes a placeholder version when no cohort is loaded', async () => {
      const wrapper = mountBuilder()
      await flushPromises()
      useCohortStore().clearCohort()

      const config = vmOf(wrapper).versionsConfig
      expect(config.assetId).toBe(0)
      expect(config.currentVersion()).toMatchObject({
        version: -1,
        displayVersion: 'Current',
        archived: false,
        isCurrent: true,
        isPreviewing: false,
        formattedDate: '',
      })
    })

    it('mirrors the store preview and dirty state', async () => {
      const wrapper = await mountLoaded()
      const store = useCohortStore()
      store.previewVersion = { version: 5 } as never
      store.isDirty = true

      const config = vmOf(wrapper).versionsConfig
      expect(config.previewVersion.value).toEqual({ version: 5 })
      expect(config.isDirty.value).toBe(true)
    })

    it('opens the versions and validation dialogs on request', async () => {
      const wrapper = await mountLoaded()
      vmOf(wrapper).openVersionsDialog()
      vmOf(wrapper).openValidationDialog()
      await flushPromises()

      expect(dialogByEyebrow(wrapper, 'VERSIONS')?.props('modelValue')).toBe(true)
      expect(propOf(wrapper, 'ValidationMessagesDialog', 'modelValue')).toBe(true)
    })
  })

  describe('bridge signals', () => {
    it('applies a requested name but keeps the loaded description', async () => {
      await mountLoaded()
      const store = useCohortStore()

      const result = await store.requestSave({ name: 'Renamed' })

      expect(result).toEqual({ id: 99, name: 'Renamed' })
      expect(saveCohortDefinition).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Renamed', description: 'A loaded cohort' })
      )
    })

    it('answers a save request that carries no options', async () => {
      const wrapper = mountBuilder()
      await flushPromises()
      await rename(wrapper, 'Named')
      const store = useCohortStore()

      store.saveOptions = null as never
      store.saveRequest++
      await flushPromises()

      expect(saveCohortDefinition).toHaveBeenCalledWith(expect.objectContaining({ name: 'Named' }))
    })

    it('a new-cohort signal clears the description and tags', async () => {
      const wrapper = await mountLoaded({ tags: [{ id: 1, name: 'kept' }] })
      const store = useCohortStore()

      store.requestNewCohort()
      await flushPromises()

      expect(vmOf(wrapper).cohortDescription).toBe('')
      expect(vmOf(wrapper).loadedTags).toEqual([])
    })
  })

  describe('tags', () => {
    it('opens the tag dialog only for a saved cohort', async () => {
      const fresh = mountBuilder()
      await flushPromises()
      child(fresh, 'CohortToolbarStatus').vm.$emit('show-tags')
      await flushPromises()
      expect(propOf(fresh, 'TagSelectionDialog', 'modelValue')).toBe(false)

      const saved = await mountLoaded()
      child(saved, 'CohortToolbarStatus').vm.$emit('show-tags')
      await flushPromises()
      expect(propOf(saved, 'TagSelectionDialog', 'modelValue')).toBe(true)
    })

    it('refuses to apply tags to an unsaved cohort', async () => {
      const wrapper = mountBuilder()
      await flushPromises()
      const onApply = propOf(wrapper, 'TagSelectionDialog', 'onApply') as (t: Tag[]) => Promise<boolean>

      await expect(onApply([{ id: 1, name: 'a' }])).resolves.toBe(false)
      expect(assignTagToCohort).not.toHaveBeenCalled()
    })

    it('lists every failed assignment in the error message', async () => {
      vi.mocked(assignTagToCohort).mockResolvedValue({ success: false } as never)
      const wrapper = await mountLoaded()
      const onApply = propOf(wrapper, 'TagSelectionDialog', 'onApply') as (t: Tag[]) => Promise<boolean>

      await expect(
        onApply([
          { id: 1, name: 'a' },
          { id: 2, name: 'b' },
        ])
      ).resolves.toBe(false)
      await flushPromises()

      expect(errorSnackbar(wrapper)?.props('text')).toBe(
        'Failed to assign tag "a"; Failed to assign tag "b"'
      )
    })

    it('accepts a tag update after the cohort failed to load', async () => {
      vi.mocked(getCohortDefinition).mockResolvedValue({
        success: false,
        error: { status: 500 },
      } as never)
      const wrapper = mountBuilder({ id: '42' })
      await flushPromises()

      expect(() =>
        child(wrapper, 'TagSelectionDialog').vm.$emit('update:selected-tags', [{ id: 1, name: 'a' }])
      ).not.toThrow()
      expect(vmOf(wrapper).loadedTags).toEqual([])
      expect(vmOf(wrapper).cohortDescription).toBe('')
    })
  })

  describe('opening a new cohort over leftovers', () => {
    it('keeps a restored draft as it was saved', async () => {
      sessionStorage.setItem(
        'atlas3_cohort_draft',
        JSON.stringify({
          cohort: { id: 5, name: 'Draft name', description: 'Draft', expression: blankExpression() },
        })
      )
      mountBuilder()
      await flushPromises()

      expect(useCohortStore().currentCohort).toMatchObject({ id: 5, name: 'Draft name' })
    })

    it('keeps in-flight inclusion rules under a fresh identity', async () => {
      const store = useCohortStore()
      store.setCohort({
        id: 8,
        name: 'Leftover',
        description: 'old',
        tags: [{ id: 1, name: 't' }],
        expression: blankExpression({
          PrimaryCriteria: undefined,
          ConceptSets: undefined,
          InclusionRules: [{ name: 'Rule', expression: { Type: 'ALL' } }],
        } as Partial<CohortExpression>),
      })
      mountBuilder()
      await flushPromises()

      expect(store.currentCohort).toMatchObject({
        id: undefined,
        name: 'New Cohort',
        description: '',
        tags: [],
      })
      expect(store.currentCohort?.expression?.InclusionRules).toHaveLength(1)
    })

    it('ignores a non-string name in the route query', async () => {
      await router.push({ path: '/cohorts', query: { name: ['a', 'b'] } })
      const wrapper = mountBuilder()
      await flushPromises()
      expect(vmOf(wrapper).cohortName).toBe('')
    })
  })

  describe('route changes', () => {
    it('ignores the id being cleared', async () => {
      const wrapper = await mountLoaded()
      vi.mocked(getCohortDefinition).mockClear()

      await wrapper.setProps({ id: undefined })
      await flushPromises()

      expect(loadingOverlay(wrapper)?.props('modelValue')).toBe(false)
      expect(getCohortDefinition).not.toHaveBeenCalled()
    })

    it('loads a different cohort while a just-saved id is still pending adoption', async () => {
      const wrapper = mountBuilder()
      await flushPromises()
      vi.spyOn(router, 'replace').mockResolvedValue(undefined as never)
      await rename(wrapper, 'Named')
      await vmOf(wrapper).handleSave()

      await wrapper.setProps({ id: '100' })
      await flushPromises()

      expect(getCohortDefinition).toHaveBeenCalledWith(100)
    })

    it('loads the saved id normally when adopting it in the route failed', async () => {
      const wrapper = mountBuilder()
      await flushPromises()
      vi.spyOn(router, 'replace').mockRejectedValue(new Error('aborted'))
      await rename(wrapper, 'Named')
      await vmOf(wrapper).handleSave()

      await wrapper.setProps({ id: '99' })
      await flushPromises()

      expect(getCohortDefinition).toHaveBeenCalledWith(99)
    })

    it('a new cohort ignores reload signals', async () => {
      mountBuilder()
      await flushPromises()
      useCohortStore().reloadRequest++
      await flushPromises()
      expect(getCohortDefinition).not.toHaveBeenCalled()
    })

    it('reloads instead of crashing when a preview arrives without a cohort', async () => {
      await mountLoaded()
      const store = useCohortStore()
      vi.mocked(getCohortDefinition).mockClear()
      store.clearCohort()
      store.previewVersion = { version: 3 } as never
      store.reloadRequest++
      await flushPromises()

      expect(getCohortDefinition).toHaveBeenCalledWith(42)
    })
  })

  describe('loading a cohort', () => {
    it('accepts an explicit simple expression type', async () => {
      const wrapper = await mountLoaded({ expressionType: 'SIMPLE_EXPRESSION' })
      expect(errorSnackbar(wrapper)?.props('modelValue')).toBe(false)
      expect(vmOf(wrapper).cohortName).toBe('Existing Cohort')
    })

    it('normalises missing description and tags', async () => {
      const wrapper = await mountLoaded({ description: null, tags: null })
      expect(useCohortStore().currentCohort).toMatchObject({ description: '', tags: [] })
      expect(vmOf(wrapper).cohortDescription).toBe('')
    })

    it('keeps the loaded description and tags', async () => {
      const tags = [{ id: 1, name: 't' }]
      const wrapper = await mountLoaded({ tags })
      expect(useCohortStore().currentCohort).toMatchObject({
        description: 'A loaded cohort',
        tags,
      })
      expect(vmOf(wrapper).cohortDescription).toBe('A loaded cohort')
    })

    it('shows the overlay again while a retry is in flight', async () => {
      vi.mocked(getCohortDefinition).mockResolvedValueOnce({
        success: false,
        error: { status: 500 },
      } as never)
      const wrapper = mountBuilder({ id: '42' })
      await flushPromises()
      const pending = deferred<ReturnType<typeof cohortResult>>()
      vi.mocked(getCohortDefinition).mockReturnValueOnce(pending.promise as never)

      wrapper.findComponent({ name: 'AtlasAlert' }).findComponent({ name: 'AtlasButton' }).vm.$emit('click')
      await wrapper.vm.$nextTick()
      expect(loadingOverlay(wrapper)?.props('modelValue')).toBe(true)

      pending.resolve(cohortResult())
      await flushPromises()
      expect(loadingOverlay(wrapper)?.props('modelValue')).toBe(false)
    })

    it('ignores a superseded load that throws after a later one succeeded', async () => {
      const first = deferred<never>()
      vi.mocked(getCohortDefinition)
        .mockReturnValueOnce(first.promise as never)
        .mockResolvedValueOnce(cohortResult({ id: 7, name: 'Seven' }) as never)
      const wrapper = mountBuilder({ id: '42' })
      await flushPromises()
      await wrapper.setProps({ id: '7' })
      await flushPromises()

      first.reject(new Error('late'))
      await flushPromises()

      expect(vmOf(wrapper).cohortName).toBe('Seven')
      expect(errorSnackbar(wrapper)?.props('modelValue')).toBe(false)
    })

    it('exposes authorship only for a saved cohort', async () => {
      const wrapper = await mountLoaded({
        createdBy: 'ada',
        createdDate: '2024-01-01',
        modifiedBy: 'bob',
        modifiedDate: '2024-02-02',
      })
      expect(vmOf(wrapper).authorship).toEqual({
        createdBy: 'ada',
        createdDate: '2024-01-01',
        modifiedBy: 'bob',
        modifiedDate: '2024-02-02',
      })

      useCohortStore().clearCohort()
      await flushPromises()
      expect(vmOf(wrapper).authorship).toBeNull()
    })
  })

  describe('saving', () => {
    it('stores the saved identity and an empty description', async () => {
      const wrapper = mountBuilder()
      await flushPromises()
      vi.spyOn(router, 'replace').mockResolvedValue(undefined as never)
      await rename(wrapper, 'Named')

      await vmOf(wrapper).handleSave()
      await flushPromises()

      expect(useCohortStore().currentCohort).toMatchObject({ id: 99, name: 'Named', description: '' })
      expect(successSnackbar(wrapper)?.props()).toMatchObject({
        modelValue: true,
        text: 'Cohort saved successfully',
      })
    })

    it('keeps a non-empty description in the store after saving', async () => {
      vi.mocked(saveCohortDefinition).mockResolvedValue({ success: true, data: { id: 42 } } as never)
      const wrapper = await mountLoaded()

      await vmOf(wrapper).handleSave()

      expect(useCohortStore().currentCohort?.description).toBe('A loaded cohort')
    })

    it('fetches items only for numeric sets that lack them and keeps unresolved sets', async () => {
      vi.mocked(saveCohortDefinition).mockResolvedValue({ success: true, data: { id: 42 } } as never)
      vi.mocked(getConceptSetById).mockResolvedValue(null)
      const wrapper = await mountLoaded({
        expression: blankExpression({
          ConceptSets: [
            { id: 1, name: 'Numeric' },
            { id: 'local-uuid', name: 'Local' },
          ],
        } as unknown as Partial<CohortExpression>),
      })

      await vmOf(wrapper).handleSave()

      expect(getConceptSetById).toHaveBeenCalledTimes(1)
      expect(getConceptSetById).toHaveBeenCalledWith(1)
      const sent = vi.mocked(saveCohortDefinition).mock.calls[0]?.[0] as { expression: CohortExpression }
      expect(sent.expression.ConceptSets?.map(cs => cs.name)).toEqual(['Numeric', 'Local'])
    })

    it('fills items for a set the repository resolves without items', async () => {
      vi.mocked(saveCohortDefinition).mockResolvedValue({ success: true, data: { id: 42 } } as never)
      vi.mocked(getConceptSetById).mockResolvedValue({ id: 1, name: 'Numeric' } as never)
      const wrapper = await mountLoaded({
        expression: blankExpression({
          ConceptSets: [{ id: 1, name: 'Numeric' }],
        } as unknown as Partial<CohortExpression>),
      })

      await expect(vmOf(wrapper).handleSave()).resolves.toEqual({ id: 42, name: 'Existing Cohort' })
    })
  })

  describe('JSON, SQL, and export', () => {
    async function applyJson(wrapper: Wrapper, json: string) {
      child(wrapper, 'CohortJsonDialog').vm.$emit('apply', json)
      await flushPromises()
    }

    it('rejects text that is not JSON', async () => {
      const wrapper = await mountLoaded()
      await applyJson(wrapper, '{not json')
      expect(errorSnackbar(wrapper)?.props()).toMatchObject({
        modelValue: true,
        text: 'Not a valid Atlas cohort expression',
      })
    })

    it('rejects JSON that is not a cohort expression', async () => {
      const wrapper = await mountLoaded()
      await applyJson(wrapper, JSON.stringify({ title: 'renamed key' }))
      expect(errorSnackbar(wrapper)?.props('modelValue')).toBe(true)
      expect(errorSnackbar(wrapper)?.props('text')).toMatch(/^Import failed: /)
    })

    it('reports a successful apply', async () => {
      const wrapper = await mountLoaded()
      await applyJson(wrapper, JSON.stringify(blankExpression()))
      expect(successSnackbar(wrapper)?.props('text')).toBe(
        'Cohort JSON applied — review the builder, then save'
      )
    })

    it('names the SQL export after the cohort', async () => {
      const wrapper = await mountLoaded()
      expect(propOf(wrapper, 'CohortSqlDialog', 'filename')).toBe('existing_cohort_cohort.sql')
    })

    it('downloads the expression as a JSON file', async () => {
      const wrapper = await mountLoaded()
      let blob: Blob | undefined
      const createUrl = vi.fn((b: Blob) => {
        blob = b
        return 'blob:x'
      })
      const revokeUrl = vi.fn()
      Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl })
      const clicked: HTMLAnchorElement[] = []
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          clicked.push(this)
        })

      vmOf(wrapper).handleExportDownload()
      await flushPromises()
      click.mockRestore()

      expect(blob?.type).toBe('application/json')
      const text = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.readAsText(blob as Blob)
      })
      expect(JSON.parse(text)).toHaveProperty('PrimaryCriteria')
      expect(clicked[0]?.download).toBe('existing_cohort_cohort.json')
      expect(successSnackbar(wrapper)?.props('text')).toBe('Cohort JSON downloaded')
    })

    it('reports clipboard success and failure', async () => {
      const wrapper = await mountLoaded()
      const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'))
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

      await vmOf(wrapper).handleExportCopy()
      await flushPromises()
      expect(successSnackbar(wrapper)?.props('text')).toBe('Cohort JSON copied to clipboard')

      await vmOf(wrapper).handleExportCopy()
      await flushPromises()
      expect(errorSnackbar(wrapper)?.props('text')).toBe('Could not copy to clipboard')
    })
  })

  describe('leaving with unsaved changes', () => {
    async function mountRouted() {
      const routed = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/new', component: CohortBuilder },
          { path: '/elsewhere', component: { template: '<div />' } },
          { path: '/cohorts', component: { template: '<div />' } },
        ],
      })
      await routed.push('/new')
      await routed.isReady()
      const host = defineComponent({ render: () => h(RouterView) })
      const wrapper = mount(host, {
        global: { plugins: [vuetify, routed], stubs },
        attachTo: document.body,
      })
      mounted.push(wrapper)
      await flushPromises()
      const builder = wrapper.findComponent(CohortBuilder) as unknown as Wrapper
      return { routed, builder }
    }

    it('lets a clean editor leave', async () => {
      const { routed } = await mountRouted()
      await routed.push('/elsewhere')
      expect(routed.currentRoute.value.path).toBe('/elsewhere')
    })

    it('holds a dirty editor until the user confirms, and blocks repeats meanwhile', async () => {
      const { routed, builder } = await mountRouted()
      await rename(builder, 'Unsaved work')

      await routed.push('/elsewhere')
      await flushPromises()
      expect(routed.currentRoute.value.path).toBe('/new')
      expect(vmOf(builder).showUnsavedDialog).toBe(true)
      expect(vmOf(builder).isConfirmingNavigation).toBe(true)

      await routed.push('/cohorts')
      expect(routed.currentRoute.value.path).toBe('/new')

      const pushSpy = vi.spyOn(routed, 'push')
      vmOf(builder).confirmLeaveUnsaved()
      await pushSpy.mock.results[0]?.value
      expect(routed.currentRoute.value.path).toBe('/elsewhere')
    })
  })

  it('stops warning on unload once unmounted', async () => {
    const wrapper = mountBuilder()
    await flushPromises()
    await rename(wrapper, 'Dirty')
    wrapper.unmount()
    mounted.splice(mounted.indexOf(wrapper), 1)

    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('does not warn on unload for a clean editor', async () => {
    mountBuilder()
    await flushPromises()
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
