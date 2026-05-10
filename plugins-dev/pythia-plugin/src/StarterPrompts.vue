<script setup lang="ts">
const STARTERS = [
  'Define a Type 2 Diabetes cohort',
  'What phenotype should I use for chronic kidney disease?',
  'Add patients on statins over age 65',
  'Exclude patients with renal failure',
]

defineEmits<{ pick: [text: string] }>()
</script>

<template>
  <div class="starters">
    <div class="starters-label">
      Try a starter
    </div>
    <div class="starters-list">
      <button
        v-for="prompt in STARTERS"
        :key="prompt"
        type="button"
        class="starter"
        @click="$emit('pick', prompt)"
      >
        {{ prompt }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.starters {
  padding: 8px 12px;
}
.starters-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.starters-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.starter {
  text-align: left;
  padding: 6px 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8125rem;
  color: #374151;
}
.starter:hover {
  background: #f3f4f6;
}
</style>
