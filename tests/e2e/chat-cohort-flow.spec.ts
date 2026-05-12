import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'
import { waitForPageReady } from './helpers/wait-utils'

/**
 * E2E for the cohort agent plugin (Phase A flow).
 *
 * Stubs the bao /agent/chat endpoint with a recorded SSE fixture so the
 * test is hermetic — no AWS dependency.
 *
 * Pre-req: VITE_BAO_AGENT_ENABLED=true must be set when running the dev
 * server. Check process.env.VITE_BAO_AGENT_ENABLED at test start; if not
 * set the suite skips with a clear message.
 */

const SSE_FIXTURE = [
  'event: text-delta\ndata: {"delta":"I\'ll search for a Type 2 Diabetes phenotype."}\n\n',
  'event: tool-call\ndata: {"id":"t1","name":"search_phenotypes","args":{"query":"Type 2 Diabetes"}}\n\n',
  'event: tool-result\ndata: {"id":"t1","result":{"results":[]}}\n\n',
  'event: tool-call\ndata: {"id":"t2","name":"search_concepts","args":{"query":"Type 2 diabetes mellitus","domain":"Condition"}}\n\n',
  'event: tool-result\ndata: {"id":"t2","result":{"results":[{"conceptId":201826,"conceptName":"Type 2 diabetes mellitus","domain":"Condition","standard":"S","source":"local"}]}}\n\n',
  'event: tool-pending\ndata: {"id":"p1","name":"add_criterion","args":{"conceptId":201826,"conceptName":"Type 2 diabetes mellitus","domain":"Condition","includeDescendants":true}}\n\n',
  'event: tool-pending\ndata: {"id":"p2","name":"add_criterion","args":{"conceptId":443238,"conceptName":"Type 1 diabetes mellitus","domain":"Condition","includeDescendants":true,"group":"exclusion"}}\n\n',
  'event: text-delta\ndata: {"delta":" I\'ve proposed an entry event and an exclusion."}\n\n',
  'event: done\ndata: {"stopReason":"end-turn"}\n\n',
].join('')

const isAgentEnabled = process.env.VITE_BAO_AGENT_ENABLED === 'true'

test.describe('Cohort agent plugin', () => {
  test.skip(!isAgentEnabled, 'VITE_BAO_AGENT_ENABLED is not "true"; rerun with that env to enable')

  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)

    await page.route('**/WebAPI/trexsql/agent/chat', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
          },
          body: SSE_FIXTURE,
        })
      } else {
        await route.continue()
      }
    })

    await page.route('**/WebAPI/trexsql/agent/chat/health', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', model: 'fixture', region: 'us-east-1', sdkLoaded: true }),
      })
    })

    await page.goto('/cohorts/new')
    await waitForPageReady(page)
  })

  test('FAB opens the chat panel and proposals render from streamed events', async ({ page }) => {
    const fab = page.locator('[data-testid="plugin-fab-pythia-plugin"]')
    await expect(fab).toBeVisible()
    await fab.click()

    const panel = page.locator('[data-testid="plugin-overlay-panel"]')
    await expect(panel).toBeVisible()

    const input = panel.locator('input[placeholder*="cohort"]')
    await input.fill('Define a Type 2 Diabetes cohort')
    await input.press('Enter')

    await expect(panel.getByText('Type 2 diabetes mellitus')).toBeVisible({ timeout: 8_000 })
    await expect(panel.getByText('Type 1 diabetes mellitus')).toBeVisible()

    const acceptButtons = panel.getByRole('button', { name: /accept/i })
    await expect(acceptButtons.first()).toBeVisible()
    await acceptButtons.first().click()

    await expect(panel.getByText(/added to cohort/i).first()).toBeVisible()
  })
})
