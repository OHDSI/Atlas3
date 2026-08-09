import type {
  CohortEvent,
  ConceptSetReference,
  ExitCriteria,
  InclusionRule,
  ObservationPeriod,
} from './cohort.types'

export interface StandaloneConceptSetItem {
  conceptId: number
  conceptName: string
  domain?: string
  includeDescendants?: boolean
  isExcluded?: boolean
}

export interface NavigateRoute {
  name: string
  params?: Record<string, string | number>
}

export interface StandaloneConceptSetPayload {
  name: string
  description?: string
  items: StandaloneConceptSetItem[]
}

export interface FeatureAnalysisCreatePayload {
  name: string
  description?: string
  type: 'PRESET' | 'CRITERIA_SET' | 'CUSTOM_FE'
  domain?: string
  statType?: 'PREVALENCE' | 'DISTRIBUTION'
  // PRESET → string preset id; CRITERIA_SET → object; CUSTOM_FE → SQL string.
  design?: unknown
}

export interface CohortRef {
  id: number
  name: string
}

export interface FeatureAnalysisRef {
  id: number
  name?: string
}

export interface CharacterizationCreatePayload {
  name: string
  description?: string
  cohorts: CohortRef[]
  featureAnalyses: FeatureAnalysisRef[]
}

export interface PathwayCreatePayload {
  name: string
  description?: string
  targetCohorts?: CohortRef[]
  eventCohorts?: CohortRef[]
  combinationWindow?: number
  minCellCount?: number
  maxDepth?: number
  allowRepeats?: boolean
}

export interface IncidenceRateTimeAtRisk {
  start: { DateField: 'StartDate' | 'EndDate'; Offset: number }
  end: { DateField: 'StartDate' | 'EndDate'; Offset: number }
}

export interface IncidenceRateCreatePayload {
  name: string
  description?: string
  targetIds?: number[]
  outcomeIds?: number[]
  timeAtRisk?: IncidenceRateTimeAtRisk
  studyWindow?: { startDate?: string; endDate?: string }
}

// ----- Update payloads for the 5 non-cohort artifact types -----
//
// These are partial-merge edits routed by the host into the matching Pinia
// store's applyProposal action. Cohort edits stay on their existing
// proposal kinds (addEntryEvent / addInclusionRule / etc.) since the cohort
// store already has a mature partial-update flow.

export interface UpdateConceptSetPayload {
  id: number
  name?: string
  description?: string
  // Replace every item.
  items?: StandaloneConceptSetItem[]
  // Append items, skipping ids already present.
  itemsToAdd?: StandaloneConceptSetItem[]
}

export interface UpdateFeatureAnalysisPayload {
  id: number
  name?: string
  description?: string
  type?: 'PRESET' | 'CRITERIA_SET' | 'CUSTOM_FE'
  domain?: string
  statType?: 'PREVALENCE' | 'DISTRIBUTION'
  design?: unknown
}

export interface UpdateCharacterizationPayload {
  id: number
  name?: string
  description?: string
  cohorts?: CohortRef[]
  cohortsToAdd?: CohortRef[]
  featureAnalyses?: FeatureAnalysisRef[]
  featureAnalysesToAdd?: FeatureAnalysisRef[]
}

export interface UpdatePathwayPayload {
  id: number
  name?: string
  description?: string
  targetCohorts?: CohortRef[]
  targetCohortsToAdd?: CohortRef[]
  eventCohorts?: CohortRef[]
  eventCohortsToAdd?: CohortRef[]
  combinationWindow?: number
  minCellCount?: number
  maxDepth?: number
  allowRepeats?: boolean
}

export interface UpdateIncidenceRatePayload {
  id: number
  name?: string
  description?: string
  targetIds?: number[]
  targetIdsToAdd?: Array<{ id: number; name?: string }>
  outcomeIds?: number[]
  outcomeIdsToAdd?: Array<{ id: number; name?: string }>
  timeAtRisk?: IncidenceRateTimeAtRisk
  studyWindow?: { startDate: string; endDate: string } | null
}

export type AgentProposal =
  // `replace` distinguishes set_entry_event (which promises to replace the
  // entry event) from add_criterion group=entry (which adds another OR'd one).
  | { kind: 'addEntryEvent'; event: CohortEvent; replace?: boolean }
  | { kind: 'removeInclusionRule'; match: { id?: string | number; name?: string } }
  | { kind: 'removeEntryEvent'; match: { conceptId?: number; conceptName?: string } }
  | { kind: 'addInclusionRule'; rule: InclusionRule }
  | { kind: 'addConceptSet'; conceptSet: ConceptSetReference }
  | { kind: 'setObservationPeriod'; observationPeriod: ObservationPeriod }
  | { kind: 'setExitCriteria'; exitCriteria: ExitCriteria }
  | { kind: 'addCensoringCriterion'; event: CohortEvent }
  | { kind: 'navigate'; route: NavigateRoute; reason?: string }
  // The host always navigates the user to the relevant editor after a
  // successful create, so the prior `openAfterCreate: boolean` field is
  // gone. If we ever need a "create silently in the background" mode it
  // should come back as an opt-OUT (`silent: true`) rather than the
  // always-true opt-IN it used to be.
  | {
      kind: 'createStandaloneConceptSet'
      conceptSet: StandaloneConceptSetPayload
    }
  | {
      kind: 'createFeatureAnalysis'
      payload: FeatureAnalysisCreatePayload
    }
  | {
      kind: 'createCharacterization'
      payload: CharacterizationCreatePayload
    }
  | {
      kind: 'createPathway'
      payload: PathwayCreatePayload
    }
  | {
      kind: 'createIncidenceRate'
      payload: IncidenceRateCreatePayload
    }
  | {
      kind: 'generateAnalysis'
      payload: { analysisType: 'pathway' | 'characterization' | 'incidenceRate'; analysisId: number; sourceKey?: string }
    }
  | { kind: 'updateConceptSet'; payload: UpdateConceptSetPayload }
  | { kind: 'updateFeatureAnalysis'; payload: UpdateFeatureAnalysisPayload }
  | { kind: 'updateCharacterization'; payload: UpdateCharacterizationPayload }
  | { kind: 'updatePathway'; payload: UpdatePathwayPayload }
  | { kind: 'updateIncidenceRate'; payload: UpdateIncidenceRatePayload }
  | { kind: 'saveCohort'; name?: string; description?: string }

export interface AgentToolCallSummary {
  id: string
  name: string
  args: Record<string, unknown>
}
