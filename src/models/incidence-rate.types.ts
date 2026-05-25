/**
 * Incidence Rate Types
 * OHDSI Incidence Rate analysis types with Zod validation.
 *
 * The JSON shape mirrors Atlas 2.15 verbatim so designs interoperate.
 */
import { z } from 'zod'
import { TagSchema } from '@/models/webapi.types'
import { ConceptSetSchema } from '@/models/concept-set.types'
import { userSchema } from '@/components/versions/schemas'

// ─── building blocks ──────────────────────────────────────────────────────

export const DateFieldSchema = z.enum(['StartDate', 'EndDate'])
export type DateField = z.infer<typeof DateFieldSchema>

export const FieldOffsetSchema = z.object({
  DateField: DateFieldSchema,
  Offset: z.number().int(),
})
export type FieldOffset = z.infer<typeof FieldOffsetSchema>

export const TimeAtRiskSchema = z.object({
  start: FieldOffsetSchema,
  end: FieldOffsetSchema,
})
export type TimeAtRisk = z.infer<typeof TimeAtRiskSchema>

export const StudyWindowSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
})
export type StudyWindow = z.infer<typeof StudyWindowSchema>

// CriteriaGroup is intentionally pass-through: the cohort-builder
// CriteriaGroupEditor component will validate its own contents.
export const StratifyRuleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  expression: z.any(), // CriteriaGroup; validated visually by CriteriaGroupEditor
})
export type StratifyRule = z.infer<typeof StratifyRuleSchema>

// ─── expression ───────────────────────────────────────────────────────────

export const IncidenceRateExpressionSchema = z
  .object({
    ConceptSets: z.array(ConceptSetSchema.passthrough()).default([]),
    targetIds: z.array(z.number().int()).default([]),
    outcomeIds: z.array(z.number().int()).default([]),
    timeAtRisk: TimeAtRiskSchema,
    studyWindow: StudyWindowSchema.optional(),
    strata: z.array(StratifyRuleSchema).default([]),
  })
  .passthrough()
export type IncidenceRateExpression = z.infer<typeof IncidenceRateExpressionSchema>

// ─── definition ───────────────────────────────────────────────────────────

// In-memory shape used by the editor. The OHDSI WebAPI sends `expression`
// as a serialized JSON string on the wire and accepts it the same way on
// save — the (de)serialization happens at the webapi.ts boundary.
export const IncidenceRateSchema = z
  .object({
    id: z.number().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    expression: IncidenceRateExpressionSchema,
    hashCode: z.union([z.string(), z.number()]).optional(),
    tags: z.array(TagSchema).default([]),
    createdBy: userSchema.optional(),
    createdDate: z.union([z.string(), z.number()]).optional(),
    modifiedBy: userSchema.optional(),
    modifiedDate: z.union([z.string(), z.number()]).optional(),
    hasReadAccess: z.boolean().optional(),
    hasWriteAccess: z.boolean().optional(),
  })
  .passthrough()
export type IncidenceRate = z.infer<typeof IncidenceRateSchema>

// Lightweight summary for list views (id required, expression optional).
export const IncidenceRateSummarySchema = IncidenceRateSchema.omit({ expression: true }).extend({
  id: z.number(),
  expression: IncidenceRateExpressionSchema.optional(),
})
export type IncidenceRateSummary = z.infer<typeof IncidenceRateSummarySchema>

// Wire shape — what /ir/ endpoints actually return: `expression` is a
// JSON string (possibly absent on the list endpoint).
export const IncidenceRateWireSchema = IncidenceRateSchema.omit({
  expression: true,
  name: true,
}).extend({
  name: z.string(),
  expression: z.string().optional(),
})
export type IncidenceRateWire = z.infer<typeof IncidenceRateWireSchema>

// ─── execution / report ───────────────────────────────────────────────────

export const IncidenceRateStatusSchema = z.string()
// Accepts both Atlas 2.15 'COMPLETE' and modern 'COMPLETED' for portability.
export const IR_TERMINAL_STATUSES = new Set(['COMPLETE', 'COMPLETED', 'FAILED', 'CANCELED'])

export const IncidenceRateExecutionInfoSchema = z
  .object({
    id: z.object({
      analysisId: z.number(),
      sourceId: z.number(),
    }),
    status: IncidenceRateStatusSchema,
    startTime: z.union([z.number(), z.string()]).nullish(),
    executionDuration: z.number().nullish(),
    isValid: z.boolean().nullish(),
    isCanceled: z.boolean().nullish(),
    message: z.string().nullish(),
  })
  .passthrough()
export type IncidenceRateExecutionInfo = z.infer<typeof IncidenceRateExecutionInfoSchema>

export const IncidenceRateSummaryStatsSchema = z
  .object({
    targetId: z.number(),
    outcomeId: z.number(),
    totalPersons: z.number(),
    cases: z.number(),
    timeAtRisk: z.number(),
    proportion: z.number().default(0),
    rate: z.number().default(0),
  })
  .passthrough()
  .transform(s => ({
    ...s,
    proportion: s.proportion || (s.totalPersons > 0 ? s.cases / s.totalPersons : 0),
    rate: s.rate || (s.timeAtRisk > 0 ? s.cases / (s.timeAtRisk / 365.25) : 0),
  }))
export type IncidenceRateSummaryStats = z.infer<typeof IncidenceRateSummaryStatsSchema>

export const IncidenceRateInfoBySourceSchema = z
  .object({
    executionInfo: IncidenceRateExecutionInfoSchema,
    summaryList: z.array(IncidenceRateSummaryStatsSchema).default([]),
  })
  .passthrough()
export type IncidenceRateInfoBySource = z.infer<typeof IncidenceRateInfoBySourceSchema>

export const IncidenceRateInfoListSchema = z.array(IncidenceRateInfoBySourceSchema)

export const IncidenceRateStratifyStatSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    totalPersons: z.number(),
    cases: z.number(),
    timeAtRisk: z.number(),
  })
  .passthrough()
export type IncidenceRateStratifyStat = z.infer<typeof IncidenceRateStratifyStatSchema>

const EMPTY_IR_SUMMARY: IncidenceRateSummaryStats = {
  targetId: 0,
  outcomeId: 0,
  totalPersons: 0,
  cases: 0,
  timeAtRisk: 0,
  proportion: 0,
  rate: 0,
}

export const IncidenceRateReportSchema = z
  .object({
    summary: IncidenceRateSummaryStatsSchema.nullable().transform(s => s ?? EMPTY_IR_SUMMARY),
    stratifyStats: z.array(IncidenceRateStratifyStatSchema).default([]),
    treemapData: z.string().default(''),
  })
  .passthrough()
export type IncidenceRateReport = z.infer<typeof IncidenceRateReportSchema>

// ─── constants & options ──────────────────────────────────────────────────

export const IR_DEFAULTS: { timeAtRisk: TimeAtRisk } = {
  timeAtRisk: {
    start: { DateField: 'StartDate', Offset: 0 },
    end: { DateField: 'EndDate', Offset: 0 },
  },
}

export const RATE_MULTIPLIER_OPTIONS = [1, 10, 100, 1_000, 10_000, 100_000] as const
export type RateMultiplier = (typeof RATE_MULTIPLIER_OPTIONS)[number]

export const STORAGE_KEY_INCIDENCE_RATE_DRAFT = 'atlas3_incidence_rate_draft'
export const IR_AUTO_SAVE_INTERVAL_MS = 30000
export const IR_GENERATION_POLL_MS = 5000
