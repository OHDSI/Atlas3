import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { ref, computed, nextTick } from 'vue'
import type { CohortEvent, InclusionRule, CriteriaGroup, ExitCriteria, QualifyingLimit } from '@/models/cohort.types'
import type { ValidationWarning } from '@/models/cohort-validation.types'

vi.mock('@/services/cohort-definition.service', () => ({
  validateCohortDefinition: vi.fn(),
}))

vi.mock('@/services/atlas-converter', () => ({
  convertInternalToAtlas: vi.fn(() => ({ expression: {} })),
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
      entryEvents: ref<CohortEvent[]>([
        {
          id: 'entry-1',
          criteriaType: 'ConditionOccurrence',
          conceptSet: { id: 1, name: 'Test Concept Set' },
          attributes: [],
        },
      ]),
      additionalCriteria: ref<CriteriaGroup | undefined>(undefined),
      inclusionRules: ref<InclusionRule[]>([]),
      exitCriteria: ref<ExitCriteria>({
        exitType: 'fixedDuration',
        duration: { value: 0, unit: 'days' },
      }),
      censoringCriteria: ref<CohortEvent[]>([]),
      observationPeriod: ref({ priorDays: 0, postDays: 0 }),
      qualifyingLimit: ref<QualifyingLimit>({ type: 'First' }),
      inclusionQualifyingLimit: ref<QualifyingLimit>({ type: 'First' }),
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
    it('should extract concept sets from entry events', () => {
      const options = createTestOptions({
        entryEvents: ref([
          {
            id: 'entry-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 1, name: 'Condition Set' },
            attributes: [],
          },
        ]),
      })

      const { usedConceptSets } = useCohortValidation(options)

      expect(usedConceptSets.value).toHaveLength(1)
      expect(usedConceptSets.value[0].name).toBe('Condition Set')
    })

    it('should extract concept sets from additional criteria', () => {
      const options = createTestOptions({
        additionalCriteria: ref<CriteriaGroup>({
          id: 'group-1',
          logicType: 'ALL',
          events: [
            {
              id: 'add-1',
              criteriaType: 'DrugExposure',
              conceptSet: { id: 2, name: 'Drug Set' },
              attributes: [],
            },
          ],
        }),
      })

      const { usedConceptSets } = useCohortValidation(options)

      expect(usedConceptSets.value.some(cs => cs.name === 'Drug Set')).toBe(true)
    })

    it('should extract concept sets from inclusion rules', () => {
      const options = createTestOptions({
        inclusionRules: ref([
          {
            id: 'rule-1',
            name: 'Test Rule',
            criteriaGroups: [
              {
                id: 'group-1',
                logicType: 'ALL',
                events: [
                  {
                    id: 'inc-1',
                    criteriaType: 'ProcedureOccurrence',
                    conceptSet: { id: 3, name: 'Procedure Set' },
                    attributes: [],
                  },
                ],
              },
            ],
          },
        ]),
      })

      const { usedConceptSets } = useCohortValidation(options)

      expect(usedConceptSets.value.some(cs => cs.name === 'Procedure Set')).toBe(true)
    })

    it('should extract concept sets from exit criteria', () => {
      const options = createTestOptions({
        exitCriteria: ref<ExitCriteria>({
          exitType: 'drugExposure',
          conceptSet: { id: 4, name: 'Exit Drug Set' },
        }),
      })

      const { usedConceptSets } = useCohortValidation(options)

      expect(usedConceptSets.value.some(cs => cs.name === 'Exit Drug Set')).toBe(true)
    })

    it('should extract concept sets from censoring criteria', () => {
      const options = createTestOptions({
        censoringCriteria: ref([
          {
            id: 'censor-1',
            criteriaType: 'Death',
            conceptSet: { id: 5, name: 'Death Set' },
            attributes: [],
          },
        ]),
      })

      const { usedConceptSets } = useCohortValidation(options)

      expect(usedConceptSets.value.some(cs => cs.name === 'Death Set')).toBe(true)
    })

    it('should deduplicate concept sets by name', () => {
      const options = createTestOptions({
        entryEvents: ref([
          {
            id: 'entry-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 1, name: 'Shared Set' },
            attributes: [],
          },
        ]),
        censoringCriteria: ref([
          {
            id: 'censor-1',
            criteriaType: 'Death',
            conceptSet: { id: 1, name: 'Shared Set' },
            attributes: [],
          },
        ]),
      })

      const { usedConceptSets } = useCohortValidation(options)

      const sharedSets = usedConceptSets.value.filter(cs => cs.name === 'Shared Set')
      expect(sharedSets).toHaveLength(1)
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
      const { cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()

      await vi.runAllTimersAsync()
      await nextTick()

      const calls = vi.mocked(cohortDefService.validateCohortDefinition).mock.calls
      if (calls.length > 0) {
        expect(calls[0][0]).toBe('Untitled Cohort')
      }
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

    it('surfaces an ApiResult failure as a DefaultWarning rather than silently clearing warnings', async () => {
      // validateCohortDefinition itself never rejects post-migration — an
      // HTTP/network failure resolves as { success: false }. The old
      // contract folded that into a synthetic warning so the user saw
      // *something*; the composable must reproduce that, not go quiet.
      const { ApiError } = await import('@/services/api-error')
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({
        success: false,
        error: new ApiError('Network error', 0, null),
      })

      const options = createTestOptions()
      const { validationWarnings, triggerValidation, cancelValidation } = useCohortValidation(options)

      cancelValidation()
      vi.mocked(cohortDefService.validateCohortDefinition).mockClear()
      vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({
        success: false,
        error: new ApiError('Network error', 0, null),
      })

      triggerValidation()
      await vi.runAllTimersAsync()
      await nextTick()

      expect(validationWarnings.value).toHaveLength(1)
      expect(validationWarnings.value[0]?.type).toBe('DefaultWarning')
      expect(validationWarnings.value[0]?.message).toContain('Network error')
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
