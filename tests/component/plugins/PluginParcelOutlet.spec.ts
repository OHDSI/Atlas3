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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })
  return { promise, resolve }
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

  it('does not let a stale generation clobber a newer one once its mount finally resolves', async () => {
    const first = deferred<unknown>()
    const third = deferred<unknown>()

    const firstUnmount = vi.fn().mockResolvedValue(undefined)
    const firstUpdate = vi.fn().mockResolvedValue(undefined)
    const secondUnmount = vi.fn().mockResolvedValue(undefined)
    const thirdUpdate = vi.fn().mockResolvedValue(undefined)

    vi.mocked(mountPluginParcel)
      .mockResolvedValueOnce({
        update: firstUpdate,
        unmount: firstUnmount,
        mountPromise: first.promise,
      })
      .mockResolvedValueOnce({
        update: vi.fn().mockResolvedValue(undefined),
        unmount: secondUnmount,
        mountPromise: Promise.resolve(),
      })
      .mockResolvedValueOnce({
        update: thirdUpdate,
        unmount: vi.fn().mockResolvedValue(undefined),
        mountPromise: third.promise,
      })

    const wrapper = factory({ pluginId: 'p1' })
    await flushPromises()

    await wrapper.setProps({ pluginId: 'p2' })
    await flushPromises()

    await wrapper.setProps({ pluginId: 'p3' })
    await flushPromises()

    expect(mountPluginParcel).toHaveBeenCalledTimes(3)
    expect(secondUnmount).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.plugin-parcel-outlet__mount').classes()).toContain(
      'plugin-parcel-outlet__mount--hidden'
    )

    first.resolve(undefined)
    await flushPromises()

    expect(firstUnmount).toHaveBeenCalledTimes(1)
    expect(firstUpdate).not.toHaveBeenCalled()
    expect(wrapper.find('.plugin-parcel-outlet__mount').classes()).toContain(
      'plugin-parcel-outlet__mount--hidden'
    )

    third.resolve(undefined)
    await flushPromises()

    expect(thirdUpdate).not.toHaveBeenCalled()
    expect(wrapper.find('.plugin-parcel-outlet__mount').classes()).not.toContain(
      'plugin-parcel-outlet__mount--hidden'
    )
  })
})
