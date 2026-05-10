import { describe, it, expect, beforeEach } from 'vitest'
import {
  activeChecklist,
  applyChecklistToolCall,
  applyCreateChecklist,
  applyUpdateChecklistStep,
  checklistHistory,
  isChecklistTool,
  markStepProgress,
  resetChecklists,
  restoreChecklists,
  snapshotChecklists,
} from '../../../plugins-dev/pythia-plugin/src/checklist-state'

beforeEach(() => {
  resetChecklists()
})

describe('isChecklistTool', () => {
  it('recognises both checklist tool names', () => {
    expect(isChecklistTool('create_checklist')).toBe(true)
    expect(isChecklistTool('update_checklist_step')).toBe(true)
  })
  it('rejects other tool names', () => {
    expect(isChecklistTool('add_criterion')).toBe(false)
    expect(isChecklistTool('')).toBe(false)
  })
})

describe('applyCreateChecklist', () => {
  it('creates an active checklist with all steps pending', () => {
    const result = applyCreateChecklist({
      title: 'Run incidence rate',
      steps: [
        { id: 's1', label: 'Create concept set' },
        { id: 's2', label: 'Create cohort' },
        { id: 's3', label: 'Run analysis' },
      ],
    })
    expect(result).toEqual({ ok: true, checklistId: expect.any(String) })
    expect(activeChecklist.value).not.toBeNull()
    expect(activeChecklist.value!.title).toBe('Run incidence rate')
    expect(activeChecklist.value!.status).toBe('active')
    expect(activeChecklist.value!.steps.map(s => s.status)).toEqual(['pending', 'pending', 'pending'])
  })

  it('rejects empty steps', () => {
    const result = applyCreateChecklist({ title: 't', steps: [] })
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/non-empty/) })
    expect(activeChecklist.value).toBeNull()
  })

  it('archives the previous active checklist as abandoned when replaced', () => {
    applyCreateChecklist({
      title: 'First',
      steps: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    })
    applyCreateChecklist({
      title: 'Second',
      steps: [{ id: 'x', label: 'X' }],
    })
    expect(activeChecklist.value!.title).toBe('Second')
    expect(checklistHistory.value).toHaveLength(1)
    expect(checklistHistory.value[0].title).toBe('First')
    expect(checklistHistory.value[0].status).toBe('abandoned')
  })

  it('archives the previous active checklist as completed when all steps were done', () => {
    applyCreateChecklist({ title: 'First', steps: [{ id: 'a', label: 'A' }] })
    applyUpdateChecklistStep({ stepId: 'a', status: 'done' })
    // The single-step "First" auto-completed and moved to history; create
    // another to ensure the archive path is exercised even when the prior
    // checklist had already been auto-archived.
    expect(checklistHistory.value).toHaveLength(1)
    expect(checklistHistory.value[0].status).toBe('completed')
    expect(activeChecklist.value).toBeNull()

    applyCreateChecklist({ title: 'Mid', steps: [{ id: 'm', label: 'M' }] })
    applyCreateChecklist({ title: 'Latest', steps: [{ id: 'l', label: 'L' }] })
    // The Mid one was active but had no done steps -> abandoned.
    expect(checklistHistory.value).toHaveLength(2)
    expect(checklistHistory.value[1].title).toBe('Mid')
    expect(checklistHistory.value[1].status).toBe('abandoned')
  })

  it('synthesises ids and labels for unnamed steps', () => {
    applyCreateChecklist({
      steps: [{ label: 'First' }, {}, {}],
    })
    const ids = activeChecklist.value!.steps.map(s => s.id)
    expect(new Set(ids).size).toBe(3)
    expect(activeChecklist.value!.title).toBe('Plan')
    expect(activeChecklist.value!.steps[1].label).toMatch(/Step/)
  })
})

describe('applyUpdateChecklistStep', () => {
  beforeEach(() => {
    applyCreateChecklist({
      title: 'Plan',
      steps: [
        { id: 's1', label: 'One' },
        { id: 's2', label: 'Two' },
      ],
    })
  })

  it('transitions a step to in_progress without completing the checklist', () => {
    const result = applyUpdateChecklistStep({ stepId: 's1', status: 'in_progress' })
    expect(result).toEqual({ ok: true })
    expect(activeChecklist.value!.steps[0].status).toBe('in_progress')
    expect(activeChecklist.value!.status).toBe('active')
  })

  it('auto-completes the checklist when the final pending step turns done', () => {
    applyUpdateChecklistStep({ stepId: 's1', status: 'done' })
    expect(activeChecklist.value!.status).toBe('active')
    applyUpdateChecklistStep({ stepId: 's2', status: 'done' })
    expect(activeChecklist.value).toBeNull()
    expect(checklistHistory.value).toHaveLength(1)
    expect(checklistHistory.value[0].status).toBe('completed')
  })

  it('rejects unknown stepId', () => {
    const result = applyUpdateChecklistStep({ stepId: 'nope', status: 'done' })
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/unknown stepId/) })
  })

  it('rejects invalid status', () => {
    const result = applyUpdateChecklistStep({ stepId: 's1', status: 'banana' as never })
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/status must be/) })
  })

  it('rejects when no active checklist', () => {
    resetChecklists()
    const result = applyUpdateChecklistStep({ stepId: 's1', status: 'done' })
    expect(result).toEqual({ ok: false, reason: 'no active checklist' })
  })
})

describe('markStepProgress', () => {
  it('advances the first matching pending step linked to a proposal kind', () => {
    applyCreateChecklist({
      title: 'Plan',
      steps: [
        { id: 's1', label: 'Set up concepts', linkedProposalKind: 'createStandaloneConceptSet' },
        { id: 's2', label: 'Cohort', linkedProposalKind: 'createCohort' },
      ],
    })
    const advanced = markStepProgress('createStandaloneConceptSet', 'done')
    expect(advanced).toBe(true)
    expect(activeChecklist.value!.steps[0].status).toBe('done')
    expect(activeChecklist.value!.steps[1].status).toBe('pending')
  })

  it('returns false when no step matches', () => {
    applyCreateChecklist({
      title: 'Plan',
      steps: [{ id: 's1', label: 'Cohort', linkedProposalKind: 'createCohort' }],
    })
    expect(markStepProgress('createIncidenceRate', 'done')).toBe(false)
    expect(activeChecklist.value!.steps[0].status).toBe('pending')
  })

  it('skips already-done steps and advances the next matching one', () => {
    applyCreateChecklist({
      title: 'Plan',
      steps: [
        { id: 's1', label: 'A', linkedProposalKind: 'createStandaloneConceptSet' },
        { id: 's2', label: 'B', linkedProposalKind: 'createStandaloneConceptSet' },
      ],
    })
    markStepProgress('createStandaloneConceptSet', 'done')
    markStepProgress('createStandaloneConceptSet', 'done')
    expect(activeChecklist.value).toBeNull()
    expect(checklistHistory.value[0].steps.every(s => s.status === 'done')).toBe(true)
  })

  it('returns false when there is no active checklist', () => {
    expect(markStepProgress('createCohort', 'done')).toBe(false)
  })
})

describe('snapshot / restore', () => {
  it('round-trips active and history through snapshot+restore', () => {
    applyCreateChecklist({
      title: 'Plan',
      steps: [{ id: 's1', label: 'A' }, { id: 's2', label: 'B' }],
    })
    applyUpdateChecklistStep({ stepId: 's1', status: 'done' })
    const snap = snapshotChecklists()

    resetChecklists()
    expect(activeChecklist.value).toBeNull()
    expect(checklistHistory.value).toHaveLength(0)

    restoreChecklists(snap)
    expect(activeChecklist.value!.title).toBe('Plan')
    expect(activeChecklist.value!.steps[0].status).toBe('done')
    expect(activeChecklist.value!.steps[1].status).toBe('pending')
  })

  it('restoreChecklists tolerates undefined / partial input', () => {
    restoreChecklists(undefined)
    expect(activeChecklist.value).toBeNull()
    expect(checklistHistory.value).toEqual([])

    restoreChecklists({ active: null })
    expect(checklistHistory.value).toEqual([])
  })
})

describe('applyChecklistToolCall', () => {
  it('dispatches create_checklist', () => {
    const result = applyChecklistToolCall('create_checklist', {
      title: 'X',
      steps: [{ id: 'a', label: 'A' }],
    })
    expect((result as { ok: boolean }).ok).toBe(true)
    expect(activeChecklist.value).not.toBeNull()
  })

  it('dispatches update_checklist_step', () => {
    applyChecklistToolCall('create_checklist', {
      title: 'X',
      steps: [{ id: 'a', label: 'A' }],
    })
    const result = applyChecklistToolCall('update_checklist_step', { stepId: 'a', status: 'in_progress' })
    expect((result as { ok: boolean }).ok).toBe(true)
    expect(activeChecklist.value!.steps[0].status).toBe('in_progress')
  })

  it('returns ok:false for unknown tool name', () => {
    const result = applyChecklistToolCall('mystery', {}) as { ok: boolean; reason: string }
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/unknown checklist tool/)
  })
})
