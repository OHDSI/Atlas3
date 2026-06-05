# AtlasProgressLinear

Thin wrapper over Vuetify's `VProgressLinear`. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasProgressLinear :model-value="40" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VProgressLinear props` | `see Vuetify VProgressLinear` | — | All VProgressLinear props are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Content rendered inside the bar; receives { value }. |
