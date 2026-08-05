import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PluginParcelOutlet from '@/plugins/components/PluginParcelOutlet.vue'
import { mountPluginParcel } from '@/plugins/host/parcelLoader'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/plugins/host/parcelLoader', () => ({
  mountPluginParcel: vi.fn(),
}))

const update = vi.fn().mockResolvedValue(undefined)
const unmount = vi.fn().mockResolvedValue(undefined)

const PluginErrorUIStub = {
  template: '<button data-testid="retry" @click="$emit(\'retry\')" />',
}

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
      global: { stubs: { PluginErrorUI: PluginErrorUIStub, PluginLoadingState: true } },
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

  it('flattens the permission index into permission strings, not resource keys', async () => {
    const authStore = useAuthStore()
    authStore.permissions = {
      cohort: ['cohort:read', 'cohort:write'],
      conceptset: ['conceptset:read'],
    }

    factory()
    await flushPromises()

    expect(mountPluginParcel).toHaveBeenCalledWith(
      'p1',
      expect.any(HTMLElement),
      expect.objectContaining({
        hostContext: expect.objectContaining({
          permissions: ['cohort:read', 'cohort:write', 'conceptset:read'],
        }),
      })
    )
  })

  it('unmounts the failed parcel before retrying, and retries the mount', async () => {
    const failedUnmount = vi.fn().mockResolvedValue(undefined)
    vi.mocked(mountPluginParcel).mockResolvedValueOnce({
      update: vi.fn().mockResolvedValue(undefined),
      unmount: failedUnmount,
      mountPromise: Promise.reject(new Error('boom')),
    })

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find('[data-testid="plugin-outlet-error"]').exists()).toBe(true)
    expect(failedUnmount).toHaveBeenCalledTimes(1)

    await wrapper.find('[data-testid="retry"]').trigger('click')
    await flushPromises()

    expect(mountPluginParcel).toHaveBeenCalledTimes(2)
    expect(failedUnmount).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="plugin-outlet-error"]').exists()).toBe(false)
  })
})
