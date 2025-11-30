<template>
  <div class="hello-world-plugin">
    <div class="plugin-header">
      <h1>Hello World Plugin</h1>
      <p v-if="authContext?.isAuthenticated">
        Welcome, {{ authContext.user?.username }}!
      </p>
    </div>

    <div class="plugin-content">
      <h2>Plugin Features Demo</h2>
      
      <div class="feature-section">
        <h3>Authentication Status</h3>
        <p>
          <strong>Authenticated:</strong> 
          {{ authContext?.isAuthenticated ? 'Yes' : 'No' }}
        </p>
        <p v-if="authContext?.user">
          <strong>User ID:</strong> {{ authContext.user.id }}<br>
          <strong>Username:</strong> {{ authContext.user.username }}<br>
          <strong>Permissions:</strong> {{ authContext.user.permissions.join(', ') }}
        </p>
      </div>

      <div class="feature-section">
        <h3>Host Communication</h3>
        <button @click="sendNotification">
          Show Notification
        </button>
        <button @click="requestNavigation">
          Navigate to Home
        </button>
        <button @click="requestData">
          Request Data from Host
        </button>
      </div>

      <div class="feature-section">
        <h3>Plugin State</h3>
        <p>Counter: {{ counter }}</p>
        <button @click="counter++">
          Increment
        </button>
        <button @click="counter--">
          Decrement
        </button>
      </div>

      <div
        v-if="lastMessage"
        class="feature-section"
      >
        <h3>Last Message</h3>
        <pre>{{ lastMessage }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface AuthContext {
  isAuthenticated: boolean;
  user?: {
    id: number;
    username: string;
    permissions: string[];
  };
}

interface MessageBus {
  send: (type: string, payload: unknown) => void;
  request: (type: string, payload: unknown) => Promise<unknown>;
}

const props = defineProps<{
  name: string;
  authContext: AuthContext;
  messageBus: MessageBus;
}>();

const counter = ref(0);
const lastMessage = ref<string>('');

function sendNotification() {
  props.messageBus.send('notification:show', {
    message: 'Hello from the plugin!',
    type: 'info',
    duration: 3000,
  });
  lastMessage.value = 'Sent notification:show message';
}

function requestNavigation() {
  props.messageBus.send('navigation:request', {
    path: '/',
  });
  lastMessage.value = 'Sent navigation:request message';
}

async function requestData() {
  try {
    const data = await props.messageBus.request('data:request', {
      resource: 'user-preferences',
    });
    lastMessage.value = `Received data: ${JSON.stringify(data, null, 2)}`;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    lastMessage.value = `Error: ${errorMessage}`;
  }
}

onMounted(() => {
  console.log('[Hello World Plugin] Mounted successfully');
  console.log('[Hello World Plugin] Auth Context:', props.authContext);
});
</script>

<style scoped>
.hello-world-plugin {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.plugin-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #1976d2;
}

.plugin-header h1 {
  color: #1976d2;
  margin: 0 0 0.5rem 0;
}

.feature-section {
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.feature-section h3 {
  margin-top: 0;
  color: #424242;
}

button {
  margin: 0.5rem 0.5rem 0.5rem 0;
  padding: 0.5rem 1rem;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

button:hover {
  background: #1565c0;
}

pre {
  background: white;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.75rem;
}
</style>
