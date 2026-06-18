import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { vuetify } from './_test-helpers'
import NotificationInbox from '@/components/shared/NotificationInbox.vue'
import { useNotifications } from '@/stores/notifications'

beforeEach(() => { setActivePinia(createPinia()) })
afterEach(() => { document.body.innerHTML = '' })

function mountInbox() {
  return mount(NotificationInbox, { global: { plugins: [vuetify] }, attachTo: document.body })
}

describe('NotificationInbox', () => {
  it('shows the unread count on the bell', async () => {
    const n = useNotifications()
    n.info('a'); n.danger('b')
    const w = mountInbox()
    await w.vm.$nextTick()
    expect(w.find('[data-testid="notification-bell"]').text()).toContain('2')
  })

  it('lists items and clears them', async () => {
    const n = useNotifications()
    n.success('Saved cohort')
    const w = mountInbox()
    await w.find('[data-testid="notification-bell"]').trigger('click')
    await w.vm.$nextTick()
    expect(document.body.textContent).toContain('Saved cohort')
    const clear = document.body.querySelector('[data-testid="notification-clear"]') as HTMLElement
    clear.click()
    await w.vm.$nextTick()
    expect(n.items).toHaveLength(0)
  })

  it('marks all read when opened', async () => {
    const n = useNotifications()
    n.info('a')
    const w = mountInbox()
    await w.find('[data-testid="notification-bell"]').trigger('click')
    await w.vm.$nextTick()
    expect(n.unreadCount).toBe(0)
  })
})
