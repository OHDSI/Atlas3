/**
 * ApiKeysView component tests
 *
 * Covers list rendering (status derivation), the New Key dialog wiring, and
 * the revoke/delete confirmation flows.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { useNotifications } from '@/stores/notifications'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/apikey.service', () => ({
  listApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
  deleteApiKey: vi.fn(),
}))

vi.mock('@/components/apikey/ApiKeyCreateDialog.vue', () => ({
  default: {
    name: 'ApiKeyCreateDialog',
    props: ['modelValue'],
    emits: ['update:modelValue', 'created'],
    template: '<div class="apikey-create-dialog-stub" />',
  },
}))

import { listApiKeys, revokeApiKey, deleteApiKey } from '@/services/apikey.service'
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'
import ApiKeysView from '@/views/ApiKeysView.vue'
import type { ApiKeyInfo } from '@/models/apikey.types'

const vuetify = createVuetify({ components, directives })

const now = Date.now() / 1000

const sampleKeys: ApiKeyInfo[] = [
  {
    name: 'laptop',
    description: 'Dev laptop',
    keyIdentifier: 'active-key',
    createdAt: now - 1000,
    expiresAt: null,
    disabled: false,
    lastUsedAt: null,
  },
  {
    name: 'old-script',
    description: null,
    keyIdentifier: 'disabled-key',
    createdAt: now - 5000,
    expiresAt: null,
    disabled: true,
    lastUsedAt: now - 100,
  },
  {
    name: 'expired-key',
    description: null,
    keyIdentifier: 'expired-key',
    createdAt: now - 9000,
    expiresAt: now - 10,
    disabled: false,
    lastUsedAt: null,
  },
]

async function mountView() {
  setActivePinia(createPinia())
  const wrapper = mount(ApiKeysView, {
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('ApiKeysView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('loads and renders a row per key with derived status', async () => {
    vi.mocked(listApiKeys).mockResolvedValue(success(sampleKeys))
    const wrapper = await mountView()

    expect(listApiKeys).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('laptop')
    expect(wrapper.text()).toContain('old-script')
    expect(wrapper.text()).toContain('expired-key')
    expect(wrapper.text()).toContain('Active')
    expect(wrapper.text()).toContain('Disabled')
    expect(wrapper.text()).toContain('Expired')
    // No confirm dialogs should be open on a fresh load.
    expect(document.body.querySelector('[data-testid="apikeys-revoke-confirm"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="apikeys-delete-confirm"]')).toBeNull()
    wrapper.unmount()
  })

  it('treats a key with a future expiration date as still active', async () => {
    const futureKey: ApiKeyInfo = {
      name: 'future-key',
      description: null,
      keyIdentifier: 'future-key',
      createdAt: now - 1000,
      expiresAt: now + 100000,
      disabled: false,
      lastUsedAt: null,
    }
    vi.mocked(listApiKeys).mockResolvedValue(success([futureKey]))
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Active')
    expect(wrapper.text()).not.toContain('Expired')
    wrapper.unmount()
  })

  it('shows a loading indicator while the list request is in flight', async () => {
    let resolveList!: (value: Awaited<ReturnType<typeof listApiKeys>>) => void
    vi.mocked(listApiKeys).mockReturnValue(
      new Promise(resolve => {
        resolveList = resolve
      })
    )
    const wrapper = await mountView()

    expect(document.body.querySelector('.v-progress-linear--absolute')).not.toBeNull()

    resolveList(success(sampleKeys))
    await flushPromises()

    expect(document.body.querySelector('.v-progress-linear--absolute')).toBeNull()
    wrapper.unmount()
  })

  it('shows the empty state when there are no keys', async () => {
    vi.mocked(listApiKeys).mockResolvedValue(success([]))
    const wrapper = await mountView()

    expect(wrapper.text()).toContain("You haven't created any API keys yet.")
    wrapper.unmount()
  })

  it('shows an error banner with retry when the list fails to load', async () => {
    vi.mocked(listApiKeys)
      .mockResolvedValueOnce(failure(new ApiError('network down', 0, null)))
      .mockResolvedValueOnce(success(sampleKeys))
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('network down')

    const retryBtn = Array.from(document.body.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Retry')
    ) as HTMLButtonElement
    retryBtn.click()
    await flushPromises()

    expect(listApiKeys).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).not.toContain('network down')
    wrapper.unmount()
  })

  it('opens the create dialog when New Key is clicked and reloads after created', async () => {
    vi.mocked(listApiKeys).mockResolvedValue(success([]))
    const wrapper = await mountView()

    const createDialog = wrapper.findComponent({ name: 'ApiKeyCreateDialog' })
    expect(createDialog.props('modelValue')).toBe(false)

    ;(document.body.querySelector('[data-testid="apikeys-create"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(createDialog.props('modelValue')).toBe(true)

    createDialog.vm.$emit('created')
    await flushPromises()

    expect(listApiKeys).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('hides the revoke action for an already-disabled key', async () => {
    vi.mocked(listApiKeys).mockResolvedValue(success(sampleKeys))
    await mountView()

    expect(document.body.querySelector('[data-testid="apikeys-revoke-active-key"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="apikeys-revoke-disabled-key"]')).toBeNull()
  })

  it('revokes a key after confirmation and refreshes the list', async () => {
    vi.mocked(listApiKeys).mockResolvedValue(success(sampleKeys))
    vi.mocked(revokeApiKey).mockResolvedValue(success(undefined))
    const wrapper = await mountView()
    const notify = useNotifications()

    ;(document.body.querySelector('[data-testid="apikeys-revoke-active-key"]') as HTMLButtonElement).click()
    await flushPromises()

    // The confirm dialog interpolates the selected key's name into the message.
    expect(document.body.textContent).toContain("Revoke the key 'laptop'")
    expect(document.body.textContent).toContain('stop working immediately')

    const confirmBtn = document.body.querySelector('[data-testid="apikeys-revoke-confirm"]') as HTMLButtonElement
    expect(confirmBtn).not.toBeNull()
    confirmBtn.click()
    await flushPromises()

    expect(revokeApiKey).toHaveBeenCalledWith('active-key')
    expect(listApiKeys).toHaveBeenCalledTimes(2)
    expect(notify.liveItems.some(i => i.title === 'API key revoked')).toBe(true)
    wrapper.unmount()
  })

  it('cancels the revoke confirmation without calling the service', async () => {
    vi.mocked(listApiKeys).mockResolvedValue(success(sampleKeys))
    const wrapper = await mountView()

    ;(document.body.querySelector('[data-testid="apikeys-revoke-active-key"]') as HTMLButtonElement).click()
    await flushPromises()
    ;(document.body.querySelector('[data-testid="apikeys-revoke-cancel"]') as HTMLButtonElement).click()
    await flushPromises()

    expect(revokeApiKey).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('permanently deletes a key after confirmation and refreshes the list', async () => {
    vi.mocked(listApiKeys).mockResolvedValue(success(sampleKeys))
    vi.mocked(deleteApiKey).mockResolvedValue(success(undefined))
    const wrapper = await mountView()
    const notify = useNotifications()

    ;(document.body.querySelector('[data-testid="apikeys-delete-disabled-key"]') as HTMLButtonElement).click()
    await flushPromises()

    expect(document.body.textContent).toContain("Permanently delete the key 'old-script'")
    expect(document.body.textContent).toContain('cannot be undone')

    const confirmBtn = document.body.querySelector('[data-testid="apikeys-delete-confirm"]') as HTMLButtonElement
    confirmBtn.click()
    await flushPromises()

    expect(deleteApiKey).toHaveBeenCalledWith('disabled-key')
    expect(listApiKeys).toHaveBeenCalledTimes(2)
    expect(notify.liveItems.some(i => i.title === 'API key deleted')).toBe(true)
    wrapper.unmount()
  })

  it('keeps the list unchanged and does not throw when revoke fails', async () => {
    vi.mocked(listApiKeys).mockResolvedValue(success(sampleKeys))
    vi.mocked(revokeApiKey).mockResolvedValue(failure(new ApiError('boom', 500, null)))
    const wrapper = await mountView()
    const notify = useNotifications()

    ;(document.body.querySelector('[data-testid="apikeys-revoke-active-key"]') as HTMLButtonElement).click()
    await flushPromises()
    ;(document.body.querySelector('[data-testid="apikeys-revoke-confirm"]') as HTMLButtonElement).click()
    await flushPromises()

    expect(revokeApiKey).toHaveBeenCalledWith('active-key')
    // A failed revoke does not refresh the list — the key stays visible as-is.
    expect(listApiKeys).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('laptop')
    expect(notify.liveItems.some(i => i.title === 'Failed to revoke API key')).toBe(true)
    wrapper.unmount()
  })

  it('keeps the list unchanged and does not throw when delete fails', async () => {
    vi.mocked(listApiKeys).mockResolvedValue(success(sampleKeys))
    vi.mocked(deleteApiKey).mockResolvedValue(failure(new ApiError('boom', 500, null)))
    const wrapper = await mountView()
    const notify = useNotifications()

    ;(document.body.querySelector('[data-testid="apikeys-delete-disabled-key"]') as HTMLButtonElement).click()
    await flushPromises()
    ;(document.body.querySelector('[data-testid="apikeys-delete-confirm"]') as HTMLButtonElement).click()
    await flushPromises()

    expect(deleteApiKey).toHaveBeenCalledWith('disabled-key')
    expect(listApiKeys).toHaveBeenCalledTimes(1)
    expect(notify.liveItems.some(i => i.title === 'Failed to delete API key')).toBe(true)
    wrapper.unmount()
  })
})
