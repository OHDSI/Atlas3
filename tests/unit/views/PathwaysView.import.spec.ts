/**
 * List-level import for pathways (#267).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

vi.mock('@/services/pathway.service', () => ({ importPathway: vi.fn(), deletePathway: vi.fn(), copyPathway: vi.fn() }))

const hasPermission = vi.fn().mockReturnValue(true)
vi.mock('@/composables/usePermissions', () => ({ usePermissions: () => ({ hasPermission }) }))

import PathwaysView from '@/views/PathwaysView.vue'
import { importPathway } from '@/services/pathway.service'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

type ImportDesign = (j: unknown, m: { fileName: string }) => Promise<{ id?: number }>

function mountView() {
  return mount(PathwaysView, { global: { plugins: [vuetify, createPinia()] } })
}

describe('PathwaysView import (#267)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    hasPermission.mockReturnValue(true)
  })

  it('offers an import button beside the New button', () => {
    expect(mountView().find('[data-testid="pathways-import"]').exists()).toBe(true)
  })

  it('disables import for a user who cannot create', () => {
    hasPermission.mockReturnValue(false)
    expect(mountView().get('[data-testid="pathways-import"]').attributes('disabled')).toBeDefined()
  })

  it('passes the design to the service and returns the new id', async () => {
    vi.mocked(importPathway).mockResolvedValue({ id: 55, name: 'X' } as never)
    const wrapper = mountView()

    const entity = await (wrapper.vm as unknown as { importDesign: ImportDesign })
      .importDesign({ any: 'design' }, { fileName: 'design.json' })

    expect(importPathway).toHaveBeenCalledWith({ any: 'design' })
    expect(entity).toEqual({ id: 55 })
  })

  it('lets a server refusal reach the button', async () => {
    vi.mocked(importPathway).mockRejectedValue(new Error('Not a pathway design'))
    const wrapper = mountView()

    await expect(
      (wrapper.vm as unknown as { importDesign: ImportDesign })
        .importDesign({}, { fileName: 'x.json' })
    ).rejects.toThrow('Not a pathway design')
  })

  it('opens the imported analysis', () => {
    const wrapper = mountView()

    ;(wrapper.vm as unknown as { onImported: (e: { id?: number }) => void }).onImported({ id: 55 })

    expect(push).toHaveBeenCalledWith('/pathways/55')
  })
})
