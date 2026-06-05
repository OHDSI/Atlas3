<template>
  <section class="atlas-docs">
    <h2 class="atlas-docs__title">{{ name }}</h2>
    <p class="atlas-docs__desc">{{ description }}</p>

    <template v-if="props?.length">
      <h3>Props</h3>
      <table class="atlas-docs__table">
        <thead><tr><th>Name</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr v-for="p in props" :key="p.name">
            <td><code>{{ p.name }}</code></td><td><code>{{ p.type }}</code></td>
            <td><code>{{ p.default ?? '—' }}</code></td><td>{{ p.description }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-if="events?.length">
      <h3>Events</h3>
      <table class="atlas-docs__table">
        <thead><tr><th>Name</th><th>Payload</th><th>Description</th></tr></thead>
        <tbody>
          <tr v-for="e in events" :key="e.name">
            <td><code>{{ e.name }}</code></td><td><code>{{ e.payload ?? '—' }}</code></td><td>{{ e.description }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-if="slots?.length">
      <h3>Slots</h3>
      <table class="atlas-docs__table">
        <thead><tr><th>Name</th><th>Description</th></tr></thead>
        <tbody>
          <tr v-for="s in slots" :key="s.name"><td><code>{{ s.name }}</code></td><td>{{ s.description }}</td></tr>
        </tbody>
      </table>
    </template>

    <template v-if="usage">
      <h3>Usage</h3>
      <pre class="atlas-docs__code"><code>{{ usage }}</code></pre>
    </template>

    <div v-if="dos?.length || donts?.length" class="atlas-docs__guidance">
      <div v-if="dos?.length"><h4>✓ Do</h4><ul><li v-for="d in dos" :key="d">{{ d }}</li></ul></div>
      <div v-if="donts?.length"><h4>✗ Don't</h4><ul><li v-for="d in donts" :key="d">{{ d }}</li></ul></div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface PropDoc { name: string; type: string; default?: string; description: string }
interface EventDoc { name: string; payload?: string; description: string }
interface SlotDoc { name: string; description: string }

defineProps<{
  name: string
  description: string
  props?: PropDoc[]
  events?: EventDoc[]
  slots?: SlotDoc[]
  usage?: string
  dos?: string[]
  donts?: string[]
}>()
</script>

<style scoped>
.atlas-docs { color: rgb(var(--v-theme-on-surface)); max-width: 880px; }
.atlas-docs__title { margin: 0 0 4px; }
.atlas-docs__desc { color: rgb(var(--v-theme-on-surface-variant)); margin: 0 0 16px; }
.atlas-docs__table { width: 100%; border-collapse: collapse; margin: 8px 0 20px; font-size: 13px; }
.atlas-docs__table th, .atlas-docs__table td { text-align: left; padding: 6px 10px; border-bottom: 1px solid rgb(var(--v-theme-outline)); }
.atlas-docs__code { background: rgb(var(--v-theme-surface-variant)); padding: 12px; border-radius: var(--atlas-radius-md); overflow-x: auto; }
.atlas-docs__guidance { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
</style>
