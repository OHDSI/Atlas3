/**
 * Test Helper: Pinia Setup
 * Reusable Pinia test configuration
 */

import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { vi } from 'vitest'

// Mock IndexedDB for store tests
import 'fake-indexeddb/auto'

/**
 * Create and activate a fresh Pinia instance for testing
 * Call this in beforeEach to ensure test isolation
 */
export function setupPinia(): Pinia {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

/**
 * Reset all mocks and create fresh Pinia
 * Combines common beforeEach setup
 */
export function setupTestEnvironment(): Pinia {
  vi.clearAllMocks()
  return setupPinia()
}

/**
 * Clean up after tests
 * Call this in afterEach
 */
export function cleanupTestEnvironment(): void {
  vi.restoreAllMocks()
}

/**
 * Create a test context with automatic setup/cleanup
 * Usage:
 *   const ctx = createTestContext()
 *   beforeEach(() => ctx.setup())
 *   afterEach(() => ctx.cleanup())
 */
export function createTestContext() {
  let pinia: Pinia | null = null

  return {
    setup(): Pinia {
      vi.clearAllMocks()
      pinia = createPinia()
      setActivePinia(pinia)
      return pinia
    },
    cleanup(): void {
      vi.restoreAllMocks()
      pinia = null
    },
    get pinia(): Pinia {
      if (!pinia) {
        throw new Error('Test context not initialized. Call setup() first.')
      }
      return pinia
    },
  }
}

/**
 * Mock a store action
 */
export function mockStoreAction<T extends Record<string, unknown>>(
  store: T,
  actionName: keyof T
): ReturnType<typeof vi.fn> {
  const mock = vi.fn()
  store[actionName] = mock as unknown as T[keyof T]
  return mock
}

/**
 * Mock a store getter
 */
export function mockStoreGetter<T extends Record<string, unknown>>(
  store: T,
  getterName: keyof T,
  value: unknown
): void {
  Object.defineProperty(store, getterName, {
    get: () => value,
    configurable: true,
  })
}
