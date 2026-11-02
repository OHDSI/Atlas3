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
import { permissionService } from '@/services/auth/permissions'

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    onBeforeRouteLeave: vi.fn(),
  }
})

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/feature-analysis.service', () => ({
  listFeatureAnalyses: vi.fn(),
  getFeatureAnalysis: vi.fn(),
  createFeatureAnalysis: vi.fn(),
  updateFeatureAnalysis: vi.fn(),
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
  listFeatureAnalyses,
  getFeatureAnalysis,
  createFeatureAnalysis,
  updateFeatureAnalysis,
  listFeatureAnalysisDomains,
  listFeatureAnalysisAggregates,
} from '@/services/feature-analysis.service'
import { logger } from '@/utils/logger'
import FeatureAnalysisEditorView from '@/views/FeatureAnalysisEditorView.vue'
import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'
import DisabledReasonTooltip from '@/components/shared/DisabledReasonTooltip.vue'
import { EntityAccessLockButton } from '@/components/access'
import { AtlasSelect, AtlasSnackbar } from '@/components/ui'
import FeatureAnalysisPrevalenceEditor from '@/components/feature-analyses/FeatureAnalysisPrevalenceEditor.vue'
import FeatureAnalysisDistributionEditor from '@/components/feature-analysis/FeatureAnalysisDistributionEditor.vue'
import { success } from '@/types/api'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const DEFAULT_AGGREGATE = { id: 10, name: 'Default aggregate', isDefault: true }

type LeaveGuard = (
  to: { fullPath: string },
  from: unknown,
  next: (decision?: boolean) => void
) => void

interface SetupState {
  handleConceptSetApplied: (set: unknown) => void
  confirmLeaveUnsaved: () => void
  cancelLeaveUnsaved: () => void
  prevalenceDraftDesign: unknown[]
  prevalenceDraftConceptSets: unknown[]
  distributionDraftDesign: unknown[]
  distributionDraftConceptSets: unknown[]
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/analysis/feature-analyses', name: 'feature-analyses', component: { template: '<div />' } },
      { path: '/feature-analyses', redirect: { name: 'feature-analyses' } },
      { path: '/feature-analyses/new', name: 'feature-analysis-new', component: { template: '<div />' } },
      { path: '/feature-analyses/:id', name: 'feature-analysis-edit', component: { template: '<div />' } },
      { path: '/elsewhere', name: 'elsewhere', component: { template: '<div />' } },
      { path: '/other', name: 'other', component: { template: '<div />' } },
    ],
  })
}

interface MountOptions {
  props?: Record<string, unknown>
  create?: string[]
  write?: string[]
  feAnalysisGrants?: Record<string, { accessTypes: ('READ' | 'WRITE')[]; isOwner: boolean }>
}

async function mountEditor(path: string, options: MountOptions = {}) {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  const entityAccess = emptyEntityAccess()
  Object.assign(entityAccess.feAnalysis, options.feAnalysisGrants ?? {})
  useAuthStore().setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: {
      create: options.create ?? ['create:feature-analysis'],
      write: options.write ?? ['write:feature-analysis'],
    },
    entityAccess,
  })

  const wrapper = mount(FeatureAnalysisEditorView, {
    global: {
      plugins: [vuetify, pinia, router],
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
          template: '<div v-if="modelValue" data-testid="concept-set-editor" />',
        },
        EntityAccessDialog: {
          name: 'EntityAccessDialog',
          props: ['modelValue', 'entityType', 'entityId', 'title', 'subtitle', 'canRevokeRole'],
          emits: ['close'],
          template: '<div v-if="modelValue" data-testid="entity-access-dialog" />',
        },
        AtlasDialog: {
          name: 'AtlasDialog',
          props: ['modelValue', 'title', 'eyebrow'],
          emits: ['close'],
          template:
            '<div v-if="modelValue" data-testid="atlas-dialog" :data-title="title"><slot /><slot name="actions" /></div>',
        },
      },
    },
    props: options.props,
  })

  await flushPromises()
  return { wrapper, router }
}

function setupState(wrapper: VueWrapper): SetupState {
  return (wrapper.vm as unknown as { $: { setupState: SetupState } }).$.setupState
}

function leaveGuard(): LeaveGuard {
  const calls = vi.mocked(onBeforeRouteLeave).mock.calls
  return calls[calls.length - 1][0] as unknown as LeaveGuard
}

function runGuard(path: string): ReturnType<typeof vi.fn> {
  const next = vi.fn()
  leaveGuard()({ fullPath: path }, {}, next)
  return next
}

function saveButton(wrapper: VueWrapper): HTMLButtonElement {
  return wrapper.get('[data-testid="feature-analysis-editor-save"]').element as HTMLButtonElement
}

function dialogByTitle(wrapper: VueWrapper, title: string) {
  return wrapper.find(`[data-testid="atlas-dialog"][data-title="${title}"]`)
}

function conceptSetsDialog(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: 'ConceptSetsListDialog' })
}

const fullConcept = {
  CONCEPT_ID: 123,
  CONCEPT_NAME: 'Alpha concept',
  CONCEPT_CODE: 'A123',
  DOMAIN_ID: 'Condition',
  VOCABULARY_ID: 'SNOMED',
  CONCEPT_CLASS_ID: 'Clinical Finding',
  STANDARD_CONCEPT: 'S',
  INVALID_REASON: 'D',
}

function windowed(codesetId: number) {
  return {
    name: `Uses ${codesetId}`,
    criteriaType: 'WindowedCriteria',
    expression: { Criteria: { ConditionOccurrence: { CodesetId: codesetId } } },
  }
}

function distributionFA(overrides: Record<string, unknown> = {}): FeatureAnalysis {
  return {
    id: 42,
    name: 'Criteria edit',
    description: 'With concept sets',
    type: 'CRITERIA_SET',
    statType: 'DISTRIBUTION',
    domain: 'CONDITION',
    design: [],
    conceptSets: [],
    ...overrides,
  } as never
}

describe('FeatureAnalysisEditorView behavior', () => {
  let mounted: { wrapper: VueWrapper; router: Router } | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    permissionService.clearCache()
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success([]))
    vi.mocked(listFeatureAnalysisDomains).mockResolvedValue(success(['DEMOGRAPHICS', 'CONDITION']))
    vi.mocked(listFeatureAnalysisAggregates).mockResolvedValue(
      success([{ id: 20, name: 'Fallback aggregate' }, DEFAULT_AGGREGATE])
    )
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  describe('create query parsing', () => {
    it.each([
      ['/feature-analyses/new?type=CRITERIA_SET'],
      ['/feature-analyses/new?statType=DISTRIBUTION'],
      ['/feature-analyses/new?statType=PREVALENCE'],
      ['/feature-analyses/new?type=BOGUS&statType=DISTRIBUTION'],
      ['/feature-analyses/new?type=CRITERIA_SET&statType=OTHER'],
    ])('redirects %s to the list', async path => {
      mounted = await mountEditor(path)
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      await flushPromises()

      expect(mounted.router.currentRoute.value.name).toBe('feature-analyses')
      expect(listFeatureAnalysisAggregates).not.toHaveBeenCalled()
    })

    it('stays on the new page for Custom SQL and skips aggregate loading', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      await flushPromises()

      expect(mounted.router.currentRoute.value.fullPath).toBe('/feature-analyses/new?type=CUSTOM_FE')
      expect(listFeatureAnalysisAggregates).not.toHaveBeenCalled()
      expect(mounted.wrapper.get('[data-testid="feature-analysis-editor-type-chip"]').text()).toBe('Custom')
      expect(mounted.wrapper.find('[data-testid="feature-analysis-editor-conceptsets-icon"]').exists()).toBe(false)
      expect(conceptSetsDialog(mounted.wrapper).props('usedConceptSets')).toEqual([])
      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toEqual([])
    })

    it('stays on the new page for Distribution Criteria with a distribution draft', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=DISTRIBUTION')
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      await flushPromises()

      expect(mounted.router.currentRoute.value.name).toBe('feature-analysis-new')
      expect(mounted.wrapper.get('[data-testid="feature-analysis-editor-type-chip"]').text()).toBe('Distribution Criteria')
      expect(mounted.wrapper.findComponent(FeatureAnalysisDistributionEditor).exists()).toBe(true)
      expect(mounted.wrapper.findComponent(FeatureAnalysisPrevalenceEditor).exists()).toBe(false)
    })

    it('builds an empty prevalence row with the default aggregate', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=PREVALENCE')

      expect(mounted.router.currentRoute.value.name).toBe('feature-analysis-new')
      expect(mounted.wrapper.get('[data-testid="feature-analysis-editor-type-chip"]').text()).toBe('Prevalence Criteria')
      const prevalence = mounted.wrapper.findComponent(FeatureAnalysisPrevalenceEditor)
      expect(prevalence.props('design')).toEqual([
        {
          name: '',
          criteriaType: 'CriteriaGroup',
          aggregate: DEFAULT_AGGREGATE,
          expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] },
        },
      ])
      expect(prevalence.props('conceptSets')).toEqual([])
      expect(prevalence.props('aggregates')).toEqual([{ id: 20, name: 'Fallback aggregate' }, DEFAULT_AGGREGATE])
      expect(setupState(mounted.wrapper).distributionDraftDesign).toEqual([])
    })
  })

  describe('save payloads', () => {
    it('sends a complete Custom SQL payload with the trimmed name and routes to the saved analysis', async () => {
      vi.mocked(createFeatureAnalysis).mockResolvedValue(
        success({ id: 99, name: 'My FA', type: 'CUSTOM_FE', design: 'SELECT 1' } as never)
      )
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')

      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue('  My FA  ')
      await mounted.wrapper.get('[data-testid="feature-analysis-editor-custom-sql"] textarea').setValue('SELECT 1')
      const pushSpy = vi.spyOn(mounted.router, 'push')
      saveButton(mounted.wrapper).click()
      await flushPromises()
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      await flushPromises()

      expect(vi.mocked(createFeatureAnalysis).mock.calls[0][0]).toEqual({
        id: undefined,
        name: 'My FA',
        description: '',
        domain: 'CONDITION',
        type: 'CUSTOM_FE',
        design: 'SELECT 1',
      })
      expect(pushSpy).toHaveBeenCalledWith('/feature-analyses/99')
      expect(mounted.router.currentRoute.value.path).toBe('/feature-analyses/99')
      expect(runGuard('/elsewhere')).toHaveBeenCalledWith()
    })

    it('sends a complete Distribution payload', async () => {
      vi.mocked(createFeatureAnalysis).mockResolvedValue(success({ ...distributionFA(), id: 5 }))
      mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=DISTRIBUTION')

      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue('Dist')
      saveButton(mounted.wrapper).click()
      await flushPromises()

      expect(vi.mocked(createFeatureAnalysis).mock.calls[0][0]).toEqual({
        id: undefined,
        name: 'Dist',
        description: '',
        domain: 'CONDITION',
        type: 'CRITERIA_SET',
        statType: 'DISTRIBUTION',
        design: [],
        conceptSets: [],
      })
    })

    it('saves a PRESET analysis as PRESET with the preset name field', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(
        success({ id: 42, name: 'Preset FA', description: null, type: 'PRESET', domain: 'DEMOGRAPHICS', design: 'DemographicsAge' } as never)
      )
      vi.mocked(updateFeatureAnalysis).mockResolvedValue(
        success({ id: 42, name: 'Preset FA', type: 'PRESET', design: 'DemographicsGender' } as never)
      )
      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' } })

      expect(mounted.wrapper.get('[data-testid="feature-analysis-editor-type-chip"]').text()).toBe('Preset')
      expect(
        (mounted.wrapper.get('[data-testid="feature-analysis-editor-description"] textarea').element as HTMLTextAreaElement).value
      ).toBe('')
      expect(listFeatureAnalysisAggregates).not.toHaveBeenCalled()

      await mounted.wrapper.get('[data-testid="feature-analysis-editor-preset-name"] input').setValue('DemographicsGender')
      saveButton(mounted.wrapper).click()
      await flushPromises()

      expect(vi.mocked(updateFeatureAnalysis).mock.calls[0][0]).toEqual({
        id: 42,
        name: 'Preset FA',
        description: '',
        domain: 'DEMOGRAPHICS',
        type: 'PRESET',
        design: 'DemographicsGender',
      })
    })

    it('fills in the default aggregate for prevalence rows that have none and keeps existing ones', async () => {
      const ownAggregate = { id: 20, name: 'Fallback aggregate' }
      vi.mocked(getFeatureAnalysis).mockResolvedValue(
        success({
          id: 42,
          name: 'Prev',
          description: 'd',
          type: 'CRITERIA_SET',
          statType: 'PREVALENCE',
          domain: 'CONDITION',
          design: [
            { name: 'no agg', criteriaType: 'CriteriaGroup', expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] } },
            { name: 'own agg', criteriaType: 'CriteriaGroup', aggregate: ownAggregate, expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] } },
          ],
          conceptSets: [],
        } as never)
      )
      vi.mocked(updateFeatureAnalysis).mockResolvedValue(success(distributionFA()))
      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' } })

      expect(listFeatureAnalysisAggregates).toHaveBeenCalledTimes(1)
      saveButton(mounted.wrapper).click()
      await flushPromises()

      const payload = vi.mocked(updateFeatureAnalysis).mock.calls[0][0] as unknown as {
        design: { name: string; aggregate: unknown }[]
      }
      expect(payload.design.map(row => [row.name, row.aggregate])).toEqual([
        ['no agg', DEFAULT_AGGREGATE],
        ['own agg', ownAggregate],
      ])
    })

    it('shows the missing-aggregate error with danger severity and a longer timeout', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=PREVALENCE')
      useFeatureAnalysesStore().aggregates = []
      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue('No aggregate FA')

      saveButton(mounted.wrapper).click()
      await flushPromises()

      const snackbar = mounted.wrapper.findComponent(AtlasSnackbar)
      expect(snackbar.props('modelValue')).toBe(true)
      expect(snackbar.props('severity')).toBe('danger')
      expect(snackbar.props('timeout')).toBe(5000)
      expect(createFeatureAnalysis).not.toHaveBeenCalled()
    })
  })

  describe('save flow states', () => {
    it('starts with a hidden, empty success snackbar', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      const snackbar = mounted.wrapper.findComponent(AtlasSnackbar)
      expect(snackbar.props('modelValue')).toBe(false)
      expect(snackbar.props('text')).toBe('')
      expect(snackbar.props('severity')).toBe('success')
      expect(snackbar.props('timeout')).toBe(3000)
    })

    it('disables Save while a save is in flight and re-enables it afterwards', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      const store = useFeatureAnalysesStore()
      let resolveCreate: (value: FeatureAnalysis | null) => void = () => {}
      vi.spyOn(store, 'create').mockImplementation(
        () => new Promise<FeatureAnalysis | null>(resolve => { resolveCreate = resolve })
      )
      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue('Pending')
      expect(saveButton(mounted.wrapper).disabled).toBe(false)

      saveButton(mounted.wrapper).click()
      await flushPromises()
      expect(saveButton(mounted.wrapper).disabled).toBe(true)

      resolveCreate(null)
      await flushPromises()
      expect(saveButton(mounted.wrapper).disabled).toBe(false)
    })

    it('does not show its own snackbar when the store already reports an error', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      const store = useFeatureAnalysesStore()
      vi.spyOn(store, 'create').mockImplementation(async () => {
        store.error = 'Server rejected it'
        return null
      })
      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue('Rejected')

      saveButton(mounted.wrapper).click()
      await flushPromises()

      expect(mounted.wrapper.findComponent(AtlasSnackbar).props('modelValue')).toBe(false)
      expect(mounted.wrapper.findComponent(AnalysisBuilderShell).props('error')).toBe('Server rejected it')
      expect(mounted.router.currentRoute.value.name).toBe('feature-analysis-new')
    })

    it('shows the save error and recovers when the store throws', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      const store = useFeatureAnalysesStore()
      const boom = new Error('network')
      vi.spyOn(store, 'create').mockRejectedValue(boom)
      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue('Throws')

      saveButton(mounted.wrapper).click()
      await flushPromises()

      const snackbar = mounted.wrapper.findComponent(AtlasSnackbar)
      expect(snackbar.props('modelValue')).toBe(true)
      expect(snackbar.props('text')).toBe('An error occurred while attempting to save a feature analysis.')
      expect(snackbar.props('severity')).toBe('danger')
      expect(logger.error).toHaveBeenCalledWith('FeatureAnalysisEditor', expect.any(String), boom)
      expect(saveButton(mounted.wrapper).disabled).toBe(false)
      expect(runGuard('/elsewhere')).toHaveBeenCalledWith(false)
    })

    it('shows a success snackbar after copying the SQL template', async () => {
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      })
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')

      await mounted.wrapper.get('[data-testid="feature-analysis-editor-custom-sql-copy"]').trigger('click')
      await flushPromises()

      const snackbar = mounted.wrapper.findComponent(AtlasSnackbar)
      expect(snackbar.props('modelValue')).toBe(true)
      expect(snackbar.props('text')).toBe('Copied To Clipboard!')
      expect(snackbar.props('severity')).toBe('success')
      expect(snackbar.props('timeout')).toBe(3000)
    })

    it('logs and still mounts when domain and aggregate lookups fail', async () => {
      const domainsError = new Error('domains down')
      const aggregatesError = new Error('aggregates down')
      vi.mocked(listFeatureAnalysisDomains).mockRejectedValueOnce(domainsError)
      vi.mocked(listFeatureAnalysisAggregates).mockRejectedValueOnce(aggregatesError)

      mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=DISTRIBUTION')

      expect(logger.error).toHaveBeenCalledWith('FeatureAnalysisEditor', expect.any(String), domainsError)
      expect(logger.error).toHaveBeenCalledWith('FeatureAnalysisEditor', expect.any(String), aggregatesError)
    })

    it('logs a failed aggregate lookup in edit mode', async () => {
      const aggregatesError = new Error('aggregates down')
      vi.mocked(listFeatureAnalysisAggregates).mockRejectedValueOnce(aggregatesError)
      vi.mocked(getFeatureAnalysis).mockResolvedValue(success(distributionFA()))

      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' } })

      expect(logger.error).toHaveBeenCalledWith('FeatureAnalysisEditor', expect.any(String), aggregatesError)
    })
  })

  describe('toolbar gating', () => {
    it('lists the store domains in the domain select and passes the store error to the shell', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      expect(mounted.wrapper.findComponent(AtlasSelect).props('items')).toEqual(['DEMOGRAPHICS', 'CONDITION'])
      expect(mounted.wrapper.findComponent(AnalysisBuilderShell).props('error')).toBeNull()
    })

    it('explains a missing name and enables Save once a non-blank name is typed', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      const reason = () => mounted!.wrapper.findComponent(DisabledReasonTooltip).props('reason')

      expect(saveButton(mounted.wrapper).disabled).toBe(true)
      expect(reason()).toBe('Give the feature analysis a name before saving.')

      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue('   ')
      expect(saveButton(mounted.wrapper).disabled).toBe(true)
      expect(reason()).toBe('Give the feature analysis a name before saving.')

      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue(' x ')
      expect(saveButton(mounted.wrapper).disabled).toBe(false)
      expect(reason()).toBe('')
    })

    it('disables Save while the store is loading', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue('Named')
      useFeatureAnalysesStore().loading = true
      await flushPromises()

      expect(saveButton(mounted.wrapper).disabled).toBe(true)
      expect(mounted.wrapper.findComponent(EntityAccessLockButton).props('loading')).toBe(true)
    })

    it('blocks creating without the create permission', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE', { create: [] })
      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue('Named')

      expect(saveButton(mounted.wrapper).disabled).toBe(true)
      expect(mounted.wrapper.findComponent(DisabledReasonTooltip).props('reason')).toBe(
        'You do not have permission to create a feature analysis.'
      )
    })

    it('keeps the access lock disabled for an unsaved analysis', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      expect(mounted.wrapper.findComponent(EntityAccessLockButton).props('disabled')).toBe(true)
      expect(mounted.wrapper.findComponent({ name: 'EntityAccessDialog' }).props('entityId')).toBeNull()
      expect(mounted.wrapper.find('[data-testid="entity-access-dialog"]').exists()).toBe(false)
    })

    it('blocks editing without write access and enables it with a per-entity write grant', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(success(distributionFA()))

      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' }, create: [], write: [] })
      expect(saveButton(mounted.wrapper).disabled).toBe(true)
      expect(mounted.wrapper.findComponent(EntityAccessLockButton).props('disabled')).toBe(true)
      expect(mounted.wrapper.findComponent(DisabledReasonTooltip).props('reason')).toBe(
        'You do not own this feature analysis and have not been granted write access to it.'
      )
      mounted.wrapper.unmount()

      mounted = await mountEditor('/feature-analyses/42', {
        props: { id: '42' },
        create: [],
        write: [],
        feAnalysisGrants: { '42': { accessTypes: ['WRITE'], isOwner: false } },
      })
      expect(saveButton(mounted.wrapper).disabled).toBe(false)
      expect(mounted.wrapper.findComponent(EntityAccessLockButton).props('disabled')).toBe(false)
    })
  })

  describe('dirty tracking and the leave guard', () => {
    it('lets navigation through immediately when nothing changed after loading', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(
        success({ id: 7, name: 'SQL', description: 'x', type: 'CUSTOM_FE', domain: 'CONDITION', design: 'SELECT 1' } as never)
      )
      mounted = await mountEditor('/feature-analyses/7', { props: { id: '7' } })

      expect(runGuard('/elsewhere')).toHaveBeenCalledWith()
      expect(dialogByTitle(mounted.wrapper, 'Unsaved changes').exists()).toBe(false)
    })

    it('marks the form dirty when only the custom SQL changes', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(
        success({ id: 7, name: 'SQL', description: 'x', type: 'CUSTOM_FE', domain: 'CONDITION', design: 'SELECT 1' } as never)
      )
      mounted = await mountEditor('/feature-analyses/7', { props: { id: '7' } })

      await mounted.wrapper.get('[data-testid="feature-analysis-editor-custom-sql"] textarea').setValue('SELECT 2')
      await flushPromises()

      expect(runGuard('/elsewhere')).toHaveBeenCalledWith(false)
    })

    it('marks the form dirty when the prevalence editor adds a row in place', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=PREVALENCE')
      expect(runGuard('/elsewhere')).toHaveBeenCalledWith()

      await mounted.wrapper.get('[data-testid="fa-prevalence-add-criteria"]').trigger('click')
      await flushPromises()

      expect(runGuard('/elsewhere')).toHaveBeenCalledWith(false)
    })

    it('rehydrates the form when the store loads a different analysis and stays clean', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      const store = useFeatureAnalysesStore()
      store.currentFA = { id: 8, name: 'Swapped in', description: 'd', type: 'CUSTOM_FE', design: 'SELECT 8' } as never
      await flushPromises()

      expect(
        (mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').element as HTMLInputElement).value
      ).toBe('Swapped in')
      expect(
        (mounted.wrapper.get('[data-testid="feature-analysis-editor-custom-sql"] textarea').element as HTMLTextAreaElement).value
      ).toBe('SELECT 8')
      expect(runGuard('/elsewhere')).toHaveBeenCalledWith()
    })

    it('shows the dialog on a dirty leave, lets the confirmed navigation through once, then guards again', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue('Dirty')
      await flushPromises()
      const pushSpy = vi.spyOn(mounted.router, 'push')

      expect(runGuard('/elsewhere')).toHaveBeenCalledWith(false)
      await flushPromises()
      expect(dialogByTitle(mounted.wrapper, 'Unsaved changes').text()).toContain('Unsaved changes will be lost. Proceed?')

      await mounted.wrapper.get('[data-testid="feature-analysis-editor-discard-changes"]').trigger('click')
      await flushPromises()
      expect(pushSpy).toHaveBeenCalledWith('/elsewhere')
      expect(dialogByTitle(mounted.wrapper, 'Unsaved changes').exists()).toBe(false)

      expect(runGuard('/elsewhere')).toHaveBeenCalledWith()

      pushSpy.mockClear()
      expect(runGuard('/other')).toHaveBeenCalledWith(false)
      await flushPromises()
      expect(dialogByTitle(mounted.wrapper, 'Unsaved changes').exists()).toBe(true)
      setupState(mounted.wrapper).confirmLeaveUnsaved()
      await flushPromises()
      expect(pushSpy).toHaveBeenCalledWith('/other')
    })

    it('keeps the first pending target when a second leave is attempted during confirmation', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue('Dirty')
      await flushPromises()
      const pushSpy = vi.spyOn(mounted.router, 'push')

      runGuard('/elsewhere')
      expect(runGuard('/other')).toHaveBeenCalledWith(false)
      setupState(mounted.wrapper).confirmLeaveUnsaved()
      await flushPromises()

      expect(pushSpy).toHaveBeenCalledTimes(1)
      expect(pushSpy).toHaveBeenCalledWith('/elsewhere')
    })

    it('cancelling keeps the user on the page and a later leave prompts for the new target', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      await mounted.wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue('Dirty')
      await flushPromises()
      const pushSpy = vi.spyOn(mounted.router, 'push')

      runGuard('/elsewhere')
      setupState(mounted.wrapper).cancelLeaveUnsaved()
      await flushPromises()
      expect(dialogByTitle(mounted.wrapper, 'Unsaved changes').exists()).toBe(false)

      expect(runGuard('/other')).toHaveBeenCalledWith(false)
      setupState(mounted.wrapper).confirmLeaveUnsaved()
      await flushPromises()
      expect(pushSpy).toHaveBeenCalledWith('/other')
      expect(pushSpy).not.toHaveBeenCalledWith('/elsewhere')
    })

    it('confirming with no pending navigation does nothing', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      const pushSpy = vi.spyOn(mounted.router, 'push')
      expect(() => setupState(mounted!.wrapper).confirmLeaveUnsaved()).not.toThrow()
      expect(pushSpy).not.toHaveBeenCalled()
    })
  })

  describe('concept sets', () => {
    it('converts stored concept sets for the list dialog, defaulting missing fields', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(
        success(
          distributionFA({
            conceptSets: [
              {
                id: 11,
                name: 'Full',
                expression: {
                  items: [
                    { concept: fullConcept, isExcluded: true, includeDescendants: true, includeMapped: true },
                    {},
                  ],
                },
              },
              { expression: { items: [] } },
            ],
          })
        )
      )
      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' } })

      expect(mounted.wrapper.findComponent({ name: 'VBadge' }).props('content')).toBe(2)
      expect(conceptSetsDialog(mounted.wrapper).props('modelValue')).toBe(false)
      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toEqual([
        {
          id: 11,
          name: 'Full',
          items: [
            {
              conceptId: 123,
              conceptName: 'Alpha concept',
              conceptCode: 'A123',
              domainId: 'Condition',
              vocabularyId: 'SNOMED',
              conceptClassId: 'Clinical Finding',
              standardConcept: 'S',
              invalidReason: 'D',
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
        { id: 1, name: '', items: [] },
      ])
    })

    it('reports only the concept sets the design references as used', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(
        success(
          distributionFA({
            design: [windowed(11)],
            conceptSets: [
              { id: 11, name: 'Used', expression: { items: [] } },
              { id: 12, name: 'Unused', expression: { items: [] } },
            ],
          })
        )
      )
      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' } })

      expect(conceptSetsDialog(mounted.wrapper).props('usedConceptSets')).toEqual([
        { id: 11, name: 'Used', items: [] },
      ])
      expect(mounted.wrapper.findComponent(FeatureAnalysisDistributionEditor).props('design')).toMatchObject([windowed(11)])
      expect(setupState(mounted.wrapper).prevalenceDraftDesign).toEqual([])
      expect(setupState(mounted.wrapper).prevalenceDraftConceptSets).toEqual([])
    })

    it('deletes an unused concept set immediately without a confirmation', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(
        success(
          distributionFA({
            conceptSets: [
              { id: 11, name: 'First', expression: { items: [] } },
              { id: 12, name: 'Second', expression: { items: [] } },
            ],
          })
        )
      )
      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' } })

      conceptSetsDialog(mounted.wrapper).vm.$emit('delete', { id: 12, name: 'Second', items: [] })
      await flushPromises()

      expect((conceptSetsDialog(mounted.wrapper).props('conceptSets') as { id: number }[]).map(set => set.id)).toEqual([11])
      expect(dialogByTitle(mounted.wrapper, 'Delete concept set?').exists()).toBe(false)
    })

    it('ignores delete requests for unknown or id-less concept sets', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(
        success(
          distributionFA({
            conceptSets: [
              { id: 11, name: 'First', expression: { items: [] } },
              { name: 'No id', expression: { items: [] } },
            ],
          })
        )
      )
      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' } })

      conceptSetsDialog(mounted.wrapper).vm.$emit('delete', { id: 99, name: 'Ghost', items: [] })
      conceptSetsDialog(mounted.wrapper).vm.$emit('delete', { name: 'No id', items: [] })
      await flushPromises()

      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toHaveLength(2)
    })

    it('ignores concept set deletes for a Custom SQL analysis', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CUSTOM_FE')
      expect(() => conceptSetsDialog(mounted!.wrapper).vm.$emit('delete', { id: 1, name: 'x', items: [] })).not.toThrow()
      await flushPromises()
      expect(dialogByTitle(mounted.wrapper, 'Delete concept set?').exists()).toBe(false)
    })

    it('asks before deleting a used concept set, then clears its references on confirm', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(
        success(
          distributionFA({
            design: [windowed(11)],
            conceptSets: [{ id: 11, name: 'Used', expression: { items: [] } }],
          })
        )
      )
      vi.mocked(updateFeatureAnalysis).mockResolvedValue(success(distributionFA()))
      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' } })

      conceptSetsDialog(mounted.wrapper).vm.$emit('delete', { id: 11, name: 'Used', items: [] })
      await flushPromises()

      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toHaveLength(1)
      const dialog = dialogByTitle(mounted.wrapper, 'Delete concept set?')
      expect(dialog.text()).toContain('Deleting "Used" will clear it from those criteria')
      expect(dialog.text()).toContain('1 criterion still uses it.')

      await mounted.wrapper.get('[data-testid="feature-analysis-editor-delete-concept-set-confirm"]').trigger('click')
      await flushPromises()

      expect(dialogByTitle(mounted.wrapper, 'Delete concept set?').exists()).toBe(false)
      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toEqual([])

      saveButton(mounted.wrapper).click()
      await flushPromises()
      const payload = vi.mocked(updateFeatureAnalysis).mock.calls[0][0] as unknown as {
        design: { expression: { Criteria: { ConditionOccurrence: { CodesetId?: number } } } }[]
      }
      expect(payload.design[0].expression.Criteria.ConditionOccurrence.CodesetId).toBeUndefined()
    })

    it('uses the plural usage text and keeps the concept set when the delete is cancelled', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(
        success(
          distributionFA({
            design: [windowed(11), windowed(11)],
            conceptSets: [{ id: 11, name: 'Twice', expression: { items: [] } }],
          })
        )
      )
      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' } })

      conceptSetsDialog(mounted.wrapper).vm.$emit('delete', { id: 11, name: 'Twice', items: [] })
      await flushPromises()
      expect(dialogByTitle(mounted.wrapper, 'Delete concept set?').text()).toContain('2 criteria still use it.')

      const cancel = dialogByTitle(mounted.wrapper, 'Delete concept set?').findAll('button')
        .find(button => button.text() === 'Cancel')
      await cancel!.trigger('click')
      await flushPromises()

      expect(dialogByTitle(mounted.wrapper, 'Delete concept set?').exists()).toBe(false)
      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toHaveLength(1)
      expect(conceptSetsDialog(mounted.wrapper).props('usedConceptSets')).toHaveLength(1)
    })

    it('closes the list dialog and opens a blank editor from the create button', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(success(distributionFA()))
      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' } })
      const conceptSetsStore = useConceptSetsStore()
      const openCreate = vi.spyOn(conceptSetsStore, 'openCreateEditor')

      await mounted.wrapper.get('[data-testid="feature-analysis-editor-conceptsets-icon"]').trigger('click')
      await mounted.wrapper.get('[data-testid="feature-analysis-editor-conceptset-create"]').trigger('click')
      await flushPromises()

      expect(openCreate).toHaveBeenCalledTimes(1)
      expect(conceptSetsDialog(mounted.wrapper).props('modelValue')).toBe(false)
    })

    it('closes the list dialog when a concept set is opened for editing', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(
        success(distributionFA({ conceptSets: [{ id: 11, name: 'One', expression: { items: [] } }] }))
      )
      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' } })
      const conceptSetsStore = useConceptSetsStore()
      const openEmbedded = vi.spyOn(conceptSetsStore, 'openEmbeddedEditor')

      await mounted.wrapper.get('[data-testid="feature-analysis-editor-conceptsets-icon"]').trigger('click')
      conceptSetsDialog(mounted.wrapper).vm.$emit('view', { id: 11, name: 'One', items: [] })
      await flushPromises()

      expect(openEmbedded).toHaveBeenCalledWith({ id: 11, name: 'One', items: [] })
      expect(conceptSetsDialog(mounted.wrapper).props('modelValue')).toBe(false)
    })

    it('keeps an applied set id, replaces an existing set in place and appends new ones', async () => {
      vi.mocked(getFeatureAnalysis).mockResolvedValue(
        success(
          distributionFA({
            conceptSets: [
              { id: 11, name: 'Original', expression: { items: [] } },
              { id: 12, name: 'Other', expression: { items: [] } },
            ],
          })
        )
      )
      mounted = await mountEditor('/feature-analyses/42', { props: { id: '42' } })
      const state = setupState(mounted.wrapper)

      state.handleConceptSetApplied({ id: 11, name: 'Renamed', items: [] })
      state.handleConceptSetApplied({ id: 50, name: 'Brand new', items: [] })
      await flushPromises()

      expect(
        (conceptSetsDialog(mounted.wrapper).props('conceptSets') as { id: number; name: string }[]).map(set => [set.id, set.name])
      ).toEqual([
        [11, 'Renamed'],
        [12, 'Other'],
        [50, 'Brand new'],
      ])
      expect(conceptSetsDialog(mounted.wrapper).props('modelValue')).toBe(true)
      expect(setupState(mounted.wrapper).distributionDraftConceptSets).toHaveLength(3)
    })

    it('keeps distribution-only computeds empty for a prevalence draft with concept sets', async () => {
      mounted = await mountEditor('/feature-analyses/new?type=CRITERIA_SET&statType=PREVALENCE')
      setupState(mounted.wrapper).handleConceptSetApplied({ id: 3, name: 'Prev set', items: [] })
      await flushPromises()

      const state = setupState(mounted.wrapper)
      expect(state.prevalenceDraftConceptSets).toHaveLength(1)
      expect(state.distributionDraftConceptSets).toEqual([])
      expect(state.distributionDraftDesign).toEqual([])
      expect(mounted.wrapper.findComponent({ name: 'VBadge' }).props('content')).toBe(1)
    })
  })
})
