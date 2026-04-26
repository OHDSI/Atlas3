import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ProfileFilterChips from '@/components/profile/ProfileFilterChips.vue'
import { useProfileStore } from '@/stores/profile'

const vuetify = createVuetify({ components, directives })

describe('ProfileFilterChips', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders one chip per active domain', async () => {
    const s = useProfileStore()
    s.setDomainFilter('Drug', true)
    s.setDomainFilter('Condition', true)
    const w = mount(ProfileFilterChips, { global: { plugins: [vuetify] } })
    expect(w.findAll('[data-test="profile-chip-active"]').length).toBe(2)
  })

  it('removes a domain when chip close clicked', async () => {
    const s = useProfileStore()
    s.setDomainFilter('Drug', true)
    const w = mount(ProfileFilterChips, { global: { plugins: [vuetify] } })
    await w.find('[data-test="profile-chip-active"] .v-chip__close').trigger('click')
    expect(s.domainFilter.has('Drug')).toBe(false)
  })
})
