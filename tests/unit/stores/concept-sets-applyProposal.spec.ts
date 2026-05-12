import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSet, ConceptSetItem } from '@/models/concept-set.types'

function makeItem(conceptId: number, name: string): ConceptSetItem {
  return {
    conceptId,
    conceptName: name,
    conceptCode: '',
    domainId: 'Drug',
    vocabularyId: 'RxNorm',
    conceptClassId: 'Ingredient',
    standardConcept: 'S',
    invalidReason: null,
    isExcluded: false,
    includeDescendants: true,
    includeMapped: false,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useConceptSetsStore.applyProposal', () => {
  it('returns false when no currentSet is open', () => {
    const store = useConceptSetsStore()
    expect(store.applyProposal({ name: 'X' })).toBe(false)
    expect(store.isDirty).toBe(false)
  })

  it('merges name + description into currentSet and marks dirty', () => {
    const store = useConceptSetsStore()
    store.currentSet = {
      id: 1,
      name: 'Original',
      description: 'old',
      items: [makeItem(101, 'Metformin')],
    } as ConceptSet
    expect(store.applyProposal({ name: 'Statins', description: 'new desc' })).toBe(true)
    expect(store.currentSet.name).toBe('Statins')
    expect(store.currentSet.description).toBe('new desc')
    expect(store.currentSet.items).toHaveLength(1)
    expect(store.isDirty).toBe(true)
  })

  it('itemsToAdd appends without duplicating by conceptId', () => {
    const store = useConceptSetsStore()
    store.currentSet = {
      id: 1,
      name: 'Statins',
      items: [makeItem(101, 'Atorvastatin')],
    } as ConceptSet
    const ok = store.applyProposal({
      itemsToAdd: [makeItem(101, 'Atorvastatin'), makeItem(102, 'Simvastatin')],
    })
    expect(ok).toBe(true)
    expect(store.currentSet.items.map(i => i.conceptId).sort()).toEqual([101, 102])
  })

  it('items full-replaces the array', () => {
    const store = useConceptSetsStore()
    store.currentSet = {
      id: 1,
      name: 'Statins',
      items: [makeItem(101, 'Old')],
    } as ConceptSet
    const ok = store.applyProposal({
      items: [makeItem(201, 'A'), makeItem(202, 'B')],
    })
    expect(ok).toBe(true)
    expect(store.currentSet.items.map(i => i.conceptId)).toEqual([201, 202])
  })

  it('blank name is ignored (does not clobber existing)', () => {
    const store = useConceptSetsStore()
    store.currentSet = {
      id: 1,
      name: 'Keep',
      items: [],
    } as ConceptSet
    const ok = store.applyProposal({ name: '   ' })
    expect(ok).toBe(false)
    expect(store.currentSet.name).toBe('Keep')
    expect(store.isDirty).toBe(false)
  })
})
