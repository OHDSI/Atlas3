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
.summary-stat__label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.summary-stat__value {
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.86);
}
</style>
