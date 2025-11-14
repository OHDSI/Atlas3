/**
 * Cohort Definition Types
 * Core types for OHDSI cohort definitions
 */

import type { Cardinality, TemporalWindow, EventAttribute } from './event.types'

/**
 * Tag for cohort organization and filtering
 */
export interface Tag {
  id?: number
  name: string
  color?: string
}

export type QualifyingLimit = 'ALL' | 'FIRST' | 'LAST'

export interface ObservationPeriod {
  priorDays: number
  postDays: number
}

export interface CohortDefinition {
  id?: number
  name: string
  description?: string
  createdBy?: unknown
  createdDate?: number
  modifiedBy?: unknown
  modifiedDate?: number
  tags?: Tag[]
  entryEvents: CohortEvent[]
  qualifyingLimit: QualifyingLimit
  inclusionQualifyingLimit?: QualifyingLimit
  observationPeriod?: ObservationPeriod
  additionalCriteria?: CriteriaGroup // Criteria that restrict/qualify entry events
  inclusionRules: InclusionRule[]
  exitCriteria?: ExitCriteria
  conceptSets: ConceptSetReference[]
}

export interface CohortEvent {
  id: string // UUIDv4 client-side ID
  criteriaType: CriteriaType
  conceptSet?: ConceptSetReference
  cardinality?: Cardinality
  temporalWindow?: TemporalWindow
  attributes: EventAttribute[]
  nestedCriteria?: NestedCriteria
  restrictVisit?: boolean // Event must occur in same visit as index
  ignoreObservationPeriod?: boolean // Event can occur outside observation period
}

export interface InclusionRule {
  id: string
  name: string
  description?: string
  criteriaGroups: CriteriaGroup[]
}

export interface CriteriaGroup {
  id: string
  logicType: LogicType
  count?: number // For AT_LEAST and AT_MOST
  qualifyingLimit?: QualifyingLimit // For primary criteria limit (used in AdditionalCriteria)
  events: CohortEvent[]
  nestedGroups?: CriteriaGroup[] // Recursive nesting support
}

export interface NestedCriteria {
  id: string
  logicType: LogicType
  count?: number // For AT_LEAST and AT_MOST
  events: CohortEvent[] // Recursive: CohortEvent contains NestedCriteria
}

export type LogicType = 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'

export interface ExitCriteria {
  strategy: ExitStrategy
  offset?: number // Days offset for exit
  conceptSet?: ConceptSetReference // For CONTINUOUS_DRUG exit
  censoringEvents?: CohortEvent[] // Events that cause exit
}

export type ExitStrategy =
  | 'CONTINUOUS_OBSERVATION'
  | 'FIXED_DURATION'
  | 'CONTINUOUS_DRUG'
  | 'CUSTOM_EVENT'

export interface ConceptSetReference {
  id: number | string // Number from WebAPI, string (UUID) for client-side
  name: string
  conceptCount?: number
  items?: any[] // Full concept set items to embed in cohort definition
}

// 12 OHDSI criteria types per spec.md FR-002
export type CriteriaType =
  | 'ConditionOccurrence'
  | 'DrugExposure'
  | 'ProcedureOccurrence'
  | 'Measurement'
  | 'Observation'
  | 'DeviceExposure'
  | 'VisitOccurrence'
  | 'Death'
  | 'Specimen'
  | 'DrugEra'
  | 'ConditionEra'
  | 'DoseEra'

// Import from event.types.ts (will be defined there)
export type { Cardinality, TemporalWindow, EventAttribute } from './event.types'

// Cohorts Page State (for list view)
import type { CohortDefinitionSummary } from './webapi.types'

export interface CohortsPageState {
  cohorts: CohortDefinitionSummary[]
  filteredCohorts: CohortDefinitionSummary[]
  searchQuery: string
  currentPage: number
  itemsPerPage: number
  loading: boolean
  error: Error | null
}

export interface PaginationState {
  page: number
  itemsPerPage: number
  totalItems: number
}
