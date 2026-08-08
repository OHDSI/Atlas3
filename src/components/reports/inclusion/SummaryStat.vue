<template>
  <div class="summary-stat">
    <div class="summary-stat__label">
      {{ label }}
    </div>
    <div class="summary-stat__value">
      {{ value }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string }>()
</script>

<style scoped>
.summary-stat {
  border: 1px solid var(--atlas-color-outline-strong);
  border-radius: 8px;
  padding: 12px 14px;
  background: var(--atlas-color-surface-variant);
}
.summary-stat__label {
  font-size: 12px;
  color: var(--atlas-color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.summary-stat__value {
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
  color: var(--atlas-color-on-surface);
}
</style>
