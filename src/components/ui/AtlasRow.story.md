# AtlasRow

Thin wrapper over Vuetify's `VRow`. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasRow><AtlasCol>A</AtlasCol><AtlasCol>B</AtlasCol></AtlasRow>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VRow props` | `see Vuetify VRow` | — | All VRow props (no-gutters, align, justify…) are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Grid columns (typically AtlasCol). |
