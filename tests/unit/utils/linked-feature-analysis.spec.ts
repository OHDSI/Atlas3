import { describe, it, expect } from 'vitest'

import { designFlags, toLinkedFeatureAnalysis } from '@/utils/linked-feature-analysis'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

describe('designFlags', () => {
  it('is false for an empty list', () => {
    expect(designFlags([])).toEqual({ includeAnnual: false, includeTemporal: false })
  })

  it('is true when any row has the flag', () => {
    expect(
      designFlags([
        { id: 1, includeAnnual: false },
        { id: 2, includeAnnual: true, includeTemporal: false },
      ])
    ).toEqual({ includeAnnual: true, includeTemporal: false })
    expect(designFlags([{ id: 1 }, { id: 2, includeTemporal: true }])).toEqual({
      includeAnnual: false,
      includeTemporal: true,
    })
  })
})

describe('toLinkedFeatureAnalysis', () => {
  it('copies identity and capability fields and applies the flags', () => {
    const fa: FeatureAnalysisListItem = {
      id: 12,
      name: 'Drug era',
      description: 'desc',
      type: 'PRESET',
      statType: 'PREVALENCE',
      supportsAnnual: true,
      supportsTemporal: false,
    }
    expect(toLinkedFeatureAnalysis(fa, { includeAnnual: true, includeTemporal: false })).toEqual({
      id: 12,
      name: 'Drug era',
      description: 'desc',
      statType: 'PREVALENCE',
      supportsAnnual: true,
      supportsTemporal: false,
      includeAnnual: true,
      includeTemporal: false,
    })
  })
})
