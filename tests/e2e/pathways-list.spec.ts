import { test, expect } from '@playwright/test'
import { setupBasicMocks, setupAnalysisListMocks } from './helpers/api-mocks'

test.describe('Pathways list', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await setupAnalysisListMocks(page)
  })

  test('renders the browse page and supports New', async ({ page }) => {
    await page.goto('/#/pathways')
    const newButton = page.getByTestId('pathways-create')
    await expect(newButton).toBeVisible()
    await newButton.click()
    await expect(page).toHaveURL(/\/pathways\/new$/)
  })

  test('search filter narrows the list', async ({ page }) => {
    await page.goto('/#/pathways')
    await expect(page.getByTestId('pathways-table-row-name')).toBeVisible()
    await page.getByTestId('pathways-search').getByRole('textbox').fill('zzzzz_no_match_zzzzz')
    // AnalysisDataTable's empty-state fallback text is overridden by the
    // shipped locale bundle's common.noData key ("No data"), not the
    // component's inline default ("No pathways yet."); see src/locales/en.json.
    await expect(page.getByTestId('pathways-table').getByText(/no data/i)).toBeVisible()
  })
})
