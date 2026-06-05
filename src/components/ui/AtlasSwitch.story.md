# AtlasSwitch

Boolean toggle wrapping Vuetify's VSwitch with a semantic tone, optional error, and compact density.

```vue
<AtlasSwitch v-model="enabled" label="Enable notifications" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | `false` | On/off state (use v-model). |
| `label` | `string` | — | Switch label text. |
| `disabled` | `boolean` | `false` | Disables the switch. |
| `tone` | `'primary' \| 'success' \| 'danger'` | `'primary'` | Color tone when the switch is on. |
| `error` | `string` | — | Error message; sets aria-invalid. |
| `required` | `boolean` | `false` | Sets aria-required for assistive tech. |
| `…VSwitch props` | `see Vuetify VSwitch` | — | Additional VSwitch props are forwarded via attrs (density and color are managed internally). |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `update:modelValue` | `boolean` | Emitted when the toggle changes (coerced to a boolean). |

## Guidance

**Do**
- Use a label that reads true when on.
- Use tone to reinforce meaning (e.g. danger for destructive toggles).

**Don't**
- Don't use a switch for actions that need confirmation — use a button.
