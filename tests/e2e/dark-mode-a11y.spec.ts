import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { setupBasicMocks } from './helpers/api-mocks'

// Verified against src/router/routes.ts. The four analysis-hub list views
// (characterizations, pathways, incidence-rates) live under /analysis/* but
// keep top-level redirect aliases; those aliases are used here since they
// are the paths a user/bookmark would actually hit. `expectedUrl` is the
// *resolved* hash (confirmed by navigating each path and reading page.url())
// so a future redirect/auth-gate change that silently strands every route on
// the landing page fails loudly instead of scanning `/#/` seven times.
const ROUTES = [
  { name: 'landing', path: '/#/', expectedUrl: /#\/$/ },
  { name: 'cohorts', path: '/#/cohorts', expectedUrl: /#\/cohorts$/ },
  { name: 'concept-sets', path: '/#/concepts', expectedUrl: /#\/concepts(\?|$)/ },
  { name: 'data-sources', path: '/#/datasources', expectedUrl: /#\/datasources$/ },
  { name: 'characterizations', path: '/#/characterizations', expectedUrl: /#\/analysis\/characterizations$/ },
  { name: 'incidence-rates', path: '/#/incidence-rates', expectedUrl: /#\/analysis\/incidence-rates$/ },
  { name: 'pathways', path: '/#/pathways', expectedUrl: /#\/analysis\/pathways$/ },
]

async function enableDarkMode(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('atlas.theme', 'dark'))
}

test.describe('dark mode colour contrast', () => {
  for (const route of ROUTES) {
    test(`${route.name} has no colour-contrast violations in dark mode`, async ({ page }) => {
      // Mock the API and pre-accept the license agreement so the SNOMED
      // License dialog never opens — otherwise it sits on top of every
      // route and the scan mostly checks modal chrome, not page content.
      await setupBasicMocks(page)
      await enableDarkMode(page)
      await page.goto(route.path)
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(route.expectedUrl)
      await expect(page.locator('[data-testid="nav-theme-toggle"]')).toBeVisible()
      await expect(page.locator('.v-application.v-theme--dark')).toHaveCount(1)

      const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()

      const violations = results.violations.flatMap((v) =>
        v.nodes.map((n) => `${n.target.join(' ')} — ${n.failureSummary}`),
      )
      expect(violations, violations.join('\n')).toEqual([])
    })
  }
})
