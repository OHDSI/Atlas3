import { test, expect } from '@playwright/test'

test.describe('Pathways editor', () => {
  test('persists name to draft and restores on reload', async ({ page }) => {
    await page.goto('/#/pathways/new')
    const name = `e2e-pathway-${Date.now()}`
    await page.getByLabel('Name').fill(name)
    // Autosave runs on PATHWAY_AUTO_SAVE_INTERVAL_MS (30s, src/models/pathway.types.ts),
    // so the poll window needs real margin above that plus setup/navigation time.
    await expect.poll(async () =>
      page.evaluate(() => sessionStorage.getItem('atlas3_pathway_draft'))
    , { timeout: 45000 }).not.toBeNull()
    await page.reload()
    await expect(page.getByLabel('Name')).toHaveValue(name)
  })
})
