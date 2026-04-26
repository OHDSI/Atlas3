import { describe, it, expect } from 'vitest'
import {
  buildPathwayHierarchy,
  decomposeCombo,
  isComboCode,
} from '@/utils/pathway-hierarchy'
import type { PathwayGroup } from '@/models/pathway.types'

const eventCodes = [
  { code: 1, name: 'A', isCombo: false },
  { code: 2, name: 'B', isCombo: false },
  { code: 4, name: 'C', isCombo: false },
  { code: 3, name: 'A+B', isCombo: true },
]

const colors = (key: string): string => `c-${key}`

describe('decomposeCombo', () => {
  it('returns single bit for non-combo', () => {
    expect(decomposeCombo(1)).toEqual([1])
    expect(decomposeCombo(4)).toEqual([4])
  })
  it('returns ordered bits for combo', () => {
    expect(decomposeCombo(3)).toEqual([1, 2])
    expect(decomposeCombo(7)).toEqual([1, 2, 4])
  })
  it('isComboCode detects > 1 bit set', () => {
    expect(isComboCode(1)).toBe(false)
    expect(isComboCode(3)).toBe(true)
  })
})

describe('buildPathwayHierarchy', () => {
  it('builds a single straight branch', () => {
    const group: PathwayGroup = {
      targetCohortId: 1, targetCohortCount: 100, totalPathwaysCount: 50,
      pathways: [{ path: '1-2', personCount: 10 }],
    }
    const tree = buildPathwayHierarchy(group, eventCodes, 5, colors)
    expect(tree.children?.length).toBe(1)
    expect(tree.children![0].name).toBe('1')
    expect(tree.children![0].children?.[0].name).toBe('2')
  })

  it('appends end sentinel when path shorter than maxDepth', () => {
    const group: PathwayGroup = {
      targetCohortId: 1, targetCohortCount: 100, totalPathwaysCount: 50,
      pathways: [{ path: '1', personCount: 10 }],
    }
    const tree = buildPathwayHierarchy(group, eventCodes, 5, colors)
    const onlyPath = tree.children![0]
    expect(onlyPath.children?.[0].name).toBe('end')
  })

  it('does NOT append end when path equals maxDepth', () => {
    const group: PathwayGroup = {
      targetCohortId: 1, targetCohortCount: 100, totalPathwaysCount: 50,
      pathways: [{ path: '1-2-4', personCount: 10 }],
    }
    const tree = buildPathwayHierarchy(group, eventCodes, 3, colors)
    const leaf = tree.children![0].children![0].children![0]
    expect(leaf.name).toBe('4')
    expect(leaf.children).toBeUndefined()
  })

  it('splits combo arc into per-bit children', () => {
    const group: PathwayGroup = {
      targetCohortId: 1, targetCohortCount: 100, totalPathwaysCount: 50,
      pathways: [{ path: '3-4', personCount: 10 }],
    }
    const tree = buildPathwayHierarchy(group, eventCodes, 5, colors)
    const splitNodes = tree.children![0].splitChildren
    expect(splitNodes).toBeDefined()
    expect(splitNodes!.map(n => n.name)).toEqual(['1', '2'])
  })

  it('aggregates personCount across shared prefixes', () => {
    const group: PathwayGroup = {
      targetCohortId: 1, targetCohortCount: 100, totalPathwaysCount: 50,
      pathways: [
        { path: '1-2', personCount: 10 },
        { path: '1-4', personCount: 5 },
      ],
    }
    const tree = buildPathwayHierarchy(group, eventCodes, 5, colors)
    expect(tree.children![0].name).toBe('1')
    expect(tree.children![0].value).toBe(15)
  })
})
