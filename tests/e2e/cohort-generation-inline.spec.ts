import { test, expect } from '@playwright/test'

// The first test triggers a real generation against a live WebAPI; without that
// backend the run never completes. It is gated with test.fixme so the spec is
// committed and can be exercised in environments wired to a real backend.

test.describe('Cohort builder — inline generation section', () => {
  test('generate, view inclusion report, then samples', async ({ page }) => {
    test.fixme(true, 'Requires a live WebAPI backend with a generatable cohort id 2')

    await page.goto('/cohorts/2')
    await expect(page.getByTestId('cohort-generation-section')).toBeVisible()

    const header = page.getByTestId('cs-header').first()
    await expect(header).toBeVisible()

    const runBtn = page.getByTestId(/^run-btn-/).first()
    await runBtn.click()

    await expect(page.locator('text=/\\d+ \\/ \\d+ generated/')).toBeVisible({ timeout: 60_000 })

    const inclusionBtn = page.getByTestId(/^row-extra-inclusion-/).first()
    await expect(inclusionBtn).toBeEnabled({ timeout: 60_000 })
    await inclusionBtn.click()
    await expect(page.getByTestId('cohort-report-drawer')).toBeVisible()
    await page.getByTestId('report-drawer-close').click()

    const samplesBtn = page.getByTestId(/^row-extra-samples-/).first()
    await samplesBtn.click()
    await expect(page.getByTestId('cohort-report-drawer')).toBeVisible()
  })

  test('drawer state survives reload via URL params', async ({ page }) => {
    test.fixme(true, 'Requires a live WebAPI backend with cohort id 2 and a generated CCAE run')
    await page.goto('/cohorts/2?report=inclusion&source=CCAE')
    await expect(page.getByTestId('cohort-report-drawer')).toBeVisible()
  })
})
