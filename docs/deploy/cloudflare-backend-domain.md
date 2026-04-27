# Cloudflare And Same-Origin Production

The current production setup is same-origin:

- Frontend: `https://h-db.site`
- Public API: `https://h-db.site/public/*`
- Internal/admin API: `https://h-db.site/internal/*`
- Compatibility API alias: `https://cf.h-db.site`
- VPS origin IP: `198.12.73.235`
- Backend upstream: `127.0.0.1:4400`

Read `production-handoff.md` first for the complete current state.

## DNS

Cloudflare is the DNS authority for `h-db.site`.

Expected records:

```txt
A     @    198.12.73.235    proxied
CNAME www  h-db.site        proxied
A     cf   198.12.73.235    proxied
```

DNS changes should be made through Cloudflare dashboard login or a scoped Cloudflare API token. Do not use pasted browser cookies.

## nginx

nginx should:

- Serve frontend files from `/var/www/hayr/dist`.
- Redirect `www.h-db.site` to `h-db.site`.
- Proxy `/public/`, `/internal/`, `/docs/`, and `/healthz` to `127.0.0.1:4400`.
- Avoid manual CORS header injection. Fastify owns CORS.

## Backend Env

Production backend uses:

```env
PORT=4400
CATALOG_BIND_HOST=127.0.0.1
CATALOG_TRUST_PROXY=true
CATALOG_ALLOWED_ORIGINS=https://h-db.site,https://www.h-db.site,https://cf.h-db.site
CATALOG_DOCS_ENABLED=false
```

Admin/session env is also required on the VPS:

```env
ADMIN_LOGIN_SECRET=...
ADMIN_SESSION_SECRET=...
ADMIN_SESSION_TTL_HOURS=12
```

Do not commit real secret values.

## Frontend Env

Production frontend should use same-origin relative API requests. Leave this unset in production:

```env
VITE_PUBLIC_API_BASE_URL=
```

Only set `VITE_PUBLIC_API_BASE_URL` for local development or a deliberate alternate environment.

## PM2

Production process names:

```txt
iraq-catalog-backend
iraq-catalog-worker
```

Both should use Node 24:

```txt
/opt/node-v24.13.0-linux-x64/bin/node
```

`iraq-catalog-worker` handles Redis/BullMQ sync jobs so the API process does not run heavy catalog sync inline.

## Verification

```bash
curl https://h-db.site/public/healthz
curl https://cf.h-db.site/public/healthz
```

Browser checks:

- `https://h-db.site/`
- `https://h-db.site/search?q=iphone`
- `https://h-db.site/67`
- `https://h-db.site/dashboard`

Acceptance:

- No CORS errors.
- No Cloudflare 502/504.
- `/dashboard` redirects unauthenticated users to `/67?next=/dashboard`.
- Admin Jobs tab can enqueue jobs without taking the API offline.

