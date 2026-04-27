#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

cd "$BACKEND_DIR"

export CATALOG_SKIP_SCRAPED_IMPORT="${CATALOG_SKIP_SCRAPED_IMPORT:-true}"
export CATALOG_SKIP_STARTUP_REINDEX="${CATALOG_SKIP_STARTUP_REINDEX:-true}"
export SNAPSHOT_STORAGE_DRIVER="${SNAPSHOT_STORAGE_DRIVER:-local}"
export SNAPSHOT_LOCAL_STORAGE_DIR="${SNAPSHOT_LOCAL_STORAGE_DIR:-.catalog-storage/product-pull-cycle}"

npx tsx worker/run-product-pull-cycle.ts "$@"
