# eid-cloud-service

Backend API for **eid-cloud.ch** — an encrypted cloud vault where users verify their identity with
the Swiss e-ID (swiyu) and store client-side-encrypted documents and secrets.

Currently implements file upload/download (local disk + PostgreSQL metadata). Encryption and e-ID
onboarding are planned but not yet built.

## Tech stack

- Node 26, TypeScript 6.0, ESM
- Express 5, zod 4, pino 10, helmet, cors, env-var
- PostgreSQL 18 via Knex 3
- Local disk storage behind a swappable storage interface (S3/MinIO later)
- Jest 30 + ts-jest + supertest
- ESLint 9 flat config, Prettier
- Docker + docker-compose (Postgres + API)

## Getting started

### Prerequisites

- Node 26, npm 10+

### Setup

```bash
cp .env.example .env
npm install
```

### Run

```bash
npm run db-migrate
npm run dev
```

API listens on http://localhost:3000, health check at `GET /status`.

### Docker / Podman

```bash
docker compose up --build
# or, with rootless Podman on openSUSE:
podman compose up --build
```

Then:

```bash
curl -F "file=@./some-file.txt" http://localhost:3000/api/v1/files
```

Uploaded blobs live in the `storage-data` volume (`/app/storage` in the container). Inspect them
with `podman exec eid-cloud-api ls -l /app/storage` (or `docker exec ...`). A named volume is used
instead of a `./storage` bind mount because rootless Podman maps the container's `node` user to a
subuid, which cannot write to a host-owned bind mount.

To reset everything, including the database:

```bash
podman compose down -v
```

### Test

```bash
npm test
```

## Project structure

```
src/
  index.ts, app.ts, config.ts
  middlewares/        error-handler, request-validator, request-logger, async-context
  domains/files/      routes, controller, service, dao, schemas, dtos
  clients/storage.ts  local-disk storage (put/get/delete)
  database/           db.ts, migrations/
  utils/              errors.ts, logger.ts
tests/
```

## Scripts

- `npm run dev` — run with tsx watch
- `npm run build` — compile to `dist/`
- `npm test` — run Jest
- `npm run lint` / `npm run format`
- `npm run db-migrate` — run Knex migrations

## Security

The server never receives plaintext — encryption is client-side and will be added in a later phase.

## License

MIT. Owner: `simon-dev-1`.
