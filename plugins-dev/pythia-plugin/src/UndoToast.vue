<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { dismissLastNavigation, lastNavigation, undoLastNavigation } from './chat-session'

const TIMEOUT_MS = 5000

const now = ref(Date.now())
let tickHandle: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickHandle = setInterval(() => {
    now.value = Date.now()
  }, 250)
})
onUnmounted(() => {
  if (tickHandle !== null) clearInterval(tickHandle)
})

const visible = computed(() => {
  const ln = lastNavigation.value
  if (!ln) return false
  if (!ln.previous) return false
  return now.value - ln.at < TIMEOUT_MS
})

const label = computed(() => {
  const ln = lastNavigation.value
  if (!ln) return ''
  return `Pythia opened ${ln.toName}`
})

function onUndo() {
  undoLastNavigation()
}

function onDismiss() {
  dismissLastNavigation()
}
</script>

<template>
  <div
    v-if="visible"
    class="undo-toast"
    role="status"
    aria-live="polite"
  >
    <span class="undo-toast__label">{{ label }}</span>
    <button
      type="button"
      class="undo-toast__action"
      @click="onUndo"
    >
      Undo
    </button>
    <button
      type="button"
      class="undo-toast__dismiss"
      aria-label="Dismiss"
      @click="onDismiss"
    >
      &times;
    </button>
  </div>
</template>

<style scoped>
.undo-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  margin: 4px 8px 0;
  background: #1f2937;
  color: #f9fafb;
  border-radius: 6px;
  font-size: 0.75rem;
}
.undo-toast__label { flex: 1 1 auto; }
.undo-toast__action {
  background: transparent;
  border: 1px solid #6b7280;
  color: #f9fafb;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.75rem;
  cursor: pointer;
}
.undo-toast__action:hover { background: rgba(255, 255, 255, 0.1); }
.undo-toast__dismiss {
  background: transparent;
  border: 0;
  color: #9ca3af;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}
.undo-toast__dismiss:hover { color: #f9fafb; }
</style>
