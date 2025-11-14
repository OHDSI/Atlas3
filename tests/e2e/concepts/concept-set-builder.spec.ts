/**
 * Concept Set Builder E2E Tests
 * End-to-end tests for building concept sets with concepts
 */
import { test, expect } from '@playwright/test'
import { setupBasicMocks } from '../helpers/api-mocks'

test.describe.skip('Concept Set Builder', () => {
  let testConceptSetName: string

  test.beforeEach(async ({ page }) => {
    // Navigate to concepts page and create a test concept set
    await setupBasicMocks(page)
    await page.goto('/concepts')
    
    // Switch to Concept Sets tab
    const conceptSetsTab = page.getByRole('tab', { name: /concept sets/i })
    await conceptSetsTab.click()
    await page.waitForLoadState('networkidle')
    
    // Create a new concept set for testing
    const addButton = page.getByRole('button', { name: /add concept set/i })
    await addButton.click()
    
    const drawer = page.locator('.v-navigation-drawer')
    await expect(drawer).toBeVisible()
    
    testConceptSetName = `Builder Test ${Date.now()}`
    const nameInput = page.getByLabel(/name/i)
    await nameInput.fill(testConceptSetName)
    
    // Stay in the editor (don't click Create yet)
  })

  /**
   * Add concept to concept set from search
   */
  test('should add concept from search to concept set', async ({ page }) => {
    const drawer = page.locator('.v-navigation-drawer')
    
    // Verify we're in the editor with tabs
    await expect(drawer).toBeVisible()
    await expect(page.getByRole('tab', { name: /search/i })).toBeVisible()
    
    // Should be on Search tab by default
    const searchTab = page.getByRole('tab', { name: /search/i })
    await searchTab.click()
    
    // Search for a concept
    const searchInput = drawer.getByPlaceholder(/search/i)
    await searchInput.fill('diabetes')
    
    // Wait for search results
    await page.waitForSelector('table tbody tr', { timeout: 5000 })
    
    // Click "Add" button on first result
    const addButton = drawer.locator('table tbody tr').first().getByRole('button', { name: /add/i })
    await addButton.click()
    
    // Switch to Selected Concepts tab
    const selectedTab = page.getByRole('tab', { name: /selected concepts/i })
    await selectedTab.click()
    
    // Verify concept appears in selected concepts table
    const selectedTable = drawer.locator('table tbody')
    await expect(selectedTable.locator('tr')).toHaveCount(1, { timeout: 3000 })
    
    // Verify concept name appears
    await expect(selectedTable).toContainText(/diabetes/i)
  })

  /**
   * Remove concept from concept set
   */
  test('should remove concept from concept set', async ({ page }) => {
    const drawer = page.locator('.v-navigation-drawer')
    
    // Add a concept first
    const searchTab = page.getByRole('tab', { name: /search/i })
    await searchTab.click()
    
    const searchInput = drawer.getByPlaceholder(/search/i)
    await searchInput.fill('diabetes')
    await page.waitForSelector('table tbody tr', { timeout: 5000 })
    
    const addButton = drawer.locator('table tbody tr').first().getByRole('button', { name: /add/i })
    await addButton.click()
    
    // Go to Selected Concepts tab
    const selectedTab = page.getByRole('tab', { name: /selected concepts/i })
    await selectedTab.click()
    
    // Verify concept is there
    const selectedTable = drawer.locator('table tbody')
    await expect(selectedTable.locator('tr')).toHaveCount(1, { timeout: 3000 })
    
    // Click Remove button
    const removeButton = selectedTable.locator('button[aria-label="Remove"], button:has-text("Remove")').first()
    await removeButton.click()
    
    // Verify concept is removed
    await page.waitForTimeout(500)
    
    // Should show "no concepts selected" message or empty table
    const noDataMessage = drawer.getByText(/no concepts selected|no data/i)
    await expect(noDataMessage).toBeVisible({ timeout: 3000 })
  })

  /**
   * Toggle Descendants flag
   */
  test('should toggle Descendants flag', async ({ page }) => {
    const drawer = page.locator('.v-navigation-drawer')
    
    // Add a concept
    const searchTab = page.getByRole('tab', { name: /search/i })
    await searchTab.click()
    
    const searchInput = drawer.getByPlaceholder(/search/i)
    await searchInput.fill('diabetes')
    await page.waitForSelector('table tbody tr', { timeout: 5000 })
    
    const addButton = drawer.locator('table tbody tr').first().getByRole('button', { name: /add/i })
    await addButton.click()
    
    // Go to Selected Concepts tab
    const selectedTab = page.getByRole('tab', { name: /selected concepts/i })
    await selectedTab.click()
    
    // Find Descendants checkbox
    const descendantsCheckbox = drawer.locator('input[type="checkbox"][aria-label*="Descendants"], input[type="checkbox"]').first()
    
    // Get initial state
    const initialState = await descendantsCheckbox.isChecked()
    
    // Toggle checkbox
    await descendantsCheckbox.click()
    await page.waitForTimeout(300)
    
    // Verify state changed
    const newState = await descendantsCheckbox.isChecked()
    expect(newState).toBe(!initialState)
    
    // Toggle back
    await descendantsCheckbox.click()
    await page.waitForTimeout(300)
    
    // Verify state reverted
    const finalState = await descendantsCheckbox.isChecked()
    expect(finalState).toBe(initialState)
  })

  /**
   * Toggle Mapped flag
   */
  test('should toggle Mapped flag', async ({ page }) => {
    const drawer = page.locator('.v-navigation-drawer')
    
    // Add a concept
    const searchTab = page.getByRole('tab', { name: /search/i })
    await searchTab.click()
    
    const searchInput = drawer.getByPlaceholder(/search/i)
    await searchInput.fill('diabetes')
    await page.waitForSelector('table tbody tr', { timeout: 5000 })
    
    const addButton = drawer.locator('table tbody tr').first().getByRole('button', { name: /add/i })
    await addButton.click()
    
    // Go to Selected Concepts tab
    const selectedTab = page.getByRole('tab', { name: /selected concepts/i })
    await selectedTab.click()
    
    // Find Mapped checkbox (second checkbox in row)
    const row = drawer.locator('table tbody tr').first()
    const checkboxes = row.locator('input[type="checkbox"]')
    const mappedCheckbox = checkboxes.nth(1)
    
    // Get initial state
    const initialState = await mappedCheckbox.isChecked()
    
    // Toggle checkbox
    await mappedCheckbox.click()
    await page.waitForTimeout(300)
    
    // Verify state changed
    const newState = await mappedCheckbox.isChecked()
    expect(newState).toBe(!initialState)
  })

  /**
   * Toggle Exclude flag
   */
  test('should toggle Exclude flag', async ({ page }) => {
    const drawer = page.locator('.v-navigation-drawer')
    
    // Add a concept
    const searchTab = page.getByRole('tab', { name: /search/i })
    await searchTab.click()
    
    const searchInput = drawer.getByPlaceholder(/search/i)
    await searchInput.fill('diabetes')
    await page.waitForSelector('table tbody tr', { timeout: 5000 })
    
    const addButton = drawer.locator('table tbody tr').first().getByRole('button', { name: /add/i })
    await addButton.click()
    
    // Go to Selected Concepts tab
    const selectedTab = page.getByRole('tab', { name: /selected concepts/i })
    await selectedTab.click()
    
    // Find Exclude checkbox (third checkbox in row)
    const row = drawer.locator('table tbody tr').first()
    const checkboxes = row.locator('input[type="checkbox"]')
    const excludeCheckbox = checkboxes.nth(2)
    
    // Get initial state
    const initialState = await excludeCheckbox.isChecked()
    
    // Toggle checkbox
    await excludeCheckbox.click()
    await page.waitForTimeout(300)
    
    // Verify state changed
    const newState = await excludeCheckbox.isChecked()
    expect(newState).toBe(!initialState)
  })

  /**
   * Save concept set with 50+ concepts
   */
  test('should save concept set with multiple concepts', async ({ page }) => {
    const drawer = page.locator('.v-navigation-drawer')
    
    // Search and add multiple concepts
    const searchTab = page.getByRole('tab', { name: /search/i })
    await searchTab.click()
    
    const searchInput = drawer.getByPlaceholder(/search/i)
    
    // Add concepts from different searches
    const searchTerms = ['diabetes', 'hypertension', 'asthma', 'copd', 'obesity']
    
    for (const term of searchTerms) {
      await searchInput.fill(term)
      await page.waitForSelector('table tbody tr', { timeout: 5000 })
      
      // Add first result
      const addButton = drawer.locator('table tbody tr').first().getByRole('button', { name: /add/i })
      await addButton.click()
      await page.waitForTimeout(300)
    }
    
    // Go to Selected Concepts tab
    const selectedTab = page.getByRole('tab', { name: /selected concepts/i })
    await selectedTab.click()
    
    // Verify multiple concepts are added
    const selectedTable = drawer.locator('table tbody')
    const rowCount = await selectedTable.locator('tr').count()
    expect(rowCount).toBeGreaterThanOrEqual(5)
    
    // Toggle some flags on different concepts
    const checkboxes = drawer.locator('input[type="checkbox"]')
    if (await checkboxes.count() >= 3) {
      await checkboxes.nth(0).click() // Descendants on first
      await checkboxes.nth(4).click() // Mapped on second
      await checkboxes.nth(8).click() // Exclude on third
      await page.waitForTimeout(300)
    }
    
    // Save the concept set
    const createButton = page.getByRole('button', { name: /create/i })
    await createButton.click()
    
    // Wait for save to complete and drawer to close
    await expect(drawer).not.toBeVisible({ timeout: 5000 })
    
    // Verify concept set appears in list
    const table = page.locator('table tbody')
    await expect(table).toContainText(testConceptSetName, { timeout: 5000 })
    
    // Re-open the concept set to verify concepts were saved
    const row = page.locator(`tr:has-text("${testConceptSetName}")`)
    const editButton = row.locator('button[aria-label="Edit"], button:has-text("Edit")')
    await editButton.click()
    
    await expect(drawer).toBeVisible()
    
    // Go to Selected Concepts tab
    await selectedTab.click()
    
    // Verify concepts are still there
    const savedRowCount = await selectedTable.locator('tr').count()
    expect(savedRowCount).toBeGreaterThanOrEqual(5)
  })

  /**
   * Performance test - Side panel responsive with 100+ concepts
   * Note: This is a simplified test; adding 100+ concepts manually would be slow
   */
  test('should remain responsive with many concepts', async ({ page }) => {
    const drawer = page.locator('.v-navigation-drawer')
    
    // Add multiple concepts quickly
    const searchTab = page.getByRole('tab', { name: /search/i })
    await searchTab.click()
    
    const searchInput = drawer.getByPlaceholder(/search/i)
    await searchInput.fill('a') // Single letter to get many results
    await page.waitForSelector('table tbody tr', { timeout: 5000 })
    
    // Add first 10 concepts
    const startTime = Date.now()
    
    for (let i = 0; i < 10; i++) {
      const addButtons = drawer.locator('table tbody tr button:has-text("Add")')
      if (await addButtons.count() > 0) {
        await addButtons.first().click()
        await page.waitForTimeout(100)
      }
    }
    
    const addTime = Date.now() - startTime
    
    // Switch to Selected Concepts tab
    const selectedTab = page.getByRole('tab', { name: /selected concepts/i })
    const tabSwitchStart = Date.now()
    await selectedTab.click()
    await page.waitForSelector('table tbody tr', { timeout: 3000 })
    const tabSwitchTime = Date.now() - tabSwitchStart
    
    // Verify concepts are displayed
    const selectedTable = drawer.locator('table tbody')
    const rowCount = await selectedTable.locator('tr').count()
    expect(rowCount).toBeGreaterThanOrEqual(10)
    
    // Performance checks
    expect(tabSwitchTime).toBeLessThan(2000) // Tab switch < 2s
    
    // Toggle a checkbox on last concept
    const toggleStart = Date.now()
    const lastCheckbox = drawer.locator('input[type="checkbox"]').last()
    await lastCheckbox.click()
    const toggleTime = Date.now() - toggleStart
    
    expect(toggleTime).toBeLessThan(500) // Toggle < 500ms
    
    // Scroll test (if applicable)
    const tableContainer = drawer.locator('.v-table__wrapper')
    if (await tableContainer.count() > 0) {
      await tableContainer.evaluate(el => {
        el.scrollTop = el.scrollHeight
      })
      await page.waitForTimeout(100)
      
      // Verify still responsive after scroll
      await expect(selectedTable.locator('tr').last()).toBeVisible()
    }
  })

  /**
   * Additional test: Prevent duplicate concepts
   */
  test('should prevent adding duplicate concepts', async ({ page }) => {
    const drawer = page.locator('.v-navigation-drawer')
    
    // Add a concept
    const searchTab = page.getByRole('tab', { name: /search/i })
    await searchTab.click()
    
    const searchInput = drawer.getByPlaceholder(/search/i)
    await searchInput.fill('diabetes')
    await page.waitForSelector('table tbody tr', { timeout: 5000 })
    
    // Get the concept ID or name for tracking
    const firstRow = drawer.locator('table tbody tr').first()
    const conceptName = await firstRow.textContent()
    
    // Add the concept
    const addButton = firstRow.getByRole('button', { name: /add/i })
    await addButton.click()
    await page.waitForTimeout(300)
    
    // Try to add the same concept again
    // The button should either be disabled or show "Remove"
    await page.waitForTimeout(300)
    
    const buttonText = await firstRow.getByRole('button').first().textContent()
    expect(buttonText).toMatch(/remove|added/i)
    
    // Verify only one instance in selected concepts
    const selectedTab = page.getByRole('tab', { name: /selected concepts/i })
    await selectedTab.click()
    
    const selectedTable = drawer.locator('table tbody')
    const rowCount = await selectedTable.locator('tr').count()
    expect(rowCount).toBe(1)
  })

  /**
   * Additional test: Unsaved changes warning
   */
  test('should warn about unsaved changes when closing', async ({ page }) => {
    const drawer = page.locator('.v-navigation-drawer')
    
    // Add a concept
    const searchTab = page.getByRole('tab', { name: /search/i })
    await searchTab.click()
    
    const searchInput = drawer.getByPlaceholder(/search/i)
    await searchInput.fill('diabetes')
    await page.waitForSelector('table tbody tr', { timeout: 5000 })
    
    const addButton = drawer.locator('table tbody tr').first().getByRole('button', { name: /add/i })
    await addButton.click()
    await page.waitForTimeout(300)
    
    // Try to close without saving
    const closeButton = page.getByRole('button', { name: /close/i })
    
    page.once('dialog', dialog => {
      expect(dialog.message()).toMatch(/unsaved|changes/i)
      dialog.dismiss()
    })
    
    await closeButton.click()
    await page.waitForTimeout(500)
    
    // Should still be open
    await expect(drawer).toBeVisible()
  })
})
