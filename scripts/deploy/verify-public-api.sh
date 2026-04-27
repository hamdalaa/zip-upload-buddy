#!/usr/bin/env bash

set -euo pipefail

PUBLIC_BASE_URL="${1:-${PUBLIC_BASE_URL:-https://cf.h-db.site}}"
SEARCH_QUERY="${SEARCH_QUERY:-iphone}"

echo "Verifying public API at: $PUBLIC_BASE_URL"

curl -fsS "$PUBLIC_BASE_URL/public/healthz" | jq .
curl -fsS "$PUBLIC_BASE_URL/public/bootstrap" | jq '{
  totalStores: .summary.totalStores,
  totalProducts: .summary.totalProducts,
  brands: (.brands | length),
  deals: (.home.deals | length),
  latest: (.home.latest | length),
  trending: (.home.trending | length)
}'
curl -fsS --get "$PUBLIC_BASE_URL/public/search" --data-urlencode "q=$SEARCH_QUERY" | jq '{
  query: .query,
  totalProducts: .totalProducts,
  totalOffers: .totalOffers,
  storesCovered: .storesCovered,
  firstProduct: (.products[0].title // null)
}'
