/**
 * Test Helpers Index
 * Re-exports all test utilities for convenient importing
 */

// Vuetify setup
export { createTestVuetify, vuetify } from './vuetify-setup'

// Mock factories
export {
  createMockCohortEvent,
  createMockCohortDefinition,
  createMockConcept,
  createMockConceptSet,
  createMockConceptSetReference,
  createMockDataSource,
  createMockGenerationInfo,
  createMockFetchResponse,
  createMockUser,
  createMockJWT,
} from './mock-factories'

// Component wrapper utilities
export {
  mountComponent,
  findByTestId,
  findAllByTestId,
  waitForComponent,
  setInputValue,
  clickAndWait,
  getEmittedEvents,
  expectEmitted,
  type TestMountOptions,
} from './component-wrapper'

// Pinia setup
export {
  setupPinia,
  setupTestEnvironment,
  cleanupTestEnvironment,
  createTestContext,
  mockStoreAction,
  mockStoreGetter,
} from './pinia-setup'

// i18n mock
export { createI18nMock, mockUseI18n } from './i18n-mock'
