# AtlasContainer

Thin wrapper over Vuetify's `VContainer` layout element. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasContainer>Page content</AtlasContainer>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VContainer props` | `see Vuetify VContainer` | — | All VContainer props are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Container content. |
