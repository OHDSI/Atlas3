/**
 * useExitCriteriaValidation Composable
 * Provides validation logic for Exit Criteria and Censor Window using Zod schemas
 */

import { z } from 'zod'
import type { ExitCriteria, Period } from '@/models/cohort.types'
import type { ValidationError, ValidationResult } from '@/models/validation.types'

/**
 * Zod schema for ExitCriteria validation
 */
const exitCriteriaSchema = z.object({
  strategy: z.enum(['CONTINUOUS_OBSERVATION', 'FIXED_DURATION', 'CONTINUOUS_DRUG', 'CUSTOM_EVENT']),
  offset: z.number().int().nonnegative().optional(),
  dateField: z.enum(['START_DATE', 'END_DATE']).optional(),
  conceptSet: z.object({
    id: z.union([z.number(), z.string()]),
    name: z.string()
  }).optional(),
  persistenceWindow: z.number().int().nonnegative().optional(),
  surveillanceWindow: z.number().int().nonnegative().optional(),
  censoringEvents: z.array(z.any()).optional() // CohortEvent has its own validation
}).refine(
  (data) => {
    // FIXED_DURATION requires offset
    if (data.strategy === 'FIXED_DURATION') {
      return data.offset !== undefined
    }
    return true
  },
  {
    message: 'Fixed duration strategy requires an offset value',
    path: ['offset']
  }
).refine(
  (data) => {
    // CONTINUOUS_DRUG requires conceptSet
    if (data.strategy === 'CONTINUOUS_DRUG') {
      return data.conceptSet !== undefined
    }
    return true
  },
  {
    message: 'Drug exposure strategy requires a concept set',
    path: ['conceptSet']
  }
)

/**
 * Zod schema for CensorWindow (Period) validation
 */
const censorWindowSchema = z.object({
  startDate: z.object({
    dateField: z.enum(['START_DATE', 'END_DATE']),
    offset: z.number().int()
  }).optional(),
  endDate: z.object({
    dateField: z.enum(['START_DATE', 'END_DATE']),
    offset: z.number().int()
  }).optional()
}).refine(
  (data) => {
    // Validate start <= end if both present
    if (data.startDate && data.endDate) {
      return data.startDate.offset! <= data.endDate.offset!
    }
    return true
  },
  {
    message: 'Start offset must be less than or equal to end offset',
    path: ['endDate', 'offset']
  }
)

/**
 * useExitCriteriaValidation composable
 * Provides validation functions for exit criteria and censor window
 */
export function useExitCriteriaValidation() {
  /**
   * Validate complete ExitCriteria object
   */
  function validate(exitCriteria: ExitCriteria | undefined): ValidationResult {
    if (!exitCriteria) {
      return { valid: true, errors: [] }
    }

    try {
      exitCriteriaSchema.parse(exitCriteria)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map((err) => ({
          field: `exitCriteria.${err.path.join('.')}`,
          message: err.message,
          severity: 'error'
        }))
        return { valid: false, errors }
      }
      return { valid: false, errors: [] }
    }
  }

  /**
   * Validate single field within ExitCriteria
   */
  function validateField(
    exitCriteria: ExitCriteria,
    fieldPath: string
  ): string | true {
    try {
      exitCriteriaSchema.parse(exitCriteria)
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find((err) =>
          err.path.join('.') === fieldPath
        )
        return fieldError ? fieldError.message : true
      }
      return true
    }
  }

  /**
   * Validate CensorWindow (Period)
   */
  function validateCensorWindow(censorWindow: Period | undefined | null): ValidationResult {
    if (!censorWindow) {
      return { valid: true, errors: [] }
    }

    try {
      censorWindowSchema.parse(censorWindow)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map((err) => ({
          field: `censorWindow.${err.path.join('.')}`,
          message: err.message,
          severity: 'warning' // Warnings allow save with acknowledgment
        }))
        return { valid: false, errors }
      }
      return { valid: false, errors: [] }
    }
  }

  /**
   * Validate single field within CensorWindow
   */
  function validateCensorWindowField(
    censorWindow: Period,
    fieldPath: string
  ): string | true {
    try {
      censorWindowSchema.parse(censorWindow)
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find((err) =>
          err.path.join('.') === fieldPath
        )
        return fieldError ? fieldError.message : true
      }
      return true
    }
  }

  return {
    validate,
    validateField,
    validateCensorWindow,
    validateCensorWindowField
  }
}
