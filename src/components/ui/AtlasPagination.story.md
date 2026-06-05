# AtlasPagination

Thin wrapper over Vuetify's `VPagination`. Forwards all attributes and slots unchanged, but pins density to "compact" (a passed density attr is stripped and ignored).

```vue
<AtlasPagination v-model="page" :length="5" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `density` | `string` | `'compact'` | Pinned to compact on the underlying VPagination; a passed density attr is stripped and ignored. |
| `…VPagination props` | `see Vuetify VPagination` | — | All other VPagination props (length, v-model, total-visible…) are forwarded via attrs. |

## Slots

| Name | Description |
|------|-------------|
| `item` | Custom rendering for an individual page item. |
