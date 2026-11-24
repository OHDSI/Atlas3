import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'
import { waitForPageReady } from './helpers/wait-utils'

test.describe('Main content focus', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await page.goto('/#/cohorts')
    await waitForPageReady(page)
  })

  test('moves focus to the main content and stays on the current page', async ({ page }) => {
    await page.keyboard.press('Tab')
    const skipLink = page.locator('a.skip-link')
    await expect(skipLink).toBeFocused()

    await page.keyboard.press('Enter')

    await expect(page.locator('#main')).toBeFocused()
    expect(page.url()).toMatch(/#\/cohorts$/)
  })

  test('moves focus to the main content after navigating from the nav bar', async ({ page }) => {
    const link = page.locator('.nav-bar__nav-link').filter({ hasText: /concept/i }).first()
    await link.focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/#\/concepts/)
    await expect(page.locator('#main')).toBeFocused()
  })
})
