<template>
  <v-theme-provider
    :theme="theme"
    with-background
  >
    <div style="padding: 24px; max-width: 800px; margin: 0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h1 style="color: rgb(var(--v-theme-primary)); margin:0;">
          Hello World Plugin
        </h1>
        <AtlasButton
          variant="ghost"
          size="sm"
          @click="theme = theme === 'dark' ? 'light' : 'dark'"
        >
          {{ theme === 'dark' ? '☾ Dark' : '☀ Light' }}
        </AtlasButton>
      </div>

      <AtlasAlert
        v-if="authContext?.isAuthenticated"
        severity="info"
        style="margin:16px 0;"
      >
        Welcome, {{ authContext.user?.username }}!
      </AtlasAlert>

      <AtlasCard
        padding="md"
        style="margin-bottom:16px;"
      >
        <h3 style="margin-top:0;">
          Host communication
        </h3>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <AtlasButton @click="sendNotification">
            Show notification
          </AtlasButton>
          <AtlasButton
            variant="secondary"
            @click="requestNavigation"
          >
            Navigate home
          </AtlasButton>
          <AtlasButton
            variant="tonal"
            @click="requestData"
          >
            Request data
          </AtlasButton>
        </div>
      </AtlasCard>

      <AtlasCard padding="md">
        <h3 style="margin-top:0;">
          Plugin state
        </h3>
        <p>Counter: {{ counter }}</p>
        <div style="display:flex; gap:8px;">
          <AtlasButton
            size="sm"
            @click="counter++"
          >
            Increment
          </AtlasButton>
          <AtlasButton
            size="sm"
            variant="secondary"
            @click="counter--"
          >
            Decrement
          </AtlasButton>
        </div>
        <pre
          v-if="lastMessage"
          style="margin-top:12px;"
        >{{ lastMessage }}</pre>
      </AtlasCard>
    </div>
  </v-theme-provider>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { AtlasButton, AtlasCard, AtlasAlert } from '@ohdsi/atlas-ui';

interface AuthContext { isAuthenticated: boolean; user?: { id: number; username: string; permissions: string[] } }
interface MessageBus { send: (type: string, payload: unknown) => void; request: (type: string, payload: unknown) => Promise<unknown> }

const props = defineProps<{ name: string; authContext: AuthContext; messageBus: MessageBus }>();
const theme = ref<'light' | 'dark'>('light');
const counter = ref(0);
const lastMessage = ref('');

function sendNotification() {
  props.messageBus.send('notification:show', { message: 'Hello from the plugin!', type: 'info', duration: 3000 });
  lastMessage.value = 'Sent notification:show';
}
function requestNavigation() {
  props.messageBus.send('navigation:request', { path: '/' });
  lastMessage.value = 'Sent navigation:request';
}
async function requestData() {
  try {
    const data = await props.messageBus.request('data:request', { resource: 'user-preferences' });
    lastMessage.value = `Received: ${JSON.stringify(data)}`;
  } catch (e: unknown) {
    lastMessage.value = `Error: ${e instanceof Error ? e.message : 'unknown'}`;
  }
}
</script>
