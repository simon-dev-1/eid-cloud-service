#!/usr/bin/env bash
# Bootstrap a fresh Ubuntu/Debian VM for eid-cloud (Hetzner / Exoscale).
# Run as root:  sudo bash bootstrap.sh
set -euo pipefail

# ── 1. Install Docker Engine + Compose plugin ──────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

# ── 2. OS hardening ────────────────────────────────────────────────────────────
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  unattended-upgrades \
  apt-listchanges \
  ca-certificates \
  curl \
  git \
  gnupg \
  openssl \
  ufw

# Unattended security upgrades.
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

# Firewall: SSH restricted, HTTP(S) open. Docker bypasses ufw, so do not rely on
# ufw alone for container ports — only Caddy publishes 80/443, the rest are
# internal to the compose networks.
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# ── 3. Deployment layout ───────────────────────────────────────────────────────
mkdir -p /opt/eid-cloud/deploy /opt/eid-cloud/backups
chown -R "$(logname 2>/dev/null || echo root):" /opt/eid-cloud

# Log rotation for the container JSON logs is handled by compose; keep dmesg sane.
echo 'kernel.printk = 3 4 1 3' > /etc/sysctl.d/50-eid-cloud.conf
sysctl --system >/dev/null

echo
echo "Bootstrap complete."
echo "Next:"
echo "  1. Add your SSH key (ssh-copy-id) and disable password auth if desired."
echo "  2. Copy deploy/ (Caddyfile, docker-compose.prod.yml) and create deploy/.env."
echo "  3. cd /opt/eid-cloud && docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d"
echo "  4. Point APP_HOST/VERIFY_HOST DNS A/AAAA records at this VM's IP."
