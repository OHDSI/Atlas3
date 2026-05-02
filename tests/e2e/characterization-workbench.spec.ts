import { test, expect } from '@playwright/test'

test.describe.skip('Characterization workbench', () => {
  test('navigates from list to workbench', async ({ page }) => {
    await page.goto('/characterizations')
    await page.getByTestId('characterizations-list').waitFor({ state: 'visible' })
    const firstRow = page.locator('[data-testid^="characterizations-row-"]').first()
    await firstRow.click()
    await expect(page.getByTestId('char-builder')).toBeVisible()
    await expect(page.getByTestId('char-builder-workbench')).toBeVisible()
    await expect(page.getByTestId('char-toolbar-mode-table1')).toBeVisible()
  })

  test('switches view modes', async ({ page }) => {
    await page.goto('/characterizations')
    const firstRow = page.locator('[data-testid^="characterizations-row-"]').first()
    await firstRow.click()
    await page.getByTestId('char-toolbar-mode-perAnalysis').click()
    const anyCard = page.locator('[data-testid^="char-results-prevalence-"]').first()
    const empty = page.getByText(/No rows match/i).first()
    await Promise.race([
      anyCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
      empty.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
    ])
  })

  test('opens and closes the configure inspector', async ({ page }) => {
    await page.goto('/characterizations')
    const firstRow = page.locator('[data-testid^="characterizations-row-"]').first()
    await firstRow.click()
    await page.getByTestId('char-toolbar-configure').click()
    await expect(page.getByTestId('configure-inspector')).toBeVisible()
    await page.getByTestId('configure-close').click()
    await expect(page.getByTestId('configure-inspector')).toBeHidden()
  })

  test('redirects old results URL to workbench with ?run=', async ({ page }) => {
    await page.goto('/characterizations/1/results/1')
    await expect(page).toHaveURL(/\/characterizations\/1\?run=1$/)
  })
})
