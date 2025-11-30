<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        :loading="loading"
        :disabled="loading"
        variant="text"
        icon
        data-testid="language-selector"
        @click.shift.exact="handleShiftClick"
      >
        <v-icon>mdi-translate</v-icon>
      </v-btn>
    </template>

    <v-list>
      <v-list-item
        v-for="locale in availableLocales"
        :key="locale.code"
        :active="currentLocale === locale.code"
        :disabled="loading"
        :data-locale="locale.code"
        @click="handleLocaleChange(locale.code)"
      >
        <v-list-item-title>{{ locale.name }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { useLocaleStore } from '@/stores/locale'

const { locale: currentLocale, availableLocales, changeLocale, loading } = useI18n()
const localeStore = useLocaleStore()

async function handleLocaleChange(newLocale: string) {
  if (newLocale !== currentLocale.value) {
    await changeLocale(newLocale)
  }
}

// Manual cache clear with shift+click
function handleShiftClick(event: MouseEvent) {
  if (event.shiftKey) {
    event.preventDefault()
    event.stopPropagation()
    localeStore.clearCache()
    console.log('[i18n] Translation cache cleared')
  }
}
</script>
