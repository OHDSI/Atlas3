# Run As (Impersonation)

Atlas supports an administrator running the application as another user to
troubleshoot access and permission behavior.

## Permission

The active user must have the WebAPI `admin:run-as` permission. Atlas only
shows **Run As** in the account menu when that permission is present. WebAPI
enforces the same permission for `POST /user/runas`.

## Starting a Run-As session

1. Select the account menu in the top navigation bar.
2. Select **Run As**.
3. Enter the target user's login and submit the dialog.

Atlas submits the WebAPI-compatible form request:

```text
POST /user/runas
Content-Type: application/x-www-form-urlencoded

login=<target-login>
```

WebAPI returns a JWT for the target user. Atlas then requests `/user/me` with
that token and replaces the displayed user, permissions, and entity access.

## Nested sessions and ending Run As

Run-As sessions are nested. A user who is running as a user with
`admin:run-as` may run as another user.

Atlas stores a stack of JWTs in `sessionStorage` for the current browser tab:

```text
[original user JWT, first target JWT, current target JWT]
```

The active token is always the top item. Selecting **End Run As** pops one
token and resolves `/user/me` again. Repeating **End Run As** returns through
each prior identity. The action is shown whenever the stack is non-empty.

## Browser and tab behavior

The Run-As JWT stack is isolated to the current tab:

- It is stored in `sessionStorage`, not `localStorage` or a cookie.
- It is removed when the tab/browser session ends.
- It is not synchronized to other tabs.
- Normal login state in other tabs is not changed by Run As.
- While Run As is active, this tab ignores normal-token changes received from
  other tabs.

The normal Atlas token remains in its existing storage while a tab runs as
another user. Token refresh updates only the current Run-As stack entry.

## Error and expiry handling

Atlas displays errors returned by WebAPI, including permission denial and a
missing target user. If a token cannot be used when ending a Run-As session,
Atlas restores the currently active token and leaves the stack unchanged rather
than presenting a mismatched identity and token. If the active session expires,
the normal authentication expiry flow clears the authentication state and
requires the user to sign in again.

## Security notes

Run-As tokens are bearer credentials. Atlas deliberately limits their lifetime
in the browser by keeping the stack only in `sessionStorage` and never writing
impersonated tokens to the shared local-storage token or cookie. Deployments
must continue to protect against same-origin script injection, because any
browser-managed bearer-token design depends on that protection.
