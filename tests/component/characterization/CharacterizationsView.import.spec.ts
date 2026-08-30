/**
 * List-level import for characterizations (#267).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ query: {} }),
}))

vi.mock('@/services/characterization.service', () => ({
  importCharacterization: vi.fn(),
  listCharacterizations: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

const hasPermission = vi.fn().mockReturnValue(true)
vi.mock('@/composables/usePermissions', () => ({ usePermissions: () => ({ hasPermission }) }))

import CharacterizationsView from '@/views/CharacterizationsView.vue'
import { importCharacterization } from '@/services/characterization.service'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountView() {
  return mount(CharacterizationsView, { global: { plugins: [vuetify, createPinia()] } })
}

describe('CharacterizationsView import (#267)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    hasPermission.mockReturnValue(true)
  })

  it('offers an import button beside New characterization', () => {
    expect(mountView().find('[data-testid="characterizations-import"]').exists()).toBe(true)
  })

  it('disables import for a user who cannot create', () => {
    hasPermission.mockReturnValue(false)
    const btn = mountView().get('[data-testid="characterizations-import"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('opens the imported characterization', async () => {
    vi.mocked(importCharacterization).mockResolvedValue({ success: true, data: { id: 55 } } as never)
    const wrapper = mountView()

    await (wrapper.vm as unknown as {
      importDesign: (j: unknown, m: { fileName: string }) => Promise<{ id?: number }>
    }).importDesign({ any: 'design' }, { fileName: 'cc.json' })
    await flushPromises()

    expect(importCharacterization).toHaveBeenCalledWith({ any: 'design' })
  })

  it('rejects so the button can report a server refusal', async () => {
    vi.mocked(importCharacterization).mockResolvedValue({
      success: false,
      error: new Error('Not a characterization design'),
    } as never)
    const wrapper = mountView()

    await expect(
      (wrapper.vm as unknown as {
        importDesign: (j: unknown, m: { fileName: string }) => Promise<{ id?: number }>
      }).importDesign({}, { fileName: 'x.json' })
    ).rejects.toThrow('Not a characterization design')
  })
})
