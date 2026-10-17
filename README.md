# Tarot Card Application

A TypeScript-based tarot card drawing application using Alpine.js, with Express server-side auth and Supabase.

Currently hosted here:
https://cktarot.cards

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and set your Supabase URL and anon key.

3. In Supabase Dashboard → Authentication → URL Configuration, add:
   - **Site URL**: `http://localhost:8001`
   - **Redirect URLs**: `http://localhost:8001/auth/callback`

## Card images (Storage)

- **Source files** live in **`cards/`** at the repository root (WebP, 350×600 px). This folder is **not** under `public/`, so Vite does **not** copy it into `dist/` — production builds load images only from Supabase Storage.
- **Bucket:** `card-images` (public read). Created by migration [`supabase/migrations/20260320120000_card_images_bucket.sql`](supabase/migrations/20260320120000_card_images_bucket.sql).
- **Local Supabase:** After `supabase db reset` / `supabase start`, [`supabase/config.toml`](supabase/config.toml) seeds the bucket from `../cards` (`objects_path`).
- **Hosted Supabase:** Apply migrations (e.g. `supabase db push` or Dashboard SQL), then upload the same `cards/*.webp` files into bucket `card-images` (Dashboard, CLI, or S3-compatible tools). For lower repeat egress, set long **Cache-Control** on objects (e.g. `max-age=31536000`).
- **App behavior:** URLs are built with `supabase.storage.from('card-images').getPublicUrl('m00.webp', …)` in [`src/lib/cardImageUrls.ts`](src/lib/cardImageUrls.ts). Optional **Pro** [image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations) can be passed as the second argument. On startup, [`startCardImagePrefetch()`](src/main.ts) begins loading images in the background (does not block first paint).

## Development

```bash
npm run dev
```

This runs:

- **Vite** on port 5173 (frontend dev server)
- **Express** on port 8001 (proxies to Vite, enforces auth)

Open http://localhost:8001. Unauthenticated users are redirected to `/auth`.

## Production

```bash
npm run build
npm run start
```

Express serves the built app from `dist/` on port 8001.

## Routes

- `/` – Main app (canvas). Requires authentication.
- `/auth` – Login page (password or magic link).
- `/auth/callback` – Magic link callback (handled automatically).
