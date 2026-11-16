# Frontend authentication and Avatar security

## Web authentication

The Web client identifies itself with `X-ShiftSync-Client: web`. Login and token
refresh responses set `shiftsync_refresh` as an `HttpOnly`, `SameSite=Lax` cookie
scoped to `/api/auth`; the refresh token is not included in that Web response.
The access token, email, and role are held only in `src/services/authSession.js`.
On a page reload, `AuthSessionProvider` refreshes the access token from the cookie
before protected routes render. Mobile and other API clients keep the existing
body-based refresh-token contract.

Set `AUTH_REFRESH_COOKIE_SECURE=true` for every HTTPS deployment. It remains
`false` only for local HTTP development.

The production Web image also ships a restrictive CSP, anti-framing, MIME,
referrer, and permissions policy in `ShiftSync-Web/nginx.conf`. If an external
reverse proxy terminates TLS, it must preserve these response headers.

## Avatar 3D

Persisted remote avatar models must be HTTPS `.glb` URLs from
`https://models.readyplayer.me`; bundled `/models/*.glb` assets are also valid.
The creator frame accepts messages only from its configured Ready Player Me iframe.
Local GLB files are limited to 15 MB and require the GLB `glTF` signature. They can
be previewed during the current browser session but are not persisted as profile
URLs.
