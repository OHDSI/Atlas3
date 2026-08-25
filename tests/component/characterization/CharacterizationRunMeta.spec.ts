/**
 * CharacterizationRunMeta component tests
 *
 * Verifies that the summary card shows the selected execution fields and
 * derives duration from start/end time when the backend does not send a
 * duration value.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import CharacterizationRunMeta from '@/components/characterization/CharacterizationRunMeta.vue'
import type { CharacterizationExecution } from '@/models/characterization.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

function mountMeta(execution: CharacterizationExecution | null, resultCount = 0) {
  return mount(CharacterizationRunMeta, {
    props: { execution, resultCount },
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasCard: {
          name: 'AtlasCard',
          template: '<div class="atlas-card-stub"><slot /></div>',
        },
      },
    },
  })
}

describe('CharacterizationRunMeta', () => {
  it('renders duration from duration when the backend supplies one', () => {
    const wrapper = mountMeta({
      id: 1,
      sourceKey: 'EUNOMIA',
      status: 'COMPLETED',
      startTime: 1_700_000_000_000,
      endTime: 1_700_000_046_999,
      duration: 46_999,
    })

    expect(wrapper.text()).toContain('46s')
  })

  it('falls back to endTime - startTime when duration is missing', () => {
    const wrapper = mountMeta({
      id: 1,
      sourceKey: 'EUNOMIA',
      status: 'COMPLETED',
      startTime: 1_700_000_000_000,
      endTime: 1_700_000_046_999,
      duration: undefined,
    })

    expect(wrapper.text()).toContain('46s')
  })
})
