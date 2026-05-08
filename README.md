# Skye UI

Skye UI is a React + Vite dashboard that connects directly to Supabase (no backend API required for MVP).

## Requirements

- Node.js 18+
- Supabase project with schema + RLS applied

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Configure env values:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_API_URL=
VITE_APP_NAME=Skye Apps
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=development
```

4. Run app:

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Supabase setup order

From repo root SQL files:

1. `supabase/mvp_schema.sql`
2. `supabase/mvp_rls_policies.sql`
3. `supabase/mvp_demo_seed.sql` (optional)
4. `supabase/mvp_reset_data.sql` (optional reset)
5. `supabase/mvp_drop_all_tables.sql` (destructive)

## Vercel deploy

- Root Directory: `skye-ui`
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

Set Vercel environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (empty)
- `VITE_APP_NAME`
- `VITE_APP_VERSION`
- `VITE_APP_ENVIRONMENT=production`
