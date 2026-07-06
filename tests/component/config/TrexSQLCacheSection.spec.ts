/**
 * TrexSQLCacheSection notification-branch tests
 *
 * Covers the toast/notification paths that the smoke coverage misses:
 *  - loadDataSources catch → loadError notification
 *  - handleBuildCache success → buildStarted notification (response.message || fallback)
 *  - handleBuildCache error → buildStartError notification
 *  - pollCacheStatus completion → buildComplete (ready) / buildFailed (error) notifications
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'

const listDataSources = vi.fn()
const getCacheStatus = vi.fn()
const buildCache = vi.fn()
const initTrexSQL = vi.fn()
const isTrexSQLEnabled = ref(true)
const isAuthenticated = ref(false)

vi.mock('@/services/datasource.service', () => ({
  listDataSources: (...args: unknown[]) => listDataSources(...args),
}))

vi.mock('@/services/trexsql.service', () => ({
  getCacheStatus: (...args: unknown[]) => getCacheStatus(...args),
  buildCache: (...args: unknown[]) => buildCache(...args),
}))

vi.mock('@/composables/useTrexSQLCache', () => ({
  useTrexSQLCache: () => ({
    isTrexSQLEnabled,
    initialize: initTrexSQL,
  }),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated,
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import TrexSQLCacheSection from '@/components/config/TrexSQLCacheSection.vue'

const vuetify = createVuetify({ components, directives })

function makeStubs() {
  const passthrough = { template: '<div><slot /></div>' }
  return {
    AtlasList: passthrough,
    AtlasListItem: {
      template:
        '<div class="atlas-list-item"><slot name="prepend" /><slot /><slot name="append" /></div>',
    },
    AtlasAvatar: passthrough,
    AtlasIcon: { template: '<i><slot /></i>' },
    AtlasChip: passthrough,
    AtlasProgressCircular: { template: '<div class="progress" />' },
    AtlasButton: {
      name: 'AtlasButton',
      props: ['loading', 'disabled'],
      emits: ['click'],
      template:
        '<button class="build-btn" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    AtlasSnackbar: {
      name: 'AtlasSnackbar',
      props: ['modelValue', 'severity', 'text'],
      template:
        '<div class="snackbar" :data-open="String(modelValue)" :data-severity="severity">{{ text }}</div>',
    },
  }
}

function source(sourceKey = 'CDM', sourceName = 'CDM Source') {
  return { sourceKey, sourceName, daimons: [] }
}

function notBuilt(sourceKey = 'CDM') {
  return {
    sourceKey,
    status: 'not_built',
    totalPatientCount: null,
    lastBuiltAt: null,
    sizeBytes: null,
    errorMessage: null,
  }
}

async function mountSection() {
  setActivePinia(createPinia())
  const wrapper = mount(TrexSQLCacheSection, {
    global: {
      plugins: [vuetify],
      stubs: makeStubs(),
    },
  })
  await flushPromises()
  return wrapper
}

function snackbar(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('.snackbar')
}

describe('TrexSQLCacheSection notifications', () => {
  beforeEach(() => {
    listDataSources.mockReset()
    getCacheStatus.mockReset()
    buildCache.mockReset()
    initTrexSQL.mockReset().mockResolvedValue(undefined)
    isTrexSQLEnabled.value = true
    isAuthenticated.value = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows an error notification when loading data sources fails (244-247)', async () => {
    listDataSources.mockRejectedValueOnce(new Error('network down'))

    const wrapper = await mountSection()

    const bar = snackbar(wrapper)
    expect(bar.attributes('data-open')).toBe('true')
    expect(bar.attributes('data-severity')).toBe('danger')
    expect(bar.text()).toContain('Failed to load data sources')
  })

  it('shows a success notification with the response message when a build starts (279-282)', async () => {
    listDataSources.mockResolvedValue([source()])
    getCacheStatus.mockResolvedValue(notBuilt())
    buildCache.mockResolvedValueOnce({ message: 'Server says building now' })

    const wrapper = await mountSection()
    // Real timers: the setTimeout(poll, 2000) scheduled after the build never
    // fires during the test, so the "started" notification is not overwritten.
    await wrapper.find('.build-btn').trigger('click')
    await flushPromises()

    const bar = snackbar(wrapper)
    expect(bar.attributes('data-open')).toBe('true')
    expect(bar.attributes('data-severity')).toBe('success')
    expect(bar.text()).toContain('Server says building now')
  })

  it('falls back to the default started message when the response has no message', async () => {
    listDataSources.mockResolvedValue([source()])
    getCacheStatus.mockResolvedValue(notBuilt())
    buildCache.mockResolvedValueOnce({})

    const wrapper = await mountSection()
    await wrapper.find('.build-btn').trigger('click')
    await flushPromises()

    expect(snackbar(wrapper).text()).toContain('Cache build started')
  })

  it('shows an error notification when starting a build fails (286-289)', async () => {
    listDataSources.mockResolvedValue([source()])
    getCacheStatus.mockResolvedValue(notBuilt())
    buildCache.mockRejectedValueOnce(new Error('Cache build already in progress'))

    const wrapper = await mountSection()
    await wrapper.find('.build-btn').trigger('click')
    await flushPromises()

    const bar = snackbar(wrapper)
    expect(bar.attributes('data-severity')).toBe('danger')
    expect(bar.text()).toContain('Cache build already in progress')
  })

  it('falls back to the default build-start error for a non-Error rejection', async () => {
    listDataSources.mockResolvedValue([source()])
    getCacheStatus.mockResolvedValue(notBuilt())
    buildCache.mockRejectedValueOnce('boom')

    const wrapper = await mountSection()
    await wrapper.find('.build-btn').trigger('click')
    await flushPromises()

    expect(snackbar(wrapper).text()).toContain('Failed to start cache build')
  })

  it('shows a success notification when polling reports the cache is ready (315-318)', async () => {
    vi.useFakeTimers()
    listDataSources.mockResolvedValue([source()])
    getCacheStatus.mockResolvedValue(notBuilt())
    buildCache.mockResolvedValueOnce({ message: 'building' })

    setActivePinia(createPinia())
    const wrapper = mount(TrexSQLCacheSection, {
      global: { plugins: [vuetify], stubs: makeStubs() },
    })
    await flushPromises()

    // The next getCacheStatus call is the poll — report the build finished.
    getCacheStatus.mockResolvedValueOnce({ ...notBuilt(), status: 'ready' })

    await wrapper.find('.build-btn').trigger('click')
    await flushPromises()
    // pollCacheStatus schedules setTimeout(poll, 2000)
    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()

    const bar = snackbar(wrapper)
    expect(bar.attributes('data-severity')).toBe('success')
    expect(bar.text()).toContain('Cache build completed successfully')
  })

  it('shows an error notification when polling reports a failed build (320-323)', async () => {
    vi.useFakeTimers()
    listDataSources.mockResolvedValue([source()])
    getCacheStatus.mockResolvedValue(notBuilt())
    buildCache.mockResolvedValueOnce({ message: 'building' })

    setActivePinia(createPinia())
    const wrapper = mount(TrexSQLCacheSection, {
      global: { plugins: [vuetify], stubs: makeStubs() },
    })
    await flushPromises()

    getCacheStatus.mockResolvedValueOnce({
      ...notBuilt(),
      status: 'error',
      errorMessage: 'disk exploded',
    })

    await wrapper.find('.build-btn').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()

    const bar = snackbar(wrapper)
    expect(bar.attributes('data-severity')).toBe('danger')
    expect(bar.text()).toContain('disk exploded')
  })

  it('falls back to the default failure message when the failed status has no error text', async () => {
    vi.useFakeTimers()
    listDataSources.mockResolvedValue([source()])
    getCacheStatus.mockResolvedValue(notBuilt())
    buildCache.mockResolvedValueOnce({ message: 'building' })

    setActivePinia(createPinia())
    const wrapper = mount(TrexSQLCacheSection, {
      global: { plugins: [vuetify], stubs: makeStubs() },
    })
    await flushPromises()

    getCacheStatus.mockResolvedValueOnce({
      ...notBuilt(),
      status: 'error',
      errorMessage: null,
    })

    await wrapper.find('.build-btn').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()

    expect(snackbar(wrapper).text()).toContain('Cache build failed')
  })
})
