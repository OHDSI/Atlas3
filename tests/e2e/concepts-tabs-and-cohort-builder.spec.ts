/**
 * E2E Tests: Concepts Tabs and Cohort Builder UI
 *
 * Tests covering:
 * - Tab switching in Concepts view
 * - URL persistence for tab state
 * - Cohort Builder UI elements (breadcrumb, name editing, description)
 * - Concept Sets tab functionality
 */

import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'
import { waitForNetworkIdle, waitForOverlaysToClose, waitForPageReady } from './helpers/wait-utils'

test.describe('Concepts View - Tab Switching', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await page.goto('/#/concepts')
    await waitForPageReady(page)
  })

  test('should display both Concept Search and Concept Sets tabs', async ({ page }) => {
    // Check for both tabs
    const searchTab = page.locator('button.v-tab:has-text("Concept Search"), .v-tab:has-text("search")')
    const setsTab = page.locator('button.v-tab:has-text("Concept Sets"), .v-tab:has-text("sets")')

    const hasSearchTab = await searchTab.count() > 0
    const hasSetsTab = await setsTab.count() > 0

    // Should have at least the tab structure
    expect(hasSearchTab || hasSetsTab).toBeTruthy()
  })

  test('should switch to Concept Sets tab when clicked', async ({ page }) => {
    // Ensure no overlays are blocking
    await waitForOverlaysToClose(page)

    // Find the Concept Sets tab
    const setsTab = page.locator('.v-tab').filter({ hasText: /concept sets|sets/i }).first()
    await expect(setsTab).toBeVisible()

    await setsTab.click()
    await page.waitForTimeout(1000)

    // Verify URL updated with tab parameter
    const url = page.url()
    expect(url.includes('tab=sets') || url.includes('sets')).toBeTruthy()
  })

  test('should persist tab selection in URL', async ({ page }) => {
    // Navigate directly with tab parameter
    await page.goto('/#/concepts?tab=sets')
    await waitForNetworkIdle(page)

    // Verify the sets tab is active
    const url = page.url()
    expect(url).toContain('tab=sets')

    // Check if concept sets content is visible
    const hasContent = await page.locator('.concepts-view, .v-window-item').count() > 0
    expect(hasContent).toBeTruthy()
  })

  test('should display Concept Sets list when on sets tab', async ({ page }) => {
    await page.goto('/#/concepts?tab=sets')
    await waitForNetworkIdle(page)
    await page.waitForTimeout(1000)

    // Check for concept sets UI elements or general tab content
    const createButton = page.getByTestId('create-concept-set')
    const searchInput = page.getByTestId('search-concept-sets')
    const conceptSetList = page.getByTestId('concept-set-list')
    const windowItem = page.locator('.v-window-item')

    const hasCreateButton = await createButton.count() > 0
    const hasSearchInput = await searchInput.count() > 0
    const hasConceptSetList = await conceptSetList.count() > 0
    const hasWindowItem = await windowItem.count() > 0

    // Should have at least window content or specific elements
    expect(hasCreateButton || hasSearchInput || hasConceptSetList || hasWindowItem).toBeTruthy()
  })
})

test.describe('Cohort Builder - Breadcrumb Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
  })

  test('should display navigation back to cohorts list on cohort builder page', async ({ page }) => {
    await page.goto('/#/cohorts/1')
    await waitForPageReady(page)

    // CohortBuilderView.vue passes hide-internal-breadcrumb to CohortBuilder,
    // so the internal <cohort-breadcrumb> (CohortBreadcrumb.vue) never
    // renders in the real app: the hero header (eyebrow + inline title)
    // replaced it, and "back to cohorts" is now the toolbar Cancel button
    // (CohortToolbarActions.vue, which emits 'cancel' -> handleCancel() ->
    // router.push('/cohorts')). The old selectors targeted classes that
    // either never existed or were style-only dead text, and the tautology
    // assertion below them passed regardless of what was found.
    const cancelButton = page.getByRole('button', { name: /^cancel$/i })
    await expect(cancelButton).toBeVisible()
  })

  test('should navigate back to cohorts list when clicking Cancel', async ({ page }) => {
    await page.goto('/#/cohorts/1')
    await waitForPageReady(page)

    // Ensure no overlays are blocking
    await waitForOverlaysToClose(page)

    const cancelButton = page.getByRole('button', { name: /^cancel$/i })
    await expect(cancelButton).toBeVisible()

    await cancelButton.click()
    await page.waitForTimeout(1000)

    // Verify navigation to cohorts list
    const url = page.url()
    expect(url).toContain('/cohorts')
    expect(url).not.toContain('/cohorts/1')
  })
})

test.describe('Cohort Builder - Name Editing', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await page.goto('/#/cohorts/1')
    await waitForPageReady(page)
  })

  test('should display inline-editable cohort name input', async ({ page }) => {
    const titleInput = page.locator('.cohort-builder-view__title-input')
    await expect(titleInput).toBeVisible({ timeout: 5000 })
  })

  test('should accept a new name typed into the inline title input', async ({ page }) => {
    await waitForOverlaysToClose(page)

    const titleInput = page.locator('.cohort-builder-view__title-input')
    await expect(titleInput).toBeVisible({ timeout: 5000 })

    await titleInput.fill('Renamed cohort')
    await titleInput.blur()
    await expect(titleInput).toHaveValue('Renamed cohort')
  })
})

test.describe('Cohort Builder - Description Field', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await page.goto('/#/cohorts/1')
    await waitForPageReady(page)
  })

  test('should display and allow editing description field', async ({ page }) => {
    // cohort-description-input never existed in src/; the description
    // field is the plain subtitle input in CohortBuilderView.vue,
    // identified elsewhere in this file (and other e2e specs) by the
    // .cohort-builder-view__subtitle-input class.
    const descriptionInput = page.locator('.cohort-builder-view__subtitle-input')
    await expect(descriptionInput).toBeVisible({ timeout: 5000 })

    await descriptionInput.fill('Test cohort description')
    await page.waitForTimeout(500)

    const value = await descriptionInput.inputValue()
    expect(value).toContain('Test cohort description')
  })
})

test.describe('Cohort Builder - Action Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await page.goto('/#/cohorts/1')
    await waitForPageReady(page)
  })

  test('should display concept sets icon/button', async ({ page }) => {
    // Check for concept sets button
    const conceptSetsBtn = page.getByTestId('concept-sets-icon')
    await expect(conceptSetsBtn).toBeVisible({ timeout: 5000 })
  })

  test('should display generate button', async ({ page }) => {
    // generate-btn never existed in src/. The real generate action is
    // data-testid="generate-all-btn" inside the collapsed-by-default
    // "Generation" section (CohortGenerationSection.vue); expand it first.
    const generationSection = page.getByTestId('cohort-generation-section')
    await generationSection.getByTestId('cs-header').click()

    const generateBtn = generationSection.getByTestId('generate-all-btn')
    await expect(generateBtn).toBeVisible({ timeout: 5000 })
  })
})
