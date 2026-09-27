/**
 * A concept set whose concepts are not all in the selected vocabulary (#351).
 * WebAPI answers the expression request with a 400; the editor must still open
 * the set, keep every item, and say which concepts are missing.
 */
import { test, expect } from '@playwright/test'
import { setupBasicMocks } from '../helpers/api-mocks'
import { waitForPageReady } from '../helpers/wait-utils'

const MISSING_ID = 437663

test.describe('Concept set with concepts missing from the vocabulary', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)

    await page.route('**/WebAPI/conceptset/1/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    )
    await page.route('**/WebAPI/conceptset/1/expression/**', route =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: `Current data source does not contain required concepts (${MISSING_ID})`,
        }),
      })
    )
    await page.route('**/WebAPI/conceptset/1/items', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 10,
            conceptSetId: 1,
            conceptId: MISSING_ID,
            isExcluded: 0,
            includeDescendants: 1,
            includeMapped: 0,
          },
          {
            id: 11,
            conceptSetId: 1,
            conceptId: 201826,
            isExcluded: 0,
            includeDescendants: 0,
            includeMapped: 0,
          },
        ]),
      })
    )
    await page.route('**/WebAPI/vocabulary/*/lookup/identifiers', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            CONCEPT_ID: 201826,
            CONCEPT_NAME: 'Type 2 diabetes mellitus',
            CONCEPT_CODE: '44054006',
            DOMAIN_ID: 'Condition',
            VOCABULARY_ID: 'SNOMED',
            CONCEPT_CLASS_ID: 'Clinical Finding',
            STANDARD_CONCEPT: 'S',
            STANDARD_CONCEPT_CAPTION: 'Standard',
            INVALID_REASON_CAPTION: 'Valid',
            INVALID_REASON: 'V',
            VALID_START_DATE: Date.parse('1970-01-01'),
            VALID_END_DATE: Date.parse('2099-12-31'),
          },
        ]),
      })
    )
    await page.route('**/WebAPI/conceptset/1', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'Test Concept Set 1',
          createdBy: 'test_user',
          createdDate: Date.parse('2024-01-01T00:00:00.000Z'),
          modifiedBy: 'test_user',
          modifiedDate: Date.parse('2024-01-01T00:00:00.000Z'),
        }),
      })
    )

    await page.goto('/#/concepts')
    await waitForPageReady(page)
  })

  test('opens the set, keeps every concept and names the missing one', async ({ page }) => {
    await page.locator('table tbody tr', { hasText: 'Test Concept Set 1' }).click()

    const warning = page.getByTestId('cs-editor-missing-concepts')
    await expect(warning).toBeVisible()
    await expect(warning).toContainText(String(MISSING_ID))

    await expect(page.getByTestId(`concept-missing-${MISSING_ID}`)).toBeVisible()
    await expect(page.getByText('Type 2 diabetes mellitus')).toBeVisible()

    if (process.env.REPRO_SHOTS) {
      await page.screenshot({ path: `${process.env.REPRO_SHOTS}/missing-concepts-editor.png` })
    }
  })

  test('adds the set to a cohort criterion and warns about the missing concept', async ({
    page,
  }) => {
    await page.route('**/WebAPI/cohortdefinition/5', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 5,
          name: 'Cohort without concept sets',
          expression: JSON.stringify({
            ConceptSets: [],
            PrimaryCriteria: {
              CriteriaList: [{ ConditionOccurrence: {} }],
              ObservationWindow: { PriorDays: 0, PostDays: 0 },
              PrimaryCriteriaLimit: { Type: 'First' },
            },
            QualifiedLimit: { Type: 'First' },
            ExpressionLimit: { Type: 'First' },
            InclusionRules: [],
            CensoringCriteria: [],
            CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
          }),
        }),
      })
    )
    await page.goto('/#/cohortdefinition/5')
    await waitForPageReady(page)

    await page
      .getByRole('button', { name: /select concept set/i })
      .first()
      .click()
    await page.locator('table tbody tr', { hasText: 'Test Concept Set 1' }).click()

    await expect(
      page.getByText(
        'Concept set "Test Concept Set 1" has concepts that are not in the selected vocabulary'
      )
    ).toBeVisible()
    await expect(page.getByText(String(MISSING_ID)).first()).toBeVisible()

    const chip = page.getByTestId('event-concept-set-field').getByText('Test Concept Set 1')
    await expect(chip).toBeVisible()

    await chip.click()
    const warning = page.getByTestId('cs-editor-missing-concepts')
    await expect(warning).toBeVisible()
    await expect(warning).toContainText(String(MISSING_ID))
    await expect(page.getByTestId(`concept-missing-${MISSING_ID}`)).toBeVisible()

    if (process.env.REPRO_SHOTS) {
      await page.screenshot({ path: `${process.env.REPRO_SHOTS}/missing-concepts-cohort.png` })
    }
  })
})
