# Deploy — Skye Dashboard

Auto-deploy via GitHub Actions: push ke `main` → build image → push ke GHCR → SSH ke VPS → `docker compose pull && up`.

## Arsitektur

```
GitHub push (main)
  → Actions: build Vite + nginx image
  → push ke ghcr.io/vcyous/skye-dashboard:latest
  → SSH ke VPS (168.231.118.160)
  → /opt/skye: docker compose pull && up -d

VPS containers:
  caddy (TLS + reverse proxy, ports 80/443)
    └─→ dashboard (nginx serving Vite SPA)

URL: https://dashboard.skyeseller.online
```

## Setup One-Time

### 1. GitHub Secrets

Repo Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `VPS_HOST` | `168.231.118.160` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Isi file `C:\Users\rizki\.ssh\skye_deploy` (private key, **seluruh isi** termasuk header `-----BEGIN OPENSSH PRIVATE KEY-----`) |
| `VITE_SUPABASE_URL` | URL Supabase production |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key Supabase |

`GITHUB_TOKEN` otomatis tersedia — tidak perlu di-set manual.

### 2. VPS: Authorize SSH key

SSH ke VPS dengan key existing:
```bash
ssh root@168.231.118.160
```

Tambahkan public key deploy ke authorized_keys:
```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINKy20NfrVEsUxGrio3rQg5seUHHZaY15kryYxEmreZn github-actions-skye-deploy" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. VPS: Buat folder deploy

```bash
mkdir -p /opt/skye
```

Workflow akan SCP `docker-compose.yml` + `Caddyfile` ke sini saat deploy pertama.

### 4. Pastikan port 80/443 terbuka

```bash
# Cek kalau ada service lain pakai port 80/443:
ss -tlnp | grep -E ':80|:443'
# Kalau ada apache/nginx system, stop dulu:
systemctl stop nginx apache2 2>/dev/null || true
systemctl disable nginx apache2 2>/dev/null || true
```

### 5. Trigger deploy pertama

```bash
git add .github deploy
git commit -m "ci: add VPS auto-deploy via GHCR"
git push origin main
```

Lalu di GitHub: Actions tab → lihat workflow "Deploy Dashboard" jalan. Setelah sukses, akses `https://dashboard.skyeseller.online` — Caddy akan auto-issue SSL via Let's Encrypt (butuh ~30 detik pertama kali).

## Operasi Sehari-hari

### Lihat log di VPS
```bash
ssh root@168.231.118.160
cd /opt/skye
docker compose logs -f dashboard
docker compose logs -f caddy
```

### Manual restart
```bash
cd /opt/skye && docker compose restart
```

### Rollback ke commit sebelumnya
Tag image di-set dengan SHA commit, jadi bisa pin manual di `docker-compose.yml`:
```yaml
image: ghcr.io/vcyous/skye-dashboard:<sha-pendek>
```
Lalu `docker compose up -d`.

## Catatan

- Image GHCR private secara default. VPS login pakai `GITHUB_TOKEN` ephemeral yang di-pass dari workflow tiap deploy — token cuma valid selama job berjalan, jadi aman.
- Vite env vars (`VITE_*`) di-bake saat build di Actions, bukan runtime. Ganti nilai = perlu rebuild = push baru.
- Caddy auto-issue & auto-renew SSL cert via Let's Encrypt. Data cert disimpan di volume `caddy_data` — jangan hapus.
- Storefront Next.js nanti tinggal: tambah service `storefront` di compose, uncomment block `*.skyeseller.online` di Caddyfile.
