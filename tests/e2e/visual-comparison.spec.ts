import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

/**
 * Visual Comparison Test Suite
 *
 * Captures screenshots from both implementation and reference UI
 * for manual visual comparison and documentation.
 *
 * Reference UI: http://localhost:3131
 * Implementation: http://localhost:5173
 */

const REFERENCE_URL = 'http://localhost:3131'
const IMPLEMENTATION_URL = 'http://localhost:5173'

// Output directory for comparison screenshots
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS_DIR = path.join(__dirname, '../../specs/001-atlas-cohort-builder/screenshots')

// Ensure screenshots directory exists
test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }
})

/**
 * Helper function to safely load pages with timeout handling
 */
async function loadPages(browser: any, refPath: string, implPath: string) {
  const refContext = await browser.newContext()
  const implContext = await browser.newContext()

  const refPage = await refContext.newPage()
  const implPage = await implContext.newPage()

  let refLoaded = false
  try {
    await refPage.goto(`${REFERENCE_URL}${refPath}`, { waitUntil: 'networkidle', timeout: 10000 })
    refLoaded = true
  } catch (e) {
    console.log('⚠ Reference URL not available, skipping reference screenshot')
  }

  await implPage.goto(`${IMPLEMENTATION_URL}${implPath}`, { waitUntil: 'networkidle', timeout: 10000 })

  return { refContext, implContext, refPage, implPage, refLoaded }
}

/**
 * Helper function to safely close contexts
 */
async function closeContexts(refContext: any, implContext: any) {
  await refContext.close().catch(() => {})
  await implContext.close().catch(() => {})
}

test.describe('Visual Comparison: Entry Events & Basic UI (T061a)', () => {
  test('Compare CohortBuilder layout', async ({ browser }) => {
    test.setTimeout(60000) // Increase timeout to 60 seconds

    const { refContext, implContext, refPage, implPage, refLoaded } = await loadPages(
      browser,
      '/cohorts/new',
      '/cohorts/new'
    )

    try {
      // Capture full page screenshots
      if (refLoaded) {
        await refPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'T061a-cohort-builder-reference.png'),
          fullPage: true
        })
      }
      await implPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'T061a-cohort-builder-implementation.png'),
        fullPage: true
      })

      // Capture toolbar area
      if (refLoaded) {
        const refToolbar = refPage.locator('[role="toolbar"], .v-toolbar, .toolbar')
        if (await refToolbar.count() > 0) {
          await refToolbar.first().screenshot({
            path: path.join(SCREENSHOTS_DIR, 'T061a-toolbar-reference.png')
          })
        }
      }

      const implToolbar = implPage.locator('[role="toolbar"], .v-toolbar, .toolbar')
      if (await implToolbar.count() > 0) {
        await implToolbar.first().screenshot({
          path: path.join(SCREENSHOTS_DIR, 'T061a-toolbar-implementation.png')
        })
      }

      console.log('✓ CohortBuilder screenshots captured')
    } finally {
      await closeContexts(refContext, implContext)
    }
  })

  test('Compare EntryEventsPanel with empty state', async ({ browser }) => {
    test.setTimeout(60000)

    const { refContext, implContext, refPage, implPage, refLoaded } = await loadPages(
      browser,
      '/cohorts/new',
      '/cohorts/new'
    )

    try {
      // Capture entry events panel area
      if (refLoaded) {
        await refPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'T061a-entry-events-empty-reference.png'),
          fullPage: true
        })
      }
      await implPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'T061a-entry-events-empty-implementation.png'),
        fullPage: true
      })

      console.log('✓ EntryEventsPanel (empty) screenshots captured')
    } finally {
      await closeContexts(refContext, implContext)
    }
  })

  test('Compare EventCard with basic event', async ({ browser }) => {
    test.setTimeout(60000)

    const { refContext, implContext, refPage, implPage, refLoaded } = await loadPages(
      browser,
      '/cohorts/new',
      '/cohorts/new'
    )

    try {
      // Add an event in implementation
      const addEventBtn = implPage.getByRole('button', { name: /Add Event/i })
      if (await addEventBtn.count() > 0) {
        await addEventBtn.click()
        await implPage.waitForTimeout(500)

        await implPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'T061a-event-card-collapsed-implementation.png'),
          fullPage: true
        })

        // Expand the event card
        const expandBtn = implPage.locator('button:has(.mdi-chevron-down)').first()
        if (await expandBtn.count() > 0) {
          await expandBtn.click()
          await implPage.waitForTimeout(500)

          await implPage.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'T061a-event-card-expanded-implementation.png'),
            fullPage: true
          })
        }
      }

      // Try to capture reference if similar flow exists
      if (refLoaded) {
        try {
          const refAddEventBtn = refPage.getByRole('button', { name: /Add Event|Add Entry/i })
          if (await refAddEventBtn.count() > 0) {
            await refAddEventBtn.click()
            await refPage.waitForTimeout(500)

            await refPage.screenshot({
              path: path.join(SCREENSHOTS_DIR, 'T061a-event-card-collapsed-reference.png'),
              fullPage: true
            })
          }
        } catch (e) {
          console.log('⚠ Could not capture reference event card')
        }
      }

      console.log('✓ EventCard screenshots captured')
    } finally {
      await closeContexts(refContext, implContext)
    }
  })
})

test.describe('Visual Comparison: Cardinality & Temporal Windows (T072a)', () => {
  test('Compare CardinalityEditor', async ({ browser }) => {
    test.setTimeout(60000)

    const { refContext, implContext, refPage, implPage, refLoaded } = await loadPages(
      browser,
      '/cohorts/new',
      '/cohorts/new'
    )

    try {
      // Implementation: Navigate to cardinality editor
      await implPage.getByRole('button', { name: /New Concept Set/i }).click()
      await implPage.waitForTimeout(300)
      await implPage.getByRole('button', { name: /Add Event/i }).click()
      await implPage.waitForTimeout(300)

      // Expand event card
      const expandBtn = implPage.locator('button:has(.mdi-chevron-down)').first()
      await expandBtn.click()
      await implPage.waitForTimeout(500)

      // Click Add Cardinality
      const addCardinalityBtn = implPage.getByRole('button', { name: /Add Cardinality/i })
      if (await addCardinalityBtn.count() > 0) {
        await addCardinalityBtn.click()
        await implPage.waitForTimeout(500)

        await implPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'T072a-cardinality-editor-implementation.png'),
          fullPage: true
        })
      }

      console.log('✓ CardinalityEditor screenshots captured')
    } finally {
      await closeContexts(refContext, implContext)
    }
  })

  test('Compare TemporalWindowEditor', async ({ browser }) => {
    test.setTimeout(60000)

    const { refContext, implContext, refPage, implPage, refLoaded } = await loadPages(
      browser,
      '/cohorts/new',
      '/cohorts/new'
    )

    try {
      // Implementation: Navigate to temporal window editor
      await implPage.getByRole('button', { name: /New Concept Set/i }).click()
      await implPage.waitForTimeout(300)
      await implPage.getByRole('button', { name: /Add Event/i }).click()
      await implPage.waitForTimeout(300)

      // Expand event card
      const expandBtn = implPage.locator('button:has(.mdi-chevron-down)').first()
      await expandBtn.click()
      await implPage.waitForTimeout(500)

      // Click Add Temporal Window
      const addTemporalBtn = implPage.getByRole('button', { name: /Add Temporal Window/i })
      if (await addTemporalBtn.count() > 0) {
        await addTemporalBtn.click()
        await implPage.waitForTimeout(500)

        await implPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'T072a-temporal-window-editor-implementation.png'),
          fullPage: true
        })
      }

      console.log('✓ TemporalWindowEditor screenshots captured')
    } finally {
      await closeContexts(refContext, implContext)
    }
  })
})

test.describe('Visual Comparison: Concept Set Management (T105a)', () => {
  test('Compare ConceptSetList', async ({ browser }) => {
    test.setTimeout(60000)

    const { refContext, implContext, refPage, implPage, refLoaded } = await loadPages(
      browser,
      '/cohorts/new',
      '/cohorts/new'
    )

    try {
      // Create a few concept sets
      for (let i = 0; i < 2; i++) {
        const newConceptBtn = implPage.getByRole('button', { name: /New Concept Set/i })
        if (await newConceptBtn.count() > 0) {
          await newConceptBtn.click()
          await implPage.waitForTimeout(300)
        }
      }

      await implPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'T105a-concept-set-list-implementation.png'),
        fullPage: true
      })

      console.log('✓ ConceptSetList screenshots captured')
    } finally {
      await closeContexts(refContext, implContext)
    }
  })
})

test.describe('Visual Comparison: Generation UI (T121a)', () => {
  test('Compare generation toolbar (requires saved cohort)', async ({ browser }) => {
    test.setTimeout(60000)

    const implContext = await browser.newContext()
    const implPage = await implContext.newPage()

    try {
      await implPage.goto(`${IMPLEMENTATION_URL}/cohorts/new`, { waitUntil: 'networkidle', timeout: 10000 })

      // Create and save a basic cohort
      await implPage.getByRole('button', { name: /New Concept Set/i }).click()
      await implPage.waitForTimeout(300)
      await implPage.getByRole('button', { name: /Add Event/i }).click()
      await implPage.waitForTimeout(300)

      // Save cohort
      await implPage.getByPlaceholder(/Enter cohort name/i).fill('Test Generation Cohort')
      await implPage.getByRole('button', { name: /Save Cohort/i }).click()

      // Wait for success message
      await expect(implPage.getByText(/Cohort saved successfully/i)).toBeVisible()
      await implPage.waitForTimeout(1000)

      // Capture generation toolbar area
      await implPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'T121a-generation-toolbar-implementation.png'),
        fullPage: true
      })

      console.log('✓ Generation toolbar screenshots captured')
    } finally {
      await implContext.close().catch(() => {})
    }
  })
})

test.describe('Visual Comparison Report Generator', () => {
  test('Generate comparison index', async () => {
    // This test generates an HTML index of all captured screenshots
    const screenshotFiles = fs.readdirSync(SCREENSHOTS_DIR)
      .filter(f => f.endsWith('.png'))
      .sort()

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Comparison Report - Atlas Cohort Builder</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #1976d2; }
    h2 { color: #424242; margin-top: 40px; border-bottom: 2px solid #1976d2; padding-bottom: 10px; }
    .comparison-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .screenshot {
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }
    .screenshot img {
      width: 100%;
      display: block;
    }
    .label {
      font-weight: bold;
      padding: 10px;
      background: #f5f5f5;
      text-align: center;
    }
    .reference { border-left: 3px solid #4caf50; }
    .implementation { border-left: 3px solid #2196f3; }
    .timestamp { color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Visual Comparison Report</h1>
  <p class="timestamp">Generated: ${new Date().toISOString()}</p>
  <p><strong>Reference UI:</strong> http://localhost:3131</p>
  <p><strong>Implementation:</strong> http://localhost:5173</p>

  ${generateComparisonSections(screenshotFiles)}
</body>
</html>`

    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'index.html'), html)
    console.log(`✓ Comparison report generated at ${SCREENSHOTS_DIR}/index.html`)
  })
})

function generateComparisonSections(files: string[]): string {
  const tasks = new Map<string, { ref: string[], impl: string[] }>()

  // Group screenshots by task
  files.forEach(file => {
    const match = file.match(/^(T\d+a?)/)
    if (match) {
      const taskId = match[1]
      if (!tasks.has(taskId)) {
        tasks.set(taskId, { ref: [], impl: [] })
      }

      if (file.includes('-reference.')) {
        tasks.get(taskId)!.ref.push(file)
      } else if (file.includes('-implementation.')) {
        tasks.get(taskId)!.impl.push(file)
      }
    }
  })

  let html = ''

  tasks.forEach((screenshots, taskId) => {
    html += `<h2>${taskId}</h2>`

    const maxCount = Math.max(screenshots.ref.length, screenshots.impl.length)

    for (let i = 0; i < maxCount; i++) {
      html += `<div class="comparison-group">`

      if (screenshots.ref[i]) {
        html += `
          <div class="screenshot reference">
            <div class="label">Reference (localhost:3131)</div>
            <img src="${screenshots.ref[i]}" alt="Reference screenshot">
          </div>
        `
      } else {
        html += `<div class="screenshot"><div class="label">No reference screenshot</div></div>`
      }

      if (screenshots.impl[i]) {
        html += `
          <div class="screenshot implementation">
            <div class="label">Implementation (localhost:5173)</div>
            <img src="${screenshots.impl[i]}" alt="Implementation screenshot">
          </div>
        `
      } else {
        html += `<div class="screenshot"><div class="label">No implementation screenshot</div></div>`
      }

      html += `</div>`
    }
  })

  return html
}
