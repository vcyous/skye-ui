# Custom Caddy build with Cloudflare DNS plugin (for DNS-01 wildcard cert).
# Pinned to Caddy 2.10 LTS line.

FROM caddy:2-builder-alpine AS builder

RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
