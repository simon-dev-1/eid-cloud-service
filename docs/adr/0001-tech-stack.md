# ADR 0001 — Tech stack & file storage decisions

- Status: accepted
- Date: 2026-10-28

## Context

`eid-cloud-service` is the backend for **eid-cloud.ch**, an encrypted cloud vault where users
verify their identity with the Swiss e-ID (swiyu) and store client-side-encrypted documents.
This first milestone implements unauthenticated file upload/download with metadata in PostgreSQL.

The domain is built as a copyable pattern that can later be renamed to `vault` and pointed at
S3/MinIO without restructuring.

## Decision

### Stack

- Node 26 (Active LTS), TypeScript 6.0, ESM (`"type": "module"`).
- Express 5, zod 4, pino 10, pino-http, helmet, cors, env-var.
- PostgreSQL 18 via Knex 3 (`pg` driver).
- Local disk storage behind a swappable `StorageClient` interface (`put`/`get`/`delete`).
- Jest 30 + ts-jest (ESM preset) + supertest.
- ESLint 9 flat config + Prettier.
- Docker (Postgres + API) via docker-compose.

TypeScript is pinned to `~6.0.0` (the bridge line): `typescript-eslint` does not support TS 7 yet.
Revisit after TS 7.1 and bump `typescript` + `typescript-eslint` together.

> Note: the plan referenced `eslint@^10`. `eslint-plugin-import` (required for the `import/order`
> rule copied from `service-main`) does not yet declare an ESLint 10 peer range, so we pin
> `eslint@^9` to keep the reference lint configuration working unchanged.

### Storage = local disk (not MinIO/S3)

`clients/storage.ts` exposes a tiny `StorageClient` interface implemented over
`node:fs/promises` in a configurable `STORAGE_DIR`. This is the seam we later re-point at
`@aws-sdk/client-s3` without touching the `files` domain.

### Upload = multipart through the API

Browsers POST `multipart/form-data`; the API parses it with `multer` (memory storage + size
limit `MAX_UPLOAD_BYTES`) and writes the blob via `storage.put`. No presigned URLs yet.

### Download = stream through the API

`GET /api/v1/files/:id` streams the blob back with `Content-Type` and
`Content-Disposition: attachment`.

### Metadata = PostgreSQL via Knex

One `files` table. The list endpoint reads only metadata (no blob contents).

### No auth middleware

`files` routes are open for this milestone. Auth + sessions land in a later phase.

### Compose deviations for PostgreSQL 18 and rootless Podman

- The `postgres` service uses the official image's `POSTGRES_DB` variable. The API still reads
  `POSTGRES_DATABASE`; both are wired to the same `${POSTGRES_DATABASE:-eid}` value.
- PostgreSQL 18 moved its data directory under `/var/lib/postgresql/<major>/docker`, so the volume
  is mounted at `/var/lib/postgresql` (as recommended by the image) instead of
  `/var/lib/postgresql/data`.
- Uploaded blobs use a named volume (`storage-data`) rather than the planned `./storage` bind
  mount. Under rootless Podman, the container's `node` user (uid 1000) is mapped to a subuid and
  cannot write to a bind mount owned by the host user. A named volume is portable across Docker and
  Podman; `STORAGE_DIR` still points at `/app/storage`, so only the compose mount changed.

## Consequence

### Multipart validation deviation

`multer` runs **before** zod. For `POST /api/v1/files`, the presence of `req.file` plus
`limits.fileSize` replaces a JSON body schema (multipart is not JSON), so that route does not use
`validate({ body })`. Path params (`:id`) still use a zod schema via `request-validator.ts`.
The controller rejects a missing file with a 400.

### Storage key scheme (open)

Currently `storageKey = id` (a `crypto.randomUUID()`). Directory sharding and content-hash keys
are deferred to the scaling milestone.
