/**
 * RunExecutionDialog component tests
 *
 * Smoke-level: the dialog loads CDM sources on open, the Run button is
 * disabled until a source is picked, and clicking Run delegates to the
 * store's runExecution action.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'

import RunExecutionDialog from '@/components/characterization/RunExecutionDialog.vue'
import type { CharacterizationExecution } from '@/models/characterization.types'

// Mock i18n
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

// Mock the webapi fetchCDMSources used to load the source list.
vi.mock('@/services/webapi', () => ({
  fetchCDMSources: vi.fn(),
}))

// Mock characterization service so the store doesn't try to hit the real API.
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

import { fetchCDMSources } from '@/services/webapi'
import { generateCharacterization } from '@/services/characterization.service'
import { useCharacterizationStore } from '@/stores/characterization'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const sampleSources = [
  {
    sourceId: 1,
    sourceKey: 'CDM_V5',
    sourceName: 'CDM V5',
    sourceDialect: 'postgresql',
    daimons: [],
  },
  {
    sourceId: 2,
    sourceKey: 'CDM_V6',
    sourceName: 'CDM V6',
    sourceDialect: 'postgresql',
    daimons: [],
  },
]

function mountDialog(props: { modelValue: boolean; characterizationId: number | null }) {
  return mount(RunExecutionDialog, {
    props,
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

describe('RunExecutionDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    document.body.innerHTML = ''
    vi.mocked(fetchCDMSources).mockResolvedValue({ success: true, data: sampleSources })
  })

  it('loads CDM sources when opened', async () => {
    const wrapper = mountDialog({ modelValue: true, characterizationId: 42 })
    await flushPromises()

    expect(fetchCDMSources).toHaveBeenCalledTimes(1)

    const select = document.querySelector('[data-testid="run-execution-dialog-source"]')
    expect(select).not.toBeNull()
    wrapper.unmount()
  })

  it('Run button delegates to store.runExecution and emits started', async () => {
    const created: CharacterizationExecution = {
      id: 999,
      status: 'PENDING',
      sourceKey: 'CDM_V5',
    }
    vi.mocked(generateCharacterization).mockResolvedValue(created)

    const wrapper = mountDialog({ modelValue: true, characterizationId: 42 })
    await flushPromises()

    // Drive the store directly and let the component invoke its handler.
    const store = useCharacterizationStore()
    const runSpy = vi.spyOn(store, 'runExecution')

    // Simulate selecting a source via the component's exposed setup state.
    const vm = wrapper.vm as unknown as { selectedSourceKey: string | null }
    vm.selectedSourceKey = 'CDM_V5'
    await flushPromises()

    const runBtn = document.querySelector(
      '[data-testid="run-execution-dialog-run"]'
    ) as HTMLElement | null
    expect(runBtn).not.toBeNull()
    ;(runBtn as HTMLElement).click()
    await flushPromises()

    expect(runSpy).toHaveBeenCalledWith(42, 'CDM_V5')
    const emitted = wrapper.emitted('started')
    expect(emitted).toBeTruthy()
    expect((emitted![0]![0] as CharacterizationExecution).id).toBe(999)
    wrapper.unmount()
  })

  it('Cancel button emits update:modelValue false', async () => {
    const wrapper = mountDialog({ modelValue: true, characterizationId: 42 })
    await flushPromises()

    const cancelBtn = document.querySelector(
      '[data-testid="run-execution-dialog-cancel"]'
    ) as HTMLElement | null
    expect(cancelBtn).not.toBeNull()
    ;(cancelBtn as HTMLElement).click()
    await flushPromises()

    const closeEvents = wrapper.emitted('update:modelValue')
    expect(closeEvents).toBeTruthy()
    expect(closeEvents!.some((e) => e[0] === false)).toBe(true)
    wrapper.unmount()
  })
})
