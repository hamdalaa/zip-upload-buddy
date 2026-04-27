# VPS Data Flow

This project's VPS deployment keeps mutable catalog data outside the release
directory so new pulled/scraped data can be uploaded without rebuilding the app.

Read `production-handoff.md` first for the current same-origin `https://h-db.site` architecture and admin/worker rules.

## Current VPS layout

- App root: `/root/apps/iraq-catalog-backend`
- Active release: `/root/apps/iraq-catalog-backend/current`
- Shared SQLite DB: `/root/apps/iraq-catalog-backend/shared/catalog.sqlite`
- Shared snapshots: `/root/apps/iraq-catalog-backend/shared/snapshots`
- Shared scraped output: `/root/apps/iraq-catalog-backend/shared/catalog-output`
- Shared local storage: `/root/apps/iraq-catalog-backend/shared/catalog-storage`
- Shared backups: `/root/apps/iraq-catalog-backend/shared/catalog-backups`

The release directory should expose these as repo-shaped paths:

- `current/.catalog-storage -> shared/catalog-storage`
- `current/.catalog-backups -> shared/catalog-backups`

That lets the backend continue to use `CATALOG_REPO_ROOT=/root/apps/iraq-catalog-backend/current`
while still reading mutable files from the shared area.

Important production note:

- The live database is the VPS file `shared/catalog.sqlite`.
- Local SQLite files are not production truth and may be stale.
- `shared/catalog-output` is kept on the VPS as a mirror of scraped payloads.
- The production app should not re-import that folder on every boot.
- The live backend should prefer the mirrored full SQLite catalog database.

Do not replace `shared/catalog.sqlite` from a local file unless the user explicitly asks for a production catalog data deploy.

## Import behavior

On startup, the backend imports the latest scraped payloads from:

- `.catalog-output`

The import happens in `backend/shared/seeds/importScrapedSiteCatalogs.ts`.

Current recommended operational flow is:

1. Pull or generate scraped payloads locally under `backend/.catalog-output`
2. Keep the complete SQLite catalog locally under `backend/.catalog-data`
3. Run a local SQLite WAL checkpoint so deploy ships one clean `catalog.sqlite`
4. Upload the scraped payload mirror plus a single staged SQLite file to the VPS
5. Stop `pm2` briefly, atomically swap `shared/catalog.sqlite`, and keep the old file as a timestamped backup
6. Restart `pm2` process `iraq-catalog-backend`
7. Verify `/public/healthz`, `/public/bootstrap`, and `/public/search`

## Helper script

Use:

```bash
VPS_HOST=198.12.73.235 ./scripts/deploy/push-catalog-data-to-vps.sh
```

Optional environment variables:

- `VPS_USER` default: `root`
- `VPS_APP_ROOT` default: `/root/apps/iraq-catalog-backend`
- `SSH_PASSWORD` if you are using password auth and `sshpass` is installed
- `REMOTE_PORT` default: `22`

You can also pass a custom source directory:

```bash
VPS_HOST=198.12.73.235 ./scripts/deploy/push-catalog-data-to-vps.sh /path/to/output
```

The script:

- uploads the scraped output directory to the VPS as a mirror
- checkpoints the local SQLite WAL and removes local `-wal/-shm` before upload
- uploads a single staged SQLite file to `shared/catalog.sqlite.next`
- ensures the shared data directories exist
- refreshes the release storage/backups symlinks
- runs `PRAGMA quick_check` against the staged DB on the VPS
- swaps the live DB atomically by `mv`, keeping the old DB under `shared/catalog-backups`
- restarts `iraq-catalog-backend`
- verifies `healthz`, `public/healthz`, `public/bootstrap`, and `public/search?q=iphone`

## API verification helper

Use:

```bash
./scripts/deploy/verify-public-api.sh
```

Override the target base URL if needed:

```bash
PUBLIC_BASE_URL=https://cf.h-db.site ./scripts/deploy/verify-public-api.sh
```
