/**
 * Exercises the classic <script> at public/plugin-runtime.js directly (it
 * sits outside the module graph, so it can't be `import`ed - it's evaluated
 * in the jsdom global scope the same way the browser would run it).
 *
 * Guards against window.__atlasPluginRuntimeReady silently resolving after
 * a failure: ensurePluginRuntime (src/plugins/core/pluginRuntime.ts) only
 * checks window.System before marking the runtime ready, so any failure in
 * this script that doesn't reject leaves plugins loading against a
 * partially-registered SystemJS instance.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const scriptSource = readFileSync(resolve(__dirname, '../../../public/plugin-runtime.js'), 'utf-8')

function runScript() {
  // Indirect eval runs in global scope, matching how a classic <script> sees
  // `window` as the same global object jsdom exposes to the test.
  (0, eval)(scriptSource)
  return (window as unknown as { __atlasPluginRuntimeReady: Promise<void> }).__atlasPluginRuntimeReady
}

describe('public/plugin-runtime.js', () => {
  beforeEach(() => {
    delete (window as { System?: unknown }).System
    delete (window as { Vue?: unknown }).Vue
    delete (window as { VueRouter?: unknown }).VueRouter
    delete (window as { __atlasVuetify?: unknown }).__atlasVuetify
  })

  it('rejects when single-spa-vue fails to load instead of resolving with it unregistered', async () => {
    const registered: string[] = []
    ;(window as { Vue?: unknown }).Vue = { h: () => {} }
    ;(window as { VueRouter?: unknown }).VueRouter = {}
    ;(window as { System?: unknown }).System = {
      register: (name: string) => {
        registered.push(name)
      },
      import: (specifier: string) => {
        if (specifier === './vendor/single-spa-vue.js') {
          return Promise.reject(new Error('404'))
        }
        return Promise.resolve({})
      },
    }

    await expect(runScript()).rejects.toThrow('404')
    expect(registered).not.toContain('single-spa-vue')
  })

  it('resolves once single-spa-vue registers successfully', async () => {
    (window as { Vue?: unknown }).Vue = { h: () => {} }
    ;(window as { VueRouter?: unknown }).VueRouter = {}
    const registered: string[] = []
    ;(window as { System?: unknown }).System = {
      register: (name: string) => {
        registered.push(name)
      },
      import: () => Promise.resolve({ default: {} }),
    }

    await expect(runScript()).resolves.toBeUndefined()
    expect(registered).toContain('single-spa-vue')
  })

  it('rejects when window.Vue is not available', async () => {
    (window as { VueRouter?: unknown }).VueRouter = {}
    ;(window as { System?: unknown }).System = { register: () => {}, import: () => Promise.resolve({}) }

    await expect(runScript()).rejects.toThrow('window.Vue is not available')
  })
})
