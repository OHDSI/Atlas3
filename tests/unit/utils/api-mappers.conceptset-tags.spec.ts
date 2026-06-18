import { describe, it, expect } from 'vitest'
import { mapConceptSetFromAPI } from '@/utils/api-mappers'

describe('mapConceptSetFromAPI tags', () => {
  it('maps tags from the API response', () => {
    const result = mapConceptSetFromAPI({
      id: 42,
      name: 'My Set',
      tags: [{ id: 7, name: 'Active', color: '#ff0000' }],
    })
    expect(result.tags).toEqual([{ id: 7, name: 'Active', color: '#ff0000' }])
  })

  it('defaults tags to an empty array when absent', () => {
    const result = mapConceptSetFromAPI({ id: 1, name: 'No Tags' })
    expect(result.tags).toEqual([])
  })
})
