import { test, expect } from '@playwright/test'

test.describe.skip('Pathways generation', () => {
  test('generate against demo source and view results', async ({ page }) => {
    await page.goto('/#/pathways/1')
    await page.getByLabel('Data source').click()
    await page.getByRole('option').first().click()
    await page.getByTestId('generate-btn').click()
    await expect(page.getByText(/STARTED|STARTING/)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('COMPLETED')).toBeVisible({ timeout: 120000 })
    await page.getByRole('link', { name: 'View' }).first().click()
    await expect(page.getByRole('heading', { name: /Execution/ })).toBeVisible()
  })
})
