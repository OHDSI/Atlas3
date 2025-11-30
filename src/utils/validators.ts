/**
 * Input Validation Helpers
 * Validation rules for cohort definitions and events
 */
import type { CohortDefinition, CohortEvent } from '@/models/cohort.types'
import type { Cardinality, EventAttribute, NumericRangeAttribute, DateRangeAttribute } from '@/models/event.types'

export interface ValidationError {
  field: string
  message: string
}

/**
 * Validate cohort definition before saving
 */
export function validateCohort(cohort: CohortDefinition): ValidationError[] {
  const errors: ValidationError[] = []

  if (!cohort.name || cohort.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Cohort name is required',
    })
  }

  if (cohort.entryEvents.length === 0) {
    errors.push({
      field: 'entryEvents',
      message: 'At least one entry event is required',
    })
  }

  return errors
}

/**
 * Validate cardinality configuration
 * Per data-model.md: AT_LEAST requires count >= 1, EXACTLY/AT_MOST allow count >= 0
 *
 * CRITICAL: This function enforces zero-count preservation rules
 */
export function validateCardinality(cardinality: Cardinality): ValidationError[] {
  const errors: ValidationError[] = []

  if (cardinality.type === 'AT_LEAST' && cardinality.count < 1) {
    errors.push({
      field: 'cardinality.count',
      message: 'AT_LEAST cardinality requires count >= 1',
    })
  }

  if (cardinality.count < 0) {
    errors.push({
      field: 'cardinality.count',
      message: 'Cardinality count cannot be negative',
    })
  }

  return errors
}

/**
 * Validate event has required fields
 */
export function validateEvent(event: CohortEvent): ValidationError[] {
  const errors: ValidationError[] = []

  if (!event.criteriaType) {
    errors.push({
      field: 'criteriaType',
      message: 'Event criteria type is required',
    })
  }

  return errors
}

/**
 * Validate event attributes
 * Per User Story 3: BETWEEN operator requires extent value
 */
export function validateAttribute(attribute: EventAttribute): ValidationError[] {
  const errors: ValidationError[] = []

  if (!attribute.attributeKey || attribute.attributeKey.trim() === '') {
    errors.push({
      field: 'attribute.attributeKey',
      message: 'Attribute key is required',
    })
  }

  // Validate numeric range attributes
  if (attribute.type === 'numericRange') {
    const numAttr = attribute as NumericRangeAttribute

    if (!numAttr.operator) {
      errors.push({
        field: 'attribute.operator',
        message: 'Numeric operator is required',
      })
    }

    if (numAttr.value === null || numAttr.value === undefined) {
      errors.push({
        field: 'attribute.value',
        message: 'Numeric value is required',
      })
    }

    // Note: NumericOperator doesn't include BETWEEN or NOT_BETWEEN per type definition
    // If extent is provided, validate the range
    if (numAttr.extent !== null && numAttr.extent !== undefined &&
        numAttr.value !== null && numAttr.value !== undefined &&
        numAttr.value >= numAttr.extent) {
      errors.push({
        field: 'attribute.extent',
        message: 'Extent value must be greater than value',
      })
    }
  }

  // Validate concept set attributes
  if (attribute.type === 'conceptSet') {
    if (!attribute.conceptSet || !attribute.conceptSet.id) {
      errors.push({
        field: 'attribute.conceptSet',
        message: 'Concept set is required',
      })
    }
  }

  // Validate date range attributes
  if (attribute.type === 'dateRange') {
    const dateAttr = attribute as DateRangeAttribute

    if (!dateAttr.operator) {
      errors.push({
        field: 'attribute.operator',
        message: 'Date operator is required',
      })
    }

    // Date range uses value and extent (not startDate/endDate)
    // DateOperator includes: GREATER_THAN, LESS_THAN, EQUAL, NOT_EQUAL, BETWEEN, NOT_BETWEEN
    if ((dateAttr.operator === 'GREATER_THAN' || dateAttr.operator === 'LESS_THAN' ||
         dateAttr.operator === 'EQUAL' || dateAttr.operator === 'NOT_EQUAL') &&
        !dateAttr.value) {
      errors.push({
        field: 'attribute.value',
        message: 'Date value is required for comparison operators',
      })
    }

    // BETWEEN and NOT_BETWEEN require both value and extent
    if ((dateAttr.operator === 'BETWEEN' || dateAttr.operator === 'NOT_BETWEEN') &&
        (!dateAttr.value || !dateAttr.extent)) {
      errors.push({
        field: 'attribute.dates',
        message: 'Both value and extent dates required for BETWEEN/NOT_BETWEEN operators',
      })
    }

    // Validate date range is valid (value < extent)
    if (dateAttr.value && dateAttr.extent &&
        new Date(dateAttr.value) >= new Date(dateAttr.extent)) {
      errors.push({
        field: 'attribute.dates',
        message: 'Extent date must be after value date',
      })
    }
  }

  return errors
}

/**
 * Validate all attributes in an event
 */
export function validateEventAttributes(event: CohortEvent): ValidationError[] {
  const errors: ValidationError[] = []

  if (event.attributes) {
    event.attributes.forEach((attribute, index) => {
      const attrErrors = validateAttribute(attribute)
      attrErrors.forEach(error => {
        errors.push({
          field: `attributes[${index}].${error.field}`,
          message: error.message,
        })
      })
    })
  }

  return errors
}

/**
 * Check if cohort has any validation errors
 */
export function hasValidationErrors(errors: ValidationError[]): boolean {
  return errors.length > 0
}
