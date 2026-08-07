import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Verified against src/router/routes.ts. The four analysis-hub list views
// (characterizations, pathways, incidence-rates) live under /analysis/* but
// keep top-level redirect aliases; those aliases are used here since they
// are the paths a user/bookmark would actually hit.
const ROUTES = [
  { name: 'landing', path: '/#/' },
  { name: 'cohorts', path: '/#/cohorts' },
  { name: 'concept-sets', path: '/#/concepts' },
  { name: 'data-sources', path: '/#/datasources' },
  { name: 'characterizations', path: '/#/characterizations' },
  { name: 'incidence-rates', path: '/#/incidence-rates' },
  { name: 'pathways', path: '/#/pathways' },
]

async function enableDarkMode(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('atlas.theme', 'dark'))
}

test.describe('dark mode colour contrast', () => {
  for (const route of ROUTES) {
    test(`${route.name} has no colour-contrast violations in dark mode`, async ({ page }) => {
      await enableDarkMode(page)
      await page.goto(route.path)
      await page.waitForLoadState('networkidle')
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
