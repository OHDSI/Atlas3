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
          :aria-label="`Notifications (${store.unreadCount} unread)`"
          variant="text"
          size="sm"
        />
      </AtlasBadge>
    </template>

    <div class="notification-inbox">
      <div class="notification-inbox__head">
        <span class="notification-inbox__title">Notifications</span>
        <div class="notification-inbox__head-actions">
          <AtlasButton
            variant="ghost"
            size="sm"
            data-testid="notification-mark-read"
            @click="store.markAllRead()"
          >
            Mark all read
          </AtlasButton>
          <AtlasButton
            variant="ghost"
            size="sm"
            data-testid="notification-clear"
            @click="store.clear()"
          >
            Clear
          </AtlasButton>
        </div>
      </div>

      <div
        v-if="store.items.length === 0"
        class="notification-inbox__empty"
      >
        You're all caught up.
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
          close-label="Remove"
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
import { computed, ref, watch } from 'vue'
import AtlasMenu from '@/components/ui/AtlasMenu.vue'
import AtlasBadge from '@/components/ui/AtlasBadge.vue'
import AtlasIconButton from '@/components/ui/AtlasIconButton.vue'
import AtlasButton from '@/components/ui/AtlasButton.vue'
import AtlasFeedbackBody from '@/components/ui/AtlasFeedbackBody.vue'
import { useNotifications } from '@/stores/notifications'

const store = useNotifications()
const open = ref(false)

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
