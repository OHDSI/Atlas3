/**
 * Type Guards for Discriminated Unions
 * Per internal-types.md conventions
 */
import type {
  EventAttribute,
  NumericRangeAttribute,
  ConceptSetAttribute,
  DateRangeAttribute,
  TextAttribute,
  BooleanAttribute,
} from '@/models/event.types'

export function isNumericRange(attr: EventAttribute): attr is NumericRangeAttribute {
  return attr.type === 'numericRange'
}

export function isConceptSetAttribute(attr: EventAttribute): attr is ConceptSetAttribute {
  return attr.type === 'conceptSet'
}

export function isDateRange(attr: EventAttribute): attr is DateRangeAttribute {
  return attr.type === 'dateRange'
}

export function isTextAttribute(attr: EventAttribute): attr is TextAttribute {
  return attr.type === 'text'
}

export function isBooleanAttribute(attr: EventAttribute): attr is BooleanAttribute {
  return attr.type === 'boolean'
}

/**
 * Type guard for WebAPI vs client-side IDs
 */
export function isWebAPIId(id: number | string): id is number {
  return typeof id === 'number'
}

export function isClientSideId(id: number | string): id is string {
  return typeof id === 'string'
}
