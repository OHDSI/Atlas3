import { test, expect } from '@playwright/test'
import { setupBasicMocks, setupDatasourcesMocks } from './helpers/api-mocks'
import { waitForPageReady } from './helpers/wait-utils'

test.describe('Plugin Mount Points', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await setupDatasourcesMocks(page)
    await page.goto('/#/datasources')
    await waitForPageReady(page)
  })

  test('a plugin mount point renders inside the data sources sidebar', async ({ page }) => {
    const sidebarItem = page.getByTestId('datasource-sidebar-plugin:hello-world-plugin:hello-report')
    await expect(sidebarItem).toBeVisible()

    await sidebarItem.click()

    await expect(page.getByTestId('hello-host-context')).not.toHaveText('no source')
    await expect(sidebarItem).toBeVisible()
    await expect(page.locator('.nav-bar')).toBeVisible()
  })
})
