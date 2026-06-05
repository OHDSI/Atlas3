# AtlasMenu

Thin wrapper over Vuetify's `VMenu`. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasMenu><template #activator="{ props }"><AtlasButton v-bind="props">Open</AtlasButton></template>...</AtlasMenu>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VMenu props` | `see Vuetify VMenu` | — | All VMenu props are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `activator` | Element that toggles the menu; receives { props } to bind. |
| `default` | Menu content (typically a list). |
