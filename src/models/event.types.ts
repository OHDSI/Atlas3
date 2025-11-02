/**
 * Event Types - Cardinality, Temporal Windows, and Attributes
 * Used by CohortEvent definitions
 */

export type CardinalityType = 'AT_LEAST' | 'EXACTLY' | 'AT_MOST'

export type CountingMethod =
  | 'ALL'
  | 'DISTINCT_CONCEPT'
  | 'DISTINCT_START_DATE'
  | 'DISTINCT_VISIT'

export interface Cardinality {
  type: CardinalityType
  count: number // >= 0 (zero is valid for EXACTLY/AT_MOST exclusion)
  countingMethod: CountingMethod
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
  | DateRangeAttribute
  | TextAttribute
  | BooleanAttribute

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

// Attribute keys per FR-007
export type NumericAttributeKey =
  | 'age'
  | 'valueAsNumber'
  | 'visitLength'
  | 'eraLength'
  | 'quantity'

export type ConceptAttributeKey = 'gender' | 'race' | 'visitType' | 'providerSpecialty'

export type DateAttributeKey =
  | 'occurrenceStartDate'
  | 'occurrenceEndDate'
  | 'visitStartDate'
  | 'visitEndDate'
  | 'eraStartDate'
  | 'eraEndDate'

export type TextAttributeKey = 'valueAsString' | 'sourceCode'

export type BooleanAttributeKey = 'first' | 'primary'

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
