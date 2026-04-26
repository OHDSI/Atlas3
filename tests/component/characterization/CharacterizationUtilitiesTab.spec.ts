/**
 * CharacterizationUtilitiesTab tests
 *
 * Verifies the export button calls the service with the right id and the
 * import flow parses the file, posts to the service, and emits `imported`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import type { CharacterizationDefinition } from '@/models/characterization.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/characterization.service', () => ({
  exportCharacterization: vi.fn(),
  importCharacterization: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import CharacterizationUtilitiesTab from '@/components/characterization/CharacterizationUtilitiesTab.vue'
import {
  exportCharacterization,
  importCharacterization,
} from '@/services/characterization.service'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function makeDef(id?: number): CharacterizationDefinition {
  return {
    id,
    name: 'Diabetes Cohort Profile',
    cohorts: [{ id: 1, name: 'Cohort' }],
    featureAnalyses: [{ id: 2 }],
    stratas: [],
  }
}

function mountTab(def: CharacterizationDefinition | null) {
  return mount(CharacterizationUtilitiesTab, {
    props: { characterization: def },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

describe('CharacterizationUtilitiesTab', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL
  let originalRevokeObjectURL: typeof URL.revokeObjectURL

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    originalCreateObjectURL = URL.createObjectURL
    originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn().mockReturnValue('blob:fake')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('disables export when the characterization has no id', () => {
    const wrapper = mountTab(makeDef(undefined))
    const btn = wrapper.find('[data-testid="char-utilities-export"]')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('calls exportCharacterization and triggers a download', async () => {
    vi.mocked(exportCharacterization).mockResolvedValue({ name: 'X' })
    const wrapper = mountTab(makeDef(42))

    const btn = wrapper.get('[data-testid="char-utilities-export"]')
    ;(btn.element as HTMLButtonElement).click()
    await flushPromises()

    expect(exportCharacterization).toHaveBeenCalledTimes(1)
    expect(exportCharacterization).toHaveBeenCalledWith(42)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('imports a JSON file: parses, posts, and emits `imported`', async () => {
    const created: CharacterizationDefinition = makeDef(99)
    vi.mocked(importCharacterization).mockResolvedValue(created)

    const wrapper = mountTab(makeDef(undefined))

    const designJson = {
      name: 'Imported',
      cohorts: [],
      featureAnalyses: [],
      stratas: [],
    }
    const fileText = JSON.stringify(designJson)
    const file = new File([fileText], 'design.json', { type: 'application/json' })
    // jsdom's File.text() is flaky — stub it explicitly.
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(fileText),
    })

    const fileInput = wrapper.findComponent({ name: 'VFileInput' })
    fileInput.vm.$emit('update:modelValue', file)
    await flushPromises()
    await flushPromises()

    expect(importCharacterization).toHaveBeenCalledTimes(1)
    expect(importCharacterization).toHaveBeenCalledWith(designJson)
    expect(wrapper.emitted('imported')).toBeTruthy()
    expect(wrapper.emitted('imported')![0]![0]).toEqual(created)
    wrapper.unmount()
  })

  it('shows a parse error when the JSON is malformed', async () => {
    const wrapper = mountTab(makeDef(undefined))
    const fileText = '{not valid json'
    const file = new File([fileText], 'design.json', {
      type: 'application/json',
    })
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(fileText),
    })

    const fileInput = wrapper.findComponent({ name: 'VFileInput' })
    fileInput.vm.$emit('update:modelValue', file)
    await flushPromises()
    await flushPromises()

    expect(importCharacterization).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="char-utilities-import-error"]').exists()).toBe(
      true
    )
    expect(wrapper.emitted('imported')).toBeFalsy()
    wrapper.unmount()
  })

  it('renders the diagnostics coming-soon alert', () => {
    const wrapper = mountTab(makeDef(42))
    const alert = wrapper.find('[data-testid="char-utilities-diagnostics"]')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('coming soon')
    wrapper.unmount()
  })
})
