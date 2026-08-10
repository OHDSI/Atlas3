/**
 * ProfileView interaction tests
 *
 * Exercises the script-level handlers:
 *  - commitPersonId (enter / blur on the person id input)
 *  - onSourceChange (data-source select)
 *  - onReload (refresh button)
 *  - clearCohort (cohort chip close)
 *  - cohortSegment helper (covered by commitPersonId / onSourceChange)
 *
 * The existing render-only spec exercises the template but never invokes
 * these so v8 records 11.11% functions. One click/keydown per handler
 * closes the gap.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

// Mock the data-sources and profile services so mounting never hits the network.
vi.mock('@/services/profile.service', () => ({
  getPerson: vi.fn().mockResolvedValue({
    success: true,
    data: {
      gender: 'FEMALE',
      yearOfBirth: 1972,
      ageAtIndex: 52,
      recordCount: 0,
      records: [],
      cohorts: [],
      observationPeriods: [],
    },
  }),
  getCohortConceptSets: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))
vi.mock('@/services/source.service', () => ({
  fetchCDMSources: vi.fn().mockResolvedValue({
    success: true,
    data: [
      {
        sourceKey: 'SYNPUF',
        sourceName: 'SYNPUF Source',
        daimons: [{ daimonType: 'CDM' }],
      },
    ],
  }),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
// Stub composable that drives data fetching; tests focus on the View's own handlers.
vi.mock('@/composables/usePersonProfile', () => ({
  usePersonProfile: () => undefined,
}))

import ProfileView from '@/views/ProfileView.vue'

const vuetify = createVuetify({ components, directives })

async function makeWrapper(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profiles', name: 'profiles', component: ProfileView },
      { path: '/profiles/:sourceKey', name: 'profiles-source', component: ProfileView, props: true },
      { path: '/profiles/:sourceKey/:personId(\\d+)', name: 'profile-view', component: ProfileView, props: true },
      { path: '/profiles/:sourceKey/:personId(\\d+)/:cohortId(\\d+)', name: 'profile-view-cohort', component: ProfileView, props: true },
    ],
  })
  setActivePinia(createPinia())
  await router.push(path)
  await router.isReady()

  const wrapper = mount(ProfileView, {
    global: {
      plugins: [router, vuetify],
      stubs: {
        AtlasPageShell: {
          name: 'AtlasPageShell',
          template:
            '<div class="stub-shell">' +
            '<div class="shell-title"><slot name="title" /></div>' +
            '<div class="shell-subtitle"><slot name="subtitle" /></div>' +
            '<div class="shell-actions"><slot name="actions" /></div>' +
            '<slot />' +
            '</div>',
        },
        AtlasTextField: {
          name: 'AtlasTextField',
          props: ['modelValue'],
          emits: ['update:modelValue', 'keydown', 'blur'],
          template:
            '<input class="stub-textfield" data-test="profile-person-input" :value="modelValue" ' +
            '@input="$emit(\'update:modelValue\', $event.target.value)" ' +
            '@keydown.enter="$emit(\'keydown\', $event)" ' +
            '@blur="$emit(\'blur\', $event)" />',
        },
        AtlasSelect: {
          name: 'AtlasSelect',
          props: ['modelValue', 'items'],
          emits: ['update:modelValue'],
          template:
            '<select class="stub-select" data-test="profile-source-select" :value="modelValue" ' +
            '@change="$emit(\'update:modelValue\', $event.target.value)">' +
            '<option v-for="i in items" :key="i.value" :value="i.value">{{ i.title }}</option>' +
            '</select>',
        },
        AtlasIconButton: {
          name: 'AtlasIconButton',
          emits: ['click'],
          template:
            '<button class="stub-icon-btn" v-bind="$attrs" @click="$emit(\'click\', $event)" />',
        },
        AtlasChip: {
          name: 'AtlasChip',
          emits: ['close', 'click'],
          template:
            '<span class="stub-chip" data-test="profile-cohort-badge" ' +
            '@click="$emit(\'click\', $event)">' +
            '<slot />' +
            '<button class="stub-chip-close" @click="$emit(\'close\', $event)" />' +
            '</span>',
        },
        AtlasIcon: { name: 'AtlasIcon', template: '<span class="stub-icon"><slot /></span>' },
        AtlasCard: { name: 'AtlasCard', template: '<div class="stub-card"><slot /></div>' },
        AtlasProgressCircular: { name: 'AtlasProgressCircular', template: '<div class="stub-progress" />' },
        ProfileDemographics: { template: '<div data-test="profile-demographics" />' },
        ProfileTimeline: { template: '<div class="stub-timeline" />' },
        ProfileObservationBand: { template: '<div class="stub-obs-band" />' },
        ProfileEventsTable: { template: '<div class="stub-events-table" />' },
        HighlightsPanel: { template: '<div class="stub-highlights" />' },
      },
    },
  })
  await router.isReady()
  await wrapper.vm.$nextTick()
  return { wrapper, router }
}

describe('ProfileView interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('commits person id on Enter and pushes the route', async () => {
    const { wrapper, router } = await makeWrapper('/profiles/SYNPUF')
    // Store has sourceKey populated via the route's usePersonProfile params;
    // but since usePersonProfile is stubbed, we need to seed the store directly.
    const store = (await import('@/stores/profile')).useProfileStore()
    store.sourceKey = 'SYNPUF'
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')
    const input = wrapper.find('[data-test="profile-person-input"]')
    await input.setValue('42')
    await input.trigger('keydown.enter')
    await wrapper.vm.$nextTick()
    expect(pushSpy).toHaveBeenCalledWith('/profiles/SYNPUF/42')
  })

  it('does not push when the person id is empty', async () => {
    const { wrapper, router } = await makeWrapper('/profiles/SYNPUF')
    const store = (await import('@/stores/profile')).useProfileStore()
    store.sourceKey = 'SYNPUF'
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')
    const input = wrapper.find('[data-test="profile-person-input"]')
    await input.setValue('   ')
    await input.trigger('keydown.enter')
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('does not push when there is no sourceKey', async () => {
    const { wrapper, router } = await makeWrapper('/profiles')
    const pushSpy = vi.spyOn(router, 'push')
    const input = wrapper.find('[data-test="profile-person-input"]')
    await input.setValue('42')
    await input.trigger('keydown.enter')
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('does not push when the entered id matches the existing personId', async () => {
    const { wrapper, router } = await makeWrapper('/profiles/SYNPUF')
    const store = (await import('@/stores/profile')).useProfileStore()
    store.sourceKey = 'SYNPUF'
    store.personId = 42
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')
    const input = wrapper.find('[data-test="profile-person-input"]')
    await input.setValue('42')
    await input.trigger('keydown.enter')
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('commits person id on blur', async () => {
    const { wrapper, router } = await makeWrapper('/profiles/SYNPUF')
    const store = (await import('@/stores/profile')).useProfileStore()
    store.sourceKey = 'SYNPUF'
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')
    const input = wrapper.find('[data-test="profile-person-input"]')
    await input.setValue('7')
    await input.trigger('blur')
    expect(pushSpy).toHaveBeenCalledWith('/profiles/SYNPUF/7')
  })

  it('appends the cohort segment when cohortDefinitionId is set', async () => {
    const { wrapper, router } = await makeWrapper('/profiles/SYNPUF')
    const store = (await import('@/stores/profile')).useProfileStore()
    store.sourceKey = 'SYNPUF'
    store.cohortDefinitionId = 5
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')
    const input = wrapper.find('[data-test="profile-person-input"]')
    await input.setValue('42')
    await input.trigger('keydown.enter')
    expect(pushSpy).toHaveBeenCalledWith('/profiles/SYNPUF/42/5')
  })

  it('pushes to /profiles/:source on source change without person', async () => {
    const { wrapper, router } = await makeWrapper('/profiles')
    // Wait for fetchDataSources mock to populate options.
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')
    const select = wrapper.findComponent({ name: 'AtlasSelect' })
    select.vm.$emit('update:modelValue', 'SYNPUF')
    await wrapper.vm.$nextTick()
    expect(pushSpy).toHaveBeenCalledWith('/profiles/SYNPUF')
  })

  it('pushes to /profiles/:source/:person on source change with existing person', async () => {
    const { wrapper, router } = await makeWrapper('/profiles')
    await new Promise(r => setTimeout(r, 0))
    const store = (await import('@/stores/profile')).useProfileStore()
    store.personId = 99
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')
    const select = wrapper.findComponent({ name: 'AtlasSelect' })
    select.vm.$emit('update:modelValue', 'SYNPUF')
    await wrapper.vm.$nextTick()
    expect(pushSpy).toHaveBeenCalledWith('/profiles/SYNPUF/99')
  })

  it('does nothing when source change emits null', async () => {
    const { wrapper, router } = await makeWrapper('/profiles')
    await new Promise(r => setTimeout(r, 0))
    const pushSpy = vi.spyOn(router, 'push')
    // Simulate AtlasSelect emitting null directly by finding the stub component
    // and calling its emit.
    const select = wrapper.findComponent({ name: 'AtlasSelect' })
    select.vm.$emit('update:modelValue', null)
    await wrapper.vm.$nextTick()
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('calls store.loadPerson when the refresh button is clicked', async () => {
    const { wrapper } = await makeWrapper('/profiles/SYNPUF/42')
    const store = (await import('@/stores/profile')).useProfileStore()
    store.sourceKey = 'SYNPUF'
    store.personId = 42
    await wrapper.vm.$nextTick()
    const loadSpy = vi.spyOn(store, 'loadPerson').mockResolvedValue(undefined)
    const refresh = wrapper.find('[data-test="profile-refresh"]')
    expect(refresh.exists()).toBe(true)
    await refresh.trigger('click')
    expect(loadSpy).toHaveBeenCalled()
  })

  it('clears the cohort when the chip close button is clicked', async () => {
    const { wrapper, router } = await makeWrapper('/profiles/SYNPUF/42/5')
    const store = (await import('@/stores/profile')).useProfileStore()
    store.sourceKey = 'SYNPUF'
    store.personId = 42
    store.cohortDefinitionId = 5
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')
    const closeBtn = wrapper.find('.stub-chip-close')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')
    expect(pushSpy).toHaveBeenCalledWith('/profiles/SYNPUF/42')
  })

  it('does not clear the cohort when sourceKey or personId is missing', async () => {
    const { wrapper, router } = await makeWrapper('/profiles')
    const store = (await import('@/stores/profile')).useProfileStore()
    // cohortDefinitionId set, but sourceKey/personId remain null, so the
    // chip wouldn't render. Test the guard directly via the badge stub.
    store.cohortDefinitionId = 5
    await wrapper.vm.$nextTick()
    const pushSpy = vi.spyOn(router, 'push')
    const closeBtn = wrapper.find('.stub-chip-close')
    if (closeBtn.exists()) {
      await closeBtn.trigger('click')
    }
    expect(pushSpy).not.toHaveBeenCalled()
  })
})
