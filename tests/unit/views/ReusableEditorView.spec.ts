import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})
vi.mock('@/services/reusable.service', () => ({
  getReusable: vi.fn(),
  createReusable: vi.fn(),
  updateReusable: vi.fn(),
  copyReusable: vi.fn(),
  deleteReusable: vi.fn(),
  assignReusableTag: vi.fn(),
  unassignReusableTag: vi.fn(),
}))
vi.mock('@/services/reusable-versions.service', () => ({
  getReusableVersion: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import * as service from '@/services/reusable.service'
import { getReusableVersion } from '@/services/reusable-versions.service'
import { success } from '@/types/api'
import ReusableEditorView from '@/views/ReusableEditorView.vue'
import { useAuthStore } from '@/stores/auth'
import { useReusableStore } from '@/stores/reusable'
import { emptyEntityAccess } from '@/models/auth.types'
import { getAuthConfig, setAuthConfig } from '@/config/auth.config'
import { createEmptyDesign, serializeReusableDesign } from '@/components/reusables/reusable-design'

const vuetify = createVuetify({ components, directives })
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const existing = {
  id: 4,
  name: 'T2DM logic',
  description: 'desc',
  data: serializeReusableDesign(createEmptyDesign()),
  createdBy: { login: 'tester', name: 'Tester' },
  createdDate: 1737000000000,
  tags: [],
}

function makeRouter(): Router {
  const view = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/reusables', component: view },
      { path: '/reusables/new', component: ReusableEditorView },
      { path: '/reusables/:id(\\d+)', component: ReusableEditorView },
      { path: '/reusables/:id(\\d+)/version/:version', component: ReusableEditorView },
      { path: '/elsewhere', component: view },
    ],
  })
}

async function mountAt(path: string, permissions = ['create:reusable', 'write:reusable']) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: Object.fromEntries(permissions.map(p => [p.split(':')[0], [p]])),
    entityAccess: emptyEntityAccess(),
  })
  const router = makeRouter()
  await router.push(path)
  await router.isReady()
  const App = { template: '<router-view />' }
  const wrapper = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [vuetify, pinia, router],
      stubs: {
        ReusableDesignEditor: { props: ['design', 'readonly'], template: '<div data-testid="design-stub" :data-readonly="String(readonly)" />' },
        VersionsTabContent: true,
        TagSelectionDialog: true,
        EntityAccessDialog: true,
      },
    },
  })
  await flushPromises()
  return { wrapper, router, store: useReusableStore() }
}

async function settle() {
  await flushPromises()
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  await flushPromises()
}

function query(testId: string) {
  return document.body.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null
}

describe('ReusableEditorView', () => {
  let previousAuth: boolean
  let mounted: Awaited<ReturnType<typeof mountAt>> | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    previousAuth = getAuthConfig().userAuthenticationEnabled
    setAuthConfig({ userAuthenticationEnabled: true })
    vi.mocked(service.getReusable).mockResolvedValue(success(existing))
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
    setAuthConfig({ userAuthenticationEnabled: previousAuth })
  })

  it('creates a new reusable and moves to its URL', async () => {
    vi.mocked(service.createReusable).mockResolvedValue(success({ ...existing, id: 10, name: 'New Reusable' }))
    mounted = await mountAt('/reusables/new')
    const { wrapper, router } = mounted

    expect((wrapper.get('[data-testid="reusable-editor-name"]').element as HTMLInputElement).value).toBe('New Reusable')
    await wrapper.get('[data-testid="reusable-editor-save"]').trigger('click')
    await settle()

    expect(service.createReusable).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Reusable' }))
    expect(router.currentRoute.value.path).toBe('/reusables/10')
  })

  it('cannot save a new reusable without a name', async () => {
    mounted = await mountAt('/reusables/new')
    const { wrapper } = mounted

    await wrapper.get('[data-testid="reusable-editor-name"]').setValue('   ')

    expect(wrapper.get('[data-testid="reusable-editor-save"]').attributes('disabled')).toBeDefined()
  })

  it('loads an existing reusable and enables save only once something changed', async () => {
    vi.mocked(service.updateReusable).mockResolvedValue(success({ ...existing, name: 'Renamed' }))
    mounted = await mountAt('/reusables/4')
    const { wrapper } = mounted

    expect(service.getReusable).toHaveBeenCalledWith(4)
    expect(wrapper.get('[data-testid="reusable-editor-save"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="reusable-editor-name"]').setValue('Renamed')
    expect(wrapper.get('[data-testid="reusable-editor-save"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('[data-testid="reusable-editor-save"]').trigger('click')
    await settle()

    expect(service.updateReusable).toHaveBeenCalledWith(4, expect.objectContaining({ name: 'Renamed' }))
  })

  it('is read-only for a user who cannot write to the reusable', async () => {
    mounted = await mountAt('/reusables/4', ['read:reusable'])
    const { wrapper } = mounted

    expect(wrapper.get('[data-testid="design-stub"]').attributes('data-readonly')).toBe('true')
    expect(wrapper.get('[data-testid="reusable-editor-name"]').attributes('readonly')).toBeDefined()
  })

  it('asks before leaving with unsaved changes, and leaves on discard', async () => {
    mounted = await mountAt('/reusables/4')
    const { wrapper, router } = mounted
    await wrapper.get('[data-testid="reusable-editor-name"]').setValue('Edited')

    await router.push('/elsewhere')
    await settle()
    expect(router.currentRoute.value.path).toBe('/reusables/4')

    query('reusable-editor-discard')!.click()
    await settle()
    expect(router.currentRoute.value.path).toBe('/elsewhere')
  })

  it('deletes the reusable after confirmation and returns to the list', async () => {
    vi.mocked(service.deleteReusable).mockResolvedValue(success(undefined))
    mounted = await mountAt('/reusables/4')
    const { wrapper, router } = mounted

    await wrapper.get('[data-testid="reusable-editor-menu"]').trigger('click')
    await settle()
    query('reusable-editor-delete')!.click()
    await settle()
    query('reusable-editor-delete-confirm')!.click()
    await settle()

    expect(service.deleteReusable).toHaveBeenCalledWith(4)
    expect(router.currentRoute.value.path).toBe('/reusables')
  })

  it('previews a version read-only, with a banner', async () => {
    vi.mocked(getReusableVersion).mockResolvedValue({
      versionDTO: { version: 2, assetId: 4, createdDate: 1, archived: false },
      entityDTO: { name: 'T2DM logic v2', data: serializeReusableDesign(createEmptyDesign('INITIAL_EVENT')) },
    })
    mounted = await mountAt('/reusables/4/version/2')
    const { wrapper, store } = mounted

    expect(getReusableVersion).toHaveBeenCalledWith(4, 2)
    expect(store.design.type).toBe('INITIAL_EVENT')
    expect(wrapper.text()).toContain('You are viewing version 2.')
    expect(wrapper.get('[data-testid="design-stub"]').attributes('data-readonly')).toBe('true')
    expect(wrapper.get('[data-testid="reusable-editor-save"]').attributes('disabled')).toBeDefined()
  })
})
