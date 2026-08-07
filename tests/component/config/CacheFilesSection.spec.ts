/**
 * CacheFilesSection tests
 *
 * Covers the behaviour that only exists because caches outlive their datasets:
 * orphans are listed and deletable, protected files are listed and are not,
 * and a delete only happens once confirmed.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const listCacheFiles = vi.fn()
const deleteCacheFile = vi.fn()

vi.mock('@/services/trexsql.service', () => ({
  listCacheFiles: (...args: unknown[]) => listCacheFiles(...args),
  deleteCacheFile: (...args: unknown[]) => deleteCacheFile(...args),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import CacheFilesSection from '@/components/config/CacheFilesSection.vue'

const vuetify = createVuetify({ components, directives })

const orphan = {
  fileName: '_gone.db',
  databaseCode: '_gone',
  sizeBytes: 12288,
  lastModified: 1754400000000,
  attached: false,
  orphaned: true,
  protected: false,
}

const live = {
  fileName: 'cdm_demo.db',
  databaseCode: 'cdm_demo',
  sizeBytes: 52428800,
  lastModified: 1754400000000,
  attached: true,
  orphaned: false,
  protected: false,
}

const jobsDb = {
  fileName: '_cache_jobs.db',
  databaseCode: '_cache_jobs',
  sizeBytes: 12288,
  lastModified: 1754400000000,
  attached: false,
  orphaned: false,
  protected: true,
}

function makeStubs() {
  const passthrough = { template: '<div><slot /></div>' }
  return {
    AtlasIcon: { template: '<i><slot /></i>' },
    AtlasChip: passthrough,
    AtlasSpacer: { template: '<span />' },
    AtlasAlert: { template: '<div class="alert"><slot /></div>' },
    AtlasProgressLinear: { template: '<div class="progress" />' },
    AtlasDialog: {
      props: ['modelValue'],
      template:
        '<div v-if="modelValue" class="dialog"><slot /><slot name="actions" /></div>',
    },
    AtlasButton: {
      name: 'AtlasButton',
      props: ['loading', 'disabled'],
      emits: ['click'],
      template:
        '<button :disabled="disabled" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
    },
  }
}

function mountSection() {
  return mount(CacheFilesSection, {
    global: { plugins: [vuetify], stubs: makeStubs() },
  })
}

describe('CacheFilesSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    listCacheFiles.mockResolvedValue([orphan, live, jobsDb])
    deleteCacheFile.mockResolvedValue(undefined)
  })

  it('lists every cache on disk, including one no dataset claims', async () => {
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-testid="cache-file-_gone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cache-file-cdm_demo"]').exists()).toBe(true)
    // The orphan count and its reclaimable size are the point of the view.
    expect(wrapper.find('[data-testid="cache-files-summary"]').text()).toContain('1')
  })

  it('will not offer to delete a protected file', async () => {
    const wrapper = mountSection()
    await flushPromises()

    const button = wrapper.find('[data-testid="cache-file-delete-_cache_jobs"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('deletes only after confirmation, then reloads', async () => {
    const wrapper = mountSection()
    await flushPromises()

    await wrapper.find('[data-testid="cache-file-delete-_gone"]').trigger('click')
    await flushPromises()
    // Opening the dialog must not delete anything on its own.
    expect(deleteCacheFile).not.toHaveBeenCalled()

    await wrapper.find('[data-testid="cache-file-delete-confirm"]').trigger('click')
    await flushPromises()

    expect(deleteCacheFile).toHaveBeenCalledWith('_gone')
    expect(listCacheFiles).toHaveBeenCalledTimes(2)
  })

  it('surfaces why a delete was refused', async () => {
    deleteCacheFile.mockRejectedValue(new Error('Refusing to delete protected file'))
    const wrapper = mountSection()
    await flushPromises()

    await wrapper.find('[data-testid="cache-file-delete-_gone"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="cache-file-delete-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="cache-files-error"]').text()).toContain(
      'Refusing to delete protected file'
    )
  })

  it('shows the listing error instead of an empty table', async () => {
    listCacheFiles.mockRejectedValue(new Error('bao unavailable'))
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-testid="cache-files-error"]').text()).toContain('bao unavailable')
    expect(wrapper.find('[data-testid="cache-files-table"]').exists()).toBe(false)
  })
})
