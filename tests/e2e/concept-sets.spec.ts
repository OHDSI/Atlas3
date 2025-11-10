import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'

/**
 * E2E Test for User Story 6: Manage Concept Sets and Terminology
 *
 * Goal: Enable researchers to search for medical concepts, create concept sets,
 * and manage concept set assignments
 *
 * Test Scenario: User can search for "Metformin", view matching concepts,
 * create concept set "Metformin Products", assign to drug exposure event
 */

test.describe('Concept Set Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cohorts/new')
    await page.waitForLoadState('networkidle')
  })

  test('should create a new concept set', async ({ page }) => {
    // Click New Concept Set button in right panel
    await page.getByRole('button', { name: 'New Concept Set' }).click()
    await page.waitForTimeout(300)

    // Verify concept set appears in list (should see at least 1 concept set chip)
    const chips = page.locator('.v-chip')
    await expect(chips.first()).toBeVisible()
  })

  test('should assign concept set to entry event', async ({ page }) => {
    // Create concept set
    await page.getByRole('button', { name: 'New Concept Set' }).click()
    await page.waitForTimeout(300)

    // Add entry event
    await page.click('[data-testid="add-entry-event"]')
    await page.waitForTimeout(300)

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)

    // Select event type (should default to Condition Occurrence, but let's set it explicitly)
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')

    // Assign concept set by clicking the picker
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)

    // Select first concept set from the list
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Verify concept set chip appears in the event card (should show "Concept Set 1")
    await expect(page.locator('.v-chip').filter({ hasText: /Concept Set/ })).toBeVisible()
  })

  test('should list all concept sets in picker', async ({ page }) => {
    // Create multiple concept sets
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'New Concept Set' }).click()
      await page.waitForTimeout(200)
    }

    // Add entry event to access concept set picker
    await page.click('[data-testid="add-entry-event"]')
    await page.waitForTimeout(300)

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)

    // Set event type
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')

    // Open concept set picker
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)

    // Should see 3 concept sets in dialog
    const items = page.locator('.v-list-item')
    await expect(items).toHaveCount(3)
  })

  test('should remove concept set from event', async ({ page }) => {
    // Create concept set
    await page.getByRole('button', { name: 'New Concept Set' }).click()
    await page.waitForTimeout(300)

    // Add entry event
    await page.click('[data-testid="add-entry-event"]')
    await page.waitForTimeout(300)

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)

    // Select event type and concept set
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Verify concept set is assigned
    const conceptChip = page.locator('.v-chip').filter({ hasText: /Concept Set/ }).first()
    await expect(conceptChip).toBeVisible()

    // Remove concept set by clicking the chip's close button (Vuetify closable chip)
    // Vuetify closable chips have a button with class v-chip__close
    await conceptChip.locator('button').click()
    await page.waitForTimeout(300)

    // Verify "Select Concept Set" button appears again
    await expect(page.locator('[data-testid="concept-set-picker"]')).toBeVisible()
  })

  test('should use concept sets across multiple events', async ({ page }) => {
    // Create a concept set
    await page.getByRole('button', { name: 'New Concept Set' }).click()
    await page.waitForTimeout(300)

    // Add first entry event and assign concept set
    await page.click('[data-testid="add-entry-event"]')
    await page.waitForTimeout(300)
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Add second entry event
    await page.click('[data-testid="add-entry-event"]')
    await page.waitForTimeout(300)

    // Get all entry event cards - there should be 2 now
    // Use a more specific selector that targets only entry event cards
    const eventCards = page.locator('[data-testid="entry-event-card"]')
    await expect(eventCards).toHaveCount(2)

    // Expand the second event card (index 1)
    const secondCard = eventCards.nth(1)
    await secondCard.locator('button:has(.mdi-chevron-down)').click()
    await page.waitForTimeout(500)

    // Select event type for second event (within the second card context)
    await secondCard.locator('[data-testid="event-type-selector"]').click()
    await page.click('text=Drug Exposure')

    // Assign the same concept set to second event
    await secondCard.locator('[data-testid="concept-set-picker"]').click()
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Verify both events show concept set chips
    const conceptChips = page.locator('.v-chip').filter({ hasText: /Concept Set/ })
    await expect(conceptChips).toHaveCount(2)
  })
})
