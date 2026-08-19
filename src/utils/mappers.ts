/**
 * Operator and Type Mappers
 * Converts between internal and Atlas formats per contracts/atlas-json-schema.md
 */
import type { CardinalityType, NumericOperator, DateOperator } from '@/models/event.types'

/**
 * CRITICAL: Operator mappings for Atlas JSON conversion
 */
export const OPERATOR_TO_ATLAS: Record<string, string> = {
  GREATER_THAN: 'gt',
  LESS_THAN: 'lt',
  EQUAL: 'eq',
  NOT_EQUAL: '!eq',
  BETWEEN: 'bt',
  NOT_BETWEEN: '!bt',
  GREATER_THAN_OR_EQUAL: 'gte',
  LESS_THAN_OR_EQUAL: 'lte',
}

export const ATLAS_TO_OPERATOR: Record<string, string> = {
  gt: 'GREATER_THAN',
  lt: 'LESS_THAN',
  eq: 'EQUAL',
  '!eq': 'NOT_EQUAL',
  bt: 'BETWEEN',
  '!bt': 'NOT_BETWEEN',
  gte: 'GREATER_THAN_OR_EQUAL',
  lte: 'LESS_THAN_OR_EQUAL',
}

/** Per the CIRCE Occurrence.Type enum: EXACTLY = 0, AT_MOST = 1, AT_LEAST = 2 */
export const CARDINALITY_TO_ATLAS: Record<CardinalityType, 0 | 1 | 2> = {
  EXACTLY: 0,
  AT_MOST: 1,
  AT_LEAST: 2,
}

export const ATLAS_TO_CARDINALITY: Record<0 | 1 | 2, CardinalityType> = {
  0: 'EXACTLY',
  1: 'AT_MOST',
  2: 'AT_LEAST',
}

/**
 * Convert internal operator to Atlas format
 */
export function operatorToAtlas(operator: NumericOperator | DateOperator): string {
  return OPERATOR_TO_ATLAS[operator] ?? operator
}

/**
 * Convert Atlas operator to internal format
 */
export function atlasToOperator(atlasOp: string): string {
  return ATLAS_TO_OPERATOR[atlasOp] ?? atlasOp
}

/**
 * Convert internal cardinality type to Atlas format
 */
export function cardinalityToAtlas(type: CardinalityType): 0 | 1 | 2 {
  return CARDINALITY_TO_ATLAS[type]
}

/**
 * Convert Atlas cardinality type to internal format
 */
export function atlasToCardinality(atlasType: 0 | 1 | 2): CardinalityType {
  return ATLAS_TO_CARDINALITY[atlasType]
}

/**
 * Attribute key mappings: camelCase ↔ PascalCase
 * Per contracts/atlas-json-schema.md
 */
export const ATTRIBUTE_KEY_TO_ATLAS: Record<string, string> = {
  age: 'Age',
  gender: 'Gender',
  valueAsNumber: 'ValueAsNumber',
  valueAsString: 'ValueAsString',
  occurrenceStartDate: 'OccurrenceStartDate',
  occurrenceEndDate: 'OccurrenceEndDate',
  visitLength: 'VisitLength',
  eraLength: 'EraLength',
  visitStartDate: 'VisitStartDate',
  visitEndDate: 'VisitEndDate',
  eraStartDate: 'EraStartDate',
  eraEndDate: 'EraEndDate',
  quantity: 'Quantity',
  visitType: 'VisitType',
  race: 'Race',
  providerSpecialty: 'ProviderSpecialty',
  sourceCode: 'SourceCode',
  first: 'First',
  primary: 'Primary',
}

export const ATLAS_TO_ATTRIBUTE_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(ATTRIBUTE_KEY_TO_ATLAS).map(([k, v]) => [v, k])
)

/**
 * Convert attribute key to Atlas format (PascalCase)
 */
export function attributeKeyToAtlas(key: string): string {
  return ATTRIBUTE_KEY_TO_ATLAS[key] ?? key
}

/**
 * Convert Atlas attribute key to internal format (camelCase)
 */
export function atlasToAttributeKey(atlasKey: string): string {
  return ATLAS_TO_ATTRIBUTE_KEY[atlasKey] ?? atlasKey
}
