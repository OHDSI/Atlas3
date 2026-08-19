import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import type { ConceptSet } from '@/models/circe-types'

const mockConceptSetsStore = {
  currentSet: null as ConceptSet | null,
  fetchOne: vi.fn(async (id: number) => {
    mockConceptSetsStore.currentSet = {
      id,
      name: 'Repository concept set',
      items: [
        {
          concept: {
            CONCEPT_ID: 101,
            CONCEPT_NAME: 'Imported concept',
          },
        },
      ],
    } as ConceptSet
  }),
}

vi.mock('@/stores/concept-sets', () => ({
  useConceptSetsStore: () => mockConceptSetsStore,
}))

vi.mock('@/components/cohort-editor/atlas-concept-set', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/cohort-editor/atlas-concept-set')>()
  return {
    ...actual,
    convertAtlasItemToCirce: (item: unknown) => item,
  }
})

import { useCirceConceptSetPicker } from '@/composables/useCirceConceptSetPicker'

describe('useCirceConceptSetPicker', () => {
  beforeEach(() => {
    mockConceptSetsStore.currentSet = null
    mockConceptSetsStore.fetchOne.mockClear()
  })

  it('filters non-numeric ids out of the concept-set options list', () => {
    const picker = useCirceConceptSetPicker({
      getConceptSets: () => [
        { id: 1, name: 'First' } as ConceptSet,
        { id: 'client-id' as never, name: 'Ignored' } as ConceptSet,
      ],
      addConceptSet: vi.fn(),
    })

    expect(picker.conceptSetOptions.value).toEqual([{ id: 1, name: 'First' }])
  })

  it('opens and closes the selection dialog without a target', () => {
    const picker = useCirceConceptSetPicker({
      getConceptSets: () => [],
      addConceptSet: vi.fn(),
    })

    picker.onSelectConceptSet(undefined)
    expect(picker.dialogOpen.value).toBe(false)

    picker.onSelectConceptSet({ targetRef: ref<number | null | undefined>() })
    expect(picker.dialogOpen.value).toBe(true)

    picker.hideSelectionDialog()
    expect(picker.dialogOpen.value).toBe(false)
  })

  it('resolves the active selection and notifies the caller', () => {
    const target = ref<number | null | undefined>()
    const onChanged = vi.fn()
    const picker = useCirceConceptSetPicker({
      getConceptSets: () => [],
      addConceptSet: vi.fn(),
      onConceptSetChanged: onChanged,
    })

    picker.onSelectConceptSet({ targetRef: target })
    picker.resolveSelection(42)

    expect(target.value).toBe(42)
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(picker.dialogOpen.value).toBe(false)
  })

  it('cancels a selection request when the local id is invalid', () => {
    const target = ref<number | null | undefined>()
    const picker = useCirceConceptSetPicker({
      getConceptSets: () => [],
      addConceptSet: vi.fn(),
    })

    picker.onSelectConceptSet({ targetRef: target })
    picker.onLocalConceptSetSelected({ id: 'not-a-number', name: 'Invalid' })

    expect(target.value).toBeUndefined()
    expect(picker.dialogOpen.value).toBe(false)
  })

  it('adds a fetched concept set once and resolves the chosen id', async () => {
    const target = ref<number | null | undefined>()
    const addConceptSet = vi.fn()
    const picker = useCirceConceptSetPicker({
      getConceptSets: () => [],
      addConceptSet,
    })

    picker.onSelectConceptSet({ targetRef: target })
    await picker.onConceptSetSelected({ id: '7', name: 'Imported concept set' })

    expect(mockConceptSetsStore.fetchOne).toHaveBeenCalledWith(7)
    expect(addConceptSet).toHaveBeenCalledTimes(1)
    expect(addConceptSet).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        name: 'Imported concept set',
        expression: expect.objectContaining({ items: expect.any(Array) }),
      })
    )
    expect(target.value).toBe(7)
    expect(picker.dialogOpen.value).toBe(false)
  })

  it('skips adding a duplicate concept set while still resolving the target', async () => {
    const target = ref<number | null | undefined>()
    const addConceptSet = vi.fn()
    const picker = useCirceConceptSetPicker({
      getConceptSets: () => [{ id: 7, name: 'Existing' } as ConceptSet],
      addConceptSet,
    })

    picker.onSelectConceptSet({ targetRef: target })
    await picker.onConceptSetSelected({ id: 7, name: 'Existing', items: [] })

    expect(addConceptSet).not.toHaveBeenCalled()
    expect(target.value).toBe(7)
  })

  it('closes the dialog when concept selection arrives without an active request', async () => {
    const addConceptSet = vi.fn()
    const picker = useCirceConceptSetPicker({
      getConceptSets: () => [],
      addConceptSet,
    })

    await picker.onConceptSetSelected({ id: 8, name: 'Ignored', items: [] })

    expect(addConceptSet).not.toHaveBeenCalled()
    expect(picker.dialogOpen.value).toBe(false)
  })

  it('cancels a local selection when called without an active request', () => {
    const picker = useCirceConceptSetPicker({
      getConceptSets: () => [],
      addConceptSet: vi.fn(),
    })

    picker.onLocalConceptSetSelected({ id: 9, name: 'No request' })

    expect(picker.dialogOpen.value).toBe(false)
  })
})

describe('importing a repository concept set whose id is already taken', () => {
  it('adds the picked set under a free id and binds the criterion to it', async () => {
    const conceptSets: ConceptSet[] = [
      { id: 0, name: 'Local A', expression: { items: [] } },
      { id: 1, name: 'Local B', expression: { items: [] } },
    ]
    const picker = useCirceConceptSetPicker({
      getConceptSets: () => conceptSets,
      addConceptSet: cs => conceptSets.push(cs),
    })

    const codesetId = ref<number | undefined>(undefined)
    picker.onSelectConceptSet({ targetRef: codesetId })
    await picker.onConceptSetSelected({
      id: 1,
      name: 'Type 2 Diabetes',
      items: [{ concept: { CONCEPT_ID: 201826 } }],
    })

    const added = conceptSets.find(cs => cs.name === 'Type 2 Diabetes')
    expect(added, 'the picked concept set must reach the expression').toBeDefined()
    expect(codesetId.value).toBe(added!.id)
    expect(conceptSets.find(cs => cs.name === 'Local B')!.id).toBe(1)
  })

  it('keeps the repository id when nothing else is using it', async () => {
    const conceptSets: ConceptSet[] = [{ id: 0, name: 'Local A', expression: { items: [] } }]
    const picker = useCirceConceptSetPicker({
      getConceptSets: () => conceptSets,
      addConceptSet: cs => conceptSets.push(cs),
    })

    const codesetId = ref<number | undefined>(undefined)
    picker.onSelectConceptSet({ targetRef: codesetId })
    await picker.onConceptSetSelected({
      id: 7,
      name: 'Hypertension',
      items: [{ concept: { CONCEPT_ID: 316866 } }],
    })

    expect(codesetId.value).toBe(7)
    expect(conceptSets.map(cs => cs.id)).toEqual([0, 7])
  })

  it('reuses the existing entry when the same set is picked twice', async () => {
    const conceptSets: ConceptSet[] = [
      { id: 7, name: 'Hypertension', expression: { items: [] } },
    ]
    const picker = useCirceConceptSetPicker({
      getConceptSets: () => conceptSets,
      addConceptSet: cs => conceptSets.push(cs),
    })

    const codesetId = ref<number | undefined>(undefined)
    picker.onSelectConceptSet({ targetRef: codesetId })
    await picker.onConceptSetSelected({ id: 7, name: 'Hypertension', items: [] })

    expect(codesetId.value).toBe(7)
    expect(conceptSets).toHaveLength(1)
  })
})
