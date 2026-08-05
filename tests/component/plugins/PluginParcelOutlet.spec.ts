import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PluginParcelOutlet from '@/plugins/components/PluginParcelOutlet.vue'
import { mountPluginParcel } from '@/plugins/host/parcelLoader'

vi.mock('@/plugins/host/parcelLoader', () => ({
  mountPluginParcel: vi.fn(),
}))

const update = vi.fn().mockResolvedValue(undefined)
const unmount = vi.fn().mockResolvedValue(undefined)

describe('PluginParcelOutlet', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(mountPluginParcel).mockResolvedValue({
      update,
      unmount,
      mountPromise: Promise.resolve(),
    })
  })

  function factory(props: Record<string, unknown> = {}) {
    return mount(PluginParcelOutlet, {
      props: {
        pluginId: 'p1',
        itemId: 'my-report',
        surface: 'datasource-sidebar',
        ...props,
      },
      global: { stubs: { PluginErrorUI: true, PluginLoadingState: true } },
    })
  }

  it('mounts the parcel with a host context', async () => {
    factory({ sourceKey: 'SYNPUF' })
    await flushPromises()

    expect(mountPluginParcel).toHaveBeenCalledWith(
      'p1',
      expect.any(HTMLElement),
      expect.objectContaining({
        hostContext: expect.objectContaining({
          surface: 'datasource-sidebar',
          itemId: 'my-report',
          sourceKey: 'SYNPUF',
        }),
      })
    )
  })

  it('calls update when sourceKey changes', async () => {
    const wrapper = factory({ sourceKey: 'SYNPUF' })
    await flushPromises()

    await wrapper.setProps({ sourceKey: 'EUNOMIA' })
    await flushPromises()

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        hostContext: expect.objectContaining({ sourceKey: 'EUNOMIA' }),
      })
    )
  })

  it('unmounts the parcel on teardown', async () => {
    const wrapper = factory()
    await flushPromises()

    wrapper.unmount()
    await flushPromises()

    expect(unmount).toHaveBeenCalled()
  })

  it('renders the error UI when mounting rejects', async () => {
    vi.mocked(mountPluginParcel).mockRejectedValue(new Error('boom'))
    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find('[data-testid="plugin-outlet-error"]').exists()).toBe(true)
  })
})
