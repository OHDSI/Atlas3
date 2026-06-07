# AtlasList

Thin wrapper over Vuetify's `VList`. Forwards all attributes and slots unchanged, but pins density to "compact" (a passed density attr is stripped and ignored). Exists so consumers import from atlas-ui rather than Vuetify directly.

```vue
<AtlasList><AtlasListItem>One</AtlasListItem><AtlasListItem>Two</AtlasListItem></AtlasList>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `density` | `string` | `'compact'` | Pinned to compact on the underlying VList; a passed density attr is ignored. |
| `…VList props` | `see Vuetify VList` | — | All other VList props are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `default` | List items (e.g. AtlasListItem children). |
