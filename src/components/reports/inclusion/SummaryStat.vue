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
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 12px 14px;
  background: #fafbfd;
}
.v-theme--dark .summary-stat {
  border-color: var(--atlas-color-outline-strong);
  background: var(--atlas-color-surface-variant);
}
.summary-stat__label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.v-theme--dark .summary-stat__label {
  color: var(--atlas-color-on-surface-variant);
}
.summary-stat__value {
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.86);
}
.v-theme--dark .summary-stat__value {
  color: var(--atlas-color-on-surface);
}
</style>
