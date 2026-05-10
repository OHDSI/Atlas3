import { describe, it, expect } from 'vitest'
import { proposalFromToolCall } from '../src/shell-bridge'

describe('proposalFromToolCall', () => {
  it('add_criterion (no group) → addEntryEvent', () => {
    const p = proposalFromToolCall('add_criterion', {
      conceptId: 201826,
      conceptName: 'Type 2 diabetes mellitus',
      domain: 'Condition',
      includeDescendants: true,
    })
    expect(p?.kind).toBe('addEntryEvent')
  })

  it('add_criterion group=inclusion → addInclusionRule', () => {
    const p = proposalFromToolCall('add_criterion', {
      conceptId: 1503297,
      conceptName: 'Metformin',
      domain: 'Drug',
      includeDescendants: true,
      group: 'inclusion',
    })
    expect(p?.kind).toBe('addInclusionRule')
  })

  it('add_criterion group=exclusion → addCensoringCriterion', () => {
    const p = proposalFromToolCall('add_criterion', {
      conceptId: 443238,
      conceptName: 'Type 1 diabetes',
      domain: 'Condition',
      includeDescendants: true,
      group: 'exclusion',
    })
    expect(p?.kind).toBe('addCensoringCriterion')
  })

  it('set_observation_window → setObservationPeriod', () => {
    const p = proposalFromToolCall('set_observation_window', { priorDays: 365, postDays: 30 })
    expect(p).toMatchObject({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 30 },
    })
  })

  it('add_exit_criterion strategy mapping', () => {
    const p = proposalFromToolCall('add_exit_criterion', {
      strategy: 'continuous_drug',
      persistenceWindow: 30,
    })
    expect(p?.kind).toBe('setExitCriteria')
    expect((p as { exitCriteria: { strategy: string } }).exitCriteria.strategy).toBe('CONTINUOUS_DRUG')
  })

  it('set_censor_event → addCensoringCriterion', () => {
    const p = proposalFromToolCall('set_censor_event', {
      conceptId: 4099154,
      conceptName: 'Death',
      domain: 'Condition',
      includeDescendants: true,
    })
    expect(p?.kind).toBe('addCensoringCriterion')
  })

  it('create_concept_set → addConceptSet with items', () => {
    const p = proposalFromToolCall('create_concept_set', {
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
    const p = proposalFromToolCall('add_inclusion_rule', {
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
    expect(proposalFromToolCall('not_a_tool', {})).toBeNull()
  })

  it('returns null for create_concept_set with no items', () => {
    expect(proposalFromToolCall('create_concept_set', { name: 'empty' })).toBeNull()
  })

  it('create_feature_analysis → createFeatureAnalysis', () => {
    const p = proposalFromToolCall('create_feature_analysis', {
      name: 'Demographics',
      type: 'PRESET',
      design: 'demographics-age-group',
    })
    expect(p?.kind).toBe('createFeatureAnalysis')
    const payload = (p as { payload: { name: string; type: string; design: unknown } }).payload
    expect(payload.name).toBe('Demographics')
    expect(payload.type).toBe('PRESET')
    expect(payload.design).toBe('demographics-age-group')
    expect((p as { openAfterCreate: boolean }).openAfterCreate).toBe(true)
  })

  it('create_feature_analysis → null when type missing', () => {
    expect(
      proposalFromToolCall('create_feature_analysis', { name: 'No type' })
    ).toBeNull()
  })

  it('create_characterization → createCharacterization with linked entities', () => {
    const p = proposalFromToolCall('create_characterization', {
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
      proposalFromToolCall('create_characterization', {
        name: 'no cohorts',
        cohorts: [],
        featureAnalyses: [{ id: 10, name: 'Demographics' }],
      })
    ).toBeNull()
  })

  it('create_characterization → null when featureAnalyses is empty', () => {
    expect(
      proposalFromToolCall('create_characterization', {
        name: 'no FAs',
        cohorts: [{ id: 1, name: 'T2DM' }],
        featureAnalyses: [],
      })
    ).toBeNull()
  })

  it('create_pathway → createPathway with overrides + filtered cohorts', () => {
    const p = proposalFromToolCall('create_pathway', {
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
    expect(proposalFromToolCall('create_pathway', {})).toBeNull()
  })

  it('create_incidence_rate → createIncidenceRate with timeAtRisk projection', () => {
    const p = proposalFromToolCall('create_incidence_rate', {
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
    expect(proposalFromToolCall('create_incidence_rate', {})).toBeNull()
  })

  it('navigate_to → navigate proposal with projected params', () => {
    const p = proposalFromToolCall('navigate_to', {
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
    expect(
      proposalFromToolCall('navigate_to', { view: 'totally-fake-view' })
    ).toBeNull()
  })
})
