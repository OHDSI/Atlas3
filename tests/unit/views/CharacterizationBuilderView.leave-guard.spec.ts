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
  getFeatureAnalysis: vi.fn(),
  createFeatureAnalysis: vi.fn(),
  updateFeatureAnalysis: vi.fn(),
  listFeatureAnalysisDomains: vi.fn(),
  listFeatureAnalysisAggregates: vi.fn(),
  featureAnalysisNameExists: vi.fn(),
}))

vi.mock('@/services/cohort-definition.service', () => ({
  getCohorts: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

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
    emits: ['update:modelValue', 'explore', 'snackbar', 'create-feature-analysis', 'edit-feature-analysis'],
    template: '<div data-testid="wb" />',
  },
}))

import {
  getCharacterization,
  listCharacterizations,
  listCharacterizationExecutions,
} from '@/services/characterization.service'
import {
  listFeatureAnalyses,
  listFeatureAnalysisDomains,
  listFeatureAnalysisAggregates,
} from '@/services/feature-analysis.service'
import { getCohorts } from '@/services/cohort-definition.service'
import CharacterizationBuilderView from '@/views/CharacterizationBuilderView.vue'
import FeatureAnalysisEditor from '@/components/feature-analyses/FeatureAnalysisEditor.vue'
import { InlineAtlasSideSheetStub } from '../../helpers/component-wrapper'
import { success } from '@/types/api'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function makeDesign(id: number): CharacterizationDefinition {
  return {
    id,
    name: `Characterization ${id}`,
    description: '',
    cohorts: [{ id: 11, name: 'Diabetes' }],
    featureAnalyses: [{ id: 21, name: 'Demographics' }],
    stratas: [],
  } as CharacterizationDefinition
}

async function mountBuilder(): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/characterizations', component: { template: '<div data-testid="char-list" />' } },
      { path: '/characterizations/:id', component: CharacterizationBuilderView, props: true },
    ],
  })
  await router.push('/characterizations/5')
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: {
      create: ['create:cohort-characterization', 'create:feature-analysis'],
      write: ['write:cohort-characterization', 'write:feature-analysis'],
    },
    entityAccess: emptyEntityAccess(),
  })

  const wrapper = mount(
    { template: '<v-app><router-view /></v-app>' },
    {
      global: {
        plugins: [vuetify, pinia, router],
        stubs: {
          ConceptSetsListDialog: true,
          ConceptSetEditor: true,
          EntityAccessDialog: true,
          AtlasSideSheet: InlineAtlasSideSheetStub,
          AtlasDialog: {
            name: 'AtlasDialog',
            props: ['modelValue', 'title', 'eyebrow'],
            emits: ['close'],
            template:
              '<div v-if="modelValue" data-testid="atlas-dialog"><slot /><slot name="actions" /></div>',
          },
        },
      },
    }
  )
  await flushPromises()
  return { wrapper, router }
}

function dialogs(wrapper: VueWrapper) {
  return wrapper.findAll('[data-testid="atlas-dialog"]')
}

async function dirtyBuilder(wrapper: VueWrapper) {
  wrapper.findComponent({ name: 'CharacterizationWorkbench' }).vm.$emit('update:modelValue', {
    ...makeDesign(5),
    name: 'Edited',
  })
  await flushPromises()
}

async function openPanel(wrapper: VueWrapper) {
  wrapper.findComponent({ name: 'CharacterizationWorkbench' }).vm.$emit('create-feature-analysis', { type: 'CUSTOM_FE' })
  await vi.waitFor(() => expect(wrapper.find('[data-testid="feature-analysis-editor-name"] input').exists()).toBe(true))
  await flushPromises()
}

async function dirtyEditor(wrapper: VueWrapper) {
  const input = wrapper.get('[data-testid="feature-analysis-editor-name"] input')
  await vi.waitFor(async () => {
    await input.setValue('Draft')
    expect((input.element as HTMLInputElement).value).toBe('Draft')
  })
  await flushPromises()
}

async function settleNavigation() {
  await flushPromises()
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  await flushPromises()
}

describe('CharacterizationBuilderView leave guard with the feature analysis panel', () => {
  let mounted: { wrapper: VueWrapper; router: Router } | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listCharacterizations).mockResolvedValue(success([]))
    vi.mocked(listCharacterizationExecutions).mockResolvedValue(success([]))
    vi.mocked(getCharacterization).mockImplementation(async (id: number) => success(makeDesign(id)))
    vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [] })
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success([]))
    vi.mocked(listFeatureAnalysisDomains).mockResolvedValue(success(['DEMOGRAPHICS']))
    vi.mocked(listFeatureAnalysisAggregates).mockResolvedValue(success([]))
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  it('prompts once when both the design and the panel editor are dirty', async () => {
    mounted = await mountBuilder()
    const { wrapper, router } = mounted
    await dirtyBuilder(wrapper)
    await openPanel(wrapper)
    await dirtyEditor(wrapper)

    await router.push('/characterizations')
    await settleNavigation()

    expect(dialogs(wrapper)).toHaveLength(1)
    expect(wrapper.find('[data-testid="feature-analysis-editor-discard-changes"]').exists()).toBe(true)
    expect(router.currentRoute.value.path).toBe('/characterizations/5')

    await wrapper.get('[data-testid="feature-analysis-editor-discard-changes"]').trigger('click')
    await settleNavigation()

    expect(router.currentRoute.value.path).toBe('/characterizations')
    expect(dialogs(wrapper)).toHaveLength(0)
  })

  it('prompts once when only the panel editor is dirty', async () => {
    mounted = await mountBuilder()
    const { wrapper, router } = mounted
    await openPanel(wrapper)
    await dirtyEditor(wrapper)

    await router.push('/characterizations')
    await settleNavigation()

    expect(dialogs(wrapper)).toHaveLength(1)
    await wrapper.get('[data-testid="feature-analysis-editor-discard-changes"]').trigger('click')
    await settleNavigation()

    expect(router.currentRoute.value.path).toBe('/characterizations')
  })

  it('prompts once when only the design is dirty and the panel is open', async () => {
    mounted = await mountBuilder()
    const { wrapper, router } = mounted
    await dirtyBuilder(wrapper)
    await openPanel(wrapper)

    await router.push('/characterizations')
    await settleNavigation()

    expect(dialogs(wrapper)).toHaveLength(1)
    expect(wrapper.find('[data-testid="char-builder-discard-changes"]').exists()).toBe(true)
    await wrapper.get('[data-testid="char-builder-discard-changes"]').trigger('click')
    await settleNavigation()

    expect(router.currentRoute.value.path).toBe('/characterizations')
    expect(dialogs(wrapper)).toHaveLength(0)
  })

  it('cancelling the single prompt keeps both edits and the route', async () => {
    mounted = await mountBuilder()
    const { wrapper, router } = mounted
    await dirtyBuilder(wrapper)
    await openPanel(wrapper)
    await dirtyEditor(wrapper)

    await router.push('/characterizations')
    await settleNavigation()
    await wrapper.get('[data-testid="atlas-dialog"] button').trigger('click')
    await settleNavigation()

    expect(dialogs(wrapper)).toHaveLength(0)
    expect(router.currentRoute.value.path).toBe('/characterizations/5')
    expect(wrapper.findComponent(FeatureAnalysisEditor).exists()).toBe(true)
  })
})
