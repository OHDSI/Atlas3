/**
 * Unit Tests: useLicenseAgreement Composable
 * Tests for src/composables/useLicenseAgreement.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLicenseAgreement } from '@/composables/useLicenseAgreement'

describe('useLicenseAgreement', () => {
  const LICENSE_KEY = 'atlas3-license-acceptance-date'
  const ONE_DAY_MS = 1000 * 60 * 60 * 24
  const ONE_YEAR_MS = ONE_DAY_MS * 365

  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isLicenseAccepted', () => {
    it('returns false when no license has been accepted', () => {
      const { isLicenseAccepted } = useLicenseAgreement()
      expect(isLicenseAccepted()).toBe(false)
    })

    it('returns true when license was accepted recently', () => {
      const recentDate = Date.now() - ONE_DAY_MS // 1 day ago
      localStorage.setItem(LICENSE_KEY, recentDate.toString())

      const { isLicenseAccepted } = useLicenseAgreement()
      expect(isLicenseAccepted()).toBe(true)
    })

    it('returns false when license was accepted more than 365 days ago', () => {
      const oldDate = Date.now() - ONE_YEAR_MS - ONE_DAY_MS // 366 days ago
      localStorage.setItem(LICENSE_KEY, oldDate.toString())

      const { isLicenseAccepted } = useLicenseAgreement()
      expect(isLicenseAccepted()).toBe(false)
    })

    it('returns true when license was accepted exactly 364 days ago', () => {
      const borderDate = Date.now() - (ONE_DAY_MS * 364) // 364 days ago
      localStorage.setItem(LICENSE_KEY, borderDate.toString())

      const { isLicenseAccepted } = useLicenseAgreement()
      expect(isLicenseAccepted()).toBe(true)
    })

    it('returns false for invalid stored value', () => {
      localStorage.setItem(LICENSE_KEY, 'invalid-date')

      const { isLicenseAccepted } = useLicenseAgreement()
      expect(isLicenseAccepted()).toBe(false)
    })

    it('returns false for empty string value', () => {
      localStorage.setItem(LICENSE_KEY, '')

      const { isLicenseAccepted } = useLicenseAgreement()
      expect(isLicenseAccepted()).toBe(false)
    })
  })

  describe('acceptLicense', () => {
    it('stores current timestamp in localStorage', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const { acceptLicense } = useLicenseAgreement()
      acceptLicense()

      const storedValue = localStorage.getItem(LICENSE_KEY)
      expect(storedValue).toBeTruthy()
      expect(parseInt(storedValue!)).toBeCloseTo(now, -3) // Within 1 second

      vi.useRealTimers()
    })

    it('closes the license dialog', () => {
      const { showLicenseDialog, acceptLicense } = useLicenseAgreement()
      showLicenseDialog.value = true

      acceptLicense()

      expect(showLicenseDialog.value).toBe(false)
    })

    it('makes isLicenseAccepted return true', () => {
      const { isLicenseAccepted, acceptLicense } = useLicenseAgreement()
      expect(isLicenseAccepted()).toBe(false)

      acceptLicense()

      expect(isLicenseAccepted()).toBe(true)
    })
  })

  describe('rejectLicense', () => {
    it('shows alert message', () => {
      const { rejectLicense } = useLicenseAgreement()
      rejectLicense()

      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining("can't use Atlas")
      )
    })

    it('does not store anything in localStorage', () => {
      const { rejectLicense } = useLicenseAgreement()
      rejectLicense()

      expect(localStorage.getItem(LICENSE_KEY)).toBeNull()
    })

    it('keeps dialog open', () => {
      const { showLicenseDialog, rejectLicense } = useLicenseAgreement()
      showLicenseDialog.value = true

      rejectLicense()

      // Dialog should remain open (rejectLicense doesn't close it)
      expect(showLicenseDialog.value).toBe(true)
    })
  })

  describe('checkLicenseStatus', () => {
    it('opens dialog when license not accepted', () => {
      const { showLicenseDialog, checkLicenseStatus } = useLicenseAgreement()
      expect(showLicenseDialog.value).toBe(false)

      checkLicenseStatus()

      expect(showLicenseDialog.value).toBe(true)
    })

    it('does not open dialog when license is accepted', () => {
      const recentDate = Date.now() - ONE_DAY_MS
      localStorage.setItem(LICENSE_KEY, recentDate.toString())

      const { showLicenseDialog, checkLicenseStatus } = useLicenseAgreement()
      expect(showLicenseDialog.value).toBe(false)

      checkLicenseStatus()

      expect(showLicenseDialog.value).toBe(false)
    })

    it('opens dialog when license has expired', () => {
      const oldDate = Date.now() - ONE_YEAR_MS - ONE_DAY_MS
      localStorage.setItem(LICENSE_KEY, oldDate.toString())

      const { showLicenseDialog, checkLicenseStatus } = useLicenseAgreement()
      checkLicenseStatus()

      expect(showLicenseDialog.value).toBe(true)
    })
  })

  describe('clearLicenseAcceptance', () => {
    it('removes license from localStorage', () => {
      localStorage.setItem(LICENSE_KEY, Date.now().toString())

      const { clearLicenseAcceptance } = useLicenseAgreement()
      clearLicenseAcceptance()

      expect(localStorage.getItem(LICENSE_KEY)).toBeNull()
    })

    it('makes isLicenseAccepted return false', () => {
      localStorage.setItem(LICENSE_KEY, Date.now().toString())

      const { isLicenseAccepted, clearLicenseAcceptance } = useLicenseAgreement()
      expect(isLicenseAccepted()).toBe(true)

      clearLicenseAcceptance()

      expect(isLicenseAccepted()).toBe(false)
    })
  })

  describe('needsAcceptance computed', () => {
    it('returns true when license not accepted', () => {
      const { needsAcceptance } = useLicenseAgreement()
      expect(needsAcceptance.value).toBe(true)
    })

    it('returns false when license is accepted', () => {
      const recentDate = Date.now() - ONE_DAY_MS
      localStorage.setItem(LICENSE_KEY, recentDate.toString())

      const { needsAcceptance } = useLicenseAgreement()
      expect(needsAcceptance.value).toBe(false)
    })

    it('returns true when license has expired', () => {
      const oldDate = Date.now() - ONE_YEAR_MS - ONE_DAY_MS
      localStorage.setItem(LICENSE_KEY, oldDate.toString())

      const { needsAcceptance } = useLicenseAgreement()
      expect(needsAcceptance.value).toBe(true)
    })
  })

  describe('showLicenseDialog ref', () => {
    it('starts as false', () => {
      const { showLicenseDialog } = useLicenseAgreement()
      expect(showLicenseDialog.value).toBe(false)
    })

    it('can be set manually', () => {
      const { showLicenseDialog } = useLicenseAgreement()
      showLicenseDialog.value = true
      expect(showLicenseDialog.value).toBe(true)
    })
  })
})
