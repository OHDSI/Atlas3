/**
 * Test Helper: Store Mock
 * Provides Pinia store testing utilities
 */

import { createTestingPinia, type TestingPinia } from '@pinia/testing'
import { vi } from 'vitest'

export interface StoreState {
  auth?: {
    isAuthenticated?: boolean
    user?: { id: string; name: string; login?: string } | null
    token?: string | null
    permissions?: string[]
  }
  cohort?: {
    currentCohort?: unknown
    cohorts?: unknown[]
    isLoading?: boolean
  }
  config?: {
    config?: unknown
    isLoaded?: boolean
  }
  ui?: {
    darkMode?: boolean
    sidebarOpen?: boolean
  }
  datasources?: {
    sources?: unknown[]
    selectedSource?: unknown
  }
  locale?: {
    locale?: string
    availableLocales?: string[]
  }
  conceptSets?: {
    conceptSets?: unknown[]
    selectedConceptSet?: unknown
  }
  [key: string]: unknown
}

export interface CreateTestingPiniaOptions {
  /** Initial state for stores */
  initialState?: StoreState
  /** Whether to stub actions (default: false for real action execution) */
  stubActions?: boolean
  /** Create spies on getters (default: true) */
  createSpy?: typeof vi.fn
}

/**
 * Create a testing Pinia instance with optional initial state
 * @param options Configuration options
 */
export function createTestStore(options: CreateTestingPiniaOptions = {}): TestingPinia {
  const { initialState = {}, stubActions = false, createSpy = vi.fn } = options

  return createTestingPinia({
    initialState,
    stubActions,
    createSpy,
  })
}

/**
 * Create a Pinia instance with authenticated state
 */
export function createAuthenticatedStore(
  user = { id: '1', name: 'Test User', login: 'testuser' },
  permissions: string[] = []
): TestingPinia {
  return createTestStore({
    initialState: {
      auth: {
        isAuthenticated: true,
        user,
        token: 'test-token',
        permissions,
      },
    },
  })
}

/**
 * Create a Pinia instance with unauthenticated state
 */
export function createUnauthenticatedStore(): TestingPinia {
  return createTestStore({
    initialState: {
      auth: {
        isAuthenticated: false,
        user: null,
        token: null,
        permissions: [],
      },
    },
  })
}
