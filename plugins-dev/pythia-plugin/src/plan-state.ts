import { ref } from 'vue'
import type { Plan, PlanStep, PlanStepStatus } from './types'

export const activePlan = ref<Plan | null>(null)
export const planHistory = ref<Plan[]>([])

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isAllDone(steps: PlanStep[]): boolean {
  return steps.length > 0 && steps.every(s => s.status === 'done')
}

function archiveActive(): void {
  const cur = activePlan.value
  if (!cur) return
  const next: Plan = {
    ...cur,
    status: isAllDone(cur.steps) ? 'completed' : 'abandoned',
    updatedAt: Date.now(),
  }
  planHistory.value = [...planHistory.value, next]
  activePlan.value = null
}

export interface CreatePlanInput {
  title?: string
  document?: string
  steps?: Array<{
    id?: string
    label?: string
    description?: string
    linkedProposalKind?: string
    linkedRoute?: string
  }>
}

export function applyCreatePlan(
  input: CreatePlanInput
): { ok: true; planId: string } | { ok: false; reason: string } {
  const title = (input.title ?? '').trim() || 'Plan'
  const rawSteps = Array.isArray(input.steps) ? input.steps : []
  if (rawSteps.length === 0) return { ok: false, reason: 'steps must be a non-empty array' }

  const usedIds = new Set<string>()
  const steps: PlanStep[] = rawSteps.map((s, idx) => {
    let id = (s.id ?? '').trim() || `step-${idx + 1}`
    while (usedIds.has(id)) id = `${id}-${idx + 1}`
    usedIds.add(id)
    return {
      id,
      label: (s.label ?? '').trim() || `Step ${idx + 1}`,
      description: s.description?.trim() || undefined,
      status: 'pending',
      linkedProposalKind: s.linkedProposalKind?.trim() || undefined,
      linkedRoute: s.linkedRoute?.trim() || undefined,
    }
  })

  archiveActive()

  const document = typeof input.document === 'string' && input.document.trim()
    ? input.document.trim()
    : undefined

  const now = Date.now()
  const plan: Plan = {
    id: newId(),
    title,
    document,
    steps,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
  activePlan.value = plan
  return { ok: true, planId: plan.id }
}

export interface UpdateStepInput {
  stepId?: string
  status?: PlanStepStatus
}

const VALID_STATUSES: PlanStepStatus[] = ['pending', 'in_progress', 'done', 'blocked']

export function applyUpdatePlanStep(
  input: UpdateStepInput
): { ok: true } | { ok: false; reason: string } {
  const cur = activePlan.value
  if (!cur) return { ok: false, reason: 'no active plan' }
  const stepId = (input.stepId ?? '').trim()
  if (!stepId) return { ok: false, reason: 'stepId is required' }
  if (!input.status || !VALID_STATUSES.includes(input.status)) {
    return { ok: false, reason: `status must be one of ${VALID_STATUSES.join(', ')}` }
  }
  const idx = cur.steps.findIndex(s => s.id === stepId)
  if (idx === -1) return { ok: false, reason: `unknown stepId: ${stepId}` }

  const nextSteps = cur.steps.map((s, i) => (i === idx ? { ...s, status: input.status! } : s))
  const next: Plan = {
    ...cur,
    steps: nextSteps,
    updatedAt: Date.now(),
  }
  if (isAllDone(nextSteps)) {
    activePlan.value = null
    planHistory.value = [...planHistory.value, { ...next, status: 'completed' }]
  } else {
    activePlan.value = next
  }
  return { ok: true }
}

// Auto-progress: when a proposal of `proposalKind` is accepted and applied,
// find the first non-done step linked to that kind and move it to `status`.
// Returns true if a step was advanced.
export function markStepProgress(proposalKind: string, status: 'in_progress' | 'done'): boolean {
  const cur = activePlan.value
  if (!cur) return false
  const idx = cur.steps.findIndex(s => s.linkedProposalKind === proposalKind && s.status !== 'done')
  if (idx === -1) return false
  applyUpdatePlanStep({ stepId: cur.steps[idx].id, status })
  return true
}

// Snapshot helpers used by chat-session for persistence.
export function snapshotPlans(): { active: Plan | null; history: Plan[] } {
  return {
    active: activePlan.value ? JSON.parse(JSON.stringify(activePlan.value)) : null,
    history: JSON.parse(JSON.stringify(planHistory.value)),
  }
}

export function restorePlans(
  snapshot: { active?: Plan | null; history?: Plan[] } | undefined
): void {
  activePlan.value = snapshot?.active ?? null
  planHistory.value = Array.isArray(snapshot?.history) ? snapshot!.history! : []
}

export function resetPlans(): void {
  activePlan.value = null
  planHistory.value = []
}

export const PLAN_TOOL_NAMES = {
  create: 'create_plan',
  update: 'update_plan_step',
} as const

export function isPlanTool(toolName: string): boolean {
  return toolName === PLAN_TOOL_NAMES.create || toolName === PLAN_TOOL_NAMES.update
}

export function applyPlanToolCall(toolName: string, input: unknown): unknown {
  if (toolName === PLAN_TOOL_NAMES.create) {
    return applyCreatePlan((input ?? {}) as CreatePlanInput)
  }
  if (toolName === PLAN_TOOL_NAMES.update) {
    return applyUpdatePlanStep((input ?? {}) as UpdateStepInput)
  }
  return { ok: false, reason: `unknown plan tool: ${toolName}` }
}
