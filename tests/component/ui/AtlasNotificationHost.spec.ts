import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { vuetify } from './_test-helpers'
import AtlasNotificationHost from '@/components/ui/AtlasNotificationHost.vue'
import { useNotifications } from '@/stores/notifications'

beforeEach(() => { setActivePinia(createPinia()); vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

function mountHost() {
  return mount(AtlasNotificationHost, { global: { plugins: [vuetify] } })
}

describe('AtlasNotificationHost', () => {
  it('renders a toast for a live notification', async () => {
    const n = useNotifications()
    const w = mountHost()
    n.success('Saved', { message: 'done' })
    await w.vm.$nextTick()
    expect(w.findAll('[data-testid="atlas-feedback"]')).toHaveLength(1)
    expect(w.text()).toContain('Saved')
  })

  it('shows at most 3 toasts and a +N more control', async () => {
    const n = useNotifications()
    const w = mountHost()
    for (let i = 0; i < 5; i++) n.warning(`w${i}`)
    await w.vm.$nextTick()
    expect(w.findAll('[data-testid="atlas-feedback"]')).toHaveLength(3)
    expect(w.find('[data-testid="notification-more"]').text()).toContain('2')
  })

  it('auto-dismisses a 5000ms notification but keeps it in history', async () => {
    const n = useNotifications()
    const w = mountHost()
    n.success('bye')
    await w.vm.$nextTick()
    vi.advanceTimersByTime(5000)
    await w.vm.$nextTick()
    expect(w.findAll('[data-testid="atlas-feedback"]')).toHaveLength(0)
    expect(n.items).toHaveLength(1)
  })

  it('does not auto-dismiss a persistent (-1) notification', async () => {
    const n = useNotifications()
    const w = mountHost()
    n.danger('stay')
    await w.vm.$nextTick()
    vi.advanceTimersByTime(60000)
    await w.vm.$nextTick()
    expect(w.findAll('[data-testid="atlas-feedback"]')).toHaveLength(1)
  })
})
