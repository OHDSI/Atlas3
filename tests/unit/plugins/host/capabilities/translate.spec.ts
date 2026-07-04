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
    expect(ev.temporalWindow.startWindow).toEqual({ days: 365, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' })
    expect(ev.temporalWindow.endWindow).toEqual({ days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' })
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
    expect(tw.startWindow).toEqual({ days: null, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' })
    expect(tw.endWindow).toEqual({ days: null, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' })
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
