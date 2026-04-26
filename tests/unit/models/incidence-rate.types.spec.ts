import { describe, it, expect } from 'vitest'
import {
  IncidenceRateSchema,
  IncidenceRateExpressionSchema,
  StratifyRuleSchema,
  TimeAtRiskSchema,
  StudyWindowSchema,
  IncidenceRateExecutionInfoSchema,
  IncidenceRateInfoBySourceSchema,
  IncidenceRateReportSchema,
  IR_DEFAULTS,
  IR_AUTO_SAVE_INTERVAL_MS,
  IR_GENERATION_POLL_MS,
  STORAGE_KEY_INCIDENCE_RATE_DRAFT,
} from '@/models/incidence-rate.types'
import sampleIR from '../../../tests/fixtures/incidence-rates/sample-ir.json'

describe('Incidence Rate schemas', () => {
  it('parses a complete IR JSON fixture', () => {
    const parsed = IncidenceRateSchema.parse(sampleIR)
    expect(parsed.name).toBe(sampleIR.name)
    expect(parsed.expression.targetIds).toEqual([101, 102])
    expect(parsed.expression.strata).toHaveLength(1)
  })

  it('rejects an expression missing required fields', () => {
    const r = IncidenceRateExpressionSchema.safeParse({})
    expect(r.success).toBe(false)
  })

  it('accepts the omitted optional studyWindow', () => {
    const expr = { ...sampleIR.expression }
    delete (expr as Record<string, unknown>).studyWindow
    const r = IncidenceRateExpressionSchema.safeParse(expr)
    expect(r.success).toBe(true)
  })

  it('TimeAtRiskSchema enforces enum on DateField', () => {
    const r = TimeAtRiskSchema.safeParse({
      start: { DateField: 'Bogus', Offset: 0 },
      end:   { DateField: 'EndDate', Offset: 1 },
    })
    expect(r.success).toBe(false)
  })

  it('StratifyRuleSchema accepts pass-through CriteriaGroup', () => {
    const r = StratifyRuleSchema.parse({
      name: 'X',
      expression: { Type: 'ALL', CriteriaList: [] },
    })
    expect(r.name).toBe('X')
  })

  it('StudyWindowSchema requires both dates when set', () => {
    const r = StudyWindowSchema.safeParse({ startDate: '2020-01-01' })
    expect(r.success).toBe(false)
  })

  it('IncidenceRateExecutionInfoSchema is lenient on extra fields', () => {
    const r = IncidenceRateExecutionInfoSchema.safeParse({
      id: { analysisId: 1, sourceId: 2 },
      status: 'COMPLETE',
      somethingExtra: true,
    })
    expect(r.success).toBe(true)
  })

  it('IncidenceRateInfoBySourceSchema defaults summaryList to []', () => {
    const r = IncidenceRateInfoBySourceSchema.parse({
      executionInfo: {
        id: { analysisId: 1, sourceId: 2 }, status: 'PENDING',
      },
    })
    expect(r.summaryList).toEqual([])
  })

  it('IncidenceRateReportSchema parses summary + treemapData JSON string', () => {
    const r = IncidenceRateReportSchema.parse({
      summary: {
        targetId: 1, outcomeId: 2,
        totalPersons: 100, cases: 5,
        timeAtRisk: 1000, proportion: 5, rate: 5,
      },
      stratifyStats: [],
      treemapData: '{}',
    })
    expect(r.treemapData).toBe('{}')
  })

  it('exposes the expected constants', () => {
    expect(IR_DEFAULTS.timeAtRisk.start.DateField).toBe('StartDate')
    expect(IR_AUTO_SAVE_INTERVAL_MS).toBe(30000)
    expect(IR_GENERATION_POLL_MS).toBe(5000)
    expect(STORAGE_KEY_INCIDENCE_RATE_DRAFT).toBe('atlas3_incidence_rate_draft')
  })
})
