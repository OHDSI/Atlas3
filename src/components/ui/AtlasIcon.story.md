# AtlasIcon

Thin wrapper over Vuetify's `VIcon`. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasIcon icon="mdi-bell" color="primary" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `…VIcon props` | `see Vuetify VIcon` | — | All VIcon props are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Icon name when not passed via the icon prop. |
