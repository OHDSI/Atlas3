# AtlasTooltip

Thin wrapper over Vuetify's `VTooltip`. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasTooltip text="Hello"><template #activator="{ props }"><AtlasButton v-bind="props">Hover</AtlasButton></template></AtlasTooltip>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VTooltip props` | `see Vuetify VTooltip` | — | All VTooltip props (text, location, open-delay…) are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `activator` | Element that triggers the tooltip; receives { props } to bind. |
| `default` | Tooltip content (overrides the text prop). |
