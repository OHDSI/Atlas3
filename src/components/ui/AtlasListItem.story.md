# AtlasListItem

Thin wrapper over Vuetify's `VListItem`. Forwards all attributes and slots unchanged, but pins density to "compact" (a passed density attr is stripped and ignored). Exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasListItem title="Inbox" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `density` | `string` | `'compact'` | Pinned to compact on the underlying VListItem; a passed density attr is ignored. |
| `…VListItem props` | `see Vuetify VListItem` | — | All other VListItem props are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | Item content. |
| `prepend` | Leading content such as an icon or avatar. |
| `append` | Trailing content such as an icon or action. |
