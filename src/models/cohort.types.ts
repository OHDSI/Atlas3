/**
 * Cohort Definition Types
 * Core types for OHDSI cohort definitions
 */

import type { Cardinality, TemporalWindow, EventAttribute, DateAdjustment } from './event.types'
import type { CohortExpression } from '@/components/cohort-editor/circe.types'

/**
 * Tag for cohort organization and filtering
 */
export interface Tag {
  id?: number
  name: string
  color?: string
}

/**
 * User shape matching Java's `org.ohdsi.webapi.security.authz.User` record.
 * Returned as `createdBy` / `modifiedBy` on entity DTOs.
 */
export interface CohortUser {
  id?: number
  login?: string
  name?: string | null
}

/**
 * Mirrors Java's CohortDTO shape for all in-memory usage.
 *
 * GET /cohortdefinition/{id} returns CohortRawDTO (expression as JSON string); webapi.ts
 * parses it into a typed CohortExpression before returning this type to callers.
 * PUT /cohortdefinition/{id} accepts CohortDTO where expression is a serialized object;
 * webapi.ts serializes expression back to JSON string in the save payload.
 */
export interface CohortDefinition {
  id?: number
  name: string
  description?: string
  /** Read-only. Populated by the server (CommonEntityDTO). */
  createdBy?: CohortUser | string
  /** Unix-ms timestamp from Jackson Date serialization. */
  createdDate?: number | string
  /** Read-only. Populated by the server (CommonEntityDTO). */
  modifiedBy?: CohortUser | string
  modifiedDate?: number | string
  writeAccess?: boolean
  readAccess?: boolean
  /** CommonEntityExtDTO tags. */
  tags?: Tag[]
  /** Parsed Circe CohortExpression. Serialized to JSON string only at the API boundary (save). */
  expression?: CohortExpression
  /** e.g. 'SIMPLE_EXPRESSION' */
  expressionType?: string
}

// ─── UI convenience types ────────────────────────────────────────────────────

/**
 * Reference to a concept set used inside the UI (concept set selector, editor,
 * validation display).  Not a server type — assembled from CohortExpression.ConceptSets
 * in CohortBuilder.vue.
 */
export interface ConceptSetReference {
  id: number | string // Number from WebAPI, string (UUID) for client-side
  name: string
  conceptCount?: number
  items?: unknown[] // Full concept set items (flat camelCase ConceptSetItem[])
}

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

// ─── Criteria type enumeration ──────────────────────────────────────────────
// Used by CriteriaEventCard and circe-criteria constants.

export type CriteriaType =
  | 'ConditionOccurrence'
  | 'ConditionEra'
  | 'DrugExposure'
  | 'DrugEra'
  | 'DoseEra'
  | 'ProcedureOccurrence'
  | 'Measurement'
  | 'Observation'
  | 'ObservationPeriod'
  | 'DeviceExposure'
  | 'VisitOccurrence'
  | 'VisitDetail'
  | 'Death'
  | 'Specimen'
  | 'PayerPlanPeriod'
  | 'LocationRegion'
  | 'Demographic'

// ─── @deprecated — legacy internal Atlas model ───────────────────────────────
// These types represent the old Atlas-internal cohort representation.
// They remain for old cohort-builder components that have not been migrated.
// New code should use circe.types.ts directly.

/** @deprecated Use circe.types.ts ResultLimit.Type */
export type QualifyingLimit = 'ALL' | 'FIRST' | 'LAST'

/** @deprecated */
export interface ObservationPeriod {
  priorDays: number
  postDays: number
}

/** @deprecated Use CriteriaGroup from circe.types.ts */
export interface CohortEvent {
  id: string
  criteriaType: CriteriaType
  conceptSet?: ConceptSetReference
  sourceConceptId?: number
  cardinality?: Cardinality
  temporalWindow?: TemporalWindow
  endTemporalWindow?: TemporalWindow
  attributes?: EventAttribute[]
  nestedCriteria?: NestedCriteria
  restrictVisit?: boolean
  ignoreObservationPeriod?: boolean
  dateAdjustment?: DateAdjustment
  typeExclude?: boolean
}

/** @deprecated Use circe.types.ts InclusionRule */
export interface InclusionRule {
  id: string
  name: string
  description?: string
  criteriaGroups: CriteriaGroup[]
}

/** @deprecated Use circe.types.ts CriteriaGroup */
export interface CriteriaGroup {
  id: string
  logicType: LogicType
  count?: number
  qualifyingLimit?: QualifyingLimit
  events: CohortEvent[]
  nestedGroups?: CriteriaGroup[]
}

/** @deprecated */
export type NestedCriteria = CriteriaGroup

/** @deprecated */
export type LogicType = 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'

/** @deprecated Use circe.types.ts EndStrategy */
export interface ExitCriteria {
  strategy: ExitStrategy
  offset?: number
  dateField?: 'START_DATE' | 'END_DATE'
  conceptSet?: ConceptSetReference
  persistenceWindow?: number
  surveillanceWindow?: number
  censoringEvents?: CohortEvent[]
}

/** @deprecated Use circe.types.ts EndStrategy */
export type ExitStrategy = 'CONTINUOUS_OBSERVATION' | 'FIXED_DURATION' | 'CONTINUOUS_DRUG'

// Re-exported for legacy cohort-builder components only.
export type { Cardinality, TemporalWindow, EventAttribute, DateAdjustment } from './event.types'

