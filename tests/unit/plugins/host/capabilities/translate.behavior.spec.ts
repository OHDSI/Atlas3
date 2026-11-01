import { describe, it, expect, afterEach, vi } from 'vitest'
import { translateCapability, domainToCriteriaType } from '@/plugins/host/capabilities/translate'

type Loose = Record<string, any>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const ZERO = { type: 'EXACTLY', count: 0, countingMethod: 'ALL' }

const t = (name: string, args: Record<string, unknown>) => translateCapability(name, args) as Loose | null

function conceptSetFor(conceptId: number, conceptName: string, overrides: Loose = {}): Loose {
  return {
    id: expect.any(String),
    name: conceptName,
    conceptCount: 1,
    items: [
      {
        conceptId,
        conceptName,
        conceptCode: '',
        domainId: '',
        vocabularyId: '',
        conceptClassId: '',
        standardConcept: 'S',
        standardConceptCaption: 'Standard',
        invalidReason: null,
        invalidReasonCaption: 'Unknown',
        validStartDate: Date.UTC(1970, 0, 1),
        validEndDate: Date.UTC(2090, 0, 1),
        includeDescendants: true,
        isExcluded: false,
        includeMapped: false,
        ...overrides,
      },
    ],
  }
}

describe('uid generation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses crypto.randomUUID when it exists', () => {
    const p = t('add_criterion', { conceptId: 1, conceptName: 'A' })
    expect(p?.event.id).toMatch(UUID)
    expect(p?.event.conceptSet.id).toMatch(UUID)
    expect(p?.event.id).not.toBe(p?.event.conceptSet.id)
  })

  it('falls back to a short base-36 id when crypto has no randomUUID', () => {
    vi.stubGlobal('crypto', {})
    const p = t('add_criterion', { conceptId: 1, conceptName: 'A' })
    expect(p?.event.id).toMatch(/^[a-z0-9]{1,10}$/)
  })

  it('falls back to a short base-36 id when crypto is undefined', () => {
    vi.stubGlobal('crypto', undefined)
    const p = t('add_criterion', { conceptId: 1, conceptName: 'A' })
    expect(p?.event.id).toMatch(/^[a-z0-9]{1,10}$/)
  })
})

describe('domainToCriteriaType', () => {
  it('returns the registry mapping for a known domain', () => {
    expect(domainToCriteriaType('Drug')).toBe('DrugExposure')
  })

  it('falls back to ConditionOccurrence for an unmapped domain', () => {
    expect(domainToCriteriaType('Bogus')).toBe('ConditionOccurrence')
    expect(domainToCriteriaType(undefined)).toBe('ConditionOccurrence')
  })
})

describe('criterion events', () => {
  it('builds the full event with an embedded concept set', () => {
    expect(t('add_criterion', { conceptId: 5, conceptName: 'Five' })).toEqual({
      kind: 'addEntryEvent',
      event: {
        id: expect.any(String),
        criteriaType: 'ConditionOccurrence',
        conceptSet: conceptSetFor(5, 'Five'),
      },
    })
  })

  it('carries domain and explicit include/exclude flags into the concept set item', () => {
    const p = t('add_criterion', {
      conceptId: 5,
      conceptName: 'Five',
      domain: 'Drug',
      includeDescendants: false,
      isExcluded: true,
    })
    expect(p?.event.criteriaType).toBe('DrugExposure')
    expect(p?.event.conceptSet).toEqual(
      conceptSetFor(5, 'Five', { domainId: 'Drug', includeDescendants: false, isExcluded: true })
    )
  })

  it('returns null when either the concept id or the name is missing', () => {
    expect(t('add_criterion', {})).toBeNull()
    expect(t('add_criterion', { conceptId: 1 })).toBeNull()
    expect(t('add_criterion', { conceptName: 'A' })).toBeNull()
    expect(t('add_qualifying_criterion', { conceptId: 1 })).toBeNull()
    expect(t('set_censor_event', { conceptName: 'A' })).toBeNull()
  })

  it('adds measurement operator and values only when both operator and numeric value are given', () => {
    const between = t('add_criterion', { conceptId: 1, conceptName: 'HbA1c', operator: 'between', value: 5, value2: 7 })
    expect(between?.event).toMatchObject({ measurementOperator: 'between', measurementValue: 5, measurementValue2: 7 })

    const single = t('add_criterion', { conceptId: 1, conceptName: 'HbA1c', operator: 'gt', value: 5, value2: '7' })
    expect(single?.event).toMatchObject({ measurementOperator: 'gt', measurementValue: 5 })
    expect(single?.event).not.toHaveProperty('measurementValue2')

    const noValue = t('add_criterion', { conceptId: 1, conceptName: 'HbA1c', operator: 'gt', value: '5' })
    expect(noValue?.event).not.toHaveProperty('measurementOperator')
    expect(noValue?.event).not.toHaveProperty('measurementValue')

    const noOperator = t('add_criterion', { conceptId: 1, conceptName: 'HbA1c', value: 5 })
    expect(noOperator?.event).not.toHaveProperty('measurementOperator')
    expect(noOperator?.event).not.toHaveProperty('measurementValue')
  })

  it('names the inclusion and exclusion rules from the concept name', () => {
    const inc = t('add_criterion', { conceptId: 1, conceptName: 'A', group: 'inclusion' })
    expect(inc?.rule).toEqual({
      id: expect.any(String),
      name: 'A',
      criteriaGroups: [{ id: expect.any(String), logicType: 'ALL', events: [inc?.rule.criteriaGroups[0].events[0]] }],
    })
    expect(inc?.rule.criteriaGroups[0].events[0]).not.toHaveProperty('cardinality')

    const exc = t('add_criterion', { conceptId: 1, conceptName: 'A', group: 'exclusion' })
    expect(exc?.rule.name).toBe('Exclude: A')
    expect(exc?.rule.criteriaGroups[0].logicType).toBe('ALL')
  })

  it('wraps qualifying and censoring criteria with their own kinds', () => {
    expect(t('add_qualifying_criterion', { conceptId: 1, conceptName: 'A' })?.kind).toBe('addQualifyingCriterion')
    expect(t('set_censor_event', { conceptId: 1, conceptName: 'A' })?.kind).toBe('addCensoringCriterion')
  })

  it('set_entry_event replaces the existing entry event', () => {
    expect(t('set_entry_event', { conceptId: 1, conceptName: 'A' })).toMatchObject({ kind: 'addEntryEvent', replace: true })
  })
})

describe('add_criteria', () => {
  const item = (conceptId: number, conceptName: unknown) => ({ conceptId, conceptName })

  it('returns null when no item yields an event', () => {
    expect(t('add_criteria', { items: [{ conceptId: 1 }] })).toBeNull()
    expect(t('add_criteria', {})).toBeNull()
  })

  it('reads events when items is absent', () => {
    const p = t('add_criteria', { events: [item(1, 'A')] })
    expect(p?.rule.criteriaGroups[0].events).toHaveLength(1)
  })

  it('uses ANY logic for OR, ALL otherwise, and no cardinality for inclusion groups', () => {
    const or = t('add_criteria', { items: [item(1, 'A'), item(2, 'B')], logic: 'OR' })
    expect(or?.rule.criteriaGroups[0].logicType).toBe('ANY')
    expect(or?.rule.criteriaGroups[0].events[0]).not.toHaveProperty('cardinality')
    expect(or?.rule.criteriaGroups[0].events[0].conceptSet.name).toBe('A')

    const and = t('add_criteria', { items: [item(1, 'A')], logic: 'AND' })
    expect(and?.rule.criteriaGroups[0].logicType).toBe('ALL')
  })

  it('forces ALL logic and zero cardinality on every event of an exclusion group', () => {
    const p = t('add_criteria', { items: [item(1, 'A'), item(2, 'B')], group: 'exclusion', logic: 'OR' })
    const group = p?.rule.criteriaGroups[0]
    expect(group.logicType).toBe('ALL')
    expect(group.events.map((e: Loose) => e.cardinality)).toEqual([ZERO, ZERO])
    expect(group.events.map((e: Loose) => e.conceptSet.name)).toEqual(['A', 'B'])
    expect(p?.rule.name).toBe('Exclude: A or B')
  })

  it('derives the name only from string concept names', () => {
    expect(t('add_criteria', { items: [item(1, 'A'), item(2, 42), { conceptId: 3 }] })?.rule.name).toBe('Require: A')
    expect(t('add_criteria', { items: [item(1, 42)] })?.rule.name).toBe('Require criteria')
  })

  it('trims an explicit name and falls back to the derived name when it is blank', () => {
    expect(t('add_criteria', { items: [item(1, 'A')], name: '  Custom  ' })?.rule.name).toBe('Custom')
    expect(t('add_criteria', { items: [item(1, 'A')], name: '   ' })?.rule.name).toBe('Require: A')
  })
})

describe('add_inclusion_rule', () => {
  const ev = (conceptId: number, conceptName: string) => ({ conceptId, conceptName })

  it('returns null when no event is valid', () => {
    expect(t('add_inclusion_rule', { events: [{ conceptId: 1 }] })).toBeNull()
    expect(t('add_inclusion_rule', {})).toBeNull()
  })

  it('derives the rule name with "or" for ANY logic and "and" otherwise', () => {
    expect(t('add_inclusion_rule', { logicType: 'ANY', events: [ev(1, 'A'), ev(2, 'B')] })?.rule.name).toBe('Require: A or B')
    expect(t('add_inclusion_rule', { logicType: 'ALL', events: [ev(1, 'A'), ev(2, 'B')] })?.rule.name).toBe('Require: A and B')
    expect(t('add_inclusion_rule', { name: '  ', events: [ev(1, 'A')] })?.rule.name).toBe('Require: A')
    expect(t('add_inclusion_rule', { name: ' R ', events: [ev(1, 'A')] })?.rule.name).toBe('R')
  })

  it('summarises three or more derived names', () => {
    const p = t('add_inclusion_rule', { events: [ev(1, 'A'), ev(2, 'B'), ev(3, 'C'), ev(4, 'D')] })
    expect(p?.rule.name).toBe('Require: A and B (+2 more)')
  })

  it('defaults logicType to ALL, omits count when not given, and carries the description', () => {
    const p = t('add_inclusion_rule', { description: 'desc', events: [ev(1, 'A')] })
    expect(p?.rule.description).toBe('desc')
    expect(p?.rule.criteriaGroups[0].logicType).toBe('ALL')
    expect(Object.keys(p?.rule.criteriaGroups[0])).not.toContain('count')
    expect(p?.rule.criteriaGroups[0].events[0]).not.toHaveProperty('cardinality')
  })

  it('treats AT_MOST without a count as an exclusion group', () => {
    const g = t('add_inclusion_rule', { logicType: 'AT_MOST', events: [ev(1, 'A')] })?.rule.criteriaGroups[0]
    expect(g.logicType).toBe('ALL')
    expect(g.events[0].cardinality).toEqual(ZERO)
    expect(Object.keys(g)).not.toContain('count')
  })

  it('keeps AT_MOST with a positive count as a counted group', () => {
    const g = t('add_inclusion_rule', { logicType: 'AT_MOST', count: 2, events: [ev(1, 'A')] })?.rule.criteriaGroups[0]
    expect(g.logicType).toBe('AT_MOST')
    expect(g.count).toBe(2)
    expect(g.events[0]).not.toHaveProperty('cardinality')
  })

  it('does not treat a zero count with other logic as exclusion', () => {
    const g = t('add_inclusion_rule', { logicType: 'AT_LEAST', count: 0, events: [ev(1, 'A')] })?.rule.criteriaGroups[0]
    expect(g.logicType).toBe('AT_LEAST')
    expect(g.count).toBe(0)
    expect(g.events[0]).not.toHaveProperty('cardinality')
  })

  it('defaults an omitted endDays to the index date', () => {
    const g = t('add_inclusion_rule', { temporalWindow: { startDays: -30 }, events: [ev(1, 'A')] })?.rule.criteriaGroups[0]
    expect(g.events[0].temporalWindow).toEqual({
      startWindow: { days: 30, beforeAfter: 'BEFORE', useIndexEnd: false, useEventEnd: false },
      endWindow: { days: 0, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: false },
    })
  })
})

describe('navigate_to params', () => {
  it('drops null and undefined params and non-string reasons', () => {
    const p = t('navigate_to', { view: 'profile-view', sourceKey: 'SYN', personId: null, reason: 5 })
    expect(p).toStrictEqual({ kind: 'navigate', route: { name: 'profile-view', params: { sourceKey: 'SYN' } }, reason: undefined })
  })

  it('rejects a manifest route that is not agent visible', () => {
    expect(t('navigate_to', { view: 'role-management' })).toBeNull()
  })
})

describe('create_* builders', () => {
  it('create_characterization filters malformed cohort and feature-analysis refs', () => {
    const p = t('create_characterization', {
      name: 'Char',
      description: 'd',
      cohorts: [{ id: 1, name: 'C' }, { id: 2 }, { name: 'nameless' }],
      featureAnalyses: [{ id: 9 }, { name: 'no id' }],
    })
    expect(p).toEqual({
      kind: 'createCharacterization',
      payload: { name: 'Char', description: 'd', cohorts: [{ id: 1, name: 'C' }], featureAnalyses: [{ id: 9, name: undefined }] },
    })
  })

  it('create_characterization requires a name and at least one valid cohort and analysis', () => {
    const refs = { cohorts: [{ id: 1, name: 'C' }], featureAnalyses: [{ id: 9 }] }
    expect(t('create_characterization', refs)).toBeNull()
    expect(t('create_characterization', { name: 'X', cohorts: [{ id: 1 }], featureAnalyses: [{ id: 9 }] })).toBeNull()
    expect(t('create_characterization', { name: 'X', cohorts: [{ id: 1, name: 'C' }], featureAnalyses: [{ name: 'F' }] })).toBeNull()
    expect(t('create_characterization', { name: 'X' })).toBeNull()
  })

  it('create_pathway filters malformed cohort refs and passes settings through', () => {
    const p = t('create_pathway', {
      name: 'P',
      targetCohorts: [{ id: 1, name: 'T', extra: true }, { id: 'x', name: 'bad' }, { id: 3 }],
      eventCohorts: [{ id: 2, name: 'E', extra: true }, { id: 4 }, { name: 'n' }],
      combinationWindow: 7,
      minCellCount: 3,
      maxDepth: 4,
      allowRepeats: false,
    })
    expect(p).toEqual({
      kind: 'createPathway',
      payload: {
        name: 'P',
        description: undefined,
        targetCohorts: [{ id: 1, name: 'T' }],
        eventCohorts: [{ id: 2, name: 'E' }],
        combinationWindow: 7,
        minCellCount: 3,
        maxDepth: 4,
        allowRepeats: false,
      },
    })
  })

  it('create_pathway tolerates missing cohort lists', () => {
    const p = t('create_pathway', { name: 'P' })
    expect(p?.payload.targetCohorts).toEqual([])
    expect(p?.payload.eventCohorts).toEqual([])
  })

  it('create_incidence_rate defaults missing time-at-risk bounds', () => {
    expect(t('create_incidence_rate', { name: 'IR', timeAtRisk: {} })?.payload.timeAtRisk).toEqual({
      start: { DateField: 'StartDate', Offset: 0 },
      end: { DateField: 'EndDate', Offset: 0 },
    })
    expect(
      t('create_incidence_rate', { name: 'IR', timeAtRisk: { start: { Offset: 5 }, end: { Offset: 9 } } })?.payload.timeAtRisk
    ).toEqual({
      start: { DateField: 'StartDate', Offset: 5 },
      end: { DateField: 'EndDate', Offset: 9 },
    })
  })
})

describe('update_* builders', () => {
  it('update_concept_set maps items with include/exclude defaults and explicit values', () => {
    const p = t('update_concept_set', {
      id: 1,
      items: [null, { conceptId: 1, conceptName: 'A', domain: 'Drug' }, { conceptId: '2', conceptName: 'B' }],
      itemsToAdd: [{ conceptId: 3, conceptName: 'C', includeDescendants: false, isExcluded: true }, { conceptId: 4 }],
    })
    expect(p?.payload).toEqual({
      id: 1,
      name: undefined,
      description: undefined,
      items: [{ conceptId: 1, conceptName: 'A', domain: 'Drug', includeDescendants: true, isExcluded: false }],
      itemsToAdd: [{ conceptId: 3, conceptName: 'C', domain: undefined, includeDescendants: false, isExcluded: true }],
    })
  })

  it('update_concept_set keeps explicit flags on items and defaults on itemsToAdd', () => {
    const p = t('update_concept_set', {
      id: 1,
      items: [{ conceptId: 1, conceptName: 'A', includeDescendants: false, isExcluded: true }],
      itemsToAdd: [{ conceptId: 2, conceptName: 'B' }],
    })
    expect(p?.payload.items).toEqual([{ conceptId: 1, conceptName: 'A', domain: undefined, includeDescendants: false, isExcluded: true }])
    expect(p?.payload.itemsToAdd).toEqual([{ conceptId: 2, conceptName: 'B', domain: undefined, includeDescendants: true, isExcluded: false }])
  })

  it('update_concept_set ignores non-array item lists', () => {
    const p = t('update_concept_set', { id: 1, items: 'nope', itemsToAdd: { conceptId: 1, conceptName: 'A' } })
    expect(p?.payload.items).toBeUndefined()
    expect(p?.payload.itemsToAdd).toBeUndefined()
  })

  it('update_characterization drops malformed refs', () => {
    const p = t('update_characterization', {
      id: 3,
      cohorts: [{ id: 1, name: 'C', extra: 1 }, { id: 2 }, { name: 'x' }],
    })
    expect(p?.payload.cohorts).toEqual([{ id: 1, name: 'C' }])
    expect(p?.payload.cohortsToAdd).toBeUndefined()
  })

  it('update_incidence_rate maps cohort refs to add', () => {
    const p = t('update_incidence_rate', {
      id: 8,
      targetIdsToAdd: [{ id: 1, name: 'T', extra: 1 }],
      outcomeIdsToAdd: [{ id: 2, name: 'O', extra: 1 }],
    })
    expect(p?.payload.targetIdsToAdd).toEqual([{ id: 1, name: 'T' }])
    expect(p?.payload.outcomeIdsToAdd).toEqual([{ id: 2, name: 'O' }])
  })
})

describe('set_censor_window', () => {
  it('accepts a single valid bound and nulls the other', () => {
    expect(t('set_censor_window', { startDate: '2020-01-01' })).toEqual({
      kind: 'setCensorWindow',
      censorWindow: { startDate: '2020-01-01', endDate: null },
    })
    expect(t('set_censor_window', { endDate: '2021-01-01' })?.censorWindow).toEqual({ startDate: null, endDate: '2021-01-01' })
  })

  it('rejects dates with trailing or leading junk', () => {
    expect(t('set_censor_window', { startDate: '2020-01-01x' })).toBeNull()
    expect(t('set_censor_window', { startDate: 'x2020-01-01' })).toBeNull()
    expect(t('set_censor_window', { startDate: '2020-01-01', endDate: 'bad' })?.censorWindow).toEqual({
      startDate: '2020-01-01',
      endDate: null,
    })
  })
})

describe('set_era_collapse', () => {
  it('accepts zero and positive gaps', () => {
    expect(t('set_era_collapse', { gapDays: 0 })).toEqual({ kind: 'setEraCollapse', collapseSettings: { collapseType: 'ERA', eraPad: 0 } })
    expect(t('set_era_collapse', { gapDays: 30 })?.collapseSettings.eraPad).toBe(30)
  })

  it('rejects negative or non-numeric gaps', () => {
    expect(t('set_era_collapse', { gapDays: -1 })).toBeNull()
    expect(t('set_era_collapse', { gapDays: '5' })).toBeNull()
  })
})

describe('set_event_limits', () => {
  it('normalises case and accepts FIRST, ALL and LAST', () => {
    expect(t('set_event_limits', { entryEvents: 'first', qualifyingEvents: 'All', inclusionRuleEvents: 'LAST' })).toEqual({
      kind: 'setEventLimits',
      limits: { primaryCriteriaLimit: 'FIRST', qualifyingLimit: 'ALL', inclusionQualifyingLimit: 'LAST' },
    })
  })

  it('drops unknown values and returns null when nothing is valid', () => {
    expect(t('set_event_limits', { entryEvents: 'last', qualifyingEvents: 'sometimes' })?.limits).toEqual({
      primaryCriteriaLimit: 'LAST',
      qualifyingLimit: undefined,
      inclusionQualifyingLimit: undefined,
    })
    expect(t('set_event_limits', { entryEvents: 'never' })).toBeNull()
  })
})

describe('add_demographic_criterion', () => {
  const gender = (id: number, name: string) => ({
    CONCEPT_ID: id,
    CONCEPT_NAME: name,
    STANDARD_CONCEPT: 'S',
    STANDARD_CONCEPT_CAPTION: 'Standard',
    INVALID_REASON: null,
    INVALID_REASON_CAPTION: 'Unknown',
    CONCEPT_CODE: String(id),
    DOMAIN_ID: 'Gender',
    VOCABULARY_ID: 'Gender',
    CONCEPT_CLASS_ID: 'Gender',
    VALID_START_DATE: Date.UTC(1970, 0, 1),
    VALID_END_DATE: Date.UTC(2090, 0, 1),
  })

  it('builds an age range plus male gender rule', () => {
    expect(t('add_demographic_criterion', { minAge: 18, maxAge: 65, sex: 'male' })).toEqual({
      kind: 'addInclusionRule',
      rule: {
        id: expect.any(String),
        name: 'Age 18-65, Male',
        criteriaGroups: [
          {
            id: expect.any(String),
            logicType: 'ALL',
            events: [
              {
                id: expect.any(String),
                criteriaType: 'Demographic',
                attributes: [
                  { type: 'numericRange', attributeKey: 'age', operator: 'BETWEEN', value: 18, extent: 65 },
                  { type: 'concept', attributeKey: 'gender', concepts: [gender(8507, 'MALE')] },
                ],
              },
            ],
          },
        ],
      },
    })
  })

  it('builds a female-only rule', () => {
    const p = t('add_demographic_criterion', { sex: 'female' })
    expect(p?.rule.name).toBe('Female')
    expect(p?.rule.criteriaGroups[0].events[0].attributes).toEqual([
      { type: 'concept', attributeKey: 'gender', concepts: [gender(8532, 'FEMALE')] },
    ])
  })

  it('uses a lower bound when only minAge is given', () => {
    const p = t('add_demographic_criterion', { minAge: 18 })
    expect(p?.rule.name).toBe('Age 18+')
    expect(p?.rule.criteriaGroups[0].events[0].attributes).toEqual([
      { type: 'numericRange', attributeKey: 'age', operator: 'GREATER_THAN_OR_EQUAL', value: 18 },
    ])
  })

  it('uses an upper bound when only maxAge is given and ignores an unknown sex', () => {
    const p = t('add_demographic_criterion', { maxAge: 65, sex: 'other' })
    expect(p?.rule.name).toBe('Age up to 65')
    expect(p?.rule.criteriaGroups[0].events[0].attributes).toEqual([
      { type: 'numericRange', attributeKey: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 65 },
    ])
  })

  it('prefers a trimmed explicit name and rejects empty input', () => {
    expect(t('add_demographic_criterion', { minAge: 1, name: ' Kids ' })?.rule.name).toBe('Kids')
    expect(t('add_demographic_criterion', { sex: 'other' })).toBeNull()
  })
})

describe('use_concept_set', () => {
  it('requires a concept set id', () => {
    expect(t('use_concept_set', { group: 'entry' })).toBeNull()
  })

  it('keeps entry and exclusion groups and defaults anything else to inclusion', () => {
    expect(t('use_concept_set', { conceptSetId: '12', group: 'entry', name: 'CS' })).toEqual({
      kind: 'useConceptSet',
      payload: { conceptSetId: 12, group: 'entry', name: 'CS' },
    })
    expect(t('use_concept_set', { conceptSetId: 1, group: 'exclusion' })?.payload.group).toBe('exclusion')
    expect(t('use_concept_set', { conceptSetId: 1, group: 'weird' })?.payload.group).toBe('inclusion')
    expect(t('use_concept_set', { conceptSetId: 1 })?.payload.group).toBe('inclusion')
  })
})

describe('remove_* capabilities', () => {
  it('remove_inclusion_rule matches by name or id', () => {
    expect(t('remove_inclusion_rule', {})).toBeNull()
    expect(t('remove_inclusion_rule', { id: 0 })).toEqual({ kind: 'removeInclusionRule', match: { name: undefined, id: 0 } })
    expect(t('remove_inclusion_rule', { name: 'R' })).toEqual({ kind: 'removeInclusionRule', match: { name: 'R', id: undefined } })
  })

  it('remove_entry_event matches by concept name or id', () => {
    expect(t('remove_entry_event', {})).toBeNull()
    expect(t('remove_entry_event', { conceptName: 'A' })).toEqual({
      kind: 'removeEntryEvent',
      match: { conceptId: undefined, conceptName: 'A' },
    })
    expect(t('remove_entry_event', { conceptId: 0 })?.match).toEqual({ conceptId: 0, conceptName: undefined })
  })
})

describe('set_observation_window', () => {
  it('requires both prior and post days', () => {
    expect(t('set_observation_window', { priorDays: 1 })).toBeNull()
    expect(t('set_observation_window', { postDays: 1 })).toBeNull()
  })
})

describe('add_exit_criterion', () => {
  it('defaults to end of observation with no optional fields', () => {
    expect(t('add_exit_criterion', {})).toEqual({ kind: 'setCohortExit', exitCriteria: { strategy: 'CONTINUOUS_OBSERVATION' } })
  })

  it('maps fixed_duration and every optional field', () => {
    expect(
      t('add_exit_criterion', {
        strategy: 'fixed_duration',
        offset: 0,
        dateField: 'END_DATE',
        persistenceWindow: 0,
        surveillanceWindow: 0,
        concept: { conceptId: 7, conceptName: 'Seven' },
      })
    ).toEqual({
      kind: 'setCohortExit',
      exitCriteria: {
        strategy: 'FIXED_DURATION',
        offset: 0,
        dateField: 'END_DATE',
        persistenceWindow: 0,
        surveillanceWindow: 0,
        conceptSet: conceptSetFor(7, 'Seven'),
      },
    })
  })

  it('ignores non-numeric windows and a concept without a name', () => {
    expect(
      t('add_exit_criterion', {
        strategy: 'end_of_observation',
        offset: '3',
        persistenceWindow: '3',
        surveillanceWindow: '3',
        concept: { conceptId: 7 },
      })
    ).toEqual({ kind: 'setCohortExit', exitCriteria: { strategy: 'CONTINUOUS_OBSERVATION' } })
  })
})
