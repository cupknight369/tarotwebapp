# Tarot Card Application

A TypeScript-based tarot card drawing application using Alpine.js, with Express server-side auth and Supabase.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and set your Supabase URL and anon key.

3. In Supabase Dashboard → Authentication → URL Configuration, add:
   - **Site URL**: `http://localhost:8001`
   - **Redirect URLs**: `http://localhost:8001/auth/callback`

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
