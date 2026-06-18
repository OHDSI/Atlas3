import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotifications } from '@/stores/notifications'

beforeEach(() => { setActivePinia(createPinia()) })

describe('useNotifications', () => {
  it('appends a notification and returns its id', () => {
    const n = useNotifications()
    const id = n.success('Saved', { message: 'done' })
    expect(typeof id).toBe('number')
    expect(n.items).toHaveLength(1)
    expect(n.items[0]).toMatchObject({ severity: 'success', title: 'Saved', message: 'done', read: false })
  })

  it('defaults success/info to a 5000ms timeout and warning/danger to persistent (-1)', () => {
    const n = useNotifications()
    n.success('s'); n.info('i'); n.warning('w'); n.danger('d')
    expect(n.items.map(i => i.timeout)).toEqual([5000, 5000, -1, -1])
  })

  it('counts unread items', () => {
    const n = useNotifications()
    const id = n.info('a'); n.info('b')
    expect(n.unreadCount).toBe(2)
    n.markRead(id)
    expect(n.unreadCount).toBe(1)
  })

  it('dismiss removes from liveItems but keeps history', () => {
    const n = useNotifications()
    const id = n.warning('w')
    n.dismiss(id)
    expect(n.liveItems).toHaveLength(0)
    expect(n.items).toHaveLength(1)
  })

  it('liveItems is newest-first', () => {
    const n = useNotifications()
    n.info('first'); n.info('second')
    expect(n.liveItems[0].title).toBe('second')
  })

  it('clear empties everything', () => {
    const n = useNotifications()
    n.info('a'); n.danger('b')
    n.clear()
    expect(n.items).toHaveLength(0)
  })
})
