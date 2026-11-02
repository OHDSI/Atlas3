import { describe, it, expect } from 'vitest'
import { parseCreateKind } from '@/utils/feature-analysis-create-kind'

describe('parseCreateKind', () => {
  it('parses the three create kinds', () => {
    expect(parseCreateKind('CUSTOM_FE', undefined)).toEqual({ type: 'CUSTOM_FE' })
    expect(parseCreateKind('CRITERIA_SET', 'PREVALENCE')).toEqual({ type: 'CRITERIA_SET', statType: 'PREVALENCE' })
    expect(parseCreateKind('CRITERIA_SET', 'DISTRIBUTION')).toEqual({ type: 'CRITERIA_SET', statType: 'DISTRIBUTION' })
  })

  it('rejects anything else', () => {
    expect(parseCreateKind('CRITERIA_SET', undefined)).toBeNull()
    expect(parseCreateKind('PRESET', undefined)).toBeNull()
    expect(parseCreateKind(['CUSTOM_FE'], undefined)).toBeNull()
    expect(parseCreateKind(undefined, undefined)).toBeNull()
  })
})
