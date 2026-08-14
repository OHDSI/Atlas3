/**
 * Issue #216: the feature-analysis picker offered only a text box over a library
 * of ~1,400 analyses. These facets are the ones Atlas 2.15 puts on the same
 * dialog — Type, Domain, Created, Updated, Author, Designs — so the two agree on
 * what you can narrow by.
 *
 * 2.15 does not facet on stat type, which is why there is no case for it here.
 */
import { describe, it, expect } from 'vitest'
import {
  authorLogin,
  featureAnalysisFacets,
  featureAnalysisSearchText,
  recencyBucket,
  DESIGNS_MINE,
  DESIGNS_OTHER,
  RECENCY_LAST_WEEK,
  RECENCY_OLDER,
  RECENCY_THIS_WEEK,
  RECENCY_UNKNOWN,
} from '@/composables/useFeatureAnalysisFacets'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

const NOW = Date.parse('2026-08-14T00:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

const analysis = (over: Partial<FeatureAnalysisListItem> = {}): FeatureAnalysisListItem =>
  ({ id: 1, name: 'Demographics Index Year', type: 'PRESET', ...over }) as FeatureAnalysisListItem

const facetFor = (key: string, item: FeatureAnalysisListItem, currentUserLogin?: string) =>
  featureAnalysisFacets({ now: NOW, currentUserLogin }).find(f => f.key === key)!.display(item)

describe('the facets match the ones Atlas 2.15 offers', () => {
  it('offers exactly Type, Domain, Created, Updated, Author and Designs', () => {
    const keys = featureAnalysisFacets({ now: NOW }).map(f => f.key)

    expect(keys).toEqual(['type', 'domain', 'created', 'updated', 'author', 'designs'])
  })
})

describe('Type', () => {
  it.each([
    ['CRITERIA_SET', 'Criteria set'],
    ['CUSTOM_FE', 'Custom'],
    ['PRESET', 'Preset'],
  ])('shows %s as "%s", the wording 2.15 uses', (type, label) => {
    expect(facetFor('type', analysis({ type: type as FeatureAnalysisListItem['type'] }))).toBe(label)
  })
})

describe('Domain', () => {
  it('groups by the analysis domain', () => {
    expect(facetFor('domain', analysis({ domain: 'CONDITION' }))).toBe('CONDITION')
  })

  // The field is optional on the list item, and a facet value of '' would render
  // as an unlabelled row in the menu.
  it('keeps analyses with no domain in a named bucket', () => {
    expect(facetFor('domain', analysis())).toBe('Unknown')
  })
})

describe('Created and Updated buckets', () => {
  it.each([
    [0, RECENCY_THIS_WEEK],
    [6 * DAY, RECENCY_THIS_WEEK],
    [8 * DAY, RECENCY_LAST_WEEK],
    [13 * DAY, RECENCY_LAST_WEEK],
    [15 * DAY, RECENCY_OLDER],
    [400 * DAY, RECENCY_OLDER],
  ])('puts something %s ms old in "%s"', (age, bucket) => {
    expect(recencyBucket(NOW - age, NOW)).toBe(bucket)
  })

  it('does not claim a bucket for a missing timestamp', () => {
    expect(recencyBucket(undefined, NOW)).toBe(RECENCY_UNKNOWN)
  })

  it('reads Created from createdDate and Updated from modifiedDate', () => {
    const item = analysis({ createdDate: NOW - 400 * DAY, modifiedDate: NOW - DAY })

    expect(facetFor('created', item)).toBe(RECENCY_OLDER)
    expect(facetFor('updated', item)).toBe(RECENCY_THIS_WEEK)
  })
})

describe('Author', () => {
  // WebAPI sends the user either as a bare login or as an object.
  it.each([
    ['mconove1', 'mconove1'],
    [{ login: 'jhardi10' }, 'jhardi10'],
  ])('reads %o as %s', (createdBy, expected) => {
    expect(authorLogin(createdBy as FeatureAnalysisListItem['createdBy'])).toBe(expected)
  })

  it('labels an unattributed analysis anonymous, as 2.15 does', () => {
    expect(authorLogin(undefined)).toBe('anonymous')
  })
})

describe('Designs', () => {
  it('separates the signed-in user\'s own designs from the rest', () => {
    const mine = analysis({ createdBy: { login: 'phoffmann' } })
    const theirs = analysis({ createdBy: { login: 'someone-else' } })

    expect(facetFor('designs', mine, 'phoffmann')).toBe(DESIGNS_MINE)
    expect(facetFor('designs', theirs, 'phoffmann')).toBe(DESIGNS_OTHER)
  })

  // Signed out, or on a deployment with no user identity, nothing is "mine".
  it('treats everything as another design when there is no signed-in user', () => {
    expect(facetFor('designs', analysis({ createdBy: { login: 'phoffmann' } }))).toBe(DESIGNS_OTHER)
  })
})

describe('the text box', () => {
  it('searches the columns the dialog shows', () => {
    const text = featureAnalysisSearchText(
      analysis({ name: 'Comorbidities', description: 'Charlson index', domain: 'CONDITION' })
    )

    expect(text).toContain('Comorbidities')
    expect(text).toContain('Charlson index')
    expect(text).toContain('CONDITION')
  })

  it('does not break on an analysis with no description or domain', () => {
    expect(() => featureAnalysisSearchText(analysis())).not.toThrow()
  })
})
