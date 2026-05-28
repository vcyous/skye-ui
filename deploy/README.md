# Deploy — Skye Platform

Auto-deploy via GitHub Actions: push ke `main` → build 3 images parallel → push ke GHCR → SSH ke VPS → `docker compose pull && up`.

## Arsitektur

```
GitHub push (main)
  ├─ Actions build: skye-dashboard  (Vite + nginx)
  ├─ Actions build: skye-storefront (Next.js standalone)
  └─ Actions build: skye-caddy      (Caddy + cloudflare DNS plugin)
                       │
                       ▼
                  GHCR registry
                       │
                       ▼
                  SSH ke VPS → /opt/skye → docker compose pull + up

VPS containers (network: skye_web):
  caddy (TLS + reverse proxy, ports 80/443)
    ├─→ dashboard (apex, www, dashboard.* → nginx serving Vite SPA)
    └─→ storefront (*.skyeseller.online → Next.js Node server on :3000)

URLs:
  https://skyeseller.online            → landing (dashboard container, hostname-aware routing)
  https://www.skyeseller.online        → 301 redirect to apex
  https://dashboard.skyeseller.online  → merchant dashboard (auth + /dashboard/*)
  https://{slug}.skyeseller.online     → merchant storefront (Next.js, from Supabase)
```

## Setup One-Time

### 1. GitHub Secrets

Repo Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `VPS_HOST` | `168.231.118.160` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Isi file `C:\Users\rizki\.ssh\skye_deploy` (private key, **seluruh isi** termasuk header `-----BEGIN OPENSSH PRIVATE KEY-----`) |
| `VITE_SUPABASE_URL` | URL Supabase production (di-reuse oleh storefront sebagai `NEXT_PUBLIC_SUPABASE_URL` di workflow) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key Supabase |
| `CLOUDFLARE_API_TOKEN` | (catatan: token ini tidak dipakai workflow — disimpan untuk reference; runtime pakai `/opt/skye/.env` di VPS) |

`GITHUB_TOKEN` otomatis tersedia — tidak perlu di-set manual.

### 2. VPS: Authorize SSH key + folder

```bash
ssh root@168.231.118.160
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINKy20NfrVEsUxGrio3rQg5seUHHZaY15kryYxEmreZn github-actions-skye-deploy" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
mkdir -p /opt/skye
```

### 3. VPS: Buat `/opt/skye/.env` dengan Cloudflare API token

⚠️ **Wajib** sebelum deploy pertama dengan storefront. Caddy butuh token ini untuk issue wildcard cert via DNS-01.

```bash
ssh root@168.231.118.160
cat > /opt/skye/.env <<'EOF'
CLOUDFLARE_API_TOKEN=ganti_dengan_token_dari_cloudflare
EOF
chmod 600 /opt/skye/.env
```

⚠️ Pastikan token punya permission `Zone:DNS:Edit` + `Zone:Zone:Read` di zone `skyeseller.online`. Lihat playbook migrasi Cloudflare untuk detail generate.

### 4. Pastikan port 80/443 terbuka

```bash
ss -tlnp | grep -E ':80|:443'
# Stop sistem nginx/apache kalau ada:
systemctl stop nginx apache2 2>/dev/null || true
systemctl disable nginx apache2 2>/dev/null || true
```

### 5. Trigger deploy

```bash
git push origin main
```

Lalu monitor di GitHub Actions tab → workflow "Deploy". Tunggu sampai semua 4 job hijau (build-dashboard, build-storefront, build-caddy, deploy). Total ~3-5 menit.

## Test setelah deploy

Asumsi ada minimal 1 merchant published di DB dengan slug `demo`:

```powershell
curl -I https://dashboard.skyeseller.online
curl -I https://demo.skyeseller.online
```

Keduanya harus return `HTTP/2 200`. Wildcard cert issued sekali, cover semua `*.skyeseller.online` subdomain — first hit ke subdomain baru langsung instant (no cold start).

## Operasi Sehari-hari

### Lihat log di VPS
```bash
ssh root@168.231.118.160
cd /opt/skye
docker compose logs -f storefront
docker compose logs -f dashboard
docker compose logs -f caddy
```

### Manual restart
```bash
cd /opt/skye && docker compose restart
```

### Bust storefront cache (untuk DB changes tanpa redeploy)

`docker compose restart` **tidak** clear Next.js `unstable_cache` disk cache
karena file di filesystem container persist across restart. Saat merchant
publish/unpublish atau ubah data tanpa redeploy code, cache lama (~10 min
TTL) bisa tampil stale. Force-recreate untuk clear instant:

```bash
cd /opt/skye && docker compose up -d --force-recreate storefront
```

Normal deploy via workflow tidak perlu — `docker compose pull` + new image
sudah otomatis recreate container.

Long-term solution (Phase 3): on-demand revalidation webhook dari dashboard
ke storefront `/api/revalidate?slug=X` saat publish, instant cache bust.

### Rollback satu service ke commit sebelumnya
Tag image di-set dengan SHA commit. Pin di compose:
```yaml
storefront:
  image: ghcr.io/vcyous/skye-storefront:<sha-pendek>
```
Lalu `docker compose up -d storefront`.

### Rotate Cloudflare API Token
1. Generate token baru di Cloudflare
2. Update `/opt/skye/.env` di VPS
3. `docker compose restart caddy`
4. Hapus token lama di Cloudflare

## Catatan teknis

- **Wildcard cert**: 1 cert untuk `*.skyeseller.online`, di-issue via Cloudflare DNS-01 challenge. Caddy auto-renew tiap ~60 hari. Cert disimpan di volume `caddy_data` — jangan hapus.
- **Env vars Next.js**: `NEXT_PUBLIC_*` di-bake saat build (sama seperti Vite). Ganti nilai = rebuild storefront image.
- **GHCR auth**: VPS login pakai `GITHUB_TOKEN` ephemeral per deploy. Token cuma valid selama job, tidak persisted.
- **Cloudflare API token**: disimpan persistent di `/opt/skye/.env`. Caddy baca via `{env.CLOUDFLARE_API_TOKEN}` di Caddyfile.
- **Cache cleanup**: workflow include `docker image prune -f` setiap deploy biar disk VPS tidak penuh.
