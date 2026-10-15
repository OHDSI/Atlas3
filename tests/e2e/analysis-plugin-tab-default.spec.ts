import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setupAnalysisListMocks, setupBasicMocks } from './helpers/api-mocks'
import { waitForPageReady } from './helpers/wait-utils'

const PLUGIN_ID = 'hello-tab'
const ITEM_ID = 'hello-analysis'

const STUB_PARCEL = `System.register([], function (_export) {
  return {
    execute: function () {
      _export('bootstrap', function () { return Promise.resolve() })
      _export('mount', function (props) {
        props.domElement.innerHTML = '<h2 data-testid="hello-tab-content">Hello from the plugin tab</h2>'
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

async function registerPluginTab(page: Page) {
  const manifestPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../public/config/plugins.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  manifest.plugins = [
    ...manifest.plugins.filter((p: { id: string }) => p.id !== PLUGIN_ID),
    {
      id: PLUGIN_ID,
      name: 'Hello tab',
      version: '1.0.0',
      entryPoint: `${PLUGIN_ID}/index.system.js`,
      menuItems: [],
      mountPoints: [
        {
          id: ITEM_ID,
          surface: 'analysis-tabs',
          name: 'Plugin Tab',
          icon: 'mdi-puzzle',
          order: 1,
          insertBefore: 'feature-analyses',
        },
      ],
      metadata: { author: 'test', description: 'Minimal analysis-tabs plugin' },
    },
  ]
  await page.route('**/config/plugins.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', json: manifest })
  )
  await page.route(`**/plugins/${PLUGIN_ID}/index.system.js`, route =>
    route.fulfill({ contentType: 'application/javascript', body: STUB_PARCEL })
  )
}

async function openAnalysisFromNavbar(page: Page) {
  await page.locator('.nav-bar__nav-item', { hasText: 'Analysis' }).first().click()
  await expect(page.locator('.analysis-hub')).toBeVisible()
  await expect(page.locator('.analysis-hub [role="tab"]', { hasText: 'Plugin Tab' })).toBeVisible()
}

async function leaveAndReturn(page: Page) {
  await page.locator('.nav-bar__nav-item', { hasText: 'Cohort Definitions' }).first().click()
  await expect(page).toHaveURL(/#\/cohorts/)
  await openAnalysisFromNavbar(page)
}

test.describe('Analysis hub: plugin tab placement and default tab', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await setupAnalysisListMocks(page)
    await registerPluginTab(page)
    await page.goto('/#/cohorts')
    await waitForPageReady(page)
  })

  test('first visit: the plugin tab with insertBefore feature-analyses is first and open', async ({ page }) => {
    await openAnalysisFromNavbar(page)

    const firstTab = page.locator('.analysis-hub [role="tab"]').first()
    await expect(firstTab).toContainText('Plugin Tab')
    await expect(firstTab).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(new RegExp(`#/analysis/x/${PLUGIN_ID}/${ITEM_ID}`))
  })

  test('return visit: the last-used plugin tab is restored', async ({ page }) => {
    await openAnalysisFromNavbar(page)
    await page.locator('.analysis-hub [role="tab"]', { hasText: 'Plugin Tab' }).click()
    await expect(page.getByTestId('hello-tab-content')).toBeVisible()

    await leaveAndReturn(page)

    await expect(page.locator('.analysis-hub [role="tab"]', { hasText: 'Plugin Tab' })).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(new RegExp(`#/analysis/x/${PLUGIN_ID}/${ITEM_ID}`))
  })

  test('the last-used core tab is restored', async ({ page }) => {
    await openAnalysisFromNavbar(page)
    await page.locator('.analysis-hub [role="tab"]', { hasText: 'Pathways' }).click()
    await expect(page).toHaveURL(/#\/analysis\/pathways/)
    await leaveAndReturn(page)

    await expect(page.locator('.analysis-hub [role="tab"]', { hasText: 'Pathways' })).toHaveAttribute('aria-selected', 'true')
  })
})
