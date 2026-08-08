import { test, expect, type Page } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'

// Same route list as tests/e2e/dark-mode-a11y.spec.ts — kept in sync deliberately
// so the visual suite and the axe scan cover identical surfaces.
const ROUTES = [
  { name: 'landing', path: '/#/', expectedUrl: /#\/$/ },
  { name: 'cohorts', path: '/#/cohorts', expectedUrl: /#\/cohorts$/ },
  { name: 'concept-sets', path: '/#/concepts', expectedUrl: /#\/concepts(\?|$)/ },
  { name: 'data-sources', path: '/#/datasources', expectedUrl: /#\/datasources$/ },
  { name: 'characterizations', path: '/#/characterizations', expectedUrl: /#\/analysis\/characterizations$/ },
  { name: 'incidence-rates', path: '/#/incidence-rates', expectedUrl: /#\/analysis\/incidence-rates$/ },
  { name: 'pathways', path: '/#/pathways', expectedUrl: /#\/analysis\/pathways$/ },
]

async function setTheme(page: Page, mode: 'light' | 'dark') {
  await page.addInitScript((value) => window.localStorage.setItem('atlas.theme', value), mode)
}

// setupBasicMocks() mocks an authenticated user/me response, which switches the
// nav bar's auth control from the "Sign In" button (what the pre-mocking captures
// this suite compares against actually showed) to a wider user-menu control. That
// alone shifts the whole right-hand icon cluster ~80px further left — enough to
// push the Feedback button partway out of maskNavIconCluster's fixed 380px box.
// Overriding user/me back to unauthenticated after setupBasicMocks (Playwright
// runs the most-recently-registered matching route first) keeps the license-bypass
// and data mocks setupBasicMocks provides while preserving the original nav-bar
// layout the mask was sized against, so the mask doesn't need to grow.
async function forceUnauthenticated(page: Page) {
  await page.route('**/user/me', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
  })
  await page.addInitScript(() => {
    window.localStorage.removeItem('bearerToken')
    document.cookie = 'bearerToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })
}

// The theme toggle (Task 6) is a new, required nav element — it must be visible in
// light mode so a user can switch to dark — so it legitimately exists in current
// light-mode screenshots but not in the pre-dark-mode baseline. Inserting it into
// the nav-bar's right-hand flex row also shifts every icon after it (docs,
// notifications) a few px right, which is normal reflow, not a colour regression.
// A locator-based mask can't produce byte-identical boxes across the two commits
// because the icon cluster's own bounding box is a different width in each (fewer
// icons at baseline = narrower, right-anchored cluster). So instead this pins a
// fixed-size overlay to the viewport's top-right corner, generously sized to
// contain the icon cluster in both commits, giving pixel-identical mask
// coordinates on both sides of the comparison and a true zero-diff outside it.
async function maskNavIconCluster(page: Page) {
  await page.evaluate(() => {
    const el = document.createElement('div')
    el.setAttribute('data-testid', 'visual-test-nav-mask')
    el.style.position = 'fixed'
    el.style.top = '0'
    el.style.right = '0'
    el.style.width = '380px'
    el.style.height = '60px'
    el.style.zIndex = '2147483647'
    document.body.appendChild(el)
  })
}

// The landing page's hero graphic (src/assets/icons/atlas-loading.svg) is an <img>
// referencing a standalone SVG with SMIL `<animate>`/`<animateTransform>` loops
// (repeatCount="indefinite"). Playwright's screenshot animation-disabling only
// touches CSS animations on the top-level document, not SMIL inside a separately
// loaded SVG resource, so this graphic never settles into a stable frame and any
// two captures of it — baseline vs. current, or even two consecutive current
// captures — differ. The asset itself is byte-for-byte unchanged since the
// baseline commit (verified with `git diff <baseline>..HEAD -- src/assets/icons/atlas-loading.svg`),
// so masking it can't hide a real regression — only its ever-changing rotation phase.
function extraMasksFor(page: Page, routeName: string) {
  return routeName === 'landing' ? [page.locator('.landing__logo')] : []
}

for (const mode of ['light', 'dark'] as const) {
  test.describe(`${mode} mode screenshots`, () => {
    for (const route of ROUTES) {
      test(`${route.name} renders as expected in ${mode}`, async ({ page }) => {
        // Mock the API and pre-accept the license agreement so the SNOMED
        // License dialog never opens (it would otherwise cover most of every
        // route) and so cohorts/data-source content is deterministic instead
        // of depending on whatever the live WebAPI currently returns.
        await setupBasicMocks(page)
        await forceUnauthenticated(page)
        await setTheme(page, mode)
        await page.goto(route.path)
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(route.expectedUrl)
        await expect(page.locator('[data-testid="nav-theme-toggle"]')).toBeVisible()
        await expect(page.locator(`.v-application.v-theme--${mode}`)).toHaveCount(1)

        // Light baselines come from pre-change code (see task-18-report.md), so any
        // pixel drift here is a real regression — compare strictly, except for the
        // nav icon cluster (see maskNavIconCluster). Dark baselines are recorded
        // fresh on this branch, so the suite-wide loose threshold
        // (playwright.config.ts) is fine for them.
        if (mode === 'light') {
          await maskNavIconCluster(page)
        }
        await expect(page).toHaveScreenshot(
          `${route.name}-${mode}.png`,
          mode === 'light'
            ? {
                fullPage: true,
                maxDiffPixels: 0,
                threshold: 0,
                mask: [page.locator('[data-testid="visual-test-nav-mask"]'), ...extraMasksFor(page, route.name)],
              }
            : { fullPage: true, mask: extraMasksFor(page, route.name) },
        )
      })
    }
  })
}
