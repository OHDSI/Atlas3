<template>
  <AtlasMenu>
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
        <AtlasIcon>mdi-translate</AtlasIcon>
      </v-btn>
    </template>

    <AtlasList>
      <AtlasListItem
        v-for="locale in availableLocales"
        :key="locale.code"
        :active="currentLocale === locale.code"
        :disabled="loading"
        :data-locale="locale.code"
        @click="handleLocaleChange(locale.code)"
      >
        <v-list-item-title>
          {{ locale.name }}
        </v-list-item-title>
      </AtlasListItem>
    </AtlasList>
  </AtlasMenu>
</template>

<script setup lang="ts">
import { AtlasIcon, AtlasList, AtlasListItem, AtlasMenu } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useLocaleStore } from '@/stores/locale'
import { logger } from '@/utils/logger'

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
    logger.info('i18n', 'Translation cache cleared')
  }
}
</script>
