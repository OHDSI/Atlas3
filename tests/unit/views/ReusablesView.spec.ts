import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})
vi.mock('@/services/reusable.service', () => ({
  listReusables: vi.fn(),
  copyReusable: vi.fn(),
  deleteReusable: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { listReusables, copyReusable, deleteReusable } from '@/services/reusable.service'
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'
import ReusablesView from '@/views/ReusablesView.vue'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'
import { getAuthConfig, setAuthConfig } from '@/config/auth.config'

const vuetify = createVuetify({ components, directives })
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const rows = [
  {
    id: 1,
    name: 'T2DM with drug',
    data: JSON.stringify({ type: 'CRITERIA_GROUP' }),
    createdBy: { login: 'tester', name: 'Tester' },
    createdDate: 1737000000000,
    modifiedDate: 1737500000000,
  },
  {
    id: 2,
    name: 'Acute MI',
    data: JSON.stringify({ type: 'INITIAL_EVENT' }),
    createdBy: 'someone',
    createdDate: 1737100000000,
  },
]

async function mountView(permissions: string[] = ['create:reusable', 'write:reusable', 'read:reusable']) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/reusables', component: { template: '<div />' } },
      { path: '/reusables/new', component: { template: '<div />' } },
      { path: '/reusables/:id', component: { template: '<div />' } },
    ],
  })
  await router.push('/reusables')
  await router.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: Object.fromEntries(permissions.map(p => [p.split(':')[0], [p]])),
    entityAccess: emptyEntityAccess(),
  })
  const wrapper = mount(ReusablesView, { global: { plugins: [vuetify, pinia, router] } })
  await flushPromises()
  return { wrapper, router }
}

function rowFor(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], name: string) {
  const row = wrapper.findAll('tbody tr').find(tr => tr.text().includes(name))
  if (!row) throw new Error(`No row for ${name}`)
  return row
}

async function settle() {
  await flushPromises()
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  await flushPromises()
}

describe('ReusablesView', () => {
  let previousAuth: boolean
  let mounted: Awaited<ReturnType<typeof mountView>> | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    previousAuth = getAuthConfig().userAuthenticationEnabled
    setAuthConfig({ userAuthenticationEnabled: true })
    vi.mocked(listReusables).mockResolvedValue(success(rows))
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
    setAuthConfig({ userAuthenticationEnabled: previousAuth })
  })

  it('lists reusables with their type', async () => {
    mounted = await mountView()
    const { wrapper } = mounted

    expect(rowFor(wrapper, 'T2DM with drug').text()).toContain('Criteria Group')
    expect(rowFor(wrapper, 'Acute MI').text()).toContain('Initial/Censoring Event')
  })

  it('filters by the search box', async () => {
    mounted = await mountView()
    const { wrapper } = mounted

    await wrapper.get('[data-testid="reusables-search"] input').setValue('acute')
    await flushPromises()

    expect(wrapper.findAll('tbody tr').map(tr => tr.text())).toEqual([expect.stringContaining('Acute MI')])
  })

  it('opens the editor for a new reusable', async () => {
    mounted = await mountView()
    const { wrapper, router } = mounted

    await wrapper.get('[data-testid="reusables-create"]').trigger('click')
    await settle()

    expect(router.currentRoute.value.path).toBe('/reusables/new')
  })

  it('does not offer to create without create:reusable', async () => {
    mounted = await mountView(['read:reusable'])
    expect(mounted.wrapper.get('[data-testid="reusables-create"]').attributes('disabled')).toBeDefined()
  })

  it('copies a reusable and opens the copy', async () => {
    vi.mocked(copyReusable).mockResolvedValue(success({ id: 9, name: 'COPY OF Acute MI' }))
    mounted = await mountView()
    const { wrapper, router } = mounted

    await rowFor(wrapper, 'Acute MI').get('button[aria-label="Copy"]').trigger('click')
    await settle()

    expect(copyReusable).toHaveBeenCalledWith(2)
    expect(router.currentRoute.value.path).toBe('/reusables/9')
  })

  it('deletes a reusable after confirmation', async () => {
    vi.mocked(deleteReusable).mockResolvedValue(success(undefined))
    mounted = await mountView()
    const { wrapper } = mounted

    await rowFor(wrapper, 'Acute MI').get('button[aria-label="Delete"]').trigger('click')
    await flushPromises()
    ;(document.body.querySelector('[data-testid="reusables-delete-confirm"]') as HTMLElement).click()
    await flushPromises()

    expect(deleteReusable).toHaveBeenCalledWith(2)
    expect(wrapper.text()).not.toContain('Acute MI')
  })

  it('shows a load failure', async () => {
    vi.mocked(listReusables).mockResolvedValue(failure(new ApiError('HTTP 500: boom', 500, null)))
    mounted = await mountView()
    expect(mounted.wrapper.text()).toContain('HTTP 500: boom')
  })
})
