# AtlasCol

Thin wrapper over Vuetify's `VCol` grid column. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasRow><AtlasCol cols="6">Left</AtlasCol><AtlasCol cols="6">Right</AtlasCol></AtlasRow>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VCol props` | `see Vuetify VCol` | — | All VCol props are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Column content. |
