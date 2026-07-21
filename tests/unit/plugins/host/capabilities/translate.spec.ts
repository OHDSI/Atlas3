import { describe, it, expect } from 'vitest'
import {
  translateCapability,
  isAgentVisibleView,
} from '@/plugins/host/capabilities/translate'

describe('translateCapability', () => {
  it('add_criterion (no group) → addEntryEvent', () => {
    const p = translateCapability('add_criterion', {
      conceptId: 201826,
      conceptName: 'Type 2 diabetes mellitus',
      domain: 'Condition',
      includeDescendants: true,
    })
    expect(p?.kind).toBe('addEntryEvent')
  })

  it('add_criterion group=inclusion → addInclusionRule', () => {
    const p = translateCapability('add_criterion', {
      conceptId: 1503297,
      conceptName: 'Metformin',
      domain: 'Drug',
      includeDescendants: true,
      group: 'inclusion',
    })
    expect(p?.kind).toBe('addInclusionRule')
  })

  it('exclusion criterion becomes an inclusion rule with EXACTLY 0 cardinality', () => {
    const p = translateCapability('add_criterion', {
      conceptId: 1,
      conceptName: 'Pregnancy',
      domain: 'Condition',
      group: 'exclusion',
      includeDescendants: true,
    })
    expect(p?.kind).toBe('addInclusionRule')
    const ev = (p as any).rule.criteriaGroups[0].events[0]
    expect(ev.cardinality).toEqual({ type: 'EXACTLY', count: 0, countingMethod: 'ALL' })
  })

  it('set_observation_window maps prior/post days', () => {
    const p = translateCapability('set_observation_window', { priorDays: 365, postDays: 0 })
    expect(p).toEqual({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 0 },
    })
  })

  it('set_observation_window → setObservationPeriod (non-zero post)', () => {
    const p = translateCapability('set_observation_window', { priorDays: 365, postDays: 30 })
    expect(p).toMatchObject({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 30 },
    })
  })

  it('unknown args return null', () => {
    expect(translateCapability('set_entry_event', {})).toBeNull()
  })

  it('add_exit_criterion strategy mapping', () => {
    const p = translateCapability('add_exit_criterion', {
      strategy: 'continuous_drug',
      persistenceWindow: 30,
    })
    expect(p?.kind).toBe('setExitCriteria')
    expect((p as { exitCriteria: { strategy: string } }).exitCriteria.strategy).toBe('CONTINUOUS_DRUG')
  })

  it('set_censor_event → addCensoringCriterion', () => {
    const p = translateCapability('set_censor_event', {
      conceptId: 4099154,
      conceptName: 'Death',
      domain: 'Condition',
      includeDescendants: true,
    })
    expect(p?.kind).toBe('addCensoringCriterion')
  })

  it('create_concept_set → addConceptSet with items', () => {
    const p = translateCapability('create_concept_set', {
      name: 'NSAIDs',
      items: [
        { conceptId: 1, conceptName: 'Ibuprofen', domain: 'Drug' },
        { conceptId: 2, conceptName: 'Naproxen', domain: 'Drug' },
      ],
    })
    expect(p?.kind).toBe('addConceptSet')
    expect((p as { conceptSet: { items: unknown[] } }).conceptSet.items).toHaveLength(2)
  })

  it('add_inclusion_rule → addInclusionRule with logicType', () => {
    const p = translateCapability('add_inclusion_rule', {
      name: 'At least 2 visits',
      logicType: 'AT_LEAST',
      count: 2,
      events: [
        { conceptId: 9201, conceptName: 'Inpatient', domain: 'Visit', includeDescendants: true },
      ],
    })
    expect(p?.kind).toBe('addInclusionRule')
    const rule = (p as { rule: { criteriaGroups: { logicType: string; count?: number }[] } }).rule
    expect(rule.criteriaGroups[0].logicType).toBe('AT_LEAST')
    expect(rule.criteriaGroups[0].count).toBe(2)
  })

  it('returns null for unknown tool name', () => {
    expect(translateCapability('not_a_tool', {})).toBeNull()
  })

  it('returns null for create_concept_set with no items', () => {
    expect(translateCapability('create_concept_set', { name: 'empty' })).toBeNull()
  })

  it('create_feature_analysis → createFeatureAnalysis', () => {
    const p = translateCapability('create_feature_analysis', {
      name: 'Demographics',
      type: 'PRESET',
      design: 'demographics-age-group',
    })
    expect(p?.kind).toBe('createFeatureAnalysis')
    const payload = (p as { payload: { name: string; type: string; design: unknown } }).payload
    expect(payload.name).toBe('Demographics')
    expect(payload.type).toBe('PRESET')
    expect(payload.design).toBe('demographics-age-group')
  })

  it('create_feature_analysis → null when type missing', () => {
    expect(translateCapability('create_feature_analysis', { name: 'No type' })).toBeNull()
  })

  it('create_characterization → createCharacterization with linked entities', () => {
    const p = translateCapability('create_characterization', {
      name: 'T2DM baseline',
      cohorts: [{ id: 1, name: 'T2DM patients' }],
      featureAnalyses: [{ id: 10, name: 'Demographics' }],
    })
    expect(p?.kind).toBe('createCharacterization')
    const payload = (p as {
      payload: {
        cohorts: { id: number; name: string }[]
        featureAnalyses: { id: number }[]
      }
    }).payload
    expect(payload.cohorts).toEqual([{ id: 1, name: 'T2DM patients' }])
    expect(payload.featureAnalyses[0].id).toBe(10)
  })

  it('create_characterization → null when cohorts is empty', () => {
    expect(
      translateCapability('create_characterization', {
        name: 'no cohorts',
        cohorts: [],
        featureAnalyses: [{ id: 10, name: 'Demographics' }],
      })
    ).toBeNull()
  })

  it('create_characterization → null when featureAnalyses is empty', () => {
    expect(
      translateCapability('create_characterization', {
        name: 'no FAs',
        cohorts: [{ id: 1, name: 'T2DM' }],
        featureAnalyses: [],
      })
    ).toBeNull()
  })

  it('create_pathway → createPathway with overrides + filtered cohorts', () => {
    const p = translateCapability('create_pathway', {
      name: 'Antidiabetic sequencing',
      combinationWindow: 60,
      maxDepth: 4,
      targetCohorts: [{ id: 5, name: 'T2DM' }],
      eventCohorts: [{ id: 6, name: 'Metformin' }],
    })
    expect(p?.kind).toBe('createPathway')
    const payload = (p as {
      payload: {
        combinationWindow: number
        maxDepth: number
        targetCohorts: unknown[]
      }
    }).payload
    expect(payload.combinationWindow).toBe(60)
    expect(payload.maxDepth).toBe(4)
    expect(payload.targetCohorts).toHaveLength(1)
  })

  it('create_pathway → null when name missing', () => {
    expect(translateCapability('create_pathway', {})).toBeNull()
  })

  it('create_incidence_rate → createIncidenceRate with timeAtRisk projection', () => {
    const p = translateCapability('create_incidence_rate', {
      name: 'GI bleed on NSAIDs',
      targetIds: [42],
      outcomeIds: [99],
      timeAtRisk: {
        start: { DateField: 'StartDate', Offset: 0 },
        end: { DateField: 'StartDate', Offset: 365 },
      },
    })
    expect(p?.kind).toBe('createIncidenceRate')
    const payload = (p as {
      payload: {
        targetIds: number[]
        outcomeIds: number[]
        timeAtRisk: { start: { DateField: string; Offset: number }; end: { Offset: number } }
      }
    }).payload
    expect(payload.targetIds).toEqual([42])
    expect(payload.outcomeIds).toEqual([99])
    expect(payload.timeAtRisk.start).toEqual({ DateField: 'StartDate', Offset: 0 })
    expect(payload.timeAtRisk.end.Offset).toBe(365)
  })

  it('create_incidence_rate → null when name missing', () => {
    expect(translateCapability('create_incidence_rate', {})).toBeNull()
  })

  it('navigate_to → navigate proposal with projected params', () => {
    const p = translateCapability('navigate_to', {
      view: 'cohort-edit',
      id: 42,
      reason: 'Open the matching cohort',
    })
    expect(p?.kind).toBe('navigate')
    const route = (p as { route: { name: string; params: Record<string, unknown> } }).route
    expect(route.name).toBe('cohort-edit')
    expect(route.params.id).toBe(42)
  })

  it('navigate_to → null for unknown view', () => {
    expect(translateCapability('navigate_to', { view: 'totally-fake-view' })).toBeNull()
  })

  it('add_criterion exclusion produces an inclusion rule with EXACTLY 0, not censoring', () => {
    const p: any = translateCapability('add_criterion', {
      conceptId: 443238,
      conceptName: 'Type 1 diabetes mellitus',
      domain: 'Condition',
      group: 'exclusion',
      includeDescendants: true,
    })
    expect(p.kind).toBe('addInclusionRule')
    const ev = p.rule.criteriaGroups[0].events[0]
    expect(ev.cardinality).toEqual({ type: 'EXACTLY', count: 0, countingMethod: 'ALL' })
  })

  it('maps temporalWindow to event startWindow/endWindow', () => {
    const p: any = translateCapability('add_inclusion_rule', {
      name: 'Metformin within 365d before index',
      logicType: 'AT_LEAST',
      count: 1,
      temporalWindow: { startDays: -365, endDays: 0 },
      events: [{ conceptId: 1503297, conceptName: 'Metformin', domain: 'Drug', includeDescendants: true }],
    })
    const ev = p.rule.criteriaGroups[0].events[0]
    expect(ev.temporalWindow.startWindow).toEqual({ days: 365, beforeAfter: 'BEFORE', useIndexEnd: false, useEventEnd: false })
    expect(ev.temporalWindow.endWindow).toEqual({ days: 0, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: false })
  })

  it('add_inclusion_rule with logicType AT_MOST count 0 emits EXACTLY 0 on the event', () => {
    const p: any = translateCapability('add_inclusion_rule', {
      name: 'Exclude T1DM',
      logicType: 'AT_MOST',
      count: 0,
      events: [{ conceptId: 443238, conceptName: 'Type 1 diabetes mellitus', domain: 'Condition', includeDescendants: true }],
    })
    expect(p.kind).toBe('addInclusionRule')
    const g = p.rule.criteriaGroups[0]
    expect(g.logicType).toBe('ALL')
    expect(g.count).toBeUndefined()
    expect(g.events[0].cardinality).toEqual({ type: 'EXACTLY', count: 0, countingMethod: 'ALL' })
  })

  it('maps null temporalWindow bounds to all-time (days null)', () => {
    const p: any = translateCapability('add_inclusion_rule', {
      name: 'any time prior',
      logicType: 'AT_LEAST',
      count: 1,
      temporalWindow: { startDays: null, endDays: null },
      events: [{ conceptId: 1, conceptName: 'X', domain: 'Condition', includeDescendants: true }],
    })
    const tw = p.rule.criteriaGroups[0].events[0].temporalWindow
    expect(tw.startWindow).toEqual({ days: null, beforeAfter: 'BEFORE', useIndexEnd: false, useEventEnd: false })
    expect(tw.endWindow).toEqual({ days: null, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: false })
  })

  it('omits temporalWindow on events when none is given', () => {
    const p: any = translateCapability('add_inclusion_rule', {
      name: 'no window',
      logicType: 'AT_LEAST',
      count: 1,
      events: [{ conceptId: 1, conceptName: 'X', domain: 'Condition', includeDescendants: true }],
    })
    expect(p.rule.criteriaGroups[0].events[0].temporalWindow).toBeUndefined()
  })

  it('maps save_cohort to a saveCohort proposal', () => {
    expect(translateCapability('save_cohort', {})).toEqual({ kind: 'saveCohort' })
  })
})

describe('navigate_to via manifest', () => {
  it('rejects views not in the manifest', () => {
    const p = translateCapability('navigate_to', { view: 'nonexistent-route', reason: 'x' })
    expect(p).toBeNull()
  })

  it('accepts a manifest route', () => {
    expect(isAgentVisibleView('characterization-results')).toBe(true)
    const p = translateCapability('navigate_to', {
      view: 'characterization-results',
      id: 17,
      executionId: 99,
      reason: 'See the run',
    })
    expect(p?.kind).toBe('navigate')
    const route = (p as { route: { name: string; params: Record<string, unknown> } }).route
    expect(route.name).toBe('characterization-results')
    expect(route.params).toEqual({ id: 17, executionId: 99 })
  })

  it('drops params not declared for the view', () => {
    const p = translateCapability('navigate_to', {
      view: 'home',
      id: 5,
      reason: 'go home',
    })
    const route = (p as { route: { params: Record<string, unknown> } }).route
    expect(route.params).toEqual({})
  })
})

type AnyPayload = { payload: Record<string, unknown> }
type AnyConceptSet = { conceptSet: Record<string, unknown> }
type AnyRule = { rule: { name: string } }

describe('translateCapability — add_criteria derived names', () => {
  const item = (conceptId: number, conceptName: string) => ({
    conceptId,
    conceptName,
    domain: 'Condition',
    includeDescendants: true,
  })

  it('derives "Require: <name>" for a single unnamed inclusion group', () => {
    const p = translateCapability('add_criteria', {
      items: [item(1, 'Diabetes')],
      group: 'inclusion',
    })
    expect((p as unknown as AnyRule).rule.name).toBe('Require: Diabetes')
  })

  it('joins two names with " or " under OR logic', () => {
    const p = translateCapability('add_criteria', {
      items: [item(1, 'Diabetes'), item(2, 'Hypertension')],
      logic: 'OR',
    })
    expect((p as unknown as AnyRule).rule.name).toBe('Require: Diabetes or Hypertension')
  })

  it('summarises 3+ names and labels exclusion groups', () => {
    const p = translateCapability('add_criteria', {
      items: [item(1, 'A'), item(2, 'B'), item(3, 'C')],
      group: 'exclusion',
    })
    expect((p as unknown as AnyRule).rule.name).toBe('Exclude: A and B (+1 more)')
  })

  it('prefers an explicit name over the derived one', () => {
    const p = translateCapability('add_criteria', {
      items: [item(1, 'A')],
      name: 'Custom rule',
    })
    expect((p as unknown as AnyRule).rule.name).toBe('Custom rule')
  })
})

describe('translateCapability — update proposals', () => {
  it('update_concept_set builds a payload with items and itemsToAdd', () => {
    const p = translateCapability('update_concept_set', {
      id: 42,
      name: 'Updated set',
      items: [{ conceptId: 201826, conceptName: 'T2DM', domain: 'Condition' }],
      itemsToAdd: [
        { conceptId: 1503297, conceptName: 'Metformin', domain: 'Drug' },
        { conceptId: 0, badName: true }, // filtered out by asConceptRefList
      ],
    })
    expect(p?.kind).toBe('updateConceptSet')
    const payload = (p as unknown as AnyPayload).payload
    expect(payload.id).toBe(42)
    expect(payload.items).toHaveLength(1)
    expect((payload.itemsToAdd as unknown[]).length).toBe(1)
  })

  it('update_concept_set returns null without a numeric id', () => {
    expect(translateCapability('update_concept_set', { name: 'x' })).toBeNull()
  })

  it('update_feature_analysis builds a payload', () => {
    const p = translateCapability('update_feature_analysis', {
      id: 7,
      name: 'FA',
      type: 'PRESET',
      domain: 'Condition',
      statType: 'PREVALENCE',
    })
    expect(p?.kind).toBe('updateFeatureAnalysis')
    expect((p as unknown as AnyPayload).payload.id).toBe(7)
    expect(translateCapability('update_feature_analysis', {})).toBeNull()
  })

  it('update_characterization maps cohort and feature-analysis refs', () => {
    const p = translateCapability('update_characterization', {
      id: 3,
      cohorts: [{ id: 1, name: 'C1' }],
      cohortsToAdd: [{ id: 2, name: 'C2' }],
      featureAnalyses: [{ id: 9, name: 'FA1' }],
      featureAnalysesToAdd: [{ id: 10, name: 'FA2' }],
    })
    expect(p?.kind).toBe('updateCharacterization')
    const payload = (p as unknown as AnyPayload).payload
    expect(payload.cohorts).toEqual([{ id: 1, name: 'C1' }])
    expect(payload.featureAnalysesToAdd).toEqual([{ id: 10, name: 'FA2' }])
    expect(translateCapability('update_characterization', {})).toBeNull()
  })

  it('update_pathway carries cohort refs and scalar settings', () => {
    const p = translateCapability('update_pathway', {
      id: 4,
      targetCohorts: [{ id: 1, name: 'T' }],
      eventCohorts: [{ id: 2, name: 'E' }],
      combinationWindow: 30,
      minCellCount: 5,
      maxDepth: 3,
      allowRepeats: true,
    })
    expect(p?.kind).toBe('updatePathway')
    const payload = (p as unknown as AnyPayload).payload
    expect(payload.combinationWindow).toBe(30)
    expect(payload.allowRepeats).toBe(true)
    expect(translateCapability('update_pathway', {})).toBeNull()
  })

  it('update_incidence_rate filters number lists and maps time-at-risk', () => {
    const p = translateCapability('update_incidence_rate', {
      id: 8,
      targetIds: [1, 2, 'bad'],
      outcomeIds: [3],
      targetIdsToAdd: [{ id: 9, name: 'T9' }],
      timeAtRisk: {
        start: { DateField: 'StartDate', Offset: 0 },
        end: { DateField: 'EndDate', Offset: 1 },
      },
      studyWindow: { startDate: '2020-01-01', endDate: '2020-12-31' },
    })
    expect(p?.kind).toBe('updateIncidenceRate')
    const payload = (p as unknown as AnyPayload).payload
    expect(payload.targetIds).toEqual([1, 2])
    expect(payload.studyWindow).toEqual({ startDate: '2020-01-01', endDate: '2020-12-31' })
    expect(translateCapability('update_incidence_rate', {})).toBeNull()
  })

  it('update_incidence_rate passes through an explicit null study window', () => {
    const p = translateCapability('update_incidence_rate', { id: 8, studyWindow: null })
    expect((p as unknown as AnyPayload).payload.studyWindow).toBeNull()
  })
})

describe('translateCapability — create_standalone_concept_set', () => {
  it('builds a standalone concept set proposal', () => {
    const p = translateCapability('create_standalone_concept_set', {
      name: 'My set',
      description: 'desc',
      items: [{ conceptId: 201826, conceptName: 'T2DM', domain: 'Condition' }],
    })
    expect(p?.kind).toBe('createStandaloneConceptSet')
    expect((p as unknown as AnyConceptSet).conceptSet.name).toBe('My set')
  })

  it('returns null without a name or items', () => {
    expect(
      translateCapability('create_standalone_concept_set', { items: [] })
    ).toBeNull()
    expect(
      translateCapability('create_standalone_concept_set', { name: 'x' })
    ).toBeNull()
  })
})
