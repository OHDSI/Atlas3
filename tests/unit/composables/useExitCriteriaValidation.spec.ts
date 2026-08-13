import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { ref, computed, nextTick } from 'vue'
import type { CohortExpression, EndStrategy } from '@/components/cohort-editor/circe.types'
import type { ValidationWarning } from '@/models/cohort-validation.types'

vi.mock('@/services/cohort-definition.service', () => ({
  validateCohortDefinition: vi.fn(),
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
let useExitCriteriaValidation: typeof import('@/composables/useExitCriteriaValidation').useExitCriteriaValidation
let useCohortValidation: typeof import('@/composables/useCohortValidation').useCohortValidation

beforeAll(async () => {
  vi.resetModules()
  cohortDefService = await import('@/services/cohort-definition.service')
  useExitCriteriaValidation = (await import('@/composables/useExitCriteriaValidation'))
    .useExitCriteriaValidation
  useCohortValidation = (await import('@/composables/useCohortValidation')).useCohortValidation
})

describe('useExitCriteriaValidation', () => {
  describe('validateEndStrategy — no strategy', () => {
    it('reports nothing when the cohort has no end strategy', () => {
      const { validateEndStrategy } = useExitCriteriaValidation()

      expect(validateEndStrategy(undefined)).toEqual([])
      expect(validateEndStrategy(null)).toEqual([])
    })
  })

  describe('validateEndStrategy — CustomEra requires a drug concept set', () => {
    it('reports nothing for a CustomEra strategy carrying a DrugCodesetId', () => {
      const { validateEndStrategy } = useExitCriteriaValidation()

      const strategy: EndStrategy = {
        CustomEra: { DrugCodesetId: 3, GapDays: 30, Offset: 0 },
      }

      expect(validateEndStrategy(strategy)).toEqual([])
    })

    it('reports exactly one finding naming DrugCodesetId when it is absent', () => {
      const { validateEndStrategy } = useExitCriteriaValidation()

      const strategy: EndStrategy = {
        CustomEra: { GapDays: 30, Offset: 0 },
      }

      const findings = validateEndStrategy(strategy)

      expect(findings).toHaveLength(1)
      expect(findings[0]!.message).toContain('DrugCodesetId')
      expect(findings[0]!.severity).toBe('CRITICAL')
      expect(findings[0]!.type).toBe('DefaultWarning')
    })

    it('reports a finding when DrugCodesetId is explicitly null', () => {
      const { validateEndStrategy } = useExitCriteriaValidation()

      const findings = validateEndStrategy({ CustomEra: { DrugCodesetId: null } })

      expect(findings).toHaveLength(1)
      expect(findings[0]!.message).toContain('DrugCodesetId')
    })

    it('accepts codeset id 0 as a real selection', () => {
      const { validateEndStrategy } = useExitCriteriaValidation()

      expect(validateEndStrategy({ CustomEra: { DrugCodesetId: 0 } })).toEqual([])
    })
  })

  describe('validateEndStrategy — DateOffset requires an offset', () => {
    it('reports nothing for a DateOffset strategy carrying an Offset', () => {
      const { validateEndStrategy } = useExitCriteriaValidation()

      const strategy: EndStrategy = {
        DateOffset: { DateField: 'StartDate', Offset: 30 },
      }

      expect(validateEndStrategy(strategy)).toEqual([])
    })

    it('reports exactly one finding naming Offset when it is absent', () => {
      const { validateEndStrategy } = useExitCriteriaValidation()

      const strategy: EndStrategy = {
        DateOffset: { DateField: 'StartDate' },
      }

      const findings = validateEndStrategy(strategy)

      expect(findings).toHaveLength(1)
      expect(findings[0]!.message).toContain('Offset')
      expect(findings[0]!.severity).toBe('CRITICAL')
    })

    it('reports a finding when Offset is explicitly null', () => {
      const { validateEndStrategy } = useExitCriteriaValidation()

      const findings = validateEndStrategy({ DateOffset: { Offset: null } })

      expect(findings).toHaveLength(1)
      expect(findings[0]!.message).toContain('Offset')
    })

    it('accepts an offset of 0 days', () => {
      const { validateEndStrategy } = useExitCriteriaValidation()

      expect(validateEndStrategy({ DateOffset: { DateField: 'EndDate', Offset: 0 } })).toEqual([])
    })
  })

  describe('validateExpression', () => {
    it('reports nothing for an expression without an end strategy', () => {
      const { validateExpression } = useExitCriteriaValidation()

      expect(validateExpression({})).toEqual([])
    })

    it('surfaces the CustomEra finding from a whole expression', () => {
      const { validateExpression } = useExitCriteriaValidation()

      const expression: CohortExpression = {
        EndStrategy: { CustomEra: { GapDays: 0 } },
      }

      const findings = validateExpression(expression)

      expect(findings).toHaveLength(1)
      expect(findings[0]!.message).toContain('DrugCodesetId')
    })
  })
})

describe('exit criteria rules surface through useCohortValidation', () => {
  function createOptions(expression: CohortExpression) {
    return {
      cohortName: ref('Test Cohort'),
      cohortDescription: ref('Test Description'),
      cohortId: computed(() => null),
      expression: ref<CohortExpression>(expression),
      debounceDelay: 100,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exposes an incomplete CustomEra strategy as a CRITICAL warning in the UI-facing state', async () => {
    vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({
      success: true,
      data: { warnings: [] },
    })

    const options = createOptions({ EndStrategy: { CustomEra: { GapDays: 30 } } })
    const { validationWarnings, groupedWarningsBySeverity, highestSeverity, highestSeverityColor, cancelValidation } =
      useCohortValidation(options)

    cancelValidation()
    options.cohortName.value = 'Changed Name'
    await nextTick()
    await vi.runAllTimersAsync()
    await nextTick()

    expect(validationWarnings.value).toHaveLength(1)
    expect(validationWarnings.value[0]!.message).toContain('DrugCodesetId')
    expect(groupedWarningsBySeverity.value.CRITICAL).toHaveLength(1)
    expect(highestSeverity.value).toBe('CRITICAL')
    expect(highestSeverityColor.value).toBe('error')

    cancelValidation()
  })

  it('exposes an incomplete DateOffset strategy alongside server warnings', async () => {
    const serverWarnings: ValidationWarning[] = [
      { type: 'DefaultWarning', severity: 'INFO', message: 'Server note' },
    ]
    vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({
      success: true,
      data: { warnings: serverWarnings },
    })

    const options = createOptions({ EndStrategy: { DateOffset: { DateField: 'StartDate' } } })
    const { validationWarnings, cancelValidation } = useCohortValidation(options)

    cancelValidation()
    options.cohortName.value = 'Changed Name'
    await nextTick()
    await vi.runAllTimersAsync()
    await nextTick()

    expect(validationWarnings.value).toHaveLength(2)
    expect(validationWarnings.value.some(w => w.message.includes('Offset'))).toBe(true)
    expect(validationWarnings.value.some(w => w.message === 'Server note')).toBe(true)

    cancelValidation()
  })

  it('adds no warning when the end strategy is complete', async () => {
    vi.mocked(cohortDefService.validateCohortDefinition).mockResolvedValue({
      success: true,
      data: { warnings: [] },
    })

    const options = createOptions({ EndStrategy: { CustomEra: { DrugCodesetId: 7, GapDays: 30 } } })
    const { validationWarnings, cancelValidation } = useCohortValidation(options)

    cancelValidation()
    options.cohortName.value = 'Changed Name'
    await nextTick()
    await vi.runAllTimersAsync()
    await nextTick()

    expect(validationWarnings.value).toEqual([])

    cancelValidation()
  })

  it('keeps the exit criteria finding when the server validation call fails', async () => {
    vi.mocked(cohortDefService.validateCohortDefinition).mockRejectedValue(new Error('API Error'))

    const options = createOptions({ EndStrategy: { CustomEra: {} } })
    const { validationWarnings, cancelValidation } = useCohortValidation(options)

    cancelValidation()
    options.cohortName.value = 'Changed Name'
    await nextTick()
    await vi.runAllTimersAsync()
    await nextTick()

    expect(validationWarnings.value).toHaveLength(1)
    expect(validationWarnings.value[0]!.message).toContain('DrugCodesetId')

    cancelValidation()
  })
})
