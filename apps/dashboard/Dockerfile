# Build from monorepo root context: docker build -f apps/dashboard/Dockerfile .

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /repo

# Copy workspace manifests first (cache-friendly layer)
COPY package.json package-lock.json turbo.json ./
COPY apps/dashboard/package.json ./apps/dashboard/

# Install all workspace deps (npm respects workspaces field in root package.json)
RUN npm ci

# Build-time env vars (Vite bakes these into the bundle)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

# Copy dashboard source
COPY apps/dashboard ./apps/dashboard

# Build dashboard only
RUN npm run build --workspace=@skye/dashboard

# Stage 2: Serve with nginx
FROM nginx:stable-alpine AS runner

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /repo/apps/dashboard/dist /usr/share/nginx/html
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
