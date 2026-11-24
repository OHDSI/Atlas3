import { describe, it, expect, afterEach } from 'vitest'
import {
  catalogDroppedOnSave,
  markReferencesUnsupported,
  referencesSupported,
  resetReferencesSupport,
} from '@/components/reusables/reusable-support'

const entry = { Id: 1, RefId: 12, Criteria: { Death: {} } }
const groupEntry = { Id: 2, RefId: 30, CriteriaGroup: { Type: 'ALL' as const } }

describe('reusable support', () => {
  afterEach(() => resetReferencesSupport())

  it('is supported until a save shows otherwise', () => {
    expect(referencesSupported()).toBe(true)
    markReferencesUnsupported()
    expect(referencesSupported()).toBe(false)
  })

  it('tells a save that lost the catalog from one that kept it', () => {
    expect(catalogDroppedOnSave({ ReusableCriteria: [entry] }, {})).toBe(true)
    expect(catalogDroppedOnSave({ ReusableCriteriaGroups: [groupEntry] }, { ReusableCriteriaGroups: [] })).toBe(true)
    expect(catalogDroppedOnSave({ ReusableCriteria: [entry] }, { ReusableCriteria: [entry] })).toBe(false)
    expect(catalogDroppedOnSave({ ReusableCriteria: [entry] }, { ReusableCriteriaGroups: [groupEntry] })).toBe(false)
  })

  it('says nothing about a save that had no catalog, or no expression in the response', () => {
    expect(catalogDroppedOnSave({}, {})).toBe(false)
    expect(catalogDroppedOnSave({ ReusableCriteria: [entry] }, undefined)).toBe(false)
    expect(catalogDroppedOnSave({ ReusableCriteria: [entry] }, null)).toBe(false)
  })
})
