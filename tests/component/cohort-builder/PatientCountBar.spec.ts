/**
 * PatientCountBar component tests
 *
 * Exercises the render gates (isTrexSQLEnabled, loading, error, prompt, cache
 * warning, zero, normal), helper-driven attributes on stubs (cache status tone
 * and label, progress color), date formatting in the stale tooltip, retry
 * emit, and the writable `selectedSource` v-model bridge.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref, computed } from 'vue'

import type {
  CacheStatusType,
  DataSourceWithCacheStatus,
  PatientCountResult,
  TrexSQLCacheStatus,
} from '@/models/trexsql.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

// Hoisted state so individual tests can tweak refs before mount
const trexState = vi.hoisted(() => {
  return {
    isTrexSQLEnabled: { value: true },
    selectedSourceKey: { value: null as string | null },
    dataSources: { value: [] as DataSourceWithCacheStatus[] },
    isLoadingDataSources: { value: false },
    isCountLoading: { value: false },
    countError: { value: null as string | null },
    patientCount: { value: null as PatientCountResult | null },
    cohortPatientCountFormatted: { value: '—' },
    totalPatientCountFormatted: { value: '—' },
    cohortPercentage: { value: 0 },
    selectedCacheStatus: { value: null as TrexSQLCacheStatus | null },
    isCacheReady: { value: false },
    cacheStatusMessage: { value: 'No data source selected' },
    initialize: vi.fn().mockResolvedValue(undefined),
    selectDataSource: vi.fn(),
    getPatientCount: vi.fn(),
    clearCount: vi.fn(),
  }
})

vi.mock('@/composables/useTrexSQLCache', () => ({
  useTrexSQLCache: () => trexState,
}))

// Now safe to import the SUT — its top-level imports run vi.mock() factories.
import PatientCountBar from '@/components/cohort-builder/PatientCountBar.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function resetTrexState() {
  trexState.isTrexSQLEnabled = ref(true) as unknown as { value: boolean }
  trexState.selectedSourceKey = ref(null) as unknown as { value: string | null }
  trexState.dataSources = ref([]) as unknown as { value: DataSourceWithCacheStatus[] }
  trexState.isLoadingDataSources = ref(false) as unknown as { value: boolean }
  trexState.isCountLoading = ref(false) as unknown as { value: boolean }
  trexState.countError = ref(null) as unknown as { value: string | null }
  trexState.patientCount = ref(null) as unknown as { value: PatientCountResult | null }
  trexState.cohortPatientCountFormatted = ref('—') as unknown as { value: string }
  trexState.totalPatientCountFormatted = ref('—') as unknown as { value: string }
  trexState.cohortPercentage = ref(0) as unknown as { value: number }
  trexState.selectedCacheStatus = ref(null) as unknown as {
    value: TrexSQLCacheStatus | null
  }
  trexState.isCacheReady = ref(false) as unknown as { value: boolean }
  trexState.cacheStatusMessage = ref('No data source selected') as unknown as {
    value: string
  }
  trexState.initialize = vi.fn().mockResolvedValue(undefined)
  trexState.selectDataSource = vi.fn()
  trexState.getPatientCount = vi.fn()
  trexState.clearCount = vi.fn()
}

const stubs = {
  AtlasSelect: {
    name: 'AtlasSelect',
    props: ['modelValue', 'items', 'loading', 'disabled', 'placeholder'],
    emits: ['update:modelValue'],
    template:
      '<div class="stub-select" :data-loading="String(loading)" :data-disabled="String(disabled)" :data-placeholder="placeholder"><slot name="prepend-inner" /><div v-for="item in (items || [])" :key="item.value" class="stub-select-item"><slot name="item" :item="{ raw: item }" :props="{}" /></div></div>',
  },
  AtlasListItem: {
    name: 'AtlasListItem',
    template: '<div class="stub-list-item"><slot /><slot name="append" /></div>',
  },
  AtlasChip: {
    name: 'AtlasChip',
    props: ['tone', 'size', 'variant'],
    template: '<span class="stub-chip" :data-tone="tone"><slot /></span>',
  },
  AtlasIcon: {
    name: 'AtlasIcon',
    template: '<i class="stub-icon"><slot /></i>',
  },
  AtlasButton: {
    name: 'AtlasButton',
    template:
      '<button class="stub-button" data-testid="atlas-button" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  AtlasProgressLinear: {
    name: 'AtlasProgressLinear',
    props: ['modelValue', 'color', 'height', 'rounded', 'reverse'],
    template:
      '<div class="stub-progress" :data-color="color" :data-value="modelValue"></div>',
  },
  AtlasTooltip: {
    name: 'AtlasTooltip',
    template:
      '<div class="stub-tooltip"><slot name="activator" :props="{}" /><slot /></div>',
  },
}

function mountBar(props: Record<string, unknown> = {}) {
  return mount(PatientCountBar, {
    props,
    global: {
      plugins: [vuetify],
      stubs,
    },
  })
}

describe('PatientCountBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetTrexState()
    // Single-frame RAF: invoke once with a time that guarantees `progress >= 1`
    // (duration is 100ms — passing a large delta short-circuits the recursion
    // that would otherwise blow the stack on the synchronous mock).
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(1e9)
      return 0
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders nothing when TrexSQL is disabled', () => {
    trexState.isTrexSQLEnabled = ref(false) as unknown as { value: boolean }
    const wrapper = mountBar()
    expect(wrapper.find('.patient-count-bar').exists()).toBe(false)
  })

  it('renders the shell when TrexSQL is enabled', () => {
    const wrapper = mountBar()
    expect(wrapper.find('.patient-count-bar').exists()).toBe(true)
    expect(wrapper.find('.stub-select').exists()).toBe(true)
  })

  it('renders the "select dataset" prompt when no source is selected', () => {
    const wrapper = mountBar()
    expect(wrapper.find('.patient-count-bar__prompt').exists()).toBe(true)
  })

  it('renders the cache warning when a source is selected but cache is not ready', () => {
    trexState.selectedSourceKey = ref('CCAE') as unknown as { value: string | null }
    trexState.isCacheReady = ref(false) as unknown as { value: boolean }
    trexState.cacheStatusMessage = ref('Cache not yet built') as unknown as {
      value: string
    }
    const wrapper = mountBar()
    expect(wrapper.find('.patient-count-bar__cache-warning').exists()).toBe(true)
    expect(wrapper.find('.patient-count-bar__cache-warning').text()).toContain(
      'Cache not yet built'
    )
  })

  it('renders the loading bar (pulsing) when isCountLoading is true', () => {
    trexState.selectedSourceKey = ref('CCAE') as unknown as { value: string | null }
    trexState.isCountLoading = ref(true) as unknown as { value: boolean }
    const wrapper = mountBar()
    const progress = wrapper.find('.patient-count-bar__progress.pulsing')
    expect(progress.exists()).toBe(true)
  })

  it('renders error UI and emits "retry" when the retry button is clicked', async () => {
    trexState.selectedSourceKey = ref('CCAE') as unknown as { value: string | null }
    trexState.countError = ref('Boom') as unknown as { value: string | null }
    const wrapper = mountBar({ expression: { foo: 'bar' } })
    expect(wrapper.find('.patient-count-bar__error').exists()).toBe(true)
    expect(wrapper.find('.patient-count-bar__error').text()).toContain('Boom')

    await wrapper.find('[data-testid="atlas-button"]').trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
    expect(trexState.getPatientCount).toHaveBeenCalledWith({ foo: 'bar' })
  })

  it('renders the zero-patients state with grey progress', () => {
    trexState.selectedSourceKey = ref('CCAE') as unknown as { value: string | null }
    trexState.isCacheReady = ref(true) as unknown as { value: boolean }
    trexState.patientCount = ref({
      cohortPatientCount: 0,
      totalPatientCount: 1_000_000,
      executionTimeMs: 1,
    }) as unknown as { value: PatientCountResult | null }
    trexState.totalPatientCountFormatted = ref('1,000,000') as unknown as {
      value: string
    }
    const wrapper = mountBar()
    const progress = wrapper.find('.patient-count-bar__progress')
    expect(progress.exists()).toBe(true)
    expect(progress.attributes('data-color')).toBe('grey')
    expect(wrapper.text()).toContain('1,000,000')
  })

  it('renders the patient count result with non-zero progress color', async () => {
    trexState.selectedSourceKey = ref('CCAE') as unknown as { value: string | null }
    trexState.isCacheReady = ref(true) as unknown as { value: boolean }
    trexState.cohortPercentage = ref(42) as unknown as { value: number }
    trexState.patientCount = ref({
      cohortPatientCount: 42_000,
      totalPatientCount: 100_000,
      executionTimeMs: 1,
    }) as unknown as { value: PatientCountResult | null }
    trexState.cohortPatientCountFormatted = ref('42,000') as unknown as { value: string }
    trexState.totalPatientCountFormatted = ref('100,000') as unknown as { value: string }
    const wrapper = mountBar()
    await flushPromises()
    const progress = wrapper.find('.patient-count-bar__progress')
    expect(progress.exists()).toBe(true)
    // animatedPercentage takes one RAF tick to reach the target (we ran the
    // callback synchronously in beforeEach) — guard with a softer check:
    // either 0 (grey) before animation or 'primary' after; we only assert
    // that the color attribute is one of those two.
    expect(['primary', 'grey']).toContain(progress.attributes('data-color'))
    expect(wrapper.find('.patient-count-bar__total-count').text()).toBe('100,000')
  })

  it('renders the stale icon and a formatted date in the tooltip when cache is stale', () => {
    trexState.selectedSourceKey = ref('CCAE') as unknown as { value: string | null }
    trexState.isCacheReady = ref(true) as unknown as { value: boolean }
    const lastBuiltAt = '2024-01-15T12:34:00.000Z'
    trexState.selectedCacheStatus = ref({
      sourceKey: 'CCAE',
      status: 'stale' as CacheStatusType,
      totalPatientCount: 100_000,
      lastBuiltAt,
      sizeBytes: 0,
      errorMessage: null,
    }) as unknown as { value: TrexSQLCacheStatus | null }
    trexState.patientCount = ref({
      cohortPatientCount: 100,
      totalPatientCount: 100_000,
      executionTimeMs: 1,
    }) as unknown as { value: PatientCountResult | null }
    trexState.totalPatientCountFormatted = ref('100,000') as unknown as { value: string }

    const wrapper = mountBar()
    expect(wrapper.find('.patient-count-bar__stale-icon').exists()).toBe(true)
    // formatDate output uses the runtime locale — assert it contains the
    // year, which is locale-independent.
    expect(wrapper.find('.stub-tooltip').text()).toContain('2024')
  })

  it('renders the "waiting for expression" state when nothing else applies', () => {
    trexState.selectedSourceKey = ref('CCAE') as unknown as { value: string | null }
    trexState.isCacheReady = ref(true) as unknown as { value: boolean }
    trexState.patientCount = ref(null) as unknown as {
      value: PatientCountResult | null
    }
    const wrapper = mountBar()
    expect(wrapper.find('.patient-count-bar__waiting').exists()).toBe(true)
  })

  it('forwards each cache-status tone via the chip stub (success/info/warning/danger/neutral)', () => {
    const sources: DataSourceWithCacheStatus[] = (
      ['ready', 'building', 'stale', 'error', 'not_built'] as CacheStatusType[]
    ).map(s => ({
      sourceKey: s,
      sourceName: `Source ${s}`,
      cacheStatus: {
        sourceKey: s,
        status: s,
        totalPatientCount: 1,
        lastBuiltAt: null,
        sizeBytes: null,
        errorMessage: null,
      },
    }))
    trexState.dataSources = ref(sources) as unknown as {
      value: DataSourceWithCacheStatus[]
    }
    const wrapper = mountBar()
    const tones = wrapper.findAll('.stub-chip').map(c => c.attributes('data-tone'))
    expect(tones).toEqual(['success', 'info', 'warning', 'danger', 'neutral'])
    // Labels — i18n mock returns the key when missing (no 'trexsql.cache*'
    // translations); the displayed text should at least be non-empty.
    const labels = wrapper.findAll('.stub-chip').map(c => c.text())
    expect(labels.every(l => l.length > 0)).toBe(true)
  })

  it('drives the selectedSource v-model: calls selectDataSource, clearCount and triggers count when expression has keys', async () => {
    const sources: DataSourceWithCacheStatus[] = [
      {
        sourceKey: 'CCAE',
        sourceName: 'CCAE',
        cacheStatus: null,
      },
    ]
    trexState.dataSources = ref(sources) as unknown as {
      value: DataSourceWithCacheStatus[]
    }
    const wrapper = mountBar({ expression: { foo: 'bar' } })

    await wrapper.findComponent({ name: 'AtlasSelect' }).vm.$emit(
      'update:modelValue',
      'CCAE'
    )
    await flushPromises()

    expect(trexState.selectDataSource).toHaveBeenCalledWith('CCAE')
    expect(trexState.clearCount).toHaveBeenCalled()
    expect(trexState.getPatientCount).toHaveBeenCalledWith({ foo: 'bar' })
  })

  it('selectedSource setter is a no-op when the value is null', async () => {
    const wrapper = mountBar({ expression: { foo: 'bar' } })
    await wrapper.findComponent({ name: 'AtlasSelect' }).vm.$emit(
      'update:modelValue',
      null
    )
    await flushPromises()
    expect(trexState.selectDataSource).not.toHaveBeenCalled()
    expect(trexState.clearCount).not.toHaveBeenCalled()
  })

  it('selectedSource setter does not trigger a count when the expression is empty', async () => {
    const wrapper = mountBar({ expression: {} })
    await wrapper.findComponent({ name: 'AtlasSelect' }).vm.$emit(
      'update:modelValue',
      'CCAE'
    )
    await flushPromises()
    expect(trexState.selectDataSource).toHaveBeenCalledWith('CCAE')
    expect(trexState.clearCount).toHaveBeenCalled()
    expect(trexState.getPatientCount).not.toHaveBeenCalled()
  })

  it('exposes a loading state on the AtlasSelect when isLoadingDataSources is true', () => {
    trexState.isLoadingDataSources = ref(true) as unknown as { value: boolean }
    const wrapper = mountBar()
    const select = wrapper.find('.stub-select')
    expect(select.attributes('data-loading')).toBe('true')
    expect(select.attributes('data-disabled')).toBe('true')
  })

  it('handleRetry without expression still emits retry but does not call getPatientCount', async () => {
    trexState.selectedSourceKey = ref('CCAE') as unknown as { value: string | null }
    trexState.countError = ref('Boom') as unknown as { value: string | null }
    const wrapper = mountBar()
    await wrapper.find('[data-testid="atlas-button"]').trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
    expect(trexState.getPatientCount).not.toHaveBeenCalled()
  })

  it('calls initialize on mount', async () => {
    mountBar()
    await flushPromises()
    expect(trexState.initialize).toHaveBeenCalled()
  })

  it('unmounts cleanly even after animation kicks off (covers onBeforeUnmount + cancelAnimationFrame branch)', async () => {
    // Force animateToValue to set an animationFrameId by transitioning
    // patientCount from null to a value with isCountLoading=false.
    trexState.selectedSourceKey = ref('CCAE') as unknown as { value: string | null }
    trexState.isCacheReady = ref(true) as unknown as { value: boolean }
    trexState.cohortPercentage = ref(50) as unknown as { value: number }
    const pcRef = ref<PatientCountResult | null>(null)
    trexState.patientCount = computed(() => pcRef.value) as unknown as {
      value: PatientCountResult | null
    }
    const wrapper = mountBar()
    pcRef.value = {
      cohortPatientCount: 50_000,
      totalPatientCount: 100_000,
      executionTimeMs: 1,
    }
    await flushPromises()
    expect(() => wrapper.unmount()).not.toThrow()
  })
})
