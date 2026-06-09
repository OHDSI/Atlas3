import { test } from '@playwright/test'

test('debug concept sets loading', async ({ page }) => {
  // Listen for console messages
  page.on('console', (msg) => {
    console.log(`BROWSER ${msg.type()}: ${msg.text()}`)
  })

  // Listen for errors
  page.on('pageerror', (error) => {
    console.log(`PAGE ERROR: ${error.message}`)
  })

  // Navigate to concepts page (use relative URL to use baseURL from config)
  await page.goto('/#/concepts?tab=sets')
  await page.waitForTimeout(3000)

  // Check what's visible
  const body = await page.textContent('body')
  console.log('Page content:', body?.substring(0, 500))

  // Check if loading
  const loading = await page.locator('text=Loading').count()
  console.log('Loading indicators:', loading)

  // Check for error messages
  const errors = await page.locator('.v-alert--type-error').count()
  console.log('Error alerts:', errors)

  if (errors > 0) {
    const errorText = await page.locator('.v-alert--type-error').first().textContent()
    console.log('Error message:', errorText)
  }

  // Check network requests
  await page.waitForTimeout(2000)
  
  // Take screenshot
  await page.screenshot({ path: 'debug-concept-sets.png', fullPage: true })
})
