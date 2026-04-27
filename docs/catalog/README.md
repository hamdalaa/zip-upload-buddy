# Catalog Ops

This folder groups catalog-specific operational docs and generated reports.

## Main docs

- `source-contracts.md`: source/API notes and connector input references
- `reports/`: generated store/product coverage reports

## Product pull workflow

Use:

```bash
./scripts/catalog/run-product-pull-cycle.sh
```

Useful flags:

- `--current-limit N`
- `--include-zero-products`
- `--zero-limit N`
- `--concurrency N`

This workflow is backed by:

- `backend/worker/run-product-pull-cycle.ts`
- `backend/worker/run-sync-current-sites.ts`
- `backend/worker/run-zero-product-refresh.ts`
