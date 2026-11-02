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

import {
  getCharacterization,
  createCharacterization,
  updateCharacterization,
  importCharacterization,
  listCharacterizations,
  listCharacterizationExecutions,
} from '@/services/characterization.service'
import { listFeatureAnalyses } from '@/services/feature-analysis.service'
import { getCohorts } from '@/services/cohort-definition.service'
import CharacterizationBuilderView from '@/views/CharacterizationBuilderView.vue'
import { success } from '@/types/api'
import { logger } from '@/utils/logger'
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
async function mountAt(path: string) {
  const router = makeRouter()
  await router.push(path)
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

function saveFirstDialog(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[data-testid="cc-fa-save-first-dialog"]')
}

function saveFirstDialogOpen(wrapper: VueWrapper): boolean {
  const dialog = wrapper
    .findAllComponents({ name: 'AtlasDialog' })
    .find(candidate => candidate.props('title') === tr('cc.viewEdit.design.fa.saveFirstTitle'))
  expect(dialog).toBeDefined()
  return dialog!.props('modelValue') === true
}

async function waitForQuery(router: Router, expected: Record<string, string>): Promise<void> {
  await vi.waitFor(() => {
    expect(router.currentRoute.value.query).toEqual(expected)
  })
}

async function confirmSaveFirst(): Promise<void> {
  await vi.waitFor(() => {
    if (!saveFirstDialog()) throw new Error('save-first dialog not open')
  })
  const confirm = document.body.querySelector<HTMLElement>('[data-testid="cc-fa-save-first-confirm"]')
  expect(confirm).not.toBeNull()
  confirm!.click()
  await flushPromises()
}

const editorRoute = (returnTo: string) => ({
  path: '/feature-analyses/new',
  query: { type: 'CUSTOM_FE', returnTo },
})

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
    vi.mocked(updateCharacterization).mockImplementation(async def => success(def))
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  it('opens the editor directly when the saved characterization has no unsaved changes', async () => {
    mounted = await mountAt('/characterizations/5')
    const push = vi.spyOn(mounted.router, 'push')

    workbench(mounted.wrapper).vm.$emit('create-feature-analysis', { type: 'CUSTOM_FE' })
    await flushPromises()

    expect(push).toHaveBeenCalledWith(editorRoute('5'))
    expect(saveFirstDialog()).toBeNull()
    await waitForPath(mounted.router, '/feature-analyses/new')
  })

  it('asks to save first when there are unsaved changes, and opens the editor after a successful save', async () => {
    mounted = await mountAt('/characterizations/5')
    const store = useCharacterizationStore()
    const update = vi.spyOn(store, 'update')
    const push = vi.spyOn(mounted.router, 'push')

    workbench(mounted.wrapper).vm.$emit('update:modelValue', makeDesign(5, 'Renamed'))
    await flushPromises()
    expect(store.isDirty).toBe(true)

    workbench(mounted.wrapper).vm.$emit('create-feature-analysis', { type: 'CUSTOM_FE' })
    await flushPromises()
    expect(push).not.toHaveBeenCalled()
    expect(saveFirstDialogOpen(mounted.wrapper)).toBe(true)

    await confirmSaveFirst()
    await waitForPath(mounted.router, '/feature-analyses/new')

    expect(update).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith(editorRoute('5'))
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(push.mock.invocationCallOrder[0])
    expect(mounted.router.currentRoute.value.query).toEqual({ type: 'CUSTOM_FE', returnTo: '5' })
  })

  it('asks to save first for a new characterization and uses the created id', async () => {
    vi.mocked(createCharacterization).mockResolvedValue(success(makeDesign(12, 'Brand New')))
    mounted = await mountAt('/characterizations/new')
    const push = vi.spyOn(mounted.router, 'push')

    workbench(mounted.wrapper).vm.$emit('update:modelValue', makeDesign(undefined, 'Brand New'))
    await flushPromises()
    workbench(mounted.wrapper).vm.$emit('create-feature-analysis', { type: 'CUSTOM_FE' })
    await flushPromises()

    await confirmSaveFirst()
    await waitForPath(mounted.router, '/feature-analyses/new')

    expect(createCharacterization).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenLastCalledWith(editorRoute('12'))
    expect(mounted.router.currentRoute.value.query.returnTo).toBe('12')
  })

  it('stays on the design when the save fails', async () => {
    mounted = await mountAt('/characterizations/5')
    const store = useCharacterizationStore()
    const update = vi.spyOn(store, 'update').mockResolvedValue(null)
    const push = vi.spyOn(mounted.router, 'push')

    workbench(mounted.wrapper).vm.$emit('update:modelValue', makeDesign(5, 'Renamed'))
    await flushPromises()
    workbench(mounted.wrapper).vm.$emit('create-feature-analysis', { type: 'CUSTOM_FE' })
    await flushPromises()

    await confirmSaveFirst()
    await flushPromises()

    expect(update).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
    expect(mounted.router.currentRoute.value.path).toBe('/characterizations/5')
    expect(saveFirstDialogOpen(mounted.wrapper)).toBe(false)
  })

  it('passes createDisabledReason when the characterization has no name', async () => {
    mounted = await mountAt('/characterizations/new')

    expect(mounted.wrapper.get('[data-testid="wb-create-reason"]').text()).toBe(
      tr('cc.viewEdit.design.fa.nameFirst')
    )

    workbench(mounted.wrapper).vm.$emit('update:modelValue', makeDesign(undefined, 'Named'))
    await flushPromises()

    expect(mounted.wrapper.get('[data-testid="wb-create-reason"]').text()).toBe('')
  })

  it('links the analysis named by addFeatureAnalysis and marks the draft dirty', async () => {
    vi.mocked(listFeatureAnalyses).mockResolvedValue(
      success([makeFeatureAnalysis(21, 'Demographics'), makeFeatureAnalysis(99, 'Fresh analysis')])
    )

    mounted = await mountAt('/characterizations/5?sourceId=2&addFeatureAnalysis=99')
    await flushPromises()

    expect(mounted.wrapper.get('[data-testid="wb-fa-ids"]').text()).toBe('21,99')
    expect(useCharacterizationStore().isDirty).toBe(true)
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain(
        tr('cc.viewEdit.design.fa.added', { name: 'Fresh analysis' })
      )
    })
    expect(mounted.router.currentRoute.value.path).toBe('/characterizations/5')
    await waitForQuery(mounted.router, { sourceId: '2' })
  })

  it('does not duplicate an already linked analysis, and still strips the query', async () => {
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success([makeFeatureAnalysis(21, 'Demographics')]))

    mounted = await mountAt('/characterizations/5?addFeatureAnalysis=21')
    await flushPromises()

    expect(mounted.wrapper.get('[data-testid="wb-fa-ids"]').text()).toBe('21')
    expect(useCharacterizationStore().isDirty).toBe(false)
    await waitForQuery(mounted.router, {})
  })

  it.each(['404', 'abc'])('ignores an unknown or invalid addFeatureAnalysis id (%s) and strips the query', async raw => {
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success([makeFeatureAnalysis(99, 'Fresh analysis')]))

    mounted = await mountAt(`/characterizations/5?addFeatureAnalysis=${raw}`)
    await flushPromises()

    expect(mounted.wrapper.get('[data-testid="wb-fa-ids"]').text()).toBe('21')
    expect(useCharacterizationStore().isDirty).toBe(false)
    expect(logger.warn).toHaveBeenCalled()
    await waitForQuery(mounted.router, {})
  })

  it('links the analysis after the reused instance loads a different id', async () => {
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success([makeFeatureAnalysis(99, 'Fresh analysis')]))

    mounted = await mountAt('/characterizations/new')
    await mounted.router.push('/characterizations/7?addFeatureAnalysis=99')
    await flushPromises()
    await flushPromises()

    expect(mounted.wrapper.get('[data-testid="wb-id"]').text()).toBe('7')
    expect(mounted.wrapper.get('[data-testid="wb-fa-ids"]').text()).toBe('21,99')
    await waitForQuery(mounted.router, {})
  })
})
