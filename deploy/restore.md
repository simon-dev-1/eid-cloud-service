# Restore runbook

Backups are `pg_dump` custom-format dumps (`-Fc`) plus the upload blobs in the
`storage-data` volume. Restoring is a manual, tested process — run it once in
the sandbox before you need it in production.

## Restore the app database

1. Stop the API so nothing writes during restore:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml stop api
   ```

2. Restore into a clean database:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml exec -T postgres \
     dropdb -U eid --if-exists eid
   docker compose -f deploy/docker-compose.prod.yml exec -T postgres \
     createdb -U eid eid
   docker compose -f deploy/docker-compose.prod.yml exec -T postgres \
     pg_restore -U eid -d eid --no-owner /dev/stdin < eid-YYYYMMDD-HHMMSS.dump
   ```

   (`/dev/stdin` only works if the host shell redirects the dump into the
   container; otherwise copy the dump into the container first.)

3. Start the API and verify:

   ```bash
   docker compose -f deploy/docker-compose.prod.yml start api
   curl -fsS https://app.eid-cloud.ch/ready
   ```

## Restore uploads

Uploads live in the `storage-data` volume. Restore it from `restic`:

```bash
restic restore latest --target /tmp/storage-restore
docker run --rm -v storage-data:/data -v /tmp/storage-restore:/restore alpine \
  sh -c 'cp -a /restore/. /data/'
```

## Important

- **`SERVER_KEK` must match the key that wrapped the vault master keys.** If you
  restore a database whose vaults were wrapped with a different KEK, unlock will
  fail. Back up `SERVER_KEK` separately and never lose it.
- **Never restore a sandbox dump into production** — vaults are bound to
  identities and KEK; test data must stay isolated.
