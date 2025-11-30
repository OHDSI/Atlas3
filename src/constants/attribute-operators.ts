/**
 * Attribute Operator Definitions
 *
 * This file contains operator definitions for various attribute types
 * used in the cohort builder's AttributesEditor component.
 *
 * Values use internal format (UPPERCASE) which maps to Atlas format via atlas.types.ts
 */

/**
 * Text attribute operators
 * Used for string-based attribute filtering (e.g., stopReason, valueAsString)
 */
export const TEXT_OPERATORS = [
  { value: 'EQUALS', label: 'Equals' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'STARTS_WITH', label: 'Starts with' },
  { value: 'ENDS_WITH', label: 'Ends with' },
] as const

export type TextOperator = typeof TEXT_OPERATORS[number]['value']

/**
 * Numeric range operators
 * Used for numeric attribute filtering (e.g., age, quantity)
 */
export const NUMERIC_OPERATORS = [
  { value: 'GREATER_THAN', label: 'Greater Than (>)' },
  { value: 'GREATER_THAN_OR_EQUAL', label: 'Greater Than or Equal (>=)' },
  { value: 'LESS_THAN', label: 'Less Than (<)' },
  { value: 'LESS_THAN_OR_EQUAL', label: 'Less Than or Equal (<=)' },
  { value: 'EQUAL', label: 'Equal (=)' },
  { value: 'NOT_EQUAL', label: 'Not Equal (!=)' },
  { value: 'BETWEEN', label: 'Between' },
  { value: 'NOT_BETWEEN', label: 'Not Between' },
] as const

export type NumericOperator = typeof NUMERIC_OPERATORS[number]['value']

/**
 * Date range operators
 * Used for date attribute filtering (e.g., startDate, endDate)
 */
export const DATE_OPERATORS = [
  { value: 'BETWEEN', label: 'Between' },
  { value: 'BEFORE', label: 'Before' },
  { value: 'AFTER', label: 'After' },
] as const

export type DateOperator = typeof DATE_OPERATORS[number]['value']

/**
 * Get default operator for an attribute type
 */
export function getDefaultOperator(attributeType: string): string | null {
  switch (attributeType) {
    case 'text':
      return 'CONTAINS'
    case 'numericRange':
      return 'GREATER_THAN_OR_EQUAL'
    case 'dateRange':
      return 'BETWEEN'
    case 'boolean':
    case 'concept':
    case 'conceptSet':
    case 'temporalRelationship':
    case 'dateAdjustment':
    case 'userDefinedPeriod':
    case 'nested':
      return null
    default:
      return null
  }
}
