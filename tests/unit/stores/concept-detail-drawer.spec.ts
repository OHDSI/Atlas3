import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'

describe('concept-detail-drawer store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts closed with no concept selected', () => {
    const store = useConceptDetailDrawerStore()
    expect(store.isOpen).toBe(false)
    expect(store.sourceKey).toBe('')
    expect(store.conceptId).toBeNull()
  })

  it('open() sets sourceKey, conceptId, and isOpen=true', () => {
    const store = useConceptDetailDrawerStore()
    store.open('SYNPUF1K', 201826)
    expect(store.isOpen).toBe(true)
    expect(store.sourceKey).toBe('SYNPUF1K')
    expect(store.conceptId).toBe(201826)
  })

  it('close() flips isOpen=false but preserves sourceKey and conceptId', () => {
    const store = useConceptDetailDrawerStore()
    store.open('SYNPUF1K', 201826)
    store.close()
    expect(store.isOpen).toBe(false)
    expect(store.sourceKey).toBe('SYNPUF1K')
    expect(store.conceptId).toBe(201826)
  })

  it('open() replaces previously selected concept', () => {
    const store = useConceptDetailDrawerStore()
    store.open('SRC_A', 1)
    store.open('SRC_B', 2)
    expect(store.sourceKey).toBe('SRC_B')
    expect(store.conceptId).toBe(2)
    expect(store.isOpen).toBe(true)
  })

  it('reset() clears all state to defaults', () => {
    const store = useConceptDetailDrawerStore()
    store.open('SYNPUF1K', 99)
    store.reset()
    expect(store.isOpen).toBe(false)
    expect(store.sourceKey).toBe('')
    expect(store.conceptId).toBeNull()
  })
})
