import type { DrilldownReport } from '@/models/report.types'

export type Domain =
  | 'condition'
  | 'conditionEra'
  | 'drug'
  | 'drugEra'
  | 'measurement'
  | 'observation'
  | 'procedure'
  | 'visit'

export type DrilldownField = Exclude<keyof DrilldownReport, 'conceptId' | 'conceptName' | 'conceptPath'>

export const DOMAIN_DRILLDOWN_FIELDS: Record<Domain, DrilldownField[]> = {
  condition:    ['byType', 'prevalenceByMonth', 'prevalenceByGenderAgeYear', 'ageAtFirstOccurrence'],
  conditionEra: ['lengthOfEra', 'prevalenceByMonth', 'prevalenceByGenderAgeYear', 'ageAtFirstOccurrence'],
  drug:         ['byFrequency', 'byType', 'prevalenceByMonth', 'prevalenceByGenderAgeYear', 'ageAtFirstOccurrence'],
  drugEra:      ['lengthOfEra', 'prevalenceByMonth', 'prevalenceByGenderAgeYear', 'ageAtFirstOccurrence'],
  measurement:  ['byFrequency', 'byUnit', 'byType', 'byValueAsConcept', 'byOperator', 'prevalenceByMonth', 'prevalenceByGenderAgeYear', 'ageAtFirstOccurrence'],
  observation:  ['byFrequency', 'byType', 'byValueAsConcept', 'byQualifier', 'prevalenceByMonth', 'prevalenceByGenderAgeYear', 'ageAtFirstOccurrence'],
  procedure:    ['byFrequency', 'byType', 'prevalenceByMonth', 'prevalenceByGenderAgeYear', 'ageAtFirstOccurrence'],
  visit:        ['prevalenceByMonth', 'prevalenceByGenderAgeYear', 'ageAtFirstOccurrence']
}
