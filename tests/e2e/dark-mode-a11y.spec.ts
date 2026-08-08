import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { setupBasicMocks, setupDatasourcesMocks } from './helpers/api-mocks'

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

// axe reports several "incomplete" (indeterminate, not failed) color-contrast nodes on
// every route. Verified by manual inspection (see final-fix-report.md) that all of them
// fall into three known axe-core limitations with Vuetify's compiled DOM, none of which
// indicate an actual contrast problem: (1) button/chip/list-item content spans sit under
// ripple/overlay/tooltip layers that defeat axe's background-color detection, (2) some
// floating field labels sit over a gradient background axe can't resolve to a flat
// colour, (3) a couple of `<dd>` text nodes are too short for axe's text heuristic. The
// underlying element's actual rendered background is themed and already covered by the
// 'violations' assertion above. Rather than silently discarding `results.incomplete`
// (which would hide a genuinely new/unknown incomplete reason turning up later), every
// incomplete node's message is checked against this allow-list; anything that doesn't
// match fails the test loudly.
const KNOWN_INCOMPLETE_REASONS = [
  /background color could not be determined because it is overlapped by another element/,
  /background color could not be determined due to a background gradient/,
  /content is too short to determine if it is actual text content/,
]

function describeIncomplete(results: { incomplete: Array<{ nodes: Array<{ target: string[]; failureSummary?: string | null }> }> }) {
  return results.incomplete.flatMap((v) =>
    v.nodes.map((n) => `${n.target.join(' ')} — ${n.failureSummary ?? '(no summary)'}`),
  )
}

test.describe('dark mode colour contrast', () => {
  for (const route of ROUTES) {
    test(`${route.name} has no colour-contrast violations in dark mode`, async ({ page }) => {
      // Mock the API and pre-accept the license agreement so the SNOMED
      // License dialog never opens — otherwise it sits on top of every
      // route and the scan mostly checks modal chrome, not page content.
      //
      // data-sources needs the richer mock set (see dark-mode-visual.spec.ts):
      // setupBasicMocks alone leaves the CDM results endpoints unmocked, so
      // that route nondeterministically renders either its charts or an
      // "Unable to load Dashboard report" error banner depending on timing.
      if (route.name === 'data-sources') {
        await setupDatasourcesMocks(page)
      } else {
        await setupBasicMocks(page)
      }
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

      const incomplete = describeIncomplete(results)
      if (incomplete.length) {
        // eslint-disable-next-line no-console
        console.log(`[dark-mode-a11y] ${route.name}: ${incomplete.length} incomplete colour-contrast node(s) — see KNOWN_INCOMPLETE_REASONS`)
      }
      const unexplained = incomplete.filter(
        (msg) => !KNOWN_INCOMPLETE_REASONS.some((re) => re.test(msg)),
      )
      expect(unexplained, unexplained.join('\n')).toEqual([])
    })
  }
})
