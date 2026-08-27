import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'

import DataSourceRunRow from '@/components/generation/DataSourceRunRow.vue'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'

const vuetify = createVuetify({ components, directives })

function mountRow(props: Record<string, unknown> = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: { admin: ['admin:source'] },
    entityAccess: emptyEntityAccess(),
  })

  return mount(DataSourceRunRow, {
    global: {
      plugins: [vuetify, pinia],
      stubs: {
        AtlasButton: {
          name: 'AtlasButton',
          props: ['variant', 'size', 'disabled'],
          template: '<button class="run-stub" :disabled="disabled"><slot /></button>',
        },
        AtlasIconButton: {
          name: 'AtlasIconButton',
          props: ['icon', 'ariaLabel', 'variant', 'size', 'tone', 'disabled'],
          emits: ['click'],
          template:
            '<button class="eye-stub" :data-icon="icon" :data-tone="tone" :aria-label="ariaLabel" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        AtlasTooltip: {
          name: 'AtlasTooltip',
          template: '<div><slot name="activator" :props="{}" /><slot /></div>',
        },
      },
    },
    props: {
      sourceKey: 'CCAE',
      historyCount: 2,
      latestStatus: 'COMPLETED',
      latestExecutionId: 7,
      selectedExecutionId: null,
      ...props,
    },
  })
}

describe('DataSourceRunRow', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows an unhighlighted view-results eye for an inactive completed result', () => {
    const w = mountRow()
    const eye = w.find('[data-testid="view-latest-btn-CCAE"]')
    expect(eye.exists()).toBe(true)
    expect(eye.attributes('data-icon')).toBe('mdi-eye-outline')
    expect(eye.attributes('data-tone')).toBe('neutral')
  })

  it('highlights the eye when the completed result is active', () => {
    const w = mountRow({ selectedExecutionId: 7 })
    const eye = w.find('[data-testid="view-latest-btn-CCAE"]')
    expect(eye.attributes('data-icon')).toBe('mdi-eye')
    expect(eye.attributes('data-tone')).toBe('primary')
  })

  it('emits select-result when the eye is clicked', async () => {
    const w = mountRow()
    await w.find('[data-testid="view-latest-btn-CCAE"]').trigger('click')
    expect(w.emitted('select-result')).toEqual([[]])
  })

  it('hides the eye when the latest execution is not completed', () => {
    const w = mountRow({ latestStatus: 'RUNNING' })
    expect(w.find('[data-testid="view-latest-btn-CCAE"]').exists()).toBe(false)
  })
})