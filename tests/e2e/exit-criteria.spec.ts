import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'

/**
 * E2E Test for User Story 5: Define Exit Criteria and Observation Periods
 *
 * Goal: Enable researchers to specify when patients exit the cohort and observation period requirements
 *
 * Test Scenario: User can define "365 days prior observation, exit on death or continuous observation end,
 * or fixed 730 days", save, reload, verify exit strategy preserved
 */

test.describe('Exit Criteria and Observation Periods', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cohorts/new')
    await page.waitForLoadState('networkidle')
    
    // Create a concept set for tests to use
    await page.getByRole('button', { name: 'New Concept Set' }).click()
    await page.waitForTimeout(300)
  })

  test('should configure observation period requirements', async ({ page }) => {
    // Add entry event
    await page.click('[data-testid="add-entry-event"]')

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')

    // Configure observation period
    await page.locator('[data-testid="prior-days-input"] input').fill('365')
    await page.locator('[data-testid="post-days-input"] input').fill('180')

    // Verify the input fields have the correct values
    await expect(page.locator('[data-testid="prior-days-input"] input')).toHaveValue('365')
    await expect(page.locator('[data-testid="post-days-input"] input')).toHaveValue('180')
  })

  test('should configure continuous observation exit strategy', async ({ page }) => {
    // Add entry event
    await page.click('[data-testid="add-entry-event"]')

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)

    // Select exit strategy - the dropdown shows the full label with description
    await page.click('[data-testid="exit-strategy-selector"]')
    await page.locator('.v-list-item:has-text("Continuous Observation")').click()
    await page.waitForTimeout(300)

    // Verify the exit strategy selector shows the correct option
    await expect(page.locator('[data-testid="exit-strategy-selector"]')).toContainText('Continuous Observation')
  })

  test('should configure fixed duration exit strategy', async ({ page }) => {
    // Add entry event
    await page.click('[data-testid="add-entry-event"]')

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)

    // Select fixed duration exit
    await page.click('[data-testid="exit-strategy-selector"]')
    await page.locator('.v-list-item:has-text("Fixed Duration")').click()
    await page.waitForTimeout(300)

    // Set duration
    await page.locator('[data-testid="exit-offset-input"] input').fill('730')

    // Verify the exit strategy selector shows the correct option and duration field has value
    await expect(page.locator('[data-testid="exit-strategy-selector"]')).toContainText('Fixed Duration')
    await expect(page.locator('[data-testid="exit-offset-input"] input')).toHaveValue('730')
  })

  test('should configure custom event exit strategy', async ({ page }) => {
    // Add entry event
    await page.click('[data-testid="add-entry-event"]')

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)

    // Select custom event exit
    await page.click('[data-testid="exit-strategy-selector"]')
    await page.locator('.v-list-item:has-text("Custom Event")').click()
    await page.waitForTimeout(300)

    // Verify the exit strategy selector shows the correct option
    await expect(page.locator('[data-testid="exit-strategy-selector"]')).toContainText('Custom Event')

    // Verify the add censoring event button is visible
    await expect(page.locator('[data-testid="add-censoring-event"]')).toBeVisible()
  })
})
