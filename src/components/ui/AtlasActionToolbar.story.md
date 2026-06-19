# AtlasActionToolbar

The shared action-row layout used at the top of every builder/editor page (cohort, pathway, incidence rate, characterization, feature analysis). It exposes two slots — left-aligned `status` and right-aligned `actions` — and auto-inserts a thin vertical divider between them when both are present, so the eye finds metadata and primary actions in the same place across screens.

```vue
<AtlasActionToolbar>
  <template #status>
    <!-- left-aligned: concept-set / validation / version / tag badges -->
  </template>
  <template #actions>
    <!-- right-aligned: Cancel, Import, Export, Duplicate, Delete, Save -->
  </template>
</AtlasActionToolbar>
```

## Slots

| Name | Description |
|------|-------------|
| `status` | Left-aligned metadata, typically icon-only `AtlasIconButton`s wrapped in `AtlasBadge`s. |
| `actions` | Right-aligned primary actions. |

The divider only renders when both `status` and `actions` slots have content.
