import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/apikey.service', () => ({
  listAllApiKeys: vi.fn(),
  adminRevokeApiKey: vi.fn(),
  adminDeleteApiKey: vi.fn(),
}))

import { listAllApiKeys, adminRevokeApiKey, adminDeleteApiKey } from '@/services/apikey.service'
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'
import { useNotifications } from '@/stores/notifications'
import ApiKeysAdminSection from '@/components/config/ApiKeysAdminSection.vue'
import type { AdminApiKeyInfo } from '@/models/apikey.types'

const vuetify = createVuetify({ components, directives })
const now = Date.now() / 1000

const keys: AdminApiKeyInfo[] = [
  {
    name: 'laptop', description: null, keyIdentifier: 'alice-key', ownerLogin: 'alice', ownerName: 'Alice Smith',
    createdAt: now - 1000, expiresAt: null, disabled: false, lastUsedAt: now - 10,
  },
  {
    name: 'ci', description: null, keyIdentifier: 'bob-key', ownerLogin: 'bob', ownerName: 'bob',
    createdAt: now - 2000, expiresAt: null, disabled: false, lastUsedAt: null,
  },
  {
    name: 'old', description: null, keyIdentifier: 'carol-key', ownerLogin: 'carol', ownerName: null,
    createdAt: now - 3000, expiresAt: null, disabled: true, lastUsedAt: null,
  },
]

async function mountSection() {
  setActivePinia(createPinia())
  const wrapper = mount(ApiKeysAdminSection, { global: { plugins: [vuetify] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

function query(testId: string) {
  return document.body.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null
}

function rowTexts() {
  return Array.from(document.body.querySelectorAll('[data-testid="apikeys-admin-table"] tbody tr'))
    .map(row => row.textContent ?? '')
}

async function setFilter(value: string) {
  const input = query('apikeys-admin-filter')!.querySelector('input') as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event('input'))
  await flushPromises()
}

describe('ApiKeysAdminSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    vi.mocked(listAllApiKeys).mockResolvedValue(success(keys))
  })

  it('lists active keys of every user with their owner, hiding revoked ones by default', async () => {
    const wrapper = await mountSection()

    const rows = rowTexts()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('Alice Smith (alice)')
    expect(rows[0]).toContain('alice-key')
    expect(rows[1]).toContain('bob')
    expect(rows[1]).not.toContain('bob (bob)')
    expect(wrapper.text()).not.toContain('carol')
    wrapper.unmount()
  })

  it('shows revoked keys when asked', async () => {
    const wrapper = await mountSection()

    ;(query('apikeys-admin-show-disabled')!.querySelector('input') as HTMLInputElement).click()
    await flushPromises()

    expect(rowTexts()).toHaveLength(3)
    expect(wrapper.text()).toContain('carol')
    expect(wrapper.text()).toContain('Disabled')
    expect(query('apikeys-admin-revoke-carol-key')).toBeNull()
    expect(query('apikeys-admin-delete-carol-key')).not.toBeNull()
    wrapper.unmount()
  })

  it('filters by owner or key name', async () => {
    const wrapper = await mountSection()

    await setFilter('ALICE')
    expect(rowTexts()).toHaveLength(1)
    await setFilter('ci')
    expect(rowTexts()).toEqual([expect.stringContaining('bob-key')])
    wrapper.unmount()
  })

  it('revokes another user\'s key after confirmation and reloads', async () => {
    vi.mocked(adminRevokeApiKey).mockResolvedValue(success(undefined))
    const wrapper = await mountSection()
    const notify = useNotifications()
    const successSpy = vi.spyOn(notify, 'success')

    query('apikeys-admin-revoke-alice-key')!.click()
    await flushPromises()
    expect(query('apikeys-admin-confirm-message')!.textContent)
      .toBe("Revoke the key 'laptop' of Alice Smith (alice)? It will stop working immediately.")
    query('apikeys-admin-confirm')!.click()
    await flushPromises()

    expect(adminRevokeApiKey).toHaveBeenCalledWith('alice-key')
    expect(adminDeleteApiKey).not.toHaveBeenCalled()
    expect(successSpy).toHaveBeenCalledWith('API key revoked')
    expect(listAllApiKeys).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('deletes a key after confirmation and reports a failure', async () => {
    vi.mocked(adminDeleteApiKey).mockResolvedValue(failure(new ApiError('boom', 500, null)))
    const wrapper = await mountSection()
    const notify = useNotifications()
    const dangerSpy = vi.spyOn(notify, 'danger')

    query('apikeys-admin-delete-bob-key')!.click()
    await flushPromises()
    expect(query('apikeys-admin-confirm-message')!.textContent)
      .toBe("Permanently delete the key 'ci' of bob? This cannot be undone.")
    query('apikeys-admin-confirm')!.click()
    await flushPromises()

    expect(adminDeleteApiKey).toHaveBeenCalledWith('bob-key')
    expect(dangerSpy).toHaveBeenCalledWith('Failed to delete API key')
    expect(listAllApiKeys).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('shows the load error with a retry', async () => {
    vi.mocked(listAllApiKeys)
      .mockResolvedValueOnce(failure(new ApiError('forbidden', 403, null)))
      .mockResolvedValueOnce(success(keys))
    const wrapper = await mountSection()

    expect(wrapper.text()).toContain('forbidden')
    ;(Array.from(document.body.querySelectorAll('button')).find(b => b.textContent?.includes('Retry')) as HTMLButtonElement).click()
    await flushPromises()

    expect(wrapper.text()).not.toContain('forbidden')
    expect(rowTexts()).toHaveLength(2)
    wrapper.unmount()
  })
})
