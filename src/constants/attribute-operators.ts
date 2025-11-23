/**
 * Attribute Operator Definitions
 *
 * This file contains operator definitions for various attribute types
 * used in the cohort builder's AttributesEditor component.
 */

/**
 * Text attribute operators
 * Used for string-based attribute filtering (e.g., stopReason, valueAsString)
 */
export const TEXT_OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
] as const

export type TextOperator = typeof TEXT_OPERATORS[number]['value']

/**
 * Numeric range operators
 * Used for numeric attribute filtering (e.g., age, quantity)
 */
export const NUMERIC_OPERATORS = [
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'gte', label: 'Greater than or equal (>=)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'lte', label: 'Less than or equal (<=)' },
  { value: 'eq', label: 'Equal (=)' },
  { value: 'ne', label: 'Not equal (!=)' },
  { value: 'bt', label: 'Between' },
  { value: 'nbt', label: 'Not between' },
] as const

export type NumericOperator = typeof NUMERIC_OPERATORS[number]['value']

/**
 * Date range operators
 * Used for date attribute filtering (e.g., startDate, endDate)
 */
export const DATE_OPERATORS = [
  { value: 'bt', label: 'Between' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
] as const

export type DateOperator = typeof DATE_OPERATORS[number]['value']

/**
 * Get default operator for an attribute type
 */
export function getDefaultOperator(attributeType: string): string | null {
  switch (attributeType) {
    case 'text':
      return 'eq'
    case 'numericRange':
      return 'gte'
    case 'dateRange':
      return 'bt'
    case 'boolean':
    case 'concept':
    case 'conceptSet':
    case 'temporalRelationship':
    case 'dateAdjustment':
    case 'userDefinedPeriod':
    case 'nested':
      return null
    default:
      console.warn(`Unknown attribute type: ${attributeType}. Using null as default operator.`)
      return null
  }
}
