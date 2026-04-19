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
- `npm run dev:worker`
- `npm run refresh:all`
- `npm run refresh:retry-report`

## Infra

The local Docker Compose stack lives under `infra/docker-compose.catalog.yml`.

## Data

Seed data required by the backend lives under `data/cities`.
