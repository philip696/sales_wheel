# Sales Attendance & Spin Wheel App

Mobile app for sales attendance verification, anti-fraud controls, and spin wheel rewards.

## Stack

- React Native + Expo (SDK 57)
- TypeScript + Expo Router
- Supabase (Auth, PostgreSQL, Storage, RLS)

## Quick Start

```bash
cd sales-spin-app-v2
npm install --legacy-peer-deps
cp .env.example .env
# Edit .env with your Supabase URL and anon key
npm start
```

## Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_storage_and_functions.sql`
3. Optionally run `supabase/seed.sql` for sample stores and rewards
4. Create test users via Supabase Auth dashboard
5. Promote an admin: `UPDATE sales SET role = 'admin' WHERE email = 'your@email.com';`

## Architecture

```
app/           → Expo Router screens (auth, sales, admin)
src/
  components/  → Shared UI
  features/    → Auth, GPS, attendance flow
  lib/         → Supabase client, config
  services/    → Store, attendance, spin, audit, device
  types/       → TypeScript + database types
  utils/       → Distance calculation, validation
supabase/
  migrations/  → Schema, RLS, storage, RPC functions
```

## Security Principles

- **Never trust the frontend** — attendance approval and reward selection happen server-side
- **RLS enabled** on all tables
- **One spin per store per day** enforced by database unique constraint
- **Camera-only** attendance photos (no gallery picker)
- **Configurable store radius** via `stores.radius_meters`

## Current Phase: Foundation

Completed in this setup:
- Project structure and navigation
- Supabase client + environment config
- Database schema, RLS, storage bucket, RPC functions
- TypeScript types and services
- Auth architecture (Supabase Auth + sales profile)
- GPS verification prototype (preserved)
- Store search service (paginated Supabase queries)
- Camera capture flow (scaffold)
- Admin route scaffolding

Next phase:
- Wire attendance submission end-to-end
- Wire spin request end-to-end
- History screens
- Admin CRUD and monitoring UI

## GPS Prototype (Dev)

From the login screen, use **GPS Prototype (dev)** to test location verification without signing in.
