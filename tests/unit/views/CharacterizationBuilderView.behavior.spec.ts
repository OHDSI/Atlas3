import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

import type { CharacterizationDefinition } from '@/models/characterization.types'
import { useAuthStore } from '@/stores/auth'
import { useCharacterizationStore } from '@/stores/characterization'
import { emptyEntityAccess } from '@/models/auth.types'
import { permissionService } from '@/services/auth/permissions'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/characterization.service', () => ({
  listCharacterizations: vi.fn(),
  getCharacterization: vi.fn(),
  createCharacterization: vi.fn(),
  updateCharacterization: vi.fn(),
  assignCharacterizationTag: vi.fn(),
  unassignCharacterizationTag: vi.fn(),
  deleteCharacterization: vi.fn(),
  characterizationNameExists: vi.fn(),
  exportCharacterization: vi.fn(),
  importCharacterization: vi.fn(),
  listCharacterizationExecutions: vi.fn(),
}))

vi.mock('@/services/feature-analysis.service', () => ({
  listFeatureAnalyses: vi.fn(),
}))

vi.mock('@/services/cohort-definition.service', () => ({
  getCohorts: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  getCharacterization,
  createCharacterization,
  updateCharacterization,
  assignCharacterizationTag,
  unassignCharacterizationTag,
  listCharacterizations,
  exportCharacterization,
  importCharacterization,
} from '@/services/characterization.service'
import { listFeatureAnalyses } from '@/services/feature-analysis.service'
import { getCohorts } from '@/services/cohort-definition.service'
import { logger } from '@/utils/logger'
import CharacterizationBuilderView from '@/views/CharacterizationBuilderView.vue'
import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'
import DisabledReasonTooltip from '@/components/shared/DisabledReasonTooltip.vue'
import { AtlasSnackbar } from '@/components/ui'
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'
import { tr } from '../../helpers/i18n-mock'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

interface SetupState {
  handleTagsApply: (tags: { id: number; name: string }[]) => Promise<boolean>
  confirmDeleteConceptSet: () => void
  handleConceptSetApplied: (set: { id?: number | string; name: string; items?: unknown[] }) => void
  deleteConceptSetWarning: string
}

const COHORT = { id: 11, name: 'Diabetes' }
const FEATURE = { id: 21, name: 'Demographics' }

function validDesign(overrides: Partial<CharacterizationDefinition> = {}): CharacterizationDefinition {
  return {
    id: 42,
    name: 'Diabetes Cohort Profile',
    description: 'Demographics + comorbidities',
    cohorts: [COHORT],
    featureAnalyses: [FEATURE],
    stratas: [],
    ...overrides,
  } as CharacterizationDefinition
}

function criteriaUsing(...codesetIds: number[]) {
  return {
    Type: 'ALL',
    CriteriaList: codesetIds.map(id => ({ Criteria: { ConditionOccurrence: { CodesetId: id } } })),
    DemographicCriteriaList: [],
    Groups: [],
  }
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/characterizations', name: 'characterizations', component: { template: '<div data-testid="char-list" />' } },
      { path: '/characterizations/new', name: 'characterization-new', component: CharacterizationBuilderView },
      { path: '/characterizations/:id', name: 'characterization-edit', component: CharacterizationBuilderView, props: true },
      { path: '/elsewhere', name: 'elsewhere', component: { template: '<div />' } },
      { path: '/other', name: 'other', component: { template: '<div />' } },
    ],
  })
}

interface MountOptions {
  create?: string[]
  write?: string[]
}

async function mountAt(path: string, options: MountOptions = {}) {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: {
      create: options.create ?? ['create:cohort-characterization'],
      write: options.write ?? ['write:cohort-characterization'],
    },
    entityAccess: emptyEntityAccess(),
  })

  const Root = { template: '<v-app><router-view /></v-app>' }
  const wrapper = mount(Root, {
    global: {
      plugins: [vuetify, pinia, router],
      stubs: {
        CharacterizationWorkbench: {
          name: 'CharacterizationWorkbench',
          props: ['modelValue', 'characterizationId', 'availableCohorts', 'availableFeatureAnalyses'],
          emits: ['update:modelValue', 'explore', 'snackbar'],
          template: '<div data-testid="wb" />',
        },
        CharacterizationMessagesTab: { name: 'CharacterizationMessagesTab', props: ['characterization'], template: '<div />' },
        ExplorePrevalenceDialog: { name: 'ExplorePrevalenceDialog', props: ['modelValue', 'stat'], template: '<div />' },
        ConceptSetsListDialog: {
          name: 'ConceptSetsListDialog',
          props: ['modelValue', 'conceptSets', 'usedConceptSets'],
          emits: ['delete', 'view'],
          template: '<div v-if="modelValue" data-testid="concept-sets-dialog"><slot name="actions" /></div>',
        },
        ConceptSetEditor: { name: 'ConceptSetEditor', props: ['modelValue', 'conceptSet', 'embedded'], template: '<div />' },
        EntityAccessDialog: { name: 'EntityAccessDialog', props: ['modelValue', 'entityId'], template: '<div />' },
        TagSelectionDialog: { name: 'TagSelectionDialog', props: ['modelValue', 'selectedTags', 'onApply'], template: '<div />' },
        AtlasDialog: {
          name: 'AtlasDialog',
          props: ['modelValue', 'title', 'eyebrow'],
          emits: ['close'],
          template: '<div v-if="modelValue" data-testid="atlas-dialog" :data-title="title"><slot /><slot name="actions" /></div>',
        },
      },
    },
  })

  await router.isReady()
  await flushPromises()
  return { wrapper, router }
}

async function waitForPath(router: Router, path: string): Promise<void> {
  await vi.waitFor(() => {
    if (router.currentRoute.value.path !== path) {
      throw new Error(`still at ${router.currentRoute.value.path}, want ${path}`)
    }
  })
  await flushPromises()
}

function builder(wrapper: VueWrapper) {
  return wrapper.findComponent(CharacterizationBuilderView)
}

function setupState(wrapper: VueWrapper): SetupState {
  return (builder(wrapper).vm as unknown as { $: { setupState: SetupState } }).$.setupState
}

function workbench(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: 'CharacterizationWorkbench' })
}

async function changeDraft(wrapper: VueWrapper, next: CharacterizationDefinition) {
  workbench(wrapper).vm.$emit('update:modelValue', next)
  await flushPromises()
}

function snackbar(wrapper: VueWrapper) {
  return wrapper.findComponent(AtlasSnackbar)
}

function saveButton(wrapper: VueWrapper): HTMLButtonElement {
  return wrapper.get('[data-testid="char-builder-save"]').element as HTMLButtonElement
}

function validationBadge(wrapper: VueWrapper) {
  return wrapper.findAllComponents({ name: 'VBadge' })[0]
}

function dialogByTitle(wrapper: VueWrapper, title: string) {
  return wrapper.find(`[data-testid="atlas-dialog"][data-title="${title}"]`)
}

function conceptSetsDialog(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: 'ConceptSetsListDialog' })
}

function toolsMenuLoading(wrapper: VueWrapper): unknown {
  return wrapper
    .findAllComponents({ name: 'AtlasIconButton' })
    .find(button => button.attributes('data-testid') === 'char-builder-tools-menu')!
    .props('loading')
}

async function changeImportFile(wrapper: VueWrapper, files: unknown) {
  const input = wrapper.get('[data-testid="char-builder-import-input"]')
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsText(blob)
  })
}

function jsonFile(content: string) {
  return { name: 'design.json', text: () => Promise.resolve(content) }
}

describe('CharacterizationBuilderView behavior', () => {
  let mounted: { wrapper: VueWrapper; router: Router } | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    permissionService.clearCache()
    vi.mocked(listCharacterizations).mockResolvedValue(success([]))
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success([]))
    vi.mocked(getCohorts).mockResolvedValue(success([]))
    vi.mocked(assignCharacterizationTag).mockResolvedValue(success(undefined))
    vi.mocked(unassignCharacterizationTag).mockResolvedValue(success(undefined))
    vi.mocked(getCharacterization).mockResolvedValue(success(validDesign()))
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  describe('new-mode initial state', () => {
    it('starts with an empty draft, closed dialogs and an idle snackbar', async () => {
      mounted = await mountAt('/characterizations/new')
      const { wrapper } = mounted

      expect(workbench(wrapper).props('modelValue')).toEqual({
        name: '',
        description: '',
        cohorts: [],
        featureAnalyses: [],
        stratas: [],
      })
      expect(workbench(wrapper).props('characterizationId')).toBeNull()
      expect(wrapper.findComponent(AnalysisBuilderShell).props('title')).toBe(tr('cc.newCharacterization'))
      expect(wrapper.findComponent(AnalysisBuilderShell).props('error')).toBeNull()

      expect(conceptSetsDialog(wrapper).props('modelValue')).toBe(false)
      expect(wrapper.findComponent({ name: 'ExplorePrevalenceDialog' }).props('modelValue')).toBe(false)
      expect(wrapper.findComponent({ name: 'EntityAccessDialog' }).props('modelValue')).toBe(false)
      expect(wrapper.findComponent({ name: 'TagSelectionDialog' }).exists()).toBe(false)
      expect(wrapper.find('[data-testid="atlas-dialog"]').exists()).toBe(false)
      expect(toolsMenuLoading(wrapper)).toBe(false)

      expect(snackbar(wrapper).props('modelValue')).toBe(false)
      expect(snackbar(wrapper).props('text')).toBe('')
      expect(snackbar(wrapper).props('severity')).toBe('success')
      expect(snackbar(wrapper).props('timeout')).toBe(3000)

      const tagsBadge = wrapper.findAllComponents({ name: 'VBadge' })[1]
      expect(tagsBadge.props('content')).toBe(0)
      expect(tagsBadge.props('modelValue')).toBe(false)
    })

    it('shows three validation errors on the badge for an empty draft', async () => {
      mounted = await mountAt('/characterizations/new')
      const badge = validationBadge(mounted.wrapper)
      expect(badge.props('modelValue')).toBe(true)
      expect(badge.props('color')).toBe('error')
      expect(badge.props('content')).toBe(3)
    })

    it('switches the badge to a warning count, then hides it once the design is clean', async () => {
      mounted = await mountAt('/characterizations/new')
      await changeDraft(
        mounted.wrapper,
        validDesign({ id: undefined, stratas: [{ id: 's1', name: '', criteria: criteriaUsing() }] as never })
      )
      expect(validationBadge(mounted.wrapper).props('color')).toBe('warning')
      expect(validationBadge(mounted.wrapper).props('content')).toBe(1)
      expect(validationBadge(mounted.wrapper).props('modelValue')).toBe(true)

      await changeDraft(mounted.wrapper, validDesign({ id: undefined }))
      expect(validationBadge(mounted.wrapper).props('modelValue')).toBe(false)
      expect(validationBadge(mounted.wrapper).props('color')).toBe('default')
      expect(validationBadge(mounted.wrapper).props('content')).toBe(0)
    })

    it('passes loaded picker data to the workbench', async () => {
      vi.mocked(getCohorts).mockResolvedValue(success([COHORT] as never))
      vi.mocked(listFeatureAnalyses).mockResolvedValue(success([FEATURE] as never))
      mounted = await mountAt('/characterizations/new')

      expect(workbench(mounted.wrapper).props('availableCohorts')).toEqual([COHORT])
      expect(workbench(mounted.wrapper).props('availableFeatureAnalyses')).toEqual([FEATURE])
    })

    it('keeps picker lists empty and logs when the lookups fail', async () => {
      const cohortError = new ApiError('cohorts down', 500, null)
      const faError = new ApiError('fa down', 500, null)
      vi.mocked(getCohorts).mockResolvedValue(failure(cohortError))
      vi.mocked(listFeatureAnalyses).mockResolvedValue(failure(faError))
      mounted = await mountAt('/characterizations/new')

      expect(workbench(mounted.wrapper).props('availableCohorts')).toEqual([])
      expect(workbench(mounted.wrapper).props('availableFeatureAnalyses')).toEqual([])
      expect(logger.error).toHaveBeenCalledWith('CharacterizationBuilder', expect.any(String), cohortError)
      expect(logger.error).toHaveBeenCalledWith('CharacterizationBuilder', expect.any(String), faError)
    })

    it('logs a thrown cohort lookup', async () => {
      const boom = new Error('network')
      vi.mocked(getCohorts).mockRejectedValue(boom)
      mounted = await mountAt('/characterizations/new')

      expect(logger.error).toHaveBeenCalledWith('CharacterizationBuilder', expect.any(String), boom)
      expect(workbench(mounted.wrapper).props('availableCohorts')).toEqual([])
    })
  })

  describe('title and hydration', () => {
    it('uses the trimmed loaded name as the title and falls back to Edit when it is blank', async () => {
      vi.mocked(getCharacterization).mockResolvedValue(success(validDesign({ name: '  Padded  ' })))
      mounted = await mountAt('/characterizations/42')
      const shell = () => mounted!.wrapper.findComponent(AnalysisBuilderShell)

      expect(shell().props('title')).toBe('Padded')

      await changeDraft(mounted.wrapper, validDesign({ name: '   ' }))
      expect(shell().props('title')).toBe(tr('common.edit'))
    })

    it('copies the loaded design into the draft, normalizing a missing description', async () => {
      const stratas = [{ id: 's1', name: 'Male', criteria: criteriaUsing() }]
      vi.mocked(getCharacterization).mockResolvedValue(
        success(validDesign({ description: null as never, stratas: stratas as never }))
      )
      mounted = await mountAt('/characterizations/42')

      const model = workbench(mounted.wrapper).props('modelValue') as CharacterizationDefinition
      expect(model.description).toBe('')
      expect(model.stratas).toEqual(stratas)
      expect(model.cohorts).toEqual([COHORT])
      expect(model.featureAnalyses).toEqual([FEATURE])
      expect(workbench(mounted.wrapper).props('characterizationId')).toBe(42)
      expect(useCharacterizationStore().isDirty).toBe(false)
    })

    it('keeps a loaded description', async () => {
      mounted = await mountAt('/characterizations/42')
      expect((workbench(mounted.wrapper).props('modelValue') as CharacterizationDefinition).description).toBe(
        'Demographics + comorbidities'
      )
    })

    it('fills in a missing description with an empty string', async () => {
      const design = validDesign()
      delete (design as Partial<CharacterizationDefinition>).description
      vi.mocked(getCharacterization).mockResolvedValue(success(design))
      mounted = await mountAt('/characterizations/42')
      expect((workbench(mounted.wrapper).props('modelValue') as CharacterizationDefinition).description).toBe('')
    })
  })

  describe('workbench events', () => {
    it('opens the explore dialog with the row the workbench emits', async () => {
      mounted = await mountAt('/characterizations/new')
      const row = { covariateId: 1, covariateName: 'Age' }
      workbench(mounted.wrapper).vm.$emit('explore', row)
      await flushPromises()

      const explore = mounted.wrapper.findComponent({ name: 'ExplorePrevalenceDialog' })
      expect(explore.props('modelValue')).toBe(true)
      expect(explore.props('stat')).toEqual(row)
    })

    it('relays workbench snackbars with error and info styling', async () => {
      mounted = await mountAt('/characterizations/new')

      workbench(mounted.wrapper).vm.$emit('snackbar', 'Broken', 'error')
      await flushPromises()
      expect(snackbar(mounted.wrapper).props('text')).toBe('Broken')
      expect(snackbar(mounted.wrapper).props('severity')).toBe('danger')
      expect(snackbar(mounted.wrapper).props('timeout')).toBe(5000)
      expect(snackbar(mounted.wrapper).props('modelValue')).toBe(true)

      workbench(mounted.wrapper).vm.$emit('snackbar', 'FYI', 'info')
      await flushPromises()
      expect(snackbar(mounted.wrapper).props('severity')).toBe('info')
      expect(snackbar(mounted.wrapper).props('timeout')).toBe(3000)
    })

    it('marks the store dirty when the draft changes', async () => {
      mounted = await mountAt('/characterizations/new')
      expect(useCharacterizationStore().isDirty).toBe(false)
      await mounted.wrapper.get('[data-testid="char-builder-name"]').setValue('Typed')
      expect(useCharacterizationStore().isDirty).toBe(true)
      expect((workbench(mounted.wrapper).props('modelValue') as CharacterizationDefinition).name).toBe('Typed')
    })
  })

  describe('save gating', () => {
    it('requires a non-blank name and explains why', async () => {
      mounted = await mountAt('/characterizations/new')
      const reason = () => mounted!.wrapper.findComponent(DisabledReasonTooltip).props('reason')

      expect(saveButton(mounted.wrapper).disabled).toBe(true)
      expect(reason()).toBe(tr('const.disabledReason.needsName', { entity: tr('const.entityName.characterization') }))

      await mounted.wrapper.get('[data-testid="char-builder-name"]').setValue('   ')
      expect(saveButton(mounted.wrapper).disabled).toBe(true)

      await mounted.wrapper.get('[data-testid="char-builder-name"]').setValue('Named')
      expect(saveButton(mounted.wrapper).disabled).toBe(false)
      expect(reason()).toBe('')
    })

    it('disables Save while the store is loading', async () => {
      mounted = await mountAt('/characterizations/new')
      await mounted.wrapper.get('[data-testid="char-builder-name"]').setValue('Named')
      useCharacterizationStore().loading = true
      await flushPromises()
      expect(saveButton(mounted.wrapper).disabled).toBe(true)
    })

    it('blocks creating without the create permission', async () => {
      mounted = await mountAt('/characterizations/new', { create: [] })
      await mounted.wrapper.get('[data-testid="char-builder-name"]').setValue('Named')

      expect(saveButton(mounted.wrapper).disabled).toBe(true)
      expect(mounted.wrapper.findComponent(DisabledReasonTooltip).props('reason')).toBe(
        tr('const.disabledReason.noCreatePermission', { entity: tr('const.entityName.characterization') })
      )
    })

    it('blocks editing without write access', async () => {
      mounted = await mountAt('/characterizations/42', { create: [], write: [] })

      expect(saveButton(mounted.wrapper).disabled).toBe(true)
      expect(mounted.wrapper.findComponent(DisabledReasonTooltip).props('reason')).toBe(
        tr('const.disabledReason.noWriteAccess', { entity: tr('const.entityName.characterization') })
      )
    })
  })

  describe('save flow', () => {
    it('refuses to save an invalid design and opens the messages dialog', async () => {
      mounted = await mountAt('/characterizations/new')
      await mounted.wrapper.get('[data-testid="char-builder-name"]').setValue('No cohorts')

      saveButton(mounted.wrapper).click()
      await flushPromises()

      expect(createCharacterization).not.toHaveBeenCalled()
      expect(snackbar(mounted.wrapper).props('text')).toBe(tr('const.disabledReason.invalidDesign'))
      expect(snackbar(mounted.wrapper).props('severity')).toBe('danger')
      expect(dialogByTitle(mounted.wrapper, tr('cc.viewEdit.tabs.messages')).exists()).toBe(true)
    })

    it('disables Save while a create is in flight and reports success afterwards', async () => {
      mounted = await mountAt('/characterizations/new')
      const store = useCharacterizationStore()
      let resolveCreate: (value: CharacterizationDefinition | null) => void = () => {}
      vi.spyOn(store, 'create').mockImplementation(
        () => new Promise<CharacterizationDefinition | null>(resolve => { resolveCreate = resolve })
      )
      vi.mocked(getCharacterization).mockResolvedValue(success(validDesign({ id: 99 })))
      await changeDraft(mounted.wrapper, validDesign({ id: undefined }))

      saveButton(mounted.wrapper).click()
      await flushPromises()
      expect(saveButton(mounted.wrapper).disabled).toBe(true)

      resolveCreate(validDesign({ id: 99 }))
      await waitForPath(mounted.router, '/characterizations/99')

      expect(snackbar(mounted.wrapper).props('text')).toBe(tr('characterizations.editor.saveSuccess'))
      expect(snackbar(mounted.wrapper).props('severity')).toBe('success')
      expect(saveButton(mounted.wrapper).disabled).toBe(false)
    })

    it('stays on the new page with an error when create returns no id', async () => {
      mounted = await mountAt('/characterizations/new')
      vi.spyOn(useCharacterizationStore(), 'create').mockResolvedValue(validDesign({ id: undefined }))
      await changeDraft(mounted.wrapper, validDesign({ id: undefined }))

      saveButton(mounted.wrapper).click()
      await flushPromises()
      await flushPromises()

      expect(mounted.router.currentRoute.value.path).toBe('/characterizations/new')
      expect(snackbar(mounted.wrapper).props('text')).toBe(tr('cc.viewEdit.saveError'))
      expect(snackbar(mounted.wrapper).props('severity')).toBe('danger')
    })

    it('rehydrates from the updated design and marks it clean after an update', async () => {
      vi.mocked(updateCharacterization).mockResolvedValue(success(validDesign({ name: 'Server name' })))
      mounted = await mountAt('/characterizations/42')
      await mounted.wrapper.get('[data-testid="char-builder-name"]').setValue('Local name')
      expect(useCharacterizationStore().isDirty).toBe(true)

      saveButton(mounted.wrapper).click()
      await flushPromises()

      expect(vi.mocked(updateCharacterization).mock.calls[0][0]).toMatchObject({ id: 42, name: 'Local name' })
      expect((mounted.wrapper.get('[data-testid="char-builder-name"]').element as HTMLInputElement).value).toBe('Server name')
      expect(useCharacterizationStore().isDirty).toBe(false)
      expect(snackbar(mounted.wrapper).props('text')).toBe(tr('characterizations.editor.saveSuccess'))
      expect(snackbar(mounted.wrapper).props('severity')).toBe('success')
    })

    it('reports a failed update with the save error', async () => {
      mounted = await mountAt('/characterizations/42')
      vi.spyOn(useCharacterizationStore(), 'update').mockResolvedValue(null)

      saveButton(mounted.wrapper).click()
      await flushPromises()

      expect(snackbar(mounted.wrapper).props('text')).toBe(tr('cc.viewEdit.saveError'))
    })

    it('logs and reports a thrown save, then re-enables Save', async () => {
      mounted = await mountAt('/characterizations/42')
      const boom = new Error('network')
      vi.spyOn(useCharacterizationStore(), 'update').mockRejectedValue(boom)

      saveButton(mounted.wrapper).click()
      await flushPromises()

      expect(logger.error).toHaveBeenCalledWith('CharacterizationBuilder', expect.any(String), boom)
      expect(snackbar(mounted.wrapper).props('text')).toBe(tr('cc.viewEdit.saveError'))
      expect(snackbar(mounted.wrapper).props('severity')).toBe('danger')
      expect(saveButton(mounted.wrapper).disabled).toBe(false)
    })

    it('passes the store error to the shell', async () => {
      mounted = await mountAt('/characterizations/new')
      useCharacterizationStore().error = 'Server said no'
      await flushPromises()
      expect(mounted.wrapper.findComponent(AnalysisBuilderShell).props('error')).toBe('Server said no')
    })
  })

  describe('tags', () => {
    it('refuses to sync tags for an unsaved characterization', async () => {
      mounted = await mountAt('/characterizations/new')
      await expect(setupState(mounted.wrapper).handleTagsApply([{ id: 2, name: 'New' }])).resolves.toBe(false)
      expect(assignCharacterizationTag).not.toHaveBeenCalled()
    })

    it('reports a failed tag sync and stays quiet on success', async () => {
      mounted = await mountAt('/characterizations/42')
      const apply = setupState(mounted.wrapper).handleTagsApply

      await expect(apply([{ id: 2, name: 'New' }])).resolves.toBe(true)
      expect(snackbar(mounted.wrapper).props('modelValue')).toBe(false)

      vi.mocked(assignCharacterizationTag).mockResolvedValue(failure(new ApiError('nope', 500, null)))
      await expect(apply([{ id: 2, name: 'New' }, { id: 3, name: 'Other' }])).resolves.toBe(false)
      await flushPromises()
      expect(snackbar(mounted.wrapper).props('text')).toBe(tr('cc.viewEdit.saveError'))
      expect(snackbar(mounted.wrapper).props('severity')).toBe('danger')
    })
  })

  describe('concept sets', () => {
    it('maps strata concept sets for the dialog and flags only those the strata use', async () => {
      vi.mocked(getCharacterization).mockResolvedValue(
        success(
          validDesign({
            stratas: [{ id: 's1', name: 'Uses 11', criteria: criteriaUsing(11) }] as never,
            strataConceptSets: [
              { id: 11, name: 'Used', expression: { items: [] } },
              { id: 12, name: 'Unused', expression: { items: [] } },
              { expression: { items: [] } },
            ] as never,
          })
        )
      )
      mounted = await mountAt('/characterizations/42')

      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toEqual([
        { id: 11, name: 'Used', items: [] },
        { id: 12, name: 'Unused', items: [] },
        { id: 2, name: '', items: [] },
      ])
      expect(conceptSetsDialog(mounted.wrapper).props('usedConceptSets')).toEqual([{ id: 11, name: 'Used', items: [] }])
    })

    it('applies a concept set to a draft that had none', async () => {
      mounted = await mountAt('/characterizations/new')
      setupState(mounted.wrapper).handleConceptSetApplied({ name: 'First', items: [] })
      await flushPromises()

      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toEqual([{ id: 0, name: 'First', items: [] }])
      expect(conceptSetsDialog(mounted.wrapper).props('modelValue')).toBe(true)
    })

    it('deletes an unused set immediately and marks the draft dirty', async () => {
      vi.mocked(getCharacterization).mockResolvedValue(
        success(validDesign({ strataConceptSets: [{ id: 12, name: 'Unused', expression: { items: [] } }] as never }))
      )
      mounted = await mountAt('/characterizations/42')

      conceptSetsDialog(mounted.wrapper).vm.$emit('delete', { id: 12, name: 'Unused', items: [] })
      await flushPromises()

      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toEqual([])
      expect(dialogByTitle(mounted.wrapper, tr('components.conceptSetDelete.title')).exists()).toBe(false)
      expect(useCharacterizationStore().isDirty).toBe(true)
    })

    it('deleting from a draft without concept sets leaves it empty', async () => {
      mounted = await mountAt('/characterizations/new')
      conceptSetsDialog(mounted.wrapper).vm.$emit('delete', { id: 5, name: 'Ghost', items: [] })
      await flushPromises()
      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toEqual([])
    })

    it('asks before deleting a used set and clears the stratum reference on confirm', async () => {
      vi.mocked(getCharacterization).mockResolvedValue(
        success(
          validDesign({
            stratas: [{ id: 's1', name: 'Uses 11', criteria: criteriaUsing(11) }] as never,
            strataConceptSets: [{ id: 11, name: 'Used', expression: { items: [] } }] as never,
          })
        )
      )
      mounted = await mountAt('/characterizations/42')
      const title = tr('components.conceptSetDelete.title')

      conceptSetsDialog(mounted.wrapper).vm.$emit('delete', { id: 11, name: 'Used', items: [] })
      await flushPromises()

      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toHaveLength(1)
      expect(dialogByTitle(mounted.wrapper, title).text()).toContain(
        tr('components.conceptSetDelete.warning', { name: 'Used', usage: tr('components.conceptSetDelete.usageOne') })
      )

      await mounted.wrapper.get('[data-testid="char-builder-delete-concept-set-confirm"]').trigger('click')
      await flushPromises()

      expect(dialogByTitle(mounted.wrapper, title).exists()).toBe(false)
      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toEqual([])
      const model = workbench(mounted.wrapper).props('modelValue') as {
        stratas: { criteria: { CriteriaList: { Criteria: { ConditionOccurrence: { CodesetId?: number } } }[] } }[]
      }
      expect(model.stratas[0].criteria.CriteriaList[0].Criteria.ConditionOccurrence.CodesetId).toBeUndefined()
    })

    it('uses the plural usage text and keeps the set when cancelled', async () => {
      vi.mocked(getCharacterization).mockResolvedValue(
        success(
          validDesign({
            stratas: [{ id: 's1', name: 'Twice', criteria: criteriaUsing(11, 11) }] as never,
            strataConceptSets: [{ id: 11, name: 'Used', expression: { items: [] } }] as never,
          })
        )
      )
      mounted = await mountAt('/characterizations/42')
      const title = tr('components.conceptSetDelete.title')

      conceptSetsDialog(mounted.wrapper).vm.$emit('delete', { id: 11, name: 'Used', items: [] })
      await flushPromises()
      expect(dialogByTitle(mounted.wrapper, title).text()).toContain(
        tr('components.conceptSetDelete.usageMany', { count: 2 })
      )

      const cancel = dialogByTitle(mounted.wrapper, title).findAll('button').find(button => button.text() === tr('common.cancel'))
      await cancel!.trigger('click')
      await flushPromises()

      expect(dialogByTitle(mounted.wrapper, title).exists()).toBe(false)
      expect(conceptSetsDialog(mounted.wrapper).props('conceptSets')).toHaveLength(1)
    })

    it('renders a nameless warning and ignores a confirm with nothing pending', async () => {
      mounted = await mountAt('/characterizations/new')
      const state = setupState(mounted.wrapper)
      expect(state.deleteConceptSetWarning).toContain('Deleting ""')
      expect(() => state.confirmDeleteConceptSet()).not.toThrow()
    })
  })

  describe('export', () => {
    it('downloads the export as a slugged JSON file and shows the spinner meanwhile', async () => {
      const exported = { name: 'exported', cohorts: [] }
      let resolveExport: (value: unknown) => void = () => {}
      vi.mocked(exportCharacterization).mockImplementation(
        () => new Promise(resolve => { resolveExport = resolve }) as never
      )
      vi.mocked(getCharacterization).mockResolvedValue(success(validDesign({ name: '  ##Hello,   World##  ' })))
      const blobs: Blob[] = []
      const createObjectURL = vi.fn((blob: Blob) => {
        blobs.push(blob)
        return 'blob:export'
      })
      const revokeObjectURL = vi.fn()
      Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
      Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
      const clicked: { download: string; href: string; display: string; attached: boolean }[] = []
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ download: this.download, href: this.href, display: this.style.display, attached: document.body.contains(this) })
      })

      mounted = await mountAt('/characterizations/42')
      const builderState = builder(mounted.wrapper).vm as unknown as { $: { setupState: { handleExport: () => Promise<void> } } }
      const pending = builderState.$.setupState.handleExport()
      await flushPromises()
      expect(toolsMenuLoading(mounted.wrapper)).toBe(true)

      resolveExport(success(exported))
      await pending
      await flushPromises()

      expect(exportCharacterization).toHaveBeenCalledWith(42)
      expect(clicked).toEqual([{ download: 'characterization-hello-world-42.json', href: 'blob:export', display: 'none', attached: true }])
      expect(blobs[0].type).toBe('application/json;charset=utf-8;')
      await expect(readBlob(blobs[0])).resolves.toBe(JSON.stringify(exported, null, 2))
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:export')
      expect(toolsMenuLoading(mounted.wrapper)).toBe(false)
      clickSpy.mockRestore()
    })

    it('falls back to "design" when the name has no slug characters', async () => {
      vi.mocked(exportCharacterization).mockResolvedValue(success({}) as never)
      vi.mocked(getCharacterization).mockResolvedValue(success(validDesign({ name: '!!!' })))
      Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:x'), configurable: true })
      Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
      const downloads: string[] = []
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push(this.download)
      })

      mounted = await mountAt('/characterizations/42')
      await (builder(mounted.wrapper).vm as unknown as { $: { setupState: { handleExport: () => Promise<void> } } }).$.setupState.handleExport()

      expect(downloads).toEqual(['characterization-design-42.json'])
      clickSpy.mockRestore()
    })

    it('logs a failed export', async () => {
      const exportError = new ApiError('nope', 500, null)
      vi.mocked(exportCharacterization).mockResolvedValue(failure(exportError))
      mounted = await mountAt('/characterizations/42')
      await (builder(mounted.wrapper).vm as unknown as { $: { setupState: { handleExport: () => Promise<void> } } }).$.setupState.handleExport()

      expect(logger.error).toHaveBeenCalledWith('CharacterizationBuilder', expect.any(String), exportError)
      expect(toolsMenuLoading(mounted.wrapper)).toBe(false)
    })
  })

  describe('import', () => {
    it('does nothing when the file picker is dismissed', async () => {
      mounted = await mountAt('/characterizations/new')
      await changeImportFile(mounted.wrapper, [])
      await flushPromises()

      expect(importCharacterization).not.toHaveBeenCalled()
      expect(snackbar(mounted.wrapper).props('modelValue')).toBe(false)
    })

    it('reports unparseable JSON as a danger snackbar and clears the spinner', async () => {
      mounted = await mountAt('/characterizations/new')
      await changeImportFile(mounted.wrapper, [jsonFile('{not json')])
      await flushPromises()

      expect(importCharacterization).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith('CharacterizationBuilder', expect.any(String), expect.any(SyntaxError))
      expect(snackbar(mounted.wrapper).props('severity')).toBe('danger')
      expect(snackbar(mounted.wrapper).props('text')).toBe(tr('characterizations.editor.utilities.import.parseError'))
      expect(toolsMenuLoading(mounted.wrapper)).toBe(false)
    })

    it('shows the spinner during import and stays put when the import has no id', async () => {
      let resolveImport: (value: unknown) => void = () => {}
      vi.mocked(importCharacterization).mockImplementation(
        () => new Promise(resolve => { resolveImport = resolve }) as never
      )
      mounted = await mountAt('/characterizations/new')
      await mounted.wrapper.get('[data-testid="char-builder-name"]').setValue('Dirty')

      await changeImportFile(mounted.wrapper, [jsonFile('{"name":"x"}')])
      await flushPromises()
      expect(toolsMenuLoading(mounted.wrapper)).toBe(true)
      expect(importCharacterization).toHaveBeenCalledWith({ name: 'x' })

      resolveImport(success({ name: 'x' }))
      await flushPromises()
      await flushPromises()

      expect(mounted.router.currentRoute.value.path).toBe('/characterizations/new')
      expect(useCharacterizationStore().isDirty).toBe(false)
      expect(snackbar(mounted.wrapper).props('text')).toBe(tr('characterizations.editor.utilities.import.importSuccess'))
      expect(snackbar(mounted.wrapper).props('severity')).toBe('success')
      expect(toolsMenuLoading(mounted.wrapper)).toBe(false)
    })

    it('logs and reports a rejected import', async () => {
      const importError = new ApiError('bad design', 400, null)
      vi.mocked(importCharacterization).mockResolvedValue(failure(importError))
      mounted = await mountAt('/characterizations/new')

      await changeImportFile(mounted.wrapper, [jsonFile('{}')])
      await flushPromises()
      await flushPromises()

      expect(logger.error).toHaveBeenCalledWith('CharacterizationBuilder', expect.any(String), importError)
      expect(snackbar(mounted.wrapper).props('text')).toBe(tr('characterizations.editor.utilities.import.importError'))
      expect(snackbar(mounted.wrapper).props('severity')).toBe('danger')
      expect(toolsMenuLoading(mounted.wrapper)).toBe(false)
    })
  })

  describe('unsaved-changes leave guard', () => {
    it('navigates straight away when the draft is clean', async () => {
      mounted = await mountAt('/characterizations/42')
      await mounted.router.push('/elsewhere')
      await flushPromises()
      expect(mounted.router.currentRoute.value.path).toBe('/elsewhere')
    })

    it('blocks a dirty leave behind the dialog and resumes the first target on discard', async () => {
      mounted = await mountAt('/characterizations/42')
      const title = tr('common.unsavedChanges')
      await mounted.wrapper.get('[data-testid="char-builder-name"]').setValue('Dirty')

      await mounted.router.push('/elsewhere')
      await flushPromises()
      expect(mounted.router.currentRoute.value.path).toBe('/characterizations/42')
      expect(dialogByTitle(mounted.wrapper, title).text()).toContain(tr('common.unsavedWarning'))

      await mounted.router.push('/other')
      await flushPromises()
      expect(mounted.router.currentRoute.value.path).toBe('/characterizations/42')

      await mounted.wrapper.get('[data-testid="char-builder-discard-changes"]').trigger('click')
      await waitForPath(mounted.router, '/elsewhere')
    })

    it('cancelling keeps the user on the page and a later leave prompts again', async () => {
      mounted = await mountAt('/characterizations/42')
      const title = tr('common.unsavedChanges')
      await mounted.wrapper.get('[data-testid="char-builder-name"]').setValue('Dirty')

      await mounted.router.push('/elsewhere')
      await flushPromises()
      const cancel = dialogByTitle(mounted.wrapper, title).findAll('button').find(button => button.text() === tr('common.cancel'))
      await cancel!.trigger('click')
      await flushPromises()
      expect(dialogByTitle(mounted.wrapper, title).exists()).toBe(false)
      expect(mounted.router.currentRoute.value.path).toBe('/characterizations/42')

      await mounted.router.push('/other')
      await flushPromises()
      expect(dialogByTitle(mounted.wrapper, title).exists()).toBe(true)
      await mounted.wrapper.get('[data-testid="char-builder-discard-changes"]').trigger('click')
      await waitForPath(mounted.router, '/other')
    })
  })
})
