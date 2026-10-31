import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'

const listDataSources = vi.fn()
const getCacheStatus = vi.fn()
const buildCache = vi.fn()
const listCacheFiles = vi.fn()
const deleteCacheFile = vi.fn()
const initTrexSQL = vi.fn()
const isTrexSQLEnabled = ref(true)
const isAuthenticated = ref(false)

vi.mock('@/services/datasource.service', () => ({
  listDataSources: (...args: unknown[]) => listDataSources(...args),
}))

vi.mock('@/services/trexsql.service', () => ({
  getCacheStatus: (...args: unknown[]) => getCacheStatus(...args),
  buildCache: (...args: unknown[]) => buildCache(...args),
  listCacheFiles: (...args: unknown[]) => listCacheFiles(...args),
  deleteCacheFile: (...args: unknown[]) => deleteCacheFile(...args),
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

const stubs = {
  AtlasList: { template: '<div><slot /></div>' },
  AtlasListItem: {
    template:
      '<div class="atlas-list-item"><slot name="prepend" /><slot /><slot name="append" /></div>',
  },
  AtlasAvatar: {
    props: ['color'],
    template: '<div class="avatar" :data-color="color"><slot /></div>',
  },
  AtlasIcon: { template: '<i class="icon"><slot /></i>' },
  AtlasChip: {
    props: ['color'],
    template: '<span class="chip" :data-color="color"><slot /></span>',
  },
  AtlasProgressCircular: { template: '<div class="progress" />' },
  AtlasButton: {
    props: ['loading', 'disabled'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" :data-loading="String(!!loading)" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  AtlasDialog: {
    props: ['modelValue', 'title', 'maxWidth'],
    template: '<div class="dialog" v-if="modelValue"><slot /><slot name="actions" /></div>',
  },
  AtlasSnackbar: {
    props: ['modelValue', 'severity', 'text'],
    template:
      '<div class="snackbar" :data-open="String(modelValue)" :data-severity="severity">{{ text }}</div>',
  },
}

interface DaimonLike {
  daimonType: string
  tableQualifier: string
}

function source(sourceKey: string, sourceName: string, daimons: DaimonLike[] = []) {
  return { sourceKey, sourceName, daimons }
}

function status(sourceKey: string, over: Record<string, unknown> = {}) {
  return {
    sourceKey,
    status: 'not_built',
    totalPatientCount: null,
    lastBuiltAt: null,
    sizeBytes: null,
    errorMessage: null,
    ...over,
  }
}

function file(databaseCode: string, over: Record<string, unknown> = {}) {
  return {
    fileName: `${databaseCode}.db`,
    databaseCode,
    sizeBytes: 1024,
    lastModified: null,
    attached: false,
    orphaned: true,
    protected: false,
    ...over,
  }
}

function statusesByKey(map: Record<string, ReturnType<typeof status>>) {
  getCacheStatus.mockImplementation(async (key: string) => {
    const s = map[key]
    if (!s) throw new Error(`no status for ${key}`)
    return s
  })
}

const mounted: VueWrapper[] = []

function mountRaw() {
  setActivePinia(createPinia())
  const wrapper = mount(TrexSQLCacheSection, { global: { plugins: [vuetify], stubs } })
  mounted.push(wrapper)
  return wrapper
}

async function mountSection() {
  const wrapper = mountRaw()
  await flushPromises()
  return wrapper
}

function row(wrapper: VueWrapper, code: string) {
  return wrapper.get(`[data-testid="cache-row-${code}"]`)
}

function statusOf(wrapper: VueWrapper, code: string) {
  const r = row(wrapper, code)
  return {
    avatarColor: r.get('.avatar').attributes('data-color'),
    icon: r.get('.icon').text(),
    label: r.findAll('.chip')[0]!.text(),
    chipColor: r.findAll('.chip')[0]!.attributes('data-color'),
  }
}

function rowCodes(wrapper: VueWrapper) {
  return wrapper
    .findAll('[data-testid^="cache-row-"]')
    .map(r => r.attributes('data-testid'))
    .filter(id => id !== 'cache-row-orphan')
}

function snackbar(wrapper: VueWrapper) {
  return wrapper.get('.snackbar')
}

beforeEach(() => {
  listDataSources.mockReset().mockResolvedValue([])
  getCacheStatus.mockReset()
  buildCache.mockReset().mockResolvedValue({ message: 'started' })
  listCacheFiles.mockReset().mockResolvedValue([])
  deleteCacheFile.mockReset().mockResolvedValue(undefined)
  initTrexSQL.mockReset().mockResolvedValue(undefined)
  isTrexSQLEnabled.value = true
  isAuthenticated.value = false
})

afterEach(() => {
  mounted.splice(0).forEach(w => w.unmount())
  vi.useRealTimers()
})

describe('TrexSQLCacheSection loading', () => {
  it('shows the empty list, not a spinner, before the cache layer is initialised', async () => {
    initTrexSQL.mockReturnValue(new Promise(() => {}))
    const wrapper = mountRaw()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Loading')
    expect(wrapper.text()).toContain('No data sources available')
    expect(wrapper.findAll('.atlas-list-item')).toHaveLength(1)
  })

  it('shows a spinner while data sources load', async () => {
    listDataSources.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountSection()

    expect(wrapper.text()).toContain('Loading')
    expect(wrapper.text()).not.toContain('No data sources available')
  })

  it('does not load anything when TrexSQL is disabled', async () => {
    isTrexSQLEnabled.value = false
    const wrapper = await mountSection()

    expect(listDataSources).not.toHaveBeenCalled()
    expect(wrapper.find('.trexsql-cache-section').exists()).toBe(false)
  })

  it('starts with a closed, empty, success-severity toast after a clean load', async () => {
    const wrapper = await mountSection()

    expect(snackbar(wrapper).attributes('data-open')).toBe('false')
    expect(snackbar(wrapper).attributes('data-severity')).toBe('success')
    expect(snackbar(wrapper).text()).toBe('')
  })

  it('reloads when the user logs in but not when they log out', async () => {
    await mountSection()
    expect(initTrexSQL).toHaveBeenCalledTimes(1)
    expect(listDataSources).toHaveBeenCalledTimes(1)

    isAuthenticated.value = true
    await flushPromises()
    expect(initTrexSQL).toHaveBeenCalledTimes(2)
    expect(listDataSources).toHaveBeenCalledTimes(2)

    isAuthenticated.value = false
    await flushPromises()
    expect(initTrexSQL).toHaveBeenCalledTimes(2)
    expect(listDataSources).toHaveBeenCalledTimes(2)
  })
})

describe('TrexSQLCacheSection row list', () => {
  it('lists source-backed rows first, then orphans, each alphabetically by title', async () => {
    listDataSources.mockResolvedValue([source('Z', 'Zeta'), source('A', 'Alpha')])
    statusesByKey({ Z: status('Z'), A: status('A') })
    listCacheFiles.mockResolvedValue([file('YY'), file('BB')])

    const wrapper = await mountSection()

    expect(rowCodes(wrapper)).toEqual([
      'cache-row-A',
      'cache-row-Z',
      'cache-row-BB',
      'cache-row-YY',
    ])
    expect(wrapper.text()).not.toContain('No data sources available')
  })

  it('matches cache files to sources case-insensitively and does not repeat them as orphans', async () => {
    listDataSources.mockResolvedValue([source('MySrc', 'My Source')])
    statusesByKey({ MySrc: status('MySrc') })
    listCacheFiles.mockResolvedValue([file('mysrc', { sizeBytes: 1536 })])

    const wrapper = await mountSection()

    expect(rowCodes(wrapper)).toEqual(['cache-row-mysrc'])
    expect(wrapper.find('[data-testid="cache-row-orphan"]').exists()).toBe(false)
    expect(row(wrapper, 'mysrc').text()).toContain('My Source')
    expect(row(wrapper, 'mysrc').text()).toContain('1.5 KB')
    expect(wrapper.find('[data-testid="cache-update-mysrc"]').exists()).toBe(true)
  })

  it('marks unmatched cache files as orphans titled by their database code', async () => {
    listCacheFiles.mockResolvedValue([file('GONE')])

    const wrapper = await mountSection()

    expect(row(wrapper, 'GONE').text()).toContain('GONE')
    expect(row(wrapper, 'GONE').find('[data-testid="cache-row-orphan"]').text()).toBe('No dataset')
  })

  it('still lists a source whose status lookup fails, as not built', async () => {
    listDataSources.mockResolvedValue([source('A', 'Alpha'), source('B', 'Beta')])
    statusesByKey({ B: status('B', { status: 'stale' }) })

    const wrapper = await mountSection()

    expect(statusOf(wrapper, 'A').label).toBe('Not Built')
    expect(statusOf(wrapper, 'B').label).toBe('Stale')
  })
})

describe('TrexSQLCacheSection status presentation', () => {
  it.each([
    ['ready', 'success', 'mdi-check-circle', 'Ready', 'Update'],
    ['stale', 'warning', 'mdi-clock-alert', 'Stale', 'Update'],
    ['error', 'error', 'mdi-alert-circle', 'Error', 'Build Cache'],
    ['not_built', 'grey', 'mdi-database-off', 'Not Built', 'Build Cache'],
  ])('renders a %s source cache', async (st, color, icon, label, button) => {
    listDataSources.mockResolvedValue([source('S', 'Src')])
    statusesByKey({ S: status('S', { status: st }) })

    const wrapper = await mountSection()

    expect(statusOf(wrapper, 'S')).toEqual({ avatarColor: color, icon, label, chipColor: color })
    expect(wrapper.get('[data-testid="cache-update-S"]').text()).toBe(button)
  })

  it('renders a building source cache with a progress note instead of buttons', async () => {
    listDataSources.mockResolvedValue([source('S', 'Src')])
    statusesByKey({ S: status('S', { status: 'building' }) })

    const wrapper = await mountSection()

    expect(statusOf(wrapper, 'S')).toEqual({
      avatarColor: 'info',
      icon: 'mdi-cog',
      label: 'Building',
      chipColor: 'info',
    })
    expect(row(wrapper, 'S').text()).toContain('Building...')
    expect(wrapper.find('[data-testid="cache-update-S"]').exists()).toBe(false)
  })

  it('treats a cache file without a status as ready, in warning colour when orphaned', async () => {
    listCacheFiles.mockResolvedValue([file('GONE')])

    const wrapper = await mountSection()

    expect(statusOf(wrapper, 'GONE')).toEqual({
      avatarColor: 'warning',
      icon: 'mdi-check-circle',
      label: 'Ready',
      chipColor: 'warning',
    })
  })

  it('treats a source with neither status nor file as not built', async () => {
    listDataSources.mockResolvedValue([source('S', 'Src')])

    const wrapper = await mountSection()

    expect(statusOf(wrapper, 'S')).toEqual({
      avatarColor: 'grey',
      icon: 'mdi-database-off',
      label: 'Not Built',
      chipColor: 'grey',
    })
    expect(wrapper.get('[data-testid="cache-update-S"]').text()).toBe('Build Cache')
  })

  it('shows the patient count, size and build date of a ready cache', async () => {
    const builtAt = '2026-03-04T10:20:00Z'
    listDataSources.mockResolvedValue([source('S', 'Src')])
    statusesByKey({
      S: status('S', {
        status: 'ready',
        totalPatientCount: 1234567,
        sizeBytes: 2048,
        lastBuiltAt: builtAt,
      }),
    })
    listCacheFiles.mockResolvedValue([file('S', { sizeBytes: 1024 })])

    const wrapper = await mountSection()
    const text = row(wrapper, 'S').text()
    const expectedDate = new Date(builtAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    expect(text).toContain(`${(1234567).toLocaleString()} patients`)
    expect(text).toContain('2.0 KB')
    expect(text).not.toContain('1.0 KB')
    expect(text).toContain(`Built: ${expectedDate}`)
  })

  it('shows the error message of a failed build', async () => {
    listDataSources.mockResolvedValue([source('S', 'Src')])
    statusesByKey({ S: status('S', { status: 'error', errorMessage: 'out of disk' }) })

    const wrapper = await mountSection()

    expect(row(wrapper, 'S').text()).toContain('out of disk')
  })

  it.each([
    [512, '512.0 B'],
    [1536, '1.5 KB'],
    [5 * 1024 * 1024, '5.0 MB'],
    [3 * 1024 ** 3, '3.0 GB'],
    [2 * 1024 ** 4, '2.0 TB'],
  ])('formats a %d byte cache file as %s', async (bytes, expected) => {
    listCacheFiles.mockResolvedValue([file('F', { sizeBytes: bytes })])

    const wrapper = await mountSection()

    expect(row(wrapper, 'F').text()).toContain(expected)
  })
})

describe('TrexSQLCacheSection building', () => {
  const daimons = [
    { daimonType: 'Results', tableQualifier: 'results_schema' },
    { daimonType: 'CDM', tableQualifier: 'cdm_schema' },
  ]

  it('builds with the CDM daimon schema of the source', async () => {
    listDataSources.mockResolvedValue([source('S', 'Src', daimons)])
    statusesByKey({ S: status('S') })

    const wrapper = await mountSection()
    await wrapper.get('[data-testid="cache-update-S"]').trigger('click')
    await flushPromises()

    expect(buildCache).toHaveBeenCalledWith('S', 'cdm_schema')
  })

  it('builds without a schema when the source has no CDM daimon', async () => {
    listDataSources.mockResolvedValue([
      source('S', 'Src', [{ daimonType: 'Results', tableQualifier: 'results_schema' }]),
    ])
    statusesByKey({ S: status('S') })

    const wrapper = await mountSection()
    await wrapper.get('[data-testid="cache-update-S"]').trigger('click')
    await flushPromises()

    expect(buildCache).toHaveBeenCalledWith('S', undefined)
  })

  it('marks only the built row as building, keeps its size and date, and disables other builds', async () => {
    const builtAt = '2026-03-04T10:20:00Z'
    listDataSources.mockResolvedValue([source('A', 'Alpha'), source('B', 'Beta')])
    statusesByKey({
      A: status('A', { status: 'ready' }),
      B: status('B', { status: 'ready', sizeBytes: 3072, lastBuiltAt: builtAt }),
    })

    const wrapper = await mountSection()
    await wrapper.get('[data-testid="cache-update-B"]').trigger('click')
    await flushPromises()

    expect(statusOf(wrapper, 'B').label).toBe('Building')
    expect(row(wrapper, 'B').text()).toContain('Building...')
    expect(row(wrapper, 'B').text()).toContain('3.0 KB')
    expect(row(wrapper, 'B').text()).toContain('Built:')
    expect(statusOf(wrapper, 'A').label).toBe('Ready')
    expect(wrapper.get('[data-testid="cache-update-A"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="cache-delete-A"]').attributes('disabled')).toBeDefined()
  })

  it('marks a row without a prior status as building', async () => {
    listDataSources.mockResolvedValue([source('S', 'Src')])

    const wrapper = await mountSection()
    await wrapper.get('[data-testid="cache-update-S"]').trigger('click')
    await flushPromises()

    expect(statusOf(wrapper, 'S').label).toBe('Building')
    expect(snackbar(wrapper).attributes('data-severity')).toBe('success')
  })

  it('applies the polled status to the built row and re-enables building', async () => {
    vi.useFakeTimers()
    listDataSources.mockResolvedValue([source('A', 'Alpha'), source('B', 'Beta')])
    statusesByKey({ A: status('A'), B: status('B') })

    const wrapper = await mountSection()
    await wrapper.get('[data-testid="cache-update-B"]').trigger('click')
    await flushPromises()

    getCacheStatus.mockResolvedValueOnce(status('B', { status: 'ready', totalPatientCount: 500 }))
    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()

    expect(statusOf(wrapper, 'B').label).toBe('Ready')
    expect(row(wrapper, 'B').text()).toContain('500 patients')
    expect(statusOf(wrapper, 'A').label).toBe('Not Built')
    expect(wrapper.get('[data-testid="cache-update-A"]').attributes('disabled')).toBeUndefined()
  })

  it('keeps polling every 5 seconds while the build is running', async () => {
    vi.useFakeTimers()
    listDataSources.mockResolvedValue([source('S', 'Src')])
    statusesByKey({ S: status('S') })

    const wrapper = await mountSection()
    await wrapper.get('[data-testid="cache-update-S"]').trigger('click')
    await flushPromises()
    getCacheStatus.mockReset()
    getCacheStatus
      .mockResolvedValueOnce(status('S', { status: 'building' }))
      .mockResolvedValueOnce(status('S', { status: 'ready' }))

    await vi.advanceTimersByTimeAsync(2000)
    expect(getCacheStatus).toHaveBeenCalledTimes(1)
    expect(statusOf(wrapper, 'S').label).toBe('Building')

    await vi.advanceTimersByTimeAsync(4999)
    expect(getCacheStatus).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(getCacheStatus).toHaveBeenCalledTimes(2)
    expect(statusOf(wrapper, 'S').label).toBe('Ready')
    expect(snackbar(wrapper).text()).toBe('Cache build completed successfully')
  })

  it('stops polling after 121 status checks', async () => {
    vi.useFakeTimers()
    listDataSources.mockResolvedValue([source('S', 'Src')])
    statusesByKey({ S: status('S') })

    const wrapper = await mountSection()
    await wrapper.get('[data-testid="cache-update-S"]').trigger('click')
    await flushPromises()
    getCacheStatus.mockReset().mockResolvedValue(status('S', { status: 'building' }))

    await vi.advanceTimersByTimeAsync(2000 + 5000 * 130)

    expect(getCacheStatus).toHaveBeenCalledTimes(121)
  })

  it('does not report a failure when polling ends in a non-error state', async () => {
    vi.useFakeTimers()
    listDataSources.mockResolvedValue([source('S', 'Src')])
    statusesByKey({ S: status('S') })

    const wrapper = await mountSection()
    await wrapper.get('[data-testid="cache-update-S"]').trigger('click')
    await flushPromises()
    getCacheStatus.mockResolvedValueOnce(status('S', { status: 'stale' }))
    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()

    expect(snackbar(wrapper).attributes('data-severity')).toBe('success')
    expect(snackbar(wrapper).text()).toBe('started')
  })

  it('re-enables building after a polling error', async () => {
    vi.useFakeTimers()
    listDataSources.mockResolvedValue([source('A', 'Alpha'), source('B', 'Beta')])
    statusesByKey({ A: status('A'), B: status('B') })

    const wrapper = await mountSection()
    await wrapper.get('[data-testid="cache-update-B"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="cache-update-A"]').attributes('disabled')).toBeDefined()

    getCacheStatus.mockRejectedValueOnce(new Error('poll failed'))
    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()

    expect(wrapper.get('[data-testid="cache-update-A"]').attributes('disabled')).toBeUndefined()
  })
})

describe('TrexSQLCacheSection deleting', () => {
  it('confirms a deleted cache and re-enables delete buttons', async () => {
    listCacheFiles.mockResolvedValue([file('GONE'), file('OTHER')])

    const wrapper = await mountSection()
    await wrapper.get('[data-testid="cache-delete-GONE"]').trigger('click')
    await wrapper.get('[data-testid="cache-delete-confirm"]').trigger('click')
    await flushPromises()

    expect(snackbar(wrapper).text()).toBe('Cache deleted')
    expect(wrapper.get('[data-testid="cache-delete-OTHER"]').attributes('disabled')).toBeUndefined()
  })

  it('falls back to the default message for a non-Error delete failure', async () => {
    listCacheFiles.mockResolvedValue([file('GONE'), file('OTHER')])
    deleteCacheFile.mockRejectedValueOnce('nope')

    const wrapper = await mountSection()
    await wrapper.get('[data-testid="cache-delete-GONE"]').trigger('click')
    await wrapper.get('[data-testid="cache-delete-confirm"]').trigger('click')
    await flushPromises()

    expect(snackbar(wrapper).attributes('data-severity')).toBe('danger')
    expect(snackbar(wrapper).text()).toBe('Failed to delete cache')
    expect(wrapper.get('[data-testid="cache-delete-OTHER"]').attributes('disabled')).toBeUndefined()
  })

  it('warns that a source-backed cache must be rebuilt', async () => {
    listDataSources.mockResolvedValue([source('S', 'Src')])
    statusesByKey({ S: status('S', { status: 'ready' }) })

    const wrapper = await mountSection()
    await wrapper.get('[data-testid="cache-delete-S"]').trigger('click')

    expect(wrapper.get('.dialog').text()).toContain('still registered')
  })
})
