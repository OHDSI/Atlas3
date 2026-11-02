import { describe, expect, it } from 'vitest'
import {
  createFeatureAnalysisRoute,
  parsePositiveId,
  returnToCharacterizationRoute,
} from '@/utils/feature-analysis-return'

describe('feature-analysis-return', () => {
  it.each([['12', 12], [['7'], 7]])('parses %j as %d', (raw, id) => expect(parsePositiveId(raw)).toBe(id))

  it.each([undefined, null, '', '0', '-1', '1.5', 'abc', 'javascript:alert(1)', '12abc', ['1', '2']])(
    'rejects %j', raw => expect(parsePositiveId(raw as never)).toBeNull())

  it('builds the editor route with type, statType and returnTo', () => {
    expect(createFeatureAnalysisRoute({ type: 'CRITERIA_SET', statType: 'DISTRIBUTION' }, 5))
      .toEqual({ path: '/feature-analyses/new', query: { type: 'CRITERIA_SET', statType: 'DISTRIBUTION', returnTo: '5' } })
    expect(createFeatureAnalysisRoute({ type: 'CUSTOM_FE' }, 5))
      .toEqual({ path: '/feature-analyses/new', query: { type: 'CUSTOM_FE', returnTo: '5' } })
  })

  it('builds the way back, with and without the analysis to add', () => {
    expect(returnToCharacterizationRoute(5)).toEqual({ name: 'characterization-edit', params: { id: '5' } })
    expect(returnToCharacterizationRoute(5, 99))
      .toEqual({ name: 'characterization-edit', params: { id: '5' }, query: { addFeatureAnalysis: '99' } })
  })
})
