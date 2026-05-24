<template>
  <div class="builder-action-toolbar">
    <div
      v-if="$slots.status"
      class="builder-action-toolbar__status"
    >
      <slot name="status" />
    </div>
    <span
      v-if="$slots.status && $slots.actions"
      class="builder-action-toolbar__divider"
      aria-hidden="true"
    />
    <div
      v-if="$slots.actions"
      class="builder-action-toolbar__actions"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Shared action-row layout for every builder/editor page (cohort, pathway,
// incidence rate, characterization, feature analysis). Two slots, with a
// 1px vertical divider auto-inserted between them when both are present.
//
//   <BuilderActionToolbar>
//     <template #status><!-- left-aligned, metadata icons --></template>
//     <template #actions><!-- right-aligned, primary actions --></template>
//   </BuilderActionToolbar>
//
// Slot contract (keep across all builders so the eye finds them in the
// same place):
//
// #status (left → right):
//   1. concept-sets badge (icon + count)
//   2. validation badge (icon + count, color-coded by severity)
//   3. versions badge (icon + count)
//   4. tags badge (icon + count)
//   - Each is an icon-only AtlasIconButton wrapped in an AtlasBadge.
//   - size="sm", variant="text", color="primary".
//
// #actions (right → left of the row, left → right within the slot):
//   1. Cancel / Back-to-current
//   2. Import (icon-only AtlasIconButton)
//   3. Export (icon-only AtlasIconButton or AtlasMenu activator)
//   4. Duplicate (labeled AtlasButton, variant="secondary")
//   5. Delete (labeled AtlasButton, variant="ghost", tone="danger")
//   6. Save (labeled AtlasButton, variant="primary")
</script>

<style scoped lang="scss">
.builder-action-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.builder-action-toolbar__status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.builder-action-toolbar__divider {
  width: 1px;
  height: 24px;
  background: rgba(0, 0, 0, 0.12);
  margin: 0 4px;
  flex-shrink: 0;
}

.builder-action-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
