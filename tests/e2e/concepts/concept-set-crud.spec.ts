/**
 * Concept Set list E2E tests
 *
 * Runs against the deterministic mocks in helpers/api-mocks: the list
 * endpoint always returns exactly three concept sets, so every assertion
 * here is strict — no feature-detection fallbacks.
 */
import { test, expect } from '@playwright/test'
import { setupBasicMocks } from '../helpers/api-mocks'
import { waitForPageReady } from '../helpers/wait-utils'

const MOCKED_SETS = ['Test Concept Set 1', 'Diabetes Medications', 'Type 2 Diabetes']

test.describe('Concept Set list', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)

    // Fallback for editor subresources (versions, items, ...) — an unmocked
    // request would fall through to the vite proxy and its 401 logs the
    // mocked user out, disabling every action button mid-test.
    await page.route('**/WebAPI/conceptset/1/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    )
    await page.route('**/WebAPI/conceptset/1/expression/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] })
      })
    )
    await page.route('**/WebAPI/conceptset/1', route => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ status: 204, body: '' })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'Test Concept Set 1',
          createdBy: 'test_user',
          createdDate: Date.parse('2024-01-01T00:00:00.000Z'),
          modifiedBy: 'test_user',
          modifiedDate: Date.parse('2024-01-01T00:00:00.000Z')
        })
      })
    })

    await page.goto('/#/concepts')
    await waitForPageReady(page)
    await expect(page.locator('table tbody tr')).toHaveCount(MOCKED_SETS.length)
  })

  test('lists the mocked concept sets', async ({ page }) => {
    for (const name of MOCKED_SETS) {
      await expect(page.locator('table tbody tr', { hasText: name })).toHaveCount(1)
    }
  })

  test('filters concept sets by name and restores the list on clear', async ({ page }) => {
    const search = page.getByRole('textbox', { name: /search/i }).first()
    await search.fill('diabetes')

    await expect(page.locator('table tbody tr')).toHaveCount(2)
    await expect(page.locator('table tbody tr', { hasText: 'Test Concept Set 1' })).toHaveCount(0)

    await search.clear()
    await expect(page.locator('table tbody tr')).toHaveCount(MOCKED_SETS.length)
  })

  test('shows created dates in the list', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toContainText(/2024/)
  })

  test('opens the editor for a new concept set', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /new concept set/i }).first()
    // Permissions from /user/me load asynchronously; the retrying assertion
    // also serves as the wait for the button to enable.
    await expect(newButton).toBeEnabled()
    await newButton.click()

    await expect(page.getByTestId('cs-editor-primary-btn')).toBeVisible()
    await expect(
      page.locator('.cs-editor__actions').getByRole('button', { name: 'Delete', exact: true })
    ).toHaveCount(0)
  })

  test('opens the editor for an existing concept set', async ({ page }) => {
    const editButton = page
      .locator('table tbody tr', { hasText: 'Test Concept Set 1' })
      .locator('button[aria-label="Edit"]')
    await expect(editButton).toBeEnabled()
    await editButton.click()

    await expect(page.getByTestId('cs-editor-primary-btn')).toBeVisible()
    // Not getByTestId('conceptset-delete'): the source declares that testid
    // but it never reaches the DOM (pre-existing bug the old tolerant test
    // hid by skipping when the locator came up empty).
    await expect(
      page.locator('.cs-editor__actions').getByRole('button', { name: 'Delete', exact: true })
    ).toBeVisible()
  })

  test('deletes a concept set after confirmation', async ({ page }) => {
    const editButton = page
      .locator('table tbody tr', { hasText: 'Test Concept Set 1' })
      .locator('button[aria-label="Edit"]')
    await expect(editButton).toBeEnabled()
    await editButton.click()
    const deleteButton = page
      .locator('.cs-editor__actions')
      .getByRole('button', { name: 'Delete', exact: true })
    await expect(deleteButton).toBeEnabled()
    await deleteButton.click()

    const confirmDialog = page.getByRole('dialog').filter({ hasText: 'Test Concept Set 1' })
    await expect(confirmDialog).toBeVisible()

    const deleteRequest = page.waitForRequest(
      request => request.method() === 'DELETE' && request.url().includes('/conceptset/1')
    )
    await confirmDialog.getByRole('button', { name: /^delete$/i }).click()
    await deleteRequest

    await expect(confirmDialog).not.toBeVisible()
  })
})
