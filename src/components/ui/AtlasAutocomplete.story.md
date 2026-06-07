# AtlasAutocomplete

Filterable select wrapping Vuetify's `VAutocomplete` with brand label/required/error conventions, single or multiple selection.

```vue
<AtlasAutocomplete v-model="value" :items="items" label="Pick one" clearable />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `unknown` | — | Selected value (or array when multiple). Use v-model. |
| `items` | `unknown[]` | `(required)` | Option list. |
| `label` | `string` | — | Field label; gets a * appended when required. |
| `hint` | `string` | — | Helper text below the field. |
| `error` | `string` | — | Error message; sets aria-invalid. |
| `required` | `boolean` | `false` | Marks the field required (label * and aria-required). |
| `disabled` | `boolean` | `false` | Disables the field. |
| `itemTitle` | `string` | `'title'` | Item key used for display text. |
| `itemValue` | `string` | `'value'` | Item key used for the selected value. |
| `multiple` | `boolean` | `false` | Allows selecting multiple items. |
| `clearable` | `boolean` | `false` | Shows a clear button. |
| `placeholder` | `string` | — | Placeholder text. |
| `noFilter` | `boolean` | `false` | Disables client-side filtering (for async search). |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `update:modelValue` | `unknown` | Emitted when the selection changes. |
| `update:search` | `string` | Emitted as the search text changes. |
| `blur` | `FocusEvent` | Emitted on blur. |
| `focus` | `FocusEvent` | Emitted on focus. |
