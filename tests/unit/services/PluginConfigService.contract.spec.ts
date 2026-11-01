import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PluginConfigService } from '@/services/PluginConfigService'
import { DEFAULT_MANIFEST_SETTINGS } from '@/models/PluginModels'
import { logger } from '@/utils/logger'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

interface TestPlugin {
  id: string
  name: string
  version: string
  entryPoint: string
  menuItems: Array<{ id: string; name: string; route: string }>
}

function plugin(id: string, routes: string[], name = id): TestPlugin {
  return {
    id,
    name,
    version: '1.0.0',
    entryPoint: `/plugins/${id}/index.js`,
    menuItems: routes.map((route, i) => ({ id: `${id}-${i}`, name: `Item ${i}`, route })),
  }
}

function respondWith(body: unknown) {
  vi.mocked(global.fetch).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response)
}

type Internals = {
  notifyListeners: () => void
  handleConfigChange: (a: unknown, b: unknown) => void
}

describe('PluginConfigService manifest contract', () => {
  let service: PluginConfigService

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    service = new PluginConfigService()
  })

  it('fetches plugins.json from the base path without a doubled slash', async () => {
    respondWith({ version: '1.0', plugins: [] })

    await service.loadConfig()

    expect(global.fetch).toHaveBeenCalledWith('/config/plugins.json')
  })

  it('uses the default settings for the 404 fallback manifest', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response)

    await expect(service.loadConfig()).resolves.toEqual({
      version: '1.0',
      plugins: [],
      settings: { ...DEFAULT_MANIFEST_SETTINGS },
    })
  })

  it('keeps every plugin whose menu routes sit under its own prefix', async () => {
    const plugins = [plugin('alpha', ['/plugins/alpha/one', '/plugins/alpha/two']), plugin('beta', ['/plugins/beta/main'])]
    respondWith({ version: '2.0', plugins })

    const result = await service.loadConfig()

    expect(result.plugins).toEqual(plugins)
    expect(result.version).toBe('2.0')
  })

  it('falls back to the default manifest when two plugins share an id', async () => {
    respondWith({
      version: '2.0',
      plugins: [plugin('dup', ['/plugins/dup/a']), plugin('dup', ['/plugins/dup/b'])],
    })

    const result = await service.loadConfig()

    expect(result).toEqual({ version: '1.0', plugins: [], settings: { ...DEFAULT_MANIFEST_SETTINGS } })
  })

  it.each([
    ['outside the plugin namespace', '/wrong/path'],
    ['missing the trailing slash after the id', '/plugins/alpha'],
    ['under a longer plugin id', '/plugins/alphabet/main'],
    ['with the prefix only at the end', '/x/plugins/alpha/'],
  ])('falls back to the default manifest for a route %s', async (_label, route) => {
    respondWith({ version: '2.0', plugins: [plugin('alpha', [route])] })

    const result = await service.loadConfig()

    expect(result.plugins).toEqual([])
    expect(result.version).toBe('1.0')
  })

  it('falls back to the default manifest when a route is listed twice', async () => {
    respondWith({ version: '2.0', plugins: [plugin('alpha', ['/plugins/alpha/main', '/plugins/alpha/main'])] })

    const result = await service.loadConfig()

    expect(result.plugins).toEqual([])
    expect(result.version).toBe('1.0')
  })

  describe('getters on a manifest without theme or header settings', () => {
    beforeEach(async () => {
      respondWith({ version: '1.0', plugins: [], settings: {} })
      await service.loadConfig()
    })

    it('returns the theme defaults', () => {
      expect({
        primary: service.getPrimaryColor(),
        mode: service.getDefaultThemeMode(),
        toggle: service.showThemeToggle(),
        accent: service.getAccentColor(),
        chart: service.getChartColors(),
        treemap: service.getTreemapGradient(),
        logo: service.getLogoUrl(),
        navigateTo: service.getLogoNavigateTo(),
        landing: service.getLandingLogoUrl(),
        nav: service.getNavigationSettings(),
      }).toEqual({
        primary: null,
        mode: null,
        toggle: true,
        accent: null,
        chart: null,
        treemap: null,
        logo: null,
        navigateTo: '/',
        landing: null,
        nav: null,
      })
    })

    it('returns the header defaults', () => {
      expect({
        header: service.getHeaderSettings(),
        license: service.showLicenseAgreement(),
        navBar: service.showNavBar(),
        userMenu: service.showUserMenu(),
        feedback: service.showFeedbackButton(),
        language: service.showLanguageSelector(),
        config: service.showConfigButton(),
        feedbackUrl: service.getFeedbackUrl(),
      }).toEqual({
        header: {},
        license: true,
        navBar: true,
        userMenu: true,
        feedback: true,
        language: true,
        config: true,
        feedbackUrl: 'https://forms.office.com/r/2JzrYy1yDP',
      })
    })
  })

  it('returns theme getters as null before any manifest is loaded', () => {
    expect([
      service.getDefaultThemeMode(),
      service.getAccentColor(),
      service.getChartColors(),
      service.getTreemapGradient(),
    ]).toEqual([null, null, null, null])
  })

  it.each(['light', 'dark', 'system'] as const)('returns the configured default theme mode %s', async mode => {
    respondWith({ version: '1.0', plugins: [], settings: { theme: { defaultMode: mode } } })
    await service.loadConfig()

    expect(service.getDefaultThemeMode()).toBe(mode)
  })

  describe('listeners', () => {
    it('does not notify listeners before a manifest is loaded', () => {
      const callback = vi.fn()
      service.onChange(callback)

      ;(service as unknown as Internals).notifyListeners()

      expect(callback).not.toHaveBeenCalled()
    })

    it('unsubscribing one listener leaves the others subscribed', async () => {
      const removed = vi.fn()
      const kept = vi.fn()
      const unsubscribe = service.onChange(removed)
      service.onChange(kept)
      respondWith({ version: '1.0', plugins: [] })
      const manifest = await service.loadConfig()

      unsubscribe()
      ;(service as unknown as Internals).notifyListeners()

      expect(removed).not.toHaveBeenCalled()
      expect(kept).toHaveBeenCalledWith(manifest)
    })
  })

  describe('config change detection', () => {
    const a = plugin('a', ['/plugins/a/x'])
    const b = plugin('b', ['/plugins/b/x'])
    const c = plugin('c', ['/plugins/c/x'])

    function diff(oldPlugins: TestPlugin[], newPlugins: TestPlugin[]) {
      (service as unknown as Internals).handleConfigChange(
        { version: '1.0', plugins: oldPlugins },
        { version: '1.0', plugins: newPlugins }
      )
    }

    it('reports the added, removed and changed plugin ids', () => {
      diff([a, b], [plugin('a', ['/plugins/a/x'], 'A renamed'), c])

      expect(vi.mocked(logger.info).mock.calls).toEqual([
        ['PluginConfig', expect.any(String), ['c']],
        ['PluginConfig', expect.any(String), ['b']],
      ])
      expect(vi.mocked(logger.warn).mock.calls).toEqual([['PluginConfig', expect.any(String), ['a']]])
    })

    it('reports nothing when the plugin list is unchanged', () => {
      diff([a, b], [a, b])

      expect(logger.info).not.toHaveBeenCalled()
      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('reports only the plugins whose definition changed', () => {
      diff([a, b, c], [a, plugin('b', ['/plugins/b/y']), c])

      expect(logger.info).not.toHaveBeenCalled()
      expect(vi.mocked(logger.warn).mock.calls).toEqual([['PluginConfig', expect.any(String), ['b']]])
    })
  })
})
