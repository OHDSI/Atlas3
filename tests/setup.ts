/**
 * Vitest Test Setup
 * Configures global test environment for Vue components with Vuetify
 */
import { vi } from 'vitest'

// Mock window.matchMedia (required for Vuetify components)
const matchMediaMock = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: matchMediaMock,
})

// Also ensure the returned object has the matches property
const mockMatchMedia = matchMediaMock('(prefers-reduced-motion: reduce)')
mockMatchMedia.matches = false

// Mock IntersectionObserver (required for some Vuetify components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock ResizeObserver (required for Vuetify data tables)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Mock visualViewport (required for Vuetify modals/overlays)
Object.defineProperty(window, 'visualViewport', {
  writable: true,
  value: {
    width: 1024,
    height: 768,
    scale: 1,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
})
