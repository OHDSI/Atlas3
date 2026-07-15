import { describe, it, expect } from 'vitest'
import {
  toAllPathwaysRows,
  toCountsByRankRows,
  toEventCohortCountRows,
  toDistinctEventCountRows,
  toCsv,
} from '@/utils/pathway-csv'

const eventCodes = [
  { code: 1, name: 'A', isCombo: false },
  { code: 2, name: 'B', isCombo: false },
]

const group = {
  targetCohortId: 1,
  targetCohortCount: 100,
  totalPathwaysCount: 50,
  pathways: [
    { path: '1-2', personCount: 10 },
    { path: '1', personCount: 5 },
  ],
}

describe('pathway-csv', () => {
  it('toAllPathwaysRows produces one row per pathway with step labels', () => {
    const rows = toAllPathwaysRows(group, eventCodes, 3)
    expect(rows).toHaveLength(2)
    expect(rows[0]['Step 1']).toBe('A')
    expect(rows[0]['Step 2']).toBe('B')
    expect(rows[0]['Count']).toBe(10)
    expect(rows[0]['% with Pathway']).toBeCloseTo(20, 0)
    expect(rows[0]['% of Cohort']).toBeCloseTo(10, 0)
  })

  it('toCountsByRankRows yields one row per (event, rank)', () => {
    const rows = toCountsByRankRows(group, eventCodes)
    const aAtRank1 = rows.find(r => r['Event Cohort'] === 'A' && r['Rank'] === 1)
    expect(aAtRank1?.['Count']).toBe(15)
  })

  it('toEventCohortCountRows excludes combos', () => {
    const codesWithCombo = [...eventCodes, { code: 3, name: 'A+B', isCombo: true }]
    const groupWithCombo = {
      ...group,
      pathways: [...group.pathways, { path: '3', personCount: 7 }],
    }
    const rows = toEventCohortCountRows(groupWithCombo, codesWithCombo)
    expect(rows.find(r => r['Event Cohort'] === 'A+B')).toBeUndefined()
  })

  it('toEventCohortCountRows counts each person once per event cohort when a path repeats an event', () => {
    // A → B → A: the 100 persons on this path all have event A (once) and B (once).
    // Counting per occurrence would tally A twice (200) and push '%' to 200%.
    const repeatGroup = {
      targetCohortId: 1,
      targetCohortCount: 100,
      totalPathwaysCount: 100,
      pathways: [{ path: '1-2-1', personCount: 100 }],
    }
    const rows = toEventCohortCountRows(repeatGroup, eventCodes)
    const a = rows.find(r => r['Event Cohort'] === 'A')
    const b = rows.find(r => r['Event Cohort'] === 'B')
    expect(a?.['Count']).toBe(100)
    expect(a?.['%']).toBe(100)
    expect(b?.['Count']).toBe(100)
  })

  it('toDistinctEventCountRows includes zero bucket', () => {
    const rows = toDistinctEventCountRows(group, eventCodes)
    const zero = rows.find(r => r['Distinct Events'] === 0)
    // zero bucket = targetCohortCount - totalPathwaysCount = 100 - 50 = 50
    expect(zero?.['Count']).toBe(50)
  })

  it('toCsv escapes commas and quotes', () => {
    const out = toCsv([{ a: 'x,y', b: 'q"q' }])
    expect(out).toContain('"x,y"')
    expect(out).toContain('"q""q"')
  })
})
