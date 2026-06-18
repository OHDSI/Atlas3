<!-- src/components/ui/AtlasNotificationHost.vue -->
<template>
  <div
    class="atlas-notification-host"
    role="region"
    aria-label="Notifications"
    data-testid="notification-host"
  >
    <transition-group name="atlas-toast">
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
      <div
        v-for="item in visible"
        :key="item.id"
        class="atlas-notification-host__item"
        :role="item.severity === 'danger' ? 'alert' : 'status'"
        :aria-live="item.severity === 'danger' ? 'assertive' : 'polite'"
        @mouseenter="pause(item.id)"
        @mouseleave="resume(item)"
        @focusin="pause(item.id)"
        @focusout="resume(item)"
      >
        <AtlasFeedbackBody
          :severity="item.severity"
          :title="item.title"
          elevated
          closable
          @close="store.dismiss(item.id)"
        >
          <template v-if="item.message">
            {{ item.message }}
          </template>
          <template
            v-if="item.actions.length"
            #actions
          >
            <AtlasButton
              v-for="(a, i) in item.actions"
              :key="i"
              size="sm"
              variant="tonal"
              @click="runAction(item, a)"
            >
              {{ a.label }}
            </AtlasButton>
          </template>
        </AtlasFeedbackBody>
      </div>
    </transition-group>

    <button
      v-if="overflow > 0"
      type="button"
      class="atlas-notification-host__more"
      data-testid="notification-more"
      @click="store.openInbox()"
    >
      +{{ overflow }} more
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import AtlasFeedbackBody from './AtlasFeedbackBody.vue'
import AtlasButton from './AtlasButton.vue'
import { useNotifications, type NotificationItem, type NotificationAction } from '@/stores/notifications'

const MAX_VISIBLE = 3
const store = useNotifications()

const visible = computed(() => store.liveItems.slice(0, MAX_VISIBLE))
const overflow = computed(() => Math.max(0, store.liveItems.length - MAX_VISIBLE))

const timers = new Map<number, ReturnType<typeof setTimeout>>()

function arm(item: NotificationItem) {
  if (item.timeout <= 0 || timers.has(item.id)) return
  timers.set(item.id, setTimeout(() => {
    timers.delete(item.id)
    store.dismiss(item.id)
  }, item.timeout))
}
function pause(id: number) {
  const t = timers.get(id)
  if (t) { clearTimeout(t); timers.delete(id) }
}
function resume(item: NotificationItem) {
  arm(item)
}
function runAction(item: NotificationItem, action: NotificationAction) {
  action.handler()
  store.dismiss(item.id)
}

watch(visible, list => list.forEach(arm), { immediate: true })

onUnmounted(() => {
  timers.forEach(t => clearTimeout(t))
  timers.clear()
})
</script>

<style scoped>
.atlas-notification-host {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: var(--atlas-z-snackbar, 3000);
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}
.atlas-notification-host__item {
  pointer-events: auto;
  min-width: 360px;
  max-width: 420px;
}
.atlas-notification-host__more {
  pointer-events: auto;
  align-self: flex-end;
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: var(--atlas-radius-md);
  padding: 4px 10px;
  cursor: pointer;
}
.atlas-toast-enter-active,
.atlas-toast-leave-active { transition: all var(--atlas-motion-med); }
.atlas-toast-enter-from,
.atlas-toast-leave-to { opacity: 0; transform: translateX(16px); }
</style>
