import { test, expect } from '@playwright/test'

test.describe.skip('Pathways list', () => {
  test('renders the browse page and supports New', async ({ page }) => {
    await page.goto('/#/pathways')
    await expect(page.getByRole('button', { name: /new pathway/i })).toBeVisible()
    await page.getByRole('button', { name: /new pathway/i }).click()
    await expect(page).toHaveURL(/\/pathways\/new$/)
  })

  test('search filter narrows the list', async ({ page }) => {
    await page.goto('/#/pathways')
    await page.getByLabel('Search').fill('zzzzz_no_match_zzzzz')
    await expect(page.getByText(/no pathways/i)).toBeVisible()
  })
})
