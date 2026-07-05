<!-- src/components/shared/NotificationInbox.vue -->
<template>
  <AtlasMenu
    v-model="open"
    :close-on-content-click="false"
    location="bottom end"
  >
    <template #activator="{ props: menuProps }">
      <AtlasBadge
        :content="store.unreadCount"
        :model-value="store.unreadCount > 0"
        color="error"
        data-testid="notification-bell"
      >
        <AtlasIconButton
          v-bind="menuProps"
          icon="mdi-bell-outline"
          :aria-label="t('components.notifications.bellAriaLabel', 'Notifications ({count} unread)', { count: store.unreadCount }).value"
          variant="text"
          size="sm"
        />
      </AtlasBadge>
    </template>

    <div class="notification-inbox">
      <div class="notification-inbox__head">
        <span class="notification-inbox__title">{{ t('components.notifications.heading', 'Notifications').value }}</span>
        <div class="notification-inbox__head-actions">
          <AtlasButton
            variant="ghost"
            size="sm"
            data-testid="notification-mark-read"
            @click="store.markAllRead()"
          >
            {{ t('components.notifications.markAllRead', 'Mark all read').value }}
          </AtlasButton>
          <AtlasButton
            variant="ghost"
            size="sm"
            data-testid="notification-clear"
            @click="store.clear()"
          >
            {{ t('components.notifications.clear', 'Clear').value }}
          </AtlasButton>
        </div>
      </div>

      <div
        v-if="store.items.length === 0"
        class="notification-inbox__empty"
      >
        {{ t('components.notifications.allCaughtUp', "You're all caught up.").value }}
      </div>

      <div
        v-else
        class="notification-inbox__list"
      >
        <AtlasFeedbackBody
          v-for="item in history"
          :key="item.id"
          :severity="item.severity"
          :title="item.title"
          closable
          :close-label="t('components.notifications.remove', 'Remove').value"
          @close="store.remove(item.id)"
        >
          <template v-if="item.message">
            {{ item.message }}
          </template>
        </AtlasFeedbackBody>
      </div>
    </div>
  </AtlasMenu>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import AtlasMenu from '@/components/ui/AtlasMenu.vue'
import AtlasBadge from '@/components/ui/AtlasBadge.vue'
import AtlasIconButton from '@/components/ui/AtlasIconButton.vue'
import AtlasButton from '@/components/ui/AtlasButton.vue'
import AtlasFeedbackBody from '@/components/ui/AtlasFeedbackBody.vue'
import { useNotifications } from '@/stores/notifications'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const store = useNotifications()
const open = computed({ get: () => store.inboxOpen, set: v => { store.inboxOpen = v } })

const history = computed(() => store.items.slice().reverse())

watch(open, isOpen => {
  if (isOpen) store.markAllRead()
})
</script>

<style scoped>
.notification-inbox {
  width: 380px;
  max-width: 90vw;
  background: rgb(var(--v-theme-surface));
  border-radius: var(--atlas-radius-lg);
}
.notification-inbox__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.notification-inbox__title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}
.notification-inbox__head-actions { display: flex; gap: 4px; }
.notification-inbox__empty {
  padding: 28px 16px;
  text-align: center;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.notification-inbox__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  max-height: 60vh;
  overflow-y: auto;
}
</style>
