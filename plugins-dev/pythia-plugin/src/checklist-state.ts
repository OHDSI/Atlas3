import { ref } from 'vue'
import type { Checklist, ChecklistStep, ChecklistStepStatus } from './types'

export const activeChecklist = ref<Checklist | null>(null)
export const checklistHistory = ref<Checklist[]>([])

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isAllDone(steps: ChecklistStep[]): boolean {
  return steps.length > 0 && steps.every(s => s.status === 'done')
}

function archiveActive(): void {
  const cur = activeChecklist.value
  if (!cur) return
  const next: Checklist = {
    ...cur,
    status: isAllDone(cur.steps) ? 'completed' : 'abandoned',
    updatedAt: Date.now(),
  }
  checklistHistory.value = [...checklistHistory.value, next]
  activeChecklist.value = null
}

export interface CreateChecklistInput {
  title?: string
  steps?: Array<{
    id?: string
    label?: string
    description?: string
    linkedProposalKind?: string
    linkedRoute?: string
  }>
}

export function applyCreateChecklist(input: CreateChecklistInput): { ok: true; checklistId: string } | { ok: false; reason: string } {
  const title = (input.title ?? '').trim() || 'Plan'
  const rawSteps = Array.isArray(input.steps) ? input.steps : []
  if (rawSteps.length === 0) return { ok: false, reason: 'steps must be a non-empty array' }

  const usedIds = new Set<string>()
  const steps: ChecklistStep[] = rawSteps.map((s, idx) => {
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

  const now = Date.now()
  const checklist: Checklist = {
    id: newId(),
    title,
    steps,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
  activeChecklist.value = checklist
  return { ok: true, checklistId: checklist.id }
}

export interface UpdateStepInput {
  stepId?: string
  status?: ChecklistStepStatus
}

const VALID_STATUSES: ChecklistStepStatus[] = ['pending', 'in_progress', 'done', 'blocked']

export function applyUpdateChecklistStep(input: UpdateStepInput): { ok: true } | { ok: false; reason: string } {
  const cur = activeChecklist.value
  if (!cur) return { ok: false, reason: 'no active checklist' }
  const stepId = (input.stepId ?? '').trim()
  if (!stepId) return { ok: false, reason: 'stepId is required' }
  if (!input.status || !VALID_STATUSES.includes(input.status)) {
    return { ok: false, reason: `status must be one of ${VALID_STATUSES.join(', ')}` }
  }
  const idx = cur.steps.findIndex(s => s.id === stepId)
  if (idx === -1) return { ok: false, reason: `unknown stepId: ${stepId}` }

  const nextSteps = cur.steps.map((s, i) => (i === idx ? { ...s, status: input.status! } : s))
  const next: Checklist = {
    ...cur,
    steps: nextSteps,
    updatedAt: Date.now(),
  }
  if (isAllDone(nextSteps)) {
    activeChecklist.value = null
    checklistHistory.value = [...checklistHistory.value, { ...next, status: 'completed' }]
  } else {
    activeChecklist.value = next
  }
  return { ok: true }
}

// Auto-progress: when a proposal of `proposalKind` is accepted and applied,
// find the first non-done step linked to that kind and move it to `status`.
// Returns true if a step was advanced.
export function markStepProgress(proposalKind: string, status: 'in_progress' | 'done'): boolean {
  const cur = activeChecklist.value
  if (!cur) return false
  const idx = cur.steps.findIndex(s => s.linkedProposalKind === proposalKind && s.status !== 'done')
  if (idx === -1) return false
  applyUpdateChecklistStep({ stepId: cur.steps[idx].id, status })
  return true
}

// Snapshot helpers used by chat-session for persistence.
export function snapshotChecklists(): { active: Checklist | null; history: Checklist[] } {
  return {
    active: activeChecklist.value ? JSON.parse(JSON.stringify(activeChecklist.value)) : null,
    history: JSON.parse(JSON.stringify(checklistHistory.value)),
  }
}

export function restoreChecklists(snapshot: { active?: Checklist | null; history?: Checklist[] } | undefined): void {
  activeChecklist.value = snapshot?.active ?? null
  checklistHistory.value = Array.isArray(snapshot?.history) ? snapshot!.history! : []
}

export function resetChecklists(): void {
  activeChecklist.value = null
  checklistHistory.value = []
}

export const CHECKLIST_TOOL_NAMES = {
  create: 'create_checklist',
  update: 'update_checklist_step',
} as const

export function isChecklistTool(toolName: string): boolean {
  return toolName === CHECKLIST_TOOL_NAMES.create || toolName === CHECKLIST_TOOL_NAMES.update
}

export function applyChecklistToolCall(toolName: string, input: unknown): unknown {
  if (toolName === CHECKLIST_TOOL_NAMES.create) {
    return applyCreateChecklist((input ?? {}) as CreateChecklistInput)
  }
  if (toolName === CHECKLIST_TOOL_NAMES.update) {
    return applyUpdateChecklistStep((input ?? {}) as UpdateStepInput)
  }
  return { ok: false, reason: `unknown checklist tool: ${toolName}` }
}
