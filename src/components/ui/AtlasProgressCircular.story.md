# AtlasProgressCircular

Thin wrapper over Vuetify's `VProgressCircular`. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasProgressCircular :model-value="60" :size="32" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VProgressCircular props` | `see Vuetify VProgressCircular` | — | All VProgressCircular props are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Content rendered inside the circle (e.g. a percentage label). |
