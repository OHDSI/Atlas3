import { test, expect } from '@playwright/test'

// The pathway detail route (/pathways/1), the generate endpoint
// (POST /pathway-analysis/1/generation/:sourceKey), the STARTED/STARTING ->
// COMPLETED status polling (GET /pathway-analysis/1/generation), and the
// results view (GET /pathway-analysis/generation/:id/result) are not mocked
// anywhere in tests/e2e/helpers/api-mocks.ts -- only the pathways *list*
// endpoint is. Same root cause as tests/e2e/cohort-generation-inline.spec.ts:
// a real generation run needs a live WebAPI backend to transition through
// job states; test.fixme so this is exercised in environments wired to one.
test.describe('Pathways generation', () => {
  test('generate against demo source and view results', async ({ page }) => {
    test.fixme(true, 'Requires a live WebAPI backend: pathway detail, generation start/poll and results endpoints are unmocked')

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
