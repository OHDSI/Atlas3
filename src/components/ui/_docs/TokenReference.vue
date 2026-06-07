<template>
  <div class="tok">
    <h3>Color — light / dark</h3>
    <div class="tok__grid">
      <div
        v-for="key in colorKeys"
        :key="key"
        class="tok__row"
      >
        <span class="tok__name"><code>--atlas-color-{{ kebab(key) }}</code></span>
        <span
          class="tok__sw"
          :style="{ background: tokens.color[key] }"
          title="light"
        />
        <span
          class="tok__sw"
          :style="{ background: tokens.colorDark[key] }"
          title="dark"
        />
      </div>
    </div>

    <h3>Radius / Spacing</h3>
    <ul>
      <li
        v-for="(v, k) in tokens.radius"
        :key="'r'+k"
      >
        <code>--atlas-radius-{{ k }}</code>: {{ v }}
      </li>
      <li
        v-for="(v, k) in tokens.spacing"
        :key="'s'+k"
      >
        <code>--atlas-spacing-{{ k }}</code>: {{ v }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { tokens } from '@/ui/tokens'
const colorKeys = Object.keys(tokens.color) as (keyof typeof tokens.color)[]
const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
</script>

<style scoped>
.tok { color: rgb(var(--v-theme-on-surface)); }
.tok__row { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
.tok__name { width: 320px; }
.tok__sw { width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgb(var(--v-theme-outline)); display: inline-block; }
</style>
