import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { usePluginMounts } from '@/composables/usePluginMounts'
import { getMountItems } from '@/plugins/navigation/PluginMountPoints'
import { pluginRegistry } from '@/plugins/core/PluginRegistry'

vi.mock('@/plugins/navigation/PluginMountPoints', () => ({
  getMountItems: vi.fn(() => []),
}))

vi.mock('@/plugins/core/PluginRegistry', () => ({
  pluginRegistry: { onPluginChange: vi.fn(() => () => {}) },
}))

const Host = defineComponent({
  setup() {
    return { ...usePluginMounts('admin-tabs') }
  },
  template: '<div>{{ items.length }}</div>',
})

describe('usePluginMounts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('queries the collector for the given surface', () => {
    mount(Host)
    expect(getMountItems).toHaveBeenCalledWith('admin-tabs', expect.any(Function))
  })

  it('re-computes when the registry reports a change', async () => {
    let notify: (() => void) | undefined
    vi.mocked(pluginRegistry.onPluginChange).mockImplementation((cb: never) => {
      notify = cb as unknown as () => void
      return () => {}
    })
    vi.mocked(getMountItems).mockReturnValue([])

    const wrapper = mount(Host)
    expect(wrapper.text()).toBe('0')

    vi.mocked(getMountItems).mockReturnValue([
      {
        key: 'plugin:p1:a',
        pluginId: 'p1',
        itemId: 'a',
        surface: 'admin-tabs',
        name: 'A',
        order: 999,
      },
    ])
    notify?.()
    await nextTick()

    expect(wrapper.text()).toBe('1')
  })

  it('unsubscribes from the registry on unmount', () => {
    const unsubscribe = vi.fn()
    vi.mocked(pluginRegistry.onPluginChange).mockReturnValue(unsubscribe)

    mount(Host).unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })
})
