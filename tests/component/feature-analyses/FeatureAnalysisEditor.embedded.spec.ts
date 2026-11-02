import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { defineComponent, h } from 'vue'

import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/feature-analysis.service', () => ({
  listFeatureAnalyses: vi.fn(),
  getFeatureAnalysis: vi.fn(),
  createFeatureAnalysis: vi.fn(),
  updateFeatureAnalysis: vi.fn(),
  listFeatureAnalysisDomains: vi.fn(),
  listFeatureAnalysisAggregates: vi.fn(),
  featureAnalysisNameExists: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  createFeatureAnalysis,
  listFeatureAnalyses,
  listFeatureAnalysisDomains,
  listFeatureAnalysisAggregates,
} from '@/services/feature-analysis.service'
import FeatureAnalysisEditor from '@/components/feature-analyses/FeatureAnalysisEditor.vue'
import { success } from '@/types/api'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const Host = defineComponent({
  setup() {
    return () =>
      h(FeatureAnalysisEditor, {
        embedded: true,
        featureAnalysisId: null,
        createKind: { type: 'CUSTOM_FE' },
      })
  },
})

type EditorVm = { requestClose: () => void }

async function mountEmbedded() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/host', component: Host },
      { path: '/elsewhere', component: { template: '<div />' } },
    ],
  })
  await router.push('/host')
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: {
      create: ['create:feature-analysis'],
      write: ['write:feature-analysis'],
    },
    entityAccess: emptyEntityAccess(),
  })

  const wrapper = mount(
    defineComponent({ template: '<router-view />' }),
    {
      global: {
        plugins: [vuetify, pinia, router],
        stubs: {
          ConceptSetsListDialog: true,
          ConceptSetEditor: true,
          EntityAccessDialog: true,
          AtlasDialog: {
            name: 'AtlasDialog',
            props: ['modelValue', 'title', 'eyebrow'],
            emits: ['close'],
            template:
              '<div v-if="modelValue" data-testid="atlas-dialog"><slot /><slot name="actions" /></div>',
          },
        },
      },
    }
  )
  await flushPromises()
  return { wrapper, router }
}

function editor(wrapper: VueWrapper) {
  return wrapper.findComponent(FeatureAnalysisEditor)
}

async function typeName(wrapper: VueWrapper, value: string) {
  await wrapper.get('[data-testid="feature-analysis-editor-name"] input').setValue(value)
  await flushPromises()
}

describe('FeatureAnalysisEditor embedded', () => {
  let mounted: { wrapper: VueWrapper; router: Router } | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listFeatureAnalyses).mockResolvedValue(success([]))
    vi.mocked(listFeatureAnalysisDomains).mockResolvedValue(success(['DEMOGRAPHICS']))
    vi.mocked(listFeatureAnalysisAggregates).mockResolvedValue(success([]))
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  it('renders without the page shell', async () => {
    mounted = await mountEmbedded()
    const { wrapper } = mounted

    expect(wrapper.find('[data-testid="feature-analysis-editor-embedded"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'AnalysisBuilderShell' }).exists()).toBe(false)
    expect(wrapper.find('h2').exists()).toBe(true)
    expect(wrapper.find('[data-testid="feature-analysis-editor-access-icon"]').exists()).toBe(false)
  })

  it('emits saved with created=true after creating', async () => {
    vi.mocked(createFeatureAnalysis).mockResolvedValue(
      success({ id: 501, name: 'Prior insulin use', type: 'CUSTOM_FE', design: 'SELECT 1' })
    )
    mounted = await mountEmbedded()
    const { wrapper } = mounted

    await typeName(wrapper, 'Prior insulin use')
    await wrapper.get('[data-testid="feature-analysis-editor-save"]').trigger('click')
    await flushPromises()

    expect(editor(wrapper).emitted('saved')?.[0]).toEqual([
      expect.objectContaining({ id: 501 }),
      true,
    ])
  })

  it('requestClose emits close straight away when clean', async () => {
    mounted = await mountEmbedded()
    const { wrapper } = mounted

    ;(editor(wrapper).vm as unknown as EditorVm).requestClose()
    await flushPromises()

    expect(editor(wrapper).emitted('close')).toHaveLength(1)
    expect(wrapper.find('[data-testid="atlas-dialog"]').exists()).toBe(false)
  })

  it('requestClose asks first when dirty and Cancel keeps the edits', async () => {
    mounted = await mountEmbedded()
    const { wrapper } = mounted

    await typeName(wrapper, 'Draft')
    ;(editor(wrapper).vm as unknown as EditorVm).requestClose()
    await flushPromises()

    expect(wrapper.find('[data-testid="atlas-dialog"]').exists()).toBe(true)
    expect(editor(wrapper).emitted('close')).toBeUndefined()

    await wrapper.get('[data-testid="atlas-dialog"] button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="atlas-dialog"]').exists()).toBe(false)
    expect(editor(wrapper).emitted('close')).toBeUndefined()
    expect(
      (wrapper.get('[data-testid="feature-analysis-editor-name"] input').element as HTMLInputElement).value
    ).toBe('Draft')

    ;(editor(wrapper).vm as unknown as EditorVm).requestClose()
    await flushPromises()
    await wrapper.get('[data-testid="feature-analysis-editor-discard-changes"]').trigger('click')
    await flushPromises()

    expect(editor(wrapper).emitted('close')).toHaveLength(1)
  })

  it('a route change while dirty prompts once', async () => {
    mounted = await mountEmbedded()
    const { wrapper, router } = mounted

    await typeName(wrapper, 'Draft')
    await router.push('/elsewhere')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="atlas-dialog"]')).toHaveLength(1)
    expect(router.currentRoute.value.path).toBe('/host')
  })

  it('requestClose does nothing while a route-leave confirmation is pending', async () => {
    mounted = await mountEmbedded()
    const { wrapper, router } = mounted

    await typeName(wrapper, 'Draft')
    const editorWrapper = editor(wrapper)
    await router.push('/elsewhere')
    await flushPromises()
    ;(editorWrapper.vm as unknown as EditorVm).requestClose()
    await flushPromises()

    expect(wrapper.findAll('[data-testid="atlas-dialog"]')).toHaveLength(1)
    expect(editorWrapper.emitted('close')).toBeUndefined()

    await wrapper.get('[data-testid="feature-analysis-editor-discard-changes"]').trigger('click')
    await flushPromises()
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/elsewhere')
    expect(editorWrapper.emitted('close')).toBeUndefined()
  })
})
