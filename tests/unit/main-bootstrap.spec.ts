import { describe, it, expect, vi } from 'vitest'

vi.mock('@/ui/chart-config', () => ({
  setChartPalette: vi.fn(),
  setChartTheme: vi.fn(),
}))

vi.mock('@/config/app-config.loader', () => ({
  loadAppConfig: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/PluginConfigService', () => ({
  pluginConfigService: {
    loadConfig: vi.fn().mockResolvedValue(undefined),
    getPrimaryColor: vi.fn().mockReturnValue(null),
    getAccentColor: vi.fn().mockReturnValue(null),
    getChartColors: vi.fn().mockReturnValue(null),
    getTreemapGradient: vi.fn().mockReturnValue(null),
    getDefaultThemeMode: vi.fn().mockReturnValue('light'),
  },
}))

vi.mock('@/router', () => ({
  default: {
    install: vi.fn(),
    isReady: vi.fn().mockResolvedValue(undefined),
    currentRoute: {
      value: {
        meta: { requiresAuth: false },
      },
    },
  },
}))

vi.mock('@/plugins/vuetify', () => ({
  createVuetifyInstance: vi.fn(() => ({
    install: vi.fn(),
    theme: {
      change: vi.fn(),
    },
  })),
}))

vi.mock('@/stores/theme', () => ({
  useThemeStore: () => ({
    initialize: vi.fn(),
    resolved: 'light',
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hydrateAuth: vi.fn(),
    initializeFromStorage: vi.fn().mockResolvedValue(undefined),
    token: null,
    isAuthenticated: false,
    user: null,
    openLoginModal: vi.fn(),
  }),
}))

vi.mock('@/stores/locale', () => ({
  useLocaleStore: () => ({
    initialize: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/services/auth/authInterceptor', () => ({
  setupAuthInterceptor: vi.fn(),
}))

vi.mock('@/plugins/messaging/HostMessageBus.ts', () => ({
  setupGlobalMessageHandler: vi.fn(),
}))

vi.mock('@/plugins/host/pythiaBridge.ts', () => ({
  setupPythiaBridge: vi.fn(),
}))

vi.mock('@/plugins/host/webmcp', () => ({
  initWebMcp: vi.fn(),
}))

vi.mock('@/services/config-loader.service', () => ({
  configLoaderService: {
    loadConfiguration: vi.fn().mockResolvedValue({
      valid: true,
      validFilterTypes: [],
    }),
  },
}))

vi.mock('@/plugins/index.ts', () => ({
  initializePluginFramework: vi.fn(),
}))

vi.mock('@/services/auth/tokenExpiry', () => ({
  tokenExpiryService: {
    setupExpiryWarning: vi.fn(),
    cancelExpiryWarning: vi.fn(),
  },
}))

vi.mock('@/config/auth.config', () => ({
  getAuthConfig: () => ({
    userAuthenticationEnabled: false,
  }),
}))

describe('main.ts bootstrap', () => {
  it('applies the resolved theme to the chart palette at bootstrap', async () => {
    vi.resetModules()

    const { setChartTheme } = await import('@/ui/chart-config')

    await import('@/main')

    await vi.waitFor(() => expect(setChartTheme).toHaveBeenCalledWith('light'), { timeout: 60000 })
  })
})
