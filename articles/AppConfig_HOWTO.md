# Application Configuration Guide

## Overview

Atlas3 uses a **runtime configuration** model. Application settings are loaded from a JSON file at startup rather than baked into the build. This means a single build artifact can be deployed to any environment by simply providing the appropriate configuration file alongside it.

---

## How It Works

1. The application ships with sensible **defaults** defined in `src/config/app-config.defaults.ts`.
2. At startup (before the Vue app mounts), `loadAppConfig()` fetches `./config-local.json` relative to `index.html`.
3. If the file exists, its values are **shallow-merged** over the defaults. Any field you specify in the override replaces the default. Array fields (like `authProviders`) replace entirely rather than merging element-by-element.
4. If the file does not exist (404), the app logs a warning and continues with defaults.

This mirrors the legacy Atlas pattern where `config-local.js` sat next to `index.html` and overrode `config/app.js`.

---

## Where to Place `config-local.json`

| Context | Location | Notes |
|---------|----------|-------|
| **Local development** | `public/config-local.json` | Vite serves `public/` at the web root during `npm run dev` |
| **Production deployment** | Next to `index.html` in the deployed output | After `npm run build`, place it inside `dist/` (or wherever the build output is copied on the web server) |
| **Docker** | Mounted or copied into the container at the path where static files are served (e.g., `/srv/atlas/config-local.json`) | See `Dockerfile` and `Caddyfile` for the production file layout |

The file is **gitignored** (`public/config-local.json` is in `.gitignore`). A committed template is available at `public/config-local.example.json` for reference.

---

## Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api.url` | `string` | `"/WebAPI"` | WebAPI base URL. Set to the full URL of your WebAPI instance (e.g., `"http://myserver:8080/WebAPI"`). |
| `userAuthenticationEnabled` | `boolean` | `false` | Whether authentication UI is shown and auth guards are enforced. |
| `enableSkipLogin` | `boolean` | `false` | When `true`, automatically opens the login dialog on unauthenticated access (no manual click required). |
| `enablePermissionManagement` | `boolean` | `true` | Enables the permission assignment UI for entities. |
| `authProviders` | `AuthProvider[]` | `[]` | List of authentication providers available on the login screen. See "Auth Provider Format" below. |
| `refreshTokenThreshold` | `number` | `900000` (15 min) | Milliseconds before token expiration at which the app attempts a silent refresh. |
| `enableIAPSession` | `boolean` | `false` | Enables Google Identity-Aware Proxy session refresh iframe. |
| `enableTermsAndConditions` | `boolean` | `false` | Shows a license/terms-of-service acceptance dialog on first visit. |
| `enablePythia` | `boolean` | `false` | Enables the Pythia AI cohort design advisor plugin (FAB + overlay). |
| `enablePersonCount` | `boolean` | `true` | Enables person count display in cohort reports. |
| `enableTaggingSection` | `boolean` | `false` | Shows the tagging/categorization section in entity editors. |
| `defaultLocale` | `string` | `"en"` | Default language code for the UI. |
| `pollInterval` | `number` | `60000` (60 sec) | Interval in milliseconds for background polling (generation status, etc.). |

---

## Auth Provider Format

Each entry in the `authProviders` array has the following shape:

```json
{
  "name": "Database",
  "url": "user/login/db",
  "ajax": true,
  "icon": "mdi-database",
  "isUseCredentialsForm": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Display name shown on the login screen button. |
| `url` | `string` | Relative path appended to `api.url` for the authentication request. |
| `ajax` | `boolean` | If `true`, login is performed via AJAX (stays on page). If `false`, redirects to an external IdP. |
| `icon` | `string` | Material Design icon identifier (e.g., `"mdi-database"`, `"mdi-microsoft-windows"`). |
| `isUseCredentialsForm` | `boolean` | If `true`, shows username/password fields. If `false`, shows only a button (for SSO/redirect flows). |
| `logoutUrl` | `string?` | Optional URL to redirect to on logout (for external IdP session termination). |

---

## Example: Minimal Development Config

```json
{
  "api": {
    "url": "http://localhost:8080/WebAPI"
  },
  "userAuthenticationEnabled": true,
  "authProviders": [
    {
      "name": "Database",
      "url": "user/login/db",
      "ajax": true,
      "icon": "mdi-database",
      "isUseCredentialsForm": true
    }
  ]
}
```

Only the fields you want to override need to be present. Everything else falls back to defaults.

---

## Example: Production Config with Multiple Providers

```json
{
  "api": {
    "url": "https://ohdsi.example.org/WebAPI"
  },
  "userAuthenticationEnabled": true,
  "enablePermissionManagement": true,
  "enableTermsAndConditions": true,
  "authProviders": [
    {
      "name": "Active Directory",
      "url": "user/login/ad",
      "ajax": true,
      "icon": "mdi-microsoft-windows",
      "isUseCredentialsForm": true
    },
    {
      "name": "OpenID Connect",
      "url": "user/login/openid",
      "ajax": false,
      "icon": "mdi-openid"
    }
  ],
  "pollInterval": 30000,
  "defaultLocale": "en"
}
```

---

## How the Loader Works (Developer Reference)

The implementation lives in three files:

- **`src/config/app-config.types.ts`** — TypeScript interface defining valid configuration fields.
- **`src/config/app-config.defaults.ts`** — Default values used when no override is provided.
- **`src/config/app-config.loader.ts`** — The loader itself, exporting:
  - `loadAppConfig()` — async; fetches and merges config. Called once in `main.ts` before the app initializes.
  - `getAppConfig()` — synchronous getter; returns the resolved config object. Safe to call from any service, composable, or component after startup.

### Startup Sequence

```
loadAppConfig()          ← fetch ./config-local.json, merge with defaults
  → initializeApp()     ← create Vue app, install Pinia/Router/Vuetify
    → mount             ← render UI
```

`getAppConfig()` throws if called before `loadAppConfig()` completes (indicates a module imported config too early).

### Testing

Tests do **not** fetch the config file. A global mock in `tests/setup.ts` provides test defaults:

```ts
vi.mock('@/config/app-config.loader', () => ({
  loadAppConfig: vi.fn().mockResolvedValue(undefined),
  getAppConfig: () => ({
    api: { url: '/WebAPI' },
    userAuthenticationEnabled: false,
    // ... test defaults
  }),
}))
```

Individual tests can override specific values:

```ts
import { getAppConfig } from '@/config/app-config.loader'
vi.mocked(getAppConfig).mockReturnValue({
  ...vi.mocked(getAppConfig)(),
  userAuthenticationEnabled: true,
})
```

---

## Migration from Environment Variables

The following `VITE_*` environment variables are **no longer used** for application configuration:

| Removed Variable | Replaced By |
|-----------------|-------------|
| `VITE_WEBAPI_URL` | `api.url` |
| `VITE_AUTH_ENABLED` | `userAuthenticationEnabled` |
| `VITE_AUTH_SKIP_LOGIN` | `enableSkipLogin` |
| `VITE_AUTH_PROVIDERS` | `authProviders` |
| `VITE_AUTH_REFRESH_THRESHOLD` | `refreshTokenThreshold` |
| `VITE_AUTH_PERMISSION_MANAGEMENT` | `enablePermissionManagement` |
| `VITE_AUTH_IAP_ENABLED` | `enableIAPSession` |
| `VITE_BAO_AGENT_ENABLED` | `enablePythia` |

The `.env.local` file is no longer needed for app config. Build-time variables that remain (`BASE_URL`, `DEV`, `PROD`) are Vite infrastructure concerns unrelated to application settings.
