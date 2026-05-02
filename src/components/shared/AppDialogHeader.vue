<template>
  <header class="app-dialog-header">
    <div class="app-dialog-header__title-block">
      <div class="app-dialog-header__eyebrow-row">
        <span class="text-eyebrow">{{ eyebrow }}</span>
        <span class="app-dialog-header__accent-rule" />
      </div>
      <h2
        v-if="title"
        class="app-dialog-header__title"
      >
        {{ title }}
      </h2>
      <p
        v-if="subtitle"
        class="app-dialog-header__subtitle"
      >
        {{ subtitle }}
      </p>
    </div>

    <v-btn
      v-if="showClose"
      icon="mdi-close"
      variant="text"
      size="small"
      :aria-label="closeLabel"
      @click="$emit('close')"
    />
  </header>
  <v-divider />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow: string
    title?: string
    subtitle?: string
    showClose?: boolean
    closeLabel?: string
  }>(),
  {
    title: '',
    subtitle: '',
    showClose: false,
    closeLabel: 'Close',
  }
)

defineEmits<{ close: [] }>()
</script>

<style scoped>
.app-dialog-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px 14px;
}

.app-dialog-header__title-block {
  flex: 1;
  min-width: 0;
}

.app-dialog-header__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.app-dialog-header__accent-rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.app-dialog-header__title {
  font-size: 22px;
  font-weight: 500;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-primary));
}

.app-dialog-header__subtitle {
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 4px 0 0;
}
</style>
