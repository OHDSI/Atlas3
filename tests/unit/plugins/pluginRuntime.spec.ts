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

    const mockSystem = {}
    ;(window as { System?: unknown }).System = mockSystem
    ;(window as { __atlasPluginRuntimeReady?: unknown }).__atlasPluginRuntimeReady =
      Promise.resolve()
    completeScriptLoads()

    await expect(pending).resolves.toBe(mockSystem)
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

  it('does not re-inject already-loaded scripts on retry after a partial failure', async () => {
    const { ensurePluginRuntime } = await import('@/plugins/core/pluginRuntime')
    const first = ensurePluginRuntime()

    const firstAttempt = [...document.head.querySelectorAll('script')]
    expect(firstAttempt).toHaveLength(5)

    // system.js, named-register.js and vue.global.js load fine...
    firstAttempt[0].dispatchEvent(new Event('load'))
    firstAttempt[1].dispatchEvent(new Event('load'))
    firstAttempt[2].dispatchEvent(new Event('load'))
    // ...but vue-router.global.js 404s, so plugin-runtime.js never gets a
    // chance to load either.
    firstAttempt[3].dispatchEvent(new Event('error'))

    await expect(first).rejects.toThrow('Failed to load plugin runtime')

    const retry = ensurePluginRuntime()

    const afterRetry = [...document.head.querySelectorAll('script')]
    expect(afterRetry).toHaveLength(7)
    const srcCounts = (src: string) =>
      afterRetry.filter(el => el.getAttribute('src') === src).length
    expect(srcCounts('./vendor/system.js')).toBe(1)
    expect(srcCounts('./vendor/named-register.js')).toBe(1)
    expect(srcCounts('./vendor/vue.global.js')).toBe(1)
    expect(srcCounts('./vendor/vue-router.global.js')).toBe(2)
    expect(srcCounts('./plugin-runtime.js')).toBe(2)

    const retriedScripts = afterRetry.slice(5)
    for (const el of retriedScripts) {
      el.dispatchEvent(new Event('load'))
    }

    const mockSystem = {}
    ;(window as { System?: unknown }).System = mockSystem
    ;(window as { __atlasPluginRuntimeReady?: unknown }).__atlasPluginRuntimeReady =
      Promise.resolve()

    await expect(retry).resolves.toBe(mockSystem)
  })
})
