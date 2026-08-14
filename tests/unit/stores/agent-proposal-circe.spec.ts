/**
 * The agent bridge speaks the older Atlas shapes; the store holds circe. This
 * translation is what stands between the two, and every case here is a way the
 * store previously lost the proposal's content while still reporting success.
 */
import { describe, it, expect } from 'vitest'
import {
  translateAgentEvent,
  translateAgentEventToCorelated,
  translateAgentCriteriaGroups,
  registerConceptSets,
} from '@/stores/agent-proposal-circe'
import type { ConceptSet } from '@/models/circe-types'
import type { CohortEvent, CriteriaGroup } from '@/models/cohort.types'

const drugEvent = (name: string, conceptId: number, id: number | string = 'client-uuid') =>
  ({
    id: `evt-${conceptId}`,
    criteriaType: 'DrugExposure',
    conceptSet: {
      id,
      name,
      items: [{ conceptId, conceptName: name, domainId: 'Drug' }],
    },
  }) as unknown as CohortEvent

describe('translateAgentEvent', () => {
  it('references the concept set by CodesetId instead of embedding it', () => {
    const translated = translateAgentEvent(drugEvent('Amoxicillin', 1713671, 4), [])

    expect(translated?.criteria).toEqual({ DrugExposure: { CodesetId: 4 } })
    expect(translated?.conceptSet?.id).toBe(4)
  })

  // Without this the criterion reaches generation as every drug exposure in the
  // database rather than the one the agent named.
  it('allocates a CodesetId when the set arrives with a client-minted string id', () => {
    const translated = translateAgentEvent(drugEvent('Amoxicillin', 1713671), [])

    const criteria = translated?.criteria as { DrugExposure?: { CodesetId?: number } }
    expect(typeof criteria.DrugExposure?.CodesetId).toBe('number')
    expect(translated?.conceptSet?.id).toBe(criteria.DrugExposure?.CodesetId)
  })

  it('allocates an id that does not collide with the sets already in the expression', () => {
    const existing: ConceptSet[] = [{ id: 0, name: 'A' }, { id: 7, name: 'B' }]

    const translated = translateAgentEvent(drugEvent('Amoxicillin', 1713671), existing)

    expect(translated?.conceptSet?.id).toBe(8)
  })

  // Items arrive flat from the repository and already nested from the agent
  // bridge. Converting an already-converted item yields CONCEPT_ID: undefined —
  // a codeset matching nothing.
  it('carries the concept through in the nested shape circe reads', () => {
    const translated = translateAgentEvent(drugEvent('Amoxicillin', 1713671, 4), [])

    expect(translated?.conceptSet?.expression?.items?.[0]?.concept).toMatchObject({
      CONCEPT_ID: 1713671,
      CONCEPT_NAME: 'Amoxicillin',
    })
  })

  it('leaves an already-nested item untouched rather than converting it twice', () => {
    const event = {
      id: 'e1',
      criteriaType: 'DrugExposure',
      conceptSet: {
        id: 4,
        name: 'Amoxicillin',
        items: [{ concept: { CONCEPT_ID: 1713671, CONCEPT_NAME: 'Amoxicillin' } }],
      },
    } as unknown as CohortEvent

    const translated = translateAgentEvent(event, [])

    expect(translated?.conceptSet?.expression?.items?.[0]?.concept?.CONCEPT_ID).toBe(1713671)
  })

  it('refuses an event with no domain rather than writing an empty criterion', () => {
    expect(translateAgentEvent({ id: 'e1' } as unknown as CohortEvent, [])).toBeNull()
  })

  it('refuses a demographic event, which does not belong in a criteria list', () => {
    expect(
      translateAgentEvent({ id: 'e1', criteriaType: 'Demographic' } as unknown as CohortEvent, [])
    ).toBeNull()
  })
})

describe('translateAgentEventToCorelated', () => {
  // circe expresses "patient must not have X" as X occurring EXACTLY 0 times.
  // Dropping the cardinality turned every agent-built exclusion into an
  // inclusion.
  it('keeps the zero-occurrence cardinality that makes an exclusion an exclusion', () => {
    const event = {
      ...drugEvent('Amoxicillin', 1713671, 4),
      cardinality: { type: 'EXACTLY', count: 0, countingMethod: 'ALL' },
    } as unknown as CohortEvent

    const translated = translateAgentEventToCorelated(event, [])

    expect(translated?.criteria.Occurrence).toMatchObject({ Type: 0, Count: 0 })
  })

  it('maps AT_LEAST to the circe occurrence type', () => {
    const event = {
      ...drugEvent('Amoxicillin', 1713671, 4),
      cardinality: { type: 'AT_LEAST', count: 2, countingMethod: 'ALL' },
    } as unknown as CohortEvent

    const translated = translateAgentEventToCorelated(event, [])

    expect(translated?.criteria.Occurrence).toMatchObject({ Type: 2, Count: 2 })
  })

  it('leaves the occurrence out when the event has no cardinality', () => {
    const translated = translateAgentEventToCorelated(drugEvent('Amoxicillin', 1713671, 4), [])

    expect(translated?.criteria.Occurrence).toBeUndefined()
  })
})

describe('translateAgentCriteriaGroups', () => {
  const group = (events: CohortEvent[], logicType: 'ALL' | 'ANY' = 'ALL') =>
    ({ id: 'g1', logicType, events }) as unknown as CriteriaGroup

  it('builds the group the rule described rather than an empty one', () => {
    const translated = translateAgentCriteriaGroups([group([drugEvent('Amoxicillin', 1713671, 4)])])

    expect(translated.group.Type).toBe('ALL')
    expect(translated.group.CriteriaList).toHaveLength(1)
    expect(translated.dropped).toBe(0)
  })

  it('keeps the ANY logic the agent asked for', () => {
    const translated = translateAgentCriteriaGroups([
      group([drugEvent('Amoxicillin', 1713671, 4)], 'ANY'),
    ])

    expect(translated.group.Type).toBe('ANY')
  })

  it('gives two events in one group distinct concept set ids', () => {
    const translated = translateAgentCriteriaGroups([
      group([drugEvent('Amoxicillin', 1713671), drugEvent('Doxycycline', 1738521)]),
    ])

    const ids = translated.conceptSets.map(cs => cs.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })

  it('combines several groups under an ALL parent rather than keeping only the first', () => {
    const translated = translateAgentCriteriaGroups([
      group([drugEvent('Amoxicillin', 1713671)]),
      group([drugEvent('Doxycycline', 1738521)]),
    ])

    expect(translated.group.Type).toBe('ALL')
    expect(translated.group.Groups).toHaveLength(2)
  })

  it('reports events it could not translate instead of quietly shortening the group', () => {
    const translated = translateAgentCriteriaGroups([
      group([drugEvent('Amoxicillin', 1713671, 4), { id: 'e2' } as unknown as CohortEvent]),
    ])

    expect(translated.dropped).toBe(1)
    expect(translated.group.CriteriaList).toHaveLength(1)
  })

  it('produces an empty ALL group for a rule with no criteria groups', () => {
    const translated = translateAgentCriteriaGroups(undefined)

    expect(translated.group).toEqual({ Type: 'ALL', CriteriaList: [], Groups: [] })
  })
})

describe('registerConceptSets', () => {
  it('adds sets the expression does not already hold', () => {
    const existing: ConceptSet[] = [{ id: 1, name: 'A' }]

    const added = registerConceptSets(existing, [{ id: 2, name: 'B' }])

    expect(existing).toHaveLength(2)
    expect(added).toHaveLength(1)
  })

  it('skips an id that is already there rather than duplicating it', () => {
    const existing: ConceptSet[] = [{ id: 1, name: 'A' }]

    const added = registerConceptSets(existing, [{ id: 1, name: 'A again' }])

    expect(existing).toHaveLength(1)
    expect(added).toHaveLength(0)
  })
})
