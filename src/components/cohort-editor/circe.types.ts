/**
 * Circe TypeScript Type Definitions with Zod Validation
 *
 * This file contains Zod schemas that mirror the Java model from circe-be.
 * It represents the JSON structure produced by Jackson serialization of the
 * cohort expression domain model.
 *
 * Schemas are the source of truth. TypeScript types are inferred from schemas.
 * This ensures types and runtime validation stay in sync.
 *
 */

import { z } from 'zod'

/**
 * Supporting Type Schemas
 */

export const OffsetSchema = z.object({
  Days: z.number().nullish(),
  Coeff: z.number().optional(),
})
export type Offset = z.infer<typeof OffsetSchema>

export const WindowSchema = z.object({
  Start: OffsetSchema.optional(),
  End: OffsetSchema.optional(),
  UseIndexEnd: z.boolean().nullish(),
  UseEventEnd: z.boolean().nullish(),
})
export type Window = z.infer<typeof WindowSchema>

export const DateAdjustmentSchema = z.object({
  StartWith: z.enum(['START_DATE', 'END_DATE']).optional(),
  StartOffset: z.number().optional(),
  EndWith: z.enum(['START_DATE', 'END_DATE']).optional(),
  EndOffset: z.number().optional(),
})
export type DateAdjustment = z.infer<typeof DateAdjustmentSchema>

export const OccurrenceSchema = z.object({
  Type: z.number().optional(), // 0=EXACTLY, 1=AT_MOST, 2=AT_LEAST
  Count: z.number().optional(),
  IsDistinct: z.boolean().nullish(),
  CountColumn: z.enum([
    'DAYS_SUPPLY',
    'DOMAIN_CONCEPT',
    'DOMAIN_SOURCE_CONCEPT',
    'DURATION',
    'END_DATE',
    'ERA_OCCURRENCES',
    'GAP_DAYS',
    'QUANTITY',
    'RANGE_HIGH',
    'RANGE_LOW',
    'REFILLS',
    'START_DATE',
    'UNIT',
    'VALUE_AS_NUMBER',
    'VISIT_ID',
    'VISIT_DETAIL_ID',
  ]).nullish(),
})
export type Occurrence = z.infer<typeof OccurrenceSchema>

export const NumericRangeSchema = z.object({
  Value: z.number().nullish(),
  Op: z.enum(['lt', 'lte', 'eq', '!eq', 'gt', 'gte', 'bt', '!bt']).optional(),
  Extent: z.number().nullish(),
})
export type NumericRange = z.infer<typeof NumericRangeSchema>
export type NumericRangeOp = NonNullable<NumericRange['Op']>

export const DateRangeSchema = z.object({
  Value: z.string().nullish(),
  Op: z.enum(['lt', 'lte', 'eq', '!eq', 'gt', 'gte', 'bt', '!bt']).optional(),
  Extent: z.string().nullish(),
})
export type DateRange = z.infer<typeof DateRangeSchema>
export type DateRangeOp = NonNullable<DateRange['Op']>

export const TextFilterSchema = z.object({
  Value: z.string().nullish(),
  Op: z.enum(['endsWith', 'startsWith', 'contains', '!endsWith', '!startsWith', '!contains']).optional(),
})
export type TextFilter = z.infer<typeof TextFilterSchema>
export type TextFilterOp = NonNullable<TextFilter['Op']>

export const ResultLimitSchema = z.object({
  Type: z.enum(['All', 'First', 'Last']).optional(),
})
export type ResultLimit = z.infer<typeof ResultLimitSchema>

export const ConceptSchema = z.object({
  CONCEPT_ID: z.number(),
  CONCEPT_NAME: z.string().nullish(),
  CONCEPT_CODE: z.string().nullish(),
  STANDARD_CONCEPT: z.string().nullish(),
  STANDARD_CONCEPT_CAPTION: z.string().nullish(),
  VOCABULARY_ID: z.string().nullish(),
  DOMAIN_ID: z.string().nullish(),
  CONCEPT_CLASS_ID: z.string().nullish(),
  INVALID_REASON: z.string().nullish(),
  VALID_START_DATE: z.string().nullish(),
  VALID_END_DATE: z.string().nullish(),
  INVALID_REASON_CAPTION: z.string().nullish(),
})
export type Concept = z.infer<typeof ConceptSchema>

/**
 * ConceptSetIdSchema
 * Marks a plain number field as a reference to a ConceptSet.id (a "codeset id").
 * This is a shared schema instance (reused via `ConceptSetIdSchema.nullish()`) so that
 * a concept-set-id reference field can be identified at runtime by reference-equality
 * after unwrapping ZodOptional/ZodNullable — the same pattern used for ConceptSetSelectionSchema.
 */
export const ConceptSetIdSchema = z.number()

export const ConceptSetSelectionSchema = z.object({
  CodesetId: ConceptSetIdSchema.nullish(),
  IsExclusion: z.boolean().nullish(),
})
export type ConceptSetSelection = z.infer<typeof ConceptSetSelectionSchema>

/**
 * Concept or Concept Set reference - NO UNION
 * These are separate fields in Java, never combined
 */
export const ConceptArraySchema = z.array(ConceptSchema)
export type ConceptArray = z.infer<typeof ConceptArraySchema>

export const ConceptSetItemSchema = z.object({
  concept: ConceptSchema.optional(),
  isExcluded: z.boolean().nullish(),
  includeDescendants: z.boolean().nullish(),
  includeMapped: z.boolean().nullish(),
})
export type ConceptSetItem = z.infer<typeof ConceptSetItemSchema>

export const ConceptSetExpressionSchema = z.object({
  items: z.array(ConceptSetItemSchema).optional(),
})
export type ConceptSetExpression = z.infer<typeof ConceptSetExpressionSchema>

export const ConceptSetSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  expression: ConceptSetExpressionSchema.optional(),
})
export type ConceptSet = z.infer<typeof ConceptSetSchema>

export const ObservationFilterSchema = z.object({
  PriorDays: z.number().optional(),
  PostDays: z.number().optional(),
})
export type ObservationFilter = z.infer<typeof ObservationFilterSchema>

export const PeriodSchema = z.object({
  StartDate: z.string().optional(), // ISO 8601
  EndDate: z.string().optional(), // ISO 8601
})
export type Period = z.infer<typeof PeriodSchema>

export const CollapseSettingsSchema = z.object({
  CollapseType: z.enum(['ERA']).optional(),
  EraPad: z.number().optional(),
})
export type CollapseSettings = z.infer<typeof CollapseSettingsSchema>

/**
 * End Strategy Schemas
 * Polymorphic union using Jackson wrapper object serialization
 */

export const DateOffsetStrategySchema = z.object({
  DateField: z.enum(['StartDate', 'EndDate']).optional(),
  Offset: z.number().optional(),
})
export type DateOffsetStrategy = z.infer<typeof DateOffsetStrategySchema>

export const CustomEraStrategySchema = z.object({
  DrugCodesetId: ConceptSetIdSchema.nullish(),
  GapDays: z.number().optional(),
  Offset: z.number().optional(),
  DaysSupplyOverride: z.number().optional(),
})
export type CustomEraStrategy = z.infer<typeof CustomEraStrategySchema>

export const EndStrategySchema = z.union([
  z.object({ DateOffset: DateOffsetStrategySchema }),
  z.object({ CustomEra: CustomEraStrategySchema }),
])
export type EndStrategy = z.infer<typeof EndStrategySchema>

/**
 * Criteria Base Type
 * Contains common properties inherited by all event criteria
 */
const CriteriaBaseSchema = z.object({
  CorrelatedCriteria: z.lazy(() => CriteriaGroupSchema).nullish(),
  DateAdjustment: DateAdjustmentSchema.nullish(),
})

/**
 * Concrete Criteria Type Schemas
 * Each represents a specific event domain
 */

export const ConditionEraSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  First: z.boolean().nullish(),
  EraStartDate: DateRangeSchema.nullish(),
  EraEndDate: DateRangeSchema.nullish(),
  OccurrenceCount: NumericRangeSchema.nullish(),
  EraLength: NumericRangeSchema.nullish(),
  AgeAtStart: NumericRangeSchema.nullish(),
  AgeAtEnd: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
})
export type ConditionEra = z.infer<typeof ConditionEraSchema>

export const ConditionOccurrenceSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  First: z.boolean().nullish(),
  OccurrenceStartDate: DateRangeSchema.nullish(),
  OccurrenceEndDate: DateRangeSchema.nullish(),
  ConditionType: ConceptArraySchema.nullish(),
  ConditionTypeCS: ConceptSetSelectionSchema.nullish(),
  ConditionTypeExclude: z.boolean().nullish(),
  ConditionSourceConcept: ConceptSetIdSchema.nullish(),
  Age: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
  ProviderSpecialty: ConceptArraySchema.nullish(),
  ProviderSpecialtyCS: ConceptSetSelectionSchema.nullish(),
  VisitType: ConceptArraySchema.nullish(),
  VisitTypeCS: ConceptSetSelectionSchema.nullish(),
  ConditionStatus: ConceptArraySchema.nullish(),
  ConditionStatusCS: ConceptSetSelectionSchema.nullish(),
  StopReason: TextFilterSchema.nullish(),
})
export type ConditionOccurrence = z.infer<typeof ConditionOccurrenceSchema>

/**
 * Death Schema
 * Mirrors org.ohdsi.circe.cohortdefinition.Death (circe-be) exactly - see that class
 * for the authoritative field list. Do not add fields here that aren't on the Java class.
 */
export const DeathSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  OccurrenceStartDate: DateRangeSchema.nullish(),
  DeathType: ConceptArraySchema.nullish(),
  DeathTypeCS: ConceptSetSelectionSchema.nullish(),
  DeathTypeExclude: z.boolean().nullish(),
  DeathSourceConcept: ConceptSetIdSchema.nullish(),
  Age: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
})
export type Death = z.infer<typeof DeathSchema>

export const DeviceExposureSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  First: z.boolean().nullish(),
  OccurrenceStartDate: DateRangeSchema.nullish(),
  OccurrenceEndDate: DateRangeSchema.nullish(),
  DeviceType: ConceptArraySchema.nullish(),
  DeviceTypeCS: ConceptSetSelectionSchema.nullish(),
  DeviceTypeExclude: z.boolean().nullish(),
  UniqueDeviceId: TextFilterSchema.nullish(),
  Quantity: NumericRangeSchema.nullish(),
  DeviceSourceConcept: ConceptSetIdSchema.nullish(),
  Age: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
  ProviderSpecialty: ConceptArraySchema.nullish(),
  ProviderSpecialtyCS: ConceptSetSelectionSchema.nullish(),
  VisitType: ConceptArraySchema.nullish(),
  VisitTypeCS: ConceptSetSelectionSchema.nullish(),
})
export type DeviceExposure = z.infer<typeof DeviceExposureSchema>

export const DoseEraSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  First: z.boolean().nullish(),
  EraStartDate: DateRangeSchema.nullish(),
  EraEndDate: DateRangeSchema.nullish(),
  DoseValue: NumericRangeSchema.nullish(),
  Unit: ConceptArraySchema.nullish(),
  UnitCS: ConceptSetSelectionSchema.nullish(),
  EraLength: NumericRangeSchema.nullish(),
  AgeAtStart: NumericRangeSchema.nullish(),
  AgeAtEnd: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
})
export type DoseEra = z.infer<typeof DoseEraSchema>

export const DrugEraSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  First: z.boolean().nullish(),
  EraStartDate: DateRangeSchema.nullish(),
  EraEndDate: DateRangeSchema.nullish(),
  OccurrenceCount: NumericRangeSchema.nullish(),
  GapDays: NumericRangeSchema.nullish(),
  EraLength: NumericRangeSchema.nullish(),
  AgeAtStart: NumericRangeSchema.nullish(),
  AgeAtEnd: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
})
export type DrugEra = z.infer<typeof DrugEraSchema>

export const DrugExposureSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  First: z.boolean().nullish(),
  OccurrenceStartDate: DateRangeSchema.nullish(),
  OccurrenceEndDate: DateRangeSchema.nullish(),
  DrugType: ConceptArraySchema.nullish(),
  DrugTypeCS: ConceptSetSelectionSchema.nullish(),
  DrugTypeExclude: z.boolean().nullish(),
  DrugSourceConcept: ConceptSetIdSchema.nullish(),
  StopReason: TextFilterSchema.nullish(),
  Refills: NumericRangeSchema.nullish(),
  Quantity: NumericRangeSchema.nullish(),
  DaysSupply: NumericRangeSchema.nullish(),
  RouteConcept: ConceptArraySchema.nullish(),
  RouteConceptCS: ConceptSetSelectionSchema.nullish(),
  DoseUnit: ConceptArraySchema.nullish(),
  DoseUnitCS: ConceptSetSelectionSchema.nullish(),
  EffectiveDrugDose: NumericRangeSchema.nullish(),
  LotNumber: TextFilterSchema.nullish(),
  Age: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
  ProviderSpecialty: ConceptArraySchema.nullish(),
  ProviderSpecialtyCS: ConceptSetSelectionSchema.nullish(),
  VisitType: ConceptArraySchema.nullish(),
  VisitTypeCS: ConceptSetSelectionSchema.nullish(),
})
export type DrugExposure = z.infer<typeof DrugExposureSchema>

export const LocationRegionSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  StartDate: DateRangeSchema.nullish(),
  EndDate: DateRangeSchema.nullish(),
})
export type LocationRegion = z.infer<typeof LocationRegionSchema>

export const MeasurementSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  First: z.boolean().nullish(),
  OccurrenceStartDate: DateRangeSchema.nullish(),
  MeasurementType: ConceptArraySchema.nullish(),
  MeasurementTypeCS: ConceptSetSelectionSchema.nullish(),
  MeasurementTypeExclude: z.boolean().nullish(),
  Operator: ConceptArraySchema.nullish(),
  OperatorCS: ConceptSetSelectionSchema.nullish(),
  ValueAsNumber: NumericRangeSchema.nullish(),
  ValueAsConcept: ConceptArraySchema.nullish(),
  ValueAsConceptCS: ConceptSetSelectionSchema.nullish(),
  Unit: ConceptArraySchema.nullish(),
  UnitCS: ConceptSetSelectionSchema.nullish(),
  RangeHigh: NumericRangeSchema.nullish(),
  RangeLow: NumericRangeSchema.nullish(),
  RangeHighRatio: NumericRangeSchema.nullish(),
  RangeLowRatio: NumericRangeSchema.nullish(),
  Abnormal: z.boolean().nullish(),
  MeasurementSourceConcept: ConceptSetIdSchema.nullish(),
  Age: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
  ProviderSpecialty: ConceptArraySchema.nullish(),
  ProviderSpecialtyCS: ConceptSetSelectionSchema.nullish(),
  VisitType: ConceptArraySchema.nullish(),
  VisitTypeCS: ConceptSetSelectionSchema.nullish(),
})
export type Measurement = z.infer<typeof MeasurementSchema>

export const ObservationSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  First: z.boolean().nullish(),
  OccurrenceStartDate: DateRangeSchema.nullish(),
  ObservationType: ConceptArraySchema.nullish(),
  ObservationTypeCS: ConceptSetSelectionSchema.nullish(),
  ObservationTypeExclude: z.boolean().nullish(),
  ValueAsNumber: NumericRangeSchema.nullish(),
  ValueAsString: TextFilterSchema.nullish(),
  ValueAsConcept: ConceptArraySchema.nullish(),
  ValueAsConceptCS: ConceptSetSelectionSchema.nullish(),
  Qualifier: ConceptArraySchema.nullish(),
  QualifierCS: ConceptSetSelectionSchema.nullish(),
  Unit: ConceptArraySchema.nullish(),
  UnitCS: ConceptSetSelectionSchema.nullish(),
  ObservationSourceConcept: ConceptSetIdSchema.nullish(),
  Age: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
  ProviderSpecialty: ConceptArraySchema.nullish(),
  ProviderSpecialtyCS: ConceptSetSelectionSchema.nullish(),
  VisitType: ConceptArraySchema.nullish(),
  VisitTypeCS: ConceptSetSelectionSchema.nullish(),
})
export type Observation = z.infer<typeof ObservationSchema>

export const ObservationPeriodSchema = CriteriaBaseSchema.extend({
  First: z.boolean().nullish(),
  PeriodStartDate: DateRangeSchema.nullish(),
  PeriodEndDate: DateRangeSchema.nullish(),
  UserDefinedPeriod: PeriodSchema.nullish(),
  PeriodType: ConceptArraySchema.nullish(),
  PeriodTypeCS: ConceptSetSelectionSchema.nullish(),
  PeriodLength: NumericRangeSchema.nullish(),
  AgeAtStart: NumericRangeSchema.nullish(),
  AgeAtEnd: NumericRangeSchema.nullish(),
})
export type ObservationPeriod = z.infer<typeof ObservationPeriodSchema>

export const PayerPlanPeriodSchema = CriteriaBaseSchema.extend({
  First: z.boolean().nullish(),
  PeriodStartDate: DateRangeSchema.nullish(),
  PeriodEndDate: DateRangeSchema.nullish(),
  UserDefinedPeriod: PeriodSchema.nullish(),
  PeriodLength: NumericRangeSchema.nullish(),
  AgeAtStart: NumericRangeSchema.nullish(),
  AgeAtEnd: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
  PayerConcept: ConceptSetIdSchema.nullish(),
  PlanConcept: ConceptSetIdSchema.nullish(),
  SponsorConcept: ConceptSetIdSchema.nullish(),
  StopReasonConcept: ConceptSetIdSchema.nullish(),
  PayerSourceConcept: ConceptSetIdSchema.nullish(),
  PlanSourceConcept: ConceptSetIdSchema.nullish(),
  SponsorSourceConcept: ConceptSetIdSchema.nullish(),
  StopReasonSourceConcept: ConceptSetIdSchema.nullish(),
})
export type PayerPlanPeriod = z.infer<typeof PayerPlanPeriodSchema>

export const ProcedureOccurrenceSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  First: z.boolean().nullish(),
  OccurrenceStartDate: DateRangeSchema.nullish(),
  ProcedureType: ConceptArraySchema.nullish(),
  ProcedureTypeCS: ConceptSetSelectionSchema.nullish(),
  ProcedureTypeExclude: z.boolean().nullish(),
  Modifier: ConceptArraySchema.nullish(),
  ModifierCS: ConceptSetSelectionSchema.nullish(),
  ProcedureSourceConcept: ConceptSetIdSchema.nullish(),
  Age: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
  ProviderSpecialty: ConceptArraySchema.nullish(),
  ProviderSpecialtyCS: ConceptSetSelectionSchema.nullish(),
  VisitType: ConceptArraySchema.nullish(),
  VisitTypeCS: ConceptSetSelectionSchema.nullish(),
})
export type ProcedureOccurrence = z.infer<typeof ProcedureOccurrenceSchema>

export const SpecimenSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  First: z.boolean().nullish(),
  OccurrenceStartDate: DateRangeSchema.nullish(),
  SpecimenType: ConceptArraySchema.nullish(),
  SpecimenTypeCS: ConceptSetSelectionSchema.nullish(),
  SpecimenTypeExclude: z.boolean().nullish(),
  SourceId: TextFilterSchema.nullish(),
  Unit: ConceptArraySchema.nullish(),
  UnitCS: ConceptSetSelectionSchema.nullish(),
  AnatomicSite: ConceptArraySchema.nullish(),
  AnatomicSiteCS: ConceptSetSelectionSchema.nullish(),
  DiseaseStatus: ConceptArraySchema.nullish(),
  DiseaseStatusCS: ConceptSetSelectionSchema.nullish(),
  SpecimenSourceConcept: ConceptSetIdSchema.nullish(),
  Age: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
  Quantity: NumericRangeSchema.nullish(),
})
export type Specimen = z.infer<typeof SpecimenSchema>

export const VisitDetailSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  First: z.boolean().nullish(),
  VisitDetailStartDate: DateRangeSchema.nullish(),
  VisitDetailEndDate: DateRangeSchema.nullish(),
  VisitDetailTypeCS: ConceptSetSelectionSchema.nullish(),
  VisitDetailSourceConcept: ConceptSetIdSchema.nullish(),
  VisitDetailLength: NumericRangeSchema.nullish(),
  Age: NumericRangeSchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
  ProviderSpecialtyCS: ConceptSetSelectionSchema.nullish(),
  PlaceOfServiceCS: ConceptSetSelectionSchema.nullish(),
  PlaceOfServiceLocation: ConceptSetIdSchema.nullish(),
})
export type VisitDetail = z.infer<typeof VisitDetailSchema>

export const VisitOccurrenceSchema = CriteriaBaseSchema.extend({
  CodesetId: ConceptSetIdSchema.nullish(),
  First: z.boolean().nullish(),
  OccurrenceStartDate: DateRangeSchema.nullish(),
  OccurrenceEndDate: DateRangeSchema.nullish(),
  VisitType: ConceptArraySchema.nullish(),
  VisitTypeCS: ConceptSetSelectionSchema.nullish(),
  VisitTypeExclude: z.boolean().nullish(),
  VisitSourceConcept: ConceptSetIdSchema.nullish(),
  VisitLength: NumericRangeSchema.nullish(),
  Age: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
  ProviderSpecialty: ConceptArraySchema.nullish(),
  ProviderSpecialtyCS: ConceptSetSelectionSchema.nullish(),
  PlaceOfService: ConceptArraySchema.nullish(),
  PlaceOfServiceCS: ConceptSetSelectionSchema.nullish(),
  PlaceOfServiceLocation: ConceptSetIdSchema.nullish(),
})
export type VisitOccurrence = z.infer<typeof VisitOccurrenceSchema>

/**
 * Polymorphic Criteria Union Type
 * Represents Jackson's wrapper object serialization
 */
export const CriteriaSchema = z.union([
  z.object({ ConditionEra: ConditionEraSchema }),
  z.object({ ConditionOccurrence: ConditionOccurrenceSchema }),
  z.object({ Death: DeathSchema }),
  z.object({ DeviceExposure: DeviceExposureSchema }),
  z.object({ DoseEra: DoseEraSchema }),
  z.object({ DrugEra: DrugEraSchema }),
  z.object({ DrugExposure: DrugExposureSchema }),
  z.object({ LocationRegion: LocationRegionSchema }),
  z.object({ Measurement: MeasurementSchema }),
  z.object({ Observation: ObservationSchema }),
  z.object({ ObservationPeriod: ObservationPeriodSchema }),
  z.object({ PayerPlanPeriod: PayerPlanPeriodSchema }),
  z.object({ ProcedureOccurrence: ProcedureOccurrenceSchema }),
  z.object({ Specimen: SpecimenSchema }),
  z.object({ VisitDetail: VisitDetailSchema }),
  z.object({ VisitOccurrence: VisitOccurrenceSchema }),
])
export type Criteria = z.infer<typeof CriteriaSchema>

export const CriteriaSchemaMap = {
  ConditionEra: ConditionEraSchema,
  ConditionOccurrence: ConditionOccurrenceSchema,
  Death: DeathSchema,
  DeviceExposure: DeviceExposureSchema,
  DoseEra: DoseEraSchema,
  DrugEra: DrugEraSchema,
  DrugExposure: DrugExposureSchema,
  LocationRegion: LocationRegionSchema,
  Measurement: MeasurementSchema,
  Observation: ObservationSchema,
  ObservationPeriod: ObservationPeriodSchema,
  PayerPlanPeriod: PayerPlanPeriodSchema,
  ProcedureOccurrence: ProcedureOccurrenceSchema,
  Specimen: SpecimenSchema,
  VisitDetail: VisitDetailSchema,
  VisitOccurrence: VisitOccurrenceSchema,
} as const
export type CriteriaWrapperKey = keyof typeof CriteriaSchemaMap

export function getCriteriaWrapperKey(criteria: Criteria): CriteriaWrapperKey {
  return Object.keys(criteria)[0] as CriteriaWrapperKey
}

/**
 * Demographic Criteria Schema
 */
export const DemographicCriteriaSchema = z.object({
  Age: NumericRangeSchema.nullish(),
  Gender: ConceptArraySchema.nullish(),
  GenderCS: ConceptSetSelectionSchema.nullish(),
  Race: ConceptArraySchema.nullish(),
  RaceCS: ConceptSetSelectionSchema.nullish(),
  Ethnicity: ConceptArraySchema.nullish(),
  EthnicityCS: ConceptSetSelectionSchema.nullish(),
  OccurrenceStartDate: DateRangeSchema.nullish(),
  OccurrenceEndDate: DateRangeSchema.nullish(),
})
export type DemographicCriteria = z.infer<typeof DemographicCriteriaSchema>

/**
 * Criteria Group Schema - Recursive Types
 * Uses z.lazy() to handle circular references
 * Types are declared first, then schemas are built around them
 */

/**
 * WindowedCriteria Base Class Schema
 * Represents the common properties for criteria positioned within a time window
 */
export interface WindowedCriteria {
  Criteria?: Criteria
  StartWindow?: Window
  EndWindow?: Window
  RestrictVisit?: boolean
  IgnoreObservationPeriod?: boolean
}

/**
 * CorelatedCriteria extends WindowedCriteria
 * Adds occurrence-count logic for boolean qualification
 */
export interface CorelatedCriteria extends WindowedCriteria {
  Occurrence?: Occurrence
}

export interface CriteriaGroup {
  Type?: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  Count?: number
  CriteriaList?: CorelatedCriteria[]
  DemographicCriteriaList?: DemographicCriteria[]
  Groups?: CriteriaGroup[]
}

/**
 * WindowedCriteria Schema
 * Base schema for criteria positioned within a time window
 * Uses z.lazy() to handle circular reference to Criteria
 */
export const WindowedCriteriaSchema: z.ZodType<WindowedCriteria> = z.lazy(() =>
  z.object({
    Criteria: CriteriaSchema.optional(),
    StartWindow: WindowSchema.nullish(),
    EndWindow: WindowSchema.nullish(),
    RestrictVisit: z.boolean().nullish(),
    IgnoreObservationPeriod: z.boolean().nullish(),
  }) as z.ZodType<WindowedCriteria>
)

/**
 * CorelatedCriteria Schema
 * Extends WindowedCriteria by adding occurrence-count logic
 * Uses composition via z.and() to build on the windowed base
 */
export const CorelatedCriteriaSchema: z.ZodType<CorelatedCriteria> = z.lazy(() =>
  WindowedCriteriaSchema.and(
    z.object({
      Occurrence: OccurrenceSchema.optional(),
    })
  ) as z.ZodType<CorelatedCriteria>
)

export const CriteriaGroupSchema: z.ZodType<CriteriaGroup> = z.lazy(() =>
  z.object({
    Type: z.enum(['ALL', 'ANY', 'AT_LEAST', 'AT_MOST']).optional(),
    Count: z.number().nullish(),
    CriteriaList: z.array(CorelatedCriteriaSchema).optional(),
    DemographicCriteriaList: z.array(DemographicCriteriaSchema).optional(),
    Groups: z.array(CriteriaGroupSchema).optional(),
  }) as z.ZodType<CriteriaGroup>
)

/**
 * Inclusion Rule Schema
 */
export const InclusionRuleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  expression: CriteriaGroupSchema.optional(),
})
export type InclusionRule = z.infer<typeof InclusionRuleSchema>

/**
 * Primary Criteria Schema
 */
export const PrimaryCriteriaSchema = z.object({
  CriteriaList: z.array(CriteriaSchema).optional(),
  ObservationWindow: ObservationFilterSchema.optional(),
  PrimaryCriteriaLimit: ResultLimitSchema.optional(),
})
export type PrimaryCriteria = z.infer<typeof PrimaryCriteriaSchema>

/**
 * Cohort Expression Schema - Root Object
 */
export const CohortExpressionSchema = z.object({
  Title: z.string().optional(),
  PrimaryCriteria: PrimaryCriteriaSchema.optional(),
  AdditionalCriteria: CriteriaGroupSchema.optional(),
  ConceptSets: z.array(ConceptSetSchema).optional(),
  QualifiedLimit: ResultLimitSchema.optional(),
  ExpressionLimit: ResultLimitSchema.optional(),
  InclusionRules: z.array(InclusionRuleSchema).optional(),
  EndStrategy: EndStrategySchema.optional(),
  CensoringCriteria: z.array(CriteriaSchema).optional(),
  CollapseSettings: CollapseSettingsSchema.optional(),
  CensorWindow: PeriodSchema.nullish(),
  cdmVersionRange: z.string().optional(),
})
export type CohortExpression = z.infer<typeof CohortExpressionSchema>
