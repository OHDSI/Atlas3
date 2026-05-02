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
}))

vi.mock('@/services/feature-analysis.service', () => ({
  listFeatureAnalyses: vi.fn(),
}))

vi.mock('@/services/webapi', () => ({
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
} from '@/services/characterization.service'
import { listFeatureAnalyses } from '@/services/feature-analysis.service'
import { getCohorts } from '@/services/webapi'
import CharacterizationBuilderView from '@/views/CharacterizationBuilderView.vue'

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

  const wrapper = mount(CharacterizationBuilderView, {
    global: { plugins: [vuetify, pinia, router] },
    props,
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
    vi.mocked(listCharacterizations).mockResolvedValue([])
    vi.mocked(listFeatureAnalyses).mockResolvedValue([])
    vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [] })
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  it('mounts in new mode with empty form, header tabs/icons, and a disabled Run button', async () => {
    mounted = await mountBuilder('/characterizations/new')

    expect(mounted.wrapper.find('[data-testid="char-builder-workbench"]').exists()).toBe(true)
    expect(mounted.wrapper.find('[data-testid="char-builder-conceptsets-icon"]').exists()).toBe(true)

    const runBtn = mounted.wrapper.find('[data-testid="char-builder-run"]')
    expect(runBtn.exists()).toBe(true)
    expect(runBtn.attributes('disabled')).toBeDefined()

    // Save Copy / Delete only show in edit mode.
    expect(mounted.wrapper.find('[data-testid="char-builder-copy"]').exists()).toBe(false)
    expect(mounted.wrapper.find('[data-testid="char-builder-delete"]').exists()).toBe(false)

    const nameInput = mounted.wrapper.find(
      '[data-testid="char-builder-name"]'
    ).element as HTMLInputElement
    expect(nameInput.value).toBe('')
  })

  it('hydrates the form from the store in edit mode', async () => {
    vi.mocked(getCharacterization).mockResolvedValue(sampleCharacterization)

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
    vi.mocked(createCharacterization).mockResolvedValue({
      ...sampleCharacterization,
      id: 99,
    })

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
    vi.mocked(getCharacterization).mockResolvedValue(sampleCharacterization)
    vi.mocked(updateCharacterization).mockResolvedValue({
      ...sampleCharacterization,
      name: 'Renamed',
    })

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
