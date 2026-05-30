# Build from monorepo root: docker build -f apps/skye/Dockerfile .

# ─── Stage 1: install workspace deps ──────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /repo

# Workspace manifests only (max layer cache)
COPY package.json package-lock.json turbo.json ./
COPY apps/skye/package.json ./apps/skye/
# Other app manifests referenced by the workspace install
COPY apps/storefront/package.json ./apps/storefront/
COPY apps/dashboard/package.json ./apps/dashboard/

RUN npm ci

# ─── Stage 2: build standalone server ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json turbo.json ./
COPY apps/skye ./apps/skye

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=@skye/web

# ─── Stage 3: minimal runtime ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/skye/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/skye/.next/static ./apps/skye/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/skye/public ./apps/skye/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/skye/server.js"]
