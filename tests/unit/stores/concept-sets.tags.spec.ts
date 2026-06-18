import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const assignSpy = vi.fn().mockResolvedValue(true)
const unassignSpy = vi.fn().mockResolvedValue(true)

vi.mock('@/services/concept-set.service', () => ({
  getAllConceptSets: vi.fn().mockResolvedValue([]),
  getConceptSetById: vi.fn().mockResolvedValue(null),
  createConceptSet: vi.fn(),
  updateConceptSet: vi.fn(),
  deleteConceptSet: vi.fn(),
  assignTagToConceptSet: (...a: unknown[]) => assignSpy(...a),
  unassignTagFromConceptSet: (...a: unknown[]) => unassignSpy(...a),
}))

import { useConceptSetsStore } from '@/stores/concept-sets'

describe('concept-sets store tags', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    assignSpy.mockClear()
    unassignSpy.mockClear()
  })

  it('syncTags assigns added and unassigns removed tags', async () => {
    const store = useConceptSetsStore()
    await store.syncTags(42, [{ id: 1, name: 'old' }], [{ id: 2, name: 'new' }])
    expect(assignSpy).toHaveBeenCalledWith(42, 2)
    expect(unassignSpy).toHaveBeenCalledWith(42, 1)
  })

  it('availableTags returns sorted unique tag names', () => {
    const store = useConceptSetsStore()
    store.conceptSets = [
      { id: 1, name: 'A', tags: [{ id: 1, name: 'beta' }, { id: 2, name: 'alpha' }] },
      { id: 2, name: 'B', tags: [{ id: 2, name: 'alpha' }] },
    ] as never
    expect(store.availableTags).toEqual(['alpha', 'beta'])
  })

  it('filteredSets matches selected tags', () => {
    const store = useConceptSetsStore()
    store.conceptSets = [
      { id: 1, name: 'A', tags: [{ id: 1, name: 'keep' }] },
      { id: 2, name: 'B', tags: [{ id: 2, name: 'drop' }] },
    ] as never
    store.setFilters({ ...store.filters, selectedTags: ['keep'] })
    expect(store.filteredSets.map(s => s.id)).toEqual([1])
  })
})
