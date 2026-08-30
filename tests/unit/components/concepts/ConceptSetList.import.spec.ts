/**
 * List-level import for concept sets (#267).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/concept-set.service', () => ({ importConceptSet: vi.fn() }))

const hasPermission = vi.fn().mockReturnValue(true)
vi.mock('@/composables/usePermissions', () => ({ usePermissions: () => ({ hasPermission }) }))

import ConceptSetList from '@/components/concepts/ConceptSetList.vue'
import { importConceptSet } from '@/services/concept-set.service'
import { useConceptSetsStore } from '@/stores/concept-sets'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountList() {
  return mount(ConceptSetList, { global: { plugins: [vuetify, createPinia()] } })
}

describe('ConceptSetList import (#267)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    hasPermission.mockReturnValue(true)
  })

  it('offers an import button beside New concept set', () => {
    expect(mountList().find('[data-testid="concept-sets-import"]').exists()).toBe(true)
  })

  it('disables import for a user who cannot create', () => {
    hasPermission.mockReturnValue(false)
    expect(
      mountList().get('[data-testid="concept-sets-import"]').attributes('disabled')
    ).toBeDefined()
  })

  it('passes the design and the file name through to the service', async () => {
    vi.mocked(importConceptSet).mockResolvedValue({ id: 9, name: 'Statins', items: [] } as never)
    const wrapper = mountList()

    const entity = await (wrapper.vm as unknown as {
      importDesign: (j: unknown, m: { fileName: string }) => Promise<{ id?: number | string }>
    }).importDesign({ items: [] }, { fileName: 'statins.json' })

    expect(importConceptSet).toHaveBeenCalledWith({ items: [] }, 'statins.json')
    expect(entity).toEqual({ id: 9 })
  })

  it('opens the editor on the imported set', async () => {
    const wrapper = mountList()
    const store = useConceptSetsStore()
    vi.spyOn(store, 'fetchAll').mockResolvedValue()
    const open = vi.spyOn(store, 'openEditEditor').mockResolvedValue()

    await (wrapper.vm as unknown as { onImported: (e: { id?: number | string }) => Promise<void> })
      .onImported({ id: 9 })

    expect(open).toHaveBeenCalledWith(9)
  })

  it('refetches the list before opening the editor, so the imported set is not re-imported as a duplicate', async () => {
    const wrapper = mountList()
    const store = useConceptSetsStore()
    const calls: string[] = []
    vi.spyOn(store, 'fetchAll').mockImplementation(async () => {
      calls.push('fetchAll')
    })
    vi.spyOn(store, 'openEditEditor').mockImplementation(async () => {
      calls.push('openEditEditor')
    })

    await (wrapper.vm as unknown as { onImported: (e: { id?: number | string }) => Promise<void> })
      .onImported({ id: 9 })

    expect(calls).toEqual(['fetchAll', 'openEditEditor'])
  })

  it('does not refetch or open the editor when the imported entity has no id', async () => {
    const wrapper = mountList()
    const store = useConceptSetsStore()
    const fetchAll = vi.spyOn(store, 'fetchAll').mockResolvedValue()
    const open = vi.spyOn(store, 'openEditEditor').mockResolvedValue()

    await (wrapper.vm as unknown as { onImported: (e: { id?: number | string }) => Promise<void> })
      .onImported({ id: undefined })

    expect(fetchAll).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })
})
