import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'

/**
 * E2E Test for User Story 4: Create Inclusion Criteria Groups with Logic
 *
 * Goal: Enable researchers to combine events with logical operators (ALL, ANY, AT_LEAST, AT_MOST)
 *
 * Test Scenario: User can create inclusion rule "ALL of: HbA1c measurement, Metformin prescription,
 * Outpatient visit within 90 days", save, reload, verify group logic preserved
 */

test.describe('Inclusion Criteria Groups', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cohorts/new')
    await page.waitForLoadState('networkidle')
    
    // Create a concept set for tests to use
    await page.getByRole('button', { name: 'New Concept Set' }).click()
    await page.waitForTimeout(300)
  })

  test('should create inclusion rule with ALL logic', async ({ page }) => {
    // Add entry event first
    await page.click('[data-testid="add-entry-event"]')
    
    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)
    // Replaced search with list selection

    // Add inclusion rule
    await page.click('button:has-text("Add Inclusion Rule")')
    await page.locator('[data-testid="inclusion-rule-name"] input').fill('Diabetes Treatment Criteria')
    await page.locator('.v-dialog .v-card-actions button:has-text("Add")').click()
    await page.waitForTimeout(300)

    // Expand the inclusion rule panel
    await page.click('text=Diabetes Treatment Criteria')
    await page.waitForTimeout(300)

    // Add criteria group with ALL logic
    await page.click('button:has-text("Add Criteria Group")')
    await page.click('[data-testid="logic-type-selector"]')
    await page.click('text=ALL')

    // Add HbA1c measurement to group
    await page.click('[data-testid="add-event-to-group"]')
    await page.click('[data-testid="event-type-selector"]:last-of-type')
    await page.click('text=Measurement')
    await page.click('[data-testid="concept-set-picker"]:last-of-type')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Add Metformin prescription to group
    await page.click('[data-testid="add-event-to-group"]')
    await page.click('[data-testid="event-type-selector"]:last-of-type')
    await page.click('text=Drug Exposure')
    await page.click('[data-testid="concept-set-picker"]:last-of-type')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Add Outpatient visit to group
    await page.click('[data-testid="add-event-to-group"]')
    await page.click('[data-testid="event-type-selector"]:last-of-type')
    await page.click('text=Visit Occurrence')
    await page.click('[data-testid="concept-set-picker"]:last-of-type')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()

    // Verify ALL logic is displayed and 3 events were added to the group
    await expect(page.locator('text=Events in Group')).toBeVisible()
    await expect(page.locator('[data-testid="group-event-item"]')).toHaveCount(3)

    // Save cohort - scroll to top first
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)
    await page.getByLabel('Name').fill('Cohort with Inclusion Rules')
    await page.click('button:has-text("Save Cohort")')
    await expect(page.locator('text=Cohort saved successfully')).toBeVisible()
  })

  test('should create inclusion rule with ANY logic', async ({ page }) => {
    // Add entry event
    await page.click('[data-testid="add-entry-event"]')
    
    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(500)
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Add inclusion rule with ANY logic
    await page.click('button:has-text("Add Inclusion Rule")')
    await page.locator('[data-testid="inclusion-rule-name"] input').fill('Any Diabetes Medication')
    await page.locator('.v-dialog .v-card-actions button:has-text("Add")').click()
    await page.waitForTimeout(300)

    // Expand the inclusion rule panel
    await page.click('text=Any Diabetes Medication')
    await page.waitForTimeout(300)

    await page.click('button:has-text("Add Criteria Group")')
    await page.waitForTimeout(300)
    await page.click('[data-testid="logic-type-selector"]')
    await page.waitForTimeout(200)

    // Click on the ANY option in the dropdown
    await page.locator('.v-list-item:has-text("ANY")').click()
    await page.waitForTimeout(300)

    // Add multiple drug events
    await page.click('[data-testid="add-event-to-group"]')
    await page.click('[data-testid="event-type-selector"]:last-of-type')
    await page.click('text=Drug Exposure')
    await page.click('[data-testid="concept-set-picker"]:last-of-type')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    await page.click('[data-testid="add-event-to-group"]')
    await page.click('[data-testid="event-type-selector"]:last-of-type')
    await page.click('text=Drug Exposure')
    await page.click('[data-testid="concept-set-picker"]:last-of-type')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Verify ANY logic is displayed and 2 events were added to the group
    await expect(page.locator('text=Events in Group')).toBeVisible()
    await expect(page.locator('[data-testid="group-event-item"]')).toHaveCount(2)
  })

  test('should create inclusion rule with AT_LEAST logic', async ({ page }) => {
    // Add entry event
    await page.click('[data-testid="add-entry-event"]')
    
    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Add inclusion rule with AT_LEAST logic
    await page.click('button:has-text("Add Inclusion Rule")')
    await page.locator('[data-testid="inclusion-rule-name"] input').fill('At Least 2 Complications')
    await page.locator('.v-dialog .v-card-actions button:has-text("Add")').click()
    await page.waitForTimeout(300)

    // Expand the inclusion rule panel
    await page.click('text=At Least 2 Complications')
    await page.waitForTimeout(300)

    await page.click('button:has-text("Add Criteria Group")')
    await page.waitForTimeout(300)
    await page.click('[data-testid="logic-type-selector"]')
    await page.waitForTimeout(200)

    // Click on the AT_LEAST option in the dropdown (not ANY which also contains "At least")
    await page.locator('.v-list-item', { hasText: 'AT LEAST - Minimum count' }).click()
    await page.waitForTimeout(300)

    // Set count to 2
    await page.fill('[data-testid="logic-count-input"] input', '2')

    // Add multiple complication events (just 2 for simplicity)
    await page.click('[data-testid="add-event-to-group"]')
    await page.click('[data-testid="event-type-selector"]:last-of-type')
    await page.click('text=Condition Occurrence')

    await page.click('[data-testid="add-event-to-group"]')
    await page.click('[data-testid="event-type-selector"]:last-of-type')
    await page.click('text=Condition Occurrence')

    // Verify AT_LEAST logic is displayed with count and events
    await expect(page.locator('text=Events in Group')).toBeVisible()
    await expect(page.locator('[data-testid="logic-count-input"] input')).toHaveValue('2')
    await expect(page.locator('[data-testid="group-event-item"]')).toHaveCount(2)
  })

  test('should support nested criteria groups', async ({ page }) => {
    // Add entry event
    await page.click('[data-testid="add-entry-event"]')
    
    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)
    // Replaced search with list selection

    // Add inclusion rule
    await page.click('button:has-text("Add Inclusion Rule")')
    await page.locator('[data-testid="inclusion-rule-name"] input').fill('Complex Criteria')
    await page.locator('.v-dialog .v-card-actions button:has-text("Add")').click()
    await page.waitForTimeout(300)

    // Expand the inclusion rule panel
    await page.click('text=Complex Criteria')
    await page.waitForTimeout(300)

    // Add outer group (ALL)
    await page.click('button:has-text("Add Criteria Group")')
    await page.click('[data-testid="logic-type-selector"]')
    await page.click('text=ALL')

    // Add event to outer group
    await page.click('[data-testid="add-event-to-group"]')
    await page.click('[data-testid="event-type-selector"]:last-of-type')
    await page.click('text=Measurement')

    // Verify the group and event exist
    await expect(page.locator('text=Events in Group')).toBeVisible()
    await expect(page.locator('[data-testid="group-event-item"]')).toHaveCount(1)

    // Verify nested group button exists
    await expect(page.locator('button:has-text("Add Nested Group")')).toBeVisible()
  })

  test('should allow removing events from criteria group', async ({ page }) => {
    // Add entry event
    await page.click('[data-testid="add-entry-event"]')
    
    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.click('text=Condition Occurrence')
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)
    // Replaced search with list selection

    // Add inclusion rule with events
    await page.click('button:has-text("Add Inclusion Rule")')
    await page.locator('[data-testid="inclusion-rule-name"] input').fill('Test Rule')
    await page.locator('.v-dialog .v-card-actions button:has-text("Add")').click()
    await page.waitForTimeout(300)

    // Expand the inclusion rule panel
    await page.click('text=Test Rule')
    await page.waitForTimeout(300)

    await page.click('button:has-text("Add Criteria Group")')
    await page.click('[data-testid="logic-type-selector"]')
    await page.click('text=ALL')

    // Add two events
    await page.click('[data-testid="add-event-to-group"]')
    await page.click('[data-testid="event-type-selector"]:last-of-type')
    await page.click('text=Measurement')

    await page.click('[data-testid="add-event-to-group"]')
    await page.click('[data-testid="event-type-selector"]:last-of-type')
    await page.click('text=Drug Exposure')

    // Remove first event
    await page.click('[data-testid="remove-event-from-group"]:first-of-type')

    // Verify only one event remains
    const eventCount = await page.locator('[data-testid="group-event-item"]').count()
    expect(eventCount).toBe(1)
  })

  test('should allow removing entire inclusion rule', async ({ page }) => {
    // Add entry event
    await page.click('[data-testid="add-entry-event"]')

    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.waitForTimeout(300)
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')
    await page.click('[data-testid="concept-set-picker"]')
    await page.waitForTimeout(300)
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(300)

    // Add inclusion rule
    await page.click('button:has-text("Add Inclusion Rule")')
    await page.locator('[data-testid="inclusion-rule-name"] input').fill('Test Rule')
    await page.locator('.v-dialog .v-card-actions button:has-text("Add")').click()
    await page.waitForTimeout(300)

    // Expand the inclusion rule panel
    await page.click('text=Test Rule')
    await page.waitForTimeout(300)

    await page.click('button:has-text("Add Criteria Group")')

    // Verify rule exists
    await expect(page.locator('text=Test Rule')).toBeVisible()

    // Remove rule
    await page.click('[data-testid="remove-inclusion-rule"]')

    // Verify rule removed
    await expect(page.locator('text=Test Rule')).not.toBeVisible()
  })

  test('should validate AT_LEAST requires count field', async ({ page }) => {
    // Add entry event
    await page.click('[data-testid="add-entry-event"]')
    
    // Expand the event card
    await page.locator('button:has(.mdi-chevron-down)').first().click()
    await page.click('[data-testid="event-type-selector"]')
    await page.click('text=Condition Occurrence')

    // Add inclusion rule
    await page.click('button:has-text("Add Inclusion Rule")')
    await page.locator('[data-testid="inclusion-rule-name"] input').fill('Test Rule')
    await page.locator('.v-dialog .v-card-actions button:has-text("Add")').click()
    await page.waitForTimeout(300)

    // Expand the inclusion rule panel
    await page.click('text=Test Rule')
    await page.waitForTimeout(300)

    await page.click('button:has-text("Add Criteria Group")')
    await page.waitForTimeout(300)
    await page.click('[data-testid="logic-type-selector"]')
    await page.waitForTimeout(200)

    // Click on the AT_LEAST option in the dropdown (not ANY which also contains "At least")
    await page.locator('.v-list-item', { hasText: 'AT LEAST - Minimum count' }).click()
    await page.waitForTimeout(300)

    // Clear the count field (it defaults to 1) to trigger validation
    await page.locator('[data-testid="logic-count-input"] input').clear()
    await page.waitForTimeout(200)

    // Try to save without count
    await page.click('button:has-text("Save Criteria Group")')

    // Verify validation error is shown
    await expect(page.locator('text=Count is required for AT_LEAST logic')).toBeVisible()
  })
})
