/**
 * Optimizing a concept set (#347): WebAPI's optimizer finds items that another
 * item already covers, and the user can overwrite the set with the result.
 */
import { test, expect } from '@playwright/test'
import { setupBasicMocks } from '../helpers/api-mocks'
import { waitForPageReady } from '../helpers/wait-utils'

const concept = (id: number, name: string) => ({
  CONCEPT_ID: id,
  CONCEPT_NAME: name,
  CONCEPT_CODE: String(id),
  DOMAIN_ID: 'Condition',
  VOCABULARY_ID: 'SNOMED',
  CONCEPT_CLASS_ID: 'Clinical Finding',
  STANDARD_CONCEPT: 'S',
  STANDARD_CONCEPT_CAPTION: 'Standard',
  INVALID_REASON: 'V',
  INVALID_REASON_CAPTION: 'Valid',
})

const parent = { concept: concept(201820, 'Diabetes mellitus'), isExcluded: false, includeDescendants: true, includeMapped: false }
const child = { concept: concept(201826, 'Type 2 diabetes mellitus'), isExcluded: false, includeDescendants: false, includeMapped: false }

test.describe('Concept set optimization', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)

    await page.route('**/WebAPI/conceptset/1/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    )
    await page.route('**/WebAPI/conceptset/1/expression/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [parent, child] }) })
    )
    await page.route('**/WebAPI/conceptset/1', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'Test Concept Set 1',
          createdBy: 'test_user',
          createdDate: Date.parse('2024-01-01T00:00:00.000Z'),
          modifiedBy: 'test_user',
          modifiedDate: Date.parse('2024-01-01T00:00:00.000Z'),
        }),
      })
    )
    await page.route('**/WebAPI/vocabulary/*/optimize', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          optimizedConceptSet: { items: [parent] },
          removedConceptSet: { items: [child] },
        }),
      })
    )

    await page.goto('/#/concepts')
    await waitForPageReady(page)
  })

  test('shows the removed concepts and overwrites the set with the optimized one', async ({ page }) => {
    await page.locator('table tbody tr', { hasText: 'Test Concept Set 1' }).click()
    await expect(page.getByText('Type 2 diabetes mellitus')).toBeVisible()

    await page.getByTestId('cs-editor-optimize-btn').click()

    await expect(page.getByTestId('cs-optimize-removed')).toContainText('Type 2 diabetes mellitus')
    await expect(page.getByTestId('cs-optimize-optimized')).toContainText('Diabetes mellitus')
    if (process.env.REPRO_SHOTS) {
      await page.screenshot({ path: `${process.env.REPRO_SHOTS}/optimize-dialog.png` })
    }

    await page.getByTestId('cs-optimize-overwrite').click()

    await expect(page.getByTestId('cs-optimize-removed')).toBeHidden()
    await expect(page.getByText('Type 2 diabetes mellitus')).toBeHidden()
    await expect(page.getByText('Diabetes mellitus')).toBeVisible()
    if (process.env.REPRO_SHOTS) {
      await page.screenshot({ path: `${process.env.REPRO_SHOTS}/optimize-after.png` })
    }
  })

  test('saves the optimized definition as a new concept set and opens it', async ({ page }) => {
    let createdItems: unknown = null
    await page.route('**/WebAPI/conceptset/', route =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id: 9, name: 'Test Concept Set 1 - OPTIMIZED' }),
          })
        : route.fallback()
    )
    await page.route('**/WebAPI/conceptset', route =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id: 9, name: 'Test Concept Set 1 - OPTIMIZED' }),
          })
        : route.fallback()
    )
    await page.route('**/WebAPI/conceptset/9/**', route => {
      if (route.request().method() === 'PUT') {
        createdItems = route.request().postDataJSON()
        return route.fulfill({ status: 200, contentType: 'application/json', body: 'true' })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.route('**/WebAPI/conceptset/9/expression/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [parent] }) })
    )
    await page.route('**/WebAPI/conceptset/9', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 9, name: 'Test Concept Set 1 - OPTIMIZED', createdBy: 'test_user' }),
      })
    )

    await page.locator('table tbody tr', { hasText: 'Test Concept Set 1' }).click()
    await page.getByTestId('cs-editor-optimize-btn').click()
    await page.getByTestId('cs-optimize-create').click()
    await expect(page.getByTestId('cs-optimize-new-name').locator('input')).toHaveValue(
      'Test Concept Set 1 - OPTIMIZED'
    )
    await page.getByTestId('cs-optimize-save-new').click()

    await expect(page.getByText('Created concept set "Test Concept Set 1 - OPTIMIZED"')).toBeVisible()
    expect(createdItems).toEqual([
      { conceptId: 201820, isExcluded: 0, includeDescendants: 1, includeMapped: 0 },
    ])
    await expect(page.locator('.cs-editor__title-input')).toHaveValue('Test Concept Set 1 - OPTIMIZED')
    if (process.env.REPRO_SHOTS) {
      await page.screenshot({ path: `${process.env.REPRO_SHOTS}/optimize-created.png` })
    }
  })
})
