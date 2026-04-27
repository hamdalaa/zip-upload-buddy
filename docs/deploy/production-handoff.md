# Hayr Production Handoff

This is the operational source of truth for production. Keep it current when deployment, admin, database, or catalog-sync behavior changes.

## Current Architecture

- `https://h-db.site` serves the frontend and proxies API calls on the same origin.
- `/public/*` is public catalog API.
- `/internal/*` is protected admin/internal API.
- `https://cf.h-db.site` remains available only as a compatibility API alias.
- Backend listens on `127.0.0.1:4400`.
- nginx serves frontend files from `/var/www/hayr/dist` and proxies API paths to the backend.
- Cloudflare DNS is authoritative for `h-db.site`.

Production should not depend on localhost or a separate frontend API origin.

## VPS Paths

```txt
/root/apps/iraq-catalog-backend/current
/root/apps/iraq-catalog-backend/shared/catalog.sqlite
/root/apps/iraq-catalog-backend/shared/catalog-backups
/root/apps/iraq-catalog-backend/shared/catalog-output
/root/apps/iraq-catalog-backend/shared/catalog-storage
/root/apps/iraq-catalog-backend/shared/snapshots
/var/www/hayr/dist
```

The production SQLite database is `shared/catalog.sqlite` on the VPS. Local SQLite files are not the live source of truth.

## PM2

Required production processes:

```txt
iraq-catalog-backend  -> /root/apps/iraq-catalog-backend/current/dist/api/start.js
iraq-catalog-worker   -> /root/apps/iraq-catalog-backend/current/dist/worker/run-worker.js
```

Both must run with:

```txt
/opt/node-v24.13.0-linux-x64/bin/node
```

The worker exists because catalog sync and scraping can be memory-heavy. Do not run store sync loops inline in the API process.

## Admin

- Login page: `/67`
- Dashboard: `/dashboard`
- Cookie: `hayr_admin_session`
- Login endpoint: `POST /internal/auth/login`
- Session endpoint: `GET /internal/auth/session`
- Logout endpoint: `POST /internal/auth/logout`
- Browser mutation requests require `x-admin-csrf`.

Admin frontend must use cookie credentials. Do not reintroduce frontend bearer tokens, `VITE_ADMIN_TOKEN`, or client-side signing.

## Catalog Job Behavior

Admin catalog actions are queue-first:

```txt
POST /internal/catalog/pull-store-url
POST /internal/catalog/update-stores
POST /internal/catalog/pull-products
GET  /internal/catalog/jobs/:jobId
```

The API returns a job id quickly. The job enqueues sync work to Redis/BullMQ. `iraq-catalog-worker` performs the actual heavy sync work.

This avoids the previous production failure mode where inline sync work caused Node heap OOM and Cloudflare 502.

## Database Rule

Do not tell a new session to use local DB as production. Local data may be stale or partial:

```txt
backend/.catalog-data/catalog.sqlite
.catalog-data/
backend/.catalog-output
```

Use those only for development, tests, or staging a deliberate data deploy.

For production database replacement, use the checkpoint/upload/swap flow in `docs/deploy/vps-data-flow.md` and keep a backup under `shared/catalog-backups`.

## Safe Deploy Checklist

Run locally:

```bash
npm run build
npm run lint
npm test
cd backend && npm run build && npm test
```

Deploy:

1. Upload backend `dist`, `package.json`, and lockfile to `/root/apps/iraq-catalog-backend/current`.
2. Upload frontend `dist` to `/var/www/hayr/dist`.
3. Restart `iraq-catalog-backend`.
4. Restart or start `iraq-catalog-worker` with Node 24.
5. Verify `https://h-db.site/public/healthz`.
6. Verify `/67` login and `/dashboard` Jobs tab.

## Do Not Do

- Do not use Cloudflare cookies pasted in chat.
- Do not set production frontend back to `https://cf.h-db.site` as primary API base.
- Do not add CORS headers in nginx; Fastify owns CORS.
- Do not store admin secrets, VPS passwords, or Cloudflare API tokens in repo files.
- Do not deploy local SQLite to production unless explicitly requested.

