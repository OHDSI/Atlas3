import { test, expect } from '@playwright/test'

const HAS_TREXSQL = process.env.E2E_TREXSQL_ENABLED === '1'

test.describe('Inclusion rule live funnel', () => {
  test.skip(!HAS_TREXSQL, 'TrexSQL preconditions not present (set E2E_TREXSQL_ENABLED=1)')

  test('updates rail counts after editing a criterion', async ({ page }) => {
    await page.goto('/#/cohortdefinition/0')
    await page.getByText('Inclusion rules').click()
    await page.getByTestId('inclusion-rail-add').click()

    const firstRow = page.getByTestId('inclusion-rail-rule').first()
    await expect(firstRow).toBeVisible()

    await firstRow.click()

    const finalRow = page.getByTestId('inclusion-rail-final')
    await expect(finalRow).toBeVisible({ timeout: 10000 })
    const before = await finalRow.innerText()

    await page.getByTestId('add-event-to-group').first().click()
    await page.getByRole('option', { name: 'Condition Occurrence' }).click()

    await page.waitForTimeout(800)
    const after = await finalRow.innerText()
    expect(after).not.toEqual(before)
  })
})
