# Build from monorepo root: docker build -f apps/storefront/Dockerfile .

# ─── Stage 1: install workspace deps ──────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /repo

# Workspace manifests only (max layer cache)
COPY package.json package-lock.json turbo.json ./
COPY apps/storefront/package.json ./apps/storefront/
# apps/dashboard manifest is referenced by the workspace install; copy too
COPY apps/dashboard/package.json ./apps/dashboard/

RUN npm ci

# ─── Stage 2: build standalone server ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json turbo.json ./
COPY apps/storefront ./apps/storefront

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=@skye/storefront

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

# Standalone bundle (server.js + minimal node_modules) lives at
#   .next/standalone/apps/storefront/server.js
# .next/static and public must be copied alongside.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/storefront/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/storefront/public ./apps/storefront/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/storefront/server.js"]
