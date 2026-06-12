import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCriteriaGroupPicker } from '@/composables/useCriteriaGroupPicker'
import type { CriteriaGroup, EventAttribute } from '@/models/cohort.types'

function makeGroup(): CriteriaGroup {
  return {
    id: 'g1',
    logicType: 'ALL',
    events: [
      { id: 'e0', criteriaType: 'ConditionOccurrence', attributes: [] },
      {
        id: 'e1',
        criteriaType: 'DrugExposure',
        attributes: [],
        nestedCriteria: {
          id: 'n1',
          logicType: 'ALL',
          events: [
            { id: 'c0', criteriaType: 'DrugExposure', attributes: [] },
            { id: 'c1', criteriaType: 'Measurement', attributes: [] },
          ],
        },
      },
    ],
  } as CriteriaGroup
}

describe('useCriteriaGroupPicker', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('assigns a concept set to the targeted nested child, not the parent (#93)', async () => {
    let group = makeGroup()
    const picker = useCriteriaGroupPicker({
      getGroup: () => group,
      onUpdate: g => {
        group = g
      },
    })

    picker.onSelectConceptSet({ eventIndex: 1, nestedEventIndex: 1 })
    expect(picker.conceptSetDialogOpen.value).toBe(true)

    await picker.onConceptSetSelected({ id: 7, name: 'B', items: [{}] })

    // Parent event must be untouched...
    expect(group.events[1]?.conceptSet).toBeUndefined()
    // ...and only the addressed nested child gets the concept set.
    expect(group.events[1]?.nestedCriteria?.events[1]?.conceptSet).toMatchObject({ id: 7, name: 'B' })
    expect(group.events[1]?.nestedCriteria?.events[0]?.conceptSet).toBeUndefined()
    expect(picker.conceptSetDialogOpen.value).toBe(false)
  })

  it('assigns a concept set to the parent event for a non-nested selection', async () => {
    let group = makeGroup()
    const picker = useCriteriaGroupPicker({
      getGroup: () => group,
      onUpdate: g => {
        group = g
      },
    })

    picker.onSelectConceptSet(0)
    await picker.onConceptSetSelected({ id: 3, name: 'A', items: [{}] })

    expect(group.events[0]?.conceptSet).toMatchObject({ id: 3, name: 'A' })
    expect(group.events[1]?.conceptSet).toBeUndefined()
  })

  it('merges searched concepts into the targeted concept attribute', () => {
    let group = makeGroup()
    group.events[0]!.attributes = [{ type: 'concept', concepts: [] } as unknown as EventAttribute]
    const picker = useCriteriaGroupPicker({
      getGroup: () => group,
      onUpdate: g => {
        group = g
      },
    })

    picker.onSelectConcept({ eventIndex: 0, attributeIndex: 0, domainFilter: 'Drug' })
    expect(picker.conceptSearchDialogOpen.value).toBe(true)
    expect(picker.conceptSearchDomainFilter.value).toBe('Drug')

    picker.onConceptsSelected([
      {
        conceptId: 101,
        conceptName: 'Foo',
        conceptCode: 'F',
        domainId: 'Drug',
        vocabularyId: 'RxNorm',
        conceptClassId: 'Ingredient',
      },
    ] as unknown as Parameters<typeof picker.onConceptsSelected>[0])

    const attr = group.events[0]?.attributes?.[0] as unknown as { concepts: Array<{ CONCEPT_ID: number }> }
    expect(attr.concepts).toHaveLength(1)
    expect(attr.concepts[0]?.CONCEPT_ID).toBe(101)
    expect(picker.conceptSearchDialogOpen.value).toBe(false)
  })
})
