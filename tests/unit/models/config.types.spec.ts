import { describe, expect, it } from 'vitest'
import { tagSchema } from '@/models/config.types'

describe('tagSchema color validation', () => {
  it('accepts a 6-digit hex with leading #', () => {
    const result = tagSchema.safeParse({ name: 'x', color: '#1976D2' })
    expect(result.success).toBe(true)
  })

  it('accepts lowercase hex (color picker output)', () => {
    const result = tagSchema.safeParse({ name: 'x', color: '#1976d2' })
    expect(result.success).toBe(true)
  })

  it('accepts an empty color so a tag inherits from its group', () => {
    const result = tagSchema.safeParse({ name: 'x', color: '' })
    expect(result.success).toBe(true)
  })

  it('accepts undefined color', () => {
    const result = tagSchema.safeParse({ name: 'x' })
    expect(result.success).toBe(true)
  })

  it('rejects malformed colors', () => {
    expect(tagSchema.safeParse({ name: 'x', color: 'red' }).success).toBe(false)
    expect(tagSchema.safeParse({ name: 'x', color: '1976D2' }).success).toBe(false)
    expect(tagSchema.safeParse({ name: 'x', color: '#1976D2FF' }).success).toBe(false)
    expect(tagSchema.safeParse({ name: 'x', color: '#XYZXYZ' }).success).toBe(false)
  })
})
