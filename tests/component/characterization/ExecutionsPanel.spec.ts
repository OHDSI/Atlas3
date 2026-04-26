/**
 * ExecutionsPanel component tests
 *
 * Smoke-level: renders empty state and execution rows, and the Run button
 * is disabled when the store reports the draft as dirty.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { defineComponent, h } from 'vue'

import ExecutionsPanel from '@/components/characterization/ExecutionsPanel.vue'
import type { CharacterizationExecution } from '@/models/characterization.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/webapi', () => ({
  fetchCDMSources: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

vi.mock('@/services/characterization.service', () => ({
  listCharacterizations: vi.fn(),
  getCharacterization: vi.fn(),
  createCharacterization: vi.fn(),
  updateCharacterization: vi.fn(),
  deleteCharacterization: vi.fn(),
  copyCharacterization: vi.fn(),
  listCharacterizationExecutions: vi.fn(),
  getCharacterizationExecution: vi.fn(),
  generateCharacterization: vi.fn(),
  cancelCharacterizationGeneration: vi.fn(),
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
  listCharacterizationExecutions,
} from '@/services/characterization.service'
import { useCharacterizationStore } from '@/stores/characterization'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const Stub = defineComponent({ render: () => h('div') })

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/characterizations/:id/results/:executionId', component: Stub },
    ],
  })
}

async function mountPanel(characterizationId: number | null) {
  const router = makeRouter()
  await router.push('/')
  await router.isReady()
  const wrapper = mount(ExecutionsPanel, {
    props: { characterizationId },
    global: { plugins: [vuetify, router] },
    attachTo: document.body,
  })
  return { wrapper, router }
}

describe('ExecutionsPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders empty state when there are no executions', async () => {
    vi.mocked(listCharacterizationExecutions).mockResolvedValue([])
    const { wrapper } = await mountPanel(42)
    await flushPromises()

    expect(wrapper.find('[data-testid="executions-panel-empty"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders one row per execution', async () => {
    const execs: CharacterizationExecution[] = [
      { id: 1, status: 'COMPLETED', sourceKey: 'CDM_V5', startTime: 1 },
      { id: 2, status: 'RUNNING', sourceKey: 'CDM_V6', startTime: 2 },
    ]
    vi.mocked(listCharacterizationExecutions).mockResolvedValue(execs)

    const { wrapper } = await mountPanel(42)
    await flushPromises()

    expect(wrapper.find('[data-testid="execution-row-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="execution-row-2"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('disables Run when store.isDirty is true', async () => {
    vi.mocked(listCharacterizationExecutions).mockResolvedValue([])
    const { wrapper } = await mountPanel(42)
    await flushPromises()

    const store = useCharacterizationStore()
    store.markDirty()
    await flushPromises()

    const runBtn = wrapper.find('[data-testid="executions-panel-run"]')
    expect(runBtn.exists()).toBe(true)
    expect(runBtn.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('disables Run when characterizationId is null', async () => {
    vi.mocked(listCharacterizationExecutions).mockResolvedValue([])
    const { wrapper } = await mountPanel(null)
    await flushPromises()

    const runBtn = wrapper.find('[data-testid="executions-panel-run"]')
    expect(runBtn.exists()).toBe(true)
    expect(runBtn.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
