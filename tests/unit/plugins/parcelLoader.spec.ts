import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { mountPluginParcel } from '@/plugins/host/parcelLoader'
import { pluginRegistry } from '@/plugins/core/PluginRegistry'
import type { PluginInstance } from '@/models/PluginModels'

// Mock single-spa's mountRootParcel
vi.mock('single-spa', () => ({
  mountRootParcel: vi.fn(() => ({
    unmount: vi.fn().mockResolvedValue(undefined),
    mountPromise: Promise.resolve(),
  })),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock storageManager
vi.mock('@/services/auth/storageManager', () => ({
  storageManager: {
    getToken: vi.fn().mockReturnValue('test-token'),
  },
}))

import { mountRootParcel } from 'single-spa'
import { logger } from '@/utils/logger'
import { storageManager } from '@/services/auth/storageManager'

function makePluginModule() {
  return {
    bootstrap: vi.fn().mockResolvedValue(undefined),
    mount: vi.fn().mockResolvedValue(undefined),
    unmount: vi.fn().mockResolvedValue(undefined),
  }
}

function registerTestPlugin(id: string, entryPoint = 'test-plugin/index.system.js'): PluginInstance {
  return pluginRegistry.registerPlugin(
    {
      id,
      name: `Plugin ${id}`,
      version: '1.0.0',
      entryPoint,
      menuItems: [],
    },
    {
      user: null,
      token: null,
      isAuthenticated: false,
      hasPermission: () => false,
    },
    {
      send: vi.fn(),
      request: vi.fn(),
      subscribe: vi.fn(),
    }
  )
}

describe('parcelLoader', () => {
  let dom: HTMLElement
  let systemImportMock: Mock

  beforeEach(() => {
    setActivePinia(createPinia())
    // Clear all registered plugins between tests
    for (const p of pluginRegistry.getAllPlugins()) {
      pluginRegistry.unregisterPlugin(p.registration.id)
    }
    // Remove any plugin style links injected by prior tests
    document
      .querySelectorAll('link[id^="plugin-style-"]')
      .forEach(el => el.remove())

    dom = document.createElement('div')
    systemImportMock = window.System.import as unknown as Mock
    systemImportMock.mockReset()
    ;(mountRootParcel as unknown as Mock).mockClear()
    ;(logger.debug as Mock).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mounts a parcel via System.import on success', async () => {
    registerTestPlugin('p1')
    const mod = makePluginModule()
    systemImportMock.mockResolvedValue(mod)

    const handle = await mountPluginParcel('p1', dom)

    expect(systemImportMock).toHaveBeenCalledTimes(1)
    const url = systemImportMock.mock.calls[0][0] as string
    expect(url).toContain('test-plugin/index.system.js')
    expect(mountRootParcel).toHaveBeenCalledTimes(1)
    const [, parcelProps] = (mountRootParcel as unknown as Mock).mock.calls[0]
    expect(parcelProps.appId).toBe('p1')
    expect(parcelProps.domElement).toBe(dom)
    expect(parcelProps.isAtlas).toBe(true)
    expect(typeof parcelProps.t).toBe('function')
    expect(typeof parcelProps.getToken).toBe('function')
    await expect(parcelProps.getToken()).resolves.toBe('test-token')
    expect(handle).toBeDefined()
    expect(logger.debug).toHaveBeenCalledWith('parcelLoader', expect.stringContaining('p1'))
  })

  it('throws if plugin is not registered', async () => {
    await expect(mountPluginParcel('unknown', dom)).rejects.toThrow(/not registered/)
    expect(systemImportMock).not.toHaveBeenCalled()
  })

  it('throws if plugin module is missing lifecycle methods', async () => {
    registerTestPlugin('p2')
    systemImportMock.mockResolvedValue({ mount: vi.fn() })
    await expect(mountPluginParcel('p2', dom)).rejects.toThrow(/missing required lifecycle/)
  })

  it('throws if SystemJS is not available', async () => {
    registerTestPlugin('p3')
    const originalSystem = window.System
    // remove SystemJS
    ;(window as { System?: typeof window.System }).System = undefined
    try {
      await expect(mountPluginParcel('p3', dom)).rejects.toThrow(/SystemJS is not available/)
    } finally {
      window.System = originalSystem
    }
  })

  it('surfaces the error when System.import rejects', async () => {
    registerTestPlugin('p4')
    systemImportMock.mockRejectedValue(new Error('boom'))
    await expect(mountPluginParcel('p4', dom)).rejects.toThrow('boom')
  })

  it('retries module load after a previous failure (cache invalidation)', async () => {
    registerTestPlugin('p5')
    systemImportMock.mockRejectedValueOnce(new Error('first fail'))
    await expect(mountPluginParcel('p5', dom)).rejects.toThrow('first fail')

    // wait a microtask for the .catch handler that deletes from cache
    await Promise.resolve()
    await Promise.resolve()

    const mod = makePluginModule()
    systemImportMock.mockResolvedValueOnce(mod)
    const handle = await mountPluginParcel('p5', dom)
    expect(handle).toBeDefined()
    expect(systemImportMock).toHaveBeenCalledTimes(2)
  })

  it('caches the module on subsequent mounts of the same plugin', async () => {
    registerTestPlugin('p6')
    const mod = makePluginModule()
    systemImportMock.mockResolvedValue(mod)

    await mountPluginParcel('p6', dom)
    await mountPluginParcel('p6', dom)

    // System.import should only have been called once for the same pluginId
    expect(systemImportMock).toHaveBeenCalledTimes(1)
    expect(mountRootParcel).toHaveBeenCalledTimes(2)
  })

  it('injects a stylesheet for the plugin on first mount', async () => {
    registerTestPlugin('p7', 'p7-plugin/index.system.js')
    const mod = makePluginModule()
    systemImportMock.mockResolvedValue(mod)

    await mountPluginParcel('p7', dom)

    const link = document.getElementById('plugin-style-p7') as HTMLLinkElement | null
    expect(link).not.toBeNull()
    expect(link?.rel).toBe('stylesheet')
    expect(link?.href).toContain('style.css')
    expect(link?.dataset.pluginId).toBe('p7')
  })

  it('does not duplicate the stylesheet on remount', async () => {
    registerTestPlugin('p8', 'p8-plugin/index.system.js')
    const mod = makePluginModule()
    systemImportMock.mockResolvedValue(mod)

    await mountPluginParcel('p8', dom)
    await mountPluginParcel('p8', dom)

    const links = document.querySelectorAll('#plugin-style-p8')
    expect(links.length).toBe(1)
  })

  it('supports absolute entryPoints (http/https URLs)', async () => {
    registerTestPlugin('p9', 'https://cdn.example.com/p9/index.system.js')
    const mod = makePluginModule()
    systemImportMock.mockResolvedValue(mod)

    await mountPluginParcel('p9', dom)
    expect(systemImportMock).toHaveBeenCalledWith('https://cdn.example.com/p9/index.system.js')
  })

  it('parcelProps.t resolves missing keys to the default value or the key', async () => {
    registerTestPlugin('p10')
    const mod = makePluginModule()
    systemImportMock.mockResolvedValue(mod)

    await mountPluginParcel('p10', dom)
    const [, parcelProps] = (mountRootParcel as unknown as Mock).mock.calls.at(-1) as [
      unknown,
      { t: (k: string, d?: string) => string },
    ]
    expect(parcelProps.t('does.not.exist')).toBe('does.not.exist')
    expect(parcelProps.t('does.not.exist', 'fallback')).toBe('fallback')
  })

  it('parcelProps.getToken returns empty string when storage has no token', async () => {
    registerTestPlugin('p11')
    const mod = makePluginModule()
    systemImportMock.mockResolvedValue(mod)
    ;(storageManager.getToken as Mock).mockReturnValueOnce(null)

    await mountPluginParcel('p11', dom)
    const [, parcelProps] = (mountRootParcel as unknown as Mock).mock.calls.at(-1) as [
      unknown,
      { getToken: () => Promise<string> },
    ]
    await expect(parcelProps.getToken()).resolves.toBe('')
  })
})
