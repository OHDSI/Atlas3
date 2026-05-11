export interface ConceptRefArgs {
  conceptId?: number
  conceptName?: string
  domain?: string
  includeDescendants?: boolean
  isExcluded?: boolean
}

export interface CriterionArgs extends ConceptRefArgs {
  group?: 'inclusion' | 'exclusion'
  operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between'
  value?: number
  value2?: number
}

export interface ObservationWindowArgs {
  priorDays?: number
  postDays?: number
}

export interface ExitCriterionArgs {
  strategy?: 'end_of_observation' | 'fixed_duration' | 'continuous_drug' | 'custom_event'
  offset?: number
  dateField?: 'START_DATE' | 'END_DATE'
  persistenceWindow?: number
  surveillanceWindow?: number
  concept?: ConceptRefArgs
}

export interface ConceptSetArgs {
  name?: string
  items?: ConceptRefArgs[]
}

export interface TemporalWindowArgs {
  priorStart?: number
  priorEnd?: number
  postStart?: number
  postEnd?: number
}

export interface InclusionRuleArgs {
  name?: string
  description?: string
  logicType?: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  count?: number
  temporalWindow?: TemporalWindowArgs
  events?: CriterionArgs[]
}

// Closed list of view names the model is allowed to navigate to. Mirrors
// the Vue Router `name` field in src/router/routes.ts (host side). The
// shell bridge validates against this list before accepting the proposal.
export type NavigateView =
  | 'home'
  | 'cohorts'
  | 'cohort-new'
  | 'cohort-edit'
  | 'concepts'
  | 'concept-detail'
  | 'datasources'
  | 'profiles'
  | 'profile-view'
  | 'feature-analyses'
  | 'feature-analysis-new'
  | 'feature-analysis-edit'
  | 'characterizations'
  | 'characterization-new'
  | 'characterization-edit'
  | 'pathways'
  | 'pathway-new'
  | 'pathway-edit'
  | 'pathway-results'
  | 'incidence-rates'
  | 'incidence-rate-new'
  | 'incidence-rate-edit'

export interface NavigateArgs {
  view?: NavigateView
  id?: number
  sourceKey?: string
  conceptId?: number
  personId?: number
  executionId?: number
  cohortId?: number
  reason?: string
}

export interface StandaloneConceptSetArgs {
  name?: string
  description?: string
  items?: ConceptRefArgs[]
}

export interface CohortRefArgs {
  id?: number
  name?: string
}

export interface FeatureAnalysisRefArgs {
  id?: number
  name?: string
}

export interface CreateFeatureAnalysisArgs {
  name?: string
  description?: string
  type?: 'PRESET' | 'CRITERIA_SET' | 'CUSTOM_FE'
  domain?: string
  statType?: 'PREVALENCE' | 'DISTRIBUTION'
  design?: unknown
}

export interface CreateCharacterizationArgs {
  name?: string
  description?: string
  cohorts?: CohortRefArgs[]
  featureAnalyses?: FeatureAnalysisRefArgs[]
}

export interface CreatePathwayArgs {
  name?: string
  description?: string
  targetCohorts?: CohortRefArgs[]
  eventCohorts?: CohortRefArgs[]
  combinationWindow?: number
  minCellCount?: number
  maxDepth?: number
  allowRepeats?: boolean
}

export interface CreateIncidenceRateArgs {
  name?: string
  description?: string
  targetIds?: number[]
  outcomeIds?: number[]
  timeAtRisk?: {
    start?: { DateField?: 'StartDate' | 'EndDate'; Offset?: number }
    end?: { DateField?: 'StartDate' | 'EndDate'; Offset?: number }
  }
  studyWindow?: { startDate?: string; endDate?: string }
}

export type ProposalArgs =
  & CriterionArgs
  & ObservationWindowArgs
  & ExitCriterionArgs
  & ConceptSetArgs
  & InclusionRuleArgs
  & NavigateArgs
  & StandaloneConceptSetArgs
  & CreateFeatureAnalysisArgs
  & CreateCharacterizationArgs
  & CreatePathwayArgs
  & CreateIncidenceRateArgs
  & Record<string, unknown>

export type StreamEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call'; id: string; name: string; args: Record<string, unknown> }
  | { type: 'tool-result'; id: string; result: unknown }
  | { type: 'tool-pending'; id: string; name: string; args: Record<string, unknown> }
  | { type: 'done' }
  | { type: 'error'; message: string }

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  toolSummaries: { id: string; name: string; argsPreview: string }[]
}

export interface ProposalState {
  id: string
  toolName: string
  args: ProposalArgs
  status: 'pending' | 'accepted' | 'rejected'
  // Parent assistant UIMessage.id, captured when the tool call lands. Used
  // by ChatPanel to render groups when the model issues 2+ tool calls in
  // one turn. Older persisted proposals predate this field — undefined
  // there means "render as a singleton", which preserves legacy behaviour.
  groupId?: string
  // 0-based position within the parent message's tool-call parts, captured
  // at the same time as groupId. Lets the group card preserve the model's
  // intended order even when accept/reject mutates statuses out of band.
  groupIndex?: number
}

// ----- ask_user -----
//
// Pythia can issue an `ask_user` client-side tool call when the next tool
// it would invoke depends on a user choice that context can't disambiguate
// (canonical case: open cohort + user says "create a T2DM cohort" — update
// the open one or create new?). The chat panel renders the options as
// clickable buttons; clicking one synthesises a user message so the model
// resolves the question on its next turn.

export interface AskOption {
  id: string
  label: string
  description?: string
}

export interface AskState {
  id: string                                // toolCallId
  question: string
  options: AskOption[]
  allowCustom: boolean
  status: 'pending' | 'answered'
  chosen?: { id?: string; label: string }
  groupId?: string
  groupIndex?: number
}

export type PlanStepStatus = 'pending' | 'in_progress' | 'done' | 'blocked'

export interface PlanStep {
  id: string
  label: string
  description?: string
  status: PlanStepStatus
  linkedProposalKind?: string
  linkedRoute?: string
}

export interface Plan {
  id: string
  title: string
  // Optional markdown narrative (3-5 sentences) — goal, approach,
  // prerequisites, success criteria. Pythia attaches it for non-trivial
  // analyses; trivial 1-2 step flows skip it.
  document?: string
  steps: PlanStep[]
  status: 'active' | 'completed' | 'abandoned'
  createdAt: number
  updatedAt: number
}
