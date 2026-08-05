import { test, expect } from '@playwright/test'
import { setupBasicMocks, setupDatasourcesMocks } from './helpers/api-mocks'
import { waitForPageReady } from './helpers/wait-utils'

// The demo plugin's bundle is built into the gitignored public/plugins/ and its
// @ohdsi/atlas-ui dependency resolves through an equally gitignored dist/, so a
// clean checkout has no bundle to load. Serving a minimal parcel here keeps the
// test exercising the real loader path — SystemJS import, lifecycle validation,
// mountRootParcel, hostContext props — without depending on that build.
const STUB_PARCEL = `System.register([], function (_export) {
  return {
    execute: function () {
      _export('bootstrap', function () { return Promise.resolve() })
      _export('mount', function (props) {
        props.domElement.innerHTML =
          '<p data-testid="hello-host-context">' +
          ((props.hostContext && props.hostContext.sourceKey) || 'no source') +
          '</p>'
        return Promise.resolve()
      })
      _export('unmount', function (props) {
        props.domElement.innerHTML = ''
        return Promise.resolve()
      })
      _export('update', function () { return Promise.resolve() })
    },
  }
})`

test.describe('Plugin Mount Points', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await setupDatasourcesMocks(page)
    await page.route('**/plugins/hello-world-plugin/index.system.js', route =>
      route.fulfill({ contentType: 'application/javascript', body: STUB_PARCEL })
    )
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
