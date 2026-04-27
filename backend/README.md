# Iraq Catalog Backend

This folder is self-contained so it can be copied to another workspace or repository without depending on root project files.

## Run

```bash
npm install
npm run build
npm run test
```

## Main scripts

- `npm run dev:api`
- `npm run dev:sqlite-api`
- `npm run dev:worker`
- `npm run pull:products`
- `npm run audit:data`
- `npm run refresh:all`
- `npm run refresh:retry-report`

## Default local stack

The backend now defaults to a private SQLite catalog database at
`.catalog-data/catalog.sqlite`. Public site reads continue to use the existing
`/public/*` API, while internal routes stay bearer-token + request-signature
protected.

City payloads and supporting Google review area lookups are also imported into
the same SQLite database, so the public API no longer depends on JSON files at
runtime.

Swagger UI is available at `/docs` and the generated OpenAPI document at
`/docs/json`.

In production, Swagger is disabled by default unless `CATALOG_DOCS_ENABLED=true`
is set explicitly.

For local API-only work without Postgres/Typesense, run:

```bash
npm run dev:sqlite-api
```

The memory/subset API now defaults to port `4401` so port `4400` stays reserved
for the full backend.

For end-to-end data auditing, run:

```bash
npm run audit:data -- --base-url http://127.0.0.1:4400 --json-out .catalog-reports/data-audit.json --markdown-out .catalog-reports/data-audit.md
```

## Security

The backend now includes:

- public route throttling and search-specific rate limits
- security headers via Fastify helmet
- request URL/body size guards
- not-found throttling to reduce route enumeration
- outbound fetch protection against SSRF, private-network targets, and oversized remote responses
- runtime import of city/review support data into SQLite so public reads do not depend on loose JSON files

## Infra

The local Docker Compose stack lives under `infra/docker-compose.catalog.yml`.

## Production notes

Known VPS deployment snapshot:

- Public backend URL: `https://cf.h-db.site`
- PM2 process: `iraq-catalog-backend`
- Production start command: `node dist/api/start.js`
- `nginx` proxies `cf.h-db.site` to `127.0.0.1:4400`
- Redis is required in production because the API initializes the queue layer on startup
- The VPS deploy currently uses local SQLite + local snapshot storage under `/root/apps/iraq-catalog-backend`
- Mutable scraped output on the VPS should live outside the release folder as a mirror only
- The production VPS should prefer the mirrored full SQLite catalog database when synchronizing large catalog updates
- Startup flags used on the VPS:
  - `CATALOG_SKIP_SCRAPED_IMPORT=true`
  - `CATALOG_SKIP_STARTUP_REINDEX=true`

## Data

Seed data required by the backend lives under `data/cities`.
