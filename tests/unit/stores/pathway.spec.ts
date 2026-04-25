import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import { PATHWAY_DEFAULTS } from '@/models/pathway.types'

vi.mock('@/services/webapi', () => ({
  getPathway: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 1, name: 'X', tags: [],
      design: {
        targetCohorts: [], eventCohorts: [],
        combinationWindow: 30, minCellCount: 5, maxDepth: 5, allowRepeats: false,
      },
    },
  }),
  existsPathway: vi.fn().mockResolvedValue(0),
}))

describe('pathway store — basics', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('createNewPathway initializes with defaults and not dirty', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    expect(s.currentPathway?.name).toBe('')
    expect(s.currentPathway?.design.combinationWindow).toBe(PATHWAY_DEFAULTS.combinationWindow)
    expect(s.isDirty).toBe(false)
  })

  it('updateDesign merges and marks dirty', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateDesign({ maxDepth: 7 })
    expect(s.currentPathway?.design.maxDepth).toBe(7)
    expect(s.isDirty).toBe(true)
  })

  it('addTargetCohort appends and dedupes by id', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addTargetCohort({ id: 1, name: 'A' })
    s.addTargetCohort({ id: 1, name: 'A duplicate' })
    expect(s.currentPathway?.design.targetCohorts).toHaveLength(1)
  })

  it('removeEventCohort drops by id', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addEventCohort({ id: 1, name: 'A' })
    s.addEventCohort({ id: 2, name: 'B' })
    s.removeEventCohort(1)
    expect(s.currentPathway?.design.eventCohorts.map(c => c.id)).toEqual([2])
  })

  it('renameTargetCohort updates the label only', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addTargetCohort({ id: 1, name: 'A' })
    s.renameTargetCohort(1, 'Better label')
    expect(s.currentPathway?.design.targetCohorts[0].name).toBe('Better label')
  })

  it('loadPathway populates currentPathway and clears dirty', async () => {
    const s = usePathwayStore()
    await s.loadPathway(1)
    expect(s.currentPathway?.id).toBe(1)
    expect(s.isDirty).toBe(false)
  })

  it('markClean resets dirty', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.markDirty()
    expect(s.isDirty).toBe(true)
    s.markClean()
    expect(s.isDirty).toBe(false)
  })
})
