/**
 * Concept Set list E2E tests
 *
 * Runs against the deterministic mocks in helpers/api-mocks: the list
 * endpoint always returns exactly three concept sets, so every assertion
 * here is strict — no feature-detection fallbacks.
 */
import { test, expect, type Page } from '@playwright/test'
import { setupBasicMocks } from '../helpers/api-mocks'
import { waitForPageReady } from '../helpers/wait-utils'

const MOCKED_SETS = ['Test Concept Set 1', 'Diabetes Medications', 'Type 2 Diabetes']

async function createNewConceptSet(page: Page) {
  const newButton = page.getByRole('button', { name: /new concept set/i }).first()
  // Permissions from /user/me load asynchronously; the retrying assertion
  // also serves as the wait for the button to enable.
  await expect(newButton).toBeEnabled()
  await newButton.click()
  await page.getByTestId('new-concept-set-name').locator('input').fill('New test set')
  await page.getByTestId('new-concept-set-create').click()
}

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
    await createNewConceptSet(page)

    await expect(page.getByTestId('cs-editor-primary-btn')).toBeVisible()
    await expect(
      page.locator('.cs-editor__actions').getByRole('button', { name: 'Delete', exact: true })
    ).toHaveCount(0)
  })

  test('opens the editor for an existing concept set', async ({ page }) => {
    // Rows open the editor on click; the list has no separate Edit button.
    await page.locator('table tbody tr', { hasText: 'Test Concept Set 1' }).click()

    await expect(page.getByTestId('cs-editor-primary-btn')).toBeVisible()
    await expect(
      page.locator('.cs-editor__actions').getByRole('button', { name: 'Delete', exact: true })
    ).toHaveCount(0)
  })

  test('deletes a concept set after confirmation', async ({ page }) => {
    const deleteButton = page
      .locator('table tbody tr', { hasText: 'Test Concept Set 1' })
      .locator('button[aria-label="Delete"]')
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

test.describe('Concept set editor — inline panel layout', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await page.goto('/#/concepts')
    await waitForPageReady(page)
  })

  // #254 — the search field is the first element inside the tab's v-window,
  // whose overflow: hidden clips anything rendered above its own top edge.
  // The floating label needs clearance there or its top gets sliced off.
  test('search tab field has clearance so its floating label is not clipped by the tab window', async ({
    page
  }) => {
    await createNewConceptSet(page)
    await expect(page.getByTestId('cs-editor-primary-btn')).toBeVisible()

    // New sets open on the Search tab.
    const wrap = page.locator('.concept-search-embed')
    await expect(wrap).toBeVisible()

    const paddingTop = await wrap.evaluate(el => parseFloat(getComputedStyle(el).paddingTop))
    expect(paddingTop).toBeGreaterThan(0)
  })

  // #253 — ConceptDetailHeader in the inline concept detail is position:
  // sticky. The detail now flows with the page instead of being its own
  // bounded scroll box, so the window scrolls and the header must stick flush
  // below the app nav bar: no gap above it, and not hidden underneath the bar.
  test('inline concept detail header sticks flush below the nav bar on scroll', async ({
    page
  }) => {
    await createNewConceptSet(page)
    await expect(page.getByTestId('cs-editor-primary-btn')).toBeVisible()

    const searchInput = page.locator('.concept-search-embed input').first()
    await searchInput.fill('diabetes')
    await searchInput.press('Enter')

    const nameLink = page.locator('[data-testid^="concept-name-link-"]').first()
    await expect(nameLink).toBeVisible({ timeout: 10000 })
    await nameLink.click()

    const detail = page.locator('[data-testid="concept-set-editor-inline-detail"]')
    await expect(detail).toBeVisible()
    const header = page.getByTestId('concept-detail-header')
    await expect(header).toBeVisible()

    // The detail is not a nested scroller on the page: its full content is laid out.
    const detailBox = await detail.evaluate(el => ({ client: el.clientHeight, scroll: el.scrollHeight }))
    expect(detailBox.scroll).toBeLessThanOrEqual(detailBox.client + 1)

    // The test data gives a short detail, so at the default 720px viewport the
    // window cannot scroll far enough for the header to reach the nav bar and
    // the check would measure its resting position instead of the stuck one.
    await page.setViewportSize({ width: 1280, height: 480 })
    const headerRestTop = await header.evaluate(el => el.getBoundingClientRect().top + window.scrollY)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(headerRestTop - 60)

    const rects = await page.evaluate(() => {
      const navEl = document.querySelector('.nav-bar')!
      const headerEl = document.querySelector('[data-testid="concept-detail-header"]')!
      return { navBottom: navEl.getBoundingClientRect().bottom, headerTop: headerEl.getBoundingClientRect().top }
    })
    expect(rects.headerTop).toBeCloseTo(rects.navBottom, 0)
  })
})
