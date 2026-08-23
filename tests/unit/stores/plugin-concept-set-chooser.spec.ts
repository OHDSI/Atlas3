/**
 * Tests for the plugin concept set chooser store
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePluginConceptSetChooserStore } from '@/stores/plugin-concept-set-chooser'

describe('plugin-concept-set-chooser store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts closed with nothing pending', () => {
    const store = usePluginConceptSetChooserStore()

    expect(store.isOpen).toBe(false)
    expect(store.title).toBeUndefined()
    expect(store.pending).toBeNull()
  })

  it('opens and resolves with the selected concept set', async () => {
    const store = usePluginConceptSetChooserStore()

    const choice = store.open('Pick one')
    expect(store.isOpen).toBe(true)
    expect(store.title).toBe('Pick one')

    store.select({ conceptSetId: 7, name: 'Aspirin' })

    await expect(choice).resolves.toEqual({ conceptSetId: 7, name: 'Aspirin' })
    expect(store.isOpen).toBe(false)
    expect(store.pending).toBeNull()
  })

  it('resolves null when cancelled, so a caller is never left waiting', async () => {
    const store = usePluginConceptSetChooserStore()

    const choice = store.open()
    store.cancel()

    await expect(choice).resolves.toBeNull()
    expect(store.isOpen).toBe(false)
  })

  it('settles a superseded request rather than dropping it', async () => {
    const store = usePluginConceptSetChooserStore()

    const first = store.open('First')
    const second = store.open('Second')

    await expect(first).resolves.toBeNull()
    expect(store.title).toBe('Second')

    store.select({ conceptSetId: 3, name: 'Second choice' })
    await expect(second).resolves.toEqual({ conceptSetId: 3, name: 'Second choice' })
  })

  it('ignores a settle with nothing pending', () => {
    const store = usePluginConceptSetChooserStore()

    expect(() => store.cancel()).not.toThrow()
    expect(store.isOpen).toBe(false)
  })
})
