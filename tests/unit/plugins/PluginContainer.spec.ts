/**
 * PluginContainer Tests
 * The container must not report "not found" while plugin registration is
 * still in progress (issue #393).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import { PluginRegistry } from '@/plugins/core/PluginRegistry'

const route = reactive({ params: { pluginId: 'datasources' } })
let registry: PluginRegistry
let resolveReady: () => void

vi.mock('vue-router', () => ({ useRoute: () => route }))

vi.mock('@/plugins/index', () => ({
  get pluginRegistry() {
    return registry
  },
  whenPluginFrameworkReady: () =>
    new Promise<void>(resolve => {
      resolveReady = resolve
    }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import PluginContainer from '@/plugins/components/PluginContainer.vue'

const ErrorStub = {
  name: 'PluginErrorUI',
  props: ['error', 'pluginId'],
  template: '<div class="error-ui">{{ error?.message }}</div>',
}
const LoadingStub = { name: 'PluginLoadingState', template: '<div class="loading-ui" />' }

function mountContainer() {
  return mount(PluginContainer, {
    global: { stubs: { PluginErrorUI: ErrorStub, PluginLoadingState: LoadingStub } },
  })
}

function register(id: string) {
  return registry.registerPlugin(
    { id, name: id, entryPoint: `${id}.js` } as any,
    {} as any,
    {} as any
  )
}

describe('PluginContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    registry = new PluginRegistry()
    route.params.pluginId = 'datasources'
  })

  it('keeps loading while the plugin is not yet registered, even past 2s', async () => {
    const wrapper = mountContainer()
    await vi.advanceTimersByTimeAsync(5000)

    expect(wrapper.find('.loading-ui').exists()).toBe(true)
    expect(wrapper.find('.error-ui').exists()).toBe(false)
  })

  it('follows the plugin once it registers late', async () => {
    const wrapper = mountContainer()
    await vi.advanceTimersByTimeAsync(5000)

    register('datasources')
    await flushPromises()
    registry.updatePluginState('datasources', 'loaded')
    await flushPromises()

    expect(wrapper.find('.error-ui').exists()).toBe(false)
    expect(wrapper.find('.loading-ui').exists()).toBe(false)
  })

  it('reports not found only once the framework is ready without the plugin', async () => {
    const wrapper = mountContainer()
    await flushPromises()

    resolveReady()
    await flushPromises()

    expect(wrapper.find('.error-ui').text()).toBe('Plugin datasources not found')
  })

  it('re-runs the lookup when the route pluginId changes', async () => {
    register('other')
    registry.updatePluginState('other', 'loaded')
    const wrapper = mountContainer()
    await flushPromises()
    resolveReady()
    await flushPromises()
    expect(wrapper.find('.error-ui').exists()).toBe(true)

    route.params.pluginId = 'other'
    await flushPromises()

    expect(wrapper.find('.error-ui').exists()).toBe(false)
    expect(wrapper.find('.loading-ui').exists()).toBe(false)
  })
})
