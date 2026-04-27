# Security Audit Known Issues

Last reviewed: 2026-04-26

## Resolved In Current Hardening Pass

- `backend/api/server.ts` `/internal/health` no longer returns process IDs, filesystem paths, Redis URLs, or internal health-check URLs.
- `backend/shared/config.ts` now rejects production startup unless `CATALOG_TRUST_PROXY=true`, so auth rate limits and audit logs use the real Cloudflare/nginx client IP chain.
- `backend/api/server.ts` `/internal/auth/logout` now requires an authenticated admin session and CSRF token like other unsafe internal writes.

## Medium Issues Accepted For Follow-Up

- `backend/api/server.ts`: CORS uses `strictPreflight: false`. Origins are still allowlisted, but strict preflight validation should be enabled once legacy client compatibility is verified.
- `backend/shared/search/sqliteSearchEngine.ts` and `backend/api/publicCatalog.ts`: synchronous SQLite reads can block the Node event loop during heavier search/catalog requests. Move expensive reads behind cached worker-generated views or async DB access.
- `backend/api/server.ts`: internal store endpoints perform per-store connector/acquisition profile lookups. Batch these lookups to remove N+1 behavior.
- `backend/shared/db/sqliteCatalogRepository.ts`: some repository methods load all stores/search documents and paginate in memory. Add SQL-level pagination for large admin and fallback reads.
- `backend/api/server.ts` and `backend/api/publicCatalog.ts`: route handlers still contain substantial business logic. Extract admin store operations, public product mapping, and catalog quality logic into dedicated services.

