<script setup lang="ts">
import AtlasMenu from './AtlasMenu.vue'
import AtlasButton from './AtlasButton.vue'
import AtlasList from './AtlasList.vue'
import AtlasListItem from './AtlasListItem.vue'
</script>

<template>
  <Story
    title="AtlasMenu"
    group="tier-b"
  >
    <Variant title="default">
      <AtlasMenu>
        <template #activator="{ props }">
          <AtlasButton v-bind="props">
            Open menu
          </AtlasButton>
        </template>
        <AtlasList>
          <AtlasListItem title="Profile" />
          <AtlasListItem title="Settings" />
          <AtlasListItem title="Sign out" />
        </AtlasList>
      </AtlasMenu>
    </Variant>
  </Story>
</template>
