/**
 * Atlas JSON Types
 * OHDSI Atlas 2.x cohort definition JSON structure (PascalCase)
 * For bidirectional conversion with internal types (camelCase)
 */

/**
 * Root Atlas cohort definition structure
 * Note: Atlas uses PascalCase for field names
 */
/**
 * Atlas additional criteria structure
 */
export interface AtlasAdditionalCriteria {
  Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  CriteriaList: AtlasCriteria[]
  DemographicCriteriaList: Record<string, unknown>[]
  Groups: AtlasCriteria[]
}

/**
 * Atlas expression limit
 */
export interface AtlasExpressionLimit {
  Type: string
}

/**
 * Atlas collapse settings
 */
export interface AtlasCollapseSettings {
  CollapseType: string
  EraPad: number
}

/**
 * Atlas censor window — plain ISO date strings (yyyy-mm-dd) or null.
 * Per Atlas 2.15 (`InputTypes/Period.js`), CensorWindow is NOT the
 * date-field+offset structure used elsewhere; it's literal calendar
 * dates that left/right-censor cohort start/end dates.
 */
export interface AtlasCensorWindow {
  StartDate?: string | null
  EndDate?: string | null
}

export interface AtlasCohortDefinition {
  id?: number
  name: string
  description?: string
  createdBy?: unknown
  createdDate?: number
  modifiedBy?: unknown
  modifiedDate?: number
  tags?: Array<{ id?: number; name: string; color?: string }>
  ConceptSets: AtlasConceptSet[]
  PrimaryCriteria: AtlasPrimaryCriteria
  AdditionalCriteria?: AtlasAdditionalCriteria
  QualifiedLimit?: AtlasQualifiedLimit
  ExpressionLimit?: AtlasExpressionLimit
  InclusionRules?: AtlasInclusionRule[]
  CensoringCriteria?: AtlasCensoringCriteria[]
  EndStrategy?: AtlasEndStrategy
  CollapseSettings?: AtlasCollapseSettings
  CensorWindow?: AtlasCensorWindow
  cdmVersionRange?: string
}

/**
 * WebAPI cohort definition wrapper format
 * The API may return either the expression directly or wrapped in an object
 */
export interface AtlasCohortDefinitionWrapper {
  id?: number
  name?: string
  description?: string
  tags?: Array<{ id?: number; name: string; color?: string }>
  expression: AtlasCohortDefinition | string
}

/**
 * Type that can accept both direct expression or wrapped format
 */
export type AtlasCohortDefinitionInput = AtlasCohortDefinition | AtlasCohortDefinitionWrapper

/**
 * Type guard to check if input is a wrapper with expression property
 */
export function isAtlasCohortDefinitionWrapper(
  input: AtlasCohortDefinitionInput
): input is AtlasCohortDefinitionWrapper {
  return (
    'expression' in input &&
    (typeof input.expression === 'object' || typeof input.expression === 'string')
  )
}

export interface AtlasConceptSet {
  id: number
  name: string
  expression: {
    items: AtlasConceptSetItem[]
  }
}

export interface AtlasConceptSetItem {
  concept: {
    CONCEPT_ID: number
    CONCEPT_NAME: string
    CONCEPT_CODE?: string
    DOMAIN_ID?: string
    VOCABULARY_ID?: string
    CONCEPT_CLASS_ID?: string
    STANDARD_CONCEPT?: string
    STANDARD_CONCEPT_CAPTION?: string
    INVALID_REASON?: string | null
    INVALID_REASON_CAPTION?: string
  }
  isExcluded?: boolean
  includeDescendants?: boolean
  includeMapped?: boolean
}

export interface AtlasPrimaryCriteria {
  CriteriaList: AtlasCriteria[]
  ObservationWindow?: {
    PriorDays: number
    PostDays: number
  }
  PrimaryCriteriaLimit?: {
    Type: 'All' | 'First' | 'Last'
  }
}

export interface AtlasCriteria {
  [key: string]: unknown // Criteria type specific fields
  Occurrence?: AtlasOccurrence // Cardinality
}

export interface AtlasOccurrence {
  Type: 0 | 1 | 2 // 0=EXACTLY, 1=AT_MOST, 2=AT_LEAST
  Count: number
  CountMethod?: string
  IsDistinct?: boolean
  CountColumn?: string
}

export interface AtlasCorrelatedCriteria {
  Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  Count?: number
  CriteriaList: AtlasCriteria[]
  DemographicCriteriaList?: Record<string, unknown>[]
  Groups?: AtlasGroup[]
}

export interface AtlasGroup {
  Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  Count?: number
  CriteriaList: AtlasCriteria[]
  DemographicCriteriaList?: Record<string, unknown>[]
  Groups?: AtlasGroup[] // CIRCE groups nest recursively (#112)
}

export interface AtlasQualifiedLimit {
  Type: 'First' | 'All' | 'Last'
}

export interface AtlasInclusionRule {
  name: string
  description?: string
  expression: {
    Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
    Count?: number
    CriteriaList: AtlasCriteria[]
    DemographicCriteriaList?: unknown[]
    Groups?: AtlasGroup[]
  }
}

export interface AtlasCensoringCriteria {
  [key: string]: unknown
}

export interface AtlasEndStrategy {
  DateOffset?: {
    DateField: 'StartDate' | 'EndDate'
    Offset: number
  }
  CustomEra?: {
    DrugCodesetId: number
    GapDays: number
    Offset: number
  }
}

/**
 * Operator mappings: Internal ↔ Atlas
 * Per contracts/atlas-json-schema.md
 */
export const OPERATOR_TO_ATLAS: Record<string, string> = {
  // Numeric and date operators
  GREATER_THAN: 'gt',
  LESS_THAN: 'lt',
  EQUAL: 'eq',
  NOT_EQUAL: '!eq',
  BETWEEN: 'bt',
  NOT_BETWEEN: '!bt',
  GREATER_THAN_OR_EQUAL: 'gte',
  LESS_THAN_OR_EQUAL: 'lte',

  // Text operators
  CONTAINS: 'contains',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith',
}

export const ATLAS_TO_OPERATOR: Record<string, string> = {
  // Numeric and date operators
  gt: 'GREATER_THAN',
  lt: 'LESS_THAN',
  eq: 'EQUAL',
  '!eq': 'NOT_EQUAL',
  bt: 'BETWEEN',
  '!bt': 'NOT_BETWEEN',
  gte: 'GREATER_THAN_OR_EQUAL',
  lte: 'LESS_THAN_OR_EQUAL',

  // Text operators
  contains: 'CONTAINS',
  startsWith: 'STARTS_WITH',
  endsWith: 'ENDS_WITH',
}

/**
 * Atlas attribute field name mappings (PascalCase)
 * Maps internal attributeKey to Atlas JSON field name
 */
export const ATTRIBUTE_KEY_TO_ATLAS: Record<string, string> = {
  // Numeric attributes
  age: 'Age',
  ageAtStart: 'AgeAtStart',
  ageAtEnd: 'AgeAtEnd',
  valueAsNumber: 'ValueAsNumber',
  visitLength: 'VisitLength',
  visitDetailLength: 'VisitDetailLength',
  eraLength: 'EraLength',
  quantity: 'Quantity',
  refills: 'Refills',
  daysSupply: 'DaysSupply',
  effectiveDrugDose: 'EffectiveDrugDose',
  rangeLow: 'RangeLow',
  rangeHigh: 'RangeHigh',
  rangeLowRatio: 'RangeLowRatio',
  rangeHighRatio: 'RangeHighRatio',
  doseValue: 'DoseValue',
  occurrenceCount: 'OccurrenceCount',
  gapDays: 'GapDays',
  periodLength: 'PeriodLength',
  placeOfServiceDistance: 'PlaceOfServiceDistance',

  // Concept attributes
  gender: 'Gender',
  race: 'Race',
  ethnicity: 'Ethnicity',
  visitType: 'VisitType',
  providerSpecialty: 'ProviderSpecialty',
  conditionType: 'ConditionType',
  conditionStatus: 'ConditionStatus',
  measurementType: 'MeasurementType',
  observationType: 'ObservationType',
  drugType: 'DrugType',
  procedureType: 'ProcedureType',
  deviceType: 'DeviceType',
  deathType: 'DeathType',
  specimenType: 'SpecimenType',
  unit: 'Unit',
  operator: 'Operator',
  valueAsConcept: 'ValueAsConcept',
  routeConcept: 'RouteConcept',
  doseUnit: 'DoseUnit',
  modifier: 'Modifier',
  qualifier: 'Qualifier',
  placeOfService: 'PlaceOfService',
  anatomicSite: 'AnatomicSite',
  diseaseStatus: 'DiseaseStatus',

  // Date attributes
  occurrenceStartDate: 'OccurrenceStartDate',
  occurrenceEndDate: 'OccurrenceEndDate',
  visitStartDate: 'VisitStartDate',
  visitEndDate: 'VisitEndDate',
  visitDetailStartDate: 'VisitDetailStartDate',
  visitDetailEndDate: 'VisitDetailEndDate',
  eraStartDate: 'EraStartDate',
  eraEndDate: 'EraEndDate',
  periodStartDate: 'PeriodStartDate',
  periodEndDate: 'PeriodEndDate',

  // LocationRegion date attributes
  startDate: 'StartDate',
  endDate: 'EndDate',

  // PayerPlanPeriod concept-set attributes
  payerConcept: 'PayerConcept',
  planConcept: 'PlanConcept',
  sponsorConcept: 'SponsorConcept',
  stopReasonConcept: 'StopReasonConcept',
  payerSourceConcept: 'PayerSourceConcept',
  planSourceConcept: 'PlanSourceConcept',
  sponsorSourceConcept: 'SponsorSourceConcept',
  stopReasonSourceConcept: 'StopReasonSourceConcept',

  // ObservationPeriod / VisitDetail type attributes
  periodType: 'PeriodType',
  visitDetailType: 'VisitDetailType',
  placeOfServiceLocation: 'PlaceOfServiceLocation',

  // Text attributes
  valueAsString: 'ValueAsString',
  sourceCode: 'SourceCode',
  stopReason: 'StopReason',
  sig: 'Sig',
  lotNumber: 'LotNumber',
  deviceId: 'UniqueDeviceId',
  sourceId: 'SourceId',

  // Boolean attributes
  first: 'First',
  primary: 'Primary',
  abnormal: 'Abnormal',
}

/**
 * Reverse mapping: Atlas field name to internal attributeKey
 */
export const ATLAS_TO_ATTRIBUTE_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(ATTRIBUTE_KEY_TO_ATLAS).map(([k, v]) => [v, k])
)

/**
 * Atlas concept structure (PascalCase)
 */
export interface AtlasConcept {
  CONCEPT_ID: number
  CONCEPT_NAME: string
  CONCEPT_CODE?: string
  DOMAIN_ID?: string
  VOCABULARY_ID?: string
  CONCEPT_CLASS_ID?: string
  STANDARD_CONCEPT?: string
  STANDARD_CONCEPT_CAPTION?: string
  INVALID_REASON?: string | null
  INVALID_REASON_CAPTION?: string
}

/**
 * Atlas range (for numeric/date ranges)
 */
export interface AtlasRange {
  Value: number | string
  Extent?: number | string
  Op: string
}

/**
 * Atlas temporal window
 */
export interface AtlasWindow {
  Start?: {
    Days: number | null
    Coeff: number
  }
  End?: {
    Days: number | null
    Coeff: number
  }
  UseEventEnd?: boolean
  UseIndexEnd?: boolean
}

/**
 * Atlas date adjustment
 */
export interface AtlasDateAdjustment {
  StartWith: 'START_DATE' | 'END_DATE'
  StartOffset: number
  EndWith: 'START_DATE' | 'END_DATE'
  EndOffset: number
}

/**
 * Atlas user defined period — CIRCE nests the custom range under this object,
 * not as flat PeriodStartDate/PeriodEndDate strings.
 */
export interface AtlasUserDefinedPeriod {
  StartDate: string
  EndDate: string
}

/**
 * Type for concept set items used in internal format
 */
export interface ConceptSetItem {
  conceptId: number
  conceptName: string
  domainId: string
  vocabularyId: string
  conceptClassId: string
  conceptCode?: string
  standardConcept?: string
  invalidReason?: string
  isExcluded?: boolean
  includeDescendants?: boolean
  includeMapped?: boolean
}

/**
 * Atlas criteria type object (the criteria-specific part)
 */
export interface AtlasCriteriaTypeObject {
  CorrelatedCriteria?: AtlasCorrelatedCriteria // Nested criteria (CIRCE nests it here, not on the wrapper)
  CodesetId?: number | null
  First?: boolean
  OccurrenceStartDate?: AtlasRange
  OccurrenceEndDate?: AtlasRange
  Age?: AtlasRange
  Gender?: AtlasConcept[]
  Race?: AtlasConcept[]
  Ethnicity?: AtlasConcept[]
  VisitType?: AtlasConcept[]
  ProviderSpecialty?: AtlasConcept[]
  ValueAsNumber?: AtlasRange
  ValueAsString?: { Text: string; Op: string }
  [key: string]: unknown
}
