import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ProfileInputBar from '@/components/profile/ProfileInputBar.vue'
import { useDataSourcesStore } from '@/stores/datasources'
import { useProfileStore } from '@/stores/profile'

const vuetify = createVuetify({ components, directives })

async function setup(initialPath = '/profiles') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profiles', name: 'profiles', component: { template: '<div/>' } },
      { path: '/profiles/:sourceKey', name: 'profiles-source', component: { template: '<div/>' } },
      { path: '/profiles/:sourceKey/:personId(\\d+)', name: 'profile-view', component: { template: '<div/>' } },
    ],
  })
  setActivePinia(createPinia())
  await router.push(initialPath)
  await router.isReady()
  const ds = useDataSourcesStore()
  ds.sources = [
    { sourceId: 1, sourceKey: 'SYNPUF', sourceName: 'SYNPUF', sourceDialect: 'postgres', daimons: [{ daimonType: 'CDM', priority: 1 }] },
  ] as never
  return { wrapper: mount(ProfileInputBar, { global: { plugins: [router, vuetify] } }), router }
}

describe('ProfileInputBar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders source select and person input', async () => {
    const { wrapper } = await setup()
    expect(wrapper.find('[data-test="profile-source-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="profile-person-input"]').exists()).toBe(true)
  })

  it('navigates to /profiles/{source}/{personId} on submit', async () => {
    const { wrapper, router } = await setup('/profiles/SYNPUF')
    const store = useProfileStore()
    store.setRouteParams({ sourceKey: 'SYNPUF', personId: null })
    await flushPromises()
    const input = wrapper.find('[data-test="profile-person-input"] input')
    await input.setValue('1234')
    await wrapper.find('[data-test="profile-person-form"]').trigger('submit.prevent')
    await flushPromises()
    await new Promise(r => setTimeout(r, 0))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/profiles/SYNPUF/1234')
  })
})
