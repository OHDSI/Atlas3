/**
 * Circe criteria constants
 * Maps Atlas/Circe criteria types to their serialized field names.
 */
import type { CriteriaType } from '@/models/cohort.types'

/**
 * Maps an internal CriteriaType to the Circe JSON field name used for
 * source-concept set references (e.g. ConditionSourceConcept).
 */
export const SOURCE_CONCEPT_KEYS: Partial<Record<CriteriaType, string>> = {
  ConditionOccurrence: 'ConditionSourceConcept',
  ProcedureOccurrence: 'ProcedureSourceConcept',
  DrugExposure: 'DrugSourceConcept',
  Measurement: 'MeasurementSourceConcept',
  Observation: 'ObservationSourceConcept',
  DeviceExposure: 'DeviceSourceConcept',
  Death: 'DeathSourceConcept',
  Specimen: 'SpecimenSourceConcept',
  VisitOccurrence: 'VisitSourceConcept',
  VisitDetail: 'VisitDetailSourceConcept',
}

/**
 * Maps an internal CriteriaType to the Circe JSON field name used for the
 * type-exclude flag (e.g. ConditionTypeExclude).
 */
export const TYPE_EXCLUDE_KEYS: Partial<Record<CriteriaType, string>> = {
  ConditionOccurrence: 'ConditionTypeExclude',
  ConditionEra: 'EraTypeExclude',
  DrugExposure: 'DrugTypeExclude',
  DrugEra: 'EraTypeExclude',
  DoseEra: 'EraTypeExclude',
  ProcedureOccurrence: 'ProcedureTypeExclude',
  Measurement: 'MeasurementTypeExclude',
  Observation: 'ObservationTypeExclude',
  ObservationPeriod: 'PeriodTypeExclude',
  VisitOccurrence: 'VisitTypeExclude',
  VisitDetail: 'VisitDetailTypeExclude',
  DeviceExposure: 'DeviceTypeExclude',
  Specimen: 'SpecimenTypeExclude',
  Death: 'DeathTypeExclude',
  PayerPlanPeriod: 'PeriodTypeExclude',
}
