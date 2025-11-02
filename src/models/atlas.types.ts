/**
 * Atlas JSON Types
 * OHDSI Atlas 2.x cohort definition JSON structure (PascalCase)
 * For bidirectional conversion with internal types (camelCase)
 */

/**
 * Root Atlas cohort definition structure
 * Note: Atlas uses PascalCase for field names
 */
export interface AtlasCohortDefinition {
  id?: number
  name: string
  description?: string
  createdBy?: unknown
  createdDate?: number
  modifiedBy?: unknown
  modifiedDate?: number
  ConceptSets: AtlasConceptSet[]
  PrimaryCriteria: AtlasPrimaryCriteria
  QualifiedLimit?: AtlasQualifiedLimit
  InclusionRules?: AtlasInclusionRule[]
  CensoringCriteria?: AtlasCensoringCriteria[]
  EndStrategy?: AtlasEndStrategy
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
    CONCEPT_CODE: string
    DOMAIN_ID: string
    VOCABULARY_ID: string
    CONCEPT_CLASS_ID: string
    STANDARD_CONCEPT?: string
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
  CorrelatedCriteria?: AtlasCorrelatedCriteria // Nested criteria
  Occurrence?: AtlasOccurrence // Cardinality
}

export interface AtlasOccurrence {
  Type: 0 | 1 | 2 // 0=AT_LEAST, 1=AT_MOST, 2=EXACTLY
  Count: number
  IsDistinct?: boolean
}

export interface AtlasCorrelatedCriteria {
  Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  Count?: number
  CriteriaList: AtlasCriteria[]
  Groups?: AtlasGroup[]
}

export interface AtlasGroup {
  Type: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  Count?: number
  CriteriaList: AtlasCriteria[]
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
  GREATER_THAN: 'gt',
  LESS_THAN: 'lt',
  EQUAL: 'eq',
  NOT_EQUAL: '!eq',
  BETWEEN: 'bt',
  GREATER_THAN_OR_EQUAL: 'gte',
  LESS_THAN_OR_EQUAL: 'lte',
}

export const ATLAS_TO_OPERATOR: Record<string, string> = {
  gt: 'GREATER_THAN',
  lt: 'LESS_THAN',
  eq: 'EQUAL',
  '!eq': 'NOT_EQUAL',
  bt: 'BETWEEN',
  gte: 'GREATER_THAN_OR_EQUAL',
  lte: 'LESS_THAN_OR_EQUAL',
}
