# zip-upload-buddy

Production handoff notes live in [docs/deploy/production-handoff.md](docs/deploy/production-handoff.md). Future sessions should read that file first.

Current production site: `https://h-db.site`

Current compatibility API alias: `https://cf.h-db.site`

Mutable VPS data layout and the scraped-output upload flow live in [docs/deploy/vps-data-flow.md](docs/deploy/vps-data-flow.md).

Important: production uses the VPS SQLite database at `/root/apps/iraq-catalog-backend/shared/catalog.sqlite`. Local SQLite files under `.catalog-data` or `backend/.catalog-data` are development/staging only and may be stale.

Catalog operation docs and generated reports live under [docs/catalog](docs/catalog/README.md).

## Local stale-build recovery

If you see an error like `Failed to fetch dynamically imported module` on `http://localhost:8080`, the tab is usually trying to load an old hashed chunk after a fresh build.

Recovery steps:

1. Hard refresh the tab once.
2. If the tab is still broken, unregister the service worker for `localhost:8080`, clear that origin's local site data/cache, then reload.
3. Re-open the route after the reload so the current build can request the latest chunk hashes.
