import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DataSourcesSection from '@/components/config/DataSourcesSection.vue'
import DataSourceDialog from '@/components/config/DataSourceDialog.vue'
import { deleteSource } from '@/services/source.service'
import { useAuthStore } from '@/stores/auth'
import { getAuthConfig, setAuthConfig } from '@/config/auth.config'

const vuetify = createVuetify({ components, directives })

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const mockListDataSources = vi.fn()
const mockHttpGet = vi.fn()
const mockHttpPost = vi.fn()

vi.mock('@/services/datasource.service', () => ({
  listDataSources: () => mockListDataSources(),
}))

vi.mock('@/services/http-client', () => ({
  httpGet: (url: string) => mockHttpGet(url),
  httpPost: (url: string, body?: unknown) => mockHttpPost(url, body),
}))

vi.mock('@/services/source.service', () => ({
  deleteSource: vi.fn(),
  getSourceDetails: vi.fn(() => new Promise(() => {})),
}))

vi.mock('@/services/access.service', () => ({
  fetchEntityAccessRoles: vi.fn().mockResolvedValue({ success: true, data: [] }),
  loadRoleSuggestions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  grantEntityAccess: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  revokeEntityAccess: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}))

type Daimon = { daimonType: string; priority?: number }

function source(sourceId: number, sourceKey: string, daimons: Daimon[]) {
  return {
    sourceId,
    sourceKey,
    sourceName: `Name ${sourceKey}`,
    sourceDialect: 'postgresql',
    daimons,
  }
}

function all(v: number, c: number, r: number): Daimon[] {
  return [
    { daimonType: 'Vocabulary', priority: v },
    { daimonType: 'CEM', priority: c },
    { daimonType: 'Results', priority: r },
  ]
}

// S0 is listed first with no priority, so a default that ignored priority would land on it.
const FOUR = [
  source(10, 'S0', all(0, 0, 0)),
  source(11, 'S1', all(9, 0, 0)),
  source(12, 'S2', all(0, 9, 0)),
  source(13, 'S3', all(0, 0, 9)),
]

let wrapper: VueWrapper
let previousAuthEnabled: boolean

async function mountSection() {
  wrapper = mount(DataSourcesSection, { global: { plugins: [vuetify] } })
  await flushPromises()
  return wrapper
}

function radios(): HTMLInputElement[] {
  return wrapper.findAll('input[type="radio"]').map(r => r.element as HTMLInputElement)
}

function checkedIndices(): number[] {
  return radios().flatMap((radio, index) => (radio.checked ? [index] : []))
}

function snackbar(severity: 'success' | 'danger') {
  return wrapper
    .findAllComponents({ name: 'AtlasSnackbar' })
    .find(s => s.props('severity') === severity)!
}

function deleteDialog() {
  return wrapper
    .findAllComponents({ name: 'AtlasDialog' })
    .filter(d => d.props('eyebrow') === 'CONFIRM')
    .at(-1)!
}

function dangerButton() {
  return deleteDialog()
    .findAllComponents({ name: 'AtlasButton' })
    .find(b => b.props('variant') === 'danger')!
}

async function clickIcon(icon: string, index = 0) {
  wrapper.findAll(icon)[index]!.element.closest('button')!.click()
  await flushPromises()
}

async function setScope(scope: 'session' | 'application') {
  wrapper.findComponent({ name: 'VBtnToggle' }).vm.$emit('update:modelValue', scope)
  await flushPromises()
}

function rowText(index: number): string {
  return wrapper.findAll('tbody tr')[index]!.text()
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  localStorage.clear()
  previousAuthEnabled = getAuthConfig().userAuthenticationEnabled
  setAuthConfig({ userAuthenticationEnabled: false })
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  mockListDataSources.mockResolvedValue(FOUR)
  mockHttpGet.mockResolvedValue({})
  mockHttpPost.mockResolvedValue({})
})

afterEach(() => {
  wrapper?.unmount()
  setAuthConfig({ userAuthenticationEnabled: previousAuthEnabled })
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('DataSourcesSection initial state', () => {
  it('shows the empty notice and no rows while sources are still loading', async () => {
    mockListDataSources.mockReturnValue(new Promise(() => {}))
    wrapper = mount(DataSourcesSection, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(wrapper.findAll('tbody tr')).toHaveLength(0)
    expect(wrapper.text()).toContain('The current WebAPI has no sources defined.')
  })

  it('starts with every toast and dialog closed and nothing deleting', async () => {
    await mountSection()

    expect(snackbar('success').props('modelValue')).toBe(false)
    expect(snackbar('danger').props('modelValue')).toBe(false)
    expect(wrapper.findComponent(DataSourceDialog).props('modelValue')).toBe(false)
    expect(wrapper.findComponent({ name: 'EntityAccessDialog' }).props('modelValue')).toBe(false)
    expect(deleteDialog().props('modelValue')).toBe(false)

    await clickIcon('.mdi-delete')
    expect(dangerButton().props('loading')).toBe(false)
  })

  it('shows no disabled-reason wrappers when every action is allowed', async () => {
    await mountSection()

    expect(wrapper.find('[data-testid="disabled-reason-wrap"]').exists()).toBe(false)
  })

  it('explains why cache refresh is disabled for a read-only user', async () => {
    setAuthConfig({ userAuthenticationEnabled: true })
    useAuthStore().setUser({ login: 'u', displayName: 'u', permissionIdx: { read: ['read:source'] } })
    await mountSection()

    const wrap = wrapper.find('.mdi-refresh').element.closest('[data-testid="disabled-reason-wrap"]')
    expect(wrap?.getAttribute('title')).toBe('You do not have permission for this action')
  })
})

describe('DataSourcesSection loading sources', () => {
  it('fetches and shows the vocabulary version only for sources with a vocabulary', async () => {
    mockListDataSources.mockResolvedValue([
      source(1, 'VOC', [{ daimonType: 'Vocabulary' }]),
      source(2, 'RES', [{ daimonType: 'Results' }]),
    ])
    mockHttpGet.mockImplementation((url: string) =>
      Promise.resolve(url === '/vocabulary/VOC/info' ? { version: 'v5.0 2024' } : {})
    )
    await mountSection()

    expect(mockHttpGet).toHaveBeenCalledWith('/vocabulary/VOC/info')
    expect(mockHttpGet).not.toHaveBeenCalledWith('/vocabulary/RES/info')
    expect(rowText(0)).toContain('v5.0 2024')
    expect(rowText(1)).toContain('-')
  })

  it('marks every loaded source as initialized', async () => {
    await mountSection()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(4)
    expect(rows.every(row => row.find('.mdi-check-circle').exists())).toBe(true)
    expect(wrapper.find('tbody .mdi-alert-circle').exists()).toBe(false)
  })

  it('enables only the radios and refresh of daimons a source actually has', async () => {
    mockListDataSources.mockResolvedValue([
      source(1, 'VOC', [{ daimonType: 'Vocabulary' }]),
      source(2, 'RES', [{ daimonType: 'Results' }]),
    ])
    await mountSection()

    expect(radios().map(r => r.disabled)).toEqual([false, true, true, true, true, false])
    const refresh = wrapper.findAll('.mdi-refresh').map(i => i.element.closest('button')!.disabled)
    expect(refresh).toEqual([true, false])
  })

  it('defaults each daimon to its highest-priority source', async () => {
    await mountSection()

    expect(checkedIndices()).toEqual([3, 7, 11])
  })

  it('ranks a source by the priority of the matching daimon only', async () => {
    mockListDataSources.mockResolvedValue([
      source(1, 'B', [{ daimonType: 'Vocabulary', priority: 1 }]),
      source(2, 'A', [
        { daimonType: 'Vocabulary', priority: 0 },
        { daimonType: 'Results', priority: 5 },
      ]),
    ])
    await mountSection()

    expect(radios()[0]!.checked).toBe(true)
    expect(radios()[3]!.checked).toBe(false)
  })

  it('restores saved evidence and results selections', async () => {
    localStorage.setItem('selectedEvidence', 'S0')
    localStorage.setItem('selectedResults', 'S0')
    await mountSection()

    expect(checkedIndices()).toEqual([1, 2, 3])
  })

  it('returns to the priority defaults when the configuration cache is cleared', async () => {
    localStorage.setItem('selectedVocabulary', 'S0')
    localStorage.setItem('selectedEvidence', 'S0')
    localStorage.setItem('selectedResults', 'S0')
    await mountSection()
    expect(checkedIndices()).toEqual([0, 1, 2])

    await clickIcon('.mdi-delete-sweep')

    expect(checkedIndices()).toEqual([3, 7, 11])
    expect(snackbar('success').props('modelValue')).toBe(true)
    expect(snackbar('success').props('text')).toBe(
      'Local Storage has been cleared. Please refresh the page to reload configuration information.'
    )
  })

  it('shows whole-application priorities per daimon', async () => {
    localStorage.setItem('selectedVocabulary', 'S0')
    localStorage.setItem('selectedEvidence', 'S0')
    localStorage.setItem('selectedResults', 'S0')
    await mountSection()

    await setScope('application')

    expect(checkedIndices()).toEqual([3, 7, 11])
  })

  it('picks the whole-application evidence source only among sources that have one', async () => {
    mockListDataSources.mockResolvedValue([
      source(1, 'NOCEM', [{ daimonType: 'Vocabulary' }]),
      source(2, 'CEM', [{ daimonType: 'CEM' }]),
    ])
    await mountSection()

    await setScope('application')

    expect(radios()[1]!.checked).toBe(false)
    expect(radios()[4]!.checked).toBe(true)
  })

  it('keeps saved selections and reports nothing when a reload returns no sources', async () => {
    await mountSection()
    expect(localStorage.getItem('selectedVocabulary')).toBe('S1')
    expect(localStorage.getItem('selectedEvidence')).toBe('S2')
    expect(localStorage.getItem('selectedResults')).toBe('S3')

    mockListDataSources.mockResolvedValue([])
    wrapper.findComponent(DataSourceDialog).vm.$emit('saved')
    await flushPromises()

    expect(localStorage.getItem('selectedVocabulary')).toBe('S1')
    expect(localStorage.getItem('selectedEvidence')).toBe('S2')
    expect(localStorage.getItem('selectedResults')).toBe('S3')
    expect(snackbar('danger').props('modelValue')).toBe(false)
  })

  it('reports a non-Error load failure with the generic message', async () => {
    mockListDataSources.mockRejectedValue('nope')
    await mountSection()

    expect(snackbar('danger').props('modelValue')).toBe(true)
    expect(snackbar('danger').props('text')).toBe('Failed to load data sources')
  })
})

describe('DataSourcesSection whole-application priority', () => {
  it('reports a failed priority update', async () => {
    await mountSection()
    await setScope('application')
    mockHttpPost.mockRejectedValue(new Error('down'))

    await wrapper.findAll('input[type="radio"]')[1]!.setValue(true)
    await flushPromises()

    expect(mockHttpPost).toHaveBeenCalledWith('/source/S0/daimons/CEM/set-priority', undefined)
    expect(snackbar('danger').props('modelValue')).toBe(true)
    expect(snackbar('danger').props('text')).toBe('Failed to update source priority. Please try again.')
  })
})

describe('DataSourcesSection row actions', () => {
  it('reports a successful connection check with the source name', async () => {
    await mountSection()

    await clickIcon('.mdi-connection', 1)

    expect(mockHttpGet).toHaveBeenCalledWith('/source/connection/S1')
    expect(snackbar('success').props('modelValue')).toBe(true)
    expect(snackbar('success').props('text')).toBe('Name S1: COMPLETED')
  })

  it('reports a failed connection check', async () => {
    await mountSection()
    mockHttpGet.mockRejectedValue(new Error('refused'))

    await clickIcon('.mdi-connection', 1)

    expect(snackbar('danger').props('text')).toBe(
      'Connection failed. Please see server logs for details.'
    )
  })

  it('clears then refreshes the results cache and reports it started', async () => {
    await mountSection()

    await clickIcon('.mdi-refresh', 2)

    expect(mockHttpPost).toHaveBeenCalledWith('/cdmresults/S2/clearCache', undefined)
    expect(mockHttpGet).toHaveBeenCalledWith('/cdmresults/S2/refreshCache')
    expect(snackbar('success').props('modelValue')).toBe(true)
    expect(snackbar('success').props('text')).toBe('Name S2: STARTED')
  })

  it('names the source when a cache refresh fails', async () => {
    await mountSection()
    mockHttpPost.mockRejectedValue(new Error('boom'))

    await clickIcon('.mdi-refresh', 2)

    expect(snackbar('danger').props('text')).toBe('Name S2: FAILED')
  })

  it('opens the edit dialog', async () => {
    await mountSection()

    await clickIcon('.mdi-pencil', 1)

    expect(wrapper.findComponent(DataSourceDialog).props('modelValue')).toBe(true)
  })

  it('reports completion when the dialog saves or deletes', async () => {
    await mountSection()

    wrapper.findComponent(DataSourceDialog).vm.$emit('saved')
    await flushPromises()
    expect(snackbar('success').props('text')).toBe('COMPLETED')

    snackbar('success').vm.$emit('update:modelValue', false)
    wrapper.findComponent(DataSourceDialog).vm.$emit('deleted')
    await flushPromises()
    expect(snackbar('success').props('modelValue')).toBe(true)
    expect(snackbar('success').props('text')).toBe('COMPLETED')
  })
})

describe('DataSourcesSection server cache', () => {
  it('asks for confirmation and does nothing when declined', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await mountSection()

    await clickIcon('.mdi-server')

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to clear the server cache?')
    expect(mockHttpPost).not.toHaveBeenCalled()
    expect(snackbar('success').props('modelValue')).toBe(false)
  })

  it('reports a cleared server cache', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await mountSection()

    await clickIcon('.mdi-server')

    expect(snackbar('success').props('text')).toBe('Server cache has been cleared.')
  })

  it('falls back to FAILED when clearing fails without an Error', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await mountSection()
    mockHttpPost.mockRejectedValue('nope')

    await clickIcon('.mdi-server')

    expect(snackbar('danger').props('text')).toBe('FAILED')
  })
})

describe('DataSourcesSection deletion', () => {
  it('shows progress while deleting and reports completion', async () => {
    let finish!: () => void
    vi.mocked(deleteSource).mockReturnValue(
      new Promise<void>(resolve => {
        finish = resolve
      }) as never
    )
    await mountSection()
    await clickIcon('.mdi-delete', 1)

    await dangerButton().trigger('click')
    await flushPromises()
    expect(dangerButton().props('loading')).toBe(true)
    expect(deleteSource).toHaveBeenCalledWith(11)

    finish()
    await flushPromises()

    expect(snackbar('success').props('modelValue')).toBe(true)
    expect(snackbar('success').props('text')).toBe('COMPLETED')
    expect(deleteDialog().props('modelValue')).toBe(false)
  })

  it('stops the progress indicator when deleting fails', async () => {
    vi.mocked(deleteSource).mockRejectedValue('nope')
    await mountSection()
    await clickIcon('.mdi-delete', 1)

    await dangerButton().trigger('click')
    await flushPromises()

    expect(dangerButton().props('loading')).toBe(false)
    expect(snackbar('danger').props('text')).toBe('FAILED')
  })
})
