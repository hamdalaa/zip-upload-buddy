# Deploy Ops

This folder groups VPS and domain deployment notes.

## Files

- `production-handoff.md`
- `cloudflare-backend-domain.md`
- `vps-data-flow.md`

Read `production-handoff.md` first. It documents the current `https://h-db.site` same-origin production setup, admin `/67`, the VPS database source of truth, and the required PM2 worker.

## Main deploy helper

```bash
./scripts/deploy/push-catalog-data-to-vps.sh
```

Use that helper only for an explicit catalog data deploy. Do not treat local SQLite as production data by default.

## Local dist / chunk recovery

When `localhost:8080` serves `dist/` directly, an older open tab can request deleted hashed chunks after a rebuild.

Fast recovery:

1. Hard refresh once.
2. If the stale tab still fails, unregister the local service worker, clear site storage for `localhost:8080`, and reload.
