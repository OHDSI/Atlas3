import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  DEFAULT_VISIBLE_CONCEPT_COLUMN_KEYS,
  useConceptTablePreferencesStore,
} from '@/stores/concept-table-preferences'

describe('concept table preferences store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('uses the compact default set of visible columns', () => {
    const store = useConceptTablePreferencesStore()

    expect(store.visibleColumnKeys).toEqual(DEFAULT_VISIBLE_CONCEPT_COLUMN_KEYS)
  })

  it('shares column visibility changes through application state', () => {
    const store = useConceptTablePreferencesStore()

    store.setColumnVisibility('recordCount', false)
    store.setColumnVisibility('personCount', true)

    expect(store.visibleColumnKeys).not.toContain('recordCount')
    expect(store.visibleColumnKeys).toContain('personCount')
  })
})
