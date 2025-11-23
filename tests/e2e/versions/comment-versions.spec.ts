/**
 * E2E tests for commenting on versions
 * T047: Test User Story 3 acceptance scenarios
 */
import { test, expect } from '@playwright/test'

test.describe('Add Comments to Versions', () => {
  test('US3-AS1: User can add comment to version', async ({ page }) => {
    await page.goto('/cohorts/123')
    await page.click('button:has-text("Versions")')

    // Click add comment on first version
    const addCommentButton = page.locator('button:has-text("Add comment")').first()
    await addCommentButton.click()

    // Comment dialog should open
    await expect(page.locator('.v-dialog')).toBeVisible()

    // Enter comment
    await page.fill('textarea', 'This is a test comment')

    // Save
    await page.click('button:has-text("Save")')

    // Success notification
    await expect(page.locator('.v-snackbar:has-text("Comment saved")')).toBeVisible()
  })

  test('US3-AS2: User can edit existing comment', async ({ page }) => {
    await page.goto('/cohorts/123')
    await page.click('button:has-text("Versions")')

    // Click edit comment
    const editButton = page.locator('button:has-text("Edit comment")').first()
    await editButton.click()

    // Modify comment
    await page.fill('textarea', 'Modified comment')
    await page.click('button:has-text("Save")')

    await expect(page.locator('.v-snackbar')).toBeVisible()
  })

  test('US3-AS3: Save button disabled when comment unchanged', async ({ page }) => {
    await page.goto('/cohorts/123')
    await page.click('button:has-text("Versions")')

    const editButton = page.locator('button:has-text("Edit comment")').first()
    await editButton.click()

    // Save button should be disabled
    const saveButton = page.locator('.v-dialog button:has-text("Save")')
    await expect(saveButton).toBeDisabled()
  })

  test('US3-AS4: Comment persists across page reload', async ({ page }) => {
    await page.goto('/cohorts/123')
    await page.click('button:has-text("Versions")')

    // Add comment
    await page.locator('button:has-text("Add comment")').first().click()
    await page.fill('textarea', 'Persistent comment')
    await page.click('button:has-text("Save")')

    // Reload page
    await page.reload()
    await page.click('button:has-text("Versions")')

    // Comment should be visible in table
    await expect(page.locator('text=Persistent comment')).toBeVisible()
  })

  test('US3-AS5: Comment editing hidden for users without edit permission', async ({ page }) => {
    // Mock user without edit permission
    await page.goto('/cohorts/123?readonly=true')
    await page.click('button:has-text("Versions")')

    // Add/Edit comment buttons should not be visible
    await expect(page.locator('button:has-text("Add comment")')).not.toBeVisible()
    await expect(page.locator('button:has-text("Edit comment")')).not.toBeVisible()
  })
})
