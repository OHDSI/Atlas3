/**
 * useEventPersistence Composable Tests
 * Tests for event persistence strategy configuration state management
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useEventPersistence } from '@/composables/useEventPersistence'
import type { ExitCriteria, ConceptSetReference } from '@/models/cohort.types'

describe('useEventPersistence', () => {
  describe('Initialization', () => {
    it('should initialize with default state when no criteria provided', () => {
      const { state } = useEventPersistence()

      expect(state.strategy).toBe('CONTINUOUS_OBSERVATION')
      expect(state.fixedDuration).toEqual({
        dateField: 'START_DATE',
        offset: 0
      })
      expect(state.drugExposure).toEqual({
        conceptSetId: null,
        persistenceWindow: 30,
        surveillanceWindow: 7
      })
      expect(state.validationErrors).toBeInstanceOf(Map)
      expect(state.validationErrors.size).toBe(0)
    })

    it('should initialize with CONTINUOUS_OBSERVATION strategy from criteria', () => {
      const criteria: ExitCriteria = {
        strategy: 'CONTINUOUS_OBSERVATION'
      }

      const { state } = useEventPersistence(criteria)

      expect(state.strategy).toBe('CONTINUOUS_OBSERVATION')
      expect(state.fixedDuration).toEqual({
        dateField: 'START_DATE',
        offset: 0
      })
      expect(state.drugExposure).toEqual({
        conceptSetId: null,
        persistenceWindow: 30,
        surveillanceWindow: 7
      })
    })

    it('should initialize with FIXED_DURATION strategy from criteria', () => {
      const criteria: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        dateField: 'END_DATE',
        offset: 90
      }

      const { state } = useEventPersistence(criteria)

      expect(state.strategy).toBe('FIXED_DURATION')
      expect(state.fixedDuration).toEqual({
        dateField: 'END_DATE',
        offset: 90
      })
    })

    it('should initialize with FIXED_DURATION and default values when fields missing', () => {
      const criteria: ExitCriteria = {
        strategy: 'FIXED_DURATION'
      }

      const { state } = useEventPersistence(criteria)

      expect(state.strategy).toBe('FIXED_DURATION')
      expect(state.fixedDuration).toEqual({
        dateField: 'START_DATE',
        offset: 0
      })
    })

    it('should initialize with CONTINUOUS_DRUG strategy from criteria', () => {
      const criteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: {
          id: 123,
          name: 'Test Drug'
        },
        persistenceWindow: 45,
        surveillanceWindow: 14
      }

      const { state } = useEventPersistence(criteria)

      expect(state.strategy).toBe('CONTINUOUS_DRUG')
      expect(state.drugExposure).toEqual({
        conceptSetId: '123',
        persistenceWindow: 45,
        surveillanceWindow: 14
      })
    })

    it('should initialize with CONTINUOUS_DRUG and default values when fields missing', () => {
      const criteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG'
      }

      const { state } = useEventPersistence(criteria)

      expect(state.strategy).toBe('CONTINUOUS_DRUG')
      expect(state.drugExposure).toEqual({
        conceptSetId: null,
        persistenceWindow: 30,
        surveillanceWindow: 7
      })
    })

    it('should handle string concept set id', () => {
      const criteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: {
          id: 'uuid-string',
          name: 'Test Drug'
        },
        persistenceWindow: 30,
        surveillanceWindow: 7
      }

      const { state } = useEventPersistence(criteria)

      expect(state.drugExposure.conceptSetId).toBe('uuid-string')
    })

    it('should handle concept set without id', () => {
      // Create a concept set with undefined id (simulating malformed data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conceptSet: any = {
        name: 'Test Drug'
      }

      const criteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet,
        persistenceWindow: 30,
        surveillanceWindow: 7
      }

      const { state } = useEventPersistence(criteria)

      expect(state.drugExposure.conceptSetId).toBeNull()
    })
  })

  describe('switchStrategy', () => {
    it('should switch to CONTINUOUS_OBSERVATION and clear validation errors', () => {
      const { state, switchStrategy, addValidationError } = useEventPersistence()

      addValidationError('test', 'error')
      expect(state.validationErrors.size).toBe(1)

      switchStrategy('CONTINUOUS_OBSERVATION')

      expect(state.strategy).toBe('CONTINUOUS_OBSERVATION')
      expect(state.validationErrors.size).toBe(0)
    })

    it('should switch to FIXED_DURATION with default values', () => {
      const { state, switchStrategy } = useEventPersistence()

      switchStrategy('FIXED_DURATION')

      expect(state.strategy).toBe('FIXED_DURATION')
      expect(state.fixedDuration).toEqual({
        dateField: 'START_DATE',
        offset: 0
      })
      expect(state.validationErrors.size).toBe(0)
    })

    it('should switch to CONTINUOUS_DRUG with default values', () => {
      const { state, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')

      expect(state.strategy).toBe('CONTINUOUS_DRUG')
      expect(state.drugExposure).toEqual({
        conceptSetId: null,
        persistenceWindow: 30,
        surveillanceWindow: 7
      })
      expect(state.validationErrors.size).toBe(0)
    })

    it('should reset previous strategy values when switching', () => {
      const { state, switchStrategy } = useEventPersistence()

      // Set FIXED_DURATION with custom values
      switchStrategy('FIXED_DURATION')
      state.fixedDuration.dateField = 'END_DATE'
      state.fixedDuration.offset = 100

      // Switch to CONTINUOUS_DRUG
      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = 'test-id'
      state.drugExposure.persistenceWindow = 60

      // Switch back to FIXED_DURATION - should have default values
      switchStrategy('FIXED_DURATION')
      expect(state.fixedDuration).toEqual({
        dateField: 'START_DATE',
        offset: 0
      })
    })

    it('should preserve other strategy values when switching', () => {
      const { state, switchStrategy } = useEventPersistence()

      // Set FIXED_DURATION with custom values
      switchStrategy('FIXED_DURATION')
      state.fixedDuration.dateField = 'END_DATE'
      state.fixedDuration.offset = 100

      // Switch to CONTINUOUS_DRUG
      switchStrategy('CONTINUOUS_DRUG')

      // FIXED_DURATION values should still exist in state
      expect(state.fixedDuration.dateField).toBe('END_DATE')
      expect(state.fixedDuration.offset).toBe(100)
    })

    it('should handle switching to CUSTOM_EVENT strategy', () => {
      const { state, switchStrategy } = useEventPersistence()

      switchStrategy('CUSTOM_EVENT')

      expect(state.strategy).toBe('CUSTOM_EVENT')
      expect(state.validationErrors.size).toBe(0)
    })
  })

  describe('toExitCriteria', () => {
    let conceptSets: ConceptSetReference[]

    beforeEach(() => {
      conceptSets = [
        { id: 1, name: 'Drug Set 1' },
        { id: 2, name: 'Drug Set 2' },
        { id: 'uuid-123', name: 'Drug Set 3' }
      ]
    })

    it('should convert CONTINUOUS_OBSERVATION strategy', () => {
      const { toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_OBSERVATION')
      const result = toExitCriteria(conceptSets)

      expect(result).toEqual({
        strategy: 'CONTINUOUS_OBSERVATION'
      })
    })

    it('should convert FIXED_DURATION strategy with START_DATE', () => {
      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('FIXED_DURATION')
      state.fixedDuration.dateField = 'START_DATE'
      state.fixedDuration.offset = 30

      const result = toExitCriteria(conceptSets)

      expect(result).toEqual({
        strategy: 'FIXED_DURATION',
        dateField: 'START_DATE',
        offset: 30
      })
    })

    it('should convert FIXED_DURATION strategy with END_DATE', () => {
      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('FIXED_DURATION')
      state.fixedDuration.dateField = 'END_DATE'
      state.fixedDuration.offset = 90

      const result = toExitCriteria(conceptSets)

      expect(result).toEqual({
        strategy: 'FIXED_DURATION',
        dateField: 'END_DATE',
        offset: 90
      })
    })

    it('should convert FIXED_DURATION with zero offset', () => {
      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('FIXED_DURATION')
      state.fixedDuration.offset = 0

      const result = toExitCriteria(conceptSets)

      expect(result).toEqual({
        strategy: 'FIXED_DURATION',
        dateField: 'START_DATE',
        offset: 0
      })
    })

    it('should convert CONTINUOUS_DRUG with numeric concept set id', () => {
      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = '1'
      state.drugExposure.persistenceWindow = 45
      state.drugExposure.surveillanceWindow = 14

      const result = toExitCriteria(conceptSets)

      expect(result).toEqual({
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 1, name: 'Drug Set 1' },
        persistenceWindow: 45,
        surveillanceWindow: 14
      })
    })

    it('should convert CONTINUOUS_DRUG with string concept set id', () => {
      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = 'uuid-123'
      state.drugExposure.persistenceWindow = 30
      state.drugExposure.surveillanceWindow = 7

      const result = toExitCriteria(conceptSets)

      expect(result).toEqual({
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 'uuid-123', name: 'Drug Set 3' },
        persistenceWindow: 30,
        surveillanceWindow: 7
      })
    })

    it('should not include drug fields when concept set not found', () => {
      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = 'non-existent'
      state.drugExposure.persistenceWindow = 45
      state.drugExposure.surveillanceWindow = 14

      const result = toExitCriteria(conceptSets)

      expect(result).toEqual({
        strategy: 'CONTINUOUS_DRUG'
      })
      expect(result.conceptSet).toBeUndefined()
      expect(result.persistenceWindow).toBeUndefined()
      expect(result.surveillanceWindow).toBeUndefined()
    })

    it('should not include drug fields when concept set id is null', () => {
      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = null
      state.drugExposure.persistenceWindow = 45
      state.drugExposure.surveillanceWindow = 14

      const result = toExitCriteria(conceptSets)

      expect(result).toEqual({
        strategy: 'CONTINUOUS_DRUG'
      })
      expect(result.conceptSet).toBeUndefined()
      expect(result.persistenceWindow).toBeUndefined()
      expect(result.surveillanceWindow).toBeUndefined()
    })

    it('should handle empty concept sets array', () => {
      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = '1'

      const result = toExitCriteria([])

      expect(result).toEqual({
        strategy: 'CONTINUOUS_DRUG'
      })
      expect(result.conceptSet).toBeUndefined()
    })

    it('should convert CUSTOM_EVENT strategy', () => {
      const { toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('CUSTOM_EVENT')
      const result = toExitCriteria(conceptSets)

      expect(result).toEqual({
        strategy: 'CUSTOM_EVENT'
      })
    })

    it('should preserve concept set with additional properties', () => {
      const conceptSetsWithProps: ConceptSetReference[] = [
        { id: 1, name: 'Drug Set 1', conceptCount: 100, items: [] }
      ]

      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = '1'

      const result = toExitCriteria(conceptSetsWithProps)

      expect(result.conceptSet).toEqual({
        id: 1,
        name: 'Drug Set 1',
        conceptCount: 100,
        items: []
      })
    })
  })

  describe('Validation Error Management', () => {
    it('should add validation error', () => {
      const { state, addValidationError } = useEventPersistence()

      addValidationError('offset', 'Offset must be positive')

      expect(state.validationErrors.size).toBe(1)
      expect(state.validationErrors.get('offset')).toBe('Offset must be positive')
    })

    it('should add multiple validation errors', () => {
      const { state, addValidationError } = useEventPersistence()

      addValidationError('offset', 'Offset error')
      addValidationError('persistenceWindow', 'Window error')
      addValidationError('conceptSet', 'Concept set error')

      expect(state.validationErrors.size).toBe(3)
      expect(state.validationErrors.get('offset')).toBe('Offset error')
      expect(state.validationErrors.get('persistenceWindow')).toBe('Window error')
      expect(state.validationErrors.get('conceptSet')).toBe('Concept set error')
    })

    it('should overwrite existing validation error for same field', () => {
      const { state, addValidationError } = useEventPersistence()

      addValidationError('offset', 'First error')
      addValidationError('offset', 'Second error')

      expect(state.validationErrors.size).toBe(1)
      expect(state.validationErrors.get('offset')).toBe('Second error')
    })

    it('should clear validation error for specific field', () => {
      const { state, addValidationError, clearValidationError } = useEventPersistence()

      addValidationError('offset', 'Error 1')
      addValidationError('window', 'Error 2')

      clearValidationError('offset')

      expect(state.validationErrors.size).toBe(1)
      expect(state.validationErrors.has('offset')).toBe(false)
      expect(state.validationErrors.get('window')).toBe('Error 2')
    })

    it('should handle clearing non-existent error', () => {
      const { state, addValidationError, clearValidationError } = useEventPersistence()

      addValidationError('offset', 'Error')

      clearValidationError('non-existent')

      expect(state.validationErrors.size).toBe(1)
      expect(state.validationErrors.get('offset')).toBe('Error')
    })

    it('should clear all validation errors', () => {
      const { state, addValidationError, clearAllValidationErrors } = useEventPersistence()

      addValidationError('offset', 'Error 1')
      addValidationError('window', 'Error 2')
      addValidationError('conceptSet', 'Error 3')

      expect(state.validationErrors.size).toBe(3)

      clearAllValidationErrors()

      expect(state.validationErrors.size).toBe(0)
    })

    it('should handle clearing all errors when map is empty', () => {
      const { state, clearAllValidationErrors } = useEventPersistence()

      expect(state.validationErrors.size).toBe(0)

      clearAllValidationErrors()

      expect(state.validationErrors.size).toBe(0)
    })
  })

  describe('hasErrors computed property', () => {
    it('should return false when no validation errors', () => {
      const { hasErrors } = useEventPersistence()

      expect(hasErrors.value).toBe(false)
    })

    it('should return true when validation errors exist', () => {
      const { hasErrors, addValidationError } = useEventPersistence()

      addValidationError('offset', 'Error')

      expect(hasErrors.value).toBe(true)
    })

    it('should reactively update when errors added', () => {
      const { hasErrors, addValidationError } = useEventPersistence()

      expect(hasErrors.value).toBe(false)

      addValidationError('offset', 'Error')
      expect(hasErrors.value).toBe(true)

      addValidationError('window', 'Error 2')
      expect(hasErrors.value).toBe(true)
    })

    it('should reactively update when errors cleared', () => {
      const { hasErrors, addValidationError, clearValidationError } = useEventPersistence()

      addValidationError('offset', 'Error 1')
      addValidationError('window', 'Error 2')
      expect(hasErrors.value).toBe(true)

      clearValidationError('offset')
      expect(hasErrors.value).toBe(true)

      clearValidationError('window')
      expect(hasErrors.value).toBe(false)
    })

    it('should reactively update when all errors cleared', () => {
      const { hasErrors, addValidationError, clearAllValidationErrors } = useEventPersistence()

      addValidationError('offset', 'Error')
      expect(hasErrors.value).toBe(true)

      clearAllValidationErrors()
      expect(hasErrors.value).toBe(false)
    })
  })

  describe('getError', () => {
    it('should return error message for existing field', () => {
      const { addValidationError, getError } = useEventPersistence()

      addValidationError('offset', 'Offset must be positive')

      expect(getError('offset')).toBe('Offset must be positive')
    })

    it('should return undefined for non-existent field', () => {
      const { addValidationError, getError } = useEventPersistence()

      addValidationError('offset', 'Error')

      expect(getError('non-existent')).toBeUndefined()
    })

    it('should return undefined when no errors exist', () => {
      const { getError } = useEventPersistence()

      expect(getError('offset')).toBeUndefined()
    })

    it('should return correct error for multiple fields', () => {
      const { addValidationError, getError } = useEventPersistence()

      addValidationError('offset', 'Offset error')
      addValidationError('window', 'Window error')
      addValidationError('conceptSet', 'Concept set error')

      expect(getError('offset')).toBe('Offset error')
      expect(getError('window')).toBe('Window error')
      expect(getError('conceptSet')).toBe('Concept set error')
    })

    it('should return undefined after error cleared', () => {
      const { addValidationError, clearValidationError, getError } = useEventPersistence()

      addValidationError('offset', 'Error')
      expect(getError('offset')).toBe('Error')

      clearValidationError('offset')
      expect(getError('offset')).toBeUndefined()
    })
  })

  describe('State Reactivity', () => {
    it('should have reactive state object', () => {
      const { state, switchStrategy } = useEventPersistence()

      expect(state.strategy).toBe('CONTINUOUS_OBSERVATION')

      switchStrategy('FIXED_DURATION')
      expect(state.strategy).toBe('FIXED_DURATION')
    })

    it('should maintain reactivity on nested properties', () => {
      const { state, switchStrategy } = useEventPersistence()

      switchStrategy('FIXED_DURATION')

      state.fixedDuration.offset = 100
      expect(state.fixedDuration.offset).toBe(100)

      state.fixedDuration.dateField = 'END_DATE'
      expect(state.fixedDuration.dateField).toBe('END_DATE')
    })

    it('should maintain reactivity on drug exposure properties', () => {
      const { state, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')

      state.drugExposure.conceptSetId = 'test-id'
      expect(state.drugExposure.conceptSetId).toBe('test-id')

      state.drugExposure.persistenceWindow = 60
      expect(state.drugExposure.persistenceWindow).toBe(60)

      state.drugExposure.surveillanceWindow = 21
      expect(state.drugExposure.surveillanceWindow).toBe(21)
    })

    it('should maintain reactivity on validation errors Map', () => {
      const { state, addValidationError, clearValidationError } = useEventPersistence()

      expect(state.validationErrors.size).toBe(0)

      addValidationError('test', 'error')
      expect(state.validationErrors.size).toBe(1)

      clearValidationError('test')
      expect(state.validationErrors.size).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle negative offset values', () => {
      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('FIXED_DURATION')
      state.fixedDuration.offset = -30

      const result = toExitCriteria([])

      expect(result.offset).toBe(-30)
    })

    it('should handle very large offset values', () => {
      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('FIXED_DURATION')
      state.fixedDuration.offset = 999999

      const result = toExitCriteria([])

      expect(result.offset).toBe(999999)
    })

    it('should handle zero windows for drug exposure', () => {
      const conceptSets: ConceptSetReference[] = [
        { id: 1, name: 'Drug' }
      ]

      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = '1'
      state.drugExposure.persistenceWindow = 0
      state.drugExposure.surveillanceWindow = 0

      const result = toExitCriteria(conceptSets)

      expect(result.persistenceWindow).toBe(0)
      expect(result.surveillanceWindow).toBe(0)
    })

    it('should handle very large window values', () => {
      const conceptSets: ConceptSetReference[] = [
        { id: 1, name: 'Drug' }
      ]

      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = '1'
      state.drugExposure.persistenceWindow = 999999
      state.drugExposure.surveillanceWindow = 999999

      const result = toExitCriteria(conceptSets)

      expect(result.persistenceWindow).toBe(999999)
      expect(result.surveillanceWindow).toBe(999999)
    })

    it('should handle empty string concept set id', () => {
      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = ''

      const result = toExitCriteria([{ id: '', name: 'Empty ID' }])

      expect(result.conceptSet).toBeUndefined()
    })

    it('should handle concept set id type mismatch', () => {
      // Testing edge case where concept set IDs could be both number and string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conceptSets: any[] = [
        { id: 1, name: 'Numeric' },
        { id: '1', name: 'String' }
      ]

      const { state, toExitCriteria, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = '1'

      const result = toExitCriteria(conceptSets)

      // Should match the first one since both would match string '1'
      expect(result.conceptSet).toBeDefined()
    })

    it('should handle empty validation error message', () => {
      const { addValidationError, getError } = useEventPersistence()

      addValidationError('field', '')

      expect(getError('field')).toBe('')
    })

    it('should handle special characters in field names', () => {
      const { addValidationError, getError, clearValidationError } = useEventPersistence()

      const fieldName = 'field.with.dots[0]'
      addValidationError(fieldName, 'Error')

      expect(getError(fieldName)).toBe('Error')

      clearValidationError(fieldName)
      expect(getError(fieldName)).toBeUndefined()
    })
  })

  describe('Multiple Instances', () => {
    it('should maintain independent state across instances', () => {
      const instance1 = useEventPersistence()
      const instance2 = useEventPersistence()

      instance1.switchStrategy('FIXED_DURATION')
      instance1.state.fixedDuration.offset = 50

      instance2.switchStrategy('CONTINUOUS_DRUG')
      instance2.state.drugExposure.persistenceWindow = 60

      expect(instance1.state.strategy).toBe('FIXED_DURATION')
      expect(instance1.state.fixedDuration.offset).toBe(50)

      expect(instance2.state.strategy).toBe('CONTINUOUS_DRUG')
      expect(instance2.state.drugExposure.persistenceWindow).toBe(60)
    })

    it('should maintain independent validation errors across instances', () => {
      const instance1 = useEventPersistence()
      const instance2 = useEventPersistence()

      instance1.addValidationError('offset', 'Error 1')
      instance2.addValidationError('window', 'Error 2')

      expect(instance1.state.validationErrors.size).toBe(1)
      expect(instance1.getError('offset')).toBe('Error 1')
      expect(instance1.getError('window')).toBeUndefined()

      expect(instance2.state.validationErrors.size).toBe(1)
      expect(instance2.getError('window')).toBe('Error 2')
      expect(instance2.getError('offset')).toBeUndefined()
    })

    it('should initialize instances with different initial criteria', () => {
      const criteria1: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        offset: 30
      }

      const criteria2: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 1, name: 'Drug' },
        persistenceWindow: 45
      }

      const instance1 = useEventPersistence(criteria1)
      const instance2 = useEventPersistence(criteria2)

      expect(instance1.state.strategy).toBe('FIXED_DURATION')
      expect(instance1.state.fixedDuration.offset).toBe(30)

      expect(instance2.state.strategy).toBe('CONTINUOUS_DRUG')
      expect(instance2.state.drugExposure.conceptSetId).toBe('1')
      expect(instance2.state.drugExposure.persistenceWindow).toBe(45)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete workflow: initialize -> modify -> validate -> convert', () => {
      const conceptSets: ConceptSetReference[] = [
        { id: 1, name: 'Diabetes Drugs' }
      ]

      const initialCriteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 1, name: 'Diabetes Drugs' },
        persistenceWindow: 30,
        surveillanceWindow: 7
      }

      const { state, addValidationError, clearAllValidationErrors, hasErrors, toExitCriteria } =
        useEventPersistence(initialCriteria)

      // Verify initialization
      expect(state.strategy).toBe('CONTINUOUS_DRUG')
      expect(state.drugExposure.conceptSetId).toBe('1')

      // Modify state
      state.drugExposure.persistenceWindow = 45

      // Add validation errors
      addValidationError('persistenceWindow', 'Must be between 0 and 365')
      expect(hasErrors.value).toBe(true)

      // Clear errors
      clearAllValidationErrors()
      expect(hasErrors.value).toBe(false)

      // Convert to criteria
      const result = toExitCriteria(conceptSets)
      expect(result).toEqual({
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 1, name: 'Diabetes Drugs' },
        persistenceWindow: 45,
        surveillanceWindow: 7
      })
    })

    it('should handle strategy switching with state preservation', () => {
      const conceptSets: ConceptSetReference[] = [
        { id: 1, name: 'Drug' }
      ]

      const { state, switchStrategy, toExitCriteria } = useEventPersistence()

      // Start with FIXED_DURATION
      switchStrategy('FIXED_DURATION')
      state.fixedDuration.offset = 90
      state.fixedDuration.dateField = 'END_DATE'

      let result = toExitCriteria(conceptSets)
      expect(result.strategy).toBe('FIXED_DURATION')
      expect(result.offset).toBe(90)
      expect(result.dateField).toBe('END_DATE')

      // Switch to CONTINUOUS_DRUG
      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = '1'
      state.drugExposure.persistenceWindow = 60

      result = toExitCriteria(conceptSets)
      expect(result.strategy).toBe('CONTINUOUS_DRUG')
      expect(result.conceptSet?.id).toBe(1)
      expect(result.persistenceWindow).toBe(60)

      // Switch to CONTINUOUS_OBSERVATION
      switchStrategy('CONTINUOUS_OBSERVATION')

      result = toExitCriteria(conceptSets)
      expect(result.strategy).toBe('CONTINUOUS_OBSERVATION')
      expect(result.offset).toBeUndefined()
      expect(result.conceptSet).toBeUndefined()
    })
  })
})
