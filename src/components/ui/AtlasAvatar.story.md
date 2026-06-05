# AtlasAvatar

Thin wrapper over Vuetify's `VAvatar`. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasAvatar color="primary" size="40">AB</AtlasAvatar>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VAvatar props` | `see Vuetify VAvatar` | — | All VAvatar props are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Avatar content (initials, image, or icon). |
