import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'
import { waitForOverlaysToClose, waitForPageReady } from './helpers/wait-utils'

test.describe('Sticky navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await page.goto('/#/')
    await waitForPageReady(page)
  })

  test('keeps the navigation visible while the page scrolls', async ({ page }) => {
    const navigation = page.locator('.nav-bar')
    const main = page.locator('#main')

    await expect(navigation).toBeVisible()
    await expect(main).toBeVisible()

    const initialNavigationBox = await navigation.boundingBox()
    const initialMainBox = await main.boundingBox()

    expect(initialNavigationBox).not.toBeNull()
    expect(initialMainBox).not.toBeNull()
    expect(initialMainBox!.y).toBeGreaterThanOrEqual(initialNavigationBox!.height)

    await page.evaluate(() => {
      const scrollTarget = document.createElement('div')
      scrollTarget.style.height = '200vh'
      document.querySelector('#main')?.append(scrollTarget)
      window.scrollTo(0, 400)
    })

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await expect.poll(() => navigation.evaluate(element => element.getBoundingClientRect().top)).toBe(0)
  })

  test('contains scrolling within navigation drawer content', async ({ page }) => {
    await waitForOverlaysToClose(page)
    await page.getByTestId('nav-config').click()

    const drawerContent = page.locator('.config-panel .v-navigation-drawer__content')
    await expect(drawerContent).toBeVisible()

    await expect
      .poll(() => drawerContent.evaluate(element => getComputedStyle(element).overscrollBehaviorY))
      .toBe('contain')
  })
})