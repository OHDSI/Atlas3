import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('plugins/core/pluginRuntime', () => {
  beforeEach(() => {
    vi.resetModules()
    document.head.innerHTML = ''
    delete (window as { System?: unknown }).System
    delete (window as { __atlasPluginRuntimeReady?: unknown }).__atlasPluginRuntimeReady
  })

  function completeScriptLoads() {
    for (const el of document.head.querySelectorAll('script')) {
      el.dispatchEvent(new Event('load'))
    }
  }

  it('injects the vendor scripts in dependency order', async () => {
    const { ensurePluginRuntime } = await import('@/plugins/core/pluginRuntime')
    const pending = ensurePluginRuntime()

    const srcs = [...document.head.querySelectorAll('script')].map(s => s.getAttribute('src'))
    expect(srcs).toEqual([
      './vendor/system.js',
      './vendor/named-register.js',
      './vendor/vue.global.js',
      './vendor/vue-router.global.js',
      './plugin-runtime.js',
    ])

    ;(window as { System?: unknown }).System = {}
    ;(window as { __atlasPluginRuntimeReady?: unknown }).__atlasPluginRuntimeReady =
      Promise.resolve()
    completeScriptLoads()

    await expect(pending).resolves.toBeUndefined()
  })

  it('injects the scripts only once across concurrent callers', async () => {
    const { ensurePluginRuntime } = await import('@/plugins/core/pluginRuntime')
    const a = ensurePluginRuntime()
    const b = ensurePluginRuntime()

    expect(document.head.querySelectorAll('script')).toHaveLength(5)

    ;(window as { System?: unknown }).System = {}
    ;(window as { __atlasPluginRuntimeReady?: unknown }).__atlasPluginRuntimeReady =
      Promise.resolve()
    completeScriptLoads()

    await Promise.all([a, b])
    expect(document.head.querySelectorAll('script')).toHaveLength(5)
  })

  it('rejects when a vendor script fails to load', async () => {
    const { ensurePluginRuntime } = await import('@/plugins/core/pluginRuntime')
    const pending = ensurePluginRuntime()

    document.head.querySelector('script')!.dispatchEvent(new Event('error'))

    await expect(pending).rejects.toThrow('Failed to load plugin runtime')
  })
})
