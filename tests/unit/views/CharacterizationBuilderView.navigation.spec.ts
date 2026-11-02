/**
 * CharacterizationBuilderView — route-id navigation regression tests
 *
 * OHDSI/Atlas3 #271 / #272: "Characterization remains on empty page after
 * Import". /characterizations/new and /characterizations/:id are two route
 * records pointing at the SAME component behind an unkeyed <router-view/>,
 * so Vue reuses the instance and onMounted never re-runs when import (or
 * save, or duplicate) navigates from `new` to a real id. Without a watcher on
 * props.id the draft stayed empty while the URL claimed an id.
 *
 * These tests drive the real <router-view/> so the instance really is reused,
 * which is the only way the bug reproduces.
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
  deleteCharacterization: vi.fn(),
  characterizationNameExists: vi.fn(),
  exportCharacterization: vi.fn(),
  importCharacterization: vi.fn(),
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

vi.mock('@/services/cohort-definition.service', () => ({
  getCohorts: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Stand-in for the workbench: renders the id it was handed and an explicit
// "empty state" marker when that id is null — exactly what the user saw in the
// bug report.
vi.mock('@/components/characterization/CharacterizationWorkbench.vue', () => ({
  default: {
    name: 'CharacterizationWorkbench',
    props: {
      modelValue: { type: Object, required: true },
      characterizationId: { type: Number, default: null },
      availableCohorts: { type: Array, default: () => [] },
      availableFeatureAnalyses: { type: Array, default: () => [] },
      createDisabledReason: { type: String, default: undefined },
    },
    emits: ['update:modelValue', 'explore', 'snackbar', 'create-feature-analysis'],
    template: `
      <div data-testid="wb">
        <span data-testid="wb-id">{{ characterizationId === null ? 'none' : String(characterizationId) }}</span>
        <span data-testid="wb-name">{{ modelValue.name }}</span>
        <span data-testid="wb-fa-ids">{{ (modelValue.featureAnalyses ?? []).map(fa => fa.id).join(',') }}</span>
        <span data-testid="wb-create-reason">{{ createDisabledReason ?? '' }}</span>
        <span
          v-if="characterizationId === null"
          data-testid="wb-empty"
        >empty</span>
      </div>
    `,
  },
}))

vi.mock('@/components/characterization/FeatureAnalysisEditorPanel.vue', async () => {
  const { useConceptSetEditorSuppressed } = await import('@/components/characterization/concept-set-editor-suppression')
  return {
    default: {
      name: 'FeatureAnalysisEditorPanel',
      props: { target: { type: Object, default: null } },
      emits: ['saved', 'closed'],
      setup() {
        return { suppressed: useConceptSetEditorSuppressed() }
      },
      template: '<span data-testid="panel-suppressed">{{ String(suppressed) }}</span>',
    },
  }
})

import {
  getCharacterization,
  createCharacterization,
  importCharacterization,
  listCharacterizations,
  listCharacterizationExecutions,
} from '@/services/characterization.service'
import { listFeatureAnalyses } from '@/services/feature-analysis.service'
import { getCohorts } from '@/services/cohort-definition.service'
import CharacterizationBuilderView from '@/views/CharacterizationBuilderView.vue'
import { success } from '@/types/api'
import { useCharacterizationStore } from '@/stores/characterization'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'
import { tr } from '../../helpers/i18n-mock'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function makeDesign(
  id: number | undefined,
  name: string
): CharacterizationDefinition {
  return {
    ...(id === undefined ? {} : { id }),
    name,
    description: `${name} description`,
    cohorts: [{ id: 11, name: 'Diabetes' }],
    featureAnalyses: [{ id: 21, name: 'Demographics' }],
    stratas: [],
  } as CharacterizationDefinition
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/characterizations',
        name: 'characterizations',
        component: { template: '<div data-testid="char-list" />' },
      },
      {
        path: '/feature-analyses/new',
        name: 'feature-analysis-new',
        component: { template: '<div data-testid="fa-editor" />' },
      },
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

/**
 * Mounts the builder behind a real <router-view/> so navigating new -> :id
 * reuses the component instance the way the app does.
 */
const DEFAULT_PERMISSIONS = {
  create: ['create:cohort-characterization', 'create:feature-analysis'],
  write: ['write:cohort-characterization'],
}

async function mountAt(
  path: string,
  permissions: { create: string[]; write: string[] } = DEFAULT_PERMISSIONS
) {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: permissions,
    entityAccess: emptyEntityAccess(),
  })

  const Root = { template: '<v-app><router-view /></v-app>' }
  const wrapper = mount(Root, { global: { plugins: [vuetify, pinia, router] } })

  await router.isReady()
  await flushPromises()
  return { wrapper, router }
}

/**
 * Waits for a navigation the component started itself (import / save /
 * duplicate) to land, then for the resulting load to settle. Those pushes are
 * awaited several promise hops deep inside a DOM handler, so a fixed number of
 * flushPromises() calls is not reliable.
 */
async function waitForPath(router: Router, path: string): Promise<void> {
  await vi.waitFor(() => {
    if (router.currentRoute.value.path !== path) {
      throw new Error(`still at ${router.currentRoute.value.path}, want ${path}`)
    }
  })
  await flushPromises()
}

function nameInputValue(wrapper: VueWrapper): string {
  return (
    wrapper.find('[data-testid="char-builder-name"]').element as HTMLInputElement
  ).value
}

function workbenchId(wrapper: VueWrapper): string {
  return wrapper.find('[data-testid="wb-id"]').text()
}

/** Feeds a JSON design through the hidden import file input. */
async function importDesign(wrapper: VueWrapper, design: unknown) {
  const input = wrapper.find('[data-testid="char-builder-import-input"]')
  const file = {
    name: 'design.json',
    text: () => Promise.resolve(JSON.stringify(design)),
  }
  Object.defineProperty(input.element, 'files', {
    value: [file],
    configurable: true,
  })
  await input.trigger('change')
  await flushPromises()
  await flushPromises()
}

describe('CharacterizationBuilderView — props.id navigation', () => {
  let mounted: { wrapper: VueWrapper; router: Router } | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    vi.mocked(listCharacterizations).mockResolvedValue(success([]))
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success([]))
    vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [] })
    vi.mocked(listCharacterizationExecutions).mockResolvedValue(success([]))
    vi.mocked(getCharacterization).mockImplementation(async (id: number) =>
      success(makeDesign(id, `Characterization ${id}`))
    )
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  it('loads the imported characterization after import navigates new -> :id', async () => {
    const imported = makeDesign(77, 'Imported Design')
    vi.mocked(importCharacterization).mockResolvedValue(success(imported))
    vi.mocked(getCharacterization).mockResolvedValue(success(imported))

    mounted = await mountAt('/characterizations/new')

    // Baseline: the "new" page really is the empty state.
    expect(nameInputValue(mounted.wrapper)).toBe('')
    expect(mounted.wrapper.find('[data-testid="wb-empty"]').exists()).toBe(true)

    await importDesign(mounted.wrapper, { name: 'Imported Design' })
    await waitForPath(mounted.router, '/characterizations/77')

    expect(importCharacterization).toHaveBeenCalledTimes(1)

    // The bug: everything below stayed at the empty-state values.
    expect(getCharacterization).toHaveBeenCalledWith(77)
    expect(nameInputValue(mounted.wrapper)).toBe('Imported Design')
    expect(workbenchId(mounted.wrapper)).toBe('77')
    expect(mounted.wrapper.find('[data-testid="wb-empty"]').exists()).toBe(false)
  })

  it('does not double-fetch on first mount in edit mode', async () => {
    mounted = await mountAt('/characterizations/42')
    await flushPromises()

    expect(getCharacterization).toHaveBeenCalledTimes(1)
    expect(getCharacterization).toHaveBeenCalledWith(42)
    expect(nameInputValue(mounted.wrapper)).toBe('Characterization 42')
  })

  it('loads the new entity — and drops the old draft — on :id -> different :id', async () => {
    mounted = await mountAt('/characterizations/42')
    expect(nameInputValue(mounted.wrapper)).toBe('Characterization 42')

    await mounted.router.push('/characterizations/43')
    await flushPromises()

    expect(getCharacterization).toHaveBeenCalledWith(43)
    expect(nameInputValue(mounted.wrapper)).toBe('Characterization 43')
    expect(workbenchId(mounted.wrapper)).toBe('43')
  })

  it('discards a slow fetch that lands after the user navigated on', async () => {
    // 42 resolves only when we release it, and it is released *after* the
    // route has already moved to 43. Without the race token, the late
    // response would hydrate 42's design under 43's URL.
    let release: (() => void) | null = null
    const slow = new Promise<void>(resolve => {
      release = resolve
    })
    vi.mocked(getCharacterization).mockImplementation(async (id: number) => {
      if (id === 42) {
        await slow
        return success(makeDesign(42, 'Characterization 42'))
      }
      return success(makeDesign(id, `Characterization ${id}`))
    })

    mounted = await mountAt('/characterizations/42')

    await mounted.router.push('/characterizations/43')
    await flushPromises()
    expect(nameInputValue(mounted.wrapper)).toBe('Characterization 43')

    release!()
    await flushPromises()
    await flushPromises()

    // Still 43 — the stale result for 42 was dropped, not rendered.
    expect(nameInputValue(mounted.wrapper)).toBe('Characterization 43')
    expect(workbenchId(mounted.wrapper)).toBe('43')
  })

  it('redirects to the list when the route id is not a number', async () => {
    mounted = await mountAt('/characterizations/not-an-id')
    await flushPromises()

    expect(getCharacterization).not.toHaveBeenCalled()
    await vi.waitFor(() => {
      expect(mounted!.router.currentRoute.value.path).toBe('/characterizations')
    })
  })

  it('resets to an empty draft on :id -> new', async () => {
    mounted = await mountAt('/characterizations/42')
    expect(nameInputValue(mounted.wrapper)).toBe('Characterization 42')

    await mounted.router.push('/characterizations/new')
    await flushPromises()

    expect(nameInputValue(mounted.wrapper)).toBe('')
    expect(workbenchId(mounted.wrapper)).toBe('none')
    expect(mounted.wrapper.find('[data-testid="wb-empty"]').exists()).toBe(true)
  })

  it('leaves the freshly loaded design clean, not dirty', async () => {
    const { useCharacterizationStore } = await import('@/stores/characterization')

    mounted = await mountAt('/characterizations/new')
    const store = useCharacterizationStore()

    await mounted.router.push('/characterizations/42')
    await flushPromises()

    expect(nameInputValue(mounted.wrapper)).toBe('Characterization 42')
    expect(store.isDirty).toBe(false)
  })

  it('loads the created characterization after Save in new mode navigates to :id', async () => {
    const created = makeDesign(99, 'Brand New')
    vi.mocked(createCharacterization).mockResolvedValue(success(created))
    vi.mocked(getCharacterization).mockResolvedValue(success(created))

    mounted = await mountAt('/characterizations/new')

    const workbench = mounted.wrapper.findComponent({
      name: 'CharacterizationWorkbench',
    })
    workbench.vm.$emit('update:modelValue', makeDesign(undefined, 'Brand New'))
    await flushPromises()

    const saveBtn = mounted.wrapper.get('[data-testid="char-builder-save"]')
      .element as HTMLButtonElement
    expect(saveBtn.disabled).toBe(false)
    saveBtn.click()
    await waitForPath(mounted.router, '/characterizations/99')

    expect(createCharacterization).toHaveBeenCalledTimes(1)
    expect(getCharacterization).toHaveBeenCalledWith(99)
    expect(workbenchId(mounted.wrapper)).toBe('99')
    expect(nameInputValue(mounted.wrapper)).toBe('Brand New')
  })

  it('hides its own concept set editor while the feature analysis panel is open', async () => {
    mounted = await mountAt('/characterizations/new')
    const builder = mounted.wrapper.findComponent(CharacterizationBuilderView)
    const state = (builder.vm as any).$.setupState

    state.featureAnalysisPanelTarget = { createKind: { type: 'CUSTOM_FE' } }
    state.conceptSetsStore.editorOpen = true
    await flushPromises()
    expect(builder.findComponent({ name: 'ConceptSetEditor' }).exists()).toBe(false)

    state.featureAnalysisPanelTarget = null
    await flushPromises()
    expect(builder.findComponent({ name: 'ConceptSetEditor' }).exists()).toBe(true)
  })

  it('covers the unsaved-changes confirmation helpers', async () => {
    mounted = await mountAt('/characterizations/new')

    const builder = mounted.wrapper.findComponent(CharacterizationBuilderView)
    const setupState = builder.vm as any

    setupState.$.setupState.confirmLeaveUnsaved()
    setupState.$.setupState.cancelLeaveUnsaved()

    expect(mounted.router.currentRoute.value.path).toBe('/characterizations/new')
  })
})

function makeFeatureAnalysis(id: number, name: string): FeatureAnalysisListItem {
  return { id, name, type: 'CUSTOM_FE', statType: 'PREVALENCE' } as FeatureAnalysisListItem
}

function workbench(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: 'CharacterizationWorkbench' })
}

function panel(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: 'FeatureAnalysisEditorPanel' })
}

function builderState(wrapper: VueWrapper) {
  return (wrapper.findComponent(CharacterizationBuilderView).vm as any).$.setupState
}

describe('CharacterizationBuilderView: creating a feature analysis from the design', () => {
  let mounted: { wrapper: VueWrapper; router: Router } | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    vi.mocked(listCharacterizations).mockResolvedValue(success([]))
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success([]))
    vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [] })
    vi.mocked(listCharacterizationExecutions).mockResolvedValue(success([]))
    vi.mocked(getCharacterization).mockImplementation(async (id: number) =>
      success(makeDesign(id, `Characterization ${id}`))
    )
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  async function mountUnsavedDraft() {
    mounted = await mountAt('/characterizations/new')
    const state = builderState(mounted.wrapper)
    state.draft = {
      name: '',
      description: '',
      cohorts: [{ id: 7, name: 'Cohort 7' }],
      featureAnalyses: [{ id: 3, name: 'Existing' }],
      stratas: [],
    }
    useCharacterizationStore().markClean()
    await flushPromises()
    return mounted
  }

  it('opens the panel on create without saving or navigating', async () => {
    await mountUnsavedDraft()
    const store = useCharacterizationStore()
    const create = vi.spyOn(store, 'create')
    const push = vi.spyOn(mounted!.router, 'push')

    workbench(mounted!.wrapper).vm.$emit('create-feature-analysis', { type: 'CUSTOM_FE' })
    await flushPromises()

    expect(panel(mounted!.wrapper).props('target')).toEqual({ createKind: { type: 'CUSTOM_FE' } })
    expect(create).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('links the new analysis and keeps the unsaved draft', async () => {
    await mountUnsavedDraft()
    const store = useCharacterizationStore()
    workbench(mounted!.wrapper).vm.$emit('create-feature-analysis', { type: 'CUSTOM_FE' })
    await flushPromises()
    vi.mocked(listFeatureAnalyses).mockResolvedValue(
      success([makeFeatureAnalysis(3, 'Existing'), makeFeatureAnalysis(501, 'Prior insulin use')])
    )

    panel(mounted!.wrapper).vm.$emit('saved', { id: 501, name: 'Prior insulin use', type: 'CUSTOM_FE' }, true)
    await flushPromises()

    const { draft } = builderState(mounted!.wrapper)
    expect(draft.featureAnalyses.map((fa: { id: number }) => fa.id)).toEqual([3, 501])
    expect(draft.cohorts).toEqual([{ id: 7, name: 'Cohort 7' }])
    expect(draft.name).toBe('')
    expect(store.isDirty).toBe(true)
    expect(document.body.textContent).toContain(tr('cc.viewEdit.design.fa.added', { name: 'Prior insulin use' }))
    expect(panel(mounted!.wrapper).props('target')).toBeNull()
  })

  it('shows addFailed when the new analysis is missing from the refreshed list', async () => {
    await mountUnsavedDraft()
    workbench(mounted!.wrapper).vm.$emit('create-feature-analysis', { type: 'CUSTOM_FE' })
    await flushPromises()
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success([makeFeatureAnalysis(3, 'Existing')]))

    panel(mounted!.wrapper).vm.$emit('saved', { id: 501, name: 'Prior insulin use', type: 'CUSTOM_FE' }, true)
    await flushPromises()

    const { draft } = builderState(mounted!.wrapper)
    expect(draft.featureAnalyses.map((fa: { id: number }) => fa.id)).toEqual([3])
    expect(useCharacterizationStore().isDirty).toBe(false)
    expect(document.body.textContent).toContain(tr('cc.viewEdit.design.fa.addFailed'))
    expect(panel(mounted!.wrapper).props('target')).toBeNull()
  })

  it('leaves the draft alone when the created analysis is already linked', async () => {
    await mountUnsavedDraft()
    workbench(mounted!.wrapper).vm.$emit('create-feature-analysis', { type: 'CUSTOM_FE' })
    await flushPromises()
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success([makeFeatureAnalysis(3, 'Existing')]))

    panel(mounted!.wrapper).vm.$emit('saved', { id: 3, name: 'Existing', type: 'CUSTOM_FE' }, true)
    await flushPromises()

    const { draft } = builderState(mounted!.wrapper)
    expect(draft.featureAnalyses.map((fa: { id: number }) => fa.id)).toEqual([3])
    expect(useCharacterizationStore().isDirty).toBe(false)
    expect(panel(mounted!.wrapper).props('target')).toBeNull()
  })

  it('reports an updated analysis without changing the draft', async () => {
    await mountUnsavedDraft()
    panel(mounted!.wrapper).vm.$emit('saved', { id: 3, name: 'Existing', type: 'CUSTOM_FE' }, false)
    await flushPromises()

    expect(document.body.textContent).toContain(tr('cc.viewEdit.design.fa.updated', { name: 'Existing' }))
    expect(useCharacterizationStore().isDirty).toBe(false)
  })

  it('closes the panel when it emits closed', async () => {
    await mountUnsavedDraft()
    workbench(mounted!.wrapper).vm.$emit('create-feature-analysis', { type: 'CUSTOM_FE' })
    await flushPromises()

    panel(mounted!.wrapper).vm.$emit('closed')
    await flushPromises()

    expect(panel(mounted!.wrapper).props('target')).toBeNull()
  })

  it('enables create on an empty unnamed design', async () => {
    mounted = await mountAt('/characterizations/new')

    expect(mounted.wrapper.get('[data-testid="wb-create-reason"]').text()).toBe('')
  })

  it('disables create without the create permission', async () => {
    mounted = await mountAt('/characterizations/new', {
      create: ['create:cohort-characterization'],
      write: ['write:cohort-characterization'],
    })

    expect(mounted.wrapper.get('[data-testid="wb-create-reason"]').text()).toBe(
      tr('cc.viewEdit.design.fa.noCreatePermission')
    )
  })

  it('suppresses the concept set editors while the panel is open', async () => {
    mounted = await mountAt('/characterizations/new')
    const state = builderState(mounted.wrapper)
    const injected = () => mounted!.wrapper.get('[data-testid="panel-suppressed"]').text()

    expect(injected()).toBe('false')

    state.featureAnalysisPanelTarget = { createKind: { type: 'CUSTOM_FE' } }
    await flushPromises()
    expect(injected()).toBe('true')

    state.featureAnalysisPanelTarget = null
    await flushPromises()
    expect(injected()).toBe('false')
  })
})
