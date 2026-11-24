import { describe, it, expect } from 'vitest'
import { reusableAuthorLogin, reusableAuthorName } from '@/components/reusables/reusable-display'

describe('reusable author display', () => {
  it('reads a user object or a login string', () => {
    expect(reusableAuthorName({ login: 'alice', name: 'Alice' })).toBe('Alice')
    expect(reusableAuthorName({ login: 'alice' })).toBe('alice')
    expect(reusableAuthorName('bob')).toBe('bob')
    expect(reusableAuthorLogin({ login: 'alice', name: 'Alice' })).toBe('alice')
    expect(reusableAuthorLogin('bob')).toBe('bob')
  })

  it('shows a dash, and no login, for a missing author', () => {
    expect(reusableAuthorName(null)).toBe('—')
    expect(reusableAuthorName('')).toBe('—')
    expect(reusableAuthorName({})).toBe('—')
    expect(reusableAuthorLogin(undefined)).toBeUndefined()
    expect(reusableAuthorLogin('')).toBeUndefined()
    expect(reusableAuthorLogin({})).toBeUndefined()
  })
})
