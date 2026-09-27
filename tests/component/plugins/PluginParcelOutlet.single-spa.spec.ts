import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, h } from 'vue'
import { mountRootParcel, type ParcelConfig } from 'single-spa'
import singleSpaVue from 'single-spa-vue'
import PluginParcelOutlet from '@/plugins/components/PluginParcelOutlet.vue'
import { mountPluginParcel, type ParcelHandle } from '@/plugins/host/parcelLoader'

vi.mock('@/plugins/host/parcelLoader', () => ({
  mountPluginParcel: vi.fn(),
}))

type LifecycleProps = Record<string, unknown>
type Lifecycle = (props: LifecycleProps) => Promise<unknown>

interface TestPlugin {
  config: ParcelConfig
  mountGate?: Promise<void>
}

const log: string[] = []

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(res => {
    resolve = res
  })
  return { promise, resolve }
}

function fragmentPlugin(name: string, plugin: Partial<TestPlugin> = {}): TestPlugin {
  const lifecycles = singleSpaVue({
    createApp,
    appOptions: {
      render: () => [h('p', `${name} first`), h('p', `${name} second`)],
    },
  })
  const wrap =
    (phase: string, fn: Lifecycle): Lifecycle =>
    async props => {
      log.push(`${name}:${phase}`)
      if (phase === 'mount' && plugin.mountGate) await plugin.mountGate
      return fn(props)
    }
  return {
    ...plugin,
    config: {
      name,
      bootstrap: wrap('bootstrap', lifecycles.bootstrap as Lifecycle),
      mount: wrap('mount', lifecycles.mount as Lifecycle),
      unmount: wrap('unmount', lifecycles.unmount as Lifecycle),
      update: wrap('update', lifecycles.update as Lifecycle),
    } as unknown as ParcelConfig,
  }
}

let plugins: Record<string, TestPlugin>
let wrapper: VueWrapper | undefined

function factory(pluginId: string) {
  wrapper = mount(PluginParcelOutlet, {
    attachTo: document.body,
    props: { pluginId, itemId: `${pluginId}-report`, surface: 'datasource-sidebar' },
    global: { stubs: { PluginLoadingState: true } },
  })
  return wrapper
}

function switchTo(w: VueWrapper, pluginId: string) {
  return w.setProps({ pluginId, itemId: `${pluginId}-report` })
}

async function settle() {
  for (let i = 0; i < 5; i++) {
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

describe('PluginParcelOutlet with real single-spa parcels', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    log.length = 0
    plugins = {
      a: fragmentPlugin('a'),
      b: fragmentPlugin('b'),
    }
    vi.mocked(mountPluginParcel).mockImplementation(
      async (pluginId, domElement, extraProps = {}) =>
        mountRootParcel(plugins[pluginId].config, {
          domElement,
          ...extraProps,
        }) as unknown as ParcelHandle
    )
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
  })

  it('unmounts the old plugin before mounting the next after a completed mount', async () => {
    const w = factory('a')
    await settle()
    expect(w.text()).toContain('a first')

    await switchTo(w, 'b')
    await settle()

    expect(w.find('[data-testid="plugin-outlet-error"]').exists()).toBe(false)
    expect(log.indexOf('a:unmount')).toBeGreaterThan(-1)
    expect(log.indexOf('a:unmount')).toBeLessThan(log.indexOf('b:mount'))
    expect(w.text()).toContain('b first')
    expect(w.text()).not.toContain('a first')
  })

  it('does not send the outgoing plugin an update for the incoming plugin', async () => {
    const w = factory('a')
    await settle()

    await switchTo(w, 'b')
    await settle()

    expect(log).not.toContain('a:update')
    expect(log).not.toContain('b:update')
  })

  it('waits for an in-flight mount, unmounts it, then mounts the next plugin', async () => {
    const gate = deferred()
    plugins.a = fragmentPlugin('a', { mountGate: gate.promise })
    const w = factory('a')
    await settle()

    await switchTo(w, 'b')
    await settle()
    expect(log).not.toContain('b:mount')

    gate.resolve()
    await settle()

    expect(log.indexOf('a:unmount')).toBeGreaterThan(-1)
    expect(log.indexOf('a:unmount')).toBeLessThan(log.indexOf('b:mount'))
    expect(w.text()).toContain('b first')
    expect(w.text()).not.toContain('a first')
  })

  it('unmounts a parcel that was still mounting when the outlet was destroyed', async () => {
    const gate = deferred()
    plugins.a = fragmentPlugin('a', { mountGate: gate.promise })
    const w = factory('a')
    await settle()

    w.unmount()
    wrapper = undefined
    gate.resolve()
    await settle()

    expect(log).toContain('a:unmount')
    expect(document.body.textContent).not.toContain('a first')
  })

  it('gives each parcel its own host element and removes it after unmount', async () => {
    const w = factory('a')
    await settle()
    const hostA = vi.mocked(mountPluginParcel).mock.calls[0][1]

    await switchTo(w, 'b')
    await settle()
    const hostB = vi.mocked(mountPluginParcel).mock.calls[1][1]

    expect(hostA).not.toBe(hostB)
    expect(hostA.id).toMatch(/^plugin-parcel-outlet-host-\d+$/)
    expect(hostB.id).toMatch(/^plugin-parcel-outlet-host-\d+$/)
    expect(hostA.isConnected).toBe(false)
    expect(hostB.isConnected).toBe(true)
    expect(w.findAll('.plugin-parcel-outlet__host')).toHaveLength(1)
  })
})
