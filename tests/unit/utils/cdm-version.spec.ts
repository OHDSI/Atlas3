/**
 * Unit Test: CDM Version Validation
 * US5: T073-T082
 */
import { describe, it, expect } from 'vitest'
import { validateCdmVersion, getMinimumVersion } from '@/utils/cdm-version'

describe('CDM Version Validation (US5)', () => {
  describe('validateCdmVersion', () => {
    describe('Greater than or equal (>=)', () => {
      it('validates version equal to constraint', () => {
        expect(validateCdmVersion('5.0.0', '>=5.0.0')).toBe(true)
      })

      it('validates version greater than constraint', () => {
        expect(validateCdmVersion('5.3.1', '>=5.0.0')).toBe(true)
        expect(validateCdmVersion('6.0.0', '>=5.0.0')).toBe(true)
      })

      it('rejects version less than constraint', () => {
        expect(validateCdmVersion('4.5.0', '>=5.0.0')).toBe(false)
      })

      it('validates minor version increments', () => {
        expect(validateCdmVersion('5.1.0', '>=5.0.0')).toBe(true)
        expect(validateCdmVersion('5.3.0', '>=5.1.0')).toBe(true)
      })

      it('validates patch version increments', () => {
        expect(validateCdmVersion('5.0.1', '>=5.0.0')).toBe(true)
        expect(validateCdmVersion('5.0.5', '>=5.0.3')).toBe(true)
      })
    })

    describe('Less than (<)', () => {
      it('validates version less than constraint', () => {
        expect(validateCdmVersion('5.0.0', '<6.0.0')).toBe(true)
        expect(validateCdmVersion('5.9.9', '<6.0.0')).toBe(true)
      })

      it('rejects version equal to constraint', () => {
        expect(validateCdmVersion('6.0.0', '<6.0.0')).toBe(false)
      })

      it('rejects version greater than constraint', () => {
        expect(validateCdmVersion('6.1.0', '<6.0.0')).toBe(false)
      })
    })

    describe('Greater than (>)', () => {
      it('validates version greater than constraint', () => {
        expect(validateCdmVersion('5.1.0', '>5.0.0')).toBe(true)
      })

      it('rejects version equal to constraint', () => {
        expect(validateCdmVersion('5.0.0', '>5.0.0')).toBe(false)
      })
    })

    describe('Less than or equal (<=)', () => {
      it('validates version less than constraint', () => {
        expect(validateCdmVersion('5.0.0', '<=6.0.0')).toBe(true)
      })

      it('validates version equal to constraint', () => {
        expect(validateCdmVersion('6.0.0', '<=6.0.0')).toBe(true)
      })

      it('rejects version greater than constraint', () => {
        expect(validateCdmVersion('6.1.0', '<=6.0.0')).toBe(false)
      })
    })

    describe('Equal (=)', () => {
      it('validates exact version match', () => {
        expect(validateCdmVersion('5.3.1', '=5.3.1')).toBe(true)
      })

      it('rejects version mismatch', () => {
        expect(validateCdmVersion('5.3.2', '=5.3.1')).toBe(false)
        expect(validateCdmVersion('5.4.1', '=5.3.1')).toBe(false)
      })
    })

    describe('Multiple constraints', () => {
      it('validates version range with AND logic', () => {
        // Version should be >= 5.0.0 AND < 6.0.0
        expect(validateCdmVersion('5.3.1', '>=5.0.0 <6.0.0')).toBe(true)
        expect(validateCdmVersion('5.0.0', '>=5.0.0 <6.0.0')).toBe(true)
        expect(validateCdmVersion('5.9.9', '>=5.0.0 <6.0.0')).toBe(true)
      })

      it('rejects version outside range', () => {
        expect(validateCdmVersion('4.5.0', '>=5.0.0 <6.0.0')).toBe(false)
        expect(validateCdmVersion('6.0.0', '>=5.0.0 <6.0.0')).toBe(false)
        expect(validateCdmVersion('6.1.0', '>=5.0.0 <6.0.0')).toBe(false)
      })

      it('validates complex constraints', () => {
        // Version should be >= 5.3.0 AND <= 5.4.0
        expect(validateCdmVersion('5.3.0', '>=5.3.0 <=5.4.0')).toBe(true)
        expect(validateCdmVersion('5.3.5', '>=5.3.0 <=5.4.0')).toBe(true)
        expect(validateCdmVersion('5.4.0', '>=5.3.0 <=5.4.0')).toBe(true)
        expect(validateCdmVersion('5.2.9', '>=5.3.0 <=5.4.0')).toBe(false)
        expect(validateCdmVersion('5.4.1', '>=5.3.0 <=5.4.0')).toBe(false)
      })
    })

    describe('Edge cases', () => {
      it('handles malformed version strings gracefully', () => {
        // Should not throw, but may return false or default behavior
        expect(validateCdmVersion('invalid', '>=5.0.0')).toBe(false)
        expect(validateCdmVersion('5.0.0', 'invalid')).toBe(true) // No valid condition to fail
      })

      it('handles version strings with extra characters', () => {
        expect(validateCdmVersion('5.3.1-beta', '>=5.0.0')).toBe(true)
        expect(validateCdmVersion('5.3.1+build123', '>=5.0.0')).toBe(true)
      })

      it('handles empty constraint', () => {
        expect(validateCdmVersion('5.0.0', '')).toBe(true)
      })
    })
  })

  describe('getMinimumVersion', () => {
    it('extracts minimum version from >= constraint', () => {
      expect(getMinimumVersion('>=5.0.0')).toBe('5.0.0')
      expect(getMinimumVersion('>=5.3.1')).toBe('5.3.1')
    })

    it('extracts minimum version from > constraint', () => {
      expect(getMinimumVersion('>5.0.0')).toBe('5.0.0')
    })

    it('extracts minimum version from complex constraint', () => {
      expect(getMinimumVersion('>=5.0.0 <6.0.0')).toBe('5.0.0')
    })

    it('returns null for constraints without minimum', () => {
      expect(getMinimumVersion('<6.0.0')).toBeNull()
      expect(getMinimumVersion('=5.0.0')).toBeNull()
    })

    it('returns null for invalid constraint', () => {
      expect(getMinimumVersion('invalid')).toBeNull()
      expect(getMinimumVersion('')).toBeNull()
    })
  })
})
