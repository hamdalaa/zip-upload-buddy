# Hayr Production Handoff

This project is the production Hayr catalog site. Future agents should read this first before changing deployment, data, admin, or catalog-sync logic.

## Production Source Of Truth

- Public site: `https://h-db.site`
- Admin login: `https://h-db.site/67`
- Protected admin app: `https://h-db.site/dashboard`
- Compatibility API alias: `https://cf.h-db.site`
- VPS IP: `198.12.73.235`
- Frontend production files: `/var/www/hayr/dist`
- Backend release root: `/root/apps/iraq-catalog-backend/current`
- Backend origin: `127.0.0.1:4400`, behind nginx and Cloudflare.

Do not move production back to localhost, a Vite dev server, or a separate frontend API origin. Production frontend requests should stay same-origin (`/public/*`, `/internal/*` through nginx).

## Production Data Rule

The production catalog database is on the VPS:

- Live SQLite DB: `/root/apps/iraq-catalog-backend/shared/catalog.sqlite`
- Backups: `/root/apps/iraq-catalog-backend/shared/catalog-backups`
- Snapshots: `/root/apps/iraq-catalog-backend/shared/snapshots`
- Scraped output mirror: `/root/apps/iraq-catalog-backend/shared/catalog-output`
- Storage: `/root/apps/iraq-catalog-backend/shared/catalog-storage`

Local files such as `backend/.catalog-data/catalog.sqlite`, `.catalog-data/`, and `backend/.catalog-output` are development or staging data only. Do not treat local SQLite as production truth. Do not overwrite the VPS database unless the user explicitly asks for a catalog data deploy and you use the documented deploy script/checkpoint flow.

## PM2 Processes

Production must have both processes online:

- `iraq-catalog-backend`: API server, entry `dist/api/start.js`, Node `/opt/node-v24.13.0-linux-x64/bin/node`
- `iraq-catalog-worker`: queue worker, entry `dist/worker/run-worker.js`, same Node 24 interpreter

The worker is required for product sync jobs. Do not run heavy catalog refresh/sync inline inside the API process; that caused heap OOM and Cloudflare 502. Admin buttons should enqueue jobs and let `iraq-catalog-worker` process them.

## Admin/Auth

- `/67` is login only.
- `/dashboard` is protected by server session.
- Cookie: `hayr_admin_session`, `HttpOnly`, `Secure`, `SameSite=Lax`.
- Browser writes require `x-admin-csrf`.
- Frontend must not use `VITE_ADMIN_TOKEN`, exposed service tokens, or client-side request signing.
- Internal service-token signing remains only for automation/server calls.
- Do not store admin secrets, VPS passwords, or Cloudflare tokens in repo docs.

## Admin Catalog Jobs

Dashboard `Jobs` includes:

- Pull products for one store URL: `POST /internal/catalog/pull-store-url`
- Store-by-store update: `POST /internal/catalog/update-stores`
- General product pull: `POST /internal/catalog/pull-products`
- Job status: `GET /internal/catalog/jobs/:jobId`

These routes return `202` and enqueue sync work. The API job record reports what was enqueued; the actual scraping/sync is handled by the PM2 worker through Redis/BullMQ.

## Frontend/API Architecture

- Production frontend default API base is same-origin relative requests.
- Leave `VITE_PUBLIC_API_BASE_URL` unset in production.
- Vite dev proxy is only for local development.
- Public browser data should use `/public/*`.
- Admin browser data should use `/internal/*` with credentials and CSRF.
- `cf.h-db.site` is compatibility/diagnostic only, not the frontend's primary API base.

## Verification Checklist

Before saying a production change is done:

1. `npm run build`
2. `npm run lint`
3. `npm test`
4. `cd backend && npm run build && npm test`
5. Deploy frontend to `/var/www/hayr/dist`.
6. Deploy backend `dist`, restart `iraq-catalog-backend`.
7. Restart/confirm `iraq-catalog-worker` with Node 24.
8. Verify:
   - `curl https://h-db.site/public/healthz`
   - `/67` login
   - `/dashboard` unauth redirects to `/67?next=/dashboard`
   - Jobs tab renders
   - no browser console/CORS errors

## Cloudflare/Nginx

- Cloudflare owns DNS for `h-db.site`.
- DNS/Cloudflare changes should use an API token or manual dashboard login, not pasted cookies.
- nginx serves `h-db.site` and proxies `/public/`, `/internal/`, `/docs/`, and `/healthz` to `127.0.0.1:4400`.
- Let Fastify own CORS. Do not add manual CORS injection in nginx.

