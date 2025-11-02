/**
 * E2E Test: Basic Cohort Creation
 * Tests the complete workflow of creating a cohort with entry events
 */
import { test, expect } from '@playwright/test'

test.describe('Basic Cohort Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should navigate to cohort builder', async ({ page }) => {
    // Click "New Cohort" button
    await page.click('text=New Cohort')

    // Verify we're on the cohort builder page
    await expect(page).toHaveURL('/cohorts/new')
    await expect(page.locator('text=Cohort Definition')).toBeVisible()
  })

  test('should create a basic cohort with entry event', async ({ page }) => {
    // Navigate to cohort builder
    await page.goto('/cohorts/new')

    // Wait for the page to load
    await page.waitForSelector('text=Cohort Definition')

    // Enter cohort name
    const nameInput = page.locator('input[placeholder*="cohort name" i]').first()
    await nameInput.fill('Test Cohort for Type 2 Diabetes')

    // Enter description
    const descriptionInput = page.locator('textarea[placeholder*="description" i]').first()
    await descriptionInput.fill('This is a test cohort for E2E testing')

    // Add an entry event
    await page.click('text=Add Event')

    // Wait for event card to appear
    await page.waitForSelector('.v-card')

    // Verify save button is enabled (we have name + event)
    const saveButton = page.locator('button:has-text("Save Cohort")')
    await expect(saveButton).toBeEnabled()

    // Save the cohort
    await saveButton.click()

    // Verify we navigate back to cohorts list
    await expect(page).toHaveURL('/cohorts')
  })

  test('should not allow saving without name', async ({ page }) => {
    await page.goto('/cohorts/new')
    await page.waitForSelector('text=Cohort Definition')

    // Add an event but no name
    await page.click('text=Add Event')
    await page.waitForSelector('.v-card')

    // Save button should be disabled
    const saveButton = page.locator('button:has-text("Save Cohort")')
    await expect(saveButton).toBeDisabled()
  })

  test('should not allow saving without entry events', async ({ page }) => {
    await page.goto('/cohorts/new')
    await page.waitForSelector('text=Cohort Definition')

    // Enter name but no events
    const nameInput = page.locator('input[placeholder*="cohort name" i]').first()
    await nameInput.fill('Test Cohort')

    // Save button should be disabled
    const saveButton = page.locator('button:has-text("Save Cohort")')
    await expect(saveButton).toBeDisabled()
  })

  test('should expand and collapse event card', async ({ page }) => {
    await page.goto('/cohorts/new')
    await page.waitForSelector('text=Cohort Definition')

    // Add an event
    await page.click('text=Add Event')
    await page.waitForSelector('.v-card')

    // Event starts collapsed - expand it
    const expandButton = page.locator('button:has(.mdi-chevron-down)').first()
    await expandButton.click()

    // Wait for expansion animation and verify select is visible
    await expect(page.locator('.v-select').first()).toBeVisible()

    // Collapse it again
    const collapseButton = page.locator('button:has(.mdi-chevron-up)').first()
    await collapseButton.click()

    // Wait for collapse and verify select is hidden
    await expect(page.locator('.v-select').first()).toBeHidden()
  })

  test('should remove entry event', async ({ page }) => {
    await page.goto('/cohorts/new')
    await page.waitForSelector('text=Cohort Definition')

    // Add name
    const nameInput = page.locator('input[placeholder*="cohort name" i]').first()
    await nameInput.fill('Test Cohort')

    // Add an event
    await page.click('text=Add Event')
    await page.waitForSelector('.v-card')

    // Save button should be enabled
    let saveButton = page.locator('button:has-text("Save Cohort")')
    await expect(saveButton).toBeEnabled()

    // Remove the event
    const deleteButton = page.locator('button:has(.mdi-delete)').first()
    await deleteButton.click()

    // Save button should now be disabled (no events)
    saveButton = page.locator('button:has-text("Save Cohort")')
    await expect(saveButton).toBeDisabled()
  })

  test('should cancel cohort creation', async ({ page }) => {
    await page.goto('/cohorts/new')
    await page.waitForSelector('text=Cohort Definition')

    // Enter some data
    const nameInput = page.locator('input[placeholder*="cohort name" i]').first()
    await nameInput.fill('Test Cohort')

    // Click cancel
    const cancelButton = page.locator('button:has-text("Cancel")')
    await cancelButton.click()

    // Should navigate back to cohorts list
    await expect(page).toHaveURL('/cohorts')
  })
})
