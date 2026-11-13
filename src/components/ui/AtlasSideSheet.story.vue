<script setup lang="ts">
import { ref } from 'vue'
import AtlasSideSheet from './AtlasSideSheet.vue'
import AtlasButton from './AtlasButton.vue'
import AtlasMenu from './AtlasMenu.vue'
import AtlasList from './AtlasList.vue'
import AtlasListItem from './AtlasListItem.vue'

const open = ref(false)
const nestedOpen = ref(false)
</script>

<template>
  <Story
    title="AtlasSideSheet"
    group="components"
  >
    <Variant title="nested with menu">
      <AtlasButton @click="open = true">
        Open side sheet
      </AtlasButton>
      <AtlasSideSheet
        v-model="open"
        aria-label="Outer sheet"
      >
        <div style="padding: 24px; display: flex; gap: 12px">
          <AtlasMenu>
            <template #activator="{ props }">
              <AtlasButton v-bind="props">
                Open menu
              </AtlasButton>
            </template>
            <AtlasList>
              <AtlasListItem title="Renders above the sheet" />
            </AtlasList>
          </AtlasMenu>
          <AtlasButton @click="nestedOpen = true">
            Open nested sheet
          </AtlasButton>
        </div>
        <AtlasSideSheet
          v-model="nestedOpen"
          width="60vw"
          aria-label="Nested sheet"
        >
          <div style="padding: 24px">
            Nested sheet — Escape closes only this one.
          </div>
        </AtlasSideSheet>
      </AtlasSideSheet>
    </Variant>
  </Story>
</template>
