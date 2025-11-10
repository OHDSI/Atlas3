import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'

/**
 * E2E Test for User Story 3: Add Event Attributes and Filters
 *
 * Goal: Enable researchers to filter events by clinical attributes (age, gender, measurement values)
 *
 * Test Scenario: User can add "Condition of Type 2 Diabetes where age between 18-65 and gender=male",
 * save, reload, verify all attributes preserved
 */

test.describe('Event Attributes and Filters', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await page.goto('/cohorts/new')
    await page.waitForLoadState('networkidle')
  })

  test('should add event with age and gender attributes', async ({ page }) => {
    // Create a concept set first (required for selection)
    await page.getByRole('button', { name: 'New Concept Set' }).click()
    await page.waitForTimeout(300)

    // Add entry event
    await page.click('[data-testid="add-entry-event"]')

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)

    // Select event type: Condition Occurrence
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')

    // Select concept set from dialog (click button to open dialog)
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)

    // Click on the first concept set in the list
    await page.locator('.v-list-item').first().click()

    // Click "Add Attributes" button to show the attributes editor
    await page.click('button:has-text("Add Attributes")')
    await page.waitForTimeout(300)

    // Add age attribute
    await page.click('[data-testid="add-attribute-button"]')
    await page.click('[data-testid="attribute-selector"]')
    await page.click('text=Age')

    // Set age operator to BETWEEN
    await page.click('[data-testid="attribute-operator-selector"]')
    await page.click('text=Between')

    // Set age range: 18-65
    await page.locator('[data-testid="attribute-value-input"] input').fill('18')
    await page.locator('[data-testid="attribute-extent-input"] input').fill('65')

    // Save the attribute
    await page.click('button:has-text("Save Attribute")')
    await page.waitForTimeout(300)

    // Add gender attribute
    await page.click('[data-testid="add-attribute-button"]')
    await page.waitForTimeout(300)
    await page.click('[data-testid="attribute-selector"]')
    await page.click('text=Gender')
    await page.waitForTimeout(300)

    // Click the magnify icon to trigger the concept set picker (currently sets mock "Male" value)
    await page.locator('[data-testid="attribute-concept-set-picker"]').locator('.mdi-magnify').click()
    await page.waitForTimeout(300)

    // Save the gender attribute
    await page.click('button:has-text("Save Attribute")')
    await page.waitForTimeout(300)

    // Verify both attributes are displayed
    await expect(page.locator('text=Age: 18 to 65')).toBeVisible()
    await expect(page.locator('text=Gender: Male')).toBeVisible()
  })

  test('should support numeric attribute operators', async ({ page }) => {
    // Create concept set first
    await page.getByRole('button', { name: 'New Concept Set' }).click()
    await page.waitForTimeout(300)

    // Add entry event with measurement
    await page.click('[data-testid="add-entry-event"]')

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Measurement')

    // Select concept set from dialog
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()

    // Click "Add Attributes" button to show the attributes editor
    await page.click('button:has-text("Add Attributes")')
    await page.waitForTimeout(300)

    // Test GREATER_THAN operator
    await page.click('[data-testid="add-attribute-button"]')
    await page.click('[data-testid="attribute-selector"]')
    await page.click('text=Value as Number')
    await page.click('[data-testid="attribute-operator-selector"]')
    await page.click('text=Greater Than')
    await page.locator('[data-testid="attribute-value-input"] input').fill( '7.0')

    // Save the attribute
    await page.click('button:has-text("Save Attribute")')
    await page.waitForTimeout(300)

    // Verify display (format is "Value as Number > 7" without decimals for whole numbers)
    await expect(page.locator('text=Value as Number > 7')).toBeVisible()

    // Change to BETWEEN operator
    await page.click('[data-testid="edit-attribute-button"]')
    await page.click('[data-testid="attribute-operator-selector"]')
    await page.click('text=Between')
    await page.locator('[data-testid="attribute-value-input"] input').fill('6.5')
    await page.locator('[data-testid="attribute-extent-input"] input').fill('9')

    // Update the attribute
    await page.click('button:has-text("Update Attribute")')
    await page.waitForTimeout(300)

    // Verify updated display (format shows mixed decimals: "6.5 to 9")
    await expect(page.locator('text=Value as Number: 6.5 to 9')).toBeVisible()
  })

  test('should support date range attributes', async ({ page }) => {
    // Create concept set first
    await page.getByRole('button', { name: 'New Concept Set' }).click()
    await page.waitForTimeout(300)

    // Add entry event
    await page.click('[data-testid="add-entry-event"]')

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')

    // Select concept set from dialog
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()

    // Click "Add Attributes" button to show the attributes editor
    await page.click('button:has-text("Add Attributes")')
    await page.waitForTimeout(300)

    // Add date attribute
    await page.click('[data-testid="add-attribute-button"]')
    await page.click('[data-testid="attribute-selector"]')
    await page.click('text=Occurrence Start Date')

    // Set date range
    await page.click('[data-testid="attribute-operator-selector"]')
    await page.click('text=Between')
    await page.locator('[data-testid="attribute-start-date-input"] input').fill( '2020-01-01')
    await page.locator('[data-testid="attribute-end-date-input"] input').fill( '2023-12-31')

    // Save the attribute
    await page.click('button:has-text("Save Attribute")')
    await page.waitForTimeout(300)

    // Verify display
    await expect(page.locator('text=Occurrence Start Date: 2020-01-01 to 2023-12-31')).toBeVisible()
  })

  test('should allow removing attributes', async ({ page }) => {
    // Create concept set first
    await page.getByRole('button', { name: 'New Concept Set' }).click()
    await page.waitForTimeout(300)

    // Add entry event with attributes
    await page.click('[data-testid="add-entry-event"]')

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')

    // Select concept set from dialog
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()

    // Click "Add Attributes" button to show the attributes editor
    await page.click('button:has-text("Add Attributes")')
    await page.waitForTimeout(300)

    // Add age attribute
    await page.click('[data-testid="add-attribute-button"]')
    await page.click('[data-testid="attribute-selector"]')
    await page.click('text=Age')
    await page.click('[data-testid="attribute-operator-selector"]')
    await page.click('text=Greater Than or Equal')
    await page.locator('[data-testid="attribute-value-input"] input').fill( '18')

    // Save the attribute
    await page.click('button:has-text("Save Attribute")')
    await page.waitForTimeout(300)

    // Verify attribute exists
    await expect(page.locator('text=Age >= 18')).toBeVisible()

    // Remove attribute
    await page.click('[data-testid="remove-attribute-button"]')

    // Verify attribute is removed
    await expect(page.locator('text=Age >= 18')).not.toBeVisible()
  })

  test('should validate BETWEEN operator requires extent', async ({ page }) => {
    // Create concept set first
    await page.getByRole('button', { name: 'New Concept Set' }).click()
    await page.waitForTimeout(300)

    // Add entry event
    await page.click('[data-testid="add-entry-event"]')

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Measurement')

    // Select concept set from dialog
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()

    // Click "Add Attributes" button to show the attributes editor
    await page.click('button:has-text("Add Attributes")')
    await page.waitForTimeout(300)

    // Add attribute with BETWEEN but no extent
    await page.click('[data-testid="add-attribute-button"]')
    await page.click('[data-testid="attribute-selector"]')
    await page.click('text=Value as Number')
    await page.click('[data-testid="attribute-operator-selector"]')
    await page.click('text=Between')
    await page.locator('[data-testid="attribute-value-input"] input').fill( '5.0')

    // Try to save without extent
    await page.click('button:has-text("Save Attribute")')

    // Verify validation error
    await expect(page.locator('text=Extent value required for BETWEEN operator')).toBeVisible()

    // Add extent
    await page.locator('[data-testid="attribute-extent-input"] input').fill('8')
    await page.click('button:has-text("Save Attribute")')

    // Verify successful save (format shows integers without decimals)
    await expect(page.locator('text=Value as Number: 5 to 8')).toBeVisible()
  })
})
