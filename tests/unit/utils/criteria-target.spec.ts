import { describe, it, expect } from 'vitest'
import {
  resolveCriteriaTargetEvent,
  type CriteriaTargetContext,
  type CriteriaTargetSources,
} from '@/utils/criteria-target'
import type {
  CohortEvent,
  InclusionRule,
  ConceptSetReference,
} from '@/models/cohort.types'

const csA: ConceptSetReference = { id: 1, name: 'A' }
const csB: ConceptSetReference = { id: 2, name: 'B' }

function makeEvent(id: string, conceptSet?: ConceptSetReference): CohortEvent {
  return { id, criteriaType: 'ConditionOccurrence', conceptSet }
}

function makeNestedParent(
  id: string,
  parentCs: ConceptSetReference | undefined,
  children: CohortEvent[]
): CohortEvent {
  return {
    id,
    criteriaType: 'ConditionOccurrence',
    conceptSet: parentCs,
    nestedCriteria: { id: `${id}-nc`, logicType: 'ALL', events: children },
  }
}

describe('resolveCriteriaTargetEvent', () => {
  describe('entry events', () => {
    it('returns the parent entry event for a non-nested context', () => {
      const parent = makeNestedParent('e1', csA, [makeEvent('child0')])
      const sources: CriteriaTargetSources = {
        entryEvents: [parent],
        additionalCriteria: null,
        inclusionRules: [],
      }
      const ctx: CriteriaTargetContext = {
        eventId: 'e1',
        ruleIndex: -1,
        groupIndex: -1,
        eventIndex: -1,
      }
      expect(resolveCriteriaTargetEvent(ctx, sources)).toBe(parent)
    })

    it('returns the nested child for a nested context (issue #93)', () => {
      const child = makeEvent('child0')
      const parent = makeNestedParent('e1', csA, [makeEvent('other'), child])
      const sources: CriteriaTargetSources = {
        entryEvents: [parent],
        additionalCriteria: null,
        inclusionRules: [],
      }
      const ctx: CriteriaTargetContext = {
        eventId: 'e1',
        ruleIndex: -1,
        groupIndex: -1,
        eventIndex: -1,
        nestedEventIndex: 1,
      }
      const target = resolveCriteriaTargetEvent(ctx, sources)
      expect(target).toBe(child)
      // The parent must NOT be the target — assigning to it would reproduce the bug.
      expect(target).not.toBe(parent)
    })

    it('returns null when the nested index is out of range', () => {
      const parent = makeNestedParent('e1', csA, [makeEvent('child0')])
      const sources: CriteriaTargetSources = {
        entryEvents: [parent],
        additionalCriteria: null,
        inclusionRules: [],
      }
      const ctx: CriteriaTargetContext = {
        eventId: 'e1',
        ruleIndex: -1,
        groupIndex: -1,
        eventIndex: -1,
        nestedEventIndex: 5,
      }
      expect(resolveCriteriaTargetEvent(ctx, sources)).toBeNull()
    })

    it('returns null when the entry event id is unknown', () => {
      const sources: CriteriaTargetSources = {
        entryEvents: [makeEvent('e1')],
        additionalCriteria: null,
        inclusionRules: [],
      }
      const ctx: CriteriaTargetContext = {
        eventId: 'missing',
        ruleIndex: -1,
        groupIndex: -1,
        eventIndex: -1,
      }
      expect(resolveCriteriaTargetEvent(ctx, sources)).toBeNull()
    })
  })

  describe('additional criteria (ruleIndex -2)', () => {
    it('returns the parent additional-criteria event when not nested', () => {
      const parent = makeNestedParent('a0', csA, [makeEvent('child0')])
      const sources: CriteriaTargetSources = {
        entryEvents: [],
        additionalCriteria: { events: [parent] },
        inclusionRules: [],
      }
      const ctx: CriteriaTargetContext = {
        eventId: null,
        ruleIndex: -2,
        groupIndex: 0,
        eventIndex: 0,
      }
      expect(resolveCriteriaTargetEvent(ctx, sources)).toBe(parent)
    })

    it('returns the nested child of an additional-criteria event', () => {
      const child = makeEvent('child0', csB)
      const parent = makeNestedParent('a0', csA, [child])
      const sources: CriteriaTargetSources = {
        entryEvents: [],
        additionalCriteria: { events: [parent] },
        inclusionRules: [],
      }
      const ctx: CriteriaTargetContext = {
        eventId: null,
        ruleIndex: -2,
        groupIndex: 0,
        eventIndex: 0,
        nestedEventIndex: 0,
      }
      expect(resolveCriteriaTargetEvent(ctx, sources)).toBe(child)
    })
  })

  describe('inclusion-rule criteria groups (ruleIndex >= 0)', () => {
    function buildRules(parent: CohortEvent): InclusionRule[] {
      return [
        {
          id: 'r0',
          name: 'rule',
          criteriaGroups: [{ id: 'g0', logicType: 'ALL', events: [parent] }],
        },
      ]
    }

    it('returns the parent group event when not nested', () => {
      const parent = makeNestedParent('g-e0', csA, [makeEvent('child0')])
      const sources: CriteriaTargetSources = {
        entryEvents: [],
        additionalCriteria: null,
        inclusionRules: buildRules(parent),
      }
      const ctx: CriteriaTargetContext = {
        eventId: null,
        ruleIndex: 0,
        groupIndex: 0,
        eventIndex: 0,
      }
      expect(resolveCriteriaTargetEvent(ctx, sources)).toBe(parent)
    })

    it('returns the nested child of a group event (issue #93)', () => {
      const child = makeEvent('child0')
      const parent = makeNestedParent('g-e0', csA, [child])
      const sources: CriteriaTargetSources = {
        entryEvents: [],
        additionalCriteria: null,
        inclusionRules: buildRules(parent),
      }
      const ctx: CriteriaTargetContext = {
        eventId: null,
        ruleIndex: 0,
        groupIndex: 0,
        eventIndex: 0,
        nestedEventIndex: 0,
      }
      expect(resolveCriteriaTargetEvent(ctx, sources)).toBe(child)
    })

    it('returns null for out-of-range rule / group / event indices', () => {
      const sources: CriteriaTargetSources = {
        entryEvents: [],
        additionalCriteria: null,
        inclusionRules: buildRules(makeEvent('g-e0')),
      }
      expect(
        resolveCriteriaTargetEvent(
          { eventId: null, ruleIndex: 9, groupIndex: 0, eventIndex: 0 },
          sources
        )
      ).toBeNull()
      expect(
        resolveCriteriaTargetEvent(
          { eventId: null, ruleIndex: 0, groupIndex: 9, eventIndex: 0 },
          sources
        )
      ).toBeNull()
      expect(
        resolveCriteriaTargetEvent(
          { eventId: null, ruleIndex: 0, groupIndex: 0, eventIndex: 9 },
          sources
        )
      ).toBeNull()
    })
  })

  it('returns null for a non-event context (e.g. exit criteria sentinel -3)', () => {
    const sources: CriteriaTargetSources = {
      entryEvents: [],
      additionalCriteria: null,
      inclusionRules: [],
    }
    const ctx: CriteriaTargetContext = {
      eventId: null,
      ruleIndex: -3,
      groupIndex: 0,
      eventIndex: 0,
    }
    expect(resolveCriteriaTargetEvent(ctx, sources)).toBeNull()
  })
})
