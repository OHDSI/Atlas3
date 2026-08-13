import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { ref, reactive, computed, nextTick } from 'vue'
import { ApiError } from '@/services/api-error'
import type { CohortExpression } from '@/components/cohort-editor/circe.types'
import type { ValidationWarning } from '@/models/cohort-validation.types'

vi.mock('@/services/cohort-definition.service', () => ({
  validateCohortDefinition: vi.fn(),
}))

vi.mock('@/services/concept-set.service', () => ({
  getConceptSetById: vi.fn(() => Promise.resolve({ items: [] })),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

let cohortDefService: typeof import('@/services/cohort-definition.service')
let useCohortValidation: typeof import('@/composables/useCohortValidation').useCohortValidation
let CohortValidationOptions: import('@/composables/useCohortValidation').CohortValidationOptions

beforeAll(async () => {
  vi.resetModules()
  cohortDefService = await import('@/services/cohort-definition.service')
  const mod = await import('@/composables/useCohortValidation')
  useCohortValidation = mod.useCohortValidation
})

describe('useCohortValidation', () => {
  function createTestOptions(overrides: Partial<typeof CohortValidationOptions> = {}) {
    return {
      cohortName: ref('Test Cohort'),
      cohortDescription: ref('Test Description'),
      cohortId: computed(() => null),
      expression: ref<CohortExpression>({}),
      debounceDelay: 100,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with empty validation warnings', () => {
      const options = createTestOptions()
      const { validationWarnings } = useCohortValidation(options)

      expect(validationWarnings.value).toEqual([])
    })

    it('should initialize with isValidating as false', () => {
      const options = createTestOptions()
      const { isValidating } = useCohortValidation(options)

      expect(isValidating.value).toBe(false)
    })

    it('should initialize with validationStatus as unvalidated', () => {
      const options = createTestOptions()
      const { validationStatus } = useCohortValidation(options)

      expect(validationStatus.value).toBe('unvalidated')
    })
  })

  describe('validationStatus', () => {
    it('distinguishes a never-validated cohort from one that validated clean', async () => {
      // Both states present zero warnings; a boolean in-flight flag cannot
      // tell them apart, which is exactly the bug a gate reading zero
      // findings as "safe to generate" would fall for.
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({
        success: true,
        data: { warnings: [] },
      })

      const options = createTestOptions()
      const { validationStatus, validationWarnings, triggerValidation, cancelValidation } =
        useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({
        success: true,
        data: { warnings: [] },
      })

      expect(validationWarnings.value).toEqual([])
      expect(validationStatus.value).toBe('unvalidated')

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(validationWarnings.value).toEqual([])
      expect(validationStatus.value).toBe('validated')
    })

    it('reports validating while a validation request is in flight', async () => {
      let resolveValidation: (value: { success: true; data: { warnings: ValidationWarning[] } }) => void
      const pending = new Promise<{ success: true; data: { warnings: ValidationWarning[] } }>(resolve => {
        resolveValidation = resolve
      })
      vi.mocked(cohortDefService.validateCohortDefinition).mockReturnValue(pending)

      const options = createTestOptions()
      const { validationStatus, triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockReturnValue(pending)

      triggerValidation()
      await vi.advanceTimersByTimeAsync(100)

      expect(validationStatus.value).toBe('validating')

      resolveValidation!({ success: true, data: { warnings: [] } })
      await vi.runAllTimersAsync()
      await nextTick()

      expect(validationStatus.value).toBe('validated')
    })

    it('marks validationStatus as validated after a failed request resolves (fallback ran)', async () => {
      vi.mocked(cohortDefService.validateCohortDefinition).mockRejectedValue(new Error('API Error'))

      const options = createTestOptions()
      const { validationStatus, triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockRejectedValue(new Error('API Error'))

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(validationStatus.value).toBe('validated')
    })

    it('returns to unvalidated when resetValidation is called for a new definition', async () => {
      // The composable outlives the definition it validated: the editor stays
      // mounted across a version preview or a change of :id. Without a reset the
      // previous definition's verdict and warning list keep answering for the
      // new one.
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({
        success: true,
        data: {
          warnings: [
            { type: 'DefaultWarning', severity: 'CRITICAL', message: 'broken' },
          ] as ValidationWarning[],
        },
      })

      const options = createTestOptions()
      const { validationStatus, validationWarnings, triggerValidation, resetValidation } =
        useCohortValidation(options)

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(validationStatus.value).toBe('validated')
      expect(validationWarnings.value).toHaveLength(1)

      resetValidation()

      expect(validationStatus.value).toBe('unvalidated')
      expect(validationWarnings.value).toEqual([])
    })
  })

  describe('groupedWarningsBySeverity', () => {
    it('should group warnings by severity level', async () => {
      const warnings: ValidationWarning[] = [
        { type: 'DefaultWarning', severity: 'CRITICAL', message: 'Critical issue' },
        { type: 'DefaultWarning', severity: 'WARNING', message: 'Warning issue' },
        { type: 'DefaultWarning', severity: 'INFO', message: 'Info message' },
        { type: 'DefaultWarning', severity: 'WARNING', message: 'Another warning' },
      ]

      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      const options = createTestOptions()
      const { groupedWarningsBySeverity, triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(groupedWarningsBySeverity.value.CRITICAL).toHaveLength(1)
      expect(groupedWarningsBySeverity.value.WARNING).toHaveLength(2)
      expect(groupedWarningsBySeverity.value.INFO).toHaveLength(1)
    })

    it('should return empty arrays when no warnings', () => {
      const options = createTestOptions()
      const { groupedWarningsBySeverity } = useCohortValidation(options)

      expect(groupedWarningsBySeverity.value.CRITICAL).toEqual([])
      expect(groupedWarningsBySeverity.value.WARNING).toEqual([])
      expect(groupedWarningsBySeverity.value.INFO).toEqual([])
    })
  })

  describe('highestSeverity', () => {
    it('should return null when no warnings', () => {
      const options = createTestOptions()
      const { highestSeverity } = useCohortValidation(options)

      expect(highestSeverity.value).toBeNull()
    })

    it('should return CRITICAL when critical warnings present', async () => {
      const warnings: ValidationWarning[] = [
        { type: 'DefaultWarning', severity: 'INFO', message: 'Info' },
        { type: 'DefaultWarning', severity: 'CRITICAL', message: 'Critical' },
        { type: 'DefaultWarning', severity: 'WARNING', message: 'Warning' },
      ]

      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      const options = createTestOptions()
      const { highestSeverity, triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(highestSeverity.value).toBe('CRITICAL')
    })

    it('should return WARNING when no critical but warning present', async () => {
      const warnings: ValidationWarning[] = [
        { type: 'DefaultWarning', severity: 'INFO', message: 'Info' },
        { type: 'DefaultWarning', severity: 'WARNING', message: 'Warning' },
      ]

      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      const options = createTestOptions()
      const { highestSeverity, triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(highestSeverity.value).toBe('WARNING')
    })

    it('should return INFO when only info warnings present', async () => {
      const warnings: ValidationWarning[] = [
        { type: 'DefaultWarning', severity: 'INFO', message: 'Info' },
      ]

      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      const options = createTestOptions()
      const { highestSeverity, triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(highestSeverity.value).toBe('INFO')
    })
  })

  describe('highestSeverityColor', () => {
    it('should return info when no warnings', () => {
      const options = createTestOptions()
      const { highestSeverityColor } = useCohortValidation(options)

      expect(highestSeverityColor.value).toBe('info')
    })

    it('should return error for CRITICAL severity', async () => {
      const warnings: ValidationWarning[] = [
        { type: 'DefaultWarning', severity: 'CRITICAL', message: 'Critical' },
      ]

      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      const options = createTestOptions()
      const { highestSeverityColor, triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(highestSeverityColor.value).toBe('error')
    })

    it('should return warning for WARNING severity', async () => {
      const warnings: ValidationWarning[] = [
        { type: 'DefaultWarning', severity: 'WARNING', message: 'Warning' },
      ]

      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      const options = createTestOptions()
      const { highestSeverityColor, triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(highestSeverityColor.value).toBe('warning')
    })
  })

  describe('usedConceptSets', () => {
    // usedConceptSets now derives from the CohortExpression (circe-native):
    // it walks the expression graph to find referenced CodesetIds, then filters
    // expression.ConceptSets to those that are actually used.

    it('should extract concept sets from primary criteria (entry events)', () => {
      const expression = reactive<CohortExpression>({
        ConceptSets: [{ id: 1, name: 'Condition Set' }],
        PrimaryCriteria: {
          CriteriaList: [{ ConditionOccurrence: { CodesetId: 1 } }],
        },
      })
      const options = createTestOptions({ expression })
      const { usedConceptSets } = useCohortValidation(options)

      expect(usedConceptSets.value).toHaveLength(1)
      expect(usedConceptSets.value[0]!.name).toBe('Condition Set')
    })

    it('should extract concept sets from additional criteria', () => {
      const expression = reactive<CohortExpression>({
        ConceptSets: [{ id: 2, name: 'Drug Set' }],
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 2 } } }],
        },
      })
      const options = createTestOptions({ expression })
      const { usedConceptSets } = useCohortValidation(options)

      expect(usedConceptSets.value.some(cs => cs.name === 'Drug Set')).toBe(true)
    })

    it('should extract concept sets from inclusion rules', () => {
      const expression = reactive<CohortExpression>({
        ConceptSets: [{ id: 3, name: 'Procedure Set' }],
        InclusionRules: [
          {
            name: 'Test Rule',
            expression: {
              Type: 'ALL',
              CriteriaList: [{ Criteria: { ProcedureOccurrence: { CodesetId: 3 } } }],
            },
          },
        ],
      })
      const options = createTestOptions({ expression })
      const { usedConceptSets } = useCohortValidation(options)

      expect(usedConceptSets.value.some(cs => cs.name === 'Procedure Set')).toBe(true)
    })

    it('should extract concept sets from exit strategy (drug era end)', () => {
      const expression = reactive<CohortExpression>({
        ConceptSets: [{ id: 4, name: 'Exit Drug Set' }],
        EndStrategy: {
          CustomEra: { DrugCodesetId: 4, GapDays: 0 },
        },
      })
      const options = createTestOptions({ expression })
      const { usedConceptSets } = useCohortValidation(options)

      expect(usedConceptSets.value.some(cs => cs.name === 'Exit Drug Set')).toBe(true)
    })

    it('should extract concept sets from censoring criteria', () => {
      const expression = reactive<CohortExpression>({
        ConceptSets: [{ id: 5, name: 'Death Set' }],
        CensoringCriteria: [{ Death: { CodesetId: 5 } }],
      })
      const options = createTestOptions({ expression })
      const { usedConceptSets } = useCohortValidation(options)

      expect(usedConceptSets.value.some(cs => cs.name === 'Death Set')).toBe(true)
    })

    it('should deduplicate: same concept set referenced from multiple criteria appears once', () => {
      // Same CodesetId referenced from both primary criteria and censoring criteria.
      const expression = reactive<CohortExpression>({
        ConceptSets: [{ id: 1, name: 'Shared Set' }],
        PrimaryCriteria: {
          CriteriaList: [{ ConditionOccurrence: { CodesetId: 1 } }],
        },
        CensoringCriteria: [{ ConditionOccurrence: { CodesetId: 1 } }],
      })
      const options = createTestOptions({ expression })
      const { usedConceptSets } = useCohortValidation(options)

      const sharedSets = usedConceptSets.value.filter(cs => cs.name === 'Shared Set')
      expect(sharedSets).toHaveLength(1)
    })

    it('should follow expression ref replacement when the cohort expression is reloaded', async () => {
      const expression = ref<CohortExpression>({
        ConceptSets: [{ id: 1, name: 'Initial Set' }],
        PrimaryCriteria: {
          CriteriaList: [{ ConditionOccurrence: { CodesetId: 1 } }],
        },
      })
      const options = createTestOptions({ expression })
      const { usedConceptSets } = useCohortValidation(options)

      expect(usedConceptSets.value.some(cs => cs.name === 'Initial Set')).toBe(true)

      expression.value = {
        ConceptSets: [{ id: 2, name: 'Reloaded Set' }],
        PrimaryCriteria: {
          CriteriaList: [{ DrugExposure: { CodesetId: 2 } }],
        },
      }

      await nextTick()

      expect(usedConceptSets.value.some(cs => cs.name === 'Reloaded Set')).toBe(true)
      expect(usedConceptSets.value.some(cs => cs.name === 'Initial Set')).toBe(false)
    })
  })

  describe('triggerValidation', () => {
    it('should debounce validation calls', async () => {
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings: [] } })

      const options = createTestOptions()
      const { triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()

      triggerValidation()
      triggerValidation()
      triggerValidation()

      expect(cohortDefService.validateCohortDefinition).not.toHaveBeenCalled()

      await vi.runAllTimersAsync()
      await nextTick()

      expect(cohortDefService.validateCohortDefinition).toHaveBeenCalledTimes(1)
    })

    it('should validate with placeholder name when cohort name is empty', async () => {
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings: [] } })
      const options = createTestOptions({
        cohortName: ref(''),
      })
      const { triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      const calls = vi.mocked(cohortDefService.validateCohortDefinition).mock.calls
      expect(calls).toHaveLength(1)
      expect(calls[0][0]).toBe('Untitled Cohort')
    })

    it('should validate even when no entry events', async () => {
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings: [] } })
      const options = createTestOptions({
        entryEvents: ref([]),
      })
      const { triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(cohortDefService.validateCohortDefinition).toHaveBeenCalled()
    })

    it('should set validation warnings from API response', async () => {
      const warnings: ValidationWarning[] = [
        { type: 'DefaultWarning', severity: 'WARNING', message: 'Test warning' },
      ]
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      const options = createTestOptions()
      const { validationWarnings, triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(validationWarnings.value).toEqual(warnings)
    })

    it('should drop stale warnings when the API returns a failed result', async () => {
      const warnings: ValidationWarning[] = [
        { type: 'DefaultWarning', severity: 'WARNING', message: 'Stale warning' },
      ]
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      const options = createTestOptions()
      const { validationWarnings, isValidating, triggerValidation, cancelValidation } =
        useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      const hasStaleWarning = () =>
        validationWarnings.value.some(w => w.message === 'Stale warning')

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()
      expect(hasStaleWarning()).toBe(true)

      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({
        success: false,
        error: new ApiError('HTTP 500: <html>Internal Server Error</html>', 500, null),
      })

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(hasStaleWarning()).toBe(false)
      expect(isValidating.value).toBe(false)

      // A failed result is not a thrown error: it must resolve through the
      // success ternary, never the catch block that logs.
      const { logger } = await import('@/utils/logger')
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should clear warnings when validation fails', async () => {
      vi.mocked(cohortDefService.validateCohortDefinition).mockRejectedValue(new Error('API Error'))

      const options = createTestOptions()
      const { validationWarnings, triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockRejectedValue(new Error('API Error'))

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(validationWarnings.value).toEqual([])
    })
  })

  describe('cancelValidation', () => {
    it('should cancel pending validation', async () => {
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings: [] } })

      const options = createTestOptions()
      const { triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()

      triggerValidation()

      vi.advanceTimersByTime(50)
      cancelValidation()
      vi.advanceTimersByTime(100)
      await vi.runAllTimersAsync()

      expect(cohortDefService.validateCohortDefinition).not.toHaveBeenCalled()
    })
  })

  describe('clearWarnings', () => {
    it('should clear all validation warnings', async () => {
      const warnings: ValidationWarning[] = [
        { type: 'DefaultWarning', severity: 'WARNING', message: 'Test warning' },
      ]
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      const options = createTestOptions()
      const { validationWarnings, triggerValidation, clearWarnings, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings } })

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()
      expect(validationWarnings.value).toHaveLength(1)

      clearWarnings()
      expect(validationWarnings.value).toEqual([])
    })
  })

  describe('auto-validation on changes', () => {
    it('should auto-trigger validation when cohort name changes', async () => {
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({ success: true, data: { warnings: [] } })

      const cohortName = ref('Initial Name')
      const options = createTestOptions({ cohortName })
      const { cancelValidation } = useCohortValidation(options)

      cancelValidation()
      await vi.runAllTimersAsync()
      await nextTick()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()

      cohortName.value = 'Updated Name'
      await nextTick()

      await vi.runAllTimersAsync()
      await nextTick()

      expect(cohortDefService.validateCohortDefinition).toHaveBeenCalled()
    })
  })
})
