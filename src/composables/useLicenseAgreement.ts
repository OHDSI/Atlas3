import { ref, computed } from 'vue'

const LICENSE_ACCEPTANCE_KEY = 'atlas3-license-acceptance-date'
const LICENSE_EXPIRY_DAYS = 365 // License acceptance expires after 1 year

/**
 * Composable for managing license agreement acceptance state
 */
export function useLicenseAgreement() {
  const showLicenseDialog = ref(false)

  /**
   * Check if the license has been accepted and is still valid
   */
  function isLicenseAccepted(): boolean {
    const acceptanceDate = localStorage.getItem(LICENSE_ACCEPTANCE_KEY)

    if (!acceptanceDate) {
      return false
    }

    const acceptedTimestamp = parseInt(acceptanceDate, 10)
    if (isNaN(acceptedTimestamp)) {
      return false
    }

    const now = Date.now()
    const daysSinceAcceptance = (now - acceptedTimestamp) / (1000 * 60 * 60 * 24)

    return daysSinceAcceptance < LICENSE_EXPIRY_DAYS
  }

  /**
   * Record the user's acceptance of the license agreement
   */
  function acceptLicense() {
    localStorage.setItem(LICENSE_ACCEPTANCE_KEY, Date.now().toString())
    showLicenseDialog.value = false
  }

  /**
   * Handle license rejection
   */
  function rejectLicense() {
    const message = 'Without accepting this terms & conditions you can\'t use Atlas'
    alert(message)
    // Keep the dialog open - user must accept to continue
  }

  /**
   * Check if license dialog should be shown and show it if needed
   */
  function checkLicenseStatus() {
    if (!isLicenseAccepted()) {
      showLicenseDialog.value = true
    }
  }

  /**
   * Clear license acceptance (for testing purposes)
   */
  function clearLicenseAcceptance() {
    localStorage.removeItem(LICENSE_ACCEPTANCE_KEY)
  }

  const needsAcceptance = computed(() => !isLicenseAccepted())

  return {
    showLicenseDialog,
    needsAcceptance,
    isLicenseAccepted,
    acceptLicense,
    rejectLicense,
    checkLicenseStatus,
    clearLicenseAcceptance
  }
}
