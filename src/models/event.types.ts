/**
 * Event Types - Cardinality, Temporal Windows, and Attributes
 * Used by CohortEvent definitions
 */

export type CardinalityType = 'AT_LEAST' | 'EXACTLY' | 'AT_MOST'

export type CountingMethod = 'ALL' | 'DISTINCT_CONCEPT' | 'DISTINCT_START_DATE' | 'DISTINCT_VISIT'

export interface Cardinality {
  type: CardinalityType
  count: number // >= 0 (zero is valid for EXACTLY/AT_MOST exclusion)
  countingMethod: CountingMethod
  isDistinct?: boolean
  countColumn?: string
}

export interface TemporalWindow {
  startWindow?: Window
  endWindow?: Window
}

export interface Window {
  days: number | null // null means "all time"
  beforeAfter: 'BEFORE' | 'AFTER'
  referencePoint: 'INDEX_START' | 'INDEX_END' | 'EVENT_START' | 'EVENT_END'
}

/**
 * EventAttribute - Discriminated union for different attribute types
 * Per internal-types.md, all variants use 'type' discriminator
 */
export type EventAttribute =
  | NumericRangeAttribute
  | ConceptSetAttribute
  | ConceptAttribute
  | DateRangeAttribute
  | TextAttribute
  | BooleanAttribute
  | TemporalRelationshipAttribute
  | DateAdjustmentAttribute
  | UserDefinedPeriodAttribute

export interface NumericRangeAttribute {
  type: 'numericRange'
  attributeKey: NumericAttributeKey
  operator: NumericOperator
  value: number
  extent?: number // For BETWEEN operator
}

export interface ConceptSetAttribute {
  type: 'conceptSet'
  attributeKey: ConceptAttributeKey
  conceptSet: { id: number | string; name: string }
  isExclusion?: boolean
}

/**
 * Concept structure for Atlas compatibility
 */
export interface Concept {
  CONCEPT_ID: number
  CONCEPT_NAME: string
  CONCEPT_CODE?: string
  DOMAIN_ID?: string
  VOCABULARY_ID?: string
  CONCEPT_CLASS_ID?: string
  STANDARD_CONCEPT?: string | null
  INVALID_REASON?: string | null
}

/**
 * Concept attribute (different from ConceptSetAttribute)
 * Used for Gender, VisitType, ProviderSpecialty, etc.
 * Supports multiple concept selection
 * Atlas format: Array of concepts
 */
export interface ConceptAttribute {
  type: 'concept'
  attributeKey: ConceptAttributeKey
  concepts: Concept[] // Changed from single concept to array
  isExclusion?: boolean
}

export interface DateRangeAttribute {
  type: 'dateRange'
  attributeKey: DateAttributeKey
  operator: DateOperator
  value: string // ISO 8601 date string
  extent?: string // For BETWEEN operator
}

export interface TextAttribute {
  type: 'text'
  attributeKey: TextAttributeKey
  operator: 'CONTAINS' | 'EQUALS' | 'STARTS_WITH' | 'ENDS_WITH'
  value: string
}

export interface BooleanAttribute {
  type: 'boolean'
  attributeKey: BooleanAttributeKey
  value: boolean
}

/**
 * Temporal relationship attribute
 * Defines temporal windows relative to another event
 * Uses the same TemporalWindow structure as event-level temporal windows
 */
export interface TemporalRelationshipAttribute {
  type: 'temporalRelationship'
  attributeKey: TemporalAttributeKey
  temporalWindow: TemporalWindow
}

/**
 * Date adjustment attribute
 * Defines how criterion event dates are shifted (e.g., "30 days after start date")
 * Uses the same DateAdjustment structure as event-level date adjustments
 */
export interface DateAdjustmentAttribute {
  type: 'dateAdjustment'
  attributeKey: DateAdjustmentAttributeKey
  dateAdjustment: DateAdjustment
}

/**
 * User defined period type
 * Represents a custom date range with start and end dates
 */
export interface UserDefinedPeriod {
  startDate: string // ISO 8601 date string (YYYY-MM-DD)
  endDate: string // ISO 8601 date string (YYYY-MM-DD)
}

/**
 * User defined period attribute
 * Defines a custom period with start and end dates
 * Used primarily for observation period criteria
 */
export interface UserDefinedPeriodAttribute {
  type: 'userDefinedPeriod'
  attributeKey: UserDefinedPeriodAttributeKey
  period: UserDefinedPeriod
}

// Attribute keys
export type NumericAttributeKey = 'age' | 'valueAsNumber' | 'visitLength' | 'eraLength' | 'quantity'

/**
 * Identifier for a concept-typed attribute. Always camelCase; the canonical list
 * is in `src/config/atlas-config.json` under `attributeMapping`. The `*Cs` suffix
 * (e.g. `visitTypeCs`) marks the concept-set variant of a domain attribute, mirroring
 * Atlas 2.15's `VisitTypeCS` field.
 */
export type ConceptAttributeKey = string

export type DateAttributeKey =
  | 'occurrenceStartDate'
  | 'occurrenceEndDate'
  | 'visitStartDate'
  | 'visitEndDate'
  | 'eraStartDate'
  | 'eraEndDate'

export type TextAttributeKey = 'valueAsString' | 'sourceCode'

export type BooleanAttributeKey = 'first' | 'primary'

export type TemporalAttributeKey = 'temporalRelationship'

export type DateAdjustmentAttributeKey = 'dateAdjustment'

export type UserDefinedPeriodAttributeKey = 'userDefinedPeriod'

export type NumericOperator =
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'BETWEEN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN_OR_EQUAL'

export type DateOperator =
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'BETWEEN'
  | 'NOT_BETWEEN'
  | 'BEFORE'
  | 'AFTER'

/**
 * DateAdjustment - Defines how criterion event dates are shifted
 */
export interface DateAdjustment {
  startWith: 'START_DATE' | 'END_DATE'
  startOffset: number
  endWith: 'START_DATE' | 'END_DATE'
  endOffset: number
}
