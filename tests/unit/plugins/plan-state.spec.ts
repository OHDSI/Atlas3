import { describe, it, expect, beforeEach } from 'vitest'
import {
  activePlan,
  applyPlanToolCall,
  applyCreatePlan,
  applyUpdatePlanStep,
  planHistory,
  isPlanTool,
  markStepProgress,
  resetPlans,
  restorePlans,
  snapshotPlans,
} from '../../../plugins-dev/pythia-plugin/src/plan-state'

beforeEach(() => {
  resetPlans()
})

describe('isPlanTool', () => {
  it('recognises both plan tool names', () => {
    expect(isPlanTool('create_plan')).toBe(true)
    expect(isPlanTool('update_plan_step')).toBe(true)
  })
  it('rejects other tool names', () => {
    expect(isPlanTool('add_criterion')).toBe(false)
    expect(isPlanTool('')).toBe(false)
    expect(isPlanTool('create_checklist')).toBe(false) // legacy name removed
  })
})

describe('applyCreatePlan', () => {
  it('creates an active plan with all steps pending', () => {
    const result = applyCreatePlan({
      title: 'Run incidence rate',
      steps: [
        { id: 's1', label: 'Create concept set' },
        { id: 's2', label: 'Create cohort' },
        { id: 's3', label: 'Run analysis' },
      ],
    })
    expect(result).toEqual({ ok: true, planId: expect.any(String) })
    expect(activePlan.value).not.toBeNull()
    expect(activePlan.value!.title).toBe('Run incidence rate')
    expect(activePlan.value!.status).toBe('active')
    expect(activePlan.value!.steps.map(s => s.status)).toEqual(['pending', 'pending', 'pending'])
  })

  it('rejects empty steps', () => {
    const result = applyCreatePlan({ title: 't', steps: [] })
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/non-empty/) })
    expect(activePlan.value).toBeNull()
  })

  it('archives the previous active plan as abandoned when replaced', () => {
    applyCreatePlan({
      title: 'First',
      steps: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    })
    applyCreatePlan({
      title: 'Second',
      steps: [{ id: 'x', label: 'X' }],
    })
    expect(activePlan.value!.title).toBe('Second')
    expect(planHistory.value).toHaveLength(1)
    expect(planHistory.value[0].title).toBe('First')
    expect(planHistory.value[0].status).toBe('abandoned')
  })

  it('archives the previous active plan as completed when all steps were done', () => {
    applyCreatePlan({ title: 'First', steps: [{ id: 'a', label: 'A' }] })
    applyUpdatePlanStep({ stepId: 'a', status: 'done' })
    expect(planHistory.value).toHaveLength(1)
    expect(planHistory.value[0].status).toBe('completed')
    expect(activePlan.value).toBeNull()

    applyCreatePlan({ title: 'Mid', steps: [{ id: 'm', label: 'M' }] })
    applyCreatePlan({ title: 'Latest', steps: [{ id: 'l', label: 'L' }] })
    expect(planHistory.value).toHaveLength(2)
    expect(planHistory.value[1].title).toBe('Mid')
    expect(planHistory.value[1].status).toBe('abandoned')
  })

  it('synthesises ids and labels for unnamed steps', () => {
    applyCreatePlan({
      steps: [{ label: 'First' }, {}, {}],
    })
    const ids = activePlan.value!.steps.map(s => s.id)
    expect(new Set(ids).size).toBe(3)
    expect(activePlan.value!.title).toBe('Plan')
    expect(activePlan.value!.steps[1].label).toMatch(/Step/)
  })

  it('stores the optional document narrative when provided', () => {
    applyCreatePlan({
      title: 'T2DM treatment patterns',
      document: '## Goal\n\nDescribe statin initiation patterns in T2DM patients.\n\n## Approach\n\nBuild target cohort, define event cohorts, run pathway.',
      steps: [{ id: 's1', label: 'Build cohort' }],
    })
    expect(activePlan.value!.document).toContain('Goal')
    expect(activePlan.value!.document).toContain('Approach')
  })

  it('omits the document field when not provided or blank', () => {
    applyCreatePlan({
      title: 'Simple',
      steps: [{ id: 's1', label: 'Step' }],
    })
    expect(activePlan.value!.document).toBeUndefined()

    resetPlans()
    applyCreatePlan({
      title: 'Blank doc',
      document: '   ',
      steps: [{ id: 's1', label: 'Step' }],
    })
    expect(activePlan.value!.document).toBeUndefined()
  })
})

describe('applyUpdatePlanStep', () => {
  beforeEach(() => {
    applyCreatePlan({
      title: 'Plan',
      steps: [
        { id: 's1', label: 'One' },
        { id: 's2', label: 'Two' },
      ],
    })
  })

  it('transitions a step to in_progress without completing the plan', () => {
    const result = applyUpdatePlanStep({ stepId: 's1', status: 'in_progress' })
    expect(result).toEqual({ ok: true })
    expect(activePlan.value!.steps[0].status).toBe('in_progress')
    expect(activePlan.value!.status).toBe('active')
  })

  it('auto-completes the plan when the final pending step turns done', () => {
    applyUpdatePlanStep({ stepId: 's1', status: 'done' })
    expect(activePlan.value!.status).toBe('active')
    applyUpdatePlanStep({ stepId: 's2', status: 'done' })
    expect(activePlan.value).toBeNull()
    expect(planHistory.value).toHaveLength(1)
    expect(planHistory.value[0].status).toBe('completed')
  })

  it('rejects unknown stepId', () => {
    const result = applyUpdatePlanStep({ stepId: 'nope', status: 'done' })
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/unknown stepId/) })
  })

  it('rejects invalid status', () => {
    const result = applyUpdatePlanStep({ stepId: 's1', status: 'banana' as never })
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/status must be/) })
  })

  it('rejects when no active plan', () => {
    resetPlans()
    const result = applyUpdatePlanStep({ stepId: 's1', status: 'done' })
    expect(result).toEqual({ ok: false, reason: 'no active plan' })
  })
})

describe('markStepProgress', () => {
  it('advances the first matching pending step linked to a proposal kind', () => {
    applyCreatePlan({
      title: 'Plan',
      steps: [
        { id: 's1', label: 'Set up concepts', linkedProposalKind: 'createStandaloneConceptSet' },
        { id: 's2', label: 'Cohort', linkedProposalKind: 'createCohort' },
      ],
    })
    const advanced = markStepProgress('createStandaloneConceptSet', 'done')
    expect(advanced).toBe(true)
    expect(activePlan.value!.steps[0].status).toBe('done')
    expect(activePlan.value!.steps[1].status).toBe('pending')
  })

  it('returns false when no step matches', () => {
    applyCreatePlan({
      title: 'Plan',
      steps: [{ id: 's1', label: 'Cohort', linkedProposalKind: 'createCohort' }],
    })
    expect(markStepProgress('createIncidenceRate', 'done')).toBe(false)
    expect(activePlan.value!.steps[0].status).toBe('pending')
  })

  it('skips already-done steps and advances the next matching one', () => {
    applyCreatePlan({
      title: 'Plan',
      steps: [
        { id: 's1', label: 'A', linkedProposalKind: 'createStandaloneConceptSet' },
        { id: 's2', label: 'B', linkedProposalKind: 'createStandaloneConceptSet' },
      ],
    })
    markStepProgress('createStandaloneConceptSet', 'done')
    markStepProgress('createStandaloneConceptSet', 'done')
    expect(activePlan.value).toBeNull()
    expect(planHistory.value[0].steps.every(s => s.status === 'done')).toBe(true)
  })

  it('returns false when there is no active plan', () => {
    expect(markStepProgress('createCohort', 'done')).toBe(false)
  })
})

describe('snapshot / restore', () => {
  it('round-trips active and history including the document through snapshot+restore', () => {
    applyCreatePlan({
      title: 'Plan',
      document: 'High-level narrative here.',
      steps: [{ id: 's1', label: 'A' }, { id: 's2', label: 'B' }],
    })
    applyUpdatePlanStep({ stepId: 's1', status: 'done' })
    const snap = snapshotPlans()

    resetPlans()
    expect(activePlan.value).toBeNull()
    expect(planHistory.value).toHaveLength(0)

    restorePlans(snap)
    expect(activePlan.value!.title).toBe('Plan')
    expect(activePlan.value!.document).toBe('High-level narrative here.')
    expect(activePlan.value!.steps[0].status).toBe('done')
    expect(activePlan.value!.steps[1].status).toBe('pending')
  })

  it('restorePlans tolerates undefined / partial input', () => {
    restorePlans(undefined)
    expect(activePlan.value).toBeNull()
    expect(planHistory.value).toEqual([])

    restorePlans({ active: null })
    expect(planHistory.value).toEqual([])
  })
})

describe('applyPlanToolCall', () => {
  it('dispatches create_plan', () => {
    const result = applyPlanToolCall('create_plan', {
      title: 'X',
      steps: [{ id: 'a', label: 'A' }],
    })
    expect((result as { ok: boolean }).ok).toBe(true)
    expect(activePlan.value).not.toBeNull()
  })

  it('dispatches update_plan_step', () => {
    applyPlanToolCall('create_plan', {
      title: 'X',
      steps: [{ id: 'a', label: 'A' }],
    })
    const result = applyPlanToolCall('update_plan_step', { stepId: 'a', status: 'in_progress' })
    expect((result as { ok: boolean }).ok).toBe(true)
    expect(activePlan.value!.steps[0].status).toBe('in_progress')
  })

  it('returns ok:false for unknown tool name', () => {
    const result = applyPlanToolCall('mystery', {}) as { ok: boolean; reason: string }
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/unknown plan tool/)
  })
})
