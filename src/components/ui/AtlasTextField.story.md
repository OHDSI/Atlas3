# AtlasTextField

Text input wrapping Vuetify's VTextField (or VTextarea when multiline) with Atlas label/required/error conventions, icons, and compact density.

```vue
<AtlasTextField v-model="name" label="Name" placeholder="Enter your name" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string \| number` | — | Field value (use v-model). |
| `label` | `string` | — | Field label; a * is appended when required. |
| `hint` | `string` | — | Helper text shown below the field. |
| `error` | `string` | — | Error message; sets aria-invalid. |
| `required` | `boolean` | `false` | Marks the field required (appends * and sets aria-required). |
| `disabled` | `boolean` | `false` | Disables the field. |
| `readonly` | `boolean` | `false` | Makes the field read-only. |
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'search' \| 'url' \| 'date' \| 'time' \| 'datetime-local' \| 'color'` | `'text'` | Native input type (ignored when multiline). |
| `placeholder` | `string` | — | Placeholder text. |
| `prependIcon` | `string` | — | MDI icon rendered inside the field at the start. |
| `appendIcon` | `string` | — | MDI icon rendered inside the field at the end. |
| `multiline` | `boolean` | `false` | Renders a VTextarea instead of a single-line input. |
| `rows` | `number` | `3` | Number of rows when multiline. |
| `…VTextField props` | `see Vuetify VTextField / VTextarea` | — | Additional props are forwarded via attrs (density is fixed to compact). |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `update:modelValue` | `string \| number` | Emitted when the value changes. |
| `blur` | `FocusEvent` | Emitted on blur. |
| `focus` | `FocusEvent` | Emitted on focus. |

## Slots

| Name | Description |
|------|-------------|
| `…VTextField slots` | All slots are forwarded to the underlying VTextField / VTextarea. |

## Guidance

**Do**
- Always provide a label for accessibility.
- Use the error prop to surface validation messages.

**Don't**
- Don't use multiline for single-line values like names.
