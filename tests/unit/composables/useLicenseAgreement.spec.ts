/**
 * useLicenseAgreement Composable Tests
 * Tests for license agreement management
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useLicenseAgreement } from '@/composables/useLicenseAgreement'

describe('useLicenseAgreement', () => {
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key]
      }),
    })

    // Mock alert
    vi.stubGlobal('alert', vi.fn())

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('isLicenseAccepted', () => {
    it('should return false when no acceptance date stored', () => {
      const { isLicenseAccepted } = useLicenseAgreement()

      expect(isLicenseAccepted()).toBe(false)
    })

    it('should return true when accepted within expiry period', () => {
      // Set acceptance date to now
      localStorageMock['atlas3-license-acceptance-date'] = Date.now().toString()

      const { isLicenseAccepted } = useLicenseAgreement()

      expect(isLicenseAccepted()).toBe(true)
    })

    it('should return false when acceptance has expired', () => {
      // Set acceptance date to 400 days ago (beyond 365 day expiry)
      const expiredDate = Date.now() - 400 * 24 * 60 * 60 * 1000
      localStorageMock['atlas3-license-acceptance-date'] = expiredDate.toString()

      const { isLicenseAccepted } = useLicenseAgreement()

      expect(isLicenseAccepted()).toBe(false)
    })

    it('should return false for invalid stored date', () => {
      localStorageMock['atlas3-license-acceptance-date'] = 'invalid'

      const { isLicenseAccepted } = useLicenseAgreement()

      expect(isLicenseAccepted()).toBe(false)
    })
  })

  describe('acceptLicense', () => {
    it('should store acceptance date in localStorage', () => {
      const { acceptLicense } = useLicenseAgreement()

      acceptLicense()

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'atlas3-license-acceptance-date',
        expect.any(String)
      )
    })

    it('should close license dialog', () => {
      const { acceptLicense, showLicenseDialog } = useLicenseAgreement()
      showLicenseDialog.value = true

      acceptLicense()

      expect(showLicenseDialog.value).toBe(false)
    })
  })

  describe('rejectLicense', () => {
    it('should show alert message', () => {
      const { rejectLicense } = useLicenseAgreement()

      rejectLicense()

      expect(alert).toHaveBeenCalledWith(
        expect.stringContaining("can't use Atlas")
      )
    })

    it('should not close the dialog', () => {
      const { rejectLicense, showLicenseDialog } = useLicenseAgreement()
      showLicenseDialog.value = true

      rejectLicense()

      // Dialog stays open - user must accept
      expect(showLicenseDialog.value).toBe(true)
    })
  })

  describe('checkLicenseStatus', () => {
    it('should show dialog when license not accepted', () => {
      const { checkLicenseStatus, showLicenseDialog } = useLicenseAgreement()

      checkLicenseStatus()

      expect(showLicenseDialog.value).toBe(true)
    })

    it('should not show dialog when license is accepted', () => {
      // Set valid acceptance
      localStorageMock['atlas3-license-acceptance-date'] = Date.now().toString()

      const { checkLicenseStatus, showLicenseDialog } = useLicenseAgreement()

      checkLicenseStatus()

      expect(showLicenseDialog.value).toBe(false)
    })
  })

  describe('clearLicenseAcceptance', () => {
    it('should remove acceptance from localStorage', () => {
      localStorageMock['atlas3-license-acceptance-date'] = Date.now().toString()

      const { clearLicenseAcceptance } = useLicenseAgreement()

      clearLicenseAcceptance()

      expect(localStorage.removeItem).toHaveBeenCalledWith('atlas3-license-acceptance-date')
    })
  })

  describe('needsAcceptance', () => {
    it('should be true when license not accepted', () => {
      const { needsAcceptance } = useLicenseAgreement()

      expect(needsAcceptance.value).toBe(true)
    })

    it('should be false when license is accepted', () => {
      localStorageMock['atlas3-license-acceptance-date'] = Date.now().toString()

      const { needsAcceptance } = useLicenseAgreement()

      expect(needsAcceptance.value).toBe(false)
    })
  })
})
