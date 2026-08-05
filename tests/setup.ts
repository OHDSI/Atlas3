/**
 * Vitest Test Setup
 * Configures global test environment for Vue components with Vuetify
 */
import { afterEach, vi } from 'vitest'

// Capture the real Blob constructor before any test file replaces it. Some
// test files mock `global.Blob` in beforeEach without restoring it, which
// leaks into later files under the singleFork pool. Tests that need a real
// Blob can read it from globalThis.__OriginalBlob.
//
// setupFiles are run before EACH test file in the worker, so we must only
// capture the first time — otherwise we overwrite the snapshot with the
// already-mocked Blob from a prior file.
{
  const g = globalThis as { __OriginalBlob?: typeof Blob }
  if (!g.__OriginalBlob) {
    g.__OriginalBlob = globalThis.Blob
  } else {
    // A prior test file may have leaked a Blob mock. Restore the real one
    // here so this run starts with a clean global.
    globalThis.Blob = g.__OriginalBlob
  }
}

// Each test file runs in its own worker (multi-fork pool), so jsdom storage
// is not shared across files. We still defensively clear localStorage and
// sessionStorage at the start of each file in case anything in the worker
// process accumulated state between modules loaded by the same worker.
if (typeof localStorage !== 'undefined') {
  localStorage.clear()
}
if (typeof sessionStorage !== 'undefined') {
  sessionStorage.clear()
}

// Mock navigator.userAgent (required for Vuetify display composable)
// Guard required: setup.ts also runs for node-environment test files
// (e.g. scripts/__tests__) where window is not defined.
if (typeof window !== 'undefined') {
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

  // Some components (e.g. Vuetify's VSnackbar auto-close timer) schedule a
  // real setTimeout/setInterval without clearing it on unmount. If that
  // callback fires after jsdom's `window` has been torn down for the test
  // file, it throws "window is not defined" as an unhandled rejection and
  // fails the run even though every test passed. Track outstanding timers
  // and force-clear them after each test so nothing survives past teardown.
  const pendingTimers = new Set<ReturnType<typeof window.setTimeout>>()
  const pendingIntervals = new Set<ReturnType<typeof window.setInterval>>()
  const realSetTimeout = window.setTimeout.bind(window)
  const realClearTimeout = window.clearTimeout.bind(window)
  const realSetInterval = window.setInterval.bind(window)
  const realClearInterval = window.clearInterval.bind(window)

  window.setTimeout = ((...args: Parameters<typeof window.setTimeout>) => {
    const id = realSetTimeout(...args)
    pendingTimers.add(id)
    return id
  }) as typeof window.setTimeout
  global.setTimeout = window.setTimeout as typeof global.setTimeout

  window.clearTimeout = ((id?: Parameters<typeof window.clearTimeout>[0]) => {
    if (id !== undefined) pendingTimers.delete(id as ReturnType<typeof window.setTimeout>)
    return realClearTimeout(id)
  }) as typeof window.clearTimeout
  global.clearTimeout = window.clearTimeout as typeof global.clearTimeout

  window.setInterval = ((...args: Parameters<typeof window.setInterval>) => {
    const id = realSetInterval(...args)
    pendingIntervals.add(id)
    return id
  }) as typeof window.setInterval
  global.setInterval = window.setInterval as typeof global.setInterval

  window.clearInterval = ((id?: Parameters<typeof window.clearInterval>[0]) => {
    if (id !== undefined) pendingIntervals.delete(id as ReturnType<typeof window.setInterval>)
    return realClearInterval(id)
  }) as typeof window.clearInterval
  global.clearInterval = window.clearInterval as typeof global.clearInterval

  afterEach(() => {
    pendingTimers.forEach(id => realClearTimeout(id))
    pendingTimers.clear()
    pendingIntervals.forEach(id => realClearInterval(id))
    pendingIntervals.clear()
  })
}

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

// Load app config using the mocked fetch above (returns {} → defaults apply).
// This populates resolvedConfig so that getAppConfig() works in all test files
// without requiring each file to mock the module. Tests that need specific
// config values can either mock fetch for config-local.json or use their own
// vi.mock('@/config/app-config.loader', ...) which takes precedence per-file.
import { loadAppConfig } from '@/config/app-config.loader'
await loadAppConfig()
