import { test, expect } from '@playwright/test'

test.describe.skip('Pathways editor', () => {
  test('persists name to draft and restores on reload', async ({ page }) => {
    await page.goto('/pathways/new')
    const name = `e2e-pathway-${Date.now()}`
    await page.getByLabel('Name').fill(name)
    await expect.poll(async () =>
      page.evaluate(() => sessionStorage.getItem('atlas3_pathway_draft'))
    , { timeout: 35000 }).not.toBeNull()
    await page.reload()
    await expect(page.getByLabel('Name')).toHaveValue(name)
  })
})
