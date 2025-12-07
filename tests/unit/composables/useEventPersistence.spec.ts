/**
 * useEventPersistence Composable Tests
 * Tests for event persistence strategy management
 */
import { describe, it, expect } from 'vitest'
import { useEventPersistence } from '@/composables/useEventPersistence'
import type { ExitCriteria, ConceptSetReference } from '@/models/cohort.types'

describe('useEventPersistence', () => {
  describe('initialization', () => {
    it('should initialize with default state when no criteria provided', () => {
      const { state } = useEventPersistence()

      expect(state.strategy).toBe('CONTINUOUS_OBSERVATION')
      expect(state.fixedDuration.dateField).toBe('START_DATE')
      expect(state.fixedDuration.offset).toBe(0)
      expect(state.drugExposure.conceptSetId).toBeNull()
      expect(state.drugExposure.persistenceWindow).toBe(30)
      expect(state.drugExposure.surveillanceWindow).toBe(7)
      expect(state.validationErrors.size).toBe(0)
    })

    it('should initialize from FIXED_DURATION criteria', () => {
      const criteria: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        dateField: 'END_DATE',
        offset: 90
      }

      const { state } = useEventPersistence(criteria)

      expect(state.strategy).toBe('FIXED_DURATION')
      expect(state.fixedDuration.dateField).toBe('END_DATE')
      expect(state.fixedDuration.offset).toBe(90)
    })

    it('should initialize from CONTINUOUS_DRUG criteria', () => {
      const criteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 123, name: 'Drug Concept Set' },
        persistenceWindow: 45,
        surveillanceWindow: 14
      }

      const { state } = useEventPersistence(criteria)

      expect(state.strategy).toBe('CONTINUOUS_DRUG')
      expect(state.drugExposure.conceptSetId).toBe('123')
      expect(state.drugExposure.persistenceWindow).toBe(45)
      expect(state.drugExposure.surveillanceWindow).toBe(14)
    })

    it('should use default values for missing fields', () => {
      const criteria: ExitCriteria = {
        strategy: 'FIXED_DURATION'
      }

      const { state } = useEventPersistence(criteria)

      expect(state.fixedDuration.dateField).toBe('START_DATE')
      expect(state.fixedDuration.offset).toBe(0)
    })
  })

  describe('switchStrategy', () => {
    it('should switch to FIXED_DURATION strategy', () => {
      const { state, switchStrategy } = useEventPersistence()

      switchStrategy('FIXED_DURATION')

      expect(state.strategy).toBe('FIXED_DURATION')
      expect(state.fixedDuration.dateField).toBe('START_DATE')
      expect(state.fixedDuration.offset).toBe(0)
    })

    it('should switch to CONTINUOUS_DRUG strategy', () => {
      const { state, switchStrategy } = useEventPersistence()

      switchStrategy('CONTINUOUS_DRUG')

      expect(state.strategy).toBe('CONTINUOUS_DRUG')
      expect(state.drugExposure.conceptSetId).toBeNull()
      expect(state.drugExposure.persistenceWindow).toBe(30)
      expect(state.drugExposure.surveillanceWindow).toBe(7)
    })

    it('should switch to CONTINUOUS_OBSERVATION strategy', () => {
      const { state, switchStrategy } = useEventPersistence()
      switchStrategy('FIXED_DURATION')

      switchStrategy('CONTINUOUS_OBSERVATION')

      expect(state.strategy).toBe('CONTINUOUS_OBSERVATION')
    })

    it('should clear validation errors when switching strategy', () => {
      const { state, switchStrategy, addValidationError } = useEventPersistence()
      addValidationError('offset', 'Invalid offset')

      expect(state.validationErrors.size).toBe(1)

      switchStrategy('CONTINUOUS_DRUG')

      expect(state.validationErrors.size).toBe(0)
    })
  })

  describe('toExitCriteria', () => {
    it('should convert CONTINUOUS_OBSERVATION state to criteria', () => {
      const { toExitCriteria } = useEventPersistence()

      const criteria = toExitCriteria([])

      expect(criteria.strategy).toBe('CONTINUOUS_OBSERVATION')
      expect(criteria.offset).toBeUndefined()
      expect(criteria.conceptSet).toBeUndefined()
    })

    it('should convert FIXED_DURATION state to criteria', () => {
      const { state, switchStrategy, toExitCriteria } = useEventPersistence()
      switchStrategy('FIXED_DURATION')
      state.fixedDuration.dateField = 'END_DATE'
      state.fixedDuration.offset = 30

      const criteria = toExitCriteria([])

      expect(criteria.strategy).toBe('FIXED_DURATION')
      expect(criteria.dateField).toBe('END_DATE')
      expect(criteria.offset).toBe(30)
    })

    it('should convert CONTINUOUS_DRUG state to criteria with concept set', () => {
      const { state, switchStrategy, toExitCriteria } = useEventPersistence()
      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = '123'
      state.drugExposure.persistenceWindow = 60
      state.drugExposure.surveillanceWindow = 21

      const conceptSets: ConceptSetReference[] = [
        { id: 123, name: 'Drug Concept Set' }
      ]

      const criteria = toExitCriteria(conceptSets)

      expect(criteria.strategy).toBe('CONTINUOUS_DRUG')
      expect(criteria.conceptSet).toEqual({ id: 123, name: 'Drug Concept Set' })
      expect(criteria.persistenceWindow).toBe(60)
      expect(criteria.surveillanceWindow).toBe(21)
    })

    it('should not include concept set if not found', () => {
      const { state, switchStrategy, toExitCriteria } = useEventPersistence()
      switchStrategy('CONTINUOUS_DRUG')
      state.drugExposure.conceptSetId = '999' // Non-existent

      const criteria = toExitCriteria([])

      expect(criteria.strategy).toBe('CONTINUOUS_DRUG')
      expect(criteria.conceptSet).toBeUndefined()
    })

    it('should not include concept set if conceptSetId is null', () => {
      const { switchStrategy, toExitCriteria } = useEventPersistence()
      switchStrategy('CONTINUOUS_DRUG')

      const criteria = toExitCriteria([{ id: 123, name: 'Test' }])

      expect(criteria.conceptSet).toBeUndefined()
    })
  })

  describe('validation errors', () => {
    it('should add validation error', () => {
      const { state, addValidationError } = useEventPersistence()

      addValidationError('offset', 'Offset must be positive')

      expect(state.validationErrors.get('offset')).toBe('Offset must be positive')
    })

    it('should clear specific validation error', () => {
      const { state, addValidationError, clearValidationError } = useEventPersistence()
      addValidationError('offset', 'Error 1')
      addValidationError('conceptSet', 'Error 2')

      clearValidationError('offset')

      expect(state.validationErrors.has('offset')).toBe(false)
      expect(state.validationErrors.has('conceptSet')).toBe(true)
    })

    it('should clear all validation errors', () => {
      const { state, addValidationError, clearAllValidationErrors } = useEventPersistence()
      addValidationError('offset', 'Error 1')
      addValidationError('conceptSet', 'Error 2')

      clearAllValidationErrors()

      expect(state.validationErrors.size).toBe(0)
    })

    it('should report hasErrors correctly', () => {
      const { hasErrors, addValidationError, clearAllValidationErrors } = useEventPersistence()

      expect(hasErrors.value).toBe(false)

      addValidationError('field', 'error')
      expect(hasErrors.value).toBe(true)

      clearAllValidationErrors()
      expect(hasErrors.value).toBe(false)
    })

    it('should get error for specific field', () => {
      const { addValidationError, getError } = useEventPersistence()
      addValidationError('offset', 'Invalid offset')

      expect(getError('offset')).toBe('Invalid offset')
      expect(getError('other')).toBeUndefined()
    })
  })
})
