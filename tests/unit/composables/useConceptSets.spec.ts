import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/webapi', () => ({
  searchConcepts: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

describe('useConceptSets', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('exposes only the concept-search surface', async () => {
    const { useConceptSets } = await import('@/composables/useConceptSets')
    expect(Object.keys(useConceptSets()).sort()).toEqual([
      'isSearching',
      'searchResults',
      'searchConcepts',
      'selectedConcepts',
    ].sort())
  })
})
