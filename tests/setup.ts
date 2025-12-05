/**
 * Vitest Test Setup
 * Configures global test environment for Vue components with Vuetify
 */
import { vi } from 'vitest'

// Mock navigator.userAgent (required for Vuetify display composable)
Object.defineProperty(window.navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
})

// Mock SystemJS for plugin framework (prevent errors during test initialization)
if (!window.System) {
  window.System = {
    import: vi.fn().mockResolvedValue({}),
    register: vi.fn(),
  } as unknown as typeof window.System
}

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
} as unknown as typeof IntersectionObserver

// Mock ResizeObserver (required for Vuetify data tables)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof ResizeObserver

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

// Mock global fetch to prevent unhandled rejections in tests
// Individual tests can override this mock with more specific behavior
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({}),
  text: async () => '',
  blob: async () => new Blob(),
  arrayBuffer: async () => new ArrayBuffer(0),
  headers: new Headers(),
  redirected: false,
  type: 'basic',
  url: '',
  clone: function() { return this },
  body: null,
  bodyUsed: false,
} as Response)
