/**
 * Common wait utilities for E2E tests
 * Provides better alternatives to page.waitForTimeout()
 */

import type { Page, Locator } from '@playwright/test'

/**
 * Wait for network to be idle (no requests for 500ms)
 * Use this after navigation or actions that trigger API calls
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 5000) {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Wait for a specific API request to complete
 * @param urlPattern - URL pattern to match (string or regex)
 * @param timeout - Maximum wait time in ms
 */
export async function waitForApiRequest(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url()
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern)
      }
      return urlPattern.test(url)
    },
    { timeout }
  )
}

/**
 * Wait for element to be visible and ready for interaction
 * More reliable than arbitrary waits
 */
export async function waitForElement(
  locator: Locator,
  options?: { timeout?: number; state?: 'visible' | 'attached' | 'hidden' }
): Promise<void> {
  await locator.waitFor({
    state: options?.state || 'visible',
    timeout: options?.timeout || 10000
  })
}

/**
 * Wait for element to be visible AND stable (not animating)
 * Useful for elements that animate in
 */
export async function waitForStableElement(locator: Locator, timeout: number = 10000): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout })
  // Wait for element to stop moving (animations complete)
  await locator.evaluate((el: Element) => {
    return new Promise<void>((resolve) => {
      if (document.getAnimations) {
        const animations = el.getAnimations({ subtree: true })
        if (animations.length === 0) {
          resolve()
        } else {
          Promise.all(animations.map(anim => anim.finished)).then(() => resolve())
        }
      } else {
        // Fallback: small delay if getAnimations not supported
        setTimeout(() => resolve(), 300)
      }
    })
  })
}

/**
 * Wait for text content to match expected value
 * Useful for elements that update their text dynamically
 */
export async function waitForTextContent(
  locator: Locator,
  expectedText: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  await locator.waitFor({ state: 'attached', timeout })

  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    const text = await locator.textContent()
    if (text) {
      if (typeof expectedText === 'string') {
        if (text.includes(expectedText)) return
      } else {
        if (expectedText.test(text)) return
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  throw new Error(`Text content did not match expected value within ${timeout}ms`)
}

/**
 * Wait for element count to match expected value
 * Useful for lists that load dynamically
 */
export async function waitForElementCount(
  locator: Locator,
  expectedCount: number,
  timeout: number = 10000
): Promise<void> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    const count = await locator.count()
    if (count === expectedCount) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const actualCount = await locator.count()
  throw new Error(`Expected ${expectedCount} elements, but found ${actualCount}`)
}

/**
 * Wait for element count to be at least the expected value
 * Useful when exact count may vary but minimum is known
 */
export async function waitForMinimumElements(
  locator: Locator,
  minCount: number,
  timeout: number = 10000
): Promise<void> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    const count = await locator.count()
    if (count >= minCount) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const actualCount = await locator.count()
  throw new Error(`Expected at least ${minCount} elements, but found ${actualCount}`)
}

/**
 * Wait for loading indicator to appear and then disappear
 * Common pattern when data is being fetched
 */
export async function waitForLoadingComplete(
  page: Page,
  loadingSelector: string = '.v-progress-linear, .v-progress-circular, [data-loading="true"]',
  timeout: number = 10000
): Promise<void> {
  const loadingElement = page.locator(loadingSelector).first()

  try {
    // Wait for loading indicator to appear (optional - it might not always show)
    await loadingElement.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {
      // If it doesn't appear within 1s, assume already loaded
    })

    // Wait for it to disappear
    await loadingElement.waitFor({ state: 'hidden', timeout })
  } catch (e) {
    // If loading indicator never appeared, continue
  }
}

/**
 * Wait for URL to match expected pattern
 * Useful after navigation actions
 */
export async function waitForURL(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  await page.waitForURL(urlPattern, { timeout })
}

/**
 * Wait for function to return true
 * General purpose wait condition
 */
export async function waitForCondition(
  conditionFn: () => Promise<boolean>,
  options?: {
    timeout?: number
    interval?: number
    errorMessage?: string
  }
): Promise<void> {
  const timeout = options?.timeout || 10000
  const interval = options?.interval || 100
  const errorMessage = options?.errorMessage || 'Condition not met within timeout'

  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) return
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(errorMessage)
}

/**
 * Wait for cohort generation to complete
 * Specific to cohort generation polling
 */
export async function waitForCohortGeneration(
  page: Page,
  cohortId: number,
  sourceId: number = 6,
  maxAttempts: number = 30
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await page.waitForResponse(
      resp => resp.url().includes(`/cohortdefinition/${cohortId}/info`),
      { timeout: 10000 }
    ).catch(() => null)

    if (response) {
      const data = await response.json().catch(() => null)
      if (data && Array.isArray(data)) {
        const generationInfo = data.find(
          (g: any) => g.id.sourceId === sourceId && g.status === 'COMPLETE'
        )
        if (generationInfo) return
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  throw new Error('Cohort generation did not complete within expected time')
}

/**
 * Wait for Vue component to be ready
 * Waits for Vue's nextTick-like behavior
 */
export async function waitForVueUpdate(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>(resolve => {
      if ((window as any).__vue_app__) {
        // Wait for Vue to flush pending updates
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      } else {
        // Fallback if Vue not detected
        setTimeout(() => resolve(), 100)
      }
    })
  })
}
