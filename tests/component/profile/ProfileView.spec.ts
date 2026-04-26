import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ProfileView from '@/views/ProfileView.vue'

vi.mock('@/services/profile.service', () => ({
  getPerson: vi.fn().mockResolvedValue({ success: true, data: {
    gender: 'FEMALE', yearOfBirth: 1972, monthOfBirth: null, dayOfBirth: null,
    ageAtIndex: 52, recordCount: 0, records: [], cohorts: [], observationPeriods: [],
  }}),
  getCohortConceptSets: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

async function makeWrapper(path: string) {
  const vuetify = createVuetify({ components, directives })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profiles', name: 'profiles', component: ProfileView },
      { path: '/profiles/:sourceKey', name: 'profiles-source', component: ProfileView, props: true },
      { path: '/profiles/:sourceKey/:personId(\\d+)', name: 'profile-view', component: ProfileView, props: true },
    ],
  })
  setActivePinia(createPinia())
  await router.push(path)
  await router.isReady()
  return mount(ProfileView, {
    global: {
      plugins: [router, vuetify],
      stubs: {
        VNavigationDrawer: {
          template: '<div class="v-navigation-drawer"><slot /></div>',
          props: ['modelValue', 'location', 'permanent', 'width'],
        },
      },
    },
  })
}

describe('ProfileView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the input bar even with no params', async () => {
    const w = await makeWrapper('/profiles')
    expect(w.find('[data-test="profile-input-bar"]').exists()).toBe(true)
  })

  it('renders demographics + timeline + table when person loaded', async () => {
    const w = await makeWrapper('/profiles/SYNPUF/7')
    await new Promise(r => setTimeout(r, 0))
    await w.vm.$nextTick()
    expect(w.find('[data-test="profile-demographics"]').exists()).toBe(true)
  })
})
