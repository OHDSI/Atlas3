<script setup lang="ts">
import ChatPanel from './ChatPanel.vue'
import type { AuthContext, MessageBus, Translator } from './main'

const props = defineProps<{
  name: string
  authContext: AuthContext
  messageBus: MessageBus
  t?: Translator
  getToken?: () => Promise<string>
}>()

const t: Translator = props.t ?? ((_key: string, defaultValue?: string) => defaultValue ?? _key)
</script>

<template>
  <div class="cohort-agent-root">
    <ChatPanel
      :auth-context="authContext"
      :message-bus="messageBus"
      :t="t"
      :get-token="getToken"
    />
  </div>
</template>

<style scoped>
.cohort-agent-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  font-family: var(--app-font-family, system-ui, -apple-system, BlinkMacSystemFont, sans-serif);
  background: var(--cohort-agent-bg, #ffffff);
  color: var(--cohort-agent-fg, #1f2937);
}
</style>
