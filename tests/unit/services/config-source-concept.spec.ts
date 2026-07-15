import { describe, it, expect, beforeAll } from 'vitest'
import { configLoaderService } from '@/services/config-loader.service'

const cases: Array<[filterKey: string, attributeId: string]> = [
  ['conditionOccurrence', 'conditionSourceConcept'],
  ['drugExposure', 'drugSourceConcept'],
  ['deviceExposure', 'deviceSourceConcept'],
  ['measurement', 'measurementSourceConcept'],
  ['observation', 'observationSourceConcept'],
  ['procedureOccurrence', 'procedureSourceConcept'],
  ['death', 'deathSourceConcept'],
  ['specimen', 'specimenSourceConcept'],
  ['visitOccurrence', 'visitSourceConcept'],
  ['visitDetail', 'visitDetailSourceConcept'],
]

describe('source-concept attribute config', () => {
  beforeAll(async () => {
    await configLoaderService.loadConfiguration()
  })

  it.each(cases)('%s exposes %s as a concept attribute', (filterKey, attributeId) => {
    const attrs = configLoaderService.getAttributesForFilter(filterKey, 'criteriaGroup')
    const entry = attrs.find(a => a.id === attributeId)
    expect(entry).toBeDefined()
    expect(entry!.type).toBe('concept')
  })
})
