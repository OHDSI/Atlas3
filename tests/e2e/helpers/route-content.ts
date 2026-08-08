import { expect, type Page } from '@playwright/test'

// The analysis-hub list views render rows only when their list endpoint is
// mocked (setupAnalysisListMocks). Unmocked, they fall through the dev server's
// /WebAPI proxy — live rows on a box running WebAPI, a loading/error state in
// CI. Both a scan and a screenshot "pass" against an empty page, so without
// this the two environments silently cover different pixels.
const ROW_TESTID: Record<string, string> = {
  characterizations: 'characterizations-table-row-name',
  'incidence-rates': 'incidence-rates-table-row-name',
  pathways: 'pathways-table-row-name',
}

export async function expectRouteContent(page: Page, routeName: string) {
  const testid = ROW_TESTID[routeName]
  if (!testid) return
  await expect(page.locator(`[data-testid="${testid}"]`).first()).toBeVisible()
}
