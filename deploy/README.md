# Deploy eid-cloud (sandbox) to Hetzner Cloud

Step-by-step runbook to get the sandbox running on Hetzner. Two hostname layouts
are supported — pick one:

- **Single host (recommended for a quick sandbox, e.g. DuckDNS):** one name serves
  the portal, API, and wallet-facing verifier paths. Use `deploy/Caddyfile.single-host`.
- **Two hosts:** `sandbox.eid-cloud.ch` (portal + API) and
  `verify-sandbox.eid-cloud.ch` (verifier). Use `deploy/Caddyfile`.

Everything runs as Docker Compose on a single Ubuntu VM behind Caddy (automatic TLS).

---

## 0. Prerequisites

- A publicly-resolvable domain. Any domain works — you do **not** need `eid-cloud.ch`.
  For a free, no-domain-registration option, use a **DuckDNS** subdomain
  (`yourname.duckdns.org`). A bare IP or the Hetzner PTR hostname will not work
  (no Let's Encrypt certificate).
- A Hetzner Cloud account.
- A GitHub account with push access to `eid-cloud-service` / `eid-cloud-portal`
  (CI builds the images), or a way to build/push images manually.
- The swiyu integration values: `VERIFIER_DID`, `DID_VERIFICATION_METHOD`,
  `SIGNING_KEY`, and optionally the `SWIYU_TMS_*` credentials (already in your local `.env`).

---

## 1. Create the Hetzner server

1. Hetzner Cloud Console → **Create Server**.
2. Location: **Nuremberg (nbg1)** or **Falkenstein (fsn1)** (lowest latency to CH).
3. Image: **Ubuntu 24.04**.
4. Type: **CX32** (4 vCPU / 8 GB / 80 GB NVMe) or **CPX31** (AMD, 160 GB). CX32 is plenty.
5. Add your **SSH key**.
6. **Firewalls** → create a firewall with these inbound rules:
   - `22/tcp` (SSH — optionally restrict to your IP)
   - `80/tcp` (Caddy HTTP-01)
   - `443/tcp`
   - `443/udp` (HTTP/3)
   - ICMP (ping)
   - **Nothing else** — the DB/API/verifier ports are never published.
7. Create the server and note its **IPv4 and IPv6** addresses.

---

## 2. Point DNS at the server

### Option A — single host (DuckDNS / one subdomain)

1. Create a DuckDNS account and add a subdomain, e.g. `eid-cloud-sandbox`.
2. Point it at your server's IPv4 (and IPv6 if you like):

   ```bash
   curl "https://www.duckdns.org/update?domains=eid-cloud-sandbox&token=<YOUR_TOKEN>&ip=<IPv4>"
   ```

   (or set the IP in the DuckDNS web UI).

3. On the server, use the single-host Caddyfile:

   ```bash
   cp /opt/eid-cloud/deploy/Caddyfile.single-host /opt/eid-cloud/deploy/Caddyfile
   ```

4. In `deploy/.env`, set both hosts to the same value:

   ```
   APP_HOST=eid-cloud-sandbox.duckdns.org
   VERIFY_HOST=eid-cloud-sandbox.duckdns.org
   APP_ORIGIN=https://eid-cloud-sandbox.duckdns.org
   EXTERNAL_URL=https://eid-cloud-sandbox.duckdns.org
   ```

### Option B — two hosts (your own domain)

Add A/AAAA records (both hostnames → the same server):

```
sandbox.eid-cloud.ch         A    <IPv4>   (and AAAA <IPv6>)
verify-sandbox.eid-cloud.ch  A    <IPv4>   (and AAAA <IPv6>)
```

- Do **not** proxy through Cloudflare (Caddy needs Let's Encrypt HTTP-01 on port 80).
- Do this **before** first `docker compose up` so Caddy can obtain certificates.

---

## 3. Bootstrap the server

SSH in and run the bootstrap script (installs Docker, UFW, unattended-upgrades):

```bash
ssh root@<server-ip>
# copy deploy/bootstrap.sh to the server, then:
bash bootstrap.sh
```

Or install Docker manually:

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker "$USER"   # re-login after this
```

---

## 4. Put the deploy files on the server

From your laptop (repo `eid-cloud-service`):

```bash
scp -r deploy root@<server-ip>:/opt/eid-cloud/
```

Resulting layout:

```
/opt/eid-cloud/deploy/
├── Caddyfile
├── Caddyfile.single-host   # for the single-host DuckDNS setup
├── docker-compose.prod.yml
├── .env            # you create this next (do not commit)
└── (backup.sh, restore.md, bootstrap.sh)
```

---

## 5. Create `/opt/eid-cloud/deploy/.env`

On the server:

```bash
cp /opt/eid-cloud/deploy/.env.example /opt/eid-cloud/deploy/.env
chmod 600 /opt/eid-cloud/deploy/.env
```

Generate the secrets (run each, paste the output into `.env`):

```bash
openssl rand -base64 32   # SESSION_SECRET
openssl rand -base64 32   # SERVER_KEK   (must decode to 32 bytes)
openssl rand -base64 24   # POSTGRES_PASSWORD
openssl rand -base64 24   # VERIFIER_POSTGRES_PASSWORD
```

Convert your EC P-256 `SIGNING_KEY` PEM to a single line:

```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n", $0}' signing-key.pem
```

Fill the swiyu values from your working local `.env`:

- `EXTERNAL_URL=https://eid-cloud-sandbox.duckdns.org` (single host — same as `APP_HOST`; for two-host use your verify host)
- `VERIFIER_DID`, `DID_VERIFICATION_METHOD`, `SIGNING_KEY`
- `DEEPLINK_SCHEMA=swiyu-verify-sandbox`
- `SWIYU_VERIFIER_ISSUER_DID` / `SWIYU_VERIFIER_LEGACY_ISSUER_DID` (Beta-ID integration)
- `VQPS_SCOPE`, `VQPS_PURPOSE_NAME`, `VQPS_PURPOSE_DESCRIPTION`
- `SWIYU_TMS_*` and `SWIYU_TRUST_*` (optional/on-the-fly vqPS)

Also set the hosts and image names (single-host DuckDNS example):

```
APP_HOST=eid-cloud-sandbox.duckdns.org
VERIFY_HOST=eid-cloud-sandbox.duckdns.org
APP_ORIGIN=https://eid-cloud-sandbox.duckdns.org
API_IMAGE=ghcr.io/simon-dev-1/eid-cloud-api
PORTAL_IMAGE=ghcr.io/simon-dev-1/eid-cloud-portal
API_TAG=latest
PORTAL_TAG=latest
```

---

## 6. Build & push the images

### Option A — via GitHub Actions (recommended)

Push to `main` in both repos. CI runs lint/type-check/test and pushes:

- `ghcr.io/simon-dev-1/eid-cloud-api:latest`
- `ghcr.io/simon-dev-1/eid-cloud-portal:latest`

### Option B — manually

```bash
# service
cd eid-cloud-service
docker build -t ghcr.io/simon-dev-1/eid-cloud-api:latest .
docker push ghcr.io/simon-dev-1/eid-cloud-api:latest

# portal
cd eid-cloud-portal
docker build -t ghcr.io/simon-dev-1/eid-cloud-portal:latest .
docker push ghcr.io/simon-dev-1/eid-cloud-portal:latest
```

---

## 7. Log in to GHCR on the server

GHCR packages are private by default. Create a GitHub **PAT** with `read:packages`, then:

```bash
echo "$PAT" | docker login ghcr.io -u <github-username> --password-stdin
```

---

## 8. Start the stack

```bash
cd /opt/eid-cloud
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env ps
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs -f api verifier-service
```

---

## 9. Verify

```bash
# liveness / readiness (through Caddy, TLS)
curl -fsS https://eid-cloud-sandbox.duckdns.org/health
curl -fsS https://eid-cloud-sandbox.duckdns.org/ready      # 200 = DB reachable

# verifier management must NOT be public (single host → same origin; SPA returns 404)
curl -s -o /dev/null -w "%{http_code}\n" https://eid-cloud-sandbox.duckdns.org/management/api/verifications
```

Confirm Caddy issued certificates (no "certificate error") and that
`docker compose ... logs caddy` shows the site being served.

---

## 10. Smoke test with the Sandbox Wallet

1. Open `https://eid-cloud-sandbox.duckdns.org` → **Unlock your vault**.
2. Scan the QR code with the **swiyu Sandbox Wallet**.
3. Approve the presentation.
4. The vault should unlock; upload, download, and delete a small file.

If the QR doesn't appear or the wallet errors, check `docker compose ... logs verifier-service api`.

---

## 11. Backups

```bash
crontab -e
# daily at 02:00
0 2 * * * cd /opt/eid-cloud && bash deploy/backup.sh >> /var/log/eid-backup.log 2>&1
```

Test a restore at least once (`deploy/restore.md`). Back up `SERVER_KEK` out-of-band
(a password manager) — losing it makes vault keys unrecoverable.

---

## 12. Update / rollback

```bash
cd /opt/eid-cloud
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env pull
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --remove-orphans
docker image prune -f
```

To pin a specific version, set `API_TAG`/`PORTAL_TAG` in `.env` (e.g. `sha-<short>`
or `v0.1.0`) and re-run `up -d`. Roll back by setting the previous tag.

---

## Troubleshooting

| Symptom                          | Check                                                                    |
| -------------------------------- | ------------------------------------------------------------------------ |
| Caddy can't get a cert           | DNS A/AAAA resolve to the server; port 80 reachable; no Cloudflare proxy |
| `api` restarts / `ready` 503     | `logs api`; Postgres healthy (`docker compose ... ps`)                   |
| Wallet can't find the verifier   | `EXTERNAL_URL` correct and reachable; `logs verifier-service`            |
| "request not registered" warning | `SWIYU_TMS_*` credentials valid; token not expired                       |
| `pull` access denied             | `docker login ghcr.io` with a `read:packages` PAT                        |
