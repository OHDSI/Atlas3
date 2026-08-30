import { describe, it, expect } from 'vitest'
import { userDisplayName } from '@/utils/user-display'

describe('userDisplayName (#269)', () => {
  it('prefers the display name on the object shape', () => {
    expect(userDisplayName({ id: 1, login: 'jdoe', name: 'Jane Doe' })).toBe('Jane Doe')
  })

  it('falls back to the login when there is no name', () => {
    expect(userDisplayName({ id: 1, login: 'jdoe' })).toBe('jdoe')
    expect(userDisplayName({ id: 1, login: 'jdoe', name: '  ' })).toBe('jdoe')
  })

  it('accepts the bare string shape older records use', () => {
    expect(userDisplayName('jdoe')).toBe('jdoe')
  })

  it('reports nothing when there is no usable name', () => {
    expect(userDisplayName(null)).toBeNull()
    expect(userDisplayName(undefined)).toBeNull()
    expect(userDisplayName('')).toBeNull()
    expect(userDisplayName({})).toBeNull()
  })
})
