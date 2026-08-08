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
  listCharacterizations,
  listCharacterizationExecutions,
} from '@/services/characterization.service'
import { listFeatureAnalyses } from '@/services/feature-analysis.service'
import { getCohorts } from '@/services/cohort-definition.service'
import CharacterizationBuilderView from '@/views/CharacterizationBuilderView.vue'
import { success } from '@/types/api'

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
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  it('mounts in new mode with empty form and header tabs/icons', async () => {
    mounted = await mountBuilder('/characterizations/new')

    expect(mounted.wrapper.find('[data-testid="char-builder-workbench"]').exists()).toBe(true)
    expect(mounted.wrapper.find('[data-testid="char-builder-conceptsets-icon"]').exists()).toBe(true)

    expect(mounted.wrapper.find('[data-testid="char-builder-run"]').exists()).toBe(false)

    // Copy / Delete buttons now always render (disabled when not in edit
    // mode) so the toolbar shape stays stable across builders. Check that
    // they're present AND disabled in new mode.
    const copyBtn = mounted.wrapper.find('[data-testid="char-builder-copy"]')
    const deleteBtn = mounted.wrapper.find('[data-testid="char-builder-delete"]')
    expect(copyBtn.exists()).toBe(true)
    expect(deleteBtn.exists()).toBe(true)
    expect(copyBtn.attributes('disabled')).toBeDefined()
    expect(deleteBtn.attributes('disabled')).toBeDefined()

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

    expect(mounted.wrapper.find('[data-testid="char-builder-copy"]').exists()).toBe(true)
    expect(mounted.wrapper.find('[data-testid="char-builder-delete"]').exists()).toBe(true)
  })

  it('typing into the name input updates the draft', async () => {
    mounted = await mountBuilder('/characterizations/new')

    const nameInput = mounted.wrapper.find('[data-testid="char-builder-name"]')
    await nameInput.setValue('My new characterization')
    await flushPromises()

    expect((nameInput.element as HTMLInputElement).value).toBe('My new characterization')

    const saveBtn = mounted.wrapper.find('[data-testid="char-builder-save"]')
    expect(saveBtn.attributes('disabled')).toBeUndefined()
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

    const saveBtn = mounted.wrapper.get('[data-testid="char-builder-save"]')
      .element as HTMLButtonElement
    saveBtn.click()
    await flushPromises()

    expect(createCharacterization).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(createCharacterization).mock.calls[0]![0]!
    expect(payload.name).toBe('My new characterization')
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

    const saveBtn = mounted.wrapper.get('[data-testid="char-builder-save"]')
      .element as HTMLButtonElement
    saveBtn.click()
    await flushPromises()

    expect(updateCharacterization).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(updateCharacterization).mock.calls[0]![0]!
    expect(payload.id).toBe(42)
    expect(payload.name).toBe('Renamed')
  })
})
