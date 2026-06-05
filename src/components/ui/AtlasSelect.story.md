# AtlasSelect

Dropdown select wrapping Vuetify's VSelect with Atlas label/required/error conventions and compact density.

```vue
<AtlasSelect v-model="choice" :items="items" label="Pick one" clearable />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `unknown` | — | Selected value(s) (use v-model). An array when multiple. |
| `items` | `unknown[]` | — | Options to choose from (required). |
| `label` | `string` | — | Field label; a * is appended when required. |
| `hint` | `string` | — | Helper text shown below the field. |
| `error` | `string` | — | Error message; sets aria-invalid. |
| `required` | `boolean` | `false` | Marks the field required (appends * and sets aria-required). |
| `disabled` | `boolean` | `false` | Disables the select. |
| `itemTitle` | `string` | `'title'` | Key used as the option label in items. |
| `itemValue` | `string` | `'value'` | Key used as the option value in items. |
| `multiple` | `boolean` | `false` | Allows selecting multiple values. |
| `clearable` | `boolean` | `false` | Shows a clear button to reset the selection. |
| `placeholder` | `string` | — | Placeholder shown when no value is selected. |
| `…VSelect props` | `see Vuetify VSelect` | — | Additional VSelect props are forwarded via attrs (density is fixed to compact). |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `update:modelValue` | `unknown` | Emitted when the selection changes. |
| `blur` | `FocusEvent` | Emitted on blur. |
| `focus` | `FocusEvent` | Emitted on focus. |

## Guidance

**Do**
- Provide a descriptive label.
- Use multiple only when several values make sense.

**Don't**
- Don't omit items — it is required.
