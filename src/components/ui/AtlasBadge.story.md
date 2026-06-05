# AtlasBadge

Thin wrapper over Vuetify's `VBadge`. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasBadge :content="3" color="error"><AtlasIcon icon="mdi-bell" /></AtlasBadge>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VBadge props` | `see Vuetify VBadge` | — | All VBadge props are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | The element the badge is attached to. |
| `badge` | Custom badge content. |
