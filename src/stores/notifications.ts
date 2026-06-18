/**
 * Notifications Store
 *
 * Single source of truth for transient notifications. Views call
 * notify.success/info/warning/danger; AtlasNotificationHost renders the live
 * toast stack and a NavBar bell exposes history. In-memory only.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger'

export interface NotificationAction {
  label: string
  handler: () => void
}

export interface NotifyOptions {
  message?: string
  timeout?: number
  actions?: NotificationAction[]
}

export interface NotificationItem {
  id: number
  severity: NotificationSeverity
  title: string
  message?: string
  timeout: number
  actions: NotificationAction[]
  read: boolean
  dismissed: boolean
  createdAt: number
}

const DEFAULT_TIMEOUT: Record<NotificationSeverity, number> = {
  success: 5000,
  info: 5000,
  warning: -1,
  danger: -1,
}

export const useNotifications = defineStore('notifications', () => {
  const items = ref<NotificationItem[]>([])
  let nextId = 1

  const liveItems = computed(() =>
    items.value.filter(i => !i.dismissed).slice().reverse()
  )
  const unreadCount = computed(() => items.value.filter(i => !i.read).length)

  function push(severity: NotificationSeverity, title: string, opts: NotifyOptions = {}): number {
    const id = nextId++
    items.value.push({
      id,
      severity,
      title,
      message: opts.message,
      timeout: opts.timeout ?? DEFAULT_TIMEOUT[severity],
      actions: opts.actions ?? [],
      read: false,
      dismissed: false,
      createdAt: Date.now(),
    })
    return id
  }

  const success = (title: string, opts?: NotifyOptions) => push('success', title, opts)
  const info = (title: string, opts?: NotifyOptions) => push('info', title, opts)
  const warning = (title: string, opts?: NotifyOptions) => push('warning', title, opts)
  const danger = (title: string, opts?: NotifyOptions) => push('danger', title, opts)

  function dismiss(id: number) {
    const item = items.value.find(i => i.id === id)
    if (item) item.dismissed = true
  }
  function remove(id: number) {
    items.value = items.value.filter(i => i.id !== id)
  }
  function markRead(id: number) {
    const item = items.value.find(i => i.id === id)
    if (item) item.read = true
  }
  function markAllRead() {
    items.value.forEach(i => { i.read = true })
  }
  function clear() {
    items.value = []
  }

  return { items, liveItems, unreadCount, success, info, warning, danger, dismiss, remove, markRead, markAllRead, clear }
})
