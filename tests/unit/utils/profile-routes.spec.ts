import { describe, it, expect } from 'vitest'
import { profileRouteFor } from '@/utils/profile-routes'

describe('profileRouteFor', () => {
  it('builds path with source + personId', () => {
    expect(profileRouteFor('SYNPUF', 7)).toBe('/profiles/SYNPUF/7')
  })
  it('appends cohortId when given', () => {
    expect(profileRouteFor('SYNPUF', 7, 42)).toBe('/profiles/SYNPUF/7/42')
  })
  it('encodes special characters in sourceKey', () => {
    expect(profileRouteFor('My Source', 1)).toBe('/profiles/My%20Source/1')
  })
})
