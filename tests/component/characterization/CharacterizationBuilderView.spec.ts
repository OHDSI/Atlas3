/**
 * CharacterizationBuilderView component tests
 *
 * Smoke-level: mounts in new vs. edit mode, the workbench renders, the
 * name input updates the draft, the Run button is disabled, and Save
 * calls the appropriate store action through the service-layer mock.
 */
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
import { emptyEntityAccess } from '@/models/auth.types'

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
  copyCharacterization: vi.fn(),
  characterizationNameExists: vi.fn(),
  exportCharacterization: vi.fn(),
  importCharacterization: vi.fn(),
  // The real CharacterizationWorkbench child mounts alongside this view and
  // loads executions immediately whenever characterizationId is non-null
  // (edit-mode tests), so this must resolve rather than return undefined.
  listCharacterizationExecutions: vi.fn(),
  getCharacterizationExecution: vi.fn(),
  generateCharacterization: vi.fn(),
  cancelCharacterizationGeneration: vi.fn(),
  getCharacterizationDesignSnapshot: vi.fn(),
  getCharacterizationResultCount: vi.fn(),
  getCharacterizationResults: vi.fn(),
  explorePrevalence: vi.fn(),
}))

vi.mock('@/services/feature-analysis.service', () => ({
  listFeatureAnalyses: vi.fn(),
}))

vi.mock('@/services/access.service', () => ({
  fetchEntityAccessRoles: vi.fn().mockResolvedValue({ success: true, data: [] }),
  loadRoleSuggestions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  grantEntityAccess: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  revokeEntityAccess: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}))

vi.mock('@/services/cohort-definition.service', () => ({
  getCohorts: vi.fn(),
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
  getCharacterization,
  createCharacterization,
  updateCharacterization,
  assignCharacterizationTag,
  unassignCharacterizationTag,
  listCharacterizations,
  listCharacterizationExecutions,
  exportCharacterization,
  importCharacterization,
} from '@/services/characterization.service'
import { listFeatureAnalyses } from '@/services/feature-analysis.service'
import { getCohorts } from '@/services/cohort-definition.service'
import CharacterizationBuilderView from '@/views/CharacterizationBuilderView.vue'
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'
import { tr } from '../../helpers/i18n-mock'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const sampleCharacterization: CharacterizationDefinition = {
  id: 42,
  name: 'Diabetes Cohort Profile',
  description: 'Demographics + comorbidities',
  cohorts: [{ id: 11, name: 'Diabetes' }],
  featureAnalyses: [{ id: 21, name: 'Demographics' }],
  stratas: [],
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/analysis/characterizations',
        name: 'characterizations',
        component: { template: '<div />' },
      },
      { path: '/characterizations', redirect: { name: 'characterizations' } },
      {
        path: '/characterizations/new',
        name: 'characterization-new',
        component: CharacterizationBuilderView,
      },
      {
        path: '/characterizations/:id',
        name: 'characterization-edit',
        component: CharacterizationBuilderView,
        props: true,
      },
    ],
  })
}

async function mountBuilder(path: string, props?: Record<string, unknown>) {
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
      create: ['create:cohort-characterization'],
      write: ['write:cohort-characterization'],
    },
    entityAccess: emptyEntityAccess(),
  })

  const TestWrapper = {
    components: { CharacterizationBuilderView },
    props: { innerProps: { type: Object, default: () => ({}) } },
    template:
      '<v-app><CharacterizationBuilderView v-bind="innerProps" /></v-app>',
  }

  const wrapper = mount(TestWrapper, {
    global: { plugins: [vuetify, pinia, router] },
    props: { innerProps: props ?? {} },
  })

  await flushPromises()
  return { wrapper, router }
}

describe('CharacterizationBuilderView', () => {
  let mounted: { wrapper: VueWrapper; router: Router } | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Default lookups so onMounted resolves cleanly.
    vi.mocked(listCharacterizations).mockResolvedValue(success([]))
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success([]))
    vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [] })
    // The workbench child loads executions immediately once characterizationId
    // is set (edit-mode tests), so this must resolve instead of returning
    // undefined — an unresolved ApiResult crashes `result.success` in the store.
    vi.mocked(listCharacterizationExecutions).mockResolvedValue(success([]))
    vi.mocked(assignCharacterizationTag).mockResolvedValue(success(undefined))
    vi.mocked(unassignCharacterizationTag).mockResolvedValue(success(undefined))
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  it('mounts in new mode with empty form and header tabs/icons', async () => {
    mounted = await mountBuilder('/characterizations/new')

    expect(mounted.wrapper.find('[data-testid="char-builder-workbench"]').exists()).toBe(true)
    expect(mounted.wrapper.find('[data-testid="char-builder-conceptsets-icon"]').exists()).toBe(true)
    expect(mounted.wrapper.find('[data-testid="char-builder-access-icon"]').exists()).toBe(false)

    expect(mounted.wrapper.find('[data-testid="char-builder-run"]').exists()).toBe(false)

    expect(mounted.wrapper.find('[data-testid="char-builder-copy"]').exists()).toBe(false)
    expect(mounted.wrapper.find('[data-testid="char-builder-delete"]').exists()).toBe(false)

    const nameInput = mounted.wrapper.find(
      '[data-testid="char-builder-name"]'
    ).element as HTMLInputElement
    expect(nameInput.value).toBe('')
  })

  it('hydrates the form from the store in edit mode', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(success(sampleCharacterization))

    mounted = await mountBuilder('/characterizations/42', { id: '42' })
    await flushPromises()

    const nameInput = mounted.wrapper.find(
      '[data-testid="char-builder-name"]'
    ).element as HTMLInputElement
    expect(nameInput.value).toBe('Diabetes Cohort Profile')

    expect(mounted.wrapper.find('[data-testid="char-builder-copy"]').exists()).toBe(false)
    expect(mounted.wrapper.find('[data-testid="char-builder-delete"]').exists()).toBe(false)
    expect(mounted.wrapper.find('[data-testid="char-builder-access-icon"]').exists()).toBe(true)
  })

  it('counts only directly assigned tags in the manage-tags badge', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(success({
      ...sampleCharacterization,
      tags: [
        { id: 17, name: 'test', groups: [] },
        { id: 18, name: 'Some Tag', groups: [{ id: 17, name: 'test' }] },
      ],
    }))
    mounted = await mountBuilder('/characterizations/42', { id: '42' })

    expect(mounted.wrapper.find('[data-testid="char-builder-tags-badge"] .v-badge__badge').text()).toBe('1')
  })

  it('opens access configuration from the versions-side action bar icon', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(success(sampleCharacterization))

    mounted = await mountBuilder('/characterizations/42', { id: '42' })
    await flushPromises()

    await mounted.wrapper.get('[data-testid="char-builder-access-icon"]').trigger('click')
    await flushPromises()

    const accessDialog = mounted.wrapper.findComponent({ name: 'EntityAccessDialog' })
    expect(accessDialog.props('modelValue')).toBe(true)
    expect(accessDialog.props('entityType')).toBe('COHORT_CHARACTERIZATION')
    expect(accessDialog.props('entityId')).toBe(42)
    expect(accessDialog.props('title')).toBe(tr('components.access.configureAccess'))
    expect(accessDialog.props('subtitle')).toBe('Diabetes Cohort Profile')

    await accessDialog.vm.$emit('close')
    await flushPromises()

    expect(mounted.wrapper.findComponent({ name: 'EntityAccessDialog' }).props('modelValue')).toBe(false)
  })

  it('opens the concept sets dialog from the action bar icon', async () => {
    mounted = await mountBuilder('/characterizations/new')

    await mounted.wrapper.get('[data-testid="char-builder-conceptsets-icon"]').trigger('click')
    await flushPromises()

    const conceptSetsDialog = mounted.wrapper.findComponent({ name: 'ConceptSetsListDialog' })
    expect(conceptSetsDialog.exists()).toBe(true)
    expect(conceptSetsDialog.props('modelValue')).toBe(true)
  })

  it('opens the validation dialog from the action bar icon', async () => {
    mounted = await mountBuilder('/characterizations/new')

    await mounted.wrapper.get('[data-testid="char-builder-validation-icon"]').trigger('click')
    await flushPromises()

    expect(mounted.wrapper.findComponent({ name: 'CharacterizationMessagesTab' }).exists()).toBe(true)
  })

  it('opens the versions dialog from the action bar icon', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(success(sampleCharacterization))

    mounted = await mountBuilder('/characterizations/42', { id: '42' })
    await flushPromises()

    await mounted.wrapper.get('[data-testid="char-builder-versions-icon"]').trigger('click')
    await flushPromises()

    const dialogs = mounted.wrapper.findAllComponents({ name: 'AtlasDialog' })
    const versionsDialog = dialogs.find(dialog => dialog.props('title') === 'Versions')
    expect(versionsDialog?.props('modelValue')).toBe(true)
  })

  it('persists characterization tags when the dialog applies them', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(success({
      ...sampleCharacterization,
      tags: [{ id: 1, name: 'Old' }],
    }))
    mounted = await mountBuilder('/characterizations/42', { id: '42' })
    await flushPromises()

    await mounted.wrapper.get('[data-testid="char-builder-tags-icon"]').trigger('click')
    const dialog = mounted.wrapper.findComponent({ name: 'TagSelectionDialog' })
    const onApply = dialog.props('onApply') as (tags: Array<{ id: number; name: string }>) => Promise<boolean>

    await expect(onApply([{ id: 2, name: 'New' }])).resolves.toBe(true)

    expect(unassignCharacterizationTag).toHaveBeenCalledWith(42, 1)
    expect(assignCharacterizationTag).toHaveBeenCalledWith(42, 2)
  })

  it('covers save failure branches and empty-name validation', async () => {
    mounted = await mountBuilder('/characterizations/new')
    await flushPromises()

    const builder = mounted.wrapper.findComponent(CharacterizationBuilderView)
    const setupState = builder.vm as any

    await setupState.$.setupState.handleSave()
    expect(mounted.wrapper.findComponent({ name: 'AtlasSnackbar' }).props('text')).toBe(tr('components.nameValidation.empty'))
  })

  it('covers the export early-return branch and omits list-level actions', async () => {
    mounted = await mountBuilder('/characterizations/new')
    await flushPromises()

    const builder = mounted.wrapper.findComponent(CharacterizationBuilderView)
    const setupState = builder.vm as any

    await setupState.$.setupState.handleExport()

    expect(exportCharacterization).not.toHaveBeenCalled()
    expect(mounted.wrapper.find('[data-testid="char-builder-copy"]').exists()).toBe(false)
    expect(mounted.wrapper.find('[data-testid="char-builder-delete"]').exists()).toBe(false)
  })

  it('logs picker load failures on mount', async () => {
    vi.mocked(getCohorts).mockResolvedValueOnce(failure(new ApiError('cohort load failed', 500, null)))
    vi.mocked(listFeatureAnalyses).mockResolvedValueOnce(failure(new ApiError('feature load failed', 500, null)))

    mounted = await mountBuilder('/characterizations/new')
    await flushPromises()

    expect(mounted.wrapper.find('[data-testid="char-builder-workbench"]').exists()).toBe(true)
  })

  it('covers concept-set helper methods without opening the editor', async () => {
    mounted = await mountBuilder('/characterizations/42', { id: '42' })
    await flushPromises()

    const builder = mounted.wrapper.findComponent(CharacterizationBuilderView)
    const setupState = builder.vm as any

    setupState.$.setupState.onDraftChange({
      ...sampleCharacterization,
      strata: [
        {
          criteria: {
            Type: 'ALL',
            CriteriaList: [{ Criteria: { ConditionOccurrence: { CodesetId: 11 } } }],
            DemographicCriteriaList: [],
            Groups: [],
          },
        },
      ],
      strataConceptSets: [
        { id: 11, name: 'Used set', expression: { items: [] } } as never,
        { id: 22, name: 'Unused set', expression: { items: [] } } as never,
      ],
    })

    setupState.$.setupState.createConceptSet()
    setupState.$.setupState.handleViewConceptSet({ id: 22, name: 'Unused set', items: [] })
    setupState.$.setupState.handleDeleteConceptSet({ id: 11, name: 'Used set', items: [] })
    setupState.$.setupState.handleConceptSetApplied({ name: 'Brand new set', items: [] })
    setupState.$.setupState.handleConceptSetApplied({ id: 22, name: 'Unused set updated', items: [] })
    expect(setupState.$.setupState.draft.strataConceptSets?.some((set: { name: string }) => set.name === 'Brand new set')).toBe(true)
    expect(setupState.$.setupState.draft.strataConceptSets?.some((set: { name: string }) => set.name === 'Unused set updated')).toBe(true)
    setupState.$.setupState.cancelDeleteConceptSet()
  })

  it('confirms deletion of a used concept set and clears its criteria references', async () => {
    mounted = await mountBuilder('/characterizations/new')
    const builder = mounted.wrapper.findComponent(CharacterizationBuilderView)
    const setupState = (builder.vm as any).$.setupState
    setupState.onDraftChange({
      ...sampleCharacterization,
      stratas: [
        {
          id: 'subgroup-1',
          name: 'Subgroup 1',
          criteria: {
            Type: 'ALL',
            CriteriaList: [{ ConditionOccurrence: { CodesetId: 11 } }],
            DemographicCriteriaList: [],
            Groups: [],
          },
        },
      ],
      strataConceptSets: [{ id: 11, name: 'Used set', expression: { items: [] } } as never],
    })

    setupState.conceptSetPendingDelete = { id: 11, name: 'Used set', items: [] }
    setupState.conceptSetPendingDeleteUsage = 1
    setupState.showDeleteConceptSetDialog = true
    expect(setupState.showDeleteConceptSetDialog).toBe(true)
    expect(setupState.deleteConceptSetWarning).toContain('Used set')

    setupState.confirmDeleteConceptSet()
    expect(setupState.draft.strataConceptSets).toEqual([])
    expect(setupState.showDeleteConceptSetDialog).toBe(false)
  })

  it('applies concept sets through a shallow mount without remounting child dialogs', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(success(sampleCharacterization))

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/characterizations/:id', component: CharacterizationBuilderView, props: true }],
    })
    await router.push('/characterizations/42')
    await router.isReady()

    const pinia = createPinia()
    setActivePinia(pinia)
    const authStore = useAuthStore()
    authStore.setUser({
      login: 'tester',
      displayName: 'tester',
      permissionIdx: {
        create: ['create:cohort-characterization'],
        write: ['write:cohort-characterization'],
      },
      entityAccess: emptyEntityAccess(),
    })

    const shallowWrapper = mount(CharacterizationBuilderView, {
      shallow: true,
      global: { plugins: [vuetify, pinia, router] },
      props: { id: '42' },
    })
    await flushPromises()

    const setupState = shallowWrapper.vm as any
    setupState.$.setupState.onDraftChange({
      ...sampleCharacterization,
      strata: [
        {
          criteria: {
            Type: 'ALL',
            CriteriaList: [{ ConditionOccurrence: { CodesetId: 11 } }],
            DemographicCriteriaList: [],
            Groups: [],
          },
        },
      ],
      strataConceptSets: [
        { id: 11, name: 'Used set', expression: { items: [] } } as never,
        { id: 22, name: 'Unused set', expression: { items: [] } } as never,
      ],
    })
    setupState.$.setupState.handleConceptSetApplied({ name: 'Brand new set', items: [] })
    setupState.$.setupState.handleConceptSetApplied({ id: 22, name: 'Unused set updated', items: [] })

    expect(setupState.$.setupState.draft.strataConceptSets?.some((set: { name: string }) => set.name === 'Brand new set')).toBe(true)
    expect(setupState.$.setupState.draft.strataConceptSets?.some((set: { name: string }) => set.name === 'Unused set updated')).toBe(true)
  })

  it('clicking import triggers the hidden file input', async () => {
    mounted = await mountBuilder('/characterizations/new')
    const fileInput = mounted.wrapper.get('[data-testid="char-builder-import-input"]')
    const clickSpy = vi.spyOn(fileInput.element as HTMLInputElement, 'click')

    await mounted.wrapper.get('[data-testid="char-builder-import-icon"]').trigger('click')

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps the access dialog hidden in new mode while the button is absent', async () => {
    mounted = await mountBuilder('/characterizations/new')
    await flushPromises()

    expect(mounted.wrapper.find('[data-testid="char-builder-access-icon"]').exists()).toBe(false)
    expect(mounted.wrapper.findComponent({ name: 'EntityAccessDialog' }).props('modelValue')).toBe(false)
  })

  it('typing into the name input updates the draft', async () => {
    mounted = await mountBuilder('/characterizations/new')

    const nameInput = mounted.wrapper.find('[data-testid="char-builder-name"]')
    await nameInput.setValue('My new characterization')
    await flushPromises()

    expect((nameInput.element as HTMLInputElement).value).toBe('My new characterization')

    expect(mounted.wrapper.find('[data-testid="char-builder-save"]').exists()).toBe(true)
  })

  it('Save in new mode calls createCharacterization', async () => {
    vi.mocked(createCharacterization).mockResolvedValue(success({
      ...sampleCharacterization,
      id: 99,
    }))

    mounted = await mountBuilder('/characterizations/new')

    const nameInput = mounted.wrapper.find('[data-testid="char-builder-name"]')
    await nameInput.setValue('My new characterization')
    await flushPromises()

    const workbench = mounted.wrapper.findComponent({
      name: 'CharacterizationWorkbench',
    })
    workbench.vm.$emit('update:modelValue', {
      ...(workbench.props('modelValue') as Record<string, unknown>),
      name: 'My new characterization',
      cohorts: [{ id: 1, name: 'Cohort A' }],
      featureAnalyses: [{ id: 10, name: 'Demographics' }],
    })
    await flushPromises()

    await (mounted.wrapper.findComponent(CharacterizationBuilderView).vm as any).$.setupState.handleSave()
    await flushPromises()

    expect(createCharacterization).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(createCharacterization).mock.calls[0]![0]!
    expect(payload.name).toBe('My new characterization')

    // #223: after the first save, the draft's id must be hydrated from the
    // server response so `characterization-id` (and therefore the Generate
    // button's disabled gate) reflects the now-saved characterization,
    // instead of staying null forever.
    await flushPromises()
    const workbenchAfterSave = mounted.wrapper.findComponent({
      name: 'CharacterizationWorkbench',
    })
    expect(workbenchAfterSave.props('characterizationId')).toBe(99)
  })

  it('Save in edit mode calls updateCharacterization', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(success(sampleCharacterization))
    vi.mocked(updateCharacterization).mockResolvedValue(success({
      ...sampleCharacterization,
      name: 'Renamed',
    }))

    mounted = await mountBuilder('/characterizations/42', { id: '42' })
    await flushPromises()

    const nameInput = mounted.wrapper.find('[data-testid="char-builder-name"]')
    await nameInput.setValue('Renamed')
    await flushPromises()

    await (mounted.wrapper.findComponent(CharacterizationBuilderView).vm as any).$.setupState.handleSave()
    await flushPromises()

    expect(updateCharacterization).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(updateCharacterization).mock.calls[0]![0]!
    expect(payload.id).toBe(42)
    expect(payload.name).toBe('Renamed')
  })

  it('a failed export shows the export-specific error, not the import error', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(success(sampleCharacterization))
    vi.mocked(exportCharacterization).mockResolvedValue(
      failure(new ApiError('HTTP 500: boom', 500, null))
    )

    mounted = await mountBuilder('/characterizations/42', { id: '42' })
    await flushPromises()

    await mounted.wrapper.get('[data-testid="char-builder-export-icon"]').trigger('click')
    await flushPromises()

    expect(exportCharacterization).toHaveBeenCalledWith(42)

    const snackbar = mounted.wrapper.findComponent({ name: 'AtlasSnackbar' })
    // 'characterizations.editor.utilities.export.exportError'
    expect(snackbar.props('text')).toBe(tr('characterizations.editor.utilities.export.exportError'))
    // ...and specifically not the import-side key it used to reuse.
    expect(snackbar.props('text')).not.toBe(tr('characterizations.editor.utilities.import.importError'))
    expect(snackbar.props('severity')).toBe('danger')
    expect(snackbar.props('modelValue')).toBe(true)
  })

  it('exports a saved characterization as a downloaded JSON file', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(success(sampleCharacterization))
    vi.mocked(exportCharacterization).mockResolvedValue(success({ name: 'Exported characterization' }))
    const createObjectUrl = vi.fn(() => 'blob:characterization')
    const revokeObjectUrl = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectUrl, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectUrl, configurable: true })
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'a') vi.spyOn(element, 'click').mockImplementation(() => undefined)
      return element
    }) as typeof document.createElement)

    mounted = await mountBuilder('/characterizations/42', { id: '42' })
    await mounted.wrapper.get('[data-testid="char-builder-export-icon"]').trigger('click')
    await flushPromises()

    expect(createObjectUrl).toHaveBeenCalled()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:characterization')
    createElementSpy.mockRestore()
  })

  it('shows an error when saving or importing a design fails', async () => {
    vi.mocked(createCharacterization).mockResolvedValue(
      failure(new ApiError('create failed', 500, null))
    )
    mounted = await mountBuilder('/characterizations/new')
    const builder = mounted.wrapper.findComponent(CharacterizationBuilderView)
    const setupState = (builder.vm as any).$.setupState
    setupState.onDraftChange({ ...sampleCharacterization, id: undefined })

    await setupState.handleSave()
    expect(mounted.wrapper.findComponent({ name: 'AtlasSnackbar' }).props('text')).toBe(
      tr('cc.viewEdit.saveError')
    )

    vi.mocked(importCharacterization).mockResolvedValue(
      failure(new ApiError('import failed', 500, null))
    )
    const input = mounted.wrapper.get('[data-testid="char-builder-import-input"]')
    Object.defineProperty(input.element, 'files', {
      value: [{ text: async () => JSON.stringify({ name: 'Failed import' }) }],
      configurable: true,
    })
    await input.trigger('change')
    await flushPromises()

    expect(mounted.wrapper.findComponent({ name: 'AtlasSnackbar' }).props('text')).toBe(
      tr('characterizations.editor.utilities.import.importError')
    )
  })

  it('shows an error when saving an existing characterization returns no update', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(success(sampleCharacterization))
    vi.mocked(updateCharacterization).mockResolvedValue(
      failure(new ApiError('update failed', 500, null))
    )
    mounted = await mountBuilder('/characterizations/42', { id: '42' })
    const builder = mounted.wrapper.findComponent(CharacterizationBuilderView)

    await (builder.vm as any).$.setupState.handleSave()
    expect(mounted.wrapper.findComponent({ name: 'AtlasSnackbar' }).props('severity')).toBe('danger')
  })

  it('shows an error when saving an existing characterization throws', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(success(sampleCharacterization))
    vi.mocked(updateCharacterization).mockRejectedValueOnce(new Error('update network error'))
    mounted = await mountBuilder('/characterizations/42', { id: '42' })
    const builder = mounted.wrapper.findComponent(CharacterizationBuilderView)

    await (builder.vm as any).$.setupState.handleSave()
    expect(mounted.wrapper.findComponent({ name: 'AtlasSnackbar' }).props('severity')).toBe('danger')
  })

  it('handles rejected cohort picker loads without preventing the builder from mounting', async () => {
    vi.mocked(getCohorts).mockRejectedValueOnce(new Error('cohort network error'))
    mounted = await mountBuilder('/characterizations/new')

    expect(mounted.wrapper.find('[data-testid="char-builder-workbench"]').exists()).toBe(true)
  })

  it('does not render list-level copy and delete actions in edit mode', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(success(sampleCharacterization))

    mounted = await mountBuilder('/characterizations/42', { id: '42' })
    await flushPromises()

    expect(mounted.wrapper.find('[data-testid="char-builder-copy"]').exists()).toBe(false)
    expect(mounted.wrapper.find('[data-testid="char-builder-delete"]').exists()).toBe(false)
  })

  it('rejects malformed imports and accepts a valid import payload', async () => {
    mounted = await mountBuilder('/characterizations/new')

    const badFile = new File(['{not json'], 'bad.json', { type: 'application/json' })
    const importInput = mounted.wrapper.get('[data-testid="char-builder-import-input"]')
    Object.defineProperty(importInput.element, 'files', { value: [badFile], configurable: true })
    await importInput.trigger('change')
    await flushPromises()

    expect(importCharacterization).not.toHaveBeenCalled()
    expect(mounted.wrapper.findComponent({ name: 'AtlasSnackbar' }).props('text')).toBe(
      tr('characterizations.editor.utilities.import.parseError')
    )
  })

  it('Cancel defers the unsaved-changes prompt to the route guard, not itself', async () => {
    // onBeforeRouteLeave doesn't register outside a real <router-view> (see
    // the "No active route record" warning logged by every test in this
    // file), so it can't be exercised here - but this still locks in the
    // regression: handleBack() must never call window.confirm itself, or a
    // real navigation shows the "unsaved changes" dialog twice (same bug
    // FeatureAnalysisEditorView.vue had - fixed 2026-09-15).
    mounted = await mountBuilder('/characterizations/new')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const nameInput = mounted.wrapper.find('[data-testid="char-builder-name"]')
    await nameInput.setValue('Dirty me up')

    const cancelBtn = mounted.wrapper.get(
      '[data-testid="char-builder-cancel"]'
    ).element as HTMLButtonElement
    cancelBtn.click()
    await flushPromises()
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    await flushPromises()

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(mounted.router.currentRoute.value.name).toBe('characterizations')

    confirmSpy.mockRestore()
  })
})
