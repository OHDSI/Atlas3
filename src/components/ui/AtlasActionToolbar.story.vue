<script setup lang="ts">
import AtlasActionToolbar from './AtlasActionToolbar.vue'
import AtlasButton from './AtlasButton.vue'
import AtlasIconButton from './AtlasIconButton.vue'
import AtlasBadge from './AtlasBadge.vue'
</script>

<template>
  <Story
    title="AtlasActionToolbar"
    group="components"
  >
    <Variant title="status + actions">
      <AtlasActionToolbar>
        <template #status>
          <AtlasBadge :content="2">
            <AtlasIconButton
              icon="mdi-shape-outline"
              size="sm"
              variant="text"
            />
          </AtlasBadge>
          <AtlasBadge
            :content="3"
            color="warning"
          >
            <AtlasIconButton
              icon="mdi-alert-circle-outline"
              size="sm"
              variant="text"
            />
          </AtlasBadge>
        </template>
        <template #actions>
          <AtlasButton variant="ghost">
            Cancel
          </AtlasButton>
          <AtlasButton variant="secondary">
            Duplicate
          </AtlasButton>
          <AtlasButton variant="primary">
            Save
          </AtlasButton>
        </template>
      </AtlasActionToolbar>
    </Variant>

    <Variant title="status only">
      <AtlasActionToolbar>
        <template #status>
          <AtlasBadge :content="5">
            <AtlasIconButton
              icon="mdi-history"
              size="sm"
              variant="text"
            />
          </AtlasBadge>
        </template>
      </AtlasActionToolbar>
    </Variant>

    <Variant title="actions only">
      <AtlasActionToolbar>
        <template #actions>
          <AtlasButton variant="ghost">
            Cancel
          </AtlasButton>
          <AtlasButton variant="primary">
            Save
          </AtlasButton>
        </template>
      </AtlasActionToolbar>
    </Variant>
  </Story>
</template>
