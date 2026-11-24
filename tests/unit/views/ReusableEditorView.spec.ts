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
import { failure, success } from '@/types/api'
import { ApiError } from '@/services/api-error'
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
        VersionsTabContent: {
          props: ['config'],
          template: '<div data-testid="versions-stub" :data-asset="config.assetId" :data-current="config.currentVersion().displayVersion" :data-date="config.currentVersion().createdDate" />',
        },
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

  it('keeps the description as typed', async () => {
    mounted = await mountAt('/reusables/4')
    const { wrapper, store } = mounted
    await wrapper.get('[data-testid="reusable-editor-description"]').setValue('New description')
    expect(store.current?.description).toBe('New description')
  })

  it('stays on the page when saving fails', async () => {
    vi.mocked(service.updateReusable).mockResolvedValue(failure(new ApiError('HTTP 500', 500, null)))
    mounted = await mountAt('/reusables/4')
    const { wrapper, router, store } = mounted
    await wrapper.get('[data-testid="reusable-editor-name"]').setValue('Renamed')
    await wrapper.get('[data-testid="reusable-editor-save"]').trigger('click')
    await settle()
    expect(store.error).toBe('HTTP 500')
    expect(router.currentRoute.value.path).toBe('/reusables/4')
  })

  it('duplicates the reusable and opens the copy, or stays when copying fails', async () => {
    mounted = await mountAt('/reusables/4')
    const { wrapper, router } = mounted

    vi.mocked(service.copyReusable).mockResolvedValueOnce(failure(new ApiError('HTTP 500', 500, null)))
    await wrapper.get('[data-testid="reusable-editor-menu"]').trigger('click')
    await settle()
    query('reusable-editor-copy')!.click()
    await settle()
    expect(router.currentRoute.value.path).toBe('/reusables/4')

    vi.mocked(service.copyReusable).mockResolvedValueOnce(success({ ...existing, id: 5 }))
    await wrapper.get('[data-testid="reusable-editor-menu"]').trigger('click')
    await settle()
    query('reusable-editor-copy')!.click()
    await settle()
    expect(router.currentRoute.value.path).toBe('/reusables/5')
  })

  it('stays on the page when deleting fails', async () => {
    vi.mocked(service.deleteReusable).mockResolvedValue(failure(new ApiError('HTTP 403', 403, null)))
    mounted = await mountAt('/reusables/4')
    const { wrapper, router } = mounted
    await wrapper.get('[data-testid="reusable-editor-menu"]').trigger('click')
    await settle()
    query('reusable-editor-delete')!.click()
    await settle()
    query('reusable-editor-delete-confirm')!.click()
    await settle()
    expect(router.currentRoute.value.path).toBe('/reusables/4')
  })

  it('closes to the list', async () => {
    mounted = await mountAt('/reusables/4')
    const { wrapper, router } = mounted
    await wrapper.get('[data-testid="reusable-editor-close"]').trigger('click')
    await settle()
    expect(router.currentRoute.value.path).toBe('/reusables')
  })

  it('goes back to the current version from a preview', async () => {
    vi.mocked(getReusableVersion).mockResolvedValue({
      versionDTO: { version: 2, assetId: 4, createdDate: 1, archived: false },
      entityDTO: { name: 'T2DM logic v2', data: serializeReusableDesign(createEmptyDesign()) },
    })
    mounted = await mountAt('/reusables/4/version/2')
    const { wrapper, router } = mounted
    await wrapper.get('[data-testid="reusable-editor-back-to-current"]').trigger('click')
    await settle()
    expect(router.currentRoute.value.path).toBe('/reusables/4')
  })

  it('shows the version history with the current state as its first row', async () => {
    mounted = await mountAt('/reusables/4')
    const { wrapper } = mounted
    await wrapper.get('[data-testid="reusable-editor-versions"]').trigger('click')
    await settle()
    const versions = query('versions-stub')!
    expect(versions.dataset.asset).toBe('4')
    expect(versions.dataset.current).toBe('Current')
  })

  it('stays when leaving is cancelled', async () => {
    mounted = await mountAt('/reusables/4')
    const { wrapper, router } = mounted
    await wrapper.get('[data-testid="reusable-editor-name"]').setValue('Edited')
    await router.push('/elsewhere')
    await settle()
    query('reusable-editor-keep-editing')!.click()
    await settle()
    expect(router.currentRoute.value.path).toBe('/reusables/4')
  })

  it('loads another reusable when the route moves to it', async () => {
    mounted = await mountAt('/reusables/4')
    const { router } = mounted
    vi.mocked(service.getReusable).mockResolvedValue(success({ ...existing, id: 5, name: 'Other' }))

    await router.push('/reusables/5')
    await settle()

    expect(service.getReusable).toHaveBeenLastCalledWith(5)
    expect(mounted.store.current?.name).toBe('Other')
  })

  it('dates the current version from a date WebAPI sent as text', async () => {
    vi.mocked(service.getReusable).mockResolvedValue(
      success({ ...existing, createdDate: '2026-01-01T00:00:00Z', modifiedDate: undefined })
    )
    mounted = await mountAt('/reusables/4')
    await mounted.wrapper.get('[data-testid="reusable-editor-versions"]').trigger('click')
    await settle()
    expect(query('versions-stub')!.dataset.date).toBe('2026-01-01T00:00:00Z')
  })

  it('does not fetch a version again when its preview is already loaded', async () => {
    vi.mocked(getReusableVersion).mockResolvedValue({
      versionDTO: { version: 2, assetId: 4, createdDate: 1, archived: false },
      entityDTO: { name: 'T2DM logic v2', data: serializeReusableDesign(createEmptyDesign()) },
    })
    mounted = await mountAt('/reusables/4')
    const { router, store } = mounted
    // The version history loads the preview itself before it changes the route.
    await store.loadVersionPreview(4, 2)
    vi.mocked(getReusableVersion).mockClear()

    await router.push('/reusables/4/version/2')
    await settle()

    expect(getReusableVersion).not.toHaveBeenCalled()
    expect(store.previewVersion?.version).toBe(2)
  })
})
