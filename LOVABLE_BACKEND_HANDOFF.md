# Hayr Backend Handoff

This file replaces the old temporary Cloudflare tunnel handoff. Do not use any previous `trycloudflare.com` URL for production.

## Production Base URL

Use the same production origin:

```txt
https://h-db.site
```

Frontend requests should be relative same-origin paths:

```txt
/public/*
```

Do not set production frontend API base to `localhost`, a Vite dev server, or the old quick tunnel.

## Compatibility Alias

`https://cf.h-db.site` is still available for diagnostics and compatibility, but the frontend should not depend on it.

## Main Public Endpoints

```txt
GET /public/healthz
GET /public/bootstrap-lite
GET /public/search
GET /public/products/:id/full
GET /public/products/:id
GET /public/products/:id/offers
GET /public/stores/:id
GET /public/brands/:slug
GET /public/cities
GET /public/cities/:slug
GET /public/settings/site
```

## Admin

```txt
GET  /67
GET  /dashboard
POST /internal/auth/login
GET  /internal/auth/session
POST /internal/auth/logout
```

Admin browser calls use the HttpOnly session cookie plus `x-admin-csrf` for mutations. Do not expose service tokens in frontend code.

## Production Data

Production catalog data lives on the VPS:

```txt
/root/apps/iraq-catalog-backend/shared/catalog.sqlite
```

Local SQLite files are not production truth:

```txt
backend/.catalog-data/catalog.sqlite
.catalog-data/
```

See `docs/deploy/production-handoff.md` for the current production architecture.

