/**
 * Basic test to verify Vitest configuration
 */
import { describe, it, expect } from 'vitest'

describe('Test Setup', () => {
  it('should pass basic assertion', () => {
    expect(true).toBe(true)
  })

  it('should have access to globals', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
  })
})
