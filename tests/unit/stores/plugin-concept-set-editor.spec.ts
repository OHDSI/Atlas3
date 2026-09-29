/**
 * Tests for the plugin concept set editor store
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePluginConceptSetEditorStore } from '@/stores/plugin-concept-set-editor'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSet } from '@/models/concept-set.types'

const loadedSet = { id: 7, name: 'Aspirin', items: [] } as unknown as ConceptSet

describe('plugin-concept-set-editor store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts closed with nothing pending', () => {
    const store = usePluginConceptSetEditorStore()

    expect(store.isOpen).toBe(false)
    expect(store.pending).toBeNull()
    expect(store.loadError).toBeNull()
  })

  it('opens on a blank set when no id is given', async () => {
    const store = usePluginConceptSetEditorStore()
    const conceptSets = useConceptSetsStore()
    const fetchOne = vi.spyOn(conceptSets, 'fetchOne')

    void store.open()
    await Promise.resolve()

    expect(fetchOne).not.toHaveBeenCalled()
    expect(store.isOpen).toBe(true)
    expect(conceptSets.currentSet).toEqual({ name: '', items: [] })
  })

  it('loads the requested set before opening', async () => {
    const store = usePluginConceptSetEditorStore()
    const conceptSets = useConceptSetsStore()
    vi.spyOn(conceptSets, 'fetchOne').mockImplementation(async () => {
      conceptSets.currentSet = loadedSet
    })

    void store.open(7)
    await vi.waitFor(() => expect(store.isOpen).toBe(true))

    expect(conceptSets.fetchOne).toHaveBeenCalledWith(7)
    expect(conceptSets.currentSet).toEqual(loadedSet)
  })

  it('answers null and records the error when the set does not load', async () => {
    const store = usePluginConceptSetEditorStore()
    const conceptSets = useConceptSetsStore()
    vi.spyOn(conceptSets, 'fetchOne').mockImplementation(async () => {
      conceptSets.currentSet = null
      conceptSets.error = 'Concept set not found'
    })

    await expect(store.open(99)).resolves.toBeNull()

    expect(store.isOpen).toBe(false)
    expect(store.loadError).toEqual({ conceptSetId: 99, message: 'Concept set not found' })

    store.clearLoadError()
    expect(store.loadError).toBeNull()
  })

  it('resolves with the saved set and clears the working copy', async () => {
    const store = usePluginConceptSetEditorStore()
    const conceptSets = useConceptSetsStore()

    const result = store.open()
    await vi.waitFor(() => expect(store.isOpen).toBe(true))
    store.saved({ conceptSetId: 12, name: 'New set' })

    await expect(result).resolves.toEqual({ conceptSetId: 12, name: 'New set' })
    expect(store.isOpen).toBe(false)
    expect(store.pending).toBeNull()
    expect(conceptSets.currentSet).toBeNull()
  })

  it('resolves null when cancelled', async () => {
    const store = usePluginConceptSetEditorStore()

    const result = store.open()
    await vi.waitFor(() => expect(store.isOpen).toBe(true))
    store.cancel()

    await expect(result).resolves.toBeNull()
    expect(store.isOpen).toBe(false)
  })

  it('settles a superseded request with null', async () => {
    const store = usePluginConceptSetEditorStore()

    const first = store.open()
    await vi.waitFor(() => expect(store.isOpen).toBe(true))
    const second = store.open()

    await expect(first).resolves.toBeNull()
    await vi.waitFor(() => expect(store.isOpen).toBe(true))
    store.saved({ conceptSetId: 3, name: 'Second' })
    await expect(second).resolves.toEqual({ conceptSetId: 3, name: 'Second' })
  })

  it('does not open when cancelled while the set is still loading', async () => {
    const store = usePluginConceptSetEditorStore()
    const conceptSets = useConceptSetsStore()
    let finishLoad: () => void = () => {}
    vi.spyOn(conceptSets, 'fetchOne').mockImplementation(
      () =>
        new Promise<void>(resolve => {
          finishLoad = () => {
            conceptSets.currentSet = loadedSet
            resolve()
          }
        })
    )

    const result = store.open(7)
    store.cancel()
    finishLoad()

    await expect(result).resolves.toBeNull()
    expect(store.isOpen).toBe(false)
  })

  it('ignores a cancel with nothing pending and leaves the concept set store alone', () => {
    const store = usePluginConceptSetEditorStore()
    const conceptSets = useConceptSetsStore()
    conceptSets.currentSet = loadedSet

    expect(() => store.cancel()).not.toThrow()
    expect(conceptSets.currentSet).toEqual(loadedSet)
  })
})
