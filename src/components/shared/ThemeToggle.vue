<template>
  <AtlasMenu location="bottom end">
    <template #activator="{ props }">
      <AtlasIconButton
        v-bind="props"
        :icon="activeIcon"
        variant="text"
        size="sm"
        density="compact"
        :aria-label="t('theme.label', 'Theme').value"
        data-testid="nav-theme-toggle"
      />
    </template>
    <AtlasList>
      <AtlasListItem
        v-for="option in options"
        :key="option.mode"
        :active="theme.preference === option.mode"
        :data-testid="`theme-option-${option.mode}`"
        @click="select(option.mode)"
      >
        <template #prepend>
          <AtlasIcon>{{ option.icon }}</AtlasIcon>
        </template>
        <v-list-item-title>
          {{ option.label }}
        </v-list-item-title>
      </AtlasListItem>
    </AtlasList>
  </AtlasMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasIcon, AtlasIconButton, AtlasList, AtlasListItem, AtlasMenu } from '@/components/ui'
import { useThemeStore, type ThemeMode } from '@/stores/theme'
import { useI18n } from '@/composables/useI18n'

defineOptions({ name: 'ThemeToggle' })

const theme = useThemeStore()
const { t } = useI18n()

const options = computed(() => [
  { mode: 'light' as ThemeMode, icon: 'mdi-white-balance-sunny', label: t('theme.light', 'Light').value },
  { mode: 'dark' as ThemeMode, icon: 'mdi-weather-night', label: t('theme.dark', 'Dark').value },
  { mode: 'system' as ThemeMode, icon: 'mdi-monitor', label: t('theme.system', 'System').value },
])

const activeIcon = computed(() =>
  theme.resolved === 'dark' ? 'mdi-weather-night' : 'mdi-white-balance-sunny',
)

function select(mode: ThemeMode) {
  theme.setPreference(mode)
}

defineExpose({ select })
</script>
